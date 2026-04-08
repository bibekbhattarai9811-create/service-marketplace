import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api';

function Chat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [message, setMessage] = useState('');

    const jobId = new URLSearchParams(window.location.search).get('job_id');
    const receiverId = new URLSearchParams(window.location.search).get('receiver_id');
    const senderId = localStorage.getItem('user_id');
    const role = localStorage.getItem('role');

    const bottomRef = useRef(null);

    const fetchMessages = useCallback(async () => {
        try {
            const response = await apiClient.get(`/jobs/chat/${jobId}`);
            setMessages(response.data);
        } catch (error) {
            setMessage('Failed to load messages.');
        }
    }, [jobId]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        try {
            await apiClient.post('/jobs/send-message', {
                job_id: Number(jobId),
                receiver_id: Number(receiverId),
                message: newMessage,
            });
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
        <div className="app-shell">
            <div className="page-wrap">
                <section className="chat-card">
                    <div className="chat-header">
                        <div>
                            <span className="hero-label">Conversation</span>
                            <h2>Job Chat</h2>
                            <p className="section-subtitle">Job ID: {jobId}</p>
                        </div>
                        <Link to={role === 'customer' ? '/customer-dashboard' : '/dashboard'} className="ghost-button">
                            Back to Dashboard
                        </Link>
                    </div>

                    {message && <div className="message-banner error">{message}</div>}

                    <div className="chat-thread">
                        {messages.length === 0 ? (
                            <div className="empty-state">No messages yet. Start the conversation.</div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`chat-row ${msg.sender_id === parseInt(senderId, 10) ? 'mine' : 'theirs'}`}
                                >
                                    <div className="chat-bubble">{msg.message}</div>
                                </div>
                            ))
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="chat-compose">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button className="secondary-button" onClick={handleSend}>
                            Send
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Chat;
