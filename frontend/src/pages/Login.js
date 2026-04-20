import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

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
            if (!localStorage.getItem('onboarding_complete')) {
                localStorage.setItem('onboarding_complete', 'false');
            }
            setMessage('Login successful! Redirecting...');
            setTimeout(() => {
                navigate(localStorage.getItem('onboarding_complete') === 'true'
                    ? (role === 'customer' ? '/customer-dashboard' : role === 'admin' ? '/admin' : '/dashboard')
                    : '/welcome');
            }, 1000);
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Login failed. Please try again.');
        }
    };

    return (
        <div className="auth-shell">
            <section className="auth-showcase">
                <div>
                    <div className="auth-brand">
                        <span className="auth-brand-badge">SM</span>
                        Service Marketplace
                    </div>
                    <div className="auth-copy">
                        <p className="auth-kicker">Welcome Back</p>
                        <h1>Get everything you want from one clean service workspace.</h1>
                        <p>
                            Post jobs, chat with workers, track payments, and manage every step
                            of the service flow from one premium command center.
                        </p>
                    </div>
                </div>

                <div className="auth-feature-grid">
                    <div className="auth-feature-card">
                        <strong>Smart requests</strong>
                        <span>Create a request, set the budget, and share the location in seconds.</span>
                    </div>
                    <div className="auth-feature-card">
                        <strong>Live worker flow</strong>
                        <span>Workers can accept, complete, and update jobs from their dashboard.</span>
                    </div>
                    <div className="auth-feature-card">
                        <strong>Payments and trust</strong>
                        <span>Track completed jobs, payments, and customer feedback in one place.</span>
                    </div>
                </div>
            </section>

            <section className="auth-panel">
                <div className="auth-card">
                    <h2>Login</h2>
                    <p className="auth-subtitle">Welcome back. Sign in to continue managing your jobs.</p>
                    <div className="auth-form">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="auth-row">
                            <label className="auth-check">
                                <input type="checkbox" />
                                <span>Remember me</span>
                            </label>
                            <Link to="/reset-password" className="auth-inline-link">Forgot password?</Link>
                        </div>
                        <button className="auth-button" onClick={handleLogin}>
                            Sign In
                        </button>
                        <button type="button" className="auth-outline-button">
                            Continue with Google
                        </button>
                    </div>
                    <p className="auth-message">{message}</p>
                    <p className="auth-switch">Don't have an account? <Link to="/register">Register</Link></p>
                </div>
            </section>
        </div>
    );
}

export default Login;
