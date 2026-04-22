import React from 'react';
import { Link } from 'react-router-dom';
import { resolveAssetUrl } from '../api';

function buildStarString(ratingValue) {
    const rating = Math.max(0, Math.min(5, Math.round(Number(ratingValue) || 0)));
    return `${'\u2605'.repeat(rating)}${'\u2606'.repeat(5 - rating)}`;
}

function HomeFeaturedWorkers({ featuredWorkers, workerMessage }) {
    return (
        <section className="landing-section landing-section-featured">
            <div className="landing-section-head">
                <div>
                    <span className="landing-section-kicker">Featured workers</span>
                    <h2>Trusted professionals customers can book right now</h2>
                </div>
                <Link to="/workers" className="ghost-button">View all workers</Link>
            </div>

            {workerMessage && <div className="message-banner success">{workerMessage}</div>}

            {featuredWorkers.length === 0 ? (
                <div className="empty-state">No real worker profiles are ready to feature yet.</div>
            ) : (
                <div className="featured-workers-grid">
                    {featuredWorkers.map((worker) => (
                        <article key={worker.id} className="featured-worker-card">
                            {worker.avatar_url ? (
                                <img
                                    src={resolveAssetUrl(worker.avatar_url)}
                                    alt={worker.name}
                                    className="featured-worker-avatar-image"
                                />
                            ) : (
                                <div className="featured-worker-avatar">
                                    {worker.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="featured-worker-content">
                                <h3>{worker.name}</h3>
                                <p className="featured-worker-category">{worker.category}</p>
                                <div className="featured-worker-rating">
                                    <span className="featured-worker-stars">{buildStarString(worker.rating)}</span>
                                    <span>{worker.rating.toFixed(1)} / 5</span>
                                </div>
                                <p className="featured-worker-area">{worker.service_area}</p>
                                <Link to={`/workers/${worker.id}`} className="secondary-button">
                                    Book Now
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export default HomeFeaturedWorkers;
