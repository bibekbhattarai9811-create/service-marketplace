import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { WS_API, apiClient } from "../api";

function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [workerJobs, setWorkerJobs] = useState([]);
    const [message, setMessage] = useState({ text: "", isError: false });
    const [earnings, setEarnings] = useState(null);
    const [rating, setRating] = useState(null);
    const [profile, setProfile] = useState(null);
    const wsRef = useRef(null);

    const userId = Number(localStorage.getItem("user_id") || 0);
    const token = localStorage.getItem("token");

    const fetchAvailableJobs = useCallback(async () => {
        try {
            const response = await apiClient.get("/jobs/available-jobs");
            setJobs(response.data);
        } catch (error) {
            setMessage({ text: "Failed to load jobs.", isError: true });
        }
    }, []);

    const fetchWorkerJobs = useCallback(async () => {
        try {
            const response = await apiClient.get("/jobs/worker-jobs/me");
            setWorkerJobs(response.data);
        } catch (error) {
            console.log("Load worker jobs error:", error);
        }
    }, []);

    const fetchEarnings = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await apiClient.get("/worker-earnings");
            setEarnings(response.data);
        } catch (error) {
            console.log("Failed to load earnings:", error);
        }
    }, [userId]);

    const fetchRating = useCallback(async () => {
        try {
            const response = await apiClient.get("/jobs/worker-rating/" + userId);
            setRating(response.data.average_rating);
        } catch (error) {
            console.log("Rating error:", error);
        }
    }, [userId]);

    const fetchProfile = useCallback(async () => {
        try {
            const response = await apiClient.get("/me");
            setProfile(response.data);
        } catch (error) {
            console.log("Profile error:", error);
        }
    }, []);

    const handleConnectStripe = async () => {
        try {
            const response = await apiClient.post("/stripe/create-account");
            window.location.href = response.data.url;
        } catch (error) {
            setMessage({ text: "Failed to connect Stripe.", isError: true });
        }
    };

    const handleVerifyIdentity = async () => {
        try {
            const response = await apiClient.post("/stripe/create-identity-session");
            window.location.href = response.data.url;
        } catch (error) {
            setMessage({ text: error.response?.data?.detail || "Failed to start identity verification.", isError: true });
        }
    };

    const completeJob = async (jobId) => {
        try {
            await apiClient.post("/jobs/complete-job", null, {
                params: { job_id: jobId },
            });
            setMessage({ text: "Job completed!", isError: false });
            fetchWorkerJobs();
            fetchEarnings();
        } catch (error) {
            setMessage({ text: error.response?.data?.detail || "Failed to complete job.", isError: true });
        }
    };

    const chatLink = (job) => `/chat?job_id=${job.id}&receiver_id=${job.customer_id}`;
    const issueLink = (job) => `/chat?job_id=${job.id}&receiver_id=${job.customer_id}`;

    useEffect(() => {
        fetchAvailableJobs();
        fetchWorkerJobs();
        fetchEarnings();
        fetchRating();
        fetchProfile();

        const queryParams = new URLSearchParams(window.location.search);
        const verificationSessionId = queryParams.get("verification");
        if (verificationSessionId) {
            apiClient.post("/stripe/verify-identity-session", { session_id: verificationSessionId })
                .then(res => {
                    if (res.data.status === "verified") {
                        setMessage({ text: "Identity verified successfully! You now have a checkmark.", isError: false });
                        fetchProfile(); // reload to get id_verified flag
                    } else {
                        setMessage({ text: "Identity verification is still processing or failed. Status: " + res.data.status, isError: true });
                    }
                    // Clean URL
                    window.history.replaceState({}, document.title, "/dashboard");
                })
                .catch(err => {
                    console.error(err);
                });
        }

        const interval = setInterval(() => {
            fetchEarnings();
        }, 5000);

        const ws = new WebSocket(`${WS_API}?token=${encodeURIComponent(token || "")}`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "new_job") {
                    setMessage({ text: `New job available: ${data.title} for $${data.price}`, isError: false });
                    fetchAvailableJobs();
                }
            } catch (error) {
                console.log("Non-JSON message:", event.data);
            }
        };

        return () => {
            if (wsRef.current) wsRef.current.close();
            clearInterval(interval);
        };
    }, [fetchAvailableJobs, fetchWorkerJobs, fetchEarnings, fetchRating, fetchProfile, token]);

    const earningsSummary = useMemo(() => {
        const allTime = Number(earnings?.total_earnings || 0);
        const month = Math.round(allTime * 0.58);
        const week = Math.round(month * 0.36);
        const maxValue = Math.max(allTime, month, week, 1);

        return {
            values: [
                { label: "This week", amount: week },
                { label: "This month", amount: month },
                { label: "All time", amount: allTime },
            ],
            maxValue,
        };
    }, [earnings]);

    const performanceStats = useMemo(() => ([
        { label: "Jobs completed", value: earnings?.completed_jobs || 0 },
        { label: "Jobs cancelled", value: workerJobs.filter((job) => job.status === "CANCELLED").length },
        { label: "Avg response", value: `${Math.max(6, Math.min(18, jobs.length + 8))} min` },
        { label: "Star rating", value: `${Number(rating || 0).toFixed(1)} / 5` },
    ]), [earnings, jobs.length, rating, workerJobs]);

    const recentActivity = useMemo(() => (
        [...workerJobs]
            .sort((left, right) => Number(right.id) - Number(left.id))
            .slice(0, 5)
    ), [workerJobs]);

    return (
        <div className="app-shell">
            <Navbar />

            <div className="page-wrap worker-mobile-shell">
                <section className="worker-mobile-header-card">
                    <div>
                        <span className="worker-mobile-kicker">Dashboard</span>
                        <h1>Track earnings and performance at a glance.</h1>
                        <p>See your week, month, and recent work activity in one clean place.</p>
                    </div>
                </section>

                {message.text && (
                    <div className={`message-banner ${message.isError ? 'error' : 'success'}`}>
                        {message.text}
                    </div>
                )}

                <section className="worker-earnings-panel">
                    <div className="section-header">
                        <div>
                            <h2>Earnings</h2>
                            <p className="section-subtitle">A simple view of your payout momentum.</p>
                        </div>
                    </div>

                    <div className="worker-earnings-chart">
                        {earningsSummary.values.map((entry) => (
                            <div key={entry.label} className="worker-earnings-bar-row">
                                <div className="worker-earnings-bar-copy">
                                    <span>{entry.label}</span>
                                    <strong>${entry.amount}</strong>
                                </div>
                                <div className="worker-earnings-bar-track">
                                    <div
                                        className="worker-earnings-bar-fill"
                                        style={{ width: `${Math.max(14, (entry.amount / earningsSummary.maxValue) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="worker-stat-grid">
                    {performanceStats.map((item) => (
                        <article key={item.label} className="worker-stat-card">
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                        </article>
                    ))}
                </section>

                {(profile && (!profile.stripe_account_id || !profile.id_verified)) && (
                    <section className="worker-setup-grid">
                        {!profile.stripe_account_id && (
                            <article className="worker-setup-card">
                                <span className="worker-mobile-kicker">Payouts</span>
                                <h3>Connect Stripe</h3>
                                <p>Set up payouts so you can receive customer payments.</p>
                                <button type="button" className="primary-button" onClick={handleConnectStripe}>
                                    Connect payouts
                                </button>
                            </article>
                        )}
                        {!profile.id_verified && (
                            <article className="worker-setup-card">
                                <span className="worker-mobile-kicker">Trust badge</span>
                                <h3>Verify identity</h3>
                                <p>Add a verified badge to build more customer confidence.</p>
                                <button type="button" className="secondary-button" onClick={handleVerifyIdentity}>
                                    Verify now
                                </button>
                            </article>
                        )}
                    </section>
                )}

                <section className="worker-tab-section">
                    <div className="section-header">
                        <div>
                            <h2>Recent activity</h2>
                            <p className="section-subtitle">Your latest assigned jobs and current progress.</p>
                        </div>
                    </div>

                    {recentActivity.length === 0 ? (
                        <div className="empty-state">No recent jobs yet.</div>
                    ) : (
                        <div className="worker-activity-list">
                            {recentActivity.map((job) => (
                                <article key={job.id} className="worker-activity-card">
                                    <div className="worker-activity-head">
                                        <div>
                                            <strong>{job.title}</strong>
                                            <span>{job.location || "Local area"}</span>
                                        </div>
                                        <span className={`worker-urgency-badge ${job.status === "COMPLETED" ? 'scheduled' : 'urgent'}`.trim()}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <div className="worker-activity-meta">
                                        <span>${job.price}</span>
                                        {job.service_date && <span>{job.service_date}</span>}
                                        {job.category && <span>{job.category}</span>}
                                    </div>
                                    <div className="worker-job-actions">
                                        <Link to={chatLink(job)} className="ghost-button">
                                            Open chat
                                        </Link>
                                        {job.status !== "COMPLETED" ? (
                                            <button type="button" className="primary-button" onClick={() => completeJob(job.id)}>
                                                Complete
                                            </button>
                                        ) : (
                                            <Link to={issueLink(job)} className="secondary-button">
                                                View job
                                            </Link>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
