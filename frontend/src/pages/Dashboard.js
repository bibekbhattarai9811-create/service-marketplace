import React, { useState, useEffect, useRef, useCallback } from "react";
import { WS_API, apiClient, clearSession } from "../api";

function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [workerJobs, setWorkerJobs] = useState([]);
    const [message, setMessage] = useState({ text: "", isError: false });
    const [earnings, setEarnings] = useState(null);
    const [rating, setRating] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const wsRef = useRef(null);

    const userId = Number(localStorage.getItem("user_id") || 0);

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

    const fetchTransactions = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await apiClient.get("/transactions");
            setTransactions(response.data);
        } catch (error) {
            console.log("Failed to load transactions:", error);
        }
    }, [userId]);

    const acceptJob = async (jobId) => {
        try {
            await apiClient.post("/jobs/accept-job", null, {
                params: { job_id: jobId },
            });
            setMessage({ text: "Job accepted successfully!", isError: false });
            fetchAvailableJobs();
            fetchWorkerJobs();
            fetchEarnings();
        } catch (error) {
            setMessage({ text: "Failed to accept job.", isError: true });
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
            setMessage({ text: "Failed to complete job.", isError: true });
        }
    };

    const chatLink = (job) => {
        return "/chat?job_id=" + job.id + "&receiver_id=" + job.customer_id;
    };

    useEffect(() => {
        fetchAvailableJobs();
        fetchWorkerJobs();
        fetchEarnings();
        fetchRating();
        fetchTransactions();

        const interval = setInterval(() => {
            fetchTransactions();
            fetchEarnings();
        }, 5000);

        const ws = new WebSocket(WS_API);
        wsRef.current = ws;

        ws.onopen = () => console.log("WebSocket connected");

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "new_job") {
                    alert("New Job: " + data.title + " $" + data.price);
                    fetchAvailableJobs();
                }
            } catch (error) {
                console.log("Non-JSON message:", event.data);
            }
        };

        ws.onerror = (error) => console.log("WebSocket error:", error);
        ws.onclose = () => console.log("WebSocket disconnected");

        return () => {
            if (wsRef.current) wsRef.current.close();
            clearInterval(interval);
        };
    }, [fetchAvailableJobs, fetchWorkerJobs, fetchEarnings, fetchRating, fetchTransactions]);

    return (
        <div style={{ padding: "40px", maxWidth: "900px", margin: "auto" }}>
            <h2>Worker Dashboard</h2>

            <div style={{ marginBottom: "20px" }}>
                <a href="/home" style={{ marginRight: "20px" }}>Home</a>
                <a href="/" onClick={clearSession}>Logout</a>
            </div>

            {message.text && (
                <p style={{ color: message.isError ? "red" : "green" }}>
                    {message.text}
                </p>
            )}

            {earnings && (
                <div style={{
                    border: "1px solid #ccc",
                    padding: "20px",
                    marginBottom: "20px",
                    borderRadius: "8px",
                    backgroundColor: "#f5f5f5"
                }}>
                    <h3>Worker Statistics</h3>
                    <p>Completed Jobs: {earnings.completed_jobs}</p>
                    <p>Total Earnings: ${earnings.total_earnings}</p>
                    <p>Average Rating: {rating || 0}</p>
                </div>
            )}

            <h3>Available Jobs</h3>
            {jobs.length === 0 ? (
                <p>No available jobs right now.</p>
            ) : (
                jobs.map((job) => (
                    <div
                        key={job.id}
                        style={{
                            border: "1px solid #ccc",
                            padding: "20px",
                            marginBottom: "10px",
                            borderRadius: "8px"
                        }}
                    >
                        <h3>{job.title}</h3>
                        <p>{job.description}</p>
                        <p>Location: {job.location}</p>
                        <p>Price: ${job.price}</p>

                        <button
                            onClick={() => acceptJob(job.id)}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: "green",
                                color: "white",
                                border: "none",
                                cursor: "pointer",
                                borderRadius: "4px"
                            }}
                        >
                            Accept Job
                        </button>
                    </div>
                ))
            )}

            <h3 style={{ marginTop: "40px" }}>Your Jobs</h3>
            {workerJobs.length === 0 ? (
                <p>No accepted jobs.</p>
            ) : (
                workerJobs.map((job) => (
                    <div
                        key={job.id}
                        style={{
                            border: "1px solid #ccc",
                            padding: "20px",
                            marginBottom: "10px",
                            borderRadius: "8px"
                        }}
                    >
                        <h3>{job.title}</h3>
                        <p>Status: {job.status}</p>
                        <p>Price: ${job.price}</p>

                        <a
                            href={chatLink(job)}
                            style={{
                                display: "inline-block",
                                marginBottom: "10px",
                                padding: "6px 14px",
                                backgroundColor: "#007bff",
                                color: "white",
                                borderRadius: "20px",
                                textDecoration: "none",
                                marginRight: "10px"
                            }}
                        >
                            Chat with Customer
                        </a>

                        {job.status !== "COMPLETED" && (
                            <button
                                onClick={() => completeJob(job.id)}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "blue",
                                    color: "white",
                                    border: "none",
                                    cursor: "pointer",
                                    borderRadius: "4px"
                                }}
                            >
                                Complete Job
                            </button>
                        )}
                    </div>
                ))
            )}

            {/* Payment History Section */}
            <hr style={{ marginTop: "40px" }} />
            <h3>💳 Payment History</h3>
            {transactions.length === 0 ? (
                <p style={{ color: "#888" }}>No payments received yet.</p>
            ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#f0f0f0" }}>
                            <th style={thStyle}>Job</th>
                            <th style={thStyle}>Total Job Price</th>
                            <th style={thStyle}>You Received</th>
                            <th style={thStyle}>Platform Fee</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => (
                            <tr key={t.payment_id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={tdStyle}>{t.job_title}</td>
                                <td style={tdStyle}>${t.total_amount}</td>
                                <td style={{ ...tdStyle, color: "#28a745", fontWeight: "bold" }}>${t.worker_received}</td>
                                <td style={{ ...tdStyle, color: "#dc3545" }}>${t.platform_fee}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: "#f9f9f9", fontWeight: "bold" }}>
                            <td style={tdStyle}>Total</td>
                            <td style={tdStyle}>${transactions.reduce((sum, t) => sum + t.total_amount, 0)}</td>
                            <td style={{ ...tdStyle, color: "#28a745" }}>${transactions.reduce((sum, t) => sum + t.worker_received, 0)}</td>
                            <td style={{ ...tdStyle, color: "#dc3545" }}>${transactions.reduce((sum, t) => sum + t.platform_fee, 0)}</td>
                        </tr>
                    </tfoot>
                </table>
            )}
        </div>
    );
}

const thStyle = {
    padding: "10px",
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    fontSize: "14px"
};

const tdStyle = {
    padding: "10px",
    fontSize: "14px"
};

export default Dashboard;
