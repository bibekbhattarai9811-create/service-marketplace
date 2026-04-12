import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiClient } from '../api';

function PostJob() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState('');
    const [jobImage, setJobImage] = useState(null);
    const [message, setMessage] = useState('');

    const handlePostJob = async () => {
        try {
            const response = await apiClient.post('/jobs/create-job', {
                title,
                description,
                location,
                price: Number(price),
            });
            if (jobImage) {
                const formData = new FormData();
                formData.append('file', jobImage);
                await apiClient.post(`/jobs/${response.data.job_id}/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }
            setMessage('Job posted successfully! Job ID: ' + response.data.job_id);
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to post job. Please try again.');
        }
    };

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Create a request</span>
                        <h1>Post a job with all the details a worker needs.</h1>
                        <p>
                            Clear descriptions, location details, and a fair budget help workers
                            accept your request faster and reduce back-and-forth.
                        </p>
                    </section>

                    <aside className="hero-side-panel">
                        <h3>Before you publish</h3>
                        <p>
                            Include the exact task, where the work should happen, and the price
                            you are offering so the right worker can respond quickly.
                        </p>
                        <Link to="/home" className="ghost-button">Back to Home</Link>
                    </aside>
                </div>

                <section className="section-card form-card">
                    <div className="section-header">
                        <div>
                            <h2>Post a Job</h2>
                            <p className="section-subtitle">Fill in the job details below and publish it to the marketplace.</p>
                        </div>
                    </div>

                    <div className="page-form">
                        <input
                            type="text"
                            placeholder="Job Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <textarea
                            placeholder="Job Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="Price ($)"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                        <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp"
                            onChange={(e) => setJobImage(e.target.files?.[0] || null)}
                        />

                        <div className="helper-row">
                            <button className="primary-button" onClick={handlePostJob}>
                                Post Job
                            </button>
                            <Link to="/home" className="ghost-button">Back to Home</Link>
                        </div>
                    </div>

                    {message && <p className="auth-message">{message}</p>}
                </section>
            </div>
        </div>
    );
}

export default PostJob;
