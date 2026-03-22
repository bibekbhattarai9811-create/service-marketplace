import React, { useState } from 'react';
import axios from 'axios';

const API = 'https://service-marketplace-16.onrender.com';

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('customer');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const handleRegister = async () => {
        try {
            const response = await axios.post(
                `${API}/register?name=${name}&email=${email}&phone=${phone}&role=${role}&password=${password}`
            );
            setMessage('Registration successful! User ID: ' + response.data.user_id);
        } catch (error) {
            setMessage('Registration failed. Please try again.');
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '400px', margin: 'auto' }}>
            <h2>Register</h2>
            <input type="text" placeholder="Full Name" value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <input type="text" placeholder="Phone" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <select value={role} onChange={(e) => setRole(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            >
                <option value="customer">Customer</option>
                <option value="worker">Worker</option>
            </select>
            <input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
            />
            <button onClick={handleRegister}
                style={{ padding: '10px 20px', backgroundColor: 'green', color: 'white', border: 'none', cursor: 'pointer' }}
            >
                Register
            </button>
            <p>{message}</p>
            <p>Already have an account? <a href="/">Login</a></p>
        </div>
    );
}

export default Register;