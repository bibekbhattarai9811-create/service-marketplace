import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient, handleAssetImageError, resolveAssetUrl } from '../api';

function mapLink(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function WorkerProfilePublic() {
    const { workerId } = useParams();
    const [worker, setWorker] = useState(null);
    const [message, setMessage] = useState('');

    const summaryCards = useMemo(() => ([
        { label: 'Average Rating', value: worker?.average_rating || 0 },
        { label: 'Completed Jobs', value: worker?.completed_jobs || 0 },
        { label: 'Active Jobs', value: worker?.active_jobs || 0 },
        { label: 'Total Earnings', value: `$${worker?.total_earnings || 0}` },
    ]), [worker]);

    useEffect(() => {
        const loadWorker = async () => {
            try {
                const response = await apiClient.get(`/workers/${workerId}`);
                setWorker(response.data);
            } catch (error) {
                setMessage(error.response?.data?.detail || 'Failed to load worker profile.');
            }
        };

        loadWorker();
    }, [workerId]);

    return (
        <div className="app-shell">
            <Navbar />
            <div className="page-wrap">
                {message && <div className="message-banner error">{message}</div>}

                {worker && (
                    <>
                        <div className="page-hero">
                            <section className="hero-panel">
                                <span className="hero-label">Worker profile</span>
                                <h1>{worker.name}</h1>
                                <p>{worker.bio || worker.portfolio || 'This worker has not added a full introduction yet.'}</p>
                                <div className="job-meta" style={{ marginTop: '18px' }}>
                                    {worker.id_verified && <span className="status-badge status-open">ID Verified</span>}
                                    {worker.service_area && <span className="job-meta-chip">{worker.service_area}</span>}
                                    {worker.city && <span className="job-meta-chip">{worker.city}</span>}
                                    {worker.hourly_rate && <span className="job-meta-chip">${worker.hourly_rate}/hr</span>}
                                </div>
                                <div className="button-row" style={{ marginTop: '18px' }}>
                                    <Link className="primary-button" to={`/post-job?target_worker=${worker.id}`}>
                                        Send Private Job
                                    </Link>
                                    {worker.service_area && (
                                        <a className="ghost-button" href={mapLink(worker.service_area)} target="_blank" rel="noreferrer">
                                            View Service Area
                                        </a>
                                    )}
                                </div>
                            </section>

                            <aside className="hero-side-panel">
                                {worker.avatar_url ? (
                                    <img
                                        src={resolveAssetUrl(worker.avatar_url)}
                                        alt={worker.name}
                                        data-fallback-label={worker.name}
                                        className="profile-avatar"
                                        onError={handleAssetImageError}
                                    />
                                ) : (
                                    <div className="profile-avatar profile-avatar-fallback">
                                        {worker.name.slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <p>{worker.average_rating} stars across {worker.review_count} reviews</p>
                                <p>{worker.hourly_rate ? `$${worker.hourly_rate}/hr` : 'Rate on request'}</p>
                            </aside>
                        </div>

                        <div className="stats-grid">
                            {summaryCards.map((card) => (
                                <div key={card.label} className="stat-card">
                                    <span>{card.label}</span>
                                    <strong>{card.value}</strong>
                                </div>
                            ))}
                        </div>

                        <section className="section-card">
                            <div className="summary-grid">
                                <div className="summary-card"><span>City</span><strong>{worker.city || 'Not set'}</strong></div>
                                <div className="summary-card"><span>Service Area</span><strong>{worker.service_area || 'Not set'}</strong></div>
                                <div className="summary-card"><span>Skills</span><strong>{worker.skills || 'Not set'}</strong></div>
                            </div>
                        </section>

                        <section className="section-card">
                            <div className="section-header">
                                <div>
                                    <h2>Availability</h2>
                                    <p className="section-subtitle">Current time windows shared by the worker.</p>
                                </div>
                            </div>
                            {worker.availability.length === 0 ? (
                                <div className="empty-state">No availability posted yet.</div>
                            ) : (
                                <div className="card-grid">
                                    {worker.availability.map((slot, index) => (
                                        <article key={`${slot.day}-${index}`} className="job-card">
                                            <h3>{slot.day}</h3>
                                            <p>{slot.start_time} - {slot.end_time}</p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="section-card">
                            <div className="section-header">
                                <div>
                                    <h2>Recent reviews</h2>
                                    <p className="section-subtitle">Feedback from completed work.</p>
                                </div>
                            </div>
                            {worker.reviews.length === 0 ? (
                                <div className="empty-state">No reviews yet.</div>
                            ) : (
                                <div className="card-grid">
                                    {worker.reviews.map((review, index) => (
                                        <article key={`${review.rating}-${index}`} className="job-card">
                                            <div className="job-card-header">
                                                <h3>{review.rating}/5</h3>
                                                <span className="status-badge status-open">Verified</span>
                                            </div>
                                            <p>{review.review}</p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

export default WorkerProfilePublic;
