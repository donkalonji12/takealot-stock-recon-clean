import React, { useState, useMemo } from 'react';
import { Trash2, ArrowRight, History, Zap, Database, FolderOpen, FileText, ChevronRight, PlusCircle, TrendingDown } from 'lucide-react';
import { formatReconPeriod } from '../../utils/formatters';
import { estimateReportAvailabilityDate, calculateLateFee, RECOMMENDATION_META } from '../../utils/lateFeeCalculator';

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
};

const formatDate = (ts) => {
    return new Date(ts).toLocaleString('en-ZA', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

export default function BulkResultsTable({ batches = [], onStartClaim, onDeleteRecord, onDeleteBatch }) {
    // 1. ALL HOOKS UNCONDITIONALLY AT THE TOP
    const [view, setView] = useState('current'); // 'current' | 'history' | 'all'
    const [filter, setFilter] = useState('All');
    const [selectedBatchId, setSelectedBatchId] = useState(null);

    // Determine current/target batch info for calculations
    const currentBatch = batches && batches.length > 0 ? batches[0] : null;
    
    // Memoized data processing (All logic inside the hook)
    const displayData = useMemo(() => {
        let records = [];
        let activeStats = { total: 0, claimable: 0, noClaim: 0, noData: 0, invalid: 0, totalValue: 0 };

        // Even if batches is empty, we return safe values
        if (!batches || batches.length === 0) {
            return { records: [], stats: activeStats };
        }

        if (view === 'current' && currentBatch) {
            records = currentBatch.records || [];
            activeStats = currentBatch.stats || activeStats;
        } else if (view === 'history') {
            // History Batch Mode
            const targetBatch = selectedBatchId ? batches.find(b => b.id === selectedBatchId) : null;
            if (targetBatch) {
                records = targetBatch.records || [];
                activeStats = targetBatch.stats || activeStats;
            } else {
                // List of batches aggregates
                records = [];
                activeStats = batches.reduce((acc, b) => ({
                    total: acc.total + (b.stats?.total || 0),
                    claimable: acc.claimable + (b.stats?.claimable || 0),
                    noClaim: acc.noClaim + (b.stats?.noClaim || 0),
                    noData: acc.noData + (b.stats?.noData || 0),
                    invalid: acc.invalid + (b.stats?.invalid || 0),
                    totalValue: acc.totalValue + (b.stats?.totalValue || 0)
                }), { total: 0, claimable: 0, noClaim: 0, noData: 0, invalid: 0, totalValue: 0 });
            }
        } else if (view === 'all') {
            // All History view
            records = batches.flatMap(b => b.records || []);
            activeStats = batches.reduce((acc, b) => ({
                total: acc.total + (b.stats?.total || 0),
                claimable: acc.claimable + (b.stats?.claimable || 0),
                noClaim: acc.noClaim + (b.stats?.noClaim || 0),
                noData: acc.noData + (b.stats?.noData || 0),
                invalid: acc.invalid + (b.stats?.invalid || 0),
                totalValue: acc.totalValue + (b.stats?.totalValue || 0)
            }), { total: 0, claimable: 0, noClaim: 0, noData: 0, invalid: 0, totalValue: 0 });
        }

        const filtered = records.filter(r => filter === 'All' ? true : r.status === filter);
        const sorted = [...filtered].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Compute fee aggregates across all displayed claimable records
        let totalEstFees = 0;
        let totalNetClaim = 0;
        sorted.forEach(r => {
            if (r.status === 'Claimable' && r.stats?.totalClaimValue > 0) {
                const avail = estimateReportAvailabilityDate(r.reconPeriod);
                const fd = calculateLateFee(avail, r.stats.totalClaimValue);
                totalEstFees += fd.totalFee;
                totalNetClaim += fd.netClaimValue;
            }
        });

        return { records: sorted, stats: activeStats, totalEstFees, totalNetClaim };
    }, [view, filter, batches, currentBatch, selectedBatchId]);

    // 2. EARLY RETURNS (FOR RENDER ONLY)
    if (!batches || batches.length === 0) return null;

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Claimable': return 'bg-[#f0fdf4] text-[#166534] border-[#dcfce7]';
            case 'No Claim': return 'bg-[#f9fafb] text-[#374151] border-[#f3f4f6]';
            case 'No Data': return 'bg-[#fffbeb] text-[#92400e] border-[#fef3c7]';
            case 'Invalid Format': return 'bg-[#fef2f2] text-[#991b1b] border-[#fee2e2]';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <div className="space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* View Selector (Restored original minimal design) */}
            <div className="flex justify-center mb-6">
                <div className="bg-[#e5e5ea] p-1.5 rounded-xl flex space-x-1 shadow-inner">
                    <button 
                        onClick={() => { setView('current'); setSelectedBatchId(null); }}
                        className={`px-6 py-2.5 rounded-lg font-semibold text-[14px] flex items-center transition-all duration-300 ${view === 'current' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
                    >
                        <Zap size={18} className="mr-2" /> Current Session
                    </button>
                    <button 
                        onClick={() => setView('history')}
                        className={`px-6 py-2.5 rounded-lg font-semibold text-[14px] flex items-center transition-all duration-300 ${view === 'history' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
                    >
                        <History size={18} className="mr-2" /> Saved Batches
                    </button>
                    <button 
                        onClick={() => { setView('all'); setSelectedBatchId(null); }}
                        className={`px-6 py-2.5 rounded-lg font-semibold text-[14px] flex items-center transition-all duration-300 ${view === 'all' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
                    >
                        <Database size={18} className="mr-2" /> All History
                    </button>
                </div>
            </div>

            {/* Aggregate Summary Cards — Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e5e5ea] shadow-sm flex flex-col justify-center">
                    <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-widest mb-1">
                        {view === 'history' && !selectedBatchId ? 'Total Files Tracked' : 'Files in Session'}
                    </p>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-semibold text-[#1d1d1f] tracking-tight">{displayData.stats.total}</span>
                        <span className="text-sm text-[#6e6e73] font-medium">reports processed</span>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-[#e5e5ea] shadow-sm flex flex-col justify-center">
                    <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-widest mb-2">Breakdown</p>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                        <div className="flex items-center justify-between"><span className="text-[13px] text-[#6e6e73]">Claimable</span><span className="text-[13px] font-semibold text-[#34c759]">{displayData.stats.claimable}</span></div>
                        <div className="flex items-center justify-between"><span className="text-[13px] text-[#6e6e73]">No Claim</span><span className="text-[13px] font-semibold text-[#1d1d1f]">{displayData.stats.noClaim}</span></div>
                        <div className="flex items-center justify-between"><span className="text-[13px] text-[#6e6e73]">No Data</span><span className="text-[13px] font-semibold text-[#1d1d1f]">{displayData.stats.noData}</span></div>
                        <div className="flex items-center justify-between"><span className="text-[13px] text-[#6e6e73]">Invalid</span><span className="text-[13px] font-semibold text-[#ff3b30]">{displayData.stats.invalid}</span></div>
                    </div>
                </div>

                <div className={`rounded-3xl p-6 border transition-all duration-500 flex flex-col justify-center ${displayData.stats.totalValue > 0 ? 'bg-blue-50/50 border-blue-100 shadow-sm' : 'bg-white border-[#e5e5ea] shadow-sm'}`}>
                    <p className={`text-[12px] font-medium uppercase tracking-widest mb-1 ${displayData.stats.totalValue > 0 ? 'text-blue-600' : 'text-[#86868b]'}`}>
                        {view === 'history' && !selectedBatchId ? 'Total Gross Claim' : 'Session Gross Claim'}
                    </p>
                    <div className="flex items-baseline space-x-2">
                        <span className={`text-3xl font-semibold tracking-tight ${displayData.stats.totalValue > 0 ? 'text-blue-600' : 'text-[#1d1d1f]'}`}>{formatCurrency(displayData.stats.totalValue)}</span>
                    </div>
                </div>
            </div>

            {/* Aggregate Summary Cards — Row 2: Fee Estimates */}
            {displayData.stats.claimable > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-3xl p-6 border border-[#e5e5ea] shadow-sm flex flex-col justify-center">
                        <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-widest mb-1">Total Gross Claim</p>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">{formatCurrency(displayData.stats.totalValue)}</span>
                        </div>
                        <p className="text-[11px] text-[#86868b] mt-1">Before late fee deductions</p>
                    </div>
                    <div className="bg-[#fffbeb] rounded-3xl p-6 border border-[#fde68a] shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingDown size={14} className="text-[#f59e0b]" />
                            <p className="text-[12px] font-medium text-[#92400e] uppercase tracking-widest">Total Est. Late Fees</p>
                        </div>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-semibold text-[#92400e] tracking-tight">{formatCurrency(displayData.totalEstFees)}</span>
                        </div>
                        <p className="text-[11px] text-[#92400e]/70 mt-1">Admin + VAT (15%) across all files</p>
                    </div>
                    <div className={`rounded-3xl p-6 border shadow-sm flex flex-col justify-center ${
                        displayData.totalNetClaim > 0 ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#fef2f2] border-[#fecaca]'
                    }`}>
                        <p className={`text-[12px] font-medium uppercase tracking-widest mb-1 ${
                            displayData.totalNetClaim > 0 ? 'text-[#166534]' : 'text-[#991b1b]'
                        }`}>Total Net Recoverable</p>
                        <div className="flex items-baseline space-x-2">
                            <span className={`text-2xl font-semibold tracking-tight ${
                                displayData.totalNetClaim > 0 ? 'text-[#166534]' : 'text-[#991b1b]'
                            }`}>{formatCurrency(displayData.totalNetClaim)}</span>
                        </div>
                        <p className={`text-[11px] mt-1 ${
                            displayData.totalNetClaim > 0 ? 'text-[#166534]/60' : 'text-[#991b1b]/60'
                        }`}>After estimated fee deductions</p>
                    </div>
                </div>
            )}

            {/* Main Table Area */}
            <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#e5e5ea] overflow-hidden">
                <div className="px-8 py-6 border-b border-[#e5e5ea] bg-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
                            {view === 'current' ? 'Current Session Results' : 
                             view === 'all' ? 'Full History' : 
                             selectedBatchId ? `Session: ${formatDate(batches.find(b => b.id === selectedBatchId)?.createdAt)}` : 'Saved Batches'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {(view !== 'history' || selectedBatchId) && (
                            <select 
                                value={filter} 
                                onChange={e => setFilter(e.target.value)}
                                className="bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl px-4 py-2.5 text-[14px] font-medium outline-none shadow-sm transition-colors hover:bg-white focus:border-[#4f86f7]"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Claimable">Claimable Only</option>
                                <option value="No Claim">No Claim Value</option>
                                <option value="No Data">No Data Row</option>
                                <option value="Invalid Format">Invalid Format</option>
                            </select>
                        )}
                        {selectedBatchId && (
                            <button onClick={() => setSelectedBatchId(null)} className="text-[13px] font-semibold text-[#4f86f7] hover:underline px-3 transition-all">Back to List</button>
                        )}
                    </div>
                </div>

                {view === 'history' && !selectedBatchId ? (
                    <div className="divide-y divide-[#f5f5f7]">
                        {batches.map((batch) => (
                            <div key={batch.id} className="px-5 sm:px-8 py-5 sm:py-6 hover:bg-[#fbfbfd] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                                <div className="flex items-center space-x-4">
                                    <div className="w-11 h-11 rounded-2xl bg-[#f5f5f7] flex items-center justify-center text-[#4f86f7] shrink-0"><FolderOpen size={22} /></div>
                                    <div>
                                        <div className="flex items-center space-x-3 mb-0.5"><h4 className="text-[15px] font-semibold text-[#1d1d1f]">{formatDate(batch.createdAt)}</h4></div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6e6e73] font-medium">
                                            <span>{batch.stats?.total} files</span>
                                            <span className="text-[#34c759]">{batch.stats?.claimable} claimable</span>
                                            <span className="font-semibold text-[#1d1d1f]">{formatCurrency(batch.stats?.totalValue)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <button onClick={() => onDeleteBatch(batch.id)} className="p-2 text-[#86868b] hover:text-[#ff3b30] rounded-full transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"><Trash2 size={18} /></button>
                                    <button onClick={() => setSelectedBatchId(batch.id)} className="bg-[#f5f5f7] hover:bg-[#e5e5ea] text-[#1d1d1f] px-5 py-2.5 rounded-xl font-semibold text-[12px] transition-all flex items-center shadow-sm min-h-[44px]">Open <span>&rarr;</span></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* ── Mobile card view (< md) ── */}
                        <div className="md:hidden divide-y divide-[#f5f5f7]">
                            {displayData.records.length === 0 ? (
                                <div className="py-16 text-center text-[#86868b] font-medium">No records found matching filters.</div>
                            ) : displayData.records.map((r) => {
                                const isClaimable = r.status === 'Claimable' && (r.stats?.totalClaimValue || 0) > 0;
                                const avail = isClaimable ? estimateReportAvailabilityDate(r.reconPeriod) : null;
                                const fd = isClaimable ? calculateLateFee(avail, r.stats.totalClaimValue) : null;
                                const recMeta = fd ? RECOMMENDATION_META[fd.recommendation] : null;
                                const netColor = !fd ? 'text-[#1d1d1f]' : fd.netClaimValue <= 0 ? 'text-[#dc2626]' : fd.netClaimValue < 500 ? 'text-[#d97706]' : 'text-[#16a34a]';
                                return (
                                    <div key={r.id} className="px-5 py-4 space-y-3">
                                        {/* Row 1: filename + status */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-[14px] text-[#1d1d1f] truncate">{r.filename}</p>
                                                <p className="text-[12px] text-[#6e6e73] mt-0.5">{formatReconPeriod(r.reconPeriod)}</p>
                                            </div>
                                            <span className={`inline-block shrink-0 px-3 py-1 text-[10px] font-semibold rounded-full border tracking-wide uppercase ${getStatusStyle(r.status)}`}>{r.status}</span>
                                        </div>
                                        {/* Row 2: key metrics */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            <div>
                                                <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">Claim Value</p>
                                                <p className="text-[14px] font-semibold text-[#1d1d1f]">{r.stats?.totalClaimValue > 0 ? formatCurrency(r.stats.totalClaimValue) : '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">Net Claim</p>
                                                <p className={`text-[14px] font-semibold ${netColor}`}>{fd ? formatCurrency(fd.netClaimValue) : '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">Months Late</p>
                                                <p className={`text-[14px] font-semibold ${fd && fd.monthsLate > 0 ? 'text-[#d97706]' : 'text-[#6b7280]'}`}>{fd ? (fd.monthsLate > 0 ? fd.monthsLate : '—') : '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">Recommendation</p>
                                                {recMeta ? (
                                                    <span className={`inline-block mt-0.5 px-2.5 py-1 text-[10px] font-semibold rounded-full border ${recMeta.bg} ${recMeta.color}`}>{recMeta.short}</span>
                                                ) : <span className="text-[#d1d5db] text-[13px]">—</span>}
                                            </div>
                                        </div>
                                        {/* Row 3: actions */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <button onClick={() => onDeleteRecord(r.id, r.batchId)} className="p-2.5 text-[#86868b] hover:text-[#ff3b30] transition-all rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center border border-[#f0f0f0]"><Trash2 size={16} /></button>
                                            <button onClick={() => onStartClaim(r)} disabled={r.status !== 'Claimable'} className={`flex-1 py-3 font-semibold text-[13px] rounded-full transition-all min-h-[44px] ${r.status === 'Claimable' ? 'bg-[#4f86f7] text-white hover:bg-blue-600 shadow-sm' : 'bg-[#f5f5f7] text-[#a1a1a6] border border-[#e5e5ea] cursor-not-allowed'}`}>
                                                {r.status === 'Claimable' ? 'Start Claim →' : 'Not Claimable'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Desktop table view (md+) ── */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1180px]">
                                <thead>
                                    <tr className="bg-[#fcfcfd] border-b border-[#e5e5ea]">
                                        <th className="py-5 px-6 text-sm font-medium text-gray-500">File Name</th>
                                        <th className="py-5 px-4 text-sm font-medium text-gray-500">Recon Period</th>
                                        <th className="py-5 px-4 text-sm font-medium text-gray-500 text-right">Claim Value</th>
                                        <th className="py-5 px-4 text-sm font-medium text-gray-500 text-center">Mths Late</th>
                                        <th className="py-5 px-4 text-sm font-medium text-gray-500 text-right">Est. Fee</th>
                                        <th className="py-5 px-4 text-sm font-medium text-gray-500 text-right">Net Claim</th>
                                        <th className="py-5 px-4 text-sm font-medium text-gray-500 text-center">Recommendation</th>
                                        <th className="py-5 px-4 text-sm font-medium text-gray-500 text-center">Status</th>
                                        <th className="py-5 px-6 text-sm font-medium text-gray-500 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.records.length === 0 ? (
                                        <tr><td colSpan="9" className="py-20 text-center text-[#86868b] font-medium">No records found matching filters.</td></tr>
                                    ) : displayData.records.map((r) => {
                                        const isClaimable = r.status === 'Claimable' && (r.stats?.totalClaimValue || 0) > 0;
                                        const avail = isClaimable ? estimateReportAvailabilityDate(r.reconPeriod) : null;
                                        const fd = isClaimable ? calculateLateFee(avail, r.stats.totalClaimValue) : null;
                                        const recMeta = fd ? RECOMMENDATION_META[fd.recommendation] : null;
                                        const netColor = !fd ? '' : fd.netClaimValue <= 0 ? 'text-[#dc2626]' : fd.netClaimValue < 500 ? 'text-[#d97706]' : 'text-[#16a34a]';
                                        return (
                                            <tr key={r.id} className="border-b border-[#f5f5f7] hover:bg-[#fbfbfd] transition-all last:border-b-0 group">
                                                <td className="py-5 px-6 font-semibold text-[#1d1d1f] max-w-[180px] truncate">{r.filename}</td>
                                                <td className="py-5 px-4 font-medium text-[#4b5563] whitespace-nowrap">{formatReconPeriod(r.reconPeriod)}</td>
                                                <td className="py-5 px-4 text-right font-semibold text-[#1d1d1f] whitespace-nowrap">{r.stats?.totalClaimValue > 0 ? formatCurrency(r.stats.totalClaimValue) : '—'}</td>
                                                <td className="py-5 px-4 text-center">
                                                    {fd ? (
                                                        <span className={`text-[13px] font-semibold ${fd.monthsLate > 0 ? 'text-[#d97706]' : 'text-[#16a34a]'}`}>
                                                            {fd.monthsLate > 0 ? fd.monthsLate : '—'}
                                                        </span>
                                                    ) : <span className="text-[#d1d5db]">—</span>}
                                                </td>
                                                <td className="py-5 px-4 text-right whitespace-nowrap">
                                                    {fd ? (
                                                        <span className={`text-[13px] font-semibold ${fd.totalFee > 0 ? 'text-[#d97706]' : 'text-[#6b7280]'}`}>
                                                            {fd.totalFee > 0 ? formatCurrency(fd.totalFee) : 'None'}
                                                        </span>
                                                    ) : <span className="text-[#d1d5db]">—</span>}
                                                </td>
                                                <td className={`py-5 px-4 text-right font-semibold whitespace-nowrap ${netColor}`}>
                                                    {fd ? formatCurrency(fd.netClaimValue) : '—'}
                                                </td>
                                                <td className="py-5 px-4 text-center">
                                                    {recMeta ? (
                                                        <span className={`inline-block px-3 py-1 text-[10px] font-semibold rounded-full border tracking-wide ${recMeta.bg} ${recMeta.color}`}>
                                                            {recMeta.short}
                                                        </span>
                                                    ) : <span className="text-[#d1d5db]">—</span>}
                                                </td>
                                                <td className="py-5 px-4 text-center"><span className={`inline-block px-3 py-1.5 text-[10px] font-semibold rounded-full border tracking-wide uppercase ${getStatusStyle(r.status)}`}>{r.status}</span></td>
                                                <td className="py-5 px-6 text-right whitespace-nowrap">
                                                    <div className="flex justify-end items-center space-x-2">
                                                        <button onClick={() => onDeleteRecord(r.id, r.batchId)} className="p-2 text-[#86868b] hover:text-[#ff3b30] opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                                                        <button onClick={() => onStartClaim(r)} disabled={r.status !== 'Claimable'} className={`px-4 py-2 font-semibold text-[12px] rounded-full transition-all ${r.status === 'Claimable' ? 'bg-[#4f86f7] text-white hover:bg-blue-600 shadow-sm' : 'bg-[#f5f5f7] text-[#a1a1a6] border border-[#e5e5ea] cursor-not-allowed'}`}>Claim &rarr;</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

