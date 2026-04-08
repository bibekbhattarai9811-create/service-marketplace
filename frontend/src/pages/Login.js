import React, { useState } from 'react';
import { apiClient } from '../api';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async () => {
        try {
            const response = await apiClient.post('/login', {
                email,
                password,
            });
            const userId = response.data.user_id;
            const role = response.data.role;
            const token = response.data.token;
            console.log("Login response:", response.data);
            localStorage.setItem('user_id', userId);
            localStorage.setItem('role', role);
            localStorage.setItem('token', token);
            setMessage('Login successful! Redirecting...');
            setTimeout(() => {
                if (role === 'customer') {
                    window.location.href = '/customer-dashboard';
                } else {
                    window.location.href = '/dashboard';
                }
            }, 1000);
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Login failed. Please try again.');
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
