import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://service-marketplace-11.onrender.com';

function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState('');
    const userId = localStorage.getItem('user_id');

    useEffect(() => {
        fetchAvailableJobs();
    }, []);

    const fetchAvailableJobs = async () => {
        try {
            const response = await axios.get(`${API}/available-jobs`);
            setJobs(response.data);
        } catch (error) {
            setMessage('Failed to load jobs.');
        }
    };

    const acceptJob = async (jobId) => {
        try {
            await axios.post(`${API}/accept-job?job_id=${jobId}&worker_id=${userId}`);
            setMessage('Job accepted successfully!');
            fetchAvailableJobs();
        } catch (error) {
            setMessage('Failed to accept job.');
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto' }}>
            <h2>Worker Dashboard</h2>
            <a href="/home" style={{ marginRight: '20px' }}>🏠 Home</a>
            <a href="/">🚪 Logout</a>
            <br /><br />
            {message && <p style={{ color: 'green' }}>{message}</p>}
            {jobs.length === 0 ? (
                <p>No available jobs right now.</p>
            ) : (
                jobs.map((job) => (
                    <div key={job.id} style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '10px', borderRadius: '8px' }}>
                        <h3>{job.title}</h3>
                        <p>{job.description}</p>
                        <p>📍 Location: {job.location}</p>
                        <p>💰 Price: ${job.price}</p>
                        <button
                            onClick={() => acceptJob(job.id)}
                            style={{ padding: '8px 16px', backgroundColor: 'green', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        >
                            Accept Job
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}

export default Dashboard;