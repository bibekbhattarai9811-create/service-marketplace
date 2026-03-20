import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "https://service-marketplace-16.onrender.com";

function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [workerJobs, setWorkerJobs] = useState([]);
    const [message, setMessage] = useState({ text: "", isError: false });
    const [earnings, setEarnings] = useState(null);
    const [rating, setRating] = useState(null);
    const wsRef = useRef(null);

    const userId = Number(localStorage.getItem("user_id") || 0);

    // -------------------------
    // Available Jobs
    // -------------------------
    const fetchAvailableJobs = async () => {
        try {
            const response = await axios.get(`${API}/jobs/available-jobs`);
            setJobs(response.data);
        } catch (error) {
            console.log("Load jobs error:", error);
            setMessage({ text: "Failed to load jobs.", isError: true });
        }
    };

    // -------------------------
    // Worker Accepted Jobs
    // -------------------------
    const fetchWorkerJobs = async () => {
        try {
            const response = await axios.get(`${API}/jobs/worker-jobs/${userId}`);
            setWorkerJobs(response.data);
        } catch (error) {
            console.log("Load worker jobs error:", error);
        }
    };

    // -------------------------
    // Earnings
    // -------------------------
    const fetchEarnings = async () => {
        if (!userId) return;
        try {
            const response = await axios.get(
                `${API}/worker-earnings?worker_id=${userId}`
            );
            setEarnings(response.data);
        } catch (error) {
            console.log("Failed to load earnings:", error);
        }
    };

    // -------------------------
    // Worker Rating
    // -------------------------
    const fetchRating = async () => {
        try {
            const response = await axios.get(`${API}/jobs/worker-rating/${userId}`);
            setRating(response.data.average_rating);
        } catch (error) {
            console.log("Rating error:", error);
        }
    };

    // -------------------------
    // Accept Job
    // -------------------------
    const acceptJob = async (jobId) => {
        try {
            await axios.post(`${API}/jobs/accept-job`, null, {
                params: { job_id: jobId, worker_id: userId },
            });

            setMessage({ text: "Job accepted successfully!", isError: false });

            fetchAvailableJobs();
            fetchWorkerJobs();
            fetchEarnings();

        } catch (error) {
            console.log("Accept job error:", error.response?.data || error);
            setMessage({ text: "Failed to accept job.", isError: true });
        }
    };

    // -------------------------
    // Complete Job
    // -------------------------
    const completeJob = async (jobId) => {
        try {
            await axios.post(`${API}/jobs/complete-job`, null, {
                params: { job_id: jobId },
            });

            setMessage({ text: "Job completed!", isError: false });

            fetchWorkerJobs();
            fetchEarnings();

        } catch (error) {
            console.log("Complete job error:", error);
            setMessage({ text: "Failed to complete job.", isError: true });
        }
    };

    // -------------------------
    // WebSocket
    // -------------------------
    useEffect(() => {

        fetchAvailableJobs();
        fetchWorkerJobs();
        fetchEarnings();
        fetchRating();

        const ws = new WebSocket("wss://service-marketplace-16.onrender.com/ws");
        wsRef.current = ws;

        ws.onopen = () => console.log("WebSocket connected");

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === "new_job") {
                    alert(`New Job Available\n${data.title} - $${data.price}`);
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
        };

    }, [userId]);

    return (
        <div style={{ padding: "40px", maxWidth: "900px", margin: "auto" }}>

            <h2>Worker Dashboard</h2>

            <div style={{ marginBottom: "20px" }}>
                <a href="/home" style={{ marginRight: "20px" }}>Home</a>
                <a href="/">Logout</a>
            </div>

            {message.text && (
                <p style={{ color: message.isError ? "red" : "green" }}>
                    {message.text}
                </p>
            )}

            {/* Worker Stats */}
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
                    <p>Average Rating: ⭐ {rating || 0}</p>
                </div>
            )}

            {/* Available Jobs */}
            <h3>Available Jobs</h3>

            {jobs.length === 0 ? (
                <p>No available jobs right now.</p>
            ) : (
                jobs.map((job) => (
                    <div key={job.id} style={{
                        border: "1px solid #ccc",
                        padding: "20px",
                        marginBottom: "10px",
                        borderRadius: "8px"
                    }}>
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

            {/* Worker Accepted Jobs */}
            <h3 style={{ marginTop: "40px" }}>Your Jobs</h3>

            {workerJobs.length === 0 ? (
                <p>No accepted jobs.</p>
            ) : (
                workerJobs.map((job) => (
                    <div key={job.id} style={{
                        border: "1px solid #ccc",
                        padding: "20px",
                        marginBottom: "10px",
                        borderRadius: "8px"
                    }}>
                        <h3>{job.title}</h3>
                        <p>Status: {job.status}</p>
                        <p>Price: ${job.price}</p>

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

        </div>
    );
}

export default Dashboard;