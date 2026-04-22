import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

const SERVICE_OPTIONS = ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Moving', 'Handyman'];

const POPULAR_SERVICES = [
    { title: 'Plumbing', icon: 'PL', description: 'Leak repairs, pipe fixes, and bathroom upgrades.' },
    { title: 'Electrical', icon: 'EL', description: 'Lighting, wiring, outlets, and appliance setup.' },
    { title: 'Cleaning', icon: 'CL', description: 'Deep cleaning, move-out cleaning, and weekly care.' },
    { title: 'Carpentry', icon: 'CA', description: 'Furniture repairs, trim work, and custom builds.' },
];

const HOW_IT_WORKS = [
    {
        step: '01',
        title: 'Post a Job',
        description: 'Share the task, budget, and location so workers know exactly what you need.',
    },
    {
        step: '02',
        title: 'Get Matched',
        description: 'Compare local workers, ratings, and availability without leaving the platform.',
    },
    {
        step: '03',
        title: 'Get it Done',
        description: 'Chat, track progress, pay securely, and leave a review when the job is complete.',
    },
];

const MOCK_WORKERS = [
    {
        id: 101,
        name: 'Jordan Hayes',
        avatar_url: '',
        category: 'Plumbing',
        rating: 4.9,
        service_area: 'Chicago',
    },
    {
        id: 102,
        name: 'Avery Brooks',
        avatar_url: '',
        category: 'Electrical',
        rating: 4.8,
        service_area: 'Naperville',
    },
    {
        id: 103,
        name: 'Taylor Cruz',
        avatar_url: '',
        category: 'Cleaning',
        rating: 4.7,
        service_area: 'Evanston',
    },
];

