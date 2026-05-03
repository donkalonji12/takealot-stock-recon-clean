import React from 'react';

const steps = [
    { id: 1, name: 'Upload Data' },
    { id: 2, name: 'Edit Invoice' },
    { id: 3, name: 'Preview & Print' },
    { id: 4, name: 'Submit to Takealot' },
];

export default function ProgressBar({ currentStep, stepsAvailable }) {
    return (
        <nav aria-label="Progress" className="mb-10 pt-4">
            <ol role="list" className="flex items-center space-x-2 sm:space-x-4">
                {steps.map((step) => {
                    const isCurrent = step.id === currentStep;
                    const isUpcoming = step.id > currentStep;
                    const isCompleted = step.id < currentStep;

                    let containerClasses = 'text-[#6e6e73] border border-transparent';
                    let circleClasses = 'bg-[#e5e5ea] text-[#86868b]';
                    let textClasses = '';

                    if (isCurrent) {
                        containerClasses = 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-[#e5e5ea] text-[#1d1d1f]';
                        circleClasses = 'bg-[#4f86f7] text-white shadow-sm';
                    } else if (isCompleted) {
                        containerClasses = 'bg-transparent border border-transparent text-[#1d1d1f] opacity-80';
                        circleClasses = 'bg-[#34c759] text-white';
                    }

                    // If step is upcoming but available to click (e.g. user goes back to step 1)
                    // We won't make it clickable here yet, just styled strictly as 'current' or 'completed'

                    return (
                        <li key={step.name} className="flex-1">
                            <div className={`
                  flex items-center px-5 py-3.5 text-sm font-medium rounded-2xl transition-all duration-300
                  ${containerClasses}
                `}>
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center mr-3 text-[13px] font-semibold shrink-0 transition-colors duration-300 ${circleClasses}`}>
                                    {isCompleted ? '✓' : step.id}
                                </span>
                                <span className={`hidden sm:inline ${textClasses}`}>{step.name}</span>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
