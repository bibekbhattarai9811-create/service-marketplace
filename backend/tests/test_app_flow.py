from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main  # noqa: E402
from auth import get_db as auth_get_db  # noqa: E402
from models import Base  # noqa: E402
from routes.jobs import get_db as jobs_get_db  # noqa: E402
from routes.users import get_db as users_get_db  # noqa: E402


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[main.get_db] = override_get_db
    main.app.dependency_overrides[users_get_db] = override_get_db
    main.app.dependency_overrides[jobs_get_db] = override_get_db
    main.app.dependency_overrides[auth_get_db] = override_get_db

    with TestClient(main.app) as test_client:
        yield test_client

    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def register_user(client, *, name, email, role):
    response = client.post(
        "/register",
        json={
            "name": name,
            "email": email,
            "phone": "1234567890",
            "role": role,
            "password": "1234",
        },
    )
    assert response.status_code == 200
    return response.json()


def login_user(client, *, email):
    response = client.post(
        "/login",
        json={"email": email, "password": "1234"},
    )
    assert response.status_code == 200
    return response.json()


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_and_login_returns_token(client):
    register_user(
        client,
        name="Test Customer",
        email="customer@test.com",
        role="customer",
    )

    login_data = login_user(client, email="customer@test.com")

    assert login_data["role"] == "customer"
    assert login_data["token"]


def test_customer_worker_job_payment_flow(client):
    register_user(
        client,
        name="Customer",
        email="customer@test.com",
        role="customer",
    )
    register_user(
        client,
        name="Worker",
        email="worker@test.com",
        role="worker",
    )

    customer_login = login_user(client, email="customer@test.com")
    worker_login = login_user(client, email="worker@test.com")

    create_job_response = client.post(
        "/jobs/create-job",
        json={
            "title": "Fix sink",
            "description": "Kitchen sink is leaking",
            "location": "Chicago",
            "price": 50,
        },
        headers=auth_headers(customer_login["token"]),
    )
    assert create_job_response.status_code == 200
    job_id = create_job_response.json()["job_id"]

    customer_jobs_response = client.get(
        "/jobs/customer-jobs/me",
        headers=auth_headers(customer_login["token"]),
    )
    assert customer_jobs_response.status_code == 200
    assert customer_jobs_response.json()[0]["id"] == job_id

    accept_job_response = client.post(
        f"/jobs/accept-job?job_id={job_id}",
        headers=auth_headers(worker_login["token"]),
    )
    assert accept_job_response.status_code == 200

    complete_job_response = client.post(
        f"/jobs/complete-job?job_id={job_id}",
        headers=auth_headers(worker_login["token"]),
    )
    assert complete_job_response.status_code == 200

    pay_response = client.post(
        "/jobs/pay",
        json={"job_id": job_id},
        headers=auth_headers(customer_login["token"]),
    )
    assert pay_response.status_code == 200
    assert pay_response.json()["worker_received"] == 45

    second_pay_response = client.post(
        "/jobs/pay",
        json={"job_id": job_id},
        headers=auth_headers(customer_login["token"]),
    )
    assert second_pay_response.status_code == 400


def test_rating_flow_after_payment(client):
    register_user(
        client,
        name="Customer",
        email="customer@test.com",
        role="customer",
    )
    register_user(
        client,
        name="Worker",
        email="worker@test.com",
        role="worker",
    )

    customer_login = login_user(client, email="customer@test.com")
    worker_login = login_user(client, email="worker@test.com")

    create_job_response = client.post(
        "/jobs/create-job",
        json={
            "title": "Paint wall",
            "description": "Living room wall painting",
            "location": "Chicago",
            "price": 80,
        },
        headers=auth_headers(customer_login["token"]),
    )
    assert create_job_response.status_code == 200
    job_id = create_job_response.json()["job_id"]

    assert client.post(
        f"/jobs/accept-job?job_id={job_id}",
        headers=auth_headers(worker_login["token"]),
    ).status_code == 200

    assert client.post(
        f"/jobs/complete-job?job_id={job_id}",
        headers=auth_headers(worker_login["token"]),
    ).status_code == 200

    assert client.post(
        "/jobs/pay",
        json={"job_id": job_id},
        headers=auth_headers(customer_login["token"]),
    ).status_code == 200

    rate_response = client.post(
        "/jobs/rate-worker",
        json={"job_id": job_id, "rating": 5, "review": "Great work"},
        headers=auth_headers(customer_login["token"]),
    )
    assert rate_response.status_code == 200
    assert rate_response.json()["rating"] == 5

    second_rating_response = client.post(
        "/jobs/rate-worker",
        json={"job_id": job_id, "rating": 4, "review": "Second review"},
        headers=auth_headers(customer_login["token"]),
    )
    assert second_rating_response.status_code == 400

    worker_rating_response = client.get(
        f"/jobs/worker-rating/{worker_login['user_id']}",
        headers=auth_headers(worker_login["token"]),
    )
    assert worker_rating_response.status_code == 200
    assert worker_rating_response.json()["average_rating"] == 5.0


def test_profile_update_and_admin_summary(client):
    register_user(
        client,
        name="Admin",
        email="admin@test.com",
        role="admin",
    )
    register_user(
        client,
        name="Worker",
        email="worker@test.com",
        role="worker",
    )

    admin_login = login_user(client, email="admin@test.com")
    worker_login = login_user(client, email="worker@test.com")

    update_profile_response = client.put(
        "/me",
        json={
            "bio": "Licensed electrician",
            "city": "Chicago",
            "skills": "electrical, wiring",
            "hourly_rate": 80,
        },
        headers=auth_headers(worker_login["token"]),
    )
    assert update_profile_response.status_code == 200

    get_profile_response = client.get(
        "/me",
        headers=auth_headers(worker_login["token"]),
    )
    assert get_profile_response.status_code == 200
    assert get_profile_response.json()["city"] == "Chicago"
    assert get_profile_response.json()["hourly_rate"] == 80

    admin_summary_response = client.get(
        "/jobs/admin/summary",
        headers=auth_headers(admin_login["token"]),
    )
    assert admin_summary_response.status_code == 200
    assert admin_summary_response.json()["summary"]["admins"] == 1
    assert admin_summary_response.json()["summary"]["workers"] == 1