function mapLink(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function serviceLabelForWorker(worker) {
    if (worker.category) return worker.category;
    if (worker.skills) {
        const firstSkill = worker.skills.split(',')[0]?.trim();
        if (firstSkill) return firstSkill;
    }
    return worker.service_area || 'General Services';
}

function buildStarString(ratingValue) {
    const rating = Math.max(0, Math.min(5, Math.round(Number(ratingValue) || 0)));
    return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

function Home() {
    const [jobs, setJobs] = useState([]);
    const [featuredWorkers, setFeaturedWorkers] = useState([]);
    const [message, setMessage] = useState('');
    const [workerMessage, setWorkerMessage] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        location: '',
        category: '',
        serviceDate: '',
        minPrice: '',
        maxPrice: '',
        sortBy: 'newest',
    });
    const [heroSearch, setHeroSearch] = useState({
        search: '',
        category: '',
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

    const fetchFeaturedWorkers = useCallback(async () => {
        try {
            const response = await apiClient.get('/workers');
            const workers = Array.isArray(response.data) ? response.data : [];
            const normalizedWorkers = workers.slice(0, 4).map((worker) => ({
                id: worker.id,
                name: worker.name,
                avatar_url: worker.avatar_url || '',
                category: serviceLabelForWorker(worker),
                rating: Number(worker.average_rating || 0),
                service_area: worker.service_area || worker.city || 'Local service area',
            }));

            if (normalizedWorkers.length > 0) {
                setFeaturedWorkers(normalizedWorkers);
                setWorkerMessage('');
            } else {
                setFeaturedWorkers(MOCK_WORKERS);
                setWorkerMessage('Featured workers are using demo data for now.');
            }
        } catch (error) {
            setFeaturedWorkers(MOCK_WORKERS);
            setWorkerMessage('Featured workers are using demo data for now.');
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    useEffect(() => {
        fetchFeaturedWorkers();
    }, [fetchFeaturedWorkers]);

    const completedJobCount = useMemo(
        () => jobs.filter((job) => job.status === 'COMPLETED').length,
        [jobs]
    );

    const heroSearchSubmit = () => {
        setFilters((current) => ({
            ...current,
            search: heroSearch.search,
            category: heroSearch.category,
        }));
    };

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap homepage-wrap">
                <section className="landing-hero">
                    <div className="landing-hero-copy">
                        <span className="landing-kicker">Local services made simple</span>
                        <h1>Find Skilled Workers Near You</h1>
                        <p>
                            Hire trusted local workers for urgent repairs, routine jobs, and custom projects.
                            Search by service, compare worker quality, and move from request to completion faster.
                        </p>

                        <div className="landing-search-card">
                            <div className="landing-search-grid">
                                <input
                                    type="text"
                                    placeholder="What do you need help with?"
                                    value={heroSearch.search}
                                    onChange={(e) => setHeroSearch((current) => ({ ...current, search: e.target.value }))}
                                />
                                <select
                                    value={heroSearch.category}
                                    onChange={(e) => setHeroSearch((current) => ({ ...current, category: e.target.value }))}
                                >
                                    <option value="">All categories</option>
                                    {SERVICE_OPTIONS.map((service) => (
                                        <option key={service} value={service}>
                                            {service}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" className="landing-search-button" onClick={heroSearchSubmit}>
                                    Search
                                </button>
                            </div>
                            <div className="landing-search-tags">
                                {SERVICE_OPTIONS.slice(0, 4).map((service) => (
                                    <button
                                        key={service}
                                        type="button"
                                        className="landing-tag"
                                        onClick={() => {
                                            setHeroSearch((current) => ({ ...current, category: service }));
                                            setFilters((current) => ({ ...current, category: service }));
                                        }}
                                    >
                                        {service}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="button-row">
                            {role === 'customer' ? (
                                <>
                                    <Link to="/post-job" className="primary-button">Post a Job</Link>
                                    <Link to="/customer-dashboard" className="ghost-button">Open Dashboard</Link>
                                </>
                            ) : role === 'admin' ? (
                                <>
                                    <Link to="/admin" className="primary-button">Open Admin</Link>
                                    <Link to="/workers" className="ghost-button">View Workers</Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/dashboard" className="primary-button">Open Worker Dashboard</Link>
                                    <Link to="/workers" className="ghost-button">Browse Workers</Link>
                                </>
                            )}
                        </div>
                    </div>

                    <aside className="landing-hero-panel">
                        <div className="landing-hero-stat">
                            <span>Open jobs</span>
                            <strong>{jobs.length}</strong>
                            <small>Fresh requests across the marketplace</small>
                        </div>
                        <div className="landing-hero-stat">
                            <span>Featured workers</span>
                            <strong>{featuredWorkers.length}</strong>
                            <small>Curated professionals ready to book</small>
                        </div>
                        <div className="landing-hero-stat">
                            <span>Completed jobs tracked</span>
                            <strong>{completedJobCount}</strong>
                            <small>Jobs already moved through the platform</small>
                        </div>
                    </aside>
                </section>

                <section className="landing-section">
                    <div className="landing-section-head">
                        <div>
                            <span className="landing-section-kicker">How it works</span>
                            <h2>Move from request to finished job without the guesswork</h2>
                        </div>
                    </div>
                    <div className="how-grid">
                        {HOW_IT_WORKS.map((item) => (
                            <article key={item.step} className="how-card">
                                <div className="how-step">{item.step}</div>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="landing-section">
                    <div className="landing-section-head">
                        <div>
                            <span className="landing-section-kicker">Popular services</span>
                            <h2>Book common home and business services in a few clicks</h2>
                        </div>
                    </div>
                    <div className="services-grid">
                        {POPULAR_SERVICES.map((service) => (
                            <article
                                key={service.title}
                                className="service-card"
                                onClick={() => setFilters((current) => ({ ...current, category: service.title }))}
                            >
                                <div className="service-icon">{service.icon}</div>
                                <h3>{service.title}</h3>
                                <p>{service.description}</p>
                                <span className="service-link">Explore service</span>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="landing-section landing-section-featured">
                    <div className="landing-section-head">
                        <div>
                            <span className="landing-section-kicker">Featured workers</span>
                            <h2>Trusted professionals customers can book right now</h2>
                        </div>
                        <Link to="/workers" className="ghost-button">View all workers</Link>
                    </div>

                    {workerMessage && <div className="message-banner success">{workerMessage}</div>}

                    <div className="featured-workers-grid">
                        {featuredWorkers.map((worker) => (
                            <article key={worker.id} className="featured-worker-card">
                                {worker.avatar_url ? (
                                    <img
                                        src={worker.avatar_url.startsWith('http') ? worker.avatar_url : `${apiClient.defaults.baseURL}${worker.avatar_url}`}
                                        alt={worker.name}
                                        className="featured-worker-avatar-image"
                                    />
                                ) : (
                                    <div className="featured-worker-avatar">
                                        {worker.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className="featured-worker-content">
                                    <h3>{worker.name}</h3>
                                    <p className="featured-worker-category">{worker.category}</p>
                                    <div className="featured-worker-rating">
                                        <span className="featured-worker-stars">{buildStarString(worker.rating)}</span>
                                        <span>{worker.rating.toFixed(1)} / 5</span>
                                    </div>
                                    <p className="featured-worker-area">{worker.service_area}</p>
                                    <Link to={`/workers/${worker.id}`} className="secondary-button">
                                        Book Now
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {message && <div className="message-banner error">{message}</div>}

                <section className="section-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Available Jobs</h2>
                            <p className="section-subtitle">See what is open right now across the marketplace.</p>
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
                                            Start with search or location, then narrow by category, date, and budget.
                                        </p>
                                    </div>
                                    <div className="surface-list">
                                        <div className="surface-row">
                                            <div>
                                                <strong>Simple sorting</strong>
                                                <span>Sort by newest, price, location, date, or category.</span>
                                            </div>
                                        </div>
                                        <div className="surface-row">
                                            <div>
                                                <strong>Key details stay visible</strong>
                                                <span>Price, timing, and location appear on every card.</span>
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        )}
                    </div>
                </section>

                <footer className="site-footer">
                    <div className="site-footer-brand">
                        <span className="site-footer-logo">SM</span>
                        <div>
                            <strong>Service Marketplace</strong>
                            <p>Hire skilled local workers with a cleaner, faster booking flow.</p>
                        </div>
                    </div>
                    <div className="site-footer-links">
                        <Link to="/home">About</Link>
                        <Link to="/notifications">Contact</Link>
                        <Link to="/profile">Terms</Link>
                    </div>
                    <div className="site-footer-social">
                        <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">FB</a>
                        <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">IG</a>
                        <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">LI</a>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default Home;
