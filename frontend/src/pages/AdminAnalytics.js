import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [users, setUsers] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [resolutionNotes, setResolutionNotes] = useState({});
    const [message, setMessage] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userRole, setUserRole] = useState('');
    const [userStatus, setUserStatus] = useState('');
    const [disputeSearch, setDisputeSearch] = useState('');
    const [disputeStatus, setDisputeStatus] = useState('');

    const fetchAnalytics = useCallback(async () => {
        try {
            const [summaryResponse, usersResponse, disputesResponse] = await Promise.all([
                apiClient.get('/jobs/admin/summary'),
                apiClient.get('/admin/users', {
                    params: {
                        search: userSearch || undefined,
                        role: userRole || undefined,
                        status: userStatus || undefined,
                    },
                }),
                apiClient.get('/jobs/admin/disputes', {
                    params: {
                        search: disputeSearch || undefined,
                        status: disputeStatus || undefined,
                    },
                }),
            ]);
            setData(summaryResponse.data);
            setUsers(usersResponse.data);
            setDisputes(disputesResponse.data);
            setMessage('');
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to load admin analytics.');
        }
    }, [disputeSearch, disputeStatus, userRole, userSearch, userStatus]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const updateUser = async (userId, payload) => {
        try {
            await apiClient.put(`/admin/users/${userId}`, payload);
            setMessage('User updated successfully.');
            fetchAnalytics();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to update user.');
        }
    };

    const updateDispute = async (disputeId, status) => {
        try {
            await apiClient.put(`/jobs/admin/disputes/${disputeId}`, {
                status,
                resolution_note: resolutionNotes[disputeId] || '',
            });
            setMessage('Dispute updated successfully.');
            fetchAnalytics();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to update dispute.');
        }
    };

    const maxStatusValue = Math.max(...(data?.status_breakdown?.map((item) => item.value) || [1]));
    const maxRevenueValue = Math.max(...(data?.revenue_breakdown?.map((item) => item.value) || [1]));
    const openDisputeCount = useMemo(() => disputes.filter((dispute) => dispute.status !== 'RESOLVED').length, [disputes]);

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Admin analytics</span>
                        <h1>Run the marketplace from one clear control center.</h1>
                        <p>
                            Review platform health, manage users, and resolve disputes without hopping between screens.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Operations</h3>
                        <p>Users, disputes, jobs, and revenue stay visible in one place.</p>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>{data?.summary?.total_users || 0} users tracked</strong>
                                <span>Customers, workers, and admins in one view.</span>
                            </div>
                            <div className="hero-metric">
                                <strong>{openDisputeCount} open disputes</strong>
                                <span>Moderation and resolution notes stay close at hand.</span>
                            </div>
                        </div>
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
                                    <h2>Disputes & Moderation</h2>
                                    <p className="section-subtitle">Review issues and mark outcomes.</p>
                                </div>
                            </div>
                            <div className="filter-toolbar">
                                <input
                                    className="filter-toolbar-wide"
                                    type="text"
                                    placeholder="Search by job, reporter, target, or reason"
                                    value={disputeSearch}
                                    onChange={(e) => setDisputeSearch(e.target.value)}
                                />
                                <select value={disputeStatus} onChange={(e) => setDisputeStatus(e.target.value)}>
                                    <option value="">All dispute statuses</option>
                                    <option value="OPEN">Open</option>
                                    <option value="UNDER_REVIEW">Under review</option>
                                    <option value="RESOLVED">Resolved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>
                            {disputes.length === 0 ? (
                                <div className="empty-state">No disputes match those filters.</div>
                            ) : (
                                <div className="card-grid">
                                    {disputes.map((dispute) => (
                                        <article key={dispute.id} className="job-card">
                                            <div className="job-card-header">
                                                <div>
                                                    <h3>{dispute.job_title}</h3>
                                                    <p>{dispute.reason}</p>
                                                </div>
                                                <span className={`status-badge ${dispute.status === 'RESOLVED' ? 'status-completed' : dispute.status === 'REJECTED' ? 'status-cancelled' : 'status-open'}`}>
                                                    {dispute.status}
                                                </span>
                                            </div>
                                            <div className="job-meta">
                                                <span className="job-meta-chip">Reporter: {dispute.reporter_name}</span>
                                                {dispute.target_name && <span className="job-meta-chip">Against: {dispute.target_name}</span>}
                                            </div>
                                            {dispute.details && <p>{dispute.details}</p>}
                                            <textarea
                                                placeholder="Resolution note"
                                                value={resolutionNotes[dispute.id] ?? dispute.resolution_note ?? ''}
                                                onChange={(e) => setResolutionNotes({ ...resolutionNotes, [dispute.id]: e.target.value })}
                                            />
                                            <div className="button-row">
                                                <button className="ghost-button" onClick={() => updateDispute(dispute.id, 'UNDER_REVIEW')}>
                                                    Under Review
                                                </button>
                                                <button className="secondary-button" onClick={() => updateDispute(dispute.id, 'RESOLVED')}>
                                                    Resolve
                                                </button>
                                                <button className="danger-button" onClick={() => updateDispute(dispute.id, 'REJECTED')}>
                                                    Reject
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="section-card">
                            <div className="section-header">
                                <div>
                                    <h2>Platform Charts</h2>
                                    <p className="section-subtitle">Quick platform breakdowns.</p>
                                </div>
                            </div>
                            <div className="summary-grid">
                                <div className="summary-card">
                                    <span>Job Status Mix</span>
                                    <div className="chart-stack">
                                        {data.status_breakdown.map((item) => (
                                            <div key={item.label} className="chart-row">
                                                <div className="chart-label">{item.label}</div>
                                                <div className="chart-bar-shell">
                                                    <div
                                                        className="chart-bar"
                                                        style={{ width: `${Math.max((item.value / maxStatusValue) * 100, item.value ? 12 : 0)}%` }}
                                                    />
                                                </div>
                                                <div className="chart-value">{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="summary-card">
                                    <span>Revenue Split</span>
                                    <div className="chart-stack">
                                        {data.revenue_breakdown.map((item) => (
                                            <div key={item.label} className="chart-row">
                                                <div className="chart-label">{item.label}</div>
                                                <div className="chart-bar-shell">
                                                    <div
                                                        className="chart-bar chart-bar-secondary"
                                                        style={{ width: `${Math.max((item.value / maxRevenueValue) * 100, item.value ? 12 : 0)}%` }}
                                                    />
                                                </div>
                                                <div className="chart-value">${item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="section-card">
                            <div className="section-header">
                                <div>
                                    <h2>Top Workers</h2>
                                    <p className="section-subtitle">Top workers by jobs, rating, and earnings.</p>
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
                                    <p className="section-subtitle">Latest jobs across the marketplace.</p>
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
                                    <p className="section-subtitle">Search, filter, and manage account access.</p>
                                </div>
                            </div>
                            <div className="filter-toolbar">
                                <input
                                    className="filter-toolbar-wide"
                                    type="text"
                                    placeholder="Search by name, email, or phone"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />
                                <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                                    <option value="">All roles</option>
                                    <option value="customer">Customer</option>
                                    <option value="worker">Worker</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <select value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                                    <option value="">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="table-wrap">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>City</th>
                                            <th>Stats</th>
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
                                                <td>{user.city || user.service_area || '—'}</td>
                                                <td>
                                                    {user.role === 'worker'
                                                        ? `${user.completed_jobs} completed jobs`
                                                        : `${user.reported_disputes} disputes reported`}
                                                </td>
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
