import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [message, setMessage] = useState('');

    const fetchNotifications = async () => {
        try {
            const response = await apiClient.get('/jobs/notifications/me');
            setNotifications(response.data);
            setMessage('');
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to load notifications.');
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markRead = async (notificationId) => {
        try {
            await apiClient.post(`/jobs/notifications/${notificationId}/read`);
            fetchNotifications();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to update notification.');
        }
    };

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Notification center</span>
                        <h1>Catch up on job activity, chat updates, and payments in one place.</h1>
                        <p>
                            This page keeps the latest marketplace activity together so you do not
                            need to bounce around dashboards to understand what changed.
                        </p>
                    </section>
                </div>

                {message && <div className="message-banner error">{message}</div>}

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>Recent Notifications</h2>
                            <p className="section-subtitle">Newest items appear first.</p>
                        </div>
                    </div>

                    {notifications.length === 0 ? (
                        <div className="empty-state">No notifications yet.</div>
                    ) : (
                        <div className="card-grid">
                            {notifications.map((notification) => (
                                <article key={notification.id} className="job-card">
                                    <div className="job-card-header">
                                        <div>
                                            <h3>{notification.title || 'Update'}</h3>
                                            <p>{notification.message}</p>
                                        </div>
                                        <span className={`status-badge ${notification.is_read ? 'status-completed' : 'status-open'}`}>
                                            {notification.is_read ? 'Read' : 'Unread'}
                                        </span>
                                    </div>
                                    <div className="job-meta">
                                        <span className="job-meta-chip">{notification.notification_type || 'general'}</span>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="button-row">
                                            <button className="ghost-button" onClick={() => markRead(notification.id)}>
                                                Mark as Read
                                            </button>
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

export default Notifications;
