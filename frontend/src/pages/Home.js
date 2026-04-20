import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function mapLink(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function Home() {
    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        location: '',
        category: '',
        serviceDate: '',
        minPrice: '',
        maxPrice: '',
        sortBy: 'newest',
    });

    const role = localStorage.getItem('role');

    const fetchJobs = useCallback(async () => {
        try {
            const response = await apiClient.get('/jobs/available-jobs', {
                params: {
                    search: filters.search || undefined,
                    location: filters.location || undefined,
                    category: filters.category || undefined,
                    service_date: filters.serviceDate || undefined,
                    min_price: filters.minPrice || undefined,
                    max_price: filters.maxPrice || undefined,
                    sort_by: filters.sortBy || undefined,
                },
            });
            setJobs(response.data);
            setMessage('');
        } catch (error) {
            setMessage('Failed to load jobs.');
        }
    }, [filters]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Marketplace feed</span>
                        <h1>Browse live jobs and jump into the work that fits you.</h1>
                        <p>
                            This is your central feed for open jobs. Customers can post work,
                            and workers can quickly move into their dashboard to accept jobs
                            and start earning.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Quick actions</h3>
                        <p>
                            Keep the flow simple: browse jobs, post requests, and move into the
                            right dashboard without bouncing around the app.
                        </p>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>{jobs.length} jobs visible</strong>
                                <span>Live results update as filters change so the feed stays useful.</span>
                            </div>
                            <div className="hero-metric">
                                <strong>Sorted for speed</strong>
                                <span>Use category, service date, and price to narrow the right work fast.</span>
                            </div>
                        </div>
                        <div className="button-row">
                            {role === 'customer' ? (
                                <>
                                    <Link to="/post-job" className="primary-button">Post a Job</Link>
                                    <Link to="/customer-dashboard" className="ghost-button">My Dashboard</Link>
                                </>
                            ) : role === 'admin' ? (
                                <Link to="/admin" className="primary-button">Admin Analytics</Link>
                            ) : (
                                <Link to="/dashboard" className="secondary-button">Worker Dashboard</Link>
                            )}
                        </div>
                    </aside>
                </div>

                {message && <div className="message-banner error">{message}</div>}

                <section className="section-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Available Jobs</h2>
                            <p className="section-subtitle">See which jobs are open right now across the marketplace.</p>
                        </div>
                    </div>

                    <div className="filter-shell">
                        <div className="filter-toolbar">
                        <input
                            className="filter-toolbar-wide"
                            type="text"
                            placeholder="Search jobs"
                            value={filters.search}
                            onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                        />
                        <input
                            type="text"
                            placeholder="Location"
                            value={filters.location}
                            onChange={(e) => setFilters((current) => ({ ...current, location: e.target.value }))}
                        />
                        <input
                            type="text"
                            placeholder="Category"
                            value={filters.category}
                            onChange={(e) => setFilters((current) => ({ ...current, category: e.target.value }))}
                        />
                        <input
                            type="date"
                            value={filters.serviceDate}
                            onChange={(e) => setFilters((current) => ({ ...current, serviceDate: e.target.value }))}
                        />
                        <input
                            type="number"
                            placeholder="Min price"
                            value={filters.minPrice}
                            onChange={(e) => setFilters((current) => ({ ...current, minPrice: e.target.value }))}
                        />
                        <input
                            type="number"
                            placeholder="Max price"
                            value={filters.maxPrice}
                            onChange={(e) => setFilters((current) => ({ ...current, maxPrice: e.target.value }))}
                        />
                        <select
                            value={filters.sortBy}
                            onChange={(e) => setFilters((current) => ({ ...current, sortBy: e.target.value }))}
                        >
                            <option value="newest">Newest</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="location">Location</option>
                            <option value="service_date">Service Date</option>
                            <option value="category">Category</option>
                        </select>
                        <button type="button" className="ghost-button" onClick={fetchJobs}>
                            Apply Filters
                        </button>
                        </div>

                        {jobs.length === 0 ? (
                            <div className="empty-state">No jobs available right now.</div>
                        ) : (
                            <div className="page-two-column">
                                <div className="stack-list">
                                    {jobs.map((job) => (
                                        <article key={job.id} className="job-card">
                                            {job.image_url && (
                                                <img
                                                    src={`${apiClient.defaults.baseURL}${job.image_url}`}
                                                    alt={job.title}
                                                    className="job-photo"
                                                />
                                            )}
                                            <div className="job-card-header">
                                                <div>
                                                    <h3>{job.title}</h3>
                                                    <p>{job.description}</p>
                                                </div>
                                                <span className={`status-badge status-${job.status.toLowerCase()}`}>
                                                    {job.status}
                                                </span>
                                            </div>
                                            <div className="job-meta">
                                                <span className="job-meta-chip">Location: {job.location}</span>
                                                <span className="job-meta-chip">Price: ${job.price}</span>
                                                {job.category && <span className="job-meta-chip">{job.category}</span>}
                                                {job.service_date && <span className="job-meta-chip">{job.service_date}</span>}
                                                {job.service_window && <span className="job-meta-chip">{job.service_window}</span>}
                                            </div>
                                            <div className="button-row">
                                                <a className="ghost-button" href={mapLink(job.location)} target="_blank" rel="noreferrer">
                                                    View Map
                                                </a>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <aside className="hero-side-panel dashboard-rail">
                                    <div>
                                        <h3>How to use this feed</h3>
                                        <p className="mini-note">
                                            Start with search or location, then refine by category and service date to cut down noise.
                                        </p>
                                    </div>
                                    <div className="surface-list">
                                        <div className="surface-row">
                                            <div>
                                                <strong>Flexible sorting</strong>
                                                <span>Newest, price, location, date, or category.</span>
                                            </div>
                                        </div>
                                        <div className="surface-row">
                                            <div>
                                                <strong>Job details stay visible</strong>
                                                <span>Price, timing, and location are surfaced on every card.</span>
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Home;
