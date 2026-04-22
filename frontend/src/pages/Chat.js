import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, resolveAssetUrl, WS_API } from '../api';

const RTC_CONFIGURATION = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function Chat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [callState, setCallState] = useState('idle');
    const [incomingCall, setIncomingCall] = useState(null);
    const [localStreamState, setLocalStreamState] = useState(null);
    const [remoteStreamState, setRemoteStreamState] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const fileInputRef = useRef(null);
    const socketRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const activeCallUserIdRef = useRef(null);

    const jobId = Number(new URLSearchParams(window.location.search).get('job_id') || 0);
    const receiverId = Number(new URLSearchParams(window.location.search).get('receiver_id') || 0);
    const senderId = Number(localStorage.getItem('user_id') || 0);
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

    const sendSocketPayload = useCallback((payload) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            return false;
        }
        socketRef.current.send(JSON.stringify(payload));
        return true;
    }, []);

    const cleanupCall = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.onicecandidate = null;
            peerConnectionRef.current.ontrack = null;
            peerConnectionRef.current.onconnectionstatechange = null;
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach((track) => track.stop());
            remoteStreamRef.current = null;
        }

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }

        setLocalStreamState(null);
        setRemoteStreamState(null);
        setIncomingCall(null);
        activeCallUserIdRef.current = null;
        setCallState('idle');
        setIsMuted(false);
        setIsCameraEnabled(true);
    }, []);

    const ensureLocalStream = useCallback(async () => {
        if (localStreamRef.current) {
            return localStreamRef.current;
        }

        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            throw new Error('Video chat requires HTTPS so the browser can access camera and microphone.');
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera and microphone are not available in this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setLocalStreamState(stream);
        return stream;
    }, []);

    const ensurePeerConnection = useCallback(async (targetUserId) => {
        if (peerConnectionRef.current) {
            return peerConnectionRef.current;
        }

        const localStream = await ensureLocalStream();
        const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);

        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = (event) => {
            if (!event.candidate || !activeCallUserIdRef.current) {
                return;
            }
            sendSocketPayload({
                type: 'video_signal',
                job_id: jobId,
                target_user_id: activeCallUserIdRef.current,
                signal: {
                    type: 'candidate',
                    candidate: event.candidate,
                },
            });
        };

        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            if (!remoteStream) {
                return;
            }
            remoteStreamRef.current = remoteStream;
            setRemoteStreamState(remoteStream);
            setCallState('connected');
        };

        peerConnection.onconnectionstatechange = () => {
            const state = peerConnection.connectionState;
            if (state === 'connected') {
                setCallState('connected');
            } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                cleanupCall();
                setMessage('Video call ended.');
            }
        };

        peerConnectionRef.current = peerConnection;
        activeCallUserIdRef.current = targetUserId;
        return peerConnection;
    }, [cleanupCall, ensureLocalStream, jobId, sendSocketPayload]);

    const endCall = useCallback((notifyRemote = true) => {
        const targetUserId = activeCallUserIdRef.current;
        if (notifyRemote && targetUserId) {
            sendSocketPayload({
                type: 'video_call_end',
                job_id: jobId,
                target_user_id: targetUserId,
            });
        }
        cleanupCall();
    }, [cleanupCall, jobId, sendSocketPayload]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    useEffect(() => {
        if (!token) {
            return undefined;
        }

        const socket = new WebSocket(`${WS_API}?token=${encodeURIComponent(token)}`);
        socketRef.current = socket;

        socket.onmessage = async (event) => {
            try {
                const payload = JSON.parse(event.data);

                if (payload.type === 'chat_message' && String(payload.job_id) === String(jobId)) {
                    setMessages((current) => {
                        const exists = current.some((item) => item.id === payload.id);
                        if (exists) {
                            return current;
                        }
                        return [...current, payload];
                    });
                    return;
                }

                if (String(payload.job_id) !== String(jobId)) {
                    return;
                }

                if (payload.type === 'video_call_invite') {
                    if (callState !== 'idle') {
                        sendSocketPayload({
                            type: 'video_call_reject',
                            job_id: jobId,
                            target_user_id: payload.sender_id,
                            status: 'busy',
                        });
                        return;
                    }

                    setIncomingCall({
                        senderId: payload.sender_id,
                    });
                    setCallState('incoming');
                    setMessage('Incoming video call.');
                    return;
                }

                if (payload.type === 'video_call_accept') {
                    setMessage('Call accepted. Connecting video...');
                    const peerConnection = await ensurePeerConnection(payload.sender_id);
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    sendSocketPayload({
                        type: 'video_signal',
                        job_id: jobId,
                        target_user_id: payload.sender_id,
                        signal: {
                            type: 'offer',
                            sdp: offer,
                        },
                    });
                    setCallState('connecting');
                    return;
                }

                if (payload.type === 'video_call_reject') {
                    cleanupCall();
                    setMessage(payload.status === 'busy' ? 'The other user is already on another call.' : 'The video call was declined.');
                    return;
                }

                if (payload.type === 'video_call_end') {
                    cleanupCall();
                    setMessage('Video call ended.');
                    return;
                }

                if (payload.type === 'video_signal') {
                    const signal = payload.signal || {};
                    const peerConnection = await ensurePeerConnection(payload.sender_id);

                    if (signal.type === 'offer' && signal.sdp) {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        sendSocketPayload({
                            type: 'video_signal',
                            job_id: jobId,
                            target_user_id: payload.sender_id,
                            signal: {
                                type: 'answer',
                                sdp: answer,
                            },
                        });
                        setCallState('connecting');
                        return;
                    }

                    if (signal.type === 'answer' && signal.sdp) {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                        setCallState('connecting');
                        return;
                    }

                    if (signal.type === 'candidate' && signal.candidate) {
                        try {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                        } catch (error) {
                            // Ignore transient ICE issues and keep the call flow going.
                        }
                    }
                }
            } catch (error) {
                // Ignore malformed live events and keep the chat usable.
            }
        };

        return () => {
            socket.close();
            socketRef.current = null;
            cleanupCall();
        };
    }, [callState, cleanupCall, ensurePeerConnection, fetchMessages, jobId, sendSocketPayload, token]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (localVideoRef.current && localStreamState) {
            localVideoRef.current.srcObject = localStreamState;
        }
    }, [localStreamState]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStreamState) {
            remoteVideoRef.current.srcObject = remoteStreamState;
        }
    }, [remoteStreamState]);

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

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') handleSend();
    };

    const startVideoCall = async () => {
        try {
            await ensureLocalStream();
            activeCallUserIdRef.current = receiverId;
            setCallState('calling');
            setMessage('Calling other user...');
            sendSocketPayload({
                type: 'video_call_invite',
                job_id: jobId,
                target_user_id: receiverId,
            });
        } catch (error) {
            cleanupCall();
            setMessage(error.message || 'Failed to start video call.');
        }
    };

    const acceptVideoCall = async () => {
        if (!incomingCall?.senderId) {
            return;
        }
        try {
            await ensureLocalStream();
            activeCallUserIdRef.current = incomingCall.senderId;
            setIncomingCall(null);
            setCallState('connecting');
            setMessage('Connecting video...');
            sendSocketPayload({
                type: 'video_call_accept',
                job_id: jobId,
                target_user_id: incomingCall.senderId,
            });
        } catch (error) {
            cleanupCall();
            setMessage(error.message || 'Failed to access camera and microphone.');
        }
    };

    const rejectVideoCall = () => {
        if (incomingCall?.senderId) {
            sendSocketPayload({
                type: 'video_call_reject',
                job_id: jobId,
                target_user_id: incomingCall.senderId,
                status: 'declined',
            });
        }
        setIncomingCall(null);
        setCallState('idle');
        setMessage('Video call declined.');
    };

    const toggleMute = () => {
        if (!localStreamRef.current) {
            return;
        }
        const nextMuted = !isMuted;
        localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = !nextMuted;
        });
        setIsMuted(nextMuted);
    };

    const toggleCamera = () => {
        if (!localStreamRef.current) {
            return;
        }
        const nextEnabled = !isCameraEnabled;
        localStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = nextEnabled;
        });
        setIsCameraEnabled(nextEnabled);
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
                        <div className="button-row">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={startVideoCall}
                                disabled={callState !== 'idle' || !receiverId}
                            >
                                Video Call
                            </button>
                            <Link to={role === 'customer' ? '/customer-dashboard' : '/dashboard'} className="ghost-button">
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>

                    {message && <div className="message-banner error">{message}</div>}

                    {incomingCall && (
                        <div className="chat-call-banner">
                            <div>
                                <strong>Incoming video call</strong>
                                <span>Accept to open your camera and microphone for this job chat.</span>
                            </div>
                            <div className="button-row">
                                <button type="button" className="secondary-button" onClick={acceptVideoCall}>
                                    Accept
                                </button>
                                <button type="button" className="ghost-button" onClick={rejectVideoCall}>
                                    Decline
                                </button>
                            </div>
                        </div>
                    )}

                    {callState !== 'idle' && (
                        <section className="chat-video-panel">
                            <div className="section-header">
                                <div>
                                    <h3>Video Call</h3>
                                    <p className="section-subtitle">
                                        {callState === 'calling' && 'Waiting for the other user to accept.'}
                                        {callState === 'connecting' && 'Setting up the secure peer-to-peer connection.'}
                                        {callState === 'connected' && 'Video chat is live.'}
                                        {callState === 'incoming' && 'An incoming call is waiting for your response.'}
                                    </p>
                                </div>
                            </div>
                            <div className="chat-video-stage">
                                <div className="chat-video-card">
                                    <span className="hero-label">You</span>
                                    {localStreamState ? (
                                        <video ref={localVideoRef} className="chat-video-feed" autoPlay muted playsInline />
                                    ) : (
                                        <div className="chat-video-placeholder">Camera preview will appear here.</div>
                                    )}
                                </div>
                                <div className="chat-video-card">
                                    <span className="hero-label">Other user</span>
                                    {remoteStreamState ? (
                                        <video ref={remoteVideoRef} className="chat-video-feed" autoPlay playsInline />
                                    ) : (
                                        <div className="chat-video-placeholder">Waiting for the other user to join.</div>
                                    )}
                                </div>
                            </div>
                            <div className="button-row">
                                <button type="button" className="ghost-button" onClick={toggleMute} disabled={!localStreamState}>
                                    {isMuted ? 'Unmute' : 'Mute'}
                                </button>
                                <button type="button" className="ghost-button" onClick={toggleCamera} disabled={!localStreamState}>
                                    {isCameraEnabled ? 'Camera Off' : 'Camera On'}
                                </button>
                                <button type="button" className="danger-button" onClick={() => endCall(true)}>
                                    End Call
                                </button>
                            </div>
                        </section>
                    )}

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
                                                    src={resolveAssetUrl(msg.image_url)}
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
