import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [message, setMessage] = useState('');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    const fetchNotifications = async () => {
        try {
            const response = await apiClient.get('/jobs/notifications/me', {
                params: { unread_only: showUnreadOnly || undefined },
            });
            setNotifications(response.data);
            setMessage('');
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to load notifications.');
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [showUnreadOnly]);

    const markRead = async (notificationId) => {
        try {
            await apiClient.post(`/jobs/notifications/${notificationId}/read`);
            fetchNotifications();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to update notification.');
        }
    };

    const markAllRead = async () => {
        try {
            await apiClient.post('/jobs/notifications/read-all');
            fetchNotifications();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to update notifications.');
        }
    };

    const unreadCount = notifications.filter((notification) => !notification.is_read).length;

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

                    <aside className="hero-side-panel">
                        <h3>What to watch</h3>
                        <p>Unread items, payment updates, and chat activity all land here first.</p>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>{unreadCount} unread now</strong>
                                <span>Use unread-only view to clear the highest-signal activity faster.</span>
                            </div>
                        </div>
                    </aside>
                </div>

                {message && <div className="message-banner error">{message}</div>}

                <section className="section-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Recent Notifications</h2>
                            <p className="section-subtitle">Newest items appear first. Unread now: {unreadCount}</p>
                        </div>
                        <div className="button-row">
                            <button className="ghost-button" onClick={() => setShowUnreadOnly((current) => !current)}>
                                {showUnreadOnly ? 'Show All' : 'Show Unread'}
                            </button>
                            <button className="secondary-button" onClick={markAllRead}>
                                Mark All Read
                            </button>
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
                                    <div className="button-row">
                                        {notification.action_url && (
                                            <Link className="secondary-button" to={notification.action_url}>
                                                Open
                                            </Link>
                                        )}
                                        {!notification.is_read && (
                                            <button className="ghost-button" onClick={() => markRead(notification.id)}>
                                                Mark as Read
                                            </button>
                                        )}
                                    </div>
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
