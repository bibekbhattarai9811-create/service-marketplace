import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [users, setUsers] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [summaryResponse, usersResponse] = await Promise.all([
                apiClient.get('/jobs/admin/summary'),
                apiClient.get('/admin/users'),
            ]);
            setData(summaryResponse.data);
            setUsers(usersResponse.data);
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to load admin analytics.');
        }
    };

    const updateUser = async (userId, payload) => {
        try {
            await apiClient.put(`/admin/users/${userId}`, payload);
            setMessage('User updated successfully.');
            fetchAnalytics();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to update user.');
        }
    };

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Admin analytics</span>
                        <h1>Watch platform health, worker performance, and job flow trends.</h1>
                        <p>
                            This page gives admins a quick view of marketplace activity without
                            needing to inspect the database directly.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Admin view</h3>
                        <p>
                            See user totals, payment flow, job status counts, top workers, and
                            the most recent jobs from one panel.
                        </p>
                    </aside>
                </div>

                {message && <div className="message-banner error">{message}</div>}

                {data && (
                    <>
                        <div className="stats-grid admin-stats-grid">
                            <div className="stat-card"><span>Total Users</span><strong>{data.summary.total_users}</strong></div>
                            <div className="stat-card"><span>Total Jobs</span><strong>{data.summary.total_jobs}</strong></div>
                            <div className="stat-card"><span>Completed Jobs</span><strong>{data.summary.completed_jobs}</strong></div>
                            <div className="stat-card"><span>Open Jobs</span><strong>{data.summary.open_jobs}</strong></div>
                            <div className="stat-card"><span>Total Payments</span><strong>${data.summary.total_payments}</strong></div>
                            <div className="stat-card"><span>Platform Revenue</span><strong>${data.summary.platform_revenue}</strong></div>
                        </div>

                        <section className="section-card">
                            <div className="section-header">
                                <div>
                                    <h2>User Mix</h2>
                                    <p className="section-subtitle">Current role distribution across the platform.</p>
                                </div>
                            </div>
                            <div className="summary-grid">
                                <div className="summary-card"><span>Customers</span><strong>{data.summary.customers}</strong></div>
                                <div className="summary-card"><span>Workers</span><strong>{data.summary.workers}</strong></div>
                                <div className="summary-card"><span>Admins</span><strong>{data.summary.admins}</strong></div>
                            </div>
                        </section>

                        <section className="section-card">
                            <div className="section-header">
                                <div>
                                    <h2>Top Workers</h2>
                                    <p className="section-subtitle">Workers ranked by completed jobs, rating, and earnings.</p>
                                </div>
                            </div>
                            {data.top_workers.length === 0 ? (
                                <div className="empty-state">No worker activity yet.</div>
                            ) : (
                                <div className="card-grid">
                                    {data.top_workers.map((worker) => (
                                        <article key={worker.id} className="job-card">
                                            <div className="job-card-header">
                                                <div>
                                                    <h3>{worker.name}</h3>
                                                    <p>{worker.email}</p>
                                                </div>
                                                <span className="status-badge status-open">Rating {worker.average_rating}</span>
                                            </div>
                                            <div className="job-meta">
                                                {worker.city && <span className="job-meta-chip">{worker.city}</span>}
                                                {worker.skills && <span className="job-meta-chip">{worker.skills}</span>}
                                                {worker.hourly_rate && <span className="job-meta-chip">${worker.hourly_rate}/hr</span>}
                                            </div>
                                            <p>Completed jobs: {worker.completed_jobs}</p>
                                            <p>Total earnings: ${worker.total_earnings}</p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="section-card">
                            <div className="section-header">
                                <div>
                                    <h2>Recent Jobs</h2>
                                    <p className="section-subtitle">Latest jobs posted across the marketplace.</p>
                                </div>
                            </div>
                            <div className="table-wrap">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Title</th>
                                            <th>Status</th>
                                            <th>Price</th>
                                            <th>Location</th>
                                            <th>Worker</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recent_jobs.map((job) => (
                                            <tr key={job.id}>
                                                <td>{job.title}</td>
                                                <td>{job.status}</td>
                                                <td>${job.price}</td>
                                                <td>{job.location}</td>
                                                <td>{job.worker_id || 'Unassigned'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="section-card">
                            <div className="section-header">
                                <div>
                                    <h2>User Management</h2>
                                    <p className="section-subtitle">Promote roles or disable accounts without touching the database.</p>
                                </div>
                            </div>
                            <div className="table-wrap">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>{user.role}</td>
                                                <td>{user.is_active ? 'Active' : 'Inactive'}</td>
                                                <td>
                                                    <div className="button-row">
                                                        <button
                                                            className="ghost-button"
                                                            onClick={() => updateUser(user.id, {
                                                                is_active: !user.is_active,
                                                            })}
                                                        >
                                                            {user.is_active ? 'Disable' : 'Enable'}
                                                        </button>
                                                        {user.role !== 'admin' && (
                                                            <button
                                                                className="secondary-button"
                                                                onClick={() => updateUser(user.id, { role: 'admin' })}
                                                            >
                                                                Make Admin
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

export default AdminAnalytics;
