import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    TrendingUp,
    Wallet,
    ShoppingCart,
    BarChart3,
    Loader2,
    AlertTriangle,
    Calendar,
    ChevronRight
} from 'lucide-react';

const BACKEND_BASE_URL = 'http://localhost:3000';

const MetricCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] px-5 py-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-[12px] font-medium uppercase tracking-widest text-[#86868b] mb-1.5">{title}</p>
                <p className="text-[28px] font-semibold text-[#1d1d1f] leading-none tracking-tight">{value}</p>
                {subtitle ? <p className="text-[12px] text-[#6e6e73] mt-2">{subtitle}</p> : null}
            </div>
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorClass}`}>
                <Icon size={20} className="text-white" />
            </div>
        </div>
    </div>
);

function parseDateSafe(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

export default function ProfitPage() {
    const [sales, setSales] = useState([]);
    const [meta, setMeta] = useState({ total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('90');

    const fetchSales = useCallback(async () => {
        try {
            setError(null);

            const res = await fetch(`${BACKEND_BASE_URL}/api/sales`);
            const json = await res.json();

            if (!res.ok || !json?.success) {
                throw new Error(json?.error || json?.message || 'Failed to load sales');
            }

            setSales(Array.isArray(json.items) ? json.items : []);
            setMeta(json.meta || { total: Array.isArray(json.items) ? json.items.length : 0 });
        } catch (err) {
            console.error('Sales fetch failed:', err);
            setError(err.message || 'Failed to load sales');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const handleRefresh = async () => {
        try {
            setIsRefreshing(true);
            setError(null);

            const syncRes = await fetch(`${BACKEND_BASE_URL}/api/sales/sync`, {
                method: 'POST'
            });

            const syncJson = await syncRes.json().catch(() => ({}));

            if (!syncRes.ok || !syncJson?.success) {
                throw new Error(syncJson?.error || syncJson?.message || 'Sales sync failed');
            }

            await fetchSales();
        } catch (err) {
            console.error('Sales refresh failed:', err);
            setError(err.message || 'Sales refresh failed');
            setIsRefreshing(false);
        }
    };

    const filteredSales = useMemo(() => {
        if (!sales.length) return [];

        const days = parseInt(timeRange, 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return sales.filter((item) => {
            const dt = parseDateSafe(item.orderDate || item.order_date || item.createdAt);
            if (!dt) return true;
            return dt >= cutoff;
        });
    }, [sales, timeRange]);

    const dashboardData = useMemo(() => {
        if (!filteredSales.length) return null;

        const totalRevenue = filteredSales.reduce((sum, item) => sum + Number(item.sellingPrice || 0), 0);
        const totalOrders = filteredSales.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const productMap = {};
        const monthlyRevenue = {};

        filteredSales.forEach((item) => {
            const key = String(item.productTitle || item.tsn || item.orderId || 'Unknown Product');

            if (!productMap[key]) {
                productMap[key] = {
                    name: item.productTitle || 'Unknown Product',
                    tsn: item.tsn || 'N/A',
                    orders: 0,
                    revenue: 0
                };
            }

            productMap[key].orders += 1;
            productMap[key].revenue += Number(item.sellingPrice || 0);

            const dt = parseDateSafe(item.orderDate);
            if (dt) {
                const month = dt.toLocaleString('en-US', { month: 'short' });
                monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(item.sellingPrice || 0);
            }
        });

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8);

        const recentSales = [...filteredSales]
            .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
            .slice(0, 10);

        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trends = Object.keys(monthlyRevenue)
            .map((month) => ({
                month,
                revenue: monthlyRevenue[month]
            }))
            .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

        return {
            metrics: {
                totalRevenue,
                totalOrders,
                averageOrderValue,
                uniqueProducts: Object.keys(productMap).length
            },
            topProducts,
            recentSales,
            trends
        };
    }, [filteredSales]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
                <Loader2 size={38} className="text-[#4f86f7] animate-spin" />
                <p className="text-[13.5px] font-medium text-[#6e6e73]">
                    Loading sales analytics from Vendrix backend...
                </p>
            </div>
        );
    }

    if (error && !sales.length) {
        return (
            <div className="max-w-[1200px] mx-auto px-4 py-8">
                <div className="p-6 bg-[#fef2f2] border border-[#fecaca] shadow-sm rounded-3xl flex flex-col items-start gap-2">
                    <h3 className="text-[15px] font-semibold text-[#b91c1c] flex items-center gap-2">
                        <AlertTriangle size={18} /> Sales Analytics Failed
                    </h3>
                    <p className="text-[13px] text-[#dc2626] font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1200px] mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-[#ecfeff] to-[#cffafe] shrink-0 shadow-sm border border-[#a5f3fc]/50">
                        <TrendingUp size={22} className="text-[#0891b2]" />
                    </div>
                    <div>
                        <h2 className="text-[24px] font-semibold text-[#1d1d1f] tracking-tight leading-tight">Profit & Sales Analytics</h2>
                        <p className="text-[14px] text-[#6e6e73] mt-0.5">Track revenue, orders, and product performance</p>
                        <p className="text-[12px] text-[#86868b] mt-1">
                            Total records in DB: {meta.total || sales.length}
                        </p>
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
                        Refresh Sales
                        <span className="w-2 h-2 rounded-full bg-[#16a34a] ml-1 shadow-[0_0_8px_rgba(22,163,74,0.6)] animate-pulse" />
                    </button>
                </div>
            </div>

            {error && sales.length > 0 && (
                <div className="mb-6 p-4 bg-[#fffbeb] border border-[#fde68a] rounded-2xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-[#d97706] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[13px] font-semibold text-[#92400e]">Refresh failed</p>
                        <p className="text-[12.5px] text-[#b45309]">Showing the last successfully loaded sales data.</p>
                        <p className="text-[12px] text-[#b45309] mt-1">{error}</p>
                    </div>
                </div>
            )}

            {!dashboardData ? (
                <div className="p-8 font-medium bg-[#fcfcfd] border border-[#e5e5ea] rounded-[24px] flex flex-col items-center justify-center min-h-[300px] text-center shadow-sm">
                    <div className="p-4 bg-[#f0fdf4] rounded-full text-[#16a34a] mb-4 border border-[#bbf7d0]">
                        <ShoppingCart size={28} className="opacity-80" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-1">No sales found</h3>
                    <p className="text-[13.5px] text-[#6e6e73] max-w-sm">
                        No sales records exist in your backend for this date window.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <MetricCard
                            title="Total Revenue"
                            value={formatCurrency(dashboardData.metrics.totalRevenue)}
                            subtitle="Gross sales value"
                            icon={Wallet}
                            colorClass="from-[#16a34a] to-[#15803d]"
                        />
                        <MetricCard
                            title="Total Orders"
                            value={dashboardData.metrics.totalOrders}
                            subtitle="Sales records in period"
                            icon={ShoppingCart}
                            colorClass="from-[#3b82f6] to-[#2563eb]"
                        />
                        <MetricCard
                            title="Avg Selling Price"
                            value={formatCurrency(dashboardData.metrics.averageOrderValue)}
                            subtitle="Average per sale"
                            icon={BarChart3}
                            colorClass="from-[#8b5cf6] to-[#7c3aed]"
                        />
                        <MetricCard
                            title="Unique Products"
                            value={dashboardData.metrics.uniqueProducts}
                            subtitle="Products sold"
                            icon={TrendingUp}
                            colorClass="from-[#f59e0b] to-[#d97706]"
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 flex flex-col gap-6">
                            <div className="bg-white rounded-[24px] border border-[#e5e5ea] shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-[#f5f5f7] flex items-center justify-between bg-[#fcfcfd]">
                                    <h3 className="text-[14px] font-semibold text-[#1d1d1f] uppercase tracking-widest">
                                        Top Revenue Products
                                    </h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white border-b border-[#f5f5f7]">
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Product</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">TSN</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider text-center">Orders</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.topProducts.map((row, idx) => (
                                                <tr key={`${row.tsn}-${idx}`} className="border-b border-[#f5f5f7] last:border-0 hover:bg-[#f9fafb] transition-colors">
                                                    <td className="py-4 px-6 min-w-[260px]">
                                                        <p className="text-[13.5px] font-semibold text-[#1d1d1f] truncate w-72">{row.name}</p>
                                                    </td>
                                                    <td className="py-4 px-6 text-[12px] text-[#6e6e73] font-mono">{row.tsn}</td>
                                                    <td className="py-4 px-6 text-center text-[14px] font-semibold text-[#1d1d1f]">{row.orders}</td>
                                                    <td className="py-4 px-6 text-right text-[14px] font-semibold text-[#16a34a]">
                                                        {formatCurrency(row.revenue)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-white rounded-[24px] border border-[#e5e5ea] shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-[#f5f5f7] flex items-center justify-between bg-[#fcfcfd]">
                                    <h3 className="text-[14px] font-semibold text-[#1d1d1f] uppercase tracking-widest">
                                        Recent Sales
                                    </h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white border-b border-[#f5f5f7]">
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Product</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Order ID</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Date</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Status</th>
                                                <th className="py-3.5 px-6 text-[11px] font-medium text-[#86868b] uppercase tracking-wider text-right">Selling Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.recentSales.map((row) => (
                                                <tr key={`${row.orderId}-${row.tsn}`} className="border-b border-[#f5f5f7] last:border-0 hover:bg-[#f9fafb] transition-colors">
                                                    <td className="py-4 px-6 min-w-[240px]">
                                                        <p className="text-[13.5px] font-semibold text-[#1d1d1f] truncate w-72">
                                                            {row.productTitle || 'Unknown Product'}
                                                        </p>
                                                        <p className="text-[12px] text-[#6e6e73] font-mono mt-0.5">{row.tsn}</p>
                                                    </td>
                                                    <td className="py-4 px-6 text-[12px] text-[#374151] font-medium">{row.orderId}</td>
                                                    <td className="py-4 px-6 text-[12px] text-[#6e6e73]">
                                                        {parseDateSafe(row.orderDate)?.toLocaleString() || 'N/A'}
                                                    </td>
                                                    <td className="py-4 px-6 text-[12px] text-[#374151] font-medium">
                                                        {row.orderItemStatus}
                                                    </td>
                                                    <td className="py-4 px-6 text-right text-[13px] font-semibold text-[#1d1d1f]">
                                                        {formatCurrency(row.sellingPrice)}
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
                                    <TrendingUp size={16} className="text-[#86868b]" />
                                    Revenue Trend
                                </h3>

                                <div className="h-[180px] flex items-end justify-between gap-2 pb-4 border-b border-[#f5f5f7]">
                                    {dashboardData.trends.length ? dashboardData.trends.map((trend, i) => {
                                        const maxRevenue = Math.max(...dashboardData.trends.map((t) => t.revenue)) || 1;
                                        const heightPc = (trend.revenue / maxRevenue) * 100;

                                        return (
                                            <div key={i} className="flex flex-col items-center w-full group">
                                                <div
                                                    className="w-[80%] max-w-[28px] bg-[#bfdbfe] group-hover:bg-[#3b82f6] transition-colors rounded-t-sm relative flex items-center justify-center"
                                                    style={{ height: `${heightPc}%` }}
                                                >
                                                    <span className="absolute -top-6 text-[10px] font-semibold text-[#1d1d1f] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                        {formatCurrency(trend.revenue)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="w-full flex items-center justify-center text-[13px] text-[#6e6e73]">
                                            No trend data
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 px-1">
                                    {dashboardData.trends.map((trend, i) => (
                                        <span key={i} className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider block text-center w-full">
                                            {trend.month}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}