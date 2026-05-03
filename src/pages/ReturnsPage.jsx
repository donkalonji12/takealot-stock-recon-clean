import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    RotateCcw,
    PackageX,
    AlertOctagon,
    TrendingDown,
    AlertTriangle,
    ShieldAlert,
    BarChart3,
    Activity,
    ChevronRight,
    Loader2,
    Calendar
} from 'lucide-react';

const BACKEND_BASE_URL = 'http://localhost:3000';

const MetricCard = ({ title, value, trend, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] px-5 py-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-[#d2d2d7] transition-all">
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-[12px] font-medium uppercase tracking-widest text-[#86868b] mb-1.5">{title}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none tracking-tight">{value}</p>
                    {trend && (
                        <span className={`text-[12px] font-medium ${trend.startsWith('+') ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                            {trend}
                        </span>
                    )}
                </div>
            </div>
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorClass}`}>
                <Icon size={20} className="text-white" />
            </div>
        </div>
    </div>
);

const RiskBadge = ({ level }) => {
    const config = {
        Critical: { bg: 'bg-[#fef2f2]', border: 'border-[#fecaca]', text: 'text-[#dc2626]' },
        High: { bg: 'bg-[#fffbeb]', border: 'border-[#fde68a]', text: 'text-[#d97706]' },
        Medium: { bg: 'bg-[#f8fafc]', border: 'border-[#e2e8f0]', text: 'text-[#64748b]' },
        Low: { bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', text: 'text-[#16a34a]' },
    };

    const style = config[level] || config.Medium;

    return (
        <span className={`px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide rounded-full border ${style.bg} ${style.border} ${style.text}`}>
            {level}
        </span>
    );
};

function normalizeReason(reason) {
    if (!reason) return 'unknown';
    return String(reason).replace(/_/g, ' ');
}

function parseDateSafe(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export default function ReturnsPage() {
    const [rawReturns, setRawReturns] = useState([]);
    const [meta, setMeta] = useState({ total: 0, lastSyncedAt: null });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('180');

    const fetchReturns = useCallback(async () => {
        try {
            setError(null);

            const res = await fetch(`${BACKEND_BASE_URL}/api/returns`);
            const json = await res.json();

            if (!res.ok || !json?.success) {
                throw new Error(json?.error || json?.message || 'Failed to load returns');
            }

            const payload = json.data || {};
            setRawReturns(Array.isArray(payload.items) ? payload.items : []);
            setMeta(payload.meta || { total: 0, lastSyncedAt: null });
        } catch (err) {
            console.error('Returns fetch failed:', err);
            setError(err.message || 'Failed to load returns');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const handleRefresh = async () => {
        try {
            setIsRefreshing(true);
            setError(null);

            const syncRes = await fetch(`${BACKEND_BASE_URL}/api/returns/sync`, {
                method: 'POST'
            });

            const syncJson = await syncRes.json().catch(() => ({}));

            if (!syncRes.ok || !syncJson?.success) {
                throw new Error(syncJson?.error || syncJson?.message || 'Returns sync failed');
            }

            await fetchReturns();
        } catch (err) {
            console.error('Returns refresh failed:', err);
            setError(err.message || 'Returns refresh failed');
            setIsRefreshing(false);
        }
    };

    const filteredReturns = useMemo(() => {
        if (!rawReturns.length) return [];

        const days = parseInt(timeRange, 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return rawReturns.filter((item) => {
            const dt = parseDateSafe(item.returnDate || item.return_date || item.createdAt || item.created_at);
            if (!dt) return true;
            return dt >= cutoff;
        });
    }, [rawReturns, timeRange]);

    const dashboardData = useMemo(() => {
        if (!filteredReturns.length) return null;

        let defectiveCount = 0;
        let highRiskCount = 0;

        const skuMap = {};
        const reasonCounts = {};
        const monthlyCounts = {};

        filteredReturns.forEach((item) => {
            const rawReason =
                item.returnReason ||
                item.return_reason ||
                item.seller_return_reason?.description ||
                item.customer_reason ||
                'unknown';

            const reasonKey = String(rawReason);
            const displayReason = normalizeReason(reasonKey);

            const status = String(item.status || 'open').toLowerCase();

            if (
                reasonKey.toLowerCase().includes('defective') ||
                reasonKey.toLowerCase().includes('damaged')
            ) {
                defectiveCount++;
            }

            reasonCounts[displayReason] = (reasonCounts[displayReason] || 0) + 1;

            const itemDate = parseDateSafe(item.returnDate || item.return_date || item.createdAt || item.created_at);
            if (itemDate) {
                const monthInfo = itemDate.toLocaleString('en-US', { month: 'short' });
                monthlyCounts[monthInfo] = (monthlyCounts[monthInfo] || 0) + 1;
            }

            const rowKey = (
                item.sku ||
                item.tsin ||
                item.offerId ||
                item.offer_id ||
                item.returnReferenceNumber ||
                item.id ||
                'UNKNOWN'
            ).toString();

            if (!skuMap[rowKey]) {
                skuMap[rowKey] = {
                    id: rowKey,
                    sku: (
                        item.sku ||
                        item.tsin ||
                        item.offerId ||
                        item.offer_id ||
                        'N/A'
                    ).toString(),
                    product: (
                        item.productTitle ||
                        item.product_title ||
                        item.title ||
                        item.offer_title ||
                        item.name ||
                        'Unknown Product'
                    ).toString(),
                    returns: 0,
                    reasonsList: {},
                    statuses: []
                };
            }

            skuMap[rowKey].returns++;
            skuMap[rowKey].reasonsList[displayReason] = (skuMap[rowKey].reasonsList[displayReason] || 0) + 1;
            skuMap[rowKey].statuses.push(status);
        });

        const skuArray = Object.values(skuMap).map((skuData) => {
            let mainReason = 'unknown';
            let topReasonCount = 0;

            for (const [r, count] of Object.entries(skuData.reasonsList)) {
                if (count > topReasonCount) {
                    topReasonCount = count;
                    mainReason = r;
                }
            }

            let riskLevel = 'Low';
            if (skuData.returns >= 4) riskLevel = 'Critical';
            else if (skuData.returns >= 2) riskLevel = 'High';
            else if (skuData.returns >= 1) riskLevel = 'Medium';

            if (riskLevel === 'Critical' || riskLevel === 'High') {
                highRiskCount++;
            }

            let action = 'Monitor';
            const lowerReason = mainReason.toLowerCase();

            if (lowerReason.includes('defective') || lowerReason.includes('damaged')) {
                action = 'Improve packaging';
            } else if (lowerReason.includes('not what i ordered') || lowerReason.includes('not as described')) {
                action = 'Fix listing accuracy';
            } else if (lowerReason.includes('wrong size')) {
                action = 'Improve sizing info';
            } else if (lowerReason.includes('missing parts')) {
                action = 'Quality control';
            }

            return {
                ...skuData,
                mainReason,
                riskLevel,
                action,
                rate: 'N/A'
            };
        });

        const flaggedProducts = skuArray
            .filter((s) => s.riskLevel === 'Critical' || s.riskLevel === 'High')
            .sort((a, b) => b.returns - a.returns)
            .map((s) => ({
                id: s.id,
                name: s.product,
                returns: s.returns,
                risk: s.riskLevel,
                issue: s.mainReason
            }))
            .slice(0, 5);

        const totalReturns = filteredReturns.length;

        const mappedReasons = Object.keys(reasonCounts)
            .map((label) => ({
                label,
                count: reasonCounts[label],
                percentage: Math.round((reasonCounts[label] / totalReturns) * 100)
            }))
            .sort((a, b) => b.count - a.count);

        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mappedTrends = Object.keys(monthlyCounts)
            .map((month) => ({
                month,
                returns: monthlyCounts[month]
            }))
            .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

        return {
            metrics: {
                totalReturns,
                openReturns:
                    filteredReturns.filter((r) => {
                        const status = String(r?.status || 'open').toLowerCase();
                        return status === 'open' || status === 'pending' || status === 'received';
                    }).length || totalReturns,
                defectiveDamaged: defectiveCount,
                highRiskSkus: highRiskCount
            },
            table: skuArray.sort((a, b) => b.returns - a.returns),
            reasons: mappedReasons,
            trends: mappedTrends,
            flagged: flaggedProducts
        };
    }, [filteredReturns]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
                <Loader2 size={38} className="text-[#4f86f7] animate-spin" />
                <p className="text-[13.5px] font-medium text-[#6e6e73]">
                    Loading returns from Vendrix backend...
                </p>
            </div>
        );
    }

    if (error && !rawReturns.length) {
        return (
            <div className="max-w-[1200px] mx-auto px-4 py-8">
                <div className="p-6 bg-[#fef2f2] border border-[#fecaca] shadow-sm rounded-3xl flex flex-col items-start gap-2">
                    <h3 className="text-[15px] font-semibold text-[#b91c1c] flex items-center gap-2">
                        <AlertTriangle size={18} /> Data Synchronization Failed
                    </h3>
                    <p className="text-[13px] text-[#dc2626] font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto px-4 py-8 sm:px-6 lg:px-8 selection:bg-[#ef4444]/20 selection:text-[#ef4444]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#fef2f2] to-[#fee2e2] shrink-0 shadow-sm border border-[#fecaca]/50">
                        <RotateCcw size={22} className="text-[#ef4444]" />
                    </div>
                    <div>
                        <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">Returns Intelligence</h2>
                        <p className="text-[14px] text-[#6e6e73] mt-0.5">
                            Diagnose product quality and operational return risks
                        </p>
                        {meta?.lastSyncedAt && (
                            <p className="text-[12px] text-[#86868b] mt-1">
                                Last synced: {new Date(meta.lastSyncedAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                        <Calendar size={14} className="absolute left-3 text-[#86868b]" />
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="appearance-none bg-white border border-[#e5e5ea] rounded-xl pl-9 pr-8 text-[13px] font-medium text-[#1d1d1f] shadow-sm py-2 hover:bg-[#f9fafb] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f86f7]/20 transition-all"
                        >
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 90 Days</option>
                            <option value="180">Last 180 Days</option>
                            <option value="365">Last 1 Year</option>
                        </select>
                        <ChevronRight size={14} className="absolute right-3 text-[#86868b] rotate-90 pointer-events-none" />
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e5e5ea] text-[13px] font-semibold text-[#1d1d1f] shadow-sm hover:bg-[#f9fafb] transition-colors disabled:opacity-60"
                    >
                        {isRefreshing ? <Loader2 size={14} className="animate-spin" /> : null}
                        Refresh Data
                        <span className="w-2 h-2 rounded-full bg-[#16a34a] ml-1 shadow-[0_0_8px_rgba(22,163,74,0.6)] animate-pulse" />
                    </button>
                </div>
            </div>

            {error && rawReturns.length > 0 && (
                <div className="mb-6 p-4 bg-[#fffbeb] border border-[#fde68a] rounded-2xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-[#d97706] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-semibold text-[#92400e]">Refresh failed</p>
                        <p className="text-[12.5px] text-[#b45309]">
                            Showing the last successfully loaded data.
                        </p>
                        <p className="text-[12px] text-[#b45309] mt-1">{error}</p>
                    </div>
                </div>
            )}

            {!dashboardData ? (
                <div className="p-8 font-medium bg-[#fcfcfd] border border-[#e5e5ea] rounded-[24px] flex flex-col items-center justify-center min-h-[300px] text-center shadow-sm">
                    <div className="p-4 bg-[#f0fdf4] rounded-full text-[#16a34a] mb-4 border border-[#bbf7d0]">
                        <RotateCcw size={28} className="opacity-80" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-1">No returns found</h3>
                    <p className="text-[13.5px] text-[#6e6e73] max-w-sm">
                        No return records exist in your backend for this date window.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <MetricCard title="Total Returns" value={dashboardData.metrics.totalReturns} icon={TrendingDown} colorClass="from-[#ef4444] to-[#dc2626]" />
                        <MetricCard title="Open Returns" value={dashboardData.metrics.openReturns} icon={RotateCcw} colorClass="from-[#3b82f6] to-[#2563eb]" />
                        <MetricCard title="Defective/Damaged" value={dashboardData.metrics.defectiveDamaged} icon={PackageX} colorClass="from-[#f59e0b] to-[#d97706]" />
                        <MetricCard title="High-Risk SKUs" value={dashboardData.metrics.highRiskSkus} icon={AlertOctagon} colorClass="from-[#8b5cf6] to-[#7c3aed]" />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 flex flex-col gap-6">
                            <div className="bg-white rounded-[24px] border border-[#e5e5ea] shadow-sm overflow-hidden flex-1">
                                <div className="px-6 py-5 border-b border-[#f5f5f7] flex items-center justify-between bg-[#fcfcfd]">
                                    <h3 className="text-[14px] font-semibold text-[#1d1d1f] uppercase tracking-widest flex items-center gap-2">
                                        <ShieldAlert size={16} className="text-[#86868b]" />
                                        SKU Risk Dashboard
                                    </h3>
                                    <button className="text-[12px] font-semibold text-[#4f86f7] hover:text-[#3b6bd6] transition-colors">
                                        View Full Report
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white border-b border-[#f5f5f7]">
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider whitespace-nowrap">Product / SKU</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider whitespace-nowrap text-center">Returns</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider whitespace-nowrap text-center">Rate</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider whitespace-nowrap">Main Reason</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider whitespace-nowrap text-center">Risk Level</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider whitespace-nowrap">Recommended Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.table.map((row) => (
                                                <tr key={row.id} className="border-b border-[#f5f5f7] last:border-0 hover:bg-[#f9fafb] transition-colors">
                                                    <td className="py-4 px-6 min-w-[240px]">
                                                        <p className="text-[13.5px] font-semibold text-[#1d1d1f] truncate w-64">{row.product}</p>
                                                        <p className="text-[12px] text-[#6e6e73] font-medium font-mono mt-0.5">{row.sku}</p>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className="text-[14px] font-semibold text-[#1d1d1f]">{row.returns}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className="text-[13px] font-medium text-[#9ca3af]">{row.rate}</span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="text-[13px] text-[#374151] font-medium">{row.mainReason}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-center whitespace-nowrap">
                                                        <RiskBadge level={row.riskLevel} />
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="text-[13px] font-semibold text-[#4f86f7] flex items-center gap-1.5 cursor-pointer hover:underline">
                                                            {row.action}
                                                            <ChevronRight size={14} className="opacity-70" />
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="bg-white rounded-[24px] border border-[#e5e5ea] shadow-sm p-6">
                                <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <BarChart3 size={16} className="text-[#86868b]" />
                                    Return Reasons Breakdown
                                </h3>
                                <div className="space-y-4">
                                    {dashboardData.reasons.map((reason, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-[13px] font-medium mb-1.5">
                                                <span className="text-[#1d1d1f]">{reason.label}</span>
                                                <span className="text-[#6e6e73] font-semibold">
                                                    {reason.percentage}% <span className="text-[11px] font-normal text-[#9ca3af] ml-1">({reason.count})</span>
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-[#f5f5f7] rounded-full overflow-hidden">
                                                <div className="h-full bg-[#ef4444] rounded-full" style={{ width: `${reason.percentage}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-[24px] border border-[#e5e5ea] shadow-sm p-6">
                                <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <Activity size={16} className="text-[#86868b]" />
                                    Return Trend
                                </h3>
                                <div className="h-[140px] flex items-end justify-between gap-1 pb-4 border-b border-[#f5f5f7]">
                                    {dashboardData.trends.map((trend, i) => {
                                        const maxReturn = Math.max(...dashboardData.trends.map((t) => t.returns)) || 1;
                                        const heightPc = (trend.returns / maxReturn) * 100;

                                        return (
                                            <div key={i} className="flex flex-col items-center w-full group">
                                                <div
                                                    className="w-[80%] max-w-[24px] bg-[#fecaca] group-hover:bg-[#ef4444] transition-colors rounded-t-sm relative flex items-center justify-center"
                                                    style={{ height: `${heightPc}%` }}
                                                >
                                                    <span className="absolute -top-6 text-[10px] font-semibold text-[#1d1d1f] opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {trend.returns}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between pt-3 px-1">
                                    {dashboardData.trends.map((trend, i) => (
                                        <span key={i} className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider block text-center w-full">
                                            {trend.month}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-[24px] border border-[#e5e5ea] shadow-sm p-6">
                                <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest mb-5 flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-[#86868b]" />
                                    Top Flagged Issues
                                </h3>

                                <div className="space-y-4">
                                    {dashboardData.flagged.length === 0 ? (
                                        <p className="text-[13px] text-[#6e6e73]">No critical issues detected under current thresholds.</p>
                                    ) : (
                                        dashboardData.flagged.map((product, i) => (
                                            <div key={i} className="flex gap-3 pb-4 border-b border-[#f5f5f7] last:border-0 last:pb-0">
                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${product.risk === 'Critical' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'}`} />
                                                <div>
                                                    <p className="text-[13.5px] font-semibold text-[#1d1d1f] leading-snug">{product.name}</p>
                                                    <p className="text-[12px] text-[#6e6e73] mt-1 line-clamp-1">
                                                        {product.returns} returns due to "<span className="font-semibold text-[#1d1d1f]">{product.issue}</span>"
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}