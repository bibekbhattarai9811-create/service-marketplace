import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function mapLink(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function Workers() {
    const [workers, setWorkers] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchWorkers();
    }, []);

    const fetchWorkers = async () => {
        try {
            const response = await apiClient.get('/workers');
            setWorkers(response.data);
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to load workers.');
        }
    };

    return (
        <div className="app-shell">
            <Navbar />
            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Worker directory</span>
                        <h1>Browse trusted workers, ratings, skills, and service areas.</h1>
                        <p>
                            This directory helps customers compare worker trust signals before posting or assigning work.
                        </p>
                    </section>
                </div>

                {message && <div className="message-banner error">{message}</div>}

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>Available Workers</h2>
                            <p className="section-subtitle">Portfolio highlights, ratings, and service coverage.</p>
                        </div>
                    </div>

                    {workers.length === 0 ? (
                        <div className="empty-state">No workers available yet.</div>
                    ) : (
                        <div className="card-grid">
                            {workers.map((worker) => (
                                <article key={worker.id} className="job-card">
                                    {worker.avatar_url && (
                                        <img
                                            src={`${apiClient.defaults.baseURL}${worker.avatar_url}`}
                                            alt={worker.name}
                                            className="job-photo"
                                        />
                                    )}
                                    <div className="job-card-header">
                                        <div>
                                            <h3>{worker.name}</h3>
                                            <p>{worker.portfolio || 'No portfolio highlights yet.'}</p>
                                        </div>
                                        <span className="status-badge status-open">
                                            {worker.average_rating} stars
                                        </span>
                                    </div>
                                    <div className="job-meta">
                                        {worker.city && <span className="job-meta-chip">{worker.city}</span>}
                                        {worker.service_area && <span className="job-meta-chip">{worker.service_area}</span>}
                                        {worker.skills && <span className="job-meta-chip">{worker.skills}</span>}
                                        {worker.hourly_rate && <span className="job-meta-chip">${worker.hourly_rate}/hr</span>}
                                        <span className="job-meta-chip">{worker.review_count} reviews</span>
                                    </div>
                                    {(worker.city || worker.service_area) && (
                                        <div className="button-row">
                                            <a
                                                className="ghost-button"
                                                href={mapLink(worker.service_area || worker.city)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View Service Area
                                            </a>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Workers;
