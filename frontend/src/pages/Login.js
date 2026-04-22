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
                email: email.trim().toLowerCase(),
                password,
            });
            const userId = response.data.user_id;
            const role = response.data.role;
            const token = response.data.token;
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
                        <p className="auth-kicker">Welcome back</p>
                        <h1>Book trusted local help without the confusion.</h1>
                        <p>
                            Post a job, message workers, pay securely, and keep every step
                            of the job in one simple dashboard.
                        </p>
                    </div>
                </div>

                <div className="auth-feature-grid">
                    <div className="auth-feature-card">
                        <strong>Post jobs faster</strong>
                        <span>Write a clear request, set your budget, and share the location in minutes.</span>
                    </div>
                    <div className="auth-feature-card">
                        <strong>Track every step</strong>
                        <span>See when work is accepted, completed, paid, and rated from one place.</span>
                    </div>
                    <div className="auth-feature-card">
                        <strong>Stay connected</strong>
                        <span>Use built-in chat so customers and workers stay aligned during the job.</span>
                    </div>
                </div>
            </section>

            <section className="auth-panel">
                <div className="auth-card">
                    <h2>Sign In</h2>
                    <p className="auth-subtitle">Use your email and password to open your workspace.</p>
                    <div className="auth-form">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="email"
                            inputMode="email"
                            spellCheck={false}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="current-password"
                            spellCheck={false}
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
                            Google sign-in coming soon
                        </button>
                    </div>
                    <p className="auth-message">{message}</p>
                    <p className="auth-switch">Need an account? <Link to="/register">Create one</Link></p>
                </div>
            </section>
        </div>
    );
}

export default Login;
