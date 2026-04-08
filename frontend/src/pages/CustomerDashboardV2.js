import React, { useState, useEffect } from 'react';
import { apiClient, clearSession } from '../api';

function CustomerDashboardV2() {
    const [myJobs, setMyJobs] = useState([]);
    const [message, setMessage] = useState('');
    const [ratingData, setRatingData] = useState({});
    const [reviewData, setReviewData] = useState({});
    const [transactions, setTransactions] = useState([]);

    const fetchMyJobs = async () => {
        try {
            const response = await apiClient.get('/jobs/customer-jobs/me');
            setMyJobs(response.data);
        } catch (error) {
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

    const handlePay = async (job) => {
        try {
            const response = await apiClient.post('/jobs/pay', {
                job_id: job.id,
            });
            setMessage(
                `Payment successful! Worker received $${response.data.worker_received} and the platform fee was $${response.data.platform_fee}.`
            );
            fetchMyJobs();
            fetchTransactions();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to process payment.');
        }
    };

    const handleRate = async (job) => {
        const rating = ratingData[job.id];
        const review = reviewData[job.id];
        if (!rating || !review) {
            setMessage('Please enter both a rating and a review.');
            return;
        }
        try {
            await apiClient.post('/jobs/rate-worker', {
                job_id: job.id,
                rating: Number(rating),
                review,
            });
            setMessage('Rating submitted successfully!');
            fetchMyJobs();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to submit rating.');
        }
    };

    const handleCancel = async (job) => {
        try {
            await apiClient.post('/jobs/cancel-job?job_id=' + job.id);
            setMessage('Job cancelled successfully!');
            fetchMyJobs();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to cancel job.');
        }
    };

    const chatLink = (job) => {
        return '/chat?job_id=' + job.id + '&receiver_id=' + job.worker_id;
    };

    return (
        <div style={{ padding: '40px', maxWidth: '700px', margin: 'auto' }}>
            <h2>Customer Dashboard</h2>
            <a href="/home">Home</a> | <a href="/post-job">Post a Job</a> | <a href="/" onClick={clearSession}>Logout</a>
            <hr />
            {message && <p style={{ color: 'green' }}>{message}</p>}
            <h3>My Posted Jobs</h3>
            {myJobs.length === 0 ? (
                <p>You have not posted any jobs yet.</p>
            ) : (
                myJobs.map((job) => (
                    <div key={job.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
                        <h4>{job.title}</h4>
                        <p>{job.description}</p>
                        <p>Location: {job.location}</p>
                        <p>Price: ${job.price}</p>
                        <p>Status: <strong>{job.status}</strong></p>
                        {job.worker_id && <p>Worker ID: {job.worker_id}</p>}

                        {job.worker_id && (
                            <a href={chatLink(job)} style={{ display: 'inline-block', marginBottom: '10px', padding: '6px 14px', backgroundColor: '#007bff', color: 'white', borderRadius: '20px', textDecoration: 'none' }}>
                                Chat with Worker
                            </a>
                        )}

                        {job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
                            <button
                                onClick={() => handleCancel(job)}
                                style={{ display: 'inline-block', marginBottom: '10px', padding: '6px 14px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', marginLeft: '10px' }}
                            >
                                Cancel Job
                            </button>
                        )}

                        {job.status === 'COMPLETED' && !job.paid && (
                            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #a5d6a7' }}>
                                <h5 style={{ margin: '0 0 10px 0' }}>Pay Worker</h5>
                                <p style={{ margin: '0 0 10px 0' }}>Amount: <strong>${job.price}</strong></p>
                                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#555' }}>
                                    Worker receives: <strong>${(job.price * 0.9).toFixed(2)}</strong> | Platform fee: <strong>${(job.price * 0.1).toFixed(2)}</strong>
                                </p>
                                <button
                                    onClick={() => handlePay(job)}
                                    style={{ padding: '8px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Pay Now
                                </button>
                            </div>
                        )}

                        {job.paid && (
                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
                                <p style={{ margin: 0, color: '#155724' }}>
                                    Payment has been completed for this job.
                                </p>
                            </div>
                        )}

                        {job.status === 'COMPLETED' && job.paid && !job.rating && (
                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                                <h5>Rate this Worker</h5>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    placeholder="Rating (1-5)"
                                    onChange={(e) => setRatingData({ ...ratingData, [job.id]: e.target.value })}
                                    style={{ display: 'block', width: '100%', marginBottom: '8px', padding: '6px' }}
                                />
                                <textarea
                                    placeholder="Write a review..."
                                    onChange={(e) => setReviewData({ ...reviewData, [job.id]: e.target.value })}
                                    style={{ display: 'block', width: '100%', marginBottom: '8px', padding: '6px', height: '70px' }}
                                />
                                <button
                                    onClick={() => handleRate(job)}
                                    style={{ padding: '8px 16px', backgroundColor: 'green', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                >
                                    Submit Rating
                                </button>
                            </div>
                        )}

                        {job.rating && (
                            <p style={{ color: 'green' }}>Rating submitted! Score: {job.rating}/5</p>
                        )}
                    </div>
                ))
            )}

            <hr />
            <h3>Payment History</h3>
            {transactions.length === 0 ? (
                <p style={{ color: '#888' }}>No payments made yet.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                            <th style={thStyle}>Job</th>
                            <th style={thStyle}>Total Paid</th>
                            <th style={thStyle}>Worker Got</th>
                            <th style={thStyle}>Platform Fee</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((t) => (
                            <tr key={t.payment_id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={tdStyle}>{t.job_title}</td>
                                <td style={tdStyle}>${t.total_amount}</td>
                                <td style={{ ...tdStyle, color: '#28a745', fontWeight: 'bold' }}>${t.worker_received}</td>
                                <td style={{ ...tdStyle, color: '#dc3545' }}>${t.platform_fee}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                            <td style={tdStyle}>Total</td>
                            <td style={tdStyle}>${transactions.reduce((sum, t) => sum + t.total_amount, 0)}</td>
                            <td style={{ ...tdStyle, color: '#28a745' }}>${transactions.reduce((sum, t) => sum + t.worker_received, 0)}</td>
                            <td style={{ ...tdStyle, color: '#dc3545' }}>${transactions.reduce((sum, t) => sum + t.platform_fee, 0)}</td>
                        </tr>
                    </tfoot>
                </table>
            )}
        </div>
    );
}

const thStyle = {
    padding: '10px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    fontSize: '14px'
};

const tdStyle = {
    padding: '10px',
    fontSize: '14px'
};

export default CustomerDashboardV2;
