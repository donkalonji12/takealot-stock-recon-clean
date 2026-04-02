import React from 'react';
import { X } from 'lucide-react';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
};

export default function ClaimModal({ isOpen, onClose, stats, onContinue, onReview }) {
    if (!isOpen || !stats) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1d1d1f]/30 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-[400px] mx-4 overflow-hidden animate-in zoom-in-95 duration-400"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-end pt-5 pr-5">
                    <button
                        onClick={onClose}
                        className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full transition-colors duration-200"
                        aria-label="Close modal"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="px-8 pb-10 text-center -mt-2">
                    <div className="w-16 h-16 bg-[#4f86f7]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[#4f86f7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-semibold text-[#1d1d1f] mb-3 tracking-tight">Claim summary</h2>
                    <p className="text-2xl sm:text-[28px] leading-tight font-bold text-[#1d1d1f] tracking-tight mb-2">
                        You can claim back <span className="text-[#4f86f7] break-words">{formatCurrency(stats.totalClaimValue)}</span>
                    </p>
                    <p className="text-[15px] font-medium text-[#6e6e73] mb-10">
                        Across {stats.rowsWithOutflow} claimable item{stats.rowsWithOutflow !== 1 ? 's' : ''}
                    </p>

                    <div className="space-y-3.5">
                        <button
                            onClick={onContinue}
                            className="w-full bg-[#4f86f7] hover:bg-[#3b6bd6] text-white font-medium py-3.5 px-6 rounded-full shadow-[0_4px_16px_rgba(79,134,247,0.3)] transition-all duration-300 active:scale-95 text-[15px]"
                        >
                            Continue to Invoice
                        </button>
                        <button
                            onClick={onReview}
                            className="w-full bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] font-medium py-3.5 px-6 rounded-full transition-all duration-300 active:scale-95 text-[15px]"
                        >
                            Review Claims
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
