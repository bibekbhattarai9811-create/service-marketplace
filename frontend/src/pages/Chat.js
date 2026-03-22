import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'https://service-marketplace-16.onrender.com';

function Chat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [message, setMessage] = useState('');

    const jobId = new URLSearchParams(window.location.search).get('job_id');
    const receiverId = new URLSearchParams(window.location.search).get('receiver_id');
    const senderId = localStorage.getItem('user_id');
    const role = localStorage.getItem('role');

    const bottomRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`${API}/jobs/chat/${jobId}`);
            setMessages(response.data);
        } catch (error) {
            setMessage('Failed to load messages.');
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        try {
            await axios.post(
                `${API}/jobs/send-message?job_id=${jobId}&sender_id=${senderId}&receiver_id=${receiverId}&message=${newMessage}`
            );
            setNewMessage('');
            fetchMessages();
        } catch (error) {
            setMessage('Failed to send message.');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: 'auto' }}>
            <h2>💬 Job Chat</h2>
            <p style={{ color: '#666' }}>Job ID: {jobId}</p>
            {role === 'customer' ? (
                <a href="/customer-dashboard">← Back to Dashboard</a>
            ) : (
                <a href="/dashboard">← Back to Dashboard</a>
            )}
            <hr />
            {message && <p style={{ color: 'red' }}>{message}</p>}

            <div style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '15px',
                height: '400px',
                overflowY: 'auto',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9'
            }}>
                {messages.length === 0 ? (
                    <p style={{ color: '#aaa', textAlign: 'center' }}>No messages yet. Start the conversation!</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} style={{
                            display: 'flex',
                            justifyContent: msg.sender_id === parseInt(senderId) ? 'flex-end' : 'flex-start',
                            marginBottom: '10px'
                        }}>
                            <div style={{
                                backgroundColor: msg.sender_id === parseInt(senderId) ? '#007bff' : '#e0e0e0',
                                color: msg.sender_id === parseInt(senderId) ? 'white' : 'black',
                                padding: '10px 15px',
                                borderRadius: '18px',
                                maxWidth: '70%',
                                wordWrap: 'break-word'
                            }}>
                                {msg.message}
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ccc' }}
                />
                <button
                    onClick={handleSend}
                    style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer' }}
                >
                    Send ➤
                </button>
            </div>
        </div>
    );
}

export default Chat;