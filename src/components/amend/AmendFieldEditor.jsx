import React from 'react';
import { AlertCircle, ArrowRight, Info } from 'lucide-react';
import { formatFieldLabel } from '../../utils/amendUtils';

const AmendInput = ({ label, name, value, originalValue, onChange, type = "text", placeholder }) => {
    const isChanged = String(value || '') !== String(originalValue || '');
    
    return (
        <div className={`group transition-all duration-300 p-4 rounded-2xl border ${isChanged ? 'bg-[#f0f7ff] border-[#4f86f7]/30 shadow-sm' : 'bg-white border-[#f3f3f6]'}`}>
            <div className="flex justify-between items-center mb-2.5 px-1">
                <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider">
                    {formatFieldLabel(name)}
                </label>
                {isChanged && (
                    <span className="text-[10px] bg-[#4f86f7] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                        Changed
                    </span>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-[1fr_24px_1fr] items-center gap-3">
                {/* Original Value (Read Only) */}
                <div className="bg-[#f5f5f7] rounded-xl px-4 py-3 text-sm text-[#86868b] font-medium border border-[#e5e5ea] truncate">
                    {originalValue || <span className="opacity-40 italic">Not found</span>}
                </div>
                
                <div className="hidden md:flex items-center justify-center text-[#d2d2d7]">
                    <ArrowRight size={14} />
                </div>
                
                {/* Amended Value (Editable) */}
                <input
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(name, e.target.value)}
                    placeholder={placeholder || `Enter ${formatFieldLabel(name)}`}
                    className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-4
                        ${isChanged 
                            ? 'border-[#4f86f7] focus:ring-[#4f86f7]/10 text-[#1d1d1f]' 
                            : 'border-[#d2d2d7] focus:border-[#4f86f7] focus:ring-[#4f86f7]/5 text-[#1d1d1f]'
                        }
                    `}
                />
            </div>
        </div>
    );
};

export default function AmendFieldEditor({ original, amended, onChange, amendmentReason, onReasonChange }) {
    const sections = [
        {
            title: 'Invoice Identifiers',
            fields: ['invoiceNumber', 'invoiceDate', 'reconPeriod']
        },
        {
            title: 'Seller Information',
            fields: ['businessName', 'registrationNumber', 'sellerAccountName', 'sellerId', 'taxReferenceNumber']
        },
        {
            title: 'Financial Totals',
            fields: ['subtotal', 'vatAmount', 'totalAmount']
        },
        {
            title: 'Seller Address',
            fields: ['street', 'city', 'province', 'postalCode', 'country']
        }
    ];

    const hasNoExtractedData = Object.keys(original).length === 0 || !original.invoiceNumber;

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {hasNoExtractedData && (
                <div className="bg-[#fffbeb] border border-[#fde68a] rounded-3xl p-6 flex items-start">
                    <div className="bg-white p-2 rounded-xl shadow-sm mr-4 mt-0.5">
                        <AlertCircle className="text-[#d97706]" size={20} />
                    </div>
                    <div>
                        <h4 className="text-[15px] font-bold text-[#92400e] mb-1">Extraction Incomplete</h4>
                        <p className="text-[13px] text-[#b45309] font-medium leading-relaxed">
                            We couldn't automatically read all fields from this PDF. Please manually fill in the missing details below to ensure accuracy.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e5e5ea] overflow-hidden">
                <div className="px-8 py-10 sm:px-12 border-b border-[#f3f3f6] flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-[800] text-[#1d1d1f] tracking-tight">Review & Amend</h3>
                        <p className="text-[15px] text-[#6e6e73] font-medium mt-1">Refine extracted data to match your records exactly.</p>
                    </div>
                    <div className="flex items-center bg-[#f5f5f7] px-5 py-3 rounded-2xl border border-[#e5e5ea]">
                        <Info size={16} className="text-[#4f86f7] mr-3 shrink-0" />
                        <p className="text-[12px] font-bold text-[#86868b] uppercase tracking-wider">
                            Highlighting <span className="text-[#4f86f7]">Blue</span> for changes
                        </p>
                    </div>
                </div>

                <div className="p-8 sm:p-12 space-y-12">
                    {sections.map((section, idx) => (
                        <div key={idx} className="space-y-6">
                            <h4 className="text-[12px] font-black text-[#1d1d1f] uppercase tracking-[0.2em] px-1 flex items-center">
                                {section.title}
                                <div className="h-px flex-1 bg-[#f3f3f6] ml-4"></div>
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                                {section.fields.map(field => (
                                    <AmendInput
                                        key={field}
                                        name={field}
                                        label={field}
                                        value={amended[field]}
                                        originalValue={original[field]}
                                        onChange={onChange}
                                        type={field === 'invoiceDate' ? 'date' : 'text'}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-6 pt-6">
                        <h4 className="text-[12px] font-black text-[#1d1d1f] uppercase tracking-[0.2em] px-1 flex items-center text-[#ff3b30]">
                            Amendment Rational
                            <div className="h-px flex-1 bg-[#f3f3f6] ml-4"></div>
                        </h4>
                        <div className="p-6 rounded-[2rem] border-2 border-[#ff3b30]/10 bg-[#fff5f5]/30">
                            <label className="block text-[11px] font-bold text-[#ff3b30] uppercase tracking-wider mb-3 px-1">
                                Reason for Amendment <span className="opacity-50">(Shown on PDF)</span>
                            </label>
                            <textarea
                                value={amendmentReason}
                                onChange={(e) => onReasonChange(e.target.value)}
                                placeholder="e.g., Adding missing VAT Number as requested by Takealot Support"
                                rows={3}
                                className="w-full bg-white border border-[#ffcccc] rounded-2xl px-6 py-4 text-sm font-semibold text-[#1d1d1f] focus:outline-none focus:ring-4 focus:ring-[#ff3b30]/5 focus:border-[#ff3b30] transition-all placeholder:text-[#999] placeholder:font-medium resize-none shadow-sm"
                            />
                            <div className="mt-4 flex items-start gap-3 px-1">
                                <AlertCircle size={14} className="text-[#ff3b30] shrink-0 mt-0.5" />
                                <p className="text-[12px] text-[#ff3b30]/70 font-medium">
                                    Providing a clear reason helps Takealot support process your amended claim faster.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
