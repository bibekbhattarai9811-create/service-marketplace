import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiClient, handleAssetImageError, resolveAssetUrl } from '../api';

function Profile() {
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        bio: '',
        city: '',
        skills: '',
        hourly_rate: '',
        service_area: '',
        portfolio: '',
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [availability, setAvailability] = useState([]);
    const [message, setMessage] = useState('');
    const [messageIsError, setMessageIsError] = useState(false);

    const role = localStorage.getItem('role');

    const profileStats = useMemo(() => ([
        { label: 'Completed Jobs', value: profile?.stats?.completed_jobs || 0 },
        { label: role === 'worker' ? 'Average Rating' : 'Active Jobs', value: role === 'worker' ? (profile?.stats?.average_rating || 0) : (profile?.stats?.active_jobs || 0) },
        { label: role === 'worker' ? 'Total Earnings' : 'Unread Alerts', value: role === 'worker' ? `$${profile?.stats?.total_earnings || 0}` : (profile?.stats?.unread_notifications || 0) },
    ]), [profile, role]);

    const fetchProfile = async () => {
        try {
            const response = await apiClient.get('/me');
            setProfile(response.data);
            setForm({
                name: response.data.name || '',
                phone: response.data.phone || '',
                bio: response.data.bio || '',
                city: response.data.city || '',
                skills: response.data.skills || '',
                hourly_rate: response.data.hourly_rate ?? '',
                service_area: response.data.service_area || '',
                portfolio: response.data.portfolio || '',
            });
        } catch (error) {
            setMessageIsError(true);
            setMessage('Failed to load profile.');
        }
    };

    const fetchAvailability = async () => {
        try {
            const response = await apiClient.get('/availability/me');
            setAvailability(response.data);
        } catch (error) {
            setAvailability([]);
        }
    };

    useEffect(() => {
        fetchProfile();
        if (role === 'worker') {
            fetchAvailability();
        }
    }, [role]);

    const handleChange = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: form.name,
                phone: form.phone,
                bio: form.bio,
                city: form.city,
                skills: form.skills,
                hourly_rate: role === 'worker' && form.hourly_rate !== '' ? Number(form.hourly_rate) : null,
                service_area: form.service_area,
                portfolio: form.portfolio,
            };
            await apiClient.put('/me', payload);
            setMessageIsError(false);
            setMessage('Profile updated successfully.');
            fetchProfile();
        } catch (error) {
            setMessageIsError(true);
            setMessage(error.response?.data?.detail || 'Failed to update profile.');
        }
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) {
            setMessageIsError(true);
            setMessage('Choose an image before uploading.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', avatarFile);
            await apiClient.post('/me/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setAvatarFile(null);
            setMessageIsError(false);
            setMessage('Avatar uploaded successfully.');
            fetchProfile();
        } catch (error) {
            setMessageIsError(true);
            setMessage(error.response?.data?.detail || 'Failed to upload avatar.');
        }
    };

    const addAvailabilitySlot = () => {
        setAvailability((current) => [
            ...current,
            { day: 'Monday', start_time: '09:00', end_time: '17:00' },
        ]);
    };

    const updateAvailabilitySlot = (index, field, value) => {
        setAvailability((current) =>
            current.map((slot, slotIndex) =>
                slotIndex === index ? { ...slot, [field]: value } : slot
            )
        );
    };

    const removeAvailabilitySlot = (index) => {
        setAvailability((current) => current.filter((_, slotIndex) => slotIndex !== index));
    };

    const saveAvailability = async () => {
        try {
            await apiClient.post('/availability/me', availability);
            setMessageIsError(false);
            setMessage('Availability updated successfully.');
            fetchProfile();
        } catch (error) {
            setMessageIsError(true);
            setMessage(error.response?.data?.detail || 'Failed to update availability.');
        }
    };

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Profile hub</span>
                        <h1>Build trust with a stronger profile, clearer contact info, and cleaner availability.</h1>
                        <p>
                            Better profiles help customers book faster, help workers stand out, and give admins a cleaner view of each account.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Profile summary</h3>
                        <div className="profile-identity">
                            {profile?.avatar_url ? (
                                <img
                                    src={resolveAssetUrl(profile.avatar_url)}
                                    alt={`${profile.name} avatar`}
                                    data-fallback-label={profile.name}
                                    className="profile-avatar"
                                    onError={handleAssetImageError}
                                />
                            ) : (
                                <div className="profile-avatar profile-avatar-fallback">
                                    {(profile?.name || 'M').slice(0, 1).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <strong>{profile ? profile.name : 'Loading profile...'}</strong>
                                <p>{profile ? `${profile.role} • ${profile.email}` : ''}</p>
                                <p>{profile?.phone || ''}</p>
                            </div>
                        </div>
                        <div className="job-meta">
                            {profile?.city && <span className="job-meta-chip">{profile.city}</span>}
                            {profile?.service_area && <span className="job-meta-chip">{profile.service_area}</span>}
                            {profile?.id_verified && <span className="status-badge status-open">ID Verified</span>}
                            {role === 'worker' && profile?.stats?.availability_count > 0 && (
                                <span className="job-meta-chip">{profile.stats.availability_count} availability slots</span>
                            )}
                        </div>
                    </aside>
                </div>

                {message && (
                    <div className={`message-banner ${messageIsError ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                <div className="stats-grid">
                    {profileStats.map((item) => (
                        <div key={item.label} className="stat-card">
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                        </div>
                    ))}
                </div>

                <section className="section-card form-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Profile Details</h2>
                            <p className="section-subtitle">
                                Keep your public identity clean and your operational details ready. Workers can showcase skills, pricing, and portfolio notes.
                            </p>
                        </div>
                    </div>

                    <div className="page-form">
                        <div className="compact-form compact-form-profile">
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp"
                                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                            />
                            <button type="button" className="ghost-button" onClick={handleAvatarUpload}>
                                Upload Avatar
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Full name"
                            value={form.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Phone"
                            value={form.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                        />
                        <input type="text" value={profile?.email || ''} disabled placeholder="Email" />
                        <input type="text" value={profile?.role || ''} disabled placeholder="Role" />
                        <input
                            type="text"
                            placeholder="City"
                            value={form.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Service Area"
                            value={form.service_area}
                            onChange={(e) => handleChange('service_area', e.target.value)}
                        />
                        <textarea
                            placeholder="Bio"
                            value={form.bio}
                            onChange={(e) => handleChange('bio', e.target.value)}
                        />
                        {role === 'worker' && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Skills (comma separated)"
                                    value={form.skills}
                                    onChange={(e) => handleChange('skills', e.target.value)}
                                />
                                <textarea
                                    placeholder="Portfolio highlights, project types, or before/after notes"
                                    value={form.portfolio}
                                    onChange={(e) => handleChange('portfolio', e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="Hourly Rate"
                                    value={form.hourly_rate}
                                    onChange={(e) => handleChange('hourly_rate', e.target.value)}
                                />
                            </>
                        )}
                        <div className="button-row">
                            <button className="primary-button" onClick={handleSave}>
                                Save Profile
                            </button>
                        </div>
                    </div>
                </section>

                {role === 'worker' && (
                    <section className="section-card">
                        <div className="section-header">
                            <div>
                                <h2>Availability</h2>
                                <p className="section-subtitle">Share the days and times customers can expect you to work.</p>
                            </div>
                        </div>

                        {availability.length > 0 && (
                            <div className="job-meta" style={{ marginBottom: '14px' }}>
                                {availability.map((slot, index) => (
                                    <span key={`${slot.day}-${index}`} className="job-meta-chip">
                                        {slot.day}: {slot.start_time} - {slot.end_time}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="page-form">
                            {availability.map((slot, index) => (
                                <div key={`${slot.day}-${index}`} className="compact-form compact-form-availability">
                                    <select
                                        value={slot.day}
                                        onChange={(e) => updateAvailabilitySlot(index, 'day', e.target.value)}
                                    >
                                        <option>Monday</option>
                                        <option>Tuesday</option>
                                        <option>Wednesday</option>
                                        <option>Thursday</option>
                                        <option>Friday</option>
                                        <option>Saturday</option>
                                        <option>Sunday</option>
                                    </select>
                                    <input
                                        type="time"
                                        value={slot.start_time}
                                        onChange={(e) => updateAvailabilitySlot(index, 'start_time', e.target.value)}
                                    />
                                    <input
                                        type="time"
                                        value={slot.end_time}
                                        onChange={(e) => updateAvailabilitySlot(index, 'end_time', e.target.value)}
                                    />
                                    <button type="button" className="danger-button" onClick={() => removeAvailabilitySlot(index)}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <div className="button-row">
                                <button type="button" className="ghost-button" onClick={addAvailabilitySlot}>
                                    Add Availability Slot
                                </button>
                                <button type="button" className="primary-button" onClick={saveAvailability}>
                                    Save Availability
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default Profile;
