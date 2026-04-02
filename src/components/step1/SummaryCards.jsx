import React from 'react';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
};

export default function SummaryCards({ stats }) {
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white rounded-3xl shadow-sm border border-[#e5e5ea] p-8 flex flex-col justify-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <h3 className="text-sm font-medium text-[#86868b] mb-2 tracking-wide uppercase">Total Rows</h3>
                <p className="text-4xl font-semibold tracking-tight text-[#1d1d1f]">{stats.totalRows}</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-[#e5e5ea] p-8 flex flex-col justify-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                <h3 className="text-sm font-medium text-[#86868b] mb-2 tracking-wide uppercase">Rows with Outflow</h3>
                <p className="text-4xl font-semibold tracking-tight text-[#1d1d1f]">{stats.rowsWithOutflow}</p>
            </div>

            {/* Dynamic Total Claim Value Card */}
            {(() => {
                const val = stats.totalClaimValue;

                if (val > 0) {
                    return (
                        <div className="bg-gradient-to-b from-[#f8faff] to-white rounded-3xl shadow-md border border-[#cbe0ff] p-8 flex flex-col justify-center transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#4f86f7] opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <h3 className="text-sm font-semibold text-[#4f86f7] mb-2 uppercase tracking-wider">Total Claim Value</h3>
                            <p className="text-[2.75rem] leading-none font-bold tracking-tight text-[#1d1d1f] mb-1.5">{formatCurrency(val)}</p>
                            <p className="text-[13px] font-medium text-[#4f86f7]/90">Amount available to claim</p>
                        </div>
                    );
                } else if (val === 0) {
                    return (
                        <div className="bg-white rounded-3xl shadow-sm border border-[#e5e5ea] p-8 flex flex-col justify-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                            <h3 className="text-sm font-medium text-[#86868b] mb-2 tracking-wide uppercase">Total Claim Value</h3>
                            <p className="text-4xl font-semibold tracking-tight text-[#1d1d1f] mb-1.5">{formatCurrency(val)}</p>
                            <p className="text-[13px] font-medium text-[#86868b]">No claimable value detected</p>
                        </div>
                    );
                } else {
                    // Negative edge case
                    return (
                        <div className="bg-gradient-to-b from-[#fff5f5] to-white rounded-3xl shadow-sm border border-[#ffcccc] p-8 flex flex-col justify-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#ff3b30] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <h3 className="text-sm font-semibold text-[#ff3b30] mb-2 uppercase tracking-wider">Total Claim Value</h3>
                            <p className="text-[2.75rem] leading-none font-bold tracking-tight text-[#1d1d1f] mb-1.5">{formatCurrency(val)}</p>
                            <p className="text-[13px] font-medium text-[#ff3b30]/90">Negative claim balance warning</p>
                        </div>
                    );
                }
            })()}
        </div>
    );
}
