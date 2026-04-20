import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('customer');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleRegister = async () => {
        if (!EMAIL_RE.test(email.trim())) {
            setMessage('Enter a valid email address.');
            return;
        }
        if (!PASSWORD_RE.test(password)) {
            setMessage('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
            return;
        }

        try {
            const response = await apiClient.post('/register', {
                name,
                email: email.trim(),
                phone,
                role,
                password,
                admin_secret: null,
            });
            setMessage('Registration successful! User ID: ' + response.data.user_id);
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Registration failed. Please try again.');
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
                        <p className="auth-kicker">Create your account</p>
                        <h1>Join the marketplace with a setup that feels clear and fast.</h1>
                        <p>
                            Sign up as a customer to post jobs or as a worker to accept jobs,
                            build trust, and manage everything from one place.
                        </p>
                    </div>
                </div>

                <div className="auth-feature-grid">
                    <div className="auth-feature-card">
                        <strong>Customer tools</strong>
                        <span>Post jobs, review progress, pay securely, and leave ratings.</span>
                    </div>
                    <div className="auth-feature-card">
                        <strong>Worker tools</strong>
                        <span>Browse available jobs, accept work, and track your earnings.</span>
                    </div>
                    <div className="auth-feature-card">
                        <strong>Built-in chat</strong>
                        <span>Keep customers and workers aligned without leaving the app.</span>
                    </div>
                </div>
            </section>

            <section className="auth-panel">
                <div className="auth-card">
                    <h2>Create Account</h2>
                    <p className="auth-subtitle">Set up your details and start using the marketplace.</p>
                    <div className="auth-form">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="customer">Customer</option>
                            <option value="worker">Worker</option>
                        </select>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <p className="field-hint">Use at least 8 characters with uppercase, lowercase, and a number.</p>
                        <button className="auth-button" onClick={handleRegister}>
                            Create Account
                        </button>
                    </div>
                    <p className="auth-message">{message}</p>
                    <p className="auth-switch">Already have an account? <Link to="/">Sign in</Link></p>
                </div>
            </section>
        </div>
    );
}

export default Register;
