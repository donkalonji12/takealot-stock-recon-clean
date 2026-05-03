import React from 'react';
import {
    LayoutDashboard, FileSearch, RotateCcw,
    Tag, Truck, TrendingUp, Settings, X, ChevronRight
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'claims', label: 'Recon & Claims', icon: FileSearch },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'pricing', label: 'Pricing', icon: Tag },
    { id: 'shipments', label: 'Shipments', icon: Truck },
    { id: 'profit', label: 'Profit', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate, isOpen, onClose }) {
    return (
        <>
            {/* ✅ FIXED: Always mounted overlay (no more flicker) */}
            <div
                className={`
                    fixed inset-0 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-200
                    ${isOpen ? 'bg-black/30 opacity-100' : 'opacity-0 pointer-events-none'}
                `}
                onClick={onClose}
            />

            {/* Sidebar panel */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50 flex flex-col
                    w-[228px] shrink-0 bg-white border-r border-[#e5e5ea]
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Brand */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5ea]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#4f86f7] to-[#3b6bd6] rounded-xl flex items-center justify-center shadow-sm">
                            <span className="text-white font-black text-[12px] tracking-tight">SO</span>
                        </div>
                        <div>
                            <p className="text-[14px] font-semibold text-[#1d1d1f] leading-none tracking-tight">Seller OS</p>
                            <p className="text-[11px] text-[#86868b] font-medium mt-0.5">Takealot Operations</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[#86868b] transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = activePage === item.id;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    // ✅ Prevent unnecessary navigation
                                    if (item.id !== activePage) {
                                        onNavigate(item.id);
                                    }
                                    onClose();
                                }}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                    text-left transition-all duration-150 min-h-[44px]
                                    ${isActive
                                        ? 'bg-[#eef3fe] text-[#4f86f7]'
                                        : 'text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
                                    }
                                `}
                            >
                                <Icon
                                    size={17}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className="shrink-0"
                                />

                                <span
                                    className={`text-[13.5px] flex-1 leading-none ${isActive ? 'font-semibold' : 'font-medium'
                                        }`}
                                >
                                    {item.label}
                                </span>

                                {isActive && (
                                    <ChevronRight size={13} className="opacity-40 shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Divider */}
                <div className="mx-3 border-t border-[#f0f0f0]" />

                {/* Footer */}
                <div className="px-3 py-3">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#f9fafb] border border-[#f0f0f0]">
                        <div className="w-7 h-7 bg-gradient-to-br from-[#4f86f7] to-[#3b6bd6] rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                            D
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-[#1d1d1f] truncate leading-none">
                                Don Kalonji
                            </p>
                            <p className="text-[11px] text-[#86868b] truncate mt-0.5">
                                Seller Account
                            </p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}