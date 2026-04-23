import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiClient, clearSession } from "../api";

const PAGE_META = {
    "/home": { title: "Jobs", subtitle: "Open work across the marketplace." },
    "/profile": { title: "Profile", subtitle: "Account, trust, and availability." },
    "/workers": { title: "Workers", subtitle: "Compare skills, ratings, and location." },
    "/notifications": { title: "Notifications", subtitle: "Updates and reminders." },
    "/customer-dashboard": { title: "Customer Dashboard", subtitle: "Jobs, payments, and ratings." },
    "/post-job": { title: "Post a Job", subtitle: "Create a clear request." },
    "/dashboard": { title: "Worker Dashboard", subtitle: "Jobs, payouts, and customer updates." },
    "/admin": { title: "Admin", subtitle: "Platform activity and moderation." },
    "/welcome": { title: "Get Started", subtitle: "Finish setup." },
    "/chat": { title: "Messages", subtitle: "Job conversation." },
};

const ICONS = {
    home: "home",
    profile: "profile",
    workers: "workers",
    notifications: "notifications",
    customer: "dashboard",
    post: "post",
    admin: "admin",
    dashboard: "dashboard",
    logout: "logout",
};

function NavIcon({ name }) {
    const paths = {
        home: (
            <>
                <path d="M4 11.5 12 4l8 7.5" />
                <path d="M6.5 10.5V20h11v-9.5" />
                <path d="M10 20v-5h4v5" />
            </>
        ),
        notifications: (
            <>
                <path d="M18 9.5a6 6 0 0 0-12 0c0 6-2.5 6.5-2.5 6.5h17S18 15.5 18 9.5Z" />
                <path d="M9.7 20a2.6 2.6 0 0 0 4.6 0" />
            </>
        ),
        dashboard: (
            <>
                <path d="M4 4h6.5v6.5H4z" />
                <path d="M13.5 4H20v6.5h-6.5z" />
                <path d="M4 13.5h6.5V20H4z" />
                <path d="M13.5 13.5H20V20h-6.5z" />
            </>
        ),
        profile: (
            <>
                <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                <path d="M4.5 20c1.15-4 4-6 7.5-6s6.35 2 7.5 6" />
            </>
        ),
        workers: (
            <>
                <path d="M14 5 19 10" />
                <path d="m12 7 5 5" />
                <path d="M3.5 20.5 13 11" />
                <path d="m5 14 5 5" />
            </>
        ),
        post: (
            <>
                <path d="M12 5v14" />
                <path d="M5 12h14" />
            </>
        ),
        admin: (
            <>
                <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
                <path d="M19.4 15a8 8 0 0 0 .1-1.1 8 8 0 0 0-.1-1.1l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-1.9-1.1L14.8 5H9.2l-.4 2.7A7.8 7.8 0 0 0 7 8.8l-2.5-1-2 3.5 2 1.5a8 8 0 0 0-.1 1.1A8 8 0 0 0 4.5 15l-2 1.5 2 3.5 2.5-1a7.8 7.8 0 0 0 1.8 1.1l.4 2.7h5.6l.3-2.7A7.8 7.8 0 0 0 17 19l2.4 1 2-3.5-2-1.5Z" />
            </>
        ),
        logout: (
            <>
                <path d="M10 6H5v12h5" />
                <path d="M13 8l4 4-4 4" />
                <path d="M8 12h9" />
            </>
        ),
    };

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                {paths[name] || paths.home}
            </g>
        </svg>
    );
}

function Navbar() {
    const role = localStorage.getItem("role");
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    const navLinks = useMemo(() => {
        if (role === "worker") {
            return [
                { to: "/home", label: "Home", icon: ICONS.home },
                { to: "/notifications", label: "Notifications", icon: ICONS.notifications },
                { to: "/dashboard", label: "Dashboard", icon: ICONS.dashboard, primary: true },
                { to: "/profile", label: "Profile", icon: ICONS.profile },
            ];
        }

        if (role === "customer") {
            return [
                { to: "/home", label: "Home", icon: ICONS.home },
                { to: "/notifications", label: "Notifications", icon: ICONS.notifications },
                { to: "/customer-dashboard", label: "Dashboard", icon: ICONS.customer, primary: true },
                { to: "/profile", label: "Profile", icon: ICONS.profile },
            ];
        }

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

    const storedName = localStorage.getItem("user_name");
    const userName = storedName || (role ? `${role[0].toUpperCase()}${role.slice(1)}` : "Member");
    const meta = PAGE_META[location.pathname] || {
        title: "Service Marketplace",
        subtitle: "Jobs, payments, and messages in one place.",
    };
    const primaryLinks = role === "worker" || role === "customer" ? navLinks : navLinks.slice(0, 4);
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
                            <small>{role === "worker" ? "Worker" : role === "admin" ? "Admin" : "Customer"}</small>
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
                                    <span className="app-nav-icon"><NavIcon name={link.icon} /></span>
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
                            <span className="app-nav-icon"><NavIcon name={ICONS.logout} /></span>
                            <span className="app-nav-text">Logout</span>
                        </Link>
                    </div>
                </div>
            </aside>

            <header className={`app-header-bar ${isScrolled ? "is-hidden" : ""}`.trim()}>
                <div className="app-header-copy">
                    <strong>{meta.title}</strong>
                    <small>{meta.subtitle}</small>
                </div>

                <div className="app-header-tools">
                    <Link to="/notifications" className="app-header-bell" aria-label="Open notifications">
                        <span className="app-header-bell-label"><NavIcon name={ICONS.notifications} /></span>
                        {unreadCount > 0 && <em>{unreadCount}</em>}
                    </Link>
                    <div className="app-user-pill">
                        <div className="app-user-avatar">{userName.slice(0, 1).toUpperCase()}</div>
                        <div className="app-user-copy">
                            <strong>{userName}</strong>
                            <small>{role === "worker" ? "Worker account" : role === "admin" ? "Admin account" : "Customer account"}</small>
                        </div>
                    </div>
                </div>
            </header>

            <nav className={`mobile-quick-nav ${role === "worker" || role === "customer" ? "worker-mobile-quick-nav" : ""}`.trim()} aria-label="Quick navigation">
                {primaryLinks.map((link) => {
                    const isActive = location.pathname === link.to;
                    return (
                        <Link key={link.to} className={`mobile-quick-link ${isActive ? "active" : ""}`.trim()} to={link.to}>
                            <span className="mobile-quick-icon"><NavIcon name={link.icon} /></span>
                            <span className="mobile-quick-text">{link.label}</span>
                        </Link>
                    );
                })}
                {role !== "worker" && role !== "customer" && (
                    <>
                        <Link
                            className={`mobile-quick-link ${location.pathname === quickActionLink ? "active" : ""}`.trim()}
                            to={quickActionLink}
                        >
                            <span className="mobile-quick-icon"><NavIcon name={quickActionIcon} /></span>
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
                            <span className="mobile-quick-icon"><NavIcon name={ICONS.logout} /></span>
                            <span className="mobile-quick-text">Logout</span>
                        </Link>
                    </>
                )}
            </nav>
        </>
    );
}

export default Navbar;
