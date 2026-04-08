import React, { useState } from 'react';
import { apiClient } from '../api';

function PostJob() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [price, setPrice] = useState('');
    const [message, setMessage] = useState('');

    const handlePostJob = async () => {
        try {
            const response = await apiClient.post('/jobs/create-job', {
                title,
                description,
                location,
                price: Number(price),
            });
            setMessage('Job posted successfully! Job ID: ' + response.data.job_id);
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Failed to post job. Please try again.');
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '400px', margin: 'auto' }}>
            <h2>Post a Job</h2>
            <input type="text" placeholder="Job Title" value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <textarea placeholder="Job Description" value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', height: '100px' }}
            />
            <input type="text" placeholder="Location" value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <input type="number" placeholder="Price ($)" value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <button onClick={handlePostJob}
                style={{ padding: '10px 20px', backgroundColor: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}
            >
                Post Job
            </button>
            <p>{message}</p>
            <a href="/home">← Back to Home</a>
        </div>
    );
}

export default PostJob;
