import React from 'react';
import { Link } from 'react-router-dom';

export const SERVICE_OPTIONS = ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Moving', 'Handyman'];

function HomeHero({ role, jobsCount, featuredWorkerCount, completedJobCount, heroSearch, setHeroSearch, setFilters }) {
    const heroSearchSubmit = () => {
        setFilters((current) => ({
            ...current,
            search: heroSearch.search,
            category: heroSearch.category,
        }));
    };

    return (
        <section className="landing-hero">
            <div className="landing-hero-copy">
                <span className="landing-kicker">Local services made simple</span>
                <h1>Find Skilled Workers Near You</h1>
                <p>
                    Hire trusted local workers for repairs, routine jobs, and custom projects.
                    Search by service, compare quality, and move from request to completion faster.
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
                    <strong>{jobsCount}</strong>
                    <small>Fresh requests across the marketplace</small>
                </div>
                <div className="landing-hero-stat">
                    <span>Featured workers</span>
                    <strong>{featuredWorkerCount}</strong>
                    <small>Professionals ready to book</small>
                </div>
                <div className="landing-hero-stat">
                    <span>Completed jobs</span>
                    <strong>{completedJobCount}</strong>
                    <small>Completed through the platform</small>
                </div>
            </aside>
        </section>
    );
}

export default HomeHero;
