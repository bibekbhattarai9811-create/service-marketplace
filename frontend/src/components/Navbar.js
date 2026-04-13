import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearSession } from "../api";

function Navbar() {
    const role = localStorage.getItem("role");
    const [isOpen, setIsOpen] = useState(false);
    const navLinks = useMemo(() => {
        const links = [
            { to: "/home", label: "Home" },
            { to: "/profile", label: "Profile" },
            { to: "/workers", label: "Workers" },
            { to: "/notifications", label: "Notifications" },
        ];

        if (role === "customer") {
            links.push({ to: "/customer-dashboard", label: "Customer Dashboard" });
            links.push({ to: "/post-job", label: "Post Job", primary: true });
        } else if (role === "admin") {
            links.push({ to: "/admin", label: "Admin Analytics", primary: true });
        } else {
            links.push({ to: "/dashboard", label: "Worker Dashboard" });
        }

        return links;
    }, [role]);

    const closeMenu = () => setIsOpen(false);

    return (
        <nav className="app-topbar">
            <Link className="app-brand" to="/home">
                <span className="auth-brand-badge">SM</span>
                Service Marketplace
            </Link>

            <button
                type="button"
                className={`app-menu-toggle ${isOpen ? "open" : ""}`}
                aria-label="Toggle navigation menu"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
            >
                <span />
                <span />
                <span />
            </button>

            <div className={`app-nav ${isOpen ? "open" : ""}`}>
                {navLinks.map((link) => (
                    <Link
                        key={link.to}
                        className={`app-nav-link ${link.primary ? "app-nav-link-primary" : ""}`.trim()}
                        to={link.to}
                        onClick={closeMenu}
                    >
                        {link.label}
                    </Link>
                ))}

                <Link className="app-nav-link" to="/" onClick={() => {
                    clearSession();
                    closeMenu();
                }}>
                    Logout
                </Link>
            </div>
        </nav>
    );
}

export default Navbar;
