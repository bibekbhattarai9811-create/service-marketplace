import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://service-marketplace-11.onrender.com';

function Home() {
    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await axios.get(`${API}/jobs`);
            setJobs(response.data);
        } catch (error) {
            setMessage('Failed to load jobs.');
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto' }}>
            <h2>Available Jobs</h2>
            <a href="/post-job" style={{ padding: '10px 20px', backgroundColor: 'blue', color: 'white', textDecoration: 'none' }}>
                Post a Job
            </a>
            <br /><br />
            {message && <p>{message}</p>}
            {jobs.length === 0 ? (
                <p>No jobs available right now.</p>
            ) : (
                jobs.map((job) => (
                    <div key={job.id} style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '10px', borderRadius: '8px' }}>
                        <h3>{job.title}</h3>
                        <p>{job.description}</p>
                        <p>📍 Location: {job.location}</p>
                        <p>💰 Price: ${job.price}</p>
                        <p>Status: {job.status}</p>
                    </div>
                ))
            )}
        </div>
    );
}

export default Home;