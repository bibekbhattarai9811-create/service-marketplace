import React from "react";
import { Link } from "react-router-dom";
import { clearSession } from "../api";

function Navbar() {
    const role = localStorage.getItem("role");

    return (
        <nav className="app-topbar">
            <Link className="app-brand" to="/home">
                <span className="auth-brand-badge">SM</span>
                Service Marketplace
            </Link>

            <div className="app-nav">
                <Link className="app-nav-link" to="/home">
                    Home
                </Link>
                <Link className="app-nav-link" to="/profile">
                    Profile
                </Link>
                <Link className="app-nav-link" to="/workers">
                    Workers
                </Link>
                <Link className="app-nav-link" to="/notifications">
                    Notifications
                </Link>

                {role === "customer" ? (
                    <>
                        <Link className="app-nav-link" to="/customer-dashboard">
                            Customer Dashboard
                        </Link>
                        <Link className="app-nav-link app-nav-link-primary" to="/post-job">
                            Post Job
                        </Link>
                    </>
                ) : role === "admin" ? (
                    <Link className="app-nav-link app-nav-link-primary" to="/admin">
                        Admin Analytics
                    </Link>
                ) : (
                    <Link className="app-nav-link" to="/dashboard">
                        Worker Dashboard
                    </Link>
                )}

                <Link className="app-nav-link" to="/" onClick={clearSession}>
                    Logout
                </Link>
            </div>
        </nav>
    );
}

export default Navbar;
