import React from "react";
import { clearSession } from "../api";

function Navbar() {
    const role = localStorage.getItem("role");

    return (
        <nav className="app-topbar">
            <a className="app-brand" href="/home">
                <span className="auth-brand-badge">SM</span>
                Service Marketplace
            </a>

            <div className="app-nav">
                <a className="app-nav-link" href="/home">
                    Home
                </a>

                {role === "customer" ? (
                    <>
                        <a className="app-nav-link" href="/customer-dashboard">
                            Customer Dashboard
                        </a>
                        <a className="app-nav-link app-nav-link-primary" href="/post-job">
                            Post Job
                        </a>
                    </>
                ) : (
                    <a className="app-nav-link" href="/dashboard">
                        Worker Dashboard
                    </a>
                )}

                <a className="app-nav-link" href="/" onClick={clearSession}>
                    Logout
                </a>
            </div>
        </nav>
    );
}

export default Navbar;
