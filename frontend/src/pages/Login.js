import React, { useState } from 'react';
import axios from 'axios';

const API = 'https://service-marketplace-16.onrender.com';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async () => {
        try {
            const response = await axios.post(
                `${API}/login?email=${email}&password=${password}`
            );
            const userId = response.data.user_id;
            console.log("Login response:", response.data);
            localStorage.setItem('user_id', userId);
            setMessage('Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = '/home';
            }, 5000);
        } catch (error) {
            setMessage('Login failed. Please try again.');
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '400px', margin: 'auto' }}>
            <h2>Login</h2>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <button
                onClick={handleLogin}
                style={{ padding: '10px 20px', backgroundColor: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}
            >
                Login
            </button>
            <p>{message}</p>
            <p>Don't have an account? <a href="/register">Register</a></p>
        </div>
    );
}

export default Login;
