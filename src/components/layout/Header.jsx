import React, { memo, useMemo } from 'react';
import { Menu, Bell } from 'lucide-react';

const PAGE_META = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of your seller operations' },
    claims: { title: 'Recon & Claims', subtitle: 'Stock reconciliation and loss claim management' },
    returns: { title: 'Returns', subtitle: 'Track and manage product returns from customers' },
    pricing: { title: 'Pricing', subtitle: 'Monitor and optimise your product pricing' },
    shipments: { title: 'Shipments', subtitle: 'Track inbound and outbound shipments' },
    profit: { title: 'Profit & Analytics', subtitle: 'Analyse margins and profitability by product' },
    settings: { title: 'Settings', subtitle: 'Configure your account and preferences' },
};

function Header({ activePage, onMenuOpen }) {
    const meta = useMemo(() => {
        return PAGE_META[activePage] || { title: 'Seller OS', subtitle: '' };
    }, [activePage]);

    return (
        <header className="bg-white/90 backdrop-blur-xl border-b border-[#e5e5ea] sticky top-0 z-30">
            <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onMenuOpen}
                        className="lg:hidden p-2 rounded-xl hover:bg-[#f5f5f7] text-[#6e6e73] transition-colors shrink-0"
                        aria-label="Open menu"
                    >
                        <Menu size={19} />
                    </button>

                    <div className="min-w-0">
                        <h1 className="text-[15px] font-semibold text-[#1d1d1f] leading-tight tracking-tight truncate">
                            {meta.title}
                        </h1>
                        <p className="text-[12px] text-[#86868b] font-medium hidden sm:block truncate">
                            {meta.subtitle}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        className="p-2 rounded-xl hover:bg-[#f5f5f7] text-[#86868b] transition-colors relative"
                        aria-label="Notifications"
                    >
                        <Bell size={17} />
                    </button>

                    <div className="w-8 h-8 bg-gradient-to-br from-[#4f86f7] to-[#3b6bd6] rounded-full flex items-center justify-center text-white text-[12px] font-semibold shadow-sm cursor-pointer">
                        D
                    </div>
                </div>
            </div>
        </header>
    );
}

export default memo(Header);