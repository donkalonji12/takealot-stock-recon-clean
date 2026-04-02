import React, { useState } from 'react';

const InputField = ({ label, name, type = 'text', required, placeholder, value, onChange }) => (
    <div className="mb-6">
        <label className="block text-[13px] font-semibold text-[#6e6e73] tracking-wide mb-2 uppercase">
            {label} {required && <span className="text-[#ff3b30]">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl px-4 py-3.5 text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#4f86f7]/40 focus:border-[#4f86f7] transition-all duration-200 shadow-sm"
        />
    </div>
);

export default function EditInvoiceForm({ data, onChange, onContinue, onBack }) {
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        onChange(prev => ({ ...prev, [name]: value }));
        if (name === 'businessName' && value.trim() !== '') {
            setError('');
        }
    };

    const handleContinue = () => {
        const bName = (data.businessName || "").trim();
        if (bName.length < 3) {
            setError('Business Name must be at least 3 characters');
            return;
        }

        const cleanedData = {
            ...data,
            businessName: bName,
            sellerAccountName: (data.sellerAccountName || "").trim()
        };

        onChange(cleanedData);
        onContinue();
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[#e5e5ea] overflow-hidden mb-8">
                <div className="px-10 py-8 border-b border-[#e5e5ea] bg-white">
                    <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Edit Invoice Details</h2>
                    <p className="text-sm text-[#6e6e73] mt-1">Provide your business and invoice information for the generated claim.</p>
                </div>

                <div className="p-10">
                    {/* Section A: Business Details */}
                    <div className="mb-12">
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-6 border-b border-[#e5e5ea] pb-2">Business Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InputField label="Business Name" name="businessName" required placeholder="Enter registered business name" value={data.businessName} onChange={handleInputChange} />
                            <InputField label="Registration Number" name="registrationNumber" placeholder="Optional" value={data.registrationNumber} onChange={handleInputChange} />

                            <InputField label="Seller Account Name" name="sellerAccountName" placeholder="Enter your Takealot seller account name" value={data.sellerAccountName} onChange={handleInputChange} />
                            <InputField label="Seller ID (optional)" name="sellerId" placeholder="Optional" value={data.sellerId} onChange={handleInputChange} />

                            <div className="mb-6">
                                <label className="block text-[13px] font-semibold text-[#6e6e73] tracking-wide mb-2 uppercase">VAT Status</label>
                                <div className="flex space-x-6 mt-3">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="vatStatus"
                                            value="VAT Registered"
                                            checked={data.vatStatus === 'VAT Registered'}
                                            onChange={handleInputChange}
                                            className="w-5 h-5 text-[#4f86f7] border-[#d2d2d7] focus:ring-[#4f86f7] transition-all cursor-pointer"
                                        />
                                        <span className="text-sm font-medium text-[#1d1d1f] group-hover:text-[#4f86f7] transition-colors">VAT Registered</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="vatStatus"
                                            value="Not VAT Registered"
                                            checked={data.vatStatus === 'Not VAT Registered'}
                                            onChange={handleInputChange}
                                            className="w-5 h-5 text-[#4f86f7] border-[#d2d2d7] focus:ring-[#4f86f7] transition-all cursor-pointer"
                                        />
                                        <span className="text-sm font-medium text-[#1d1d1f] group-hover:text-[#4f86f7] transition-colors">Not VAT Registered</span>
                                    </label>
                                </div>
                            </div>

                            {data.vatStatus === 'VAT Registered' && (
                                <InputField label="Tax Reference / VAT Number" name="taxReferenceNumber" placeholder="Optional" value={data.taxReferenceNumber} onChange={handleInputChange} />
                            )}
                        </div>
                    </div>

                    {/* Section B: Invoice Details */}
                    <div className="mb-12">
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-6 border-b border-[#e5e5ea] pb-2">Invoice Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InputField label="Invoice Number" name="invoiceNumber" placeholder="e.g. INV-20231015-123" value={data.invoiceNumber} onChange={handleInputChange} />
                            <InputField label="Invoice Date" name="invoiceDate" type="date" value={data.invoiceDate} onChange={handleInputChange} />
                        </div>
                    </div>

                    {/* Section C: Company Address */}
                    <div className="mb-12">
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-6 border-b border-[#e5e5ea] pb-2">Registered Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                            <InputField label="Street Address" name="street" value={data.street} onChange={handleInputChange} placeholder="123 Main Street" />
                            <InputField label="City" name="city" value={data.city} onChange={handleInputChange} placeholder="Cape Town" />
                            <InputField label="Province / State" name="province" value={data.province} onChange={handleInputChange} placeholder="Western Cape" />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Postal Code" name="postalCode" value={data.postalCode} onChange={handleInputChange} placeholder="8001" />
                                <InputField label="Country" name="country" value={data.country} onChange={handleInputChange} placeholder="South Africa" />
                            </div>
                        </div>
                    </div>

                    {/* Section D: Notes */}
                    <div>
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-6 border-b border-[#e5e5ea] pb-2">Additional Details</h3>
                        <label className="block text-[13px] font-semibold text-[#6e6e73] tracking-wide mb-2 uppercase">Custom Notes</label>
                        <textarea
                            name="notes"
                            value={data.notes || ''}
                            onChange={handleInputChange}
                            rows={4}
                            placeholder="Additional notes (optional)"
                            className="w-full bg-[#fbfbfd] border border-[#d2d2d7] rounded-xl px-4 py-3.5 text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#4f86f7]/40 focus:border-[#4f86f7] transition-all duration-200 shadow-sm resize-y"
                        />
                    </div>

                    {error && (
                        <div className="mt-8 p-4 bg-[#fff5f5] border border-[#ffcccc] rounded-xl text-center">
                            <p className="text-sm font-semibold text-[#ff3b30]">{error}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pb-10">
                <button
                    onClick={onBack}
                    className="bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] font-medium py-3.5 px-8 rounded-full transition-all duration-300 shadow-sm active:scale-95"
                >
                    Back to Upload
                </button>
                <button
                    onClick={handleContinue}
                    className="bg-[#4f86f7] hover:bg-[#3b6bd6] text-white font-medium py-3.5 px-10 rounded-full shadow-[0_4px_16px_rgba(79,134,247,0.3)] transition-all duration-300 active:scale-95"
                >
                    Continue to Preview
                </button>
            </div>
        </div>
    );
}
