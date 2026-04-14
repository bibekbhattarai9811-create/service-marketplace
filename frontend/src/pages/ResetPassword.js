import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function ResetPassword() {
    const token = useMemo(
        () => new URLSearchParams(window.location.search).get('token') || '',
        []
    );
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const requestReset = async () => {
        if (!EMAIL_RE.test(email.trim())) {
            setIsError(true);
            setMessage('Enter a valid email address.');
            return;
        }
        try {
            const response = await apiClient.post('/password-reset/request', { email: email.trim() });
            setIsError(false);
            setMessage(response.data.reset_url || response.data.message);
        } catch (error) {
            setIsError(true);
            setMessage(error.response?.data?.detail || 'Failed to request reset.');
        }
    };

    const confirmReset = async () => {
        if (!PASSWORD_RE.test(password)) {
            setIsError(true);
            setMessage('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
            return;
        }
        try {
            const response = await apiClient.post('/password-reset/confirm', { token, password });
            setIsError(false);
            setMessage(response.data.message);
        } catch (error) {
            setIsError(true);
            setMessage(error.response?.data?.detail || 'Failed to reset password.');
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
                        <p className="auth-kicker">Account recovery</p>
                        <h1>Recover access without losing your work.</h1>
                        <p>
                            Request a reset link or finish your password reset from one page.
                        </p>
                    </div>
                </div>
            </section>

            <section className="auth-panel">
                <div className="auth-card">
                    <h2>{token ? 'Set a new password' : 'Reset password'}</h2>
                    <p className="auth-subtitle">
                        {token ? 'Choose a new password for your account.' : 'Enter your email and we will generate a reset link.'}
                    </p>
                    <div className="auth-form">
                        {token ? (
                            <input
                                type="password"
                                placeholder="New Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        ) : (
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        )}
                        {token && <p className="field-hint">Use at least 8 characters with uppercase, lowercase, and a number.</p>}
                        <button className="auth-button" onClick={token ? confirmReset : requestReset}>
                            {token ? 'Update Password' : 'Send Reset Link'}
                        </button>
                    </div>
                    <p className={`auth-message ${isError ? 'error' : ''}`}>{message}</p>
                    <p className="auth-switch"><Link to="/">Back to login</Link></p>
                </div>
            </section>
        </div>
    );
}

export default ResetPassword;
