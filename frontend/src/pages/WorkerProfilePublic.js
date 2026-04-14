import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function mapLink(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function WorkerProfilePublic() {
    const { workerId } = useParams();
    const [worker, setWorker] = useState(null);
    const [message, setMessage] = useState('');

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
                                <h1>
                                    {worker.name} 
                                    {worker.id_verified && (
                                        <span className="status-badge" style={{ backgroundColor: '#e2f5ec', color: '#14804a', marginLeft: '12px', fontSize: '0.8rem', verticalAlign: 'middle' }}>
                                            ✓ ID Verified
                                        </span>
                                    )}
                                </h1>
                                <p>{worker.bio || worker.portfolio || 'This worker has not added a full introduction yet.'}</p>
                            </section>

                            <aside className="hero-side-panel">
                                {worker.avatar_url && (
                                    <img
                                        src={worker.avatar_url.startsWith('http') ? worker.avatar_url : `${apiClient.defaults.baseURL}${worker.avatar_url}`}
                                        alt={worker.name}
                                        className="profile-avatar"
                                    />
                                )}
                                <p>{worker.average_rating} stars across {worker.review_count} reviews</p>
                                {worker.hourly_rate && <p>${worker.hourly_rate}/hr</p>}
                            </aside>
                        </div>

                        <section className="section-card">
                            <div className="summary-grid">
                                <div className="summary-card"><span>City</span><strong>{worker.city || 'Not set'}</strong></div>
                                <div className="summary-card"><span>Service Area</span><strong>{worker.service_area || 'Not set'}</strong></div>
                                <div className="summary-card"><span>Skills</span><strong>{worker.skills || 'Not set'}</strong></div>
                            </div>
                            {worker.service_area && (
                                <div className="button-row" style={{ marginTop: '18px' }}>
                                    <a className="ghost-button" href={mapLink(worker.service_area)} target="_blank" rel="noreferrer">
                                        View Service Area
                                    </a>
                                </div>
                            )}
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
