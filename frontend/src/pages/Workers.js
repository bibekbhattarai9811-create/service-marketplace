import React, { useCallback, useEffect, useState } from 'react';
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
    const [city, setCity] = useState('');
    const [minimumRating, setMinimumRating] = useState('');
    const [sortBy, setSortBy] = useState('top_rated');

    const fetchWorkers = useCallback(async () => {
        try {
            const response = await apiClient.get('/workers', {
                params: {
                    search: search || undefined,
                    city: city || undefined,
                    min_rating: minimumRating || undefined,
                    sort_by: sortBy,
                },
            });
            setWorkers(response.data);
            setMessage('');
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to load workers.');
        }
    }, [city, minimumRating, search, sortBy]);

    useEffect(() => {
        fetchWorkers();
    }, [fetchWorkers]);

    return (
        <div className="app-shell">
            <Navbar />
            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Worker directory</span>
                        <h1>Compare trust, pricing, availability, and experience before you book.</h1>
                        <p>
                            Search by skill or city, sort by rating or completed work, and open stronger public profiles before sending a private offer.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Hiring shortcuts</h3>
                        <p>Use search, city, rating, and sort controls to narrow the list before opening a full worker profile.</p>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>{workers.length} workers shown</strong>
                                <span>Profiles now include review counts, completed jobs, service area, and availability signals.</span>
                            </div>
                        </div>
                    </aside>
                </div>

                {message && <div className="message-banner error">{message}</div>}

                <section className="section-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Available Workers</h2>
                            <p className="section-subtitle">Search by expertise, city, trust signals, and work history.</p>
                        </div>
                    </div>

                    <div className="filter-toolbar">
                        <input
                            className="filter-toolbar-wide"
                            type="text"
                            placeholder="Search workers by name, skill, service area, or portfolio"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="City or area"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                        />
                        <select value={minimumRating} onChange={(e) => setMinimumRating(e.target.value)}>
                            <option value="">Any rating</option>
                            <option value="4">4 stars and up</option>
                            <option value="4.5">4.5 stars and up</option>
                        </select>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="top_rated">Top rated</option>
                            <option value="completed">Most completed jobs</option>
                            <option value="reviews">Most reviews</option>
                            <option value="price_low">Lowest hourly rate</option>
                            <option value="price_high">Highest hourly rate</option>
                            <option value="name">Name</option>
                        </select>
                    </div>

                    {workers.length === 0 ? (
                        <div className="empty-state">No workers match those filters yet.</div>
                    ) : (
                        <div className="page-two-column">
                            <div className="stack-list">
                                {workers.map((worker) => (
                                    <article key={worker.id} className="job-card">
                                        {worker.avatar_url && (
                                            <img
                                                src={resolveAssetUrl(worker.avatar_url)}
                                                alt={worker.name}
                                                data-fallback-label={worker.name}
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
                                                    <span className="status-badge status-open">ID Verified</span>
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
                                            <span className="job-meta-chip">{worker.completed_jobs} completed</span>
                                            {worker.availability_count > 0 && (
                                                <span className="job-meta-chip">{worker.availability_count} schedule slots</span>
                                            )}
                                        </div>
                                        <div className="button-row">
                                            <Link className="secondary-button" to={`/workers/${worker.id}`}>
                                                View Profile
                                            </Link>
                                            <Link className="ghost-button" to={`/post-job?target_worker=${worker.id}`}>
                                                Send Private Job
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="map-panel">
                                <MapContainer center={[40.7128, -74.0060]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {workers.map((worker) => {
                                        if (!worker.city && !worker.service_area) return null;
                                        const coords = getFakeCoords(worker.service_area || worker.city);
                                        return (
                                            <Marker key={worker.id} position={coords}>
                                                <Popup>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <strong style={{ display: 'block', marginBottom: '4px' }}>
                                                            {worker.name}
                                                        </strong>
                                                        {worker.service_area || worker.city}<br />
                                                        <strong>{worker.average_rating} stars</strong><br />
                                                        {worker.hourly_rate ? `$${worker.hourly_rate}/hr` : 'Rate on request'}<br />
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
