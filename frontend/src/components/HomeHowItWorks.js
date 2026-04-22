import React from 'react';

const HOW_IT_WORKS = [
    {
        step: '01',
        title: 'Post a Job',
        description: 'Share the task, budget, and location so workers know exactly what you need.',
    },
    {
        step: '02',
        title: 'Get Matched',
        description: 'Compare local workers, ratings, and availability without leaving the platform.',
    },
    {
        step: '03',
        title: 'Get it Done',
        description: 'Chat, track progress, pay securely, and leave a review when the job is complete.',
    },
];

function HomeHowItWorks() {
    return (
        <section className="landing-section">
            <div className="landing-section-head">
                <div>
                    <span className="landing-section-kicker">How it works</span>
                    <h2>From request to finished job</h2>
                </div>
            </div>
            <div className="how-grid">
                {HOW_IT_WORKS.map((item) => (
                    <article key={item.step} className="how-card">
                        <div className="how-step">{item.step}</div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default HomeHowItWorks;
