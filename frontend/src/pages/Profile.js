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
    });
    const [message, setMessage] = useState('');
    const [messageIsError, setMessageIsError] = useState(false);

    const role = localStorage.getItem('role');

    useEffect(() => {
        fetchProfile();
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
            });
        } catch (error) {
            setMessageIsError(true);
            setMessage('Failed to load profile.');
        }
    };

    const handleChange = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSave = async () => {
        try {
            const payload = {
                bio: form.bio,
                city: form.city,
                skills: form.skills,
                hourly_rate: role === 'worker' && form.hourly_rate !== '' ? Number(form.hourly_rate) : null,
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
                        <p>
                            {profile ? `${profile.name} • ${profile.role}` : 'Loading profile details...'}
                        </p>
                        <p>{profile?.email || ''}</p>
                        <p>{profile?.phone || ''}</p>
                    </aside>
                </div>

                {message && (
                    <div className={`message-banner ${messageIsError ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                <section className="section-card form-card">
                    <div className="section-header">
                        <div>
                            <h2>Profile Details</h2>
                            <p className="section-subtitle">
                                Customers can add a city and bio. Workers can also add skills and an hourly rate.
                            </p>
                        </div>
                    </div>

                    <div className="page-form">
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
            </div>
        </div>
    );
}

export default Profile;
