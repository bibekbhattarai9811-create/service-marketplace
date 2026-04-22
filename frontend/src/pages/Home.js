import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import HomeFeaturedWorkers from '../components/HomeFeaturedWorkers';
import HomeFooter from '../components/HomeFooter';
import HomeHero from '../components/HomeHero';
import HomeHowItWorks from '../components/HomeHowItWorks';
import HomeServiceCategories from '../components/HomeServiceCategories';
import { apiClient, handleAssetImageError, resolveAssetUrl } from '../api';

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
                                                    src={resolveAssetUrl(job.image_url)}
                                                    alt={job.title}
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

                <HomeFooter />
            </div>
        </div>
    );
}

export default Home;
