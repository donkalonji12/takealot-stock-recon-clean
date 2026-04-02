import React from 'react';

const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val);
};

export default function FlaggedClaims({ data, matchedColumns }) {
    if (!data || !matchedColumns) return null;

    const claimable = data.filter(row => row._numericClaim > 0);
    claimable.sort((a, b) => b._numericClaim - a._numericClaim);
    const topRows = claimable.slice(0, 5);

    return (
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#e5e5ea] overflow-hidden mt-12 mb-16">
            <div className="px-10 py-8 border-b border-[#e5e5ea] bg-white">
                <h3 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Flagged Claims</h3>
                <p className="text-sm text-[#6e6e73] mt-1">Highest value claims detected</p>
            </div>

            {topRows.length === 0 ? (
                <div className="p-16 text-center text-[#86868b]">
                    No claimable rows detected (claim value &gt; 0).
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-[#e5e5ea]">
                                <th className="px-10 py-5 text-left text-[11px] font-bold text-[#86868b] uppercase tracking-wider">Product Title</th>
                                <th className="px-10 py-5 text-left text-[11px] font-bold text-[#86868b] uppercase tracking-wider">TSIN</th>
                                <th className="px-10 py-5 text-left text-[11px] font-bold text-[#86868b] uppercase tracking-wider">SKU</th>
                                <th className="px-10 py-5 text-right text-[11px] font-bold text-[#86868b] uppercase tracking-wider">Claim Value</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {topRows.map((row, i) => (
                                <tr key={i} className="even:bg-[#fbfbfd] odd:bg-white hover:bg-[#f5f5f7] transition-colors duration-200 border-b border-[#f5f5f7] last:border-none group">
                                    <td className="px-10 py-5 whitespace-nowrap text-sm text-[#1d1d1f] font-medium">
                                        {matchedColumns.productTitle ? row[matchedColumns.productTitle] : 'N/A'}
                                    </td>
                                    <td className="px-10 py-5 whitespace-nowrap text-sm text-[#6e6e73]">
                                        {matchedColumns.tsin ? row[matchedColumns.tsin] : 'N/A'}
                                    </td>
                                    <td className="px-10 py-5 whitespace-nowrap text-sm text-[#6e6e73]">
                                        {matchedColumns.sku ? row[matchedColumns.sku] : 'N/A'}
                                    </td>
                                    <td className="px-10 py-5 whitespace-nowrap text-sm font-semibold text-[#1d1d1f] text-right group-hover:text-[#4f86f7] transition-colors duration-200">
                                        {formatCurrency(row._numericClaim)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
