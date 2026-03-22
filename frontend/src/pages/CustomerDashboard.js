import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://service-marketplace-16.onrender.com';

function CustomerDashboard() {
    const [myJobs, setMyJobs] = useState([]);
    const [message, setMessage] = useState('');
    const [ratingData, setRatingData] = useState({});
    const [reviewData, setReviewData] = useState({});
    const [ratedJobs, setRatedJobs] = useState([]);

    const customerId = localStorage.getItem('user_id');

    const fetchMyJobs = async () => {
        try {
            const response = await axios.get(API + '/jobs/customer-jobs/' + customerId);
            setMyJobs(response.data);
        } catch (error) {
            setMessage('Failed to load your jobs.');
        }
    };

    useEffect(() => {
        fetchMyJobs();
        const interval = setInterval(fetchMyJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRate = async (job) => {
        const rating = ratingData[job.id];
        const review = reviewData[job.id];
        if (!rating || !review) {
            setMessage('Please enter both a rating and a review.');
            return;
        }
        try {
            await axios.post(
                API + '/jobs/rate-worker?worker_id=' + job.worker_id + '&rating=' + rating + '&review=' + review
            );
            setRatedJobs([...ratedJobs, job.id]);
            setMessage('Rating submitted successfully!');
        } catch (error) {
            setMessage('Failed to submit rating.');
        }
    };

    const chatLink = (job) => {
        return '/chat?job_id=' + job.id + '&receiver_id=' + job.worker_id;
    };

    return (
        <div style={{ padding: '40px', maxWidth: '700px', margin: 'auto' }}>
            <h2>Customer Dashboard</h2>
            <a href="/home">Home</a> | <a href="/post-job">Post a Job</a> | <a href="/" onClick={() => localStorage.clear()}>Logout</a>
            <hr />
            {message && <p style={{ color: 'green' }}>{message}</p>}
            <h3>My Posted Jobs</h3>
            {myJobs.length === 0 ? (
                <p>You have not posted any jobs yet.</p>
            ) : (
                myJobs.map(job => (
                    <div key={job.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '15px', borderRadius: '8px' }}>
                        <h4>{job.title}</h4>
                        <p>{job.description}</p>
                        <p>Location: {job.location}</p>
                        <p>Price: ${job.price}</p>
                        <p>Status: <strong>{job.status}</strong></p>
                        {job.worker_id && (
                            <p>Worker ID: {job.worker_id}</p>
                        )}
                        {job.worker_id && (
                            <a href={chatLink(job)} style={{ display: 'inline-block', marginBottom: '10px', padding: '6px 14px', backgroundColor: '#007bff', color: 'white', borderRadius: '20px', textDecoration: 'none' }}>
                                Chat with Worker
                            </a>
                        )}
                        {job.status === 'COMPLETED' && !ratedJobs.includes(job.id) && (
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
                        {ratedJobs.includes(job.id) && (
                            <p style={{ color: 'green' }}>Rating submitted!</p>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

export default CustomerDashboard;