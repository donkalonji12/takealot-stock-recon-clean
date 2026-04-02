import React from 'react';

export default function Header() {
    return (
        <header className="bg-[#f0f6ff]/90 backdrop-blur-xl border-b border-[#e0ecff] sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-3">
                    <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f]">Takealot Stock Recon</h1>
                    <span className="text-[13px] font-medium text-[#6e6e73] mt-1 sm:mt-0 max-sm:hidden">Stock claim preparation tool</span>
                </div>
                <div>
                    <div className="text-[12px] font-medium text-[#86868b]">
                        Built by <span className="font-semibold text-[#6e6e73]">Don Kalonji</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
