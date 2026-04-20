import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeCheckout from '../components/StripeCheckout';

const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

function mapLink(location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function CustomerDashboardV2() {
    const [myJobs, setMyJobs] = useState([]);
    const [message, setMessage] = useState('');
    const [messageIsError, setMessageIsError] = useState(false);
    const [ratingData, setRatingData] = useState({});
    const [reviewData, setReviewData] = useState({});
    const [disputeReason, setDisputeReason] = useState({});
    const [disputeDetails, setDisputeDetails] = useState({});
    const [transactions, setTransactions] = useState([]);
    
    // Stripe State
    const [clientSecret, setClientSecret] = useState(null);
    const [activePaymentIntentId, setActivePaymentIntentId] = useState(null);

    const fetchMyJobs = async () => {
        try {
            const response = await apiClient.get('/jobs/customer-jobs/me');
            setMyJobs(response.data);
        } catch (error) {
            setMessageIsError(true);
            setMessage('Failed to load your jobs.');
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await apiClient.get('/transactions');
            setTransactions(response.data);
        } catch (error) {
            console.log('Failed to load transactions.');
        }
    };

    useEffect(() => {
        fetchMyJobs();
        fetchTransactions();
        const interval = setInterval(() => {
            fetchMyJobs();
            fetchTransactions();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const showMessage = (text, isError = false) => {
        setMessage(text);
        setMessageIsError(isError);
    };

    const handlePayClick = async (job) => {
        try {
            const response = await apiClient.post('/stripe/create-payment-intent', {
                job_id: job.id,
            });
            setClientSecret(response.data.client_secret);
            setActivePaymentIntentId(response.data.stripe_payment_intent_id);
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Failed to initiate payment.', true);
        }
    };

    const handleRate = async (job) => {
        const rating = ratingData[job.id];
        const review = reviewData[job.id];
        if (!rating || !review) {
            showMessage('Please enter both a rating and a review.', true);
            return;
        }
        try {
            await apiClient.post('/jobs/rate-worker', {
                job_id: job.id,
                rating: Number(rating),
                review,
            });
            showMessage('Rating submitted successfully!');
            fetchMyJobs();
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Failed to submit rating.', true);
        }
    };

    const handleCancel = async (job) => {
        try {
            await apiClient.post('/jobs/cancel-job?job_id=' + job.id);
            showMessage('Job cancelled successfully!');
            fetchMyJobs();
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Failed to cancel job.', true);
        }
    };

    const handleDispute = async (job) => {
        try {
            await apiClient.post('/jobs/disputes', {
                job_id: job.id,
                reason: disputeReason[job.id] || 'General issue',
                details: disputeDetails[job.id] || '',
            });
            showMessage('Dispute reported successfully.');
        } catch (error) {
            showMessage(error.response?.data?.detail || 'Failed to report dispute.', true);
        }
    };

    const chatLink = (job) => `/chat?job_id=${job.id}&receiver_id=${job.worker_id}`;

    const totalPaid = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalWorkerGot = transactions.reduce((sum, t) => sum + t.worker_received, 0);
    const totalFee = transactions.reduce((sum, t) => sum + t.platform_fee, 0);

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Customer dashboard</span>
                        <h1>Track posted jobs, payments, and worker ratings in one place.</h1>
                        <p>
                            This dashboard keeps your active jobs, completed work, payment steps,
                            and worker feedback all organized in one view.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Quick actions</h3>
                        <p>
                            Post new work, jump into chat, complete payments, and leave ratings
                            once a job is done.
                        </p>
                        <div className="hero-metrics">
                            <div className="hero-metric">
                                <strong>{myJobs.length} jobs tracked</strong>
                                <span>Open requests, active jobs, and completed work all stay in one place.</span>
                            </div>
                            <div className="hero-metric">
                                <strong>${totalPaid} total paid</strong>
                                <span>Payment progress and ratings are surfaced right alongside each job card.</span>
                            </div>
                        </div>
                        <Link to="/post-job" className="primary-button">Post a New Job</Link>
                    </aside>
                </div>

                {message && (
                    <div className={`message-banner ${messageIsError ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                <div className="stats-grid">
                    <div className="stat-card">
                        <span>Total Jobs</span>
                        <strong>{myJobs.length}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Completed Jobs</span>
                        <strong>{myJobs.filter((job) => job.status === 'COMPLETED').length}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Total Paid</span>
                        <strong>${totalPaid}</strong>
                    </div>
                </div>

                <section className="section-card section-card-accent">
                    <div className="section-header">
                        <div>
                            <h2>My Posted Jobs</h2>
                            <p className="section-subtitle">Manage every job from open request to paid completion.</p>
                        </div>
                    </div>

                    {myJobs.length === 0 ? (
                        <div className="empty-state">You have not posted any jobs yet.</div>
                    ) : (
                        <div className="card-grid">
                            {myJobs.map((job) => (
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
                                        <span className={`status-badge status-${job.status.toLowerCase()}`}>{job.status}</span>
                                    </div>

                                    <div className="job-meta">
                                        <span className="job-meta-chip">Location: {job.location}</span>
                                        <span className="job-meta-chip">Price: ${job.price}</span>
                                        {job.category && <span className="job-meta-chip">{job.category}</span>}
                                        {job.service_date && <span className="job-meta-chip">{job.service_date}</span>}
                                        {job.service_window && <span className="job-meta-chip">{job.service_window}</span>}
                                        {job.worker_id && <span className="job-meta-chip">Worker ID: {job.worker_id}</span>}
                                    </div>

                                    <div className="button-row">
                                        <a className="ghost-button" href={mapLink(job.location)} target="_blank" rel="noreferrer">
                                            View Map
                                        </a>
                                        {job.worker_id && (
                                            <Link to={chatLink(job)} className="secondary-button">Chat with Worker</Link>
                                        )}

                                        {job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
                                            <button className="danger-button" onClick={() => handleCancel(job)}>
                                                Cancel Job
                                            </button>
                                        )}
                                    </div>

                                    {job.status === 'COMPLETED' && !job.paid && (
                                        <div className="summary-card">
                                            <h3>Pay Worker</h3>
                                            <p className="muted-text">Total: ${job.price}</p>
                                            <p className="muted-text">
                                                Worker receives ${Number(job.price * 0.9).toFixed(2)} and platform fee is ${Number(job.price * 0.1).toFixed(2)}.
                                            </p>
                                            <div className="button-row">
                                                <button className="primary-button" onClick={() => handlePayClick(job)}>
                                                    Pay Now
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {job.paid && (
                                        <div className="message-banner success" style={{ marginBottom: 0 }}>
                                            Payment has been completed for this job.
                                        </div>
                                    )}

                                    {job.status === 'COMPLETED' && job.paid && !job.rating && (
                                        <div className="section-card" style={{ padding: '18px', marginBottom: 0 }}>
                                            <div className="section-header">
                                                <div>
                                                    <h3>Rate this Worker</h3>
                                                    <p className="section-subtitle">Leave a score and short review for completed work.</p>
                                                </div>
                                            </div>
                                            <div className="page-form">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    placeholder="Rating (1-5)"
                                                    onChange={(e) => setRatingData({ ...ratingData, [job.id]: e.target.value })}
                                                />
                                                <textarea
                                                    placeholder="Write a review..."
                                                    onChange={(e) => setReviewData({ ...reviewData, [job.id]: e.target.value })}
                                                />
                                                <div className="button-row">
                                                    <button className="primary-button" onClick={() => handleRate(job)}>
                                                        Submit Rating
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {job.rating && (
                                        <div className="message-banner success" style={{ marginBottom: 0 }}>
                                            Rating submitted. Score: {job.rating}/5
                                        </div>
                                    )}

                                    {(job.status === 'ACCEPTED' || job.status === 'COMPLETED') && (
                                        <div className="section-card" style={{ padding: '18px', marginBottom: 0 }}>
                                            <div className="section-header">
                                                <div>
                                                    <h3>Report an issue</h3>
                                                    <p className="section-subtitle">Use this if there is a dispute with the job or worker.</p>
                                                </div>
                                            </div>
                                            <div className="page-form">
                                                <input
                                                    type="text"
                                                    placeholder="Reason"
                                                    onChange={(e) => setDisputeReason({ ...disputeReason, [job.id]: e.target.value })}
                                                />
                                                <textarea
                                                    placeholder="Details"
                                                    onChange={(e) => setDisputeDetails({ ...disputeDetails, [job.id]: e.target.value })}
                                                />
                                                <div className="button-row">
                                                    <button className="danger-button" onClick={() => handleDispute(job)}>
                                                        Report Issue
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>Payment History</h2>
                            <p className="section-subtitle">See what you paid, what workers received, and platform fees.</p>
                        </div>
                    </div>

                    <div className="summary-grid" style={{ marginBottom: '18px' }}>
                        <div className="summary-card">
                            <span>Total Paid</span>
                            <strong>${totalPaid}</strong>
                        </div>
                        <div className="summary-card">
                            <span>Worker Got</span>
                            <strong>${totalWorkerGot}</strong>
                        </div>
                        <div className="summary-card">
                            <span>Platform Fee</span>
                            <strong>${totalFee}</strong>
                        </div>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="empty-state">No payments made yet.</div>
                    ) : (
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Job</th>
                                        <th>Total Paid</th>
                                        <th>Worker Got</th>
                                        <th>Platform Fee</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t) => (
                                        <tr key={t.payment_id}>
                                            <td>{t.job_title}</td>
                                            <td>${t.total_amount}</td>
                                            <td className="table-positive">${t.worker_received}</td>
                                            <td className="table-negative">${t.platform_fee}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <StripeCheckout 
                        clientSecret={clientSecret}
                        paymentIntentId={activePaymentIntentId}
                        onSuccess={() => {
                            setClientSecret(null);
                            setActivePaymentIntentId(null);
                            showMessage("Payment successful! Funds securely Escrowed via Stripe.");
                            fetchMyJobs();
                            fetchTransactions();
                        }}
                        onCancel={() => {
                            setClientSecret(null);
                            setActivePaymentIntentId(null);
                        }}
                    />
                </Elements>
            )}
        </div>
    );
}

export default CustomerDashboardV2;
