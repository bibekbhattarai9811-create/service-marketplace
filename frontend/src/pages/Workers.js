import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function mapLink(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function Workers() {
    const [workers, setWorkers] = useState([]);
    const [message, setMessage] = useState('');
    const [search, setSearch] = useState('');
    const [minimumRating, setMinimumRating] = useState('');

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

    const filteredWorkers = useMemo(() => {
        return workers.filter((worker) => {
            const text = `${worker.name} ${worker.city} ${worker.service_area} ${worker.skills} ${worker.portfolio}`.toLowerCase();
            const matchesSearch = !search.trim() || text.includes(search.trim().toLowerCase());
            const matchesRating = !minimumRating || Number(worker.average_rating) >= Number(minimumRating);
            return matchesSearch && matchesRating;
        });
    }, [workers, search, minimumRating]);

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

                    <div className="compact-form">
                        <input
                            type="text"
                            placeholder="Search workers"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select value={minimumRating} onChange={(e) => setMinimumRating(e.target.value)}>
                            <option value="">Any rating</option>
                            <option value="4">4 stars and up</option>
                            <option value="4.5">4.5 stars and up</option>
                        </select>
                    </div>

                    {filteredWorkers.length === 0 ? (
                        <div className="empty-state">No workers available yet.</div>
                    ) : (
                        <div className="card-grid">
                            {filteredWorkers.map((worker) => (
                                <article key={worker.id} className="job-card">
                                    {worker.avatar_url && (
                                        <img
                                            src={worker.avatar_url.startsWith('http') ? worker.avatar_url : `${apiClient.defaults.baseURL}${worker.avatar_url}`}
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
                                            <Link className="secondary-button" to={`/workers/${worker.id}`}>
                                                View Profile
                                            </Link>
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
