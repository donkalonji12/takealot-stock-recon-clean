import React, { useState } from 'react';
import { Trash2, ArrowRight } from 'lucide-react';

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
};

export default function BulkResultsTable({ records, onStartClaim, onDeleteRecord }) {
    const [filter, setFilter] = useState('All');
    const [sortBy, setSortBy] = useState('newest');

    const filteredRecords = records.filter(r => {
        if (filter === 'All') return true;
        return r.status === filter;
    });

    const sortedRecords = [...filteredRecords].sort((a, b) => {
        if (sortBy === 'newest') {
            return b.timestamp - a.timestamp;
        } else if (sortBy === 'highest_claim') {
            return (b.stats?.totalClaimValue || 0) - (a.stats?.totalClaimValue || 0);
        } else if (sortBy === 'period') {
            const pA = a.reconPeriod || '';
            const pB = b.reconPeriod || '';
            return pB.localeCompare(pA);
        }
        return 0;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Claimable': return 'bg-[#e8f5e9] text-[#1b5e20] border-[#c8e6c9]';
            case 'No Claim': return 'bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]';
            case 'No Data': return 'bg-[#fff8e1] text-[#f57f17] border-[#ffecb3]';
            case 'Invalid Format': return 'bg-[#ffebee] text-[#c62828] border-[#ffcdd2]';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (records.length === 0) return null;

    return (
        <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#e5e5ea] overflow-hidden mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-8 py-6 border-b border-[#e5e5ea] bg-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Bulk Scan Results</h2>
                    <p className="text-sm text-[#6e6e73] mt-1">Review the processed files below and initiate active claims.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full sm:w-auto bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl px-4 py-2.5 text-[14px] text-[#1d1d1f] font-medium outline-none transition-colors hover:bg-white focus:border-[#4f86f7] shadow-sm appearance-none pr-10 relative"
                        style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231d1d1f%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '10px auto' }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Claimable">Claimable Only</option>
                        <option value="No Claim">No Claim Value</option>
                        <option value="No Data">No Data Rows</option>
                        <option value="Invalid Format">Invalid Format</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="w-full sm:w-auto bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl px-4 py-2.5 text-[14px] text-[#1d1d1f] font-medium outline-none transition-colors hover:bg-white focus:border-[#4f86f7] shadow-sm appearance-none pr-10 relative"
                        style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231d1d1f%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '10px auto' }}
                    >
                        <option value="newest">Sort: Newest Upload</option>
                        <option value="highest_claim">Sort: Highest Claim Value</option>
                        <option value="period">Sort: Recon Period</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-[#fcfcfd] border-b border-[#e5e5ea]">
                            <th className="py-5 px-6 text-sm font-medium text-gray-500">File Name</th>
                            <th className="py-5 px-6 text-sm font-medium text-gray-500">Recon Period</th>
                            <th className="py-5 px-6 text-sm font-medium text-gray-500 whitespace-nowrap">Total Rows</th>
                            <th className="py-5 px-6 text-sm font-medium text-gray-500 whitespace-nowrap">Claimable Items</th>
                            <th className="py-5 px-6 text-sm font-medium text-gray-500 text-right">Total Claim Value</th>
                            <th className="py-5 px-6 text-sm font-medium text-gray-500 text-center">Status</th>
                            <th className="py-5 px-6 text-sm font-medium text-gray-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-[14px]">
                        {sortedRecords.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-16 text-center text-[#86868b] text-[15px] font-medium bg-[#fbfbfd]">
                                    No records found matching the current active filters.
                                </td>
                            </tr>
                        ) : sortedRecords.map((r) => (
                            <tr key={r.id} className="border-b border-[#f5f5f7] hover:bg-[#fbfbfd] transition-colors last:border-b-0">
                                <td className="py-5 px-6 font-semibold text-[#1d1d1f] max-w-[220px] truncate" title={r.filename}>{r.filename}</td>
                                <td className="py-5 px-6 font-medium text-[#4b5563]">{r.reconPeriod || '-'}</td>
                                <td className="py-5 px-6 font-medium text-[#4b5563]">{r.totalRows || 0}</td>
                                <td className="py-5 px-6 font-medium text-[#4b5563]">{r.claimableItems || 0}</td>
                                <td className="py-5 px-6 text-right font-bold text-[#1d1d1f] tabular-nums">
                                    {r.stats?.totalClaimValue > 0 ? formatCurrency(r.stats.totalClaimValue) : '-'}
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <span className={`inline-block px-3.5 py-1.5 text-[11px] font-bold rounded-full border tracking-wide ${getStatusStyle(r.status)}`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td className="py-5 px-6 border-l border-transparent text-right whitespace-nowrap flex justify-end items-center space-x-2">
                                    <button
                                        onClick={() => onDeleteRecord(r.id)}
                                        className="text-[#86868b] hover:bg-[#ffebee] hover:text-[#ff3b30] p-2 rounded-full transition-colors inline-flex align-middle"
                                        title="Delete Record"
                                    >
                                        <Trash2 size={18} />
                                    </button>

                                    <button
                                        onClick={() => onStartClaim(r)}
                                        disabled={r.status !== 'Claimable'}
                                        className={`px-5 py-2.5 font-bold text-[13px] rounded-full transition-all duration-300 inline-flex items-center align-middle shadow-sm
                                            ${r.status === 'Claimable'
                                                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
                                                : 'bg-[#f5f5f7] text-[#a1a1a6] border border-[#e5e5ea] cursor-not-allowed'}`}
                                    >
                                        Start Claim <ArrowRight size={15} className="ml-2" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
