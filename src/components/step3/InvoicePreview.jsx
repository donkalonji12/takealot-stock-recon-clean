import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, ArrowLeft, ArrowRight, Check, Palette } from 'lucide-react';

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
};

const THEME_COLORS = [
    '#4A8BF5', // Default Blue
    '#111827', // Dark Gray/Black (Premium)
    '#E95065', // Red
    '#45A29E', // Teal
    '#72D29E', // Light Green
    '#F3A683', // Peach
    '#FDCB6E', // Yellow
    '#FF7675', // Pink
    '#6B7280'  // Medium Gray
];

export default function InvoicePreview({ invoiceData, parsedData, matchedColumns, stats, filename, onBack, onContinue }) {
    const invoiceRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [themeColor, setThemeColor] = useState(THEME_COLORS[0]);

    const claimableItems = parsedData.filter(row => row._numericClaim > 0);
    const numItems = claimableItems.length;

    const periodMatch = matchedColumns?.period && numItems > 0
        ? claimableItems[0][matchedColumns.period]
        : 'Not provided';

    const subtotal = stats.totalClaimValue;
    const isVatRegistered = invoiceData.vatStatus === 'VAT Registered';
    const vatAmount = isVatRegistered ? subtotal * 0.15 : 0;
    const total = subtotal + vatAmount;

    // Seller logic
    const bName = invoiceData.businessName?.trim() || "";
    const displaySellerName = invoiceData.sellerAccountName?.trim() ? invoiceData.sellerAccountName.trim() : bName;

    if (bName.length < 3 || displaySellerName.length < 3) {
        return (
            <div className="p-8 bg-[#fff5f5] text-[#ff3b30] rounded-3xl my-10 text-center border border-[#ffcccc]">
                <p className="text-lg font-bold mb-2">Validation Error</p>
                <p className="text-[14px] font-medium mb-6">Business Name or Seller Account Name is missing or severely corrupted. Please return to Step 2 and correct it.</p>
                <button onClick={onBack} className="px-6 py-2 bg-[#ff3b30] hover:bg-[#ff1a1a] text-white rounded-full font-medium shadow-sm transition-colors">Return to Step 2</button>
            </div>
        );
    }

    const DocumentTitle = isVatRegistered ? 'TAX INVOICE' : 'CLAIM INVOICE';

    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return;
        try {
            setIsGenerating(true);
            const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${invoiceData.invoiceNumber || 'Claim_Invoice'}.pdf`);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">

            {/* Navigation Bar */}
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
                <button onClick={onBack} className="text-[#4B5563] hover:text-[#111827] flex items-center font-medium transition-colors px-4 py-2 rounded-lg hover:bg-[#F9FAFB]">
                    <ArrowLeft size={18} className="mr-2" /> Back
                </button>

                <div className="flex items-center space-x-4">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGenerating}
                        className={`flex items-center font-semibold px-5 py-2.5 rounded-xl border border-[#D1D5DB] transition-all hover:bg-[#F9FAFB] text-[#1F2937] ${isGenerating ? 'opacity-50' : ''}`}
                    >
                        <Download size={18} className="mr-2" /> {isGenerating ? 'Saving...' : 'Download PDF'}
                    </button>

                    <button onClick={onContinue} className="text-white flex items-center font-bold transition-all px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-95" style={{ backgroundColor: themeColor }}>
                        Finish & Continue <ArrowRight size={18} className="ml-2" />
                    </button>
                </div>
            </div>

            {/* Customization Toolbar */}
            <div className="bg-white px-8 py-5 rounded-2xl border border-[#E5E7EB] shadow-sm mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center">
                    <div className="p-2.5 bg-[#F3F4F6] rounded-xl mr-4">
                        <Palette size={20} className="text-[#4B5563]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[#111827]">Invoice Theme</h3>
                        <p className="text-[12px] text-[#6B7280]">Select a primary color for your document</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    {THEME_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => setThemeColor(color)}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative outline-none ring-offset-2 focus:ring-2"
                            style={{
                                backgroundColor: color,
                                boxShadow: themeColor === color ? `0 0 0 2px white, 0 0 0 3px ${color}` : 'none'
                            }}
                        >
                            {themeColor === color && <Check size={14} className="text-white" strokeWidth={3} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoice Document Wrapper */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-4">
                    <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Document Preview</h3>
                    <span className="text-[11px] font-medium text-[#9CA3AF]">A4 Standard Layout</span>
                </div>

                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden relative">
                    <div className="overflow-x-auto">
                        <div ref={invoiceRef} className="p-12 sm:p-16 min-w-[760px] bg-white text-[#111827] font-sans leading-normal">

                            {/* Top Header Split */}
                            <div className="flex justify-between items-start mb-20">
                                <div>
                                    <div className="inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase text-white mb-4" style={{ backgroundColor: themeColor }}>
                                        From
                                    </div>
                                    <h2 className="font-bold text-[18px] text-[#111827] leading-tight mb-2">{bName}</h2>
                                    <div className="text-[13px] text-[#4B5563] space-y-0.5">
                                        {invoiceData.street && <p>{invoiceData.street}</p>}
                                        {(invoiceData.city || invoiceData.province || invoiceData.postalCode) && (
                                            <p>{[invoiceData.city, invoiceData.province, invoiceData.postalCode].filter(Boolean).join(', ')}</p>
                                        )}
                                        {invoiceData.country && <p>{invoiceData.country}</p>}
                                        {displaySellerName !== bName && <p className="pt-2 font-semibold text-[#111827]">Account: {displaySellerName}</p>}
                                        {invoiceData.registrationNumber && <p className="pt-0.5">Reg No: {invoiceData.registrationNumber}</p>}
                                        {isVatRegistered && invoiceData.taxReferenceNumber && <p>Tax Ref: {invoiceData.taxReferenceNumber}</p>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-[36px] font-[600] tracking-tight mb-4 uppercase leading-none" style={{ color: themeColor }}>
                                        {DocumentTitle}
                                    </h1>
                                    <div className="space-y-1">
                                        <p className="text-[13px] text-[#6B7280]">Invoice Number</p>
                                        <p className="font-bold text-[15px] text-[#111827]">{invoiceData.invoiceNumber}</p>
                                        <div className="pt-3">
                                            <p className="text-[13px] text-[#6B7280]">Issue Date</p>
                                            <p className="font-semibold text-[15px] text-[#111827]">{invoiceData.invoiceDate?.replace(/-/g, '/')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Details Split */}
                            <div className="grid grid-cols-2 gap-10 mb-16">
                                <div>
                                    <div className="inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase text-[#4B5563] bg-[#F3F4F6] mb-4">
                                        Bill To
                                    </div>
                                    <h3 className="font-bold text-[15px] text-[#111827] mb-2">Takealot Online (RF) (PTY) Limited</h3>
                                    <div className="text-[13px] text-[#4B5563] space-y-0.5 leading-relaxed">
                                        <p>12th Floor, 10 Rua Vasco Da Gama Plain</p>
                                        <p>Foreshore, Cape Town - 8000</p>
                                        <div className="pt-2">
                                            <p><span className="font-semibold">VAT:</span> 4480252119</p>
                                            <p><span className="font-semibold">Reg:</span> 2010/020248/07</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase text-[#4B5563] bg-[#F3F4F6] mb-4">
                                        Payment Terms
                                    </div>
                                    <div className="text-[13px] text-[#4B5563]">
                                        <p className="text-[#111827] font-semibold text-[15px] mb-1">Standard 30 Days</p>
                                        <p>Payment will be processed via Takealot Seller Portal.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="mb-10 overflow-hidden rounded-xl border border-[#F3F4F6]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2" style={{ borderBottomColor: themeColor }}>
                                            <th className="py-4 px-5 font-bold text-[11px] uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB]">Item Description</th>
                                            <th className="py-4 px-5 font-bold text-[11px] uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB] text-center">Qty</th>
                                            <th className="py-4 px-5 font-bold text-[11px] uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB] text-right">Rate</th>
                                            <th className="py-4 px-5 font-bold text-[11px] uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB] text-right">VAT (15%)</th>
                                            <th className="py-4 px-5 font-bold text-[11px] uppercase tracking-wider text-[#6B7280] bg-[#F9FAFB] text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {claimableItems.map((item, idx) => {
                                            const itemRate = Number(item._numericClaim) || 0;
                                            const itemVAT = isVatRegistered ? itemRate * 0.15 : 0;
                                            const itemTotal = itemRate + itemVAT;

                                            return (
                                                <tr key={idx} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FDFDFD]">
                                                    <td className="py-5 px-5 align-top">
                                                        <div className="text-[14px] text-[#111827] font-bold leading-tight mb-1">
                                                            {matchedColumns.productTitle ? item[matchedColumns.productTitle] : 'Unknown Product'}
                                                        </div>
                                                        <div className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-tighter">
                                                            SKU: {matchedColumns.sku ? item[matchedColumns.sku] : 'N/A'} • TSIN: {matchedColumns.tsin ? item[matchedColumns.tsin] : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-5 align-top text-center text-[14px] text-[#4B5563] font-semibold">1</td>
                                                    <td className="py-5 px-5 align-top text-right text-[14px] text-[#4B5563] font-medium tabular-nums whitespace-nowrap">
                                                        {formatCurrency(itemRate)}
                                                    </td>
                                                    <td className="py-5 px-5 align-top text-right text-[14px] text-[#4B5563] font-medium tabular-nums whitespace-nowrap">
                                                        {formatCurrency(itemVAT)}
                                                    </td>
                                                    <td className="py-5 px-5 align-top text-right text-[14px] text-[#111827] font-bold tabular-nums whitespace-nowrap">
                                                        {formatCurrency(itemTotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Financial Summary */}
                            <div className="flex justify-end mb-20">
                                <div className="w-[340px] space-y-1">
                                    <div className="flex justify-between items-center py-2 px-2 text-[14px] text-[#6B7280]">
                                        <span>Subtotal</span>
                                        <span className="font-semibold text-[#111827]">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 px-2 text-[14px] text-[#6B7280]">
                                        <span>VAT Total</span>
                                        <span className="font-semibold text-[#111827]">{formatCurrency(vatAmount)}</span>
                                    </div>
                                    <div className="h-px bg-[#E5E7EB] my-2"></div>
                                    <div className="flex justify-between items-center py-4 px-5 text-[18px] font-bold text-white rounded-xl shadow-lg" style={{ backgroundColor: themeColor }}>
                                        <span>TOTAL DUE</span>
                                        <span className="tabular-nums">{formatCurrency(total)}</span>
                                    </div>
                                    {isVatRegistered && (
                                        <p className="text-[10px] text-center text-[#9CA3AF] pt-2 uppercase font-bold tracking-widest">Pricing includes 15% South African VAT</p>
                                    )}
                                </div>
                            </div>

                            {/* Report Metadata */}
                            <div className="border-t border-[#F3F4F6] pt-12 text-center">
                                <h3 className="font-bold text-[14px] text-[#111827] mb-2 uppercase tracking-widest">Inventory Reconciliation Report</h3>
                                <p className="text-[13px] text-[#6B7280]">Period: <span className="text-[#111827] font-semibold">{periodMatch}</span></p>
                                <p className="text-[12px] text-[#9CA3AF] mt-1 italic">Generated from {filename}</p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
