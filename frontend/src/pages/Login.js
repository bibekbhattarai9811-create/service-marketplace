import React, { useState } from 'react';
import axios from 'axios';

const API = 'https://service-marketplace-11.onrender.com';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleLogin = async () => {
        try {
            const response = await axios.post(
                `${API}/login`,
                null,
                { params: { email: email, password: password } }
            );
            setMessage('Login successful! User ID: ' + response.data.user_id);
        } catch (error) {
            console.log(error);
            setMessage('Login failed: ' + error.message);
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
        </div>
    );
}

export default Login;