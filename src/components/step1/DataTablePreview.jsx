import React from 'react';

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
};

export default function DataTablePreview({ data, headers, matchedColumns }) {
    if (!data || data.length === 0) return null;

    const rows = data.slice(0, 10);

    const priorityCols = [];
    if (matchedColumns?.productTitle) priorityCols.push(matchedColumns.productTitle);
    if (matchedColumns?.tsin) priorityCols.push(matchedColumns.tsin);
    if (matchedColumns?.sku) priorityCols.push(matchedColumns.sku);
    if (matchedColumns?.claimValue) priorityCols.push(matchedColumns.claimValue);

    const orderedHeaders = [...priorityCols];

    headers.forEach(h => {
        if (!orderedHeaders.includes(h)) {
            orderedHeaders.push(h);
        }
    });

    return (
        <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#e5e5ea] overflow-hidden mt-12 mb-20">
            <div className="px-10 py-8 border-b border-[#e5e5ea] bg-white flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Data Preview</h3>
                    <p className="text-sm text-[#6e6e73] mt-1">Showing first {Math.min(10, data.length)} rows parsed</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-[#e5e5ea]">
                            {orderedHeaders.map((h, i) => (
                                <th key={i} className="px-10 py-5 text-left text-[11px] font-bold text-[#86868b] uppercase tracking-wider whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {rows.map((row, rIdx) => (
                            <tr key={rIdx} className="even:bg-[#fbfbfd] odd:bg-white hover:bg-[#f5f5f7] transition-colors duration-200 border-b border-[#f5f5f7] last:border-none group">
                                {orderedHeaders.map((h, cIdx) => {
                                    let displayVal = row[h] || '';
                                    if (h === matchedColumns?.claimValue && displayVal) {
                                        const cleaned = String(displayVal).replace(/[^\d.-]/g, '');
                                        const asNum = Number(cleaned);
                                        if (!isNaN(asNum)) {
                                            displayVal = formatCurrency(asNum);
                                        }
                                    }

                                    return (
                                        <td key={cIdx} className="px-10 py-5 whitespace-nowrap text-sm text-[#1d1d1f]">
                                            <span className={h === matchedColumns?.claimValue ? 'font-semibold text-[#4f86f7]' : (cIdx === 0 ? 'font-medium' : '')}>
                                                {displayVal}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
