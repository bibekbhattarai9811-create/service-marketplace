import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Navbar from '../components/Navbar';
import { apiClient, handleAssetImageError, resolveAssetUrl } from '../api';

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

                    <aside className="hero-side-panel">
                        <h3>Hiring shortcuts</h3>
                        <p>Use skill search and review filters to narrow the list before opening a full public profile.</p>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>{filteredWorkers.length} workers shown</strong>
                                <span>Profiles, pricing, ratings, and service areas stay visible while you browse.</span>
                            </div>
                        </div>
                    </aside>
                </div>

                {message && <div className="message-banner error">{message}</div>}

                <section className="section-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Available Workers</h2>
                            <p className="section-subtitle">Portfolio highlights, ratings, and service coverage.</p>
                        </div>
                    </div>

                    <div className="filter-toolbar">
                        <input
                            className="filter-toolbar-wide"
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
                        <div className="page-two-column">
                            <div className="stack-list">
                                {filteredWorkers.map((worker) => (
                                    <article key={worker.id} className="job-card">
                                        {worker.avatar_url && (
                                            <img
                                                src={resolveAssetUrl(worker.avatar_url)}
                                                alt={worker.name}
                                                className="job-photo"
                                                onError={handleAssetImageError}
                                            />
                                        )}
                                        <div className="job-card-header">
                                            <div>
                                                <h3>{worker.name}</h3>
                                                <p>{worker.portfolio || 'No portfolio highlights yet.'}</p>
                                            </div>
                                            <div className="button-row">
                                                {worker.id_verified && (
                                                    <span className="status-badge status-open">
                                                        ID Verified
                                                    </span>
                                                )}
                                                <span className="status-badge status-completed">
                                                    {worker.average_rating} stars
                                                </span>
                                            </div>
                                        </div>
                                        <div className="job-meta">
                                            {worker.city && <span className="job-meta-chip">{worker.city}</span>}
                                            {worker.service_area && <span className="job-meta-chip">{worker.service_area}</span>}
                                            {worker.skills && <span className="job-meta-chip">{worker.skills}</span>}
                                            {worker.hourly_rate && <span className="job-meta-chip">${worker.hourly_rate}/hr</span>}
                                            <span className="job-meta-chip">{worker.review_count} reviews</span>
                                        </div>
                                        <div className="button-row">
                                            <Link className="secondary-button" to={`/workers/${worker.id}`}>
                                                View Profile
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="map-panel">
                                <MapContainer center={[40.7128, -74.0060]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {filteredWorkers.map((worker) => {
                                        if (!worker.city && !worker.service_area) return null;
                                        const coords = getFakeCoords(worker.service_area || worker.city);
                                        return (
                                            <Marker key={worker.id} position={coords}>
                                                <Popup>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <strong style={{ display: 'block', marginBottom: '4px' }}>
                                                            {worker.name} {worker.id_verified && <span style={{ color: '#14804a' }}>✓</span>}
                                                        </strong>
                                                        {worker.service_area || worker.city}<br />
                                                        <strong>${worker.hourly_rate}/hr</strong><br />
                                                        <Link to={`/workers/${worker.id}`}>View Profile</Link>
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
            </div>
        </div>
    );
}

export default Workers;
