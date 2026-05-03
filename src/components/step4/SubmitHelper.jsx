import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Copy, Check, CheckCircle2 } from 'lucide-react';
import { formatReconPeriod } from '../../utils/formatters';

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
};

export default function SubmitHelper({ invoiceData, parsedData, matchedColumns, stats, filename, onBack, onFinish }) {
    const [copiedStates, setCopiedStates] = useState({ subject: false, message: false, all: false });

    if (!parsedData || !stats) return null;

    const claimableItems = parsedData.filter(row => row._numericClaim > 0);
    const totalItems = claimableItems.length;

    const periodMatch = matchedColumns?.period && totalItems > 0
        ? formatReconPeriod(claimableItems[0][matchedColumns.period])
        : 'Not provided';

    const bName = invoiceData.businessName?.trim() || "";
    const sellerDisplay = invoiceData.sellerAccountName?.trim() ? invoiceData.sellerAccountName.trim() : bName;

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
            setTimeout(() => setCopiedStates(prev => ({ ...prev, [type]: false })), 2000);
        });
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="mb-10">
                <h2 className="text-[28px] font-black tracking-tight text-[#1d1d1f]">Prepare Submission</h2>
                <p className="text-[#6B7280] mt-2 font-medium">Finalize your claim and submit to the Takealot Support portal.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 mb-12">
                
                <div className="space-y-10">
                    {/* Copy Area */}
                    <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden">
                        <div className="px-5 py-6 sm:px-10 sm:py-8 border-b border-[#E5E7EB] bg-white flex flex-wrap gap-4 items-start justify-between">
                            <div>
                                <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-1">Message Template</h3>
                                <p className="text-[13px] text-[#6B7280] font-medium">Use this professional template for your ticket body.</p>
                            </div>
                            <button 
                                onClick={() => { copyToClipboard(`Subject: ${subjectText}\n\nMessage:\n${messageText}`, 'all') }}
                                className="text-[13px] font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] px-5 py-3 rounded-full transition-colors flex items-center min-h-[44px]"
                            >
                                {copiedStates.all ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                                {copiedStates.all ? 'Copied Everything' : 'Copy All'}
                            </button>
                        </div>
                        <div className="p-5 sm:p-10 space-y-8">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest">Subject Line</label>
                                    <button onClick={() => copyToClipboard(subjectText, 'subject')} className="text-[11px] font-semibold text-[#2563EB] hover:underline underline-offset-4 decoration-2">
                                        {copiedStates.subject ? 'Copied' : 'Copy Subject'}
                                    </button>
                                </div>
                                <div className="p-5 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] text-[14px] font-semibold text-[#1d1d1f]">{subjectText}</div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest">Message Body</label>
                                    <button onClick={() => copyToClipboard(messageText, 'message')} className="text-[11px] font-semibold text-[#2563EB] hover:underline underline-offset-4 decoration-2">
                                        {copiedStates.message ? 'Copied' : 'Copy Body'}
                                    </button>
                                </div>
                                <textarea 
                                    readOnly 
                                    value={messageText}
                                    className="w-full h-80 p-6 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] text-[13px] text-[#4B5563] font-medium leading-relaxed resize-none focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Support Link */}
                    <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-[24px] p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4 sm:gap-0">
                        <div className="bg-white p-3 rounded-xl shadow-sm sm:mr-6 shrink-0">
                            <ExternalLink className="text-[#2563EB]" size={20} />
                        </div>
                        <div>
                            <h4 className="text-[16px] font-semibold text-[#1d1d1f] mb-1">Submit to Support Portal</h4>
                            <p className="text-[13px] text-[#2563EB] font-medium leading-relaxed mb-5">
                                Please attach your downloaded PDF invoice and the original reconciliation report to your ticket.
                            </p>
                            <a 
                                href="https://help.takealot.com/hc/en-us/requests/new?ticket_form_id=316708&&tf_34289967=internal_department_marketplace&&tf_24926807=merchant_queries" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3.5 px-8 rounded-full shadow-lg transition-all inline-flex items-center active:scale-95 w-full sm:w-auto justify-center"
                            >
                                Open Support Ticket <ExternalLink size={16} className="ml-2" />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Summary Sidebar */}
                    <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] p-8">
                        <h3 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest mb-6">Claim Overview</h3>
                        <div className="space-y-4 text-[13px]">
                            <div className="flex justify-between">
                                <span className="text-[#6B7280] font-medium">Invoice No.</span>
                                <span className="font-semibold text-[#1d1d1f]">{invoiceData.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#6B7280] font-medium">Period</span>
                                <span className="font-semibold text-[#1d1d1f]">{periodMatch}</span>
                            </div>
                            {invoiceData.sellerId && (
                                <div className="flex justify-between">
                                    <span className="text-[#6B7280] font-medium">Seller ID</span>
                                    <span className="font-semibold text-[#1d1d1f]">{invoiceData.sellerId}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-[#6B7280] font-medium">Items</span>
                                <span className="font-semibold text-[#1d1d1f]">{totalItems}</span>
                            </div>
                            <div className="pt-6 mt-2 border-t border-[#F3F4F6]">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[13px] font-semibold text-[#1d1d1f]">Claim Value</span>
                                    <span className="text-[18px] font-black text-[#16A34A]">{formatCurrency(stats.totalClaimValue)}</span>
                                </div>
                                <p className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-tight">Ready for submission</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] p-8 flex items-center">
                        <div className="w-10 h-10 rounded-full bg-[#f0fdf4] flex items-center justify-center mr-4">
                            <CheckCircle2 className="text-[#22c55e]" size={20} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-[#1d1d1f]">Double Check</p>
                            <p className="text-[11px] text-[#6B7280] font-medium">Ensure Invoice & Recon match.</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-10 gap-4 border-t border-[#E5E7EB] pt-10 mt-10">
                <button 
                    onClick={onBack}
                    className="bg-white hover:bg-[#F3F4F6] text-[#1d1d1f] border border-[#D1D5DB] font-medium py-3.5 px-8 rounded-full shadow-sm flex items-center w-full sm:w-auto justify-center transition-all"
                >
                    <ArrowLeft size={18} className="mr-2" /> Back to Preview
                </button>
                <button 
                    onClick={onFinish}
                    className="bg-[#111827] hover:bg-black text-white font-medium py-3.5 px-12 rounded-full shadow-md flex items-center justify-center w-full sm:w-auto transition-all"
                >
                    Finish & Reset <Check size={18} className="ml-2.5" />
                </button>
            </div>
        </div>
    );
}
