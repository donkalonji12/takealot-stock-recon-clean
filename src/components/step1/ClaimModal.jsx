import React from 'react';
import { X, AlertCircle, Info, FileX, Gift } from 'lucide-react';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
};

export default function ClaimModal({ isOpen, onClose, stats, status, error, onContinue, onReview }) {
    if (!isOpen) return null;

    // Determine state if status isn't explicitly passed (backward compatibility or secondary logic)
    const effectiveStatus = status || (stats?.totalClaimValue > 0 ? 'Claimable' : (stats ? 'No Claim' : 'Invalid Format'));

    const getContent = () => {
        switch (effectiveStatus) {
            case 'Claimable':
                return {
                    icon: (
                        <svg className="w-8 h-8 text-[#4f86f7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    iconBg: "bg-[#4f86f7]/10",
                    title: "Claim summary",
                    message: (
                        <>
                            <p className="text-2xl sm:text-[28px] leading-tight font-semibold text-[#1d1d1f] tracking-tight mb-2">
                                You can claim back <span className="text-[#4f86f7] break-words">{formatCurrency(stats?.totalClaimValue || 0)}</span>
                            </p>
                            <p className="text-[15px] font-medium text-[#6e6e73]">
                                Across {stats?.rowsWithOutflow || 0} claimable items
                            </p>
                        </>
                    ),
                    primaryAction: { label: "Continue to Invoice", onClick: onContinue },
                    secondaryAction: { label: "Review Claims", onClick: onReview }
                };
            case 'No Claim':
                return {
                    icon: <CheckCircleIcon />,
                    iconBg: "bg-[#34c759]/10",
                    title: "No claim detected",
                    message: (
                        <p className="text-[16px] text-[#6e6e73] px-2 leading-relaxed">
                            No claimable discrepancies were found in this report. All valid data rows resulted in zero outflow value.
                        </p>
                    ),
                    primaryAction: { label: "Close", onClick: onClose }
                };
            case 'No Data':
                return {
                    icon: <Info className="w-8 h-8 text-[#6e6e73]" />,
                    iconBg: "bg-[#f5f5f7]",
                    title: "No data found",
                    message: (
                        <p className="text-[16px] text-[#6e6e73] px-2 leading-relaxed">
                            This report contains no reconciliation rows. Please ensure you are uploading a valid Takealot Stock Recon file.
                        </p>
                    ),
                    primaryAction: { label: "Close", onClick: onClose }
                };
            case 'Invalid Format':
                return {
                    icon: <FileX className="w-8 h-8 text-[#ff3b30]" />,
                    iconBg: "bg-[#ff3b30]/10",
                    title: "Invalid file",
                    message: (
                        <p className="text-[16px] text-[#6e6e73] px-2 leading-relaxed">
                            {error || "No valid data found in the CSV file. Please verify the file structure and try again."}
                        </p>
                    ),
                    primaryAction: { label: "Try Again", onClick: onClose }
                };
            default:
                return null;
        }
    };

    const content = getContent();
    if (!content) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1d1d1f]/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-[420px] mx-4 overflow-hidden animate-in zoom-in-95 duration-400"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-end pt-6 pr-6">
                    <button
                        onClick={onClose}
                        className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full transition-colors duration-200"
                        aria-label="Close modal"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="px-10 pb-12 text-center -mt-2">
                    <div className={`w-16 h-16 ${content.iconBg} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        {content.icon}
                    </div>

                    <h2 className="text-xl font-semibold text-[#1d1d1f] mb-3 tracking-tight">{content.title}</h2>
                    <div className="mb-10">
                        {content.message}
                    </div>

                    <div className="space-y-3.5">
                        <button
                            onClick={content.primaryAction.onClick}
                            className={`w-full font-semibold py-4 px-6 rounded-full transition-all duration-300 active:scale-95 text-[15px] shadow-sm
                                ${effectiveStatus === 'Claimable' 
                                    ? 'bg-[#4f86f7] hover:bg-[#3b6bd6] text-white shadow-[0_8px_20px_rgba(79,134,247,0.25)]' 
                                    : 'bg-[#1d1d1f] hover:bg-black text-white shadow-[0_8px_20px_rgba(0,0,0,0.1)]'}`}
                        >
                            {content.primaryAction.label}
                        </button>
                        {content.secondaryAction && (
                            <button
                                onClick={content.secondaryAction.onClick}
                                className="w-full bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] font-semibold py-4 px-6 rounded-full transition-all duration-300 active:scale-95 text-[15px]"
                            >
                                {content.secondaryAction.label}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CheckCircleIcon() {
    return (
        <svg className="w-8 h-8 text-[#34c759]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    );
}
