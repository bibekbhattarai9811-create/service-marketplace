import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from "../components/Navbar";

const API = 'https://service-marketplace-16.onrender.com';

function Home() {
    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState('');

    const role = localStorage.getItem('role');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await axios.get(`${API}/jobs/available-jobs`);
            setJobs(response.data);
        } catch (error) {
            setMessage('Failed to load jobs.');
        }
    };

    return (
        <>
            <Navbar />

            <div className="container mt-4">
                <h2 className="mb-4">Available Jobs</h2>

                <div className="mb-4">
                    {role === 'customer' ? (
                        <>
                            <a href="/post-job" className="btn btn-primary me-2">Post a Job</a>
                            <a href="/customer-dashboard" className="btn btn-outline-primary">My Dashboard</a>
                        </>
                    ) : (
                        <a href="/dashboard" className="btn btn-outline-success">Worker Dashboard</a>
                    )}
                </div>

                {message && <p>{message}</p>}

                {jobs.length === 0 ? (
                    <p>No jobs available right now.</p>
                ) : (
                    jobs.map((job) => (
                        <div key={job.id} className="card mb-3 shadow">
                            <div className="card-body">
                                <h5 className="card-title">{job.title}</h5>
                                <p className="card-text">{job.description}</p>
                                <p>📍 Location: {job.location}</p>
                                <p>💰 Price: ${job.price}</p>
                                <span className="badge bg-success">{job.status}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

export default Home;