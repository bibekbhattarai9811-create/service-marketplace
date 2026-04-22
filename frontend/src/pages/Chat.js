import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, WS_API } from '../api';

function Chat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const jobId = new URLSearchParams(window.location.search).get('job_id');
    const receiverId = new URLSearchParams(window.location.search).get('receiver_id');
    const senderId = localStorage.getItem('user_id');
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');

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
    }, [fetchMessages]);

    useEffect(() => {
        if (!token) {
            return undefined;
        }

        const socket = new WebSocket(`${WS_API}?token=${encodeURIComponent(token)}`);

        socket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type !== 'chat_message' || String(payload.job_id) !== String(jobId)) {
                    return;
                }

                setMessages((current) => {
                    const exists = current.some((item) => item.id === payload.id);
                    if (exists) {
                        return current;
                    }
                    return [...current, payload];
                });
            } catch (error) {
                // Ignore malformed live events and keep the chat usable.
            }
        };

        return () => socket.close();
    }, [jobId, token]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await apiClient.post('/upload-chat-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = response.data.image_url;
            await apiClient.post('/jobs/send-message', {
                job_id: Number(jobId),
                receiver_id: Number(receiverId),
                message: 'Sent an image',
                image_url: imageUrl
            });
        } catch (error) {
            setMessage('Failed to upload image.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        try {
            await apiClient.post('/jobs/send-message', {
                job_id: Number(jobId),
                receiver_id: Number(receiverId),
                message: newMessage,
            });
            setNewMessage('');
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
                                    <div className="chat-bubble">
                                        {msg.image_url ? (
                                            <div>
                                                <img
                                                    src={msg.image_url}
                                                    alt="attached"
                                                    style={{ maxWidth: '200px', borderRadius: '8px', marginBottom: '4px', display: 'block' }}
                                                />
                                                <div style={{ fontSize: '0.9em' }}>{msg.message}</div>
                                            </div>
                                        ) : (
                                            msg.message
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div className="chat-compose">
                        <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            type="button"
                            className="chat-attach-button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? '...' : 'Attach'}
                        </button>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button className="secondary-button" onClick={handleSend} disabled={uploading}>
                            Send
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Chat;
