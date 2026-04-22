import React from 'react';

const POPULAR_SERVICES = [
    { title: 'Plumbing', icon: 'PL', description: 'Leak repairs, pipe fixes, and bathroom upgrades.' },
    { title: 'Electrical', icon: 'EL', description: 'Lighting, wiring, outlets, and appliance setup.' },
    { title: 'Cleaning', icon: 'CL', description: 'Deep cleaning, move-out cleaning, and weekly care.' },
    { title: 'Carpentry', icon: 'CA', description: 'Furniture repairs, trim work, and custom builds.' },
];

function HomeServiceCategories({ setFilters }) {
    return (
        <section className="landing-section">
            <div className="landing-section-head">
                <div>
                    <span className="landing-section-kicker">Popular services</span>
                    <h2>Book common home and business services in a few clicks</h2>
                </div>
            </div>
            <div className="services-grid">
                {POPULAR_SERVICES.map((service) => (
                    <article
                        key={service.title}
                        className="service-card"
                        onClick={() => setFilters((current) => ({ ...current, category: service.title }))}
                    >
                        <div className="service-icon">{service.icon}</div>
                        <h3>{service.title}</h3>
                        <p>{service.description}</p>
                        <span className="service-link">Explore service</span>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default HomeServiceCategories;
