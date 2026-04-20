import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiClient, clearSession } from "../api";

const PAGE_META = {
    "/home": { title: "Marketplace Overview", subtitle: "Browse open jobs and local opportunities." },
    "/profile": { title: "Profile Studio", subtitle: "Keep your public presence polished and trusted." },
    "/workers": { title: "Worker Directory", subtitle: "Compare skills, ratings, and service coverage." },
    "/notifications": { title: "Notification Center", subtitle: "Track activity, reminders, and status updates." },
    "/customer-dashboard": { title: "Customer Command", subtitle: "Manage requests, payments, and worker activity." },
    "/post-job": { title: "Create New Job", subtitle: "Post a request with details workers can trust." },
    "/dashboard": { title: "Worker Command", subtitle: "Accept work, manage jobs, and monitor earnings." },
    "/admin": { title: "Admin Analytics", subtitle: "Watch platform health, users, and disputes." },
    "/welcome": { title: "Welcome", subtitle: "Set up your account and get moving." },
};

function Navbar() {
    const role = localStorage.getItem("role");
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const navLinks = useMemo(() => {
        const links = [
            { to: "/home", label: "Home", icon: "⌂" },
            { to: "/profile", label: "Profile", icon: "◔" },
            { to: "/workers", label: "Workers", icon: "◎" },
            { to: "/notifications", label: "Notifications", icon: "◌" },
        ];

        if (role === "customer") {
            links.push({ to: "/customer-dashboard", label: "Customer", icon: "◫" });
            links.push({ to: "/post-job", label: "Post Job", icon: "+", primary: true });
        } else if (role === "admin") {
            links.push({ to: "/admin", label: "Admin", icon: "◆", primary: true });
        } else {
            links.push({ to: "/dashboard", label: "Worker", icon: "◍" });
        }

        return links;
    }, [role]);

    const closeMenu = () => setIsOpen(false);

    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        let isMounted = true;

        const loadSummary = async () => {
            try {
                const response = await apiClient.get("/jobs/notifications/summary");
                if (isMounted) {
                    setUnreadCount(response.data.unread_count || 0);
                }
            } catch (error) {
                if (isMounted) {
                    setUnreadCount(0);
                }
            }
        };

        loadSummary();
        const interval = setInterval(loadSummary, 15000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const userName = localStorage.getItem("user_name") || (role ? `${role[0].toUpperCase()}${role.slice(1)}` : "Member");
    const userEmail = localStorage.getItem("user_email") || `${role || "account"}@service-marketplace.app`;
    const meta = PAGE_META[location.pathname] || { title: "Service Marketplace", subtitle: "Manage your marketplace flow." };

    return (
        <>
            {isOpen && <button type="button" className="app-nav-backdrop" aria-label="Close navigation" onClick={closeMenu} />}

            <aside className={`app-topbar ${isOpen ? "open" : ""}`}>
                <div className="app-sidebar-head">
                    <Link className="app-brand" to="/home">
                        <span className="auth-brand-badge">SM</span>
                        <span className="app-brand-copy">
                            <strong>Service Marketplace</strong>
                            <small>{role === "worker" ? "Worker flow" : role === "admin" ? "Admin desk" : "Customer flow"}</small>
                        </span>
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
                </div>

                <div className="app-nav-shell">
                    <div className="app-nav-group">
                        {navLinks.map((link) => {
                            const isActive = location.pathname === link.to;
                            return (
                                <Link
                                    key={link.to}
                                    className={`app-nav-link ${link.primary ? "app-nav-link-primary" : ""} ${isActive ? "active" : ""}`.trim()}
                                    to={link.to}
                                    onClick={closeMenu}
                                >
                                    <span className="app-nav-icon">{link.icon}</span>
                                    <span className="app-nav-text">{link.label}</span>
                                    {link.to === "/notifications" && unreadCount > 0 && (
                                        <span className="nav-badge">{unreadCount}</span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="app-sidebar-foot">
                        <Link
                            className="app-nav-link app-nav-logout"
                            to="/"
                            onClick={() => {
                                clearSession();
                                closeMenu();
                            }}
                        >
                            <span className="app-nav-icon">↩</span>
                            <span className="app-nav-text">Logout</span>
                        </Link>
                    </div>
                </div>
            </aside>

            <header className="app-header-bar">
                <div className="app-header-copy">
                    <span className="app-header-kicker">Workspace</span>
                    <strong>{meta.title}</strong>
                    <small>{meta.subtitle}</small>
                </div>

                <div className="app-header-tools">
                    <div className="app-header-search">
                        <span>⌕</span>
                        <input type="text" placeholder="Search jobs, workers, or pages" readOnly />
                    </div>
                    <div className="app-header-bell">
                        <span>◌</span>
                        {unreadCount > 0 && <em>{unreadCount}</em>}
                    </div>
                    <div className="app-user-pill">
                        <div className="app-user-avatar">{userName.slice(0, 1).toUpperCase()}</div>
                        <div className="app-user-copy">
                            <strong>{userName}</strong>
                            <small>{userEmail}</small>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}

export default Navbar;
