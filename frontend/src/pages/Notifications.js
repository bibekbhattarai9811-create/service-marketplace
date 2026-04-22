import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function notificationTitle(notification) {
    const type = notification.notification_type || 'general';
    if (notification.title) return notification.title;
    if (type === 'payment') return 'Payment received';
    if (type === 'review') return 'Customer review';
    if (type === 'job') return 'New job request';
    if (type === 'system') return 'System announcement';
    return 'Marketplace update';
}

function notificationTimeLabel(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function notificationVisual(notification) {
    const type = notification.notification_type || 'general';
    if (type === 'payment') {
        return { icon: '$', label: 'Payment', tone: 'payment' };
    }
    if (type === 'review') {
        return { icon: '★', label: 'Review', tone: 'review' };
    }
    if (type === 'job') {
        return { icon: '⚒', label: 'Job', tone: 'job' };
    }
    if (type === 'system') {
        return { icon: '•', label: 'System', tone: 'system' };
    }
    return { icon: '•', label: 'Update', tone: 'general' };
}

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [message, setMessage] = useState('');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [typeFilter, setTypeFilter] = useState('');
    const role = localStorage.getItem('role');

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await apiClient.get('/jobs/notifications/me', {
                params: { unread_only: showUnreadOnly || undefined },
            });
            setNotifications(response.data);
            setMessage('');
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to load notifications.');
        }
    }, [showUnreadOnly]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

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
    const groupedCounts = useMemo(() => {
        const result = {};
        notifications.forEach((notification) => {
            const key = notification.notification_type || 'general';
            result[key] = (result[key] || 0) + 1;
        });
        return result;
    }, [notifications]);

    const filteredNotifications = notifications.filter((notification) => {
        if (!typeFilter) {
            return true;
        }
        return (notification.notification_type || 'general') === typeFilter;
    });

    const groupedNotifications = useMemo(() => {
        const buckets = {
            Today: [],
            Yesterday: [],
            Earlier: [],
        };

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(todayStart.getDate() - 1);

        filteredNotifications.forEach((notification) => {
            const sourceDate = notification.created_at ? new Date(notification.created_at) : now;
            if (sourceDate >= todayStart) {
                buckets.Today.push(notification);
            } else if (sourceDate >= yesterdayStart) {
                buckets.Yesterday.push(notification);
            } else {
                buckets.Earlier.push(notification);
            }
        });

        return buckets;
    }, [filteredNotifications]);

    if (role === 'worker') {
        return (
            <div className="app-shell">
                <Navbar />

                <div className="page-wrap worker-mobile-shell">
                    <section className="worker-mobile-header-card worker-notif-header-card">
                        <div>
                            <span className="worker-mobile-kicker">Notifications</span>
                            <h1>Notifications</h1>
                            <p>{unreadCount} unread messages</p>
                        </div>
                        <button type="button" className="ghost-button" onClick={markAllRead}>
                            Mark all read
                        </button>
                    </section>

                    {message && <div className="message-banner error">{message}</div>}

                    <section className="worker-filter-card">
                        <div className="worker-filter-row worker-filter-row-inline">
                            <button
                                type="button"
                                className={`worker-filter-chip ${showUnreadOnly ? 'active' : ''}`.trim()}
                                onClick={() => setShowUnreadOnly((current) => !current)}
                            >
                                {showUnreadOnly ? 'Unread only' : 'All notifications'}
                            </button>
                            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                                <option value="">All types</option>
                                {Object.keys(groupedCounts).sort().map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>

                    <section className="worker-tab-section">
                        {Object.entries(groupedNotifications).map(([groupLabel, items]) => (
                            items.length > 0 ? (
                                <div key={groupLabel} className="worker-notification-group">
                                    <div className="worker-group-title">{groupLabel}</div>
                                    <div className="worker-notification-list">
                                        {items.map((notification) => (
                                            <article key={notification.id} className={`worker-notification-card worker-notification-card-${notificationVisual(notification).tone}`.trim()}>
                                                <div className="worker-notification-head">
                                                    <div className={`worker-notification-avatar worker-notification-icon-${notificationVisual(notification).tone}`.trim()}>
                                                        {notification.notification_type === 'job'
                                                            ? (notification.sender_name || notificationTitle(notification)).slice(0, 2).toUpperCase()
                                                            : notificationVisual(notification).icon}
                                                    </div>
                                                    <div className="worker-notification-title-row worker-notification-title-row-wide">
                                                        {!notification.is_read && <span className="worker-unread-dot" />}
                                                        <div className="worker-notification-copy">
                                                            <strong>{notificationTitle(notification)}</strong>
                                                            <span className="worker-notification-time-inline">{notificationTimeLabel(notification.created_at)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p>{notification.message}</p>
                                                <div className="worker-notification-actions">
                                                    {notification.action_url && (
                                                        <Link className="secondary-button" to={notification.action_url}>
                                                            Open
                                                        </Link>
                                                    )}
                                                    {!notification.is_read && (
                                                        <button type="button" className="ghost-button" onClick={() => markRead(notification.id)}>
                                                            Mark read
                                                        </button>
                                                    )}
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </div>
                            ) : null
                        ))}

                        {filteredNotifications.length === 0 && (
                            <div className="empty-state">No notifications match this view.</div>
                        )}
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Notification center</span>
                        <h1>Catch up on jobs, chat, payments, and disputes from one clean inbox.</h1>
                        <p>
                            Track the most important marketplace events here so you do not need to bounce between dashboards just to stay current.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>What to watch</h3>
                        <p>Unread items, chat updates, job changes, payment events, and moderation notices all land here first.</p>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>{unreadCount} unread now</strong>
                                <span>Use the unread and type filters to focus on the updates that matter most right now.</span>
                            </div>
                        </div>
                    </aside>
                </div>

                {message && <div className="message-banner error">{message}</div>}

                <div className="stats-grid">
                    <div className="stat-card">
                        <span>Total Notifications</span>
                        <strong>{notifications.length}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Unread</span>
                        <strong>{unreadCount}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Types Active</span>
                        <strong>{Object.keys(groupedCounts).length}</strong>
                    </div>
                </div>

                <section className="section-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Recent Notifications</h2>
                            <p className="section-subtitle">Newest items appear first. Filter by unread items or by event type.</p>
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

                    <div className="filter-toolbar">
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="">All types</option>
                            {Object.keys(groupedCounts).sort().map((type) => (
                                <option key={type} value={type}>
                                    {type} ({groupedCounts[type]})
                                </option>
                            ))}
                        </select>
                    </div>

                    {filteredNotifications.length === 0 ? (
                        <div className="empty-state">No notifications match that view.</div>
                    ) : (
                        <div className="card-grid">
                            {filteredNotifications.map((notification) => (
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
