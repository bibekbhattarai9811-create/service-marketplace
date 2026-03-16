import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "https://service-marketplace-11.onrender.com";

function Dashboard() {

    const [jobs, setJobs] = useState([]);
    const [message, setMessage] = useState("");
    const [earnings, setEarnings] = useState(null);

    const userId = localStorage.getItem("user_id");

    // Fetch jobs
    const fetchAvailableJobs = async () => {
        try {
            const response = await axios.get(`${API}/available-jobs`);
            setJobs(response.data);
        } catch (error) {
            setMessage("Failed to load jobs.");
        }
    };

    // Fetch earnings
    const fetchEarnings = async () => {
        try {
            const response = await axios.get(
                `${API}/worker-earnings?worker_id=${userId}`
            );
            setEarnings(response.data);
        } catch (error) {
            console.log("Failed to load earnings");
        }
    };

    // Accept job
    const acceptJob = async (jobId) => {
        try {
            await axios.post(
                `${API}/accept-job?job_id=${jobId}&worker_id=${userId}`
            );

            setMessage("Job accepted successfully!");

            fetchAvailableJobs();
            fetchEarnings();

        } catch (error) {
            setMessage("Failed to accept job.");
        }
    };

    // Load data + WebSocket
    useEffect(() => {

        fetchAvailableJobs();
        fetchEarnings();

        const ws = new WebSocket("wss://service-marketplace-11.onrender.com/ws");

        ws.onopen = () => {
            console.log("WebSocket connected");
        };

        ws.onmessage = (event) => {

            console.log("WebSocket message:", event.data);

            try {

                const data = JSON.parse(event.data);

                if (data.type === "new_job") {

                    alert(`🔔 New Job Available\n${data.title} - $${data.price}`);

                    fetchAvailableJobs();
                }

            } catch (error) {
                console.log("Non JSON message:", event.data);
            }

        };

        ws.onerror = (error) => {
            console.log("WebSocket error:", error);
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected");
        };

        return () => ws.close();

    }, []);

    return (
        <div style={{ padding: "40px", maxWidth: "800px", margin: "auto" }}>

            <h2>Worker Dashboard</h2>

            <div style={{ marginBottom: "20px" }}>
                <a href="/home" style={{ marginRight: "20px" }}>🏠 Home</a>
                <a href="/">🚪 Logout</a>
            </div>

            {message && <p style={{ color: "green" }}>{message}</p>}

            {earnings && (
                <div
                    style={{
                        border: "1px solid #ccc",
                        padding: "20px",
                        marginBottom: "20px",
                        borderRadius: "8px",
                        backgroundColor: "#f5f5f5"
                    }}
                >
                    <h3>Worker Statistics</h3>
                    <p>Completed Jobs: {earnings.completed_jobs}</p>
                    <p>Total Earnings: ${earnings.total_earnings}</p>
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

                        <p>📍 Location: {job.location}</p>

                        <p>💰 Price: ${job.price}</p>

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

        </div>
    );
}

export default Dashboard;