import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiClient, clearSession } from "../api";

const PAGE_META = {
    "/home": { title: "Find Jobs", subtitle: "Browse open work and move to the next step fast." },
    "/profile": { title: "Your Profile", subtitle: "Update your details, trust signals, and availability." },
    "/workers": { title: "Find Workers", subtitle: "Compare skills, ratings, and service areas." },
    "/notifications": { title: "Notifications", subtitle: "See updates, reminders, and activity in one place." },
    "/customer-dashboard": { title: "Customer Dashboard", subtitle: "Track requests, payments, and completed jobs." },
    "/post-job": { title: "Post a Job", subtitle: "Create a clear request workers can understand quickly." },
    "/dashboard": { title: "Worker Dashboard", subtitle: "Manage open jobs, active jobs, and payouts." },
    "/admin": { title: "Admin Analytics", subtitle: "Monitor platform activity, disputes, and growth." },
    "/welcome": { title: "Get Started", subtitle: "Finish setup and start using the marketplace." },
    "/chat": { title: "Messages", subtitle: "Stay aligned with the customer or worker on this job." },
};

const ICONS = {
    home: "H",
    profile: "P",
    workers: "W",
    notifications: "N",
    customer: "C",
    post: "+",
    admin: "A",
    dashboard: "J",
    logout: "L",
};

function Navbar() {
    const role = localStorage.getItem("role");
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    const navLinks = useMemo(() => {
        const links = [
            { to: "/home", label: "Home", icon: ICONS.home },
            { to: "/profile", label: "Profile", icon: ICONS.profile },
            { to: "/workers", label: "Workers", icon: ICONS.workers },
            { to: "/notifications", label: "Alerts", icon: ICONS.notifications },
        ];

        if (role === "customer") {
            links.push({ to: "/customer-dashboard", label: "Dashboard", icon: ICONS.customer });
            links.push({ to: "/post-job", label: "Post Job", icon: ICONS.post, primary: true });
        } else if (role === "admin") {
            links.push({ to: "/admin", label: "Admin", icon: ICONS.admin, primary: true });
        } else {
            links.push({ to: "/dashboard", label: "Jobs", icon: ICONS.dashboard, primary: true });
        }

        return links;
    }, [role]);

    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop =
                window.scrollY ||
                document.documentElement.scrollTop ||
                document.body.scrollTop ||
                0;
            setIsScrolled(scrollTop > 24);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

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
    const meta = PAGE_META[location.pathname] || {
        title: "Service Marketplace",
        subtitle: "Manage jobs, messages, and payments in one place.",
    };
    const primaryLinks = navLinks.slice(0, 4);
    const quickActionLink = role === "customer" ? "/post-job" : role === "admin" ? "/admin" : "/dashboard";
    const quickActionLabel = role === "customer" ? "Post" : role === "admin" ? "Admin" : "Jobs";
    const quickActionIcon = role === "customer" ? ICONS.post : role === "admin" ? ICONS.admin : ICONS.dashboard;

    return (
        <>
            {isOpen && (
                <button
                    type="button"
                    className="app-nav-backdrop"
                    aria-label="Close navigation"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`app-topbar ${isOpen ? "open" : ""}`}>
                <div className="app-sidebar-head">
                    <Link className="app-brand" to="/home">
                        <span className="auth-brand-badge">SM</span>
                        <span className="app-brand-copy">
                            <strong>Service Marketplace</strong>
                            <small>{role === "worker" ? "Worker workspace" : role === "admin" ? "Admin workspace" : "Customer workspace"}</small>
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
                                    onClick={() => setIsOpen(false)}
                                >
                                    <span className="app-nav-icon">{link.icon}</span>
                                    <span className="app-nav-text">{link.label}</span>
                                    {link.to === "/notifications" && unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
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
                                setIsOpen(false);
                            }}
                        >
                            <span className="app-nav-icon">{ICONS.logout}</span>
                            <span className="app-nav-text">Logout</span>
                        </Link>
                    </div>
                </div>
            </aside>

            <header className={`app-header-bar ${isScrolled ? "is-hidden" : ""}`.trim()}>
                <div className="app-header-copy">
                    <span className="app-header-kicker">Workspace</span>
                    <strong>{meta.title}</strong>
                    <small>{meta.subtitle}</small>
                </div>

                <div className="app-header-tools">
                    <div className="app-header-search">
                        <span className="app-header-search-icon">Go</span>
                        <input type="text" placeholder="Search is coming soon" readOnly />
                    </div>
                    <Link to="/notifications" className="app-header-bell" aria-label="Open notifications">
                        <span className="app-header-bell-label">N</span>
                        {unreadCount > 0 && <em>{unreadCount}</em>}
                    </Link>
                    <div className="app-user-pill">
                        <div className="app-user-avatar">{userName.slice(0, 1).toUpperCase()}</div>
                        <div className="app-user-copy">
                            <strong>{userName}</strong>
                            <small>{userEmail}</small>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="mobile-quick-nav" aria-label="Quick navigation">
                {primaryLinks.map((link) => {
                    const isActive = location.pathname === link.to;
                    return (
                        <Link key={link.to} className={`mobile-quick-link ${isActive ? "active" : ""}`.trim()} to={link.to}>
                            <span className="mobile-quick-icon">{link.icon}</span>
                            <span className="mobile-quick-text">{link.label}</span>
                        </Link>
                    );
                })}
                <Link
                    className={`mobile-quick-link ${location.pathname === quickActionLink ? "active" : ""}`.trim()}
                    to={quickActionLink}
                >
                    <span className="mobile-quick-icon">{quickActionIcon}</span>
                    <span className="mobile-quick-text">{quickActionLabel}</span>
                </Link>
                <Link
                    className="mobile-quick-link mobile-quick-logout"
                    to="/"
                    onClick={() => {
                        clearSession();
                        setIsOpen(false);
                    }}
                >
                    <span className="mobile-quick-icon">{ICONS.logout}</span>
                    <span className="mobile-quick-text">Logout</span>
                </Link>
            </nav>
        </>
    );
}

export default Navbar;
