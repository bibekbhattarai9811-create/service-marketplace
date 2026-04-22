import React from 'react';
import { Link } from 'react-router-dom';

function HomeFooter() {
    return (
        <footer className="site-footer">
            <div className="site-footer-brand">
                <span className="site-footer-logo">SM</span>
                <div>
                    <strong>Service Marketplace</strong>
                    <p>Hire skilled local workers with a cleaner, faster booking flow.</p>
                </div>
            </div>
            <div className="site-footer-links">
                <Link to="/home">About</Link>
                <Link to="/notifications">Contact</Link>
                <Link to="/profile">Terms</Link>
            </div>
            <div className="site-footer-social">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">FB</a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">IG</a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">LI</a>
            </div>
        </footer>
    );
}

export default HomeFooter;
