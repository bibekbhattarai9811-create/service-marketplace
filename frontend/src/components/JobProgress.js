import React from 'react';

const PROGRESS_STEPS = ['Posted', 'Accepted', 'Completed', 'Paid'];

function normalizeJobProgress(job) {
    const status = String(job?.status || 'OPEN').toUpperCase();

    if (job?.paid) {
        return 'Paid';
    }
    if (status === 'COMPLETED') {
        return 'Completed';
    }
    if (status === 'ACCEPTED' || status === 'IN_PROGRESS') {
        return 'Accepted';
    }
    return 'Posted';
}

export function JobProgress({ job }) {
    const currentStep = normalizeJobProgress(job);
    const currentIndex = PROGRESS_STEPS.indexOf(currentStep);

    return (
        <div className="job-progress" aria-label={`Job progress: ${currentStep}`}>
            {PROGRESS_STEPS.map((step, index) => {
                const stateClass =
                    index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';

                return (
                    <div key={step} className={`job-progress-step ${stateClass}`}>
                        <span className="job-progress-dot">{index + 1}</span>
                        <span className="job-progress-label">{step}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default JobProgress;
