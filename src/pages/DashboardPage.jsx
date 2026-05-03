import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import ActionCard from '../components/dashboard/ActionCard';

const BACKEND_BASE_URL = 'http://localhost:3000';

function SummaryCard({ label, value, sub }) {
    return (
        <div className="bg-white rounded-2xl border border-[#e5e5ea] px-5 py-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#86868b] mb-2">
                {label}
            </p>
            <p className="text-[26px] font-semibold text-[#1d1d1f] leading-none tracking-tight">
                {value}
            </p>
            {sub && (
                <p className="text-[11px] mt-1.5 text-[#9ca3af] font-medium">
                    {sub}
                </p>
            )}
        </div>
    );
}

function formatCurrency(value) {
    if (value === undefined || value === null) return '—';
    return `R ${Number(value).toLocaleString()}`;
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedKey, setSelectedKey] = useState('buybox_risk');

    const loadDashboard = useCallback(async () => {
        try {
            setError(null);

            const res = await fetch(`${BACKEND_BASE_URL}/api/dashboard`);
            const json = await res.json();

            if (!res.ok || !json?.success) {
                throw new Error(json?.error || json?.message || 'Failed to load dashboard');
            }

            setData(json.data || null);
        } catch (err) {
            console.error('Dashboard load failed:', err);
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const selectedItems = useMemo(() => {
        if (!data?.details) return [];

        switch (selectedKey) {
            case 'buybox_risk':
                return data.details.buyboxRisk || [];
            case 'failed_repricing':
                return data.details.failedRepricing || [];
            case 'missing_rules':
                return data.details.missingRules || [];
            case 'high_pressure_unprotected':
                return data.details.highPressureUnprotected || [];
            case 'repeated_skips':
                return data.details.repeatedSkips || [];
            default:
                return [];
        }
    }, [data, selectedKey]);

    // 🔄 Loading
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
                <Loader2 size={38} className="text-[#22c55e] animate-spin" />
                <p className="text-[13.5px] font-medium text-[#6e6e73]">
                    Loading dashboard...
                </p>
            </div>
        );
    }

    // ❌ Error
    if (error && !data) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="p-6 bg-[#fef2f2] border border-[#fecaca] rounded-3xl">
                    <h3 className="text-[15px] font-semibold text-[#b91c1c]">
                        Dashboard Load Failed
                    </h3>
                    <p className="text-[13px] text-[#dc2626] mt-2">
                        {error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-[22px] font-semibold text-[#1d1d1f]">
                        Dashboard
                    </h2>
                    <p className="text-[13px] text-[#6e6e73] mt-1">
                        What needs attention right now
                    </p>
                </div>

                <button
                    onClick={() => {
                        setRefreshing(true);
                        loadDashboard();
                    }}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border text-[13px] font-semibold shadow-sm hover:bg-[#f9fafb]"
                >
                    {refreshing ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <RefreshCw size={14} />
                    )}
                    Refresh
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <SummaryCard label="Products" value={data?.summary?.totalOffers || 0} sub="Tracked offers" />
                <SummaryCard label="Sales" value={data?.summary?.totalSales || 0} sub="Orders synced" />
                <SummaryCard label="Returns" value={data?.summary?.totalReturns || 0} sub="Returns tracked" />
                <SummaryCard label="Active Rules" value={data?.summary?.activeRules || 0} sub="Pricing rules" />
                <SummaryCard label="Failed Actions" value={data?.summary?.failedActions || 0} sub="Needs review" />
            </div>

            {/* Action Cards */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={16} className="text-[#c2410c]" />
                    <h3 className="text-[13px] uppercase tracking-widest text-[#86868b]">
                        Action Required
                    </h3>
                </div>

                {data?.actionCards?.length === 0 ? (
                    <div className="text-[13px] text-[#6e6e73] bg-[#f9fafb] border rounded-2xl px-4 py-6">
                        No issues detected — your account is healthy.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {data?.actionCards?.map((item) => (
                            <ActionCard
                                key={item.key}
                                item={item}
                                onSelect={setSelectedKey}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border px-6 py-6">
                <h3 className="text-[15px] font-semibold mb-4">
                    Selected Action Details
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="py-3 text-[11px] text-[#86868b]">Offer</th>
                                <th className="py-3 text-[11px] text-[#86868b]">TSN</th>
                                <th className="py-3 text-[11px] text-[#86868b]">Price</th>
                                <th className="py-3 text-[11px] text-[#86868b]">Benchmark</th>
                                <th className="py-3 text-[11px] text-[#86868b]">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-6 text-center text-[#6e6e73]">
                                        Nothing to show here right now.
                                    </td>
                                </tr>
                            ) : (
                                selectedItems.map((item, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-3">{item.offerId || '—'}</td>
                                        <td>{item.tsn || '—'}</td>
                                        <td>{formatCurrency(item.price)}</td>
                                        <td>{formatCurrency(item.benchmarkPrice)}</td>
                                        <td>{item.reason || item.count || '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}