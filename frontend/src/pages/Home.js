import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function Home() {
    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState('');

    const role = localStorage.getItem('role');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await apiClient.get('/jobs/available-jobs');
            setJobs(response.data);
        } catch (error) {
            setMessage('Failed to load jobs.');
        }
    };

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

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>Available Jobs</h2>
                            <p className="section-subtitle">See which jobs are open right now across the marketplace.</p>
                        </div>
                    </div>

                    {jobs.length === 0 ? (
                        <div className="empty-state">No jobs available right now.</div>
                    ) : (
                        <div className="card-grid">
                            {jobs.map((job) => (
                                <article key={job.id} className="job-card">
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

export default Home;
