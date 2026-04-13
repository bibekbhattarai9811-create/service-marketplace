import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div className="card-grid" style={{ flex: 1, minWidth: '300px', maxHeight: '600px', overflowY: 'auto', alignContent: 'start' }}>
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
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                            <div style={{ flex: 1, minWidth: '300px', height: '600px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e1e4e8' }}>
                                <MapContainer center={[40.7128, -74.0060]} zoom={10} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {filteredWorkers.map(w => {
                                        if (!w.city && !w.service_area) return null;
                                        const coords = getFakeCoords(w.service_area || w.city);
                                        return (
                                            <Marker key={w.id} position={coords}>
                                                <Popup>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <strong style={{ display: 'block', marginBottom: '4px' }}>{w.name}</strong>
                                                        {w.service_area || w.city}<br/>
                                                        <strong>${w.hourly_rate}/hr</strong><br/>
                                                        <Link to={`/workers/${w.id}`}>View Profile</Link>
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
