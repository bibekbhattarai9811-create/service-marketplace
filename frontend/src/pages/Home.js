import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import HomeFeaturedWorkers from '../components/HomeFeaturedWorkers';
import HomeFooter from '../components/HomeFooter';
import HomeHero from '../components/HomeHero';
import HomeHowItWorks from '../components/HomeHowItWorks';
import HomeServiceCategories from '../components/HomeServiceCategories';
import { apiClient, handleAssetImageError, resolveAssetUrl } from '../api';

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

function distanceForJob(job) {
    const source = `${job.location || ''}${job.title || ''}${job.id || ''}`;
    let hash = 0;
    for (let index = 0; index < source.length; index += 1) {
        hash = source.charCodeAt(index) + ((hash << 5) - hash);
    }
    const value = Math.abs(hash % 18) + 2;
    return `${value} mi away`;
}

function urgencyForJob(job) {
    if (!job.service_date) return 'Urgent';
    const today = new Date();
    const serviceDate = new Date(job.service_date);
    const diffDays = Math.ceil((serviceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (Number.isNaN(diffDays) || diffDays <= 1) return 'Urgent';
    return 'Scheduled';
}

function serviceTypeForJob(job) {
    return job.category || job.title || 'General Service';
}

function clientNameForJob(job) {
    return job.customer_name || job.client_name || 'New client';
}

function Home() {
    const [jobs, setJobs] = useState([]);
    const [featuredWorkers, setFeaturedWorkers] = useState([]);
    const [message, setMessage] = useState('');
    const [workerMessage, setWorkerMessage] = useState('');
    const [online, setOnline] = useState(localStorage.getItem('workerOnlineStatus') !== 'offline');
    const [workerFilters, setWorkerFilters] = useState({
        category: 'All',
        distance: '25',
    });
    const [hiddenWorkerJobs, setHiddenWorkerJobs] = useState([]);
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
                setFeaturedWorkers([]);
                setWorkerMessage('');
            }
        } catch (error) {
            setFeaturedWorkers([]);
            setWorkerMessage('');
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    useEffect(() => {
        fetchFeaturedWorkers();
    }, [fetchFeaturedWorkers]);

    useEffect(() => {
        localStorage.setItem('workerOnlineStatus', online ? 'online' : 'offline');
    }, [online]);

    const completedJobCount = useMemo(
        () => jobs.filter((job) => job.status === 'COMPLETED').length,
        [jobs]
    );

    const workerCategories = useMemo(() => {
        const categories = jobs
            .map((job) => serviceTypeForJob(job))
            .filter(Boolean);
        return ['All', ...Array.from(new Set(categories)).slice(0, 5)];
    }, [jobs]);

    const workerVisibleJobs = useMemo(() => (
        jobs.filter((job) => {
            if (hiddenWorkerJobs.includes(job.id)) {
                return false;
            }
            if (workerFilters.category !== 'All' && serviceTypeForJob(job) !== workerFilters.category) {
                return false;
            }
            const numericDistance = Number.parseInt(distanceForJob(job), 10);
            if (numericDistance > Number(workerFilters.distance)) {
                return false;
            }
            return true;
        })
    ), [hiddenWorkerJobs, jobs, workerFilters]);

    const acceptWorkerJob = async (jobId) => {
        try {
            await apiClient.post('/jobs/accept-job', null, {
                params: { job_id: jobId },
            });
            setMessage('Job accepted successfully.');
            fetchJobs();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to accept job.');
        }
    };

    const declineWorkerJob = (jobId) => {
        setHiddenWorkerJobs((current) => [...current, jobId]);
        setMessage('Job removed from your list.');
    };

    if (role === 'worker') {
        const workerName = localStorage.getItem('user_name') || 'Worker';

        return (
            <div className="app-shell">
                <Navbar />

                <div className="page-wrap worker-mobile-shell">
                    <section className="worker-mobile-header-card">
                        <div>
                            <span className="worker-mobile-kicker">Worker home</span>
                            <h1>Good morning, {workerName}</h1>
                            <p>Review nearby requests and respond quickly while you are available.</p>
                        </div>
                        <button
                            type="button"
                            className={`worker-online-toggle ${online ? 'active' : ''}`.trim()}
                            onClick={() => setOnline((current) => !current)}
                        >
                            <span className="worker-online-toggle-dot" />
                            {online ? 'Online' : 'Offline'}
                        </button>
                    </section>

                    {message && <div className="message-banner success">{message}</div>}

                    <section className="worker-filter-card">
                        <div className="worker-filter-row">
                            <strong>Category</strong>
                            <div className="worker-chip-row">
                                {workerCategories.map((category) => (
                                    <button
                                        key={category}
                                        type="button"
                                        className={`worker-filter-chip ${workerFilters.category === category ? 'active' : ''}`.trim()}
                                        onClick={() => setWorkerFilters((current) => ({ ...current, category }))}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="worker-filter-row">
                            <strong>Distance</strong>
                            <select
                                value={workerFilters.distance}
                                onChange={(event) => setWorkerFilters((current) => ({ ...current, distance: event.target.value }))}
                            >
                                <option value="10">Within 10 miles</option>
                                <option value="25">Within 25 miles</option>
                                <option value="50">Within 50 miles</option>
                            </select>
                        </div>
                    </section>

                    <section className="worker-tab-section">
                        <div className="section-header">
                            <div>
                                <h2>Available jobs</h2>
                                <p className="section-subtitle">Requests that match your current worker view.</p>
                            </div>
                        </div>

                        {workerVisibleJobs.length === 0 ? (
                            <div className="empty-state">No jobs match this filter right now.</div>
                        ) : (
                            <div className="worker-job-list">
                                {workerVisibleJobs.map((job) => (
                                    <article key={job.id} className="worker-job-card">
                                        <div className="worker-job-card-top">
                                            <div>
                                                <span className="worker-service-type">{serviceTypeForJob(job)}</span>
                                                <h3>{job.title}</h3>
                                            </div>
                                            <span className={`worker-urgency-badge ${urgencyForJob(job) === 'Urgent' ? 'urgent' : 'scheduled'}`.trim()}>
                                                {urgencyForJob(job)}
                                            </span>
                                        </div>
                                        <div className="worker-job-client">
                                            <strong>{clientNameForJob(job)}</strong>
                                            <span>{job.location || 'Local area'} | {distanceForJob(job)}</span>
                                        </div>
                                        <div className="worker-job-price-row">
                                            <div>
                                                <span className="worker-job-price-label">Offered price</span>
                                                <strong>${job.price}</strong>
                                            </div>
                                            {job.service_date && <span className="job-meta-chip">{job.service_date}</span>}
                                        </div>
                                        <div className="worker-job-actions">
                                            <button type="button" className="secondary-button" onClick={() => declineWorkerJob(job.id)}>
                                                Decline
                                            </button>
                                            <button type="button" className="primary-button" onClick={() => acceptWorkerJob(job.id)}>
                                                Accept
                                            </button>
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

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap homepage-wrap">
                <HomeHero
                    role={role}
                    jobsCount={jobs.length}
                    featuredWorkerCount={featuredWorkers.length}
                    completedJobCount={completedJobCount}
                    heroSearch={heroSearch}
                    setHeroSearch={setHeroSearch}
                    setFilters={setFilters}
                />

                <HomeHowItWorks />
                <HomeServiceCategories setFilters={setFilters} />
                <HomeFeaturedWorkers featuredWorkers={featuredWorkers} workerMessage={workerMessage} />

                {message && <div className="message-banner error">{message}</div>}

                <section className="section-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>Available Jobs</h2>
                            <p className="section-subtitle">Open requests right now.</p>
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
                                                    src={resolveAssetUrl(job.image_url)}
                                                    alt={job.title}
                                                    data-fallback-label={job.title}
                                                    className="job-photo"
                                                    onError={handleAssetImageError}
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
                                        <h3>Quick tips</h3>
                                        <p className="mini-note">
                                            Filter by search, location, date, or budget.
                                        </p>
                                    </div>
                                    <div className="surface-list">
                                        <div className="surface-row">
                                            <div>
                                                <strong>Simple sorting</strong>
                                                <span>Sort by newest, price, date, or location.</span>
                                            </div>
                                        </div>
                                        <div className="surface-row">
                                            <div>
                                                <strong>Clear cards</strong>
                                                <span>Price, timing, and location stay visible on each job.</span>
                                            </div>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        )}
                    </div>
                </section>

                <HomeFooter />
            </div>
        </div>
    );
}

export default Home;
