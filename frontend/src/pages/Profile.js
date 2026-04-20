import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function Profile() {
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({
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

    useEffect(() => {
        fetchProfile();
        if (role === 'worker') {
            fetchAvailability();
        }
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await apiClient.get('/me');
            setProfile(response.data);
            setForm({
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

    const handleChange = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const fetchAvailability = async () => {
        try {
            const response = await apiClient.get('/availability/me');
            setAvailability(response.data);
        } catch (error) {
            setAvailability([]);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
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
                        <span className="hero-label">Your profile</span>
                        <h1>Keep your account details polished and easy to trust.</h1>
                        <p>
                            Add the information customers, workers, or admins need to understand
                            your role in the marketplace at a glance.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Profile summary</h3>
                        <p>{profile ? `${profile.name} • ${profile.role}` : 'Loading profile details...'}</p>
                        <p>{profile?.email || ''}</p>
                        <p>{profile?.phone || ''}</p>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>{role === 'worker' ? 'Public trust matters' : 'Keep it current'}</strong>
                                <span>
                                    {role === 'worker'
                                        ? 'A clear service area, skills list, and polished portfolio help customers choose faster.'
                                        : 'A complete profile makes job conversations and account management easier.'}
                                </span>
                            </div>
                        </div>
                    </aside>
                </div>

                {message && (
                    <div className={`message-banner ${messageIsError ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                <section className="section-card form-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Profile Details</h2>
                            <p className="section-subtitle">
                                Customers can add a city and bio. Workers can also add service area, skills, portfolio details, and an hourly rate.
                            </p>
                        </div>
                    </div>

                    <div className="page-form">
                        {profile?.avatar_url && (
                            <img
                                src={profile.avatar_url.startsWith('http') ? profile.avatar_url : `${apiClient.defaults.baseURL}${profile.avatar_url}`}
                                alt={`${profile.name} avatar`}
                                className="profile-avatar"
                            />
                        )}
                        <div className="compact-form">
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp"
                                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                            />
                            <button type="button" className="ghost-button" onClick={handleAvatarUpload}>
                                Upload Avatar
                            </button>
                        </div>
                        <input type="text" value={profile?.name || ''} disabled placeholder="Name" />
                        <input type="text" value={profile?.email || ''} disabled placeholder="Email" />
                        <input type="text" value={profile?.phone || ''} disabled placeholder="Phone" />
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
                                    placeholder="Portfolio highlights or past projects"
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
                                <p className="section-subtitle">Share the days and times you are available for new jobs.</p>
                            </div>
                        </div>

                        <div className="page-form">
                            {availability.map((slot, index) => (
                                <div key={`${slot.day}-${index}`} className="compact-form">
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
