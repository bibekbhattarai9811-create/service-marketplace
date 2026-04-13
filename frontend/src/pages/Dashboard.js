import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

function getFakeCoords(locationName) {
    if (!locationName) return [40.7128, -74.0060];
    let hash = 0;
    for (let i = 0; i < locationName.length; i++) {
        hash = locationName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const lat = 40.7128 + ((hash % 100) / 100) * 0.5 - 0.25;
    const lng = -74.0060 + (((hash >> 8) % 100) / 100) * 0.5 - 0.25;
    return [lat, lng];
}
import Navbar from "../components/Navbar";
import { WS_API, apiClient } from "../api";

function mapLink(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [workerJobs, setWorkerJobs] = useState([]);
    const [message, setMessage] = useState({ text: "", isError: false });
    const [earnings, setEarnings] = useState(null);
    const [rating, setRating] = useState(null);
    const [disputeReason, setDisputeReason] = useState({});
    const [disputeDetails, setDisputeDetails] = useState({});
    const [transactions, setTransactions] = useState([]);
    const wsRef = useRef(null);

    const userId = Number(localStorage.getItem("user_id") || 0);
    const token = localStorage.getItem("token");

    const fetchAvailableJobs = useCallback(async () => {
        try {
            const response = await apiClient.get("/jobs/available-jobs");
            setJobs(response.data);
        } catch (error) {
            setMessage({ text: "Failed to load jobs.", isError: true });
        }
    }, []);

    const fetchWorkerJobs = useCallback(async () => {
        try {
            const response = await apiClient.get("/jobs/worker-jobs/me");
            setWorkerJobs(response.data);
        } catch (error) {
            console.log("Load worker jobs error:", error);
        }
    }, []);

    const fetchEarnings = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await apiClient.get("/worker-earnings");
            setEarnings(response.data);
        } catch (error) {
            console.log("Failed to load earnings:", error);
        }
    }, [userId]);

    const fetchRating = useCallback(async () => {
        try {
            const response = await apiClient.get("/jobs/worker-rating/" + userId);
            setRating(response.data.average_rating);
        } catch (error) {
            console.log("Rating error:", error);
        }
    }, [userId]);

    const fetchTransactions = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await apiClient.get("/transactions");
            setTransactions(response.data);
        } catch (error) {
            console.log("Failed to load transactions:", error);
        }
    }, [userId]);

    const acceptJob = async (jobId) => {
        try {
            await apiClient.post("/jobs/accept-job", null, {
                params: { job_id: jobId },
            });
            setMessage({ text: "Job accepted successfully!", isError: false });
            fetchAvailableJobs();
            fetchWorkerJobs();
            fetchEarnings();
        } catch (error) {
            setMessage({ text: error.response?.data?.detail || "Failed to accept job.", isError: true });
        }
    };

    const completeJob = async (jobId) => {
        try {
            await apiClient.post("/jobs/complete-job", null, {
                params: { job_id: jobId },
            });
            setMessage({ text: "Job completed!", isError: false });
            fetchWorkerJobs();
            fetchEarnings();
            fetchTransactions();
        } catch (error) {
            setMessage({ text: error.response?.data?.detail || "Failed to complete job.", isError: true });
        }
    };

    const reportIssue = async (jobId) => {
        try {
            await apiClient.post('/jobs/disputes', {
                job_id: jobId,
                reason: disputeReason[jobId] || 'General issue',
                details: disputeDetails[jobId] || '',
            });
            setMessage({ text: 'Issue reported successfully.', isError: false });
        } catch (error) {
            setMessage({ text: error.response?.data?.detail || 'Failed to report issue.', isError: true });
        }
    };

    const chatLink = (job) => `/chat?job_id=${job.id}&receiver_id=${job.customer_id}`;

    useEffect(() => {
        fetchAvailableJobs();
        fetchWorkerJobs();
        fetchEarnings();
        fetchRating();
        fetchTransactions();

        const interval = setInterval(() => {
            fetchTransactions();
            fetchEarnings();
        }, 5000);

        const ws = new WebSocket(`${WS_API}?token=${encodeURIComponent(token || "")}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "new_job") {
                    setMessage({ text: `New job available: ${data.title} for $${data.price}`, isError: false });
                    fetchAvailableJobs();
                }
            } catch (error) {
                console.log("Non-JSON message:", event.data);
            }
        };

        return () => {
            if (wsRef.current) wsRef.current.close();
            clearInterval(interval);
        };
    }, [fetchAvailableJobs, fetchWorkerJobs, fetchEarnings, fetchRating, fetchTransactions, token]);

    const totalJobValue = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalWorkerReceived = transactions.reduce((sum, t) => sum + t.worker_received, 0);
    const totalFees = transactions.reduce((sum, t) => sum + t.platform_fee, 0);

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Worker dashboard</span>
                        <h1>Manage your accepted jobs, earnings, and customer conversations.</h1>
                        <p>
                            Track what is available, what you have already accepted, and what has
                            already been paid out to you from one dashboard.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Today at a glance</h3>
                        <p>
                            Watch new jobs come in live, move accepted work to completed status,
                            and keep an eye on your payment history.
                        </p>
                    </aside>
                </div>

                {message.text && (
                    <div className={`message-banner ${message.isError ? 'error' : 'success'}`}>
                        {message.text}
                    </div>
                )}

                <div className="stats-grid">
                    <div className="stat-card">
                        <span>Completed Jobs</span>
                        <strong>{earnings?.completed_jobs || 0}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Total Earnings</span>
                        <strong>${earnings?.total_earnings || 0}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Average Rating</span>
                        <strong>{rating || 0}</strong>
                    </div>
                </div>

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>Available Jobs</h2>
                            <p className="section-subtitle">Open jobs you can accept right now.</p>
                        </div>
                    </div>

                    {jobs.length === 0 ? (
                        <div className="empty-state">No available jobs right now.</div>
                    ) : (
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div className="card-grid" style={{ flex: 1, minWidth: '300px', maxHeight: '600px', overflowY: 'auto', alignContent: 'start' }}>
                                {jobs.map((job) => (
                                    <article key={job.id} className="job-card">
                                        {job.image_url && (
                                            <img
                                                src={`${apiClient.defaults.baseURL}${job.image_url}`}
                                                alt={job.title}
                                                className="job-photo"
                                            />
                                        )}
                                        <div className="job-card-header">
                                            <div>
                                                <h3>{job.title}</h3>
                                                <p>{job.description}</p>
                                            </div>
                                            <span className={`status-badge status-${job.status.toLowerCase()}`}>{job.status}</span>
                                        </div>
                                        <div className="job-meta">
                                            <span className="job-meta-chip">Location: {job.location}</span>
                                            <span className="job-meta-chip">Price: ${job.price}</span>
                                            {job.category && <span className="job-meta-chip">{job.category}</span>}
                                            {job.service_date && <span className="job-meta-chip">{job.service_date}</span>}
                                            {job.service_window && <span className="job-meta-chip">{job.service_window}</span>}
                                        </div>
                                        <div className="button-row">
                                            <button className="primary-button" onClick={() => acceptJob(job.id)}>
                                                Accept Job
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div style={{ flex: 1, minWidth: '300px', height: '600px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e1e4e8' }}>
                                <MapContainer center={[40.7128, -74.0060]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {jobs.map(job => {
                                        if (!job.location) return null;
                                        const coords = getFakeCoords(job.location);
                                        return (
                                            <Marker key={job.id} position={coords}>
                                                <Popup>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <strong style={{ display: 'block', marginBottom: '4px' }}>{job.title}</strong>
                                                        {job.location}<br/>
                                                        <strong>${job.price}</strong><br/>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        </div>
                    )}
                </section>

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>Your Jobs</h2>
                            <p className="section-subtitle">Jobs you have already accepted and are managing.</p>
                        </div>
                    </div>

                    {workerJobs.length === 0 ? (
                        <div className="empty-state">No accepted jobs yet.</div>
                    ) : (
                        <div className="card-grid">
                            {workerJobs.map((job) => (
                                <article key={job.id} className="job-card">
                                    {job.image_url && (
                                        <img
                                            src={`${apiClient.defaults.baseURL}${job.image_url}`}
                                            alt={job.title}
                                            className="job-photo"
                                        />
                                    )}
                                    <div className="job-card-header">
                                        <div>
                                            <h3>{job.title}</h3>
                                            <p>Status: {job.status}</p>
                                        </div>
                                        <span className={`status-badge status-${job.status.toLowerCase()}`}>{job.status}</span>
                                    </div>
                                    <div className="job-meta">
                                        <span className="job-meta-chip">Location: {job.location}</span>
                                        <span className="job-meta-chip">Price: ${job.price}</span>
                                        {job.category && <span className="job-meta-chip">{job.category}</span>}
                                        {job.service_date && <span className="job-meta-chip">{job.service_date}</span>}
                                        {job.service_window && <span className="job-meta-chip">{job.service_window}</span>}
                                    </div>
                                    <div className="button-row">
                                        <a className="ghost-button" href={mapLink(job.location)} target="_blank" rel="noreferrer">
                                            View Map
                                        </a>
                                        <Link to={chatLink(job)} className="secondary-button">Chat with Customer</Link>
                                        {job.status !== "COMPLETED" && (
                                            <button className="primary-button" onClick={() => completeJob(job.id)}>
                                                Complete Job
                                            </button>
                                        )}
                                    </div>
                                    {(job.status === "ACCEPTED" || job.status === "COMPLETED") && (
                                        <div className="section-card" style={{ padding: '18px', marginBottom: 0 }}>
                                            <div className="page-form">
                                                <input
                                                    type="text"
                                                    placeholder="Issue reason"
                                                    onChange={(e) => setDisputeReason({ ...disputeReason, [job.id]: e.target.value })}
                                                />
                                                <textarea
                                                    placeholder="Issue details"
                                                    onChange={(e) => setDisputeDetails({ ...disputeDetails, [job.id]: e.target.value })}
                                                />
                                                <button className="danger-button" onClick={() => reportIssue(job.id)}>
                                                    Report Issue
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>Payment History</h2>
                            <p className="section-subtitle">Track what customers paid and what you received.</p>
                        </div>
                    </div>

                    <div className="summary-grid" style={{ marginBottom: '18px' }}>
                        <div className="summary-card">
                            <span>Total Job Value</span>
                            <strong>${totalJobValue}</strong>
                        </div>
                        <div className="summary-card">
                            <span>You Received</span>
                            <strong>${totalWorkerReceived}</strong>
                        </div>
                        <div className="summary-card">
                            <span>Platform Fees</span>
                            <strong>${totalFees}</strong>
                        </div>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="empty-state">No payments received yet.</div>
                    ) : (
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Job</th>
                                        <th>Total Job Price</th>
                                        <th>You Received</th>
                                        <th>Platform Fee</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t) => (
                                        <tr key={t.payment_id}>
                                            <td>{t.job_title}</td>
                                            <td>${t.total_amount}</td>
                                            <td className="table-positive">${t.worker_received}</td>
                                            <td className="table-negative">${t.platform_fee}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
