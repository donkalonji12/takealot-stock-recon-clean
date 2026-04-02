import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Copy, Check, CheckCircle2, CheckCircle } from 'lucide-react';

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
};

export default function SubmitHelper({ invoiceData, parsedData, matchedColumns, stats, filename, onBack, onFinish }) {
    const [copiedStates, setCopiedStates] = useState({ subject: false, message: false, all: false });

    const claimableItems = parsedData.filter(row => row._numericClaim > 0);
    const totalItems = claimableItems.length;
    const periodMatch = matchedColumns?.period && totalItems > 0
        ? claimableItems[0][matchedColumns.period]
        : 'Not provided';

    const bName = invoiceData.businessName?.trim() || "";
    const sellerDisplay = invoiceData.sellerAccountName?.trim() ? invoiceData.sellerAccountName.trim() : bName;

    if (bName.length < 3 || sellerDisplay.length < 3) {
        return (
            <div className="p-8 bg-[#fff5f5] text-[#ff3b30] rounded-3xl my-10 text-center border border-[#ffcccc] max-w-4xl mx-auto">
                <p className="text-lg font-bold mb-2">Validation Error</p>
                <p className="text-[14px] font-medium mb-6">Business Name or Seller Account Name is missing or seriously corrupted. Please return to Step 2 and correct it.</p>
                <button onClick={onBack} className="px-6 py-2 bg-[#ff3b30] hover:bg-[#ff1a1a] text-white rounded-full font-medium shadow-sm transition-colors">Return to Previous Steps</button>
            </div>
        );
    }

    const subjectText = `Stock Reconciliation Claim for Missing Stock \u2013 Invoice ${invoiceData.invoiceNumber}`;
    const sellerIdStr = invoiceData.sellerId ? `\nSeller ID: ${invoiceData.sellerId}` : '';

    const messageText = `Good day,

I hope you are well.

Please find attached our invoice and the relevant stock reconciliation report regarding missing stock identified during reconciliation.

We kindly request reimbursement for the missing stock reflected in the attached documents.

Business Name: ${invoiceData.businessName || ''}
Seller Account Name: ${sellerDisplay}${sellerIdStr}
Invoice Number: ${invoiceData.invoiceNumber}
Recon Period: ${periodMatch}
Claim Amount: ${formatCurrency(stats.totalClaimValue)}
Number of Claimable Items: ${totalItems}
Source File: ${filename || 'Unknown CSV'}

Please let us know if any further information is required.

Kind regards,
${invoiceData.businessName || 'Seller'}`;

    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedStates(prev => ({ ...prev, [type]: true }));
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [type]: false }));
            }, 2000);
        });
    };

    const handleCopyAll = () => {
        const combined = `Subject: ${subjectText}\n\nMessage:\n${messageText}`;
        copyToClipboard(combined, 'all');
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">

            {/* Overview Heading */}
            <h2 className="text-[28px] font-black tracking-tight text-[#111827] mb-10">Prepare Submission</h2>

            {/* Primary Action Card */}
            <div className="bg-[#F8FAFC] rounded-[24px] border border-[#BFDBFE] p-8 sm:p-10 mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-[0_4px_16px_rgba(37,99,235,0.05)]">
                <div className="max-w-[60%]">
                    <h3 className="text-[18px] font-bold text-[#111827] mb-2">Open Takealot Support Page</h3>
                    <p className="text-[15px] text-[#4B5563] leading-relaxed">Navigate to the Takealot Seller Portal using the official query link below to submit your claim directly to the appropriate department.</p>
                </div>
                <a
                    href="https://help.takealot.com/hc/en-us/requests/new?ticket_form_id=316708&&tf_34289967=internal_department_marketplace&&tf_24926807=merchant_queries"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-4 px-8 rounded-full shadow-[0_8px_24px_rgba(37,99,235,0.25)] transition-all duration-300 active:scale-95 flex items-center whitespace-nowrap"
                >
                    Open Support Portal <ExternalLink size={18} className="ml-2.5" />
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 mb-12">

                <div className="space-y-10">
                    {/* Copy Content Area */}
                    <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                        <div className="px-10 py-8 border-b border-[#E5E7EB] bg-white flex justify-between items-center">
                            <div>
                                <h3 className="text-[18px] font-bold text-[#111827] mb-1">Message Template</h3>
                                <p className="text-[13px] text-[#6B7280] font-medium">Use this auto-generated template for your ticket.</p>
                            </div>
                            <button
                                onClick={handleCopyAll}
                                className="text-[13px] font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-5 py-2 rounded-full transition-colors flex items-center"
                            >
                                {copiedStates.all ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                                {copiedStates.all ? 'Copied Both' : 'Copy All'}
                            </button>
                        </div>

                        <div className="p-10 space-y-10">
                            {/* Subject */}
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Subject Line</label>
                                    <button onClick={() => copyToClipboard(subjectText, 'subject')} className="text-[12px] font-bold text-[#6B7280] hover:text-[#111827] flex items-center transition-colors bg-[#F3F4F6] hover:bg-[#E5E7EB] px-3 py-1 rounded-full">
                                        {copiedStates.subject ? <Check size={14} className="mr-1.5 text-[#16A34A]" /> : <Copy size={14} className="mr-1.5" />}
                                        {copiedStates.subject ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <div className="p-5 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] text-[15px] text-[#111827] font-semibold break-words">
                                    {subjectText}
                                </div>
                            </div>

                            {/* Body */}
                            <div>
                                <div className="flex justify-between items-end mb-3">
                                    <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest">Message Body</label>
                                    <button onClick={() => copyToClipboard(messageText, 'message')} className="text-[12px] font-bold text-[#6B7280] hover:text-[#111827] flex items-center transition-colors bg-[#F3F4F6] hover:bg-[#E5E7EB] px-3 py-1 rounded-full">
                                        {copiedStates.message ? <Check size={14} className="mr-1.5 text-[#16A34A]" /> : <Copy size={14} className="mr-1.5" />}
                                        {copiedStates.message ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <textarea
                                    readOnly
                                    value={messageText}
                                    className="w-full h-80 p-6 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] text-[14px] text-[#4B5563] font-medium leading-relaxed resize-none focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">

                    {/* Overview Card */}
                    <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] p-8">
                        <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-6">Claim Overview</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-start text-[13px] gap-6">
                                <span className="text-[#6B7280] font-medium shrink-0">Business</span>
                                <span className="text-[#111827] font-bold text-right" style={{ wordBreak: 'break-word' }}>{bName}</span>
                            </div>
                            <div className="flex justify-between items-start text-[13px] gap-6">
                                <span className="text-[#6B7280] font-medium shrink-0">Seller Account</span>
                                <span className="text-[#111827] font-bold text-right" style={{ wordBreak: 'break-word' }}>{sellerDisplay}</span>
                            </div>
                            {invoiceData.sellerId && (
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-[#6B7280] font-medium">Seller ID</span>
                                    <span className="text-[#111827] font-bold">{invoiceData.sellerId}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[#6B7280] font-medium">Invoice</span>
                                <span className="text-[#111827] font-bold">{invoiceData.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[#6B7280] font-medium">Period</span>
                                <span className="text-[#111827] font-bold">{periodMatch}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                                <span className="text-[#6B7280] font-medium">Source File</span>
                                <span className="text-[#111827] font-bold text-right max-w-[160px] truncate">{filename || 'Unknown CSV'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[13px] pt-5 mt-2 border-t border-[#E5E7EB]">
                                <div className="text-[#6B7280] font-bold">Total Value <span className="font-semibold block text-[11px] mt-0.5">Across {totalItems} item(s)</span></div>
                                <span className="text-[#16A34A] font-black text-[18px]">{formatCurrency(stats.totalClaimValue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Checklist */}
                    <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] p-8 mb-8">
                        <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-6">Required Attachments</h3>
                        <div className="space-y-5">
                            <div className="flex items-start">
                                <CheckCircle size={20} className="text-[#2563EB] mr-3 shrink-0 mt-0.5" strokeWidth={2.5} />
                                <div>
                                    <p className="text-[14px] font-bold text-[#111827]">Invoice PDF</p>
                                    <p className="text-[12px] text-[#6B7280] mt-1 font-medium truncate max-w-[220px]">Ensure you downloaded from Step 3</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <CheckCircle size={20} className="text-[#2563EB] mr-3 shrink-0 mt-0.5" strokeWidth={2.5} />
                                <div>
                                    <p className="text-[14px] font-bold text-[#111827]">Stock Recon CSV</p>
                                    <p className="text-[12px] text-[#6B7280] mt-1 font-medium truncate max-w-[220px]">{filename || 'Original.csv'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Path Instructions */}
                    <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] p-8">
                        <h3 className="text-[11px] font-bold text-[#6B7280] uppercase tracking-widest mb-6">Submission Path</h3>
                        <ol className="space-y-0 text-[14px] font-semibold text-[#4B5563] list-none relative">
                            <li className="flex items-start pb-5 relative">
                                <div className="absolute left-3.5 top-7 w-px h-[calc(100%-14px)] bg-[#E5E7EB]"></div>
                                <span className="w-7 h-7 rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center text-[12px] mr-4 z-10 font-bold shrink-0">1</span>
                                <span className="pt-0.5">Seller Query Types</span>
                            </li>
                            <li className="flex items-start pb-5 relative">
                                <div className="absolute left-3.5 top-7 w-px h-[calc(100%-14px)] bg-[#E5E7EB]"></div>
                                <span className="w-7 h-7 rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center text-[12px] mr-4 z-10 font-bold shrink-0">2</span>
                                <span className="pt-0.5">Stock Reconciliation</span>
                            </li>
                            <li className="flex items-start">
                                <span className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center text-[12px] font-bold mr-4 z-10 shrink-0">3</span>
                                <span className="pt-0.5 text-[#111827] leading-snug">I need to be reimbursed for missing stock</span>
                            </li>
                        </ol>
                    </div>

                </div>

            </div>

            {/* Actions Wrapper */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-10 gap-4 border-t border-[#E5E7EB] pt-10">
                <button
                    onClick={onBack}
                    className="bg-white hover:bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB] font-medium py-3.5 px-8 rounded-full transition-all duration-300 shadow-sm active:scale-95 flex items-center w-full sm:w-auto justify-center"
                >
                    <ArrowLeft size={18} className="mr-2" /> Back to Preview
                </button>

                <button
                    onClick={onFinish}
                    className="bg-[#111827] hover:bg-black text-white font-medium py-3.5 px-12 rounded-full shadow-md transition-all duration-300 active:scale-95 flex items-center justify-center w-full sm:w-auto"
                >
                    Finish <Check size={18} className="ml-2.5" />
                </button>
            </div>

        </div>
    );
}
