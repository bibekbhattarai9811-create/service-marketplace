import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const CATEGORIES = ["Plumbing", "Cleaning", "Electrical", "Moving", "Landscaping", "Handyman", "Delivery", "Tech Support"];

const reverseGeocode = async (lat, lon) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        return data.address.city || data.address.town || data.address.village || data.address.county || "Custom Location";
    } catch {
        return "Custom Location";
    }
};

function LocationPicker({ position, setPosition, setLocationName }) {
    useMapEvents({
        async click(e) {
            setPosition(e.latlng);
            const name = await reverseGeocode(e.latlng.lat, e.latlng.lng);
            setLocationName(name);
        },
    });
    return position === null ? null : <Marker position={position} />;
}

function PostJob() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [position, setPosition] = useState([40.7128, -74.0060]);
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [serviceDate, setServiceDate] = useState('');
    const [serviceWindow, setServiceWindow] = useState('');
    const [jobImage, setJobImage] = useState(null);
    const [message, setMessage] = useState('');
    const [messageIsError, setMessageIsError] = useState(false);

    const handlePostJob = async () => {
        if (!title || !description || !location || !price || !category) {
            setMessageIsError(true);
            setMessage("Please fill out all required fields marked with an asterisk.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        try {
            const response = await apiClient.post('/jobs/create-job', {
                title,
                description,
                location,
                price: Number(price),
                category,
                service_date: serviceDate,
                service_window: serviceWindow,
            });
            if (jobImage) {
                const formData = new FormData();
                formData.append('file', jobImage);
                await apiClient.post(`/jobs/${response.data.job_id}/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            navigate('/customer-dashboard');
        } catch (error) {
            setMessageIsError(true);
            setMessage(error.response?.data?.detail || 'Failed to post job. Please try again.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero" style={{ paddingBottom: '2rem' }}>
                    <section className="hero-panel">
                        <span className="hero-label">Create a request</span>
                        <h1>Post a job with all the details a worker needs.</h1>
                        <p>
                            Clear descriptions, accurate map locations, and a fair budget help workers
                            accept your request faster and reduce back-and-forth.
                        </p>
                    </section>
                </div>

                {message && (
                    <div className={`message-banner ${messageIsError ? 'error' : 'success'}`} style={{ marginBottom: '24px' }}>
                        {message}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <section className="section-card form-card" style={{ flex: 1, minWidth: '350px', margin: 0 }}>
                        <div className="section-header">
                            <div>
                                <h2>Job Details</h2>
                                <p className="section-subtitle">What do you need help with?</p>
                            </div>
                        </div>

                        <div className="page-form">
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select Category *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategory(cat)}
                                            style={{
                                                padding: '12px',
                                                border: category === cat ? '2px solid #2563eb' : '1px solid #e1e4e8',
                                                background: category === cat ? '#eff6ff' : 'white',
                                                color: category === cat ? '#1e40af' : '#4b5563',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                transition: 'all 0.2s',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <input
                                type="text"
                                placeholder="Job Title *"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            
                            <textarea
                                placeholder="Job Description *"
                                style={{ minHeight: '120px' }}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input
                                    type="date"
                                    style={{ flex: 1 }}
                                    value={serviceDate}
                                    onChange={(e) => setServiceDate(e.target.value)}
                                />
                                <input
                                    type="text"
                                    style={{ flex: 2 }}
                                    placeholder="Preferred time window (ex: 9 AM - 12 PM)"
                                    value={serviceWindow}
                                    onChange={(e) => setServiceWindow(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4b5563' }}>$</span>
                                <input
                                    type="number"
                                    style={{ flex: 1, margin: 0 }}
                                    placeholder="Price Offer *"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', marginTop: '8px' }}>Attach an Image (Optional)</label>
                                <input
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.webp"
                                    style={{ padding: '8px 0' }}
                                    onChange={(e) => setJobImage(e.target.files?.[0] || null)}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="section-card form-card" style={{ flex: 1, minWidth: '350px', margin: 0 }}>
                        <div className="section-header">
                            <div>
                                <h2>Location Map *</h2>
                                <p className="section-subtitle">Click the map to pinpoint where the job takes place. Only matched local workers will be notified!</p>
                            </div>
                        </div>

                        <div className="page-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ height: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e1e4e8', zIndex: 0 }}>
                                <MapContainer center={position} zoom={11} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <LocationPicker position={position} setPosition={setPosition} setLocationName={setLocation} />
                                </MapContainer>
                            </div>

                            <input
                                type="text"
                                placeholder="Selected City or Region"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />

                            <div className="helper-row" style={{ marginTop: 'auto', paddingTop: '24px' }}>
                                <button className="primary-button" style={{ flex: 1 }} onClick={handlePostJob}>
                                    Publish Job Offer
                                </button>
                                <Link to="/customer-dashboard" className="ghost-button">Cancel</Link>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default PostJob;
