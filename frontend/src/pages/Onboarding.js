import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function getSteps(role) {
    if (role === 'worker') {
        return [
            'Finish your profile with skills, service area, and portfolio highlights.',
            'Add your availability so customers know when you can work.',
            'Open the worker dashboard to accept jobs and start earning.',
        ];
    }

    if (role === 'admin') {
        return [
            'Open the admin analytics page to review marketplace activity.',
            'Check user management before promoting or disabling accounts.',
            'Use notifications and analytics together to spot issues early.',
        ];
    }

    return [
        'Complete your profile so workers know where you are based.',
        'Post your first job with a category, preferred date, and helpful photo.',
        'Use the worker directory and notifications to manage the hiring flow.',
    ];
}

function Onboarding() {
    const role = localStorage.getItem('role') || 'customer';
    const navigate = useNavigate();
    const steps = getSteps(role);

    const finishOnboarding = () => {
        localStorage.setItem('onboarding_complete', 'true');
        if (role === 'worker') {
            navigate('/dashboard');
        } else if (role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/customer-dashboard');
        }
    };

    return (
        <div className="app-shell">
            <Navbar />
            <div className="page-wrap">
                <div className="page-hero">
                    <section className="hero-panel">
                        <span className="hero-label">Welcome aboard</span>
                        <h1>Let’s get your account ready to use like a real business tool.</h1>
                        <p>
                            This quick setup helps you land on the right page with a clear next step,
                            instead of dropping you into a dashboard without context.
                        </p>
                    </section>
                </div>

                <section className="section-card">
                    <div className="section-header">
                        <div>
                            <h2>Your first three steps</h2>
                            <p className="section-subtitle">A short checklist based on your role.</p>
                        </div>
                    </div>

                    <div className="card-grid">
                        {steps.map((step, index) => (
                            <article key={step} className="job-card">
                                <div className="job-card-header">
                                    <div>
                                        <h3>Step {index + 1}</h3>
                                        <p>{step}</p>
                                    </div>
                                    <span className="status-badge status-open">Start here</span>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="button-row" style={{ marginTop: '18px' }}>
                        <button className="primary-button" onClick={finishOnboarding}>
                            Continue to my workspace
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Onboarding;
