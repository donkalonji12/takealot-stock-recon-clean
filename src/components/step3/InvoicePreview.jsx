import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, ArrowLeft, ArrowRight, Check, Palette } from 'lucide-react';
import { formatReconPeriod } from '../../utils/formatters';

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

    if (!parsedData || !stats) return null;

    const claimableItems = parsedData.filter(row => row._numericClaim > 0);
    const numItems = claimableItems.length;

    const periodMatch = matchedColumns?.period && numItems > 0
        ? formatReconPeriod(claimableItems[0][matchedColumns.period])
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

    // Always TAX INVOICE as per Takealot stock loss claim requirements
    const DocumentTitle = 'TAX INVOICE';

    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return;
        try {
            setIsGenerating(true);
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2,
                useCORS: true,
                windowWidth: 1200,
                logging: false,
            });
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
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
                <button onClick={onBack} className="text-[#4B5563] hover:text-[#111827] flex items-center font-medium transition-colors px-4 py-2.5 rounded-lg hover:bg-[#F9FAFB] min-h-[44px]">
                    <ArrowLeft size={18} className="mr-2" /> Back
                </button>

                <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGenerating}
                        className={`flex items-center font-semibold px-4 sm:px-5 py-2.5 rounded-xl border border-[#D1D5DB] transition-all hover:bg-[#F9FAFB] text-[#1F2937] min-h-[44px] ${isGenerating ? 'opacity-50' : ''}`}
                    >
                        <Download size={18} className="mr-2" /> {isGenerating ? 'Saving...' : 'Download PDF'}
                    </button>

                    <button onClick={onContinue} className="text-white flex items-center font-bold transition-all px-5 sm:px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 min-h-[44px]" style={{ backgroundColor: themeColor }}>
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

                {/* Mobile scroll hint */}
                <div className="sm:hidden flex items-center justify-center gap-2 py-2 text-[12px] text-[#86868b] font-medium">
                    <span>←</span>
                    <span>Scroll to view full invoice</span>
                    <span>→</span>
                </div>

                <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden relative">
                    <div className="overflow-x-auto">
                        <div ref={invoiceRef} className="p-14 min-w-[800px] bg-white text-[#111827] font-sans leading-normal">
                            {/* Document Header Grid */}
                            <div className="grid grid-cols-12 gap-8 mb-12 items-start">
                                <div className="col-span-7">
                                    <div className="inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase text-white mb-5" style={{ backgroundColor: themeColor }}>
                                        From
                                    </div>
                                    <h2 className="font-bold text-[22px] text-[#111827] leading-tight mb-3">{bName}</h2>
                                    <div className="text-[14px] text-[#4B5563] space-y-1 max-w-[320px]">
                                        {invoiceData.street && <p>{invoiceData.street}</p>}
                                        {(invoiceData.city || invoiceData.province || invoiceData.postalCode) && (
                                            <p>{[invoiceData.city, invoiceData.province, invoiceData.postalCode].filter(Boolean).join(', ')}</p>
                                        )}
                                        {invoiceData.country && <p>{invoiceData.country}</p>}
                                        
                                        <div className="pt-4 border-t border-[#F3F4F6] mt-4 space-y-1">
                                            {displaySellerName !== bName && <p><span className="font-semibold text-[#111827]">Account:</span> {displaySellerName}</p>}
                                            {invoiceData.sellerId && <p><span className="font-semibold text-[#111827]">Seller ID:</span> {invoiceData.sellerId}</p>}
                                            {invoiceData.registrationNumber && <p><span className="font-semibold text-[#111827]">Reg No:</span> {invoiceData.registrationNumber}</p>}
                                            {isVatRegistered && invoiceData.taxReferenceNumber && <p><span className="font-semibold text-[#111827]">Tax Ref:</span> {invoiceData.taxReferenceNumber}</p>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="col-span-5 text-right">
                                    <h1 className="text-[42px] font-[800] tracking-tighter mb-2 uppercase leading-none" style={{ color: themeColor }}>
                                        {DocumentTitle}
                                    </h1>
                                    <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-widest mb-6">Stock Loss Claim Invoice</p>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Invoice Number</p>
                                            <p className="font-bold text-[18px] text-[#111827]">{invoiceData.invoiceNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Issue Date</p>
                                            <p className="font-semibold text-[16px] text-[#111827]">{invoiceData.invoiceDate?.replace(/-/g, '/')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-12 gap-8 mb-10 border-t border-b border-[#F3F4F6] py-8 items-start">
                                <div className="col-span-7">
                                    <div className="inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase text-[#6B7280] bg-[#F3F4F6] mb-4">
                                        Billed To
                                    </div>
                                    <h3 className="font-bold text-[16px] text-[#111827] mb-2">Takealot Online (RF) (PTY) Limited</h3>
                                    <div className="text-[14px] text-[#4B5563] space-y-1 leading-relaxed max-w-[320px]">
                                        <p>12th Floor, 10 Rua Vasco Da Gama Plain</p>
                                        <p>Foreshore, Cape Town - 8000</p>
                                        <div className="pt-3 space-y-1">
                                            <div className="flex space-x-4">
                                                <p><span className="font-semibold text-[#111827]">VAT:</span> 4480252119</p>
                                                <p><span className="font-semibold text-[#111827]">Reg:</span> 2010/020248/07</p>
                                            </div>
                                            <p><span className="font-semibold text-[#111827]">Tax Ref:</span> 9910006148</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="col-span-5 text-right flex flex-col justify-start items-end">
                                    <div className="inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase text-[#6B7280] bg-[#F3F4F6] mb-4">
                                        Report Metadata
                                    </div>
                                    <div className="text-[14px] text-[#4B5563] space-y-2">
                                        <p><span className="font-semibold text-[#111827]">Recon Period:</span> {periodMatch}</p>
                                        <p className="text-[12px] italic text-[#9CA3AF]">Source: {filename}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Table Section */}
                            <div className="mb-8 border border-[#F3F4F6] rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b-2" style={{ borderBottomColor: themeColor }}>
                                            <th className="py-4 px-8 font-bold text-[11px] uppercase tracking-widest text-[#9CA3AF] w-[38%]">Item Description</th>
                                            <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-[#9CA3AF] text-center w-[8%]">Qty</th>
                                            <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-[#9CA3AF] text-right w-[18%]">Unit Claim Value</th>
                                            <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-[#9CA3AF] text-right w-[17%]">VAT (15%)</th>
                                            <th className="py-4 px-8 font-bold text-[11px] uppercase tracking-widest text-[#9CA3AF] text-right w-[19%]">Total Claim Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {claimableItems.map((item, idx) => {
                                            const itemQty = matchedColumns.quantity
                                                ? Math.abs(Number(item[matchedColumns.quantity]) || 1)
                                                : 1;
                                            const unitRate = Number(item._numericClaim) || 0;
                                            const itemVAT = isVatRegistered ? unitRate * 0.15 : 0;
                                            const itemTotal = (unitRate + itemVAT) * itemQty;
 
                                            return (
                                                <tr key={idx} className="border-t border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB]/50">
                                                    <td className="py-5 px-8">
                                                        <div className="text-[14px] text-[#111827] font-bold leading-tight mb-1">
                                                            {matchedColumns.productTitle ? item[matchedColumns.productTitle] : 'Unknown Product'}
                                                        </div>
                                                        <div className="text-[11px] text-[#9CA3AF] font-medium tracking-tight uppercase">
                                                            TSIN: {matchedColumns.tsin ? item[matchedColumns.tsin] : 'N/A'} • SKU: {matchedColumns.sku ? item[matchedColumns.sku] : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4 text-center text-[14px] text-[#4B5563] font-semibold">{itemQty}</td>
                                                    <td className="py-5 px-4 text-right text-[14px] text-[#4B5563] tabular-nums font-medium whitespace-nowrap">
                                                        {formatCurrency(unitRate)}
                                                    </td>
                                                    <td className="py-5 px-4 text-right text-[14px] text-[#4B5563] tabular-nums font-medium whitespace-nowrap">
                                                        {isVatRegistered
                                                            ? formatCurrency(itemVAT * itemQty)
                                                            : <span className="text-[12px] text-[#9CA3AF] italic">0% (N/A)</span>
                                                        }
                                                    </td>
                                                    <td className="py-5 px-8 text-right text-[15px] text-[#111827] font-bold tabular-nums whitespace-nowrap">
                                                        {formatCurrency(itemTotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
 
                            {/* Summary Section */}
                            <div className="flex justify-end">
                                <div className="w-[360px] space-y-3">
                                    <div className="flex justify-between items-center text-[14px] text-[#6B7280] py-1">
                                        <span className="font-medium">Subtotal</span>
                                        <span className="font-semibold text-[#111827] tabular-nums">{formatCurrency(subtotal).replace('R ', 'R').replace('R', 'R ')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[14px] text-[#6B7280] py-1 border-b border-[#F3F4F6] pb-3">
                                        <span className="font-medium">
                                            {isVatRegistered ? 'VAT Total (15%)' : 'VAT'}
                                        </span>
                                        <span className="font-semibold text-[#111827] tabular-nums">
                                            {isVatRegistered
                                                ? formatCurrency(vatAmount)
                                                : <span className="text-[12px] text-[#9CA3AF] italic">0% (Not applicable)</span>
                                            }
                                        </span>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <div 
                                            className="flex justify-between items-center py-4 px-7 rounded-xl shadow-md text-white" 
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            <span className="text-[14px] font-black uppercase tracking-[0.12em]">Total Due</span>
                                            <span className="text-[21px] font-black tabular-nums">
                                                {formatCurrency(total).replace('R ', 'R').replace('R', 'R ')}
                                            </span>
                                        </div>
                                    </div>
                                     
                                    {isVatRegistered && (
                                        <p className="text-[10px] text-right text-[#9CA3AF] pt-1.5 uppercase font-bold tracking-[0.15em]">
                                            Pricing includes 15% South African VAT
                                        </p>
                                    )}
                                </div>
                            </div>
 
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
