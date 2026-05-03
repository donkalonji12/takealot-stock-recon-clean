import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, Save, RotateCcw, Download } from 'lucide-react';
import InvoicePdfUpload from './InvoicePdfUpload';
import AmendFieldEditor from './AmendFieldEditor';
import InvoicePreview from '../step3/InvoicePreview';
import { createAmendedSnapshot, downloadSnapshotJson } from '../../utils/amendUtils';

export default function AmendInvoiceModal({ isOpen, onClose }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Edit, 3: Preview
    const [originalData, setOriginalData] = useState({});
    const [amendedData, setAmendedData] = useState({});
    const [amendmentReason, setAmendmentReason] = useState('');
    const [rawText, setRawText] = useState('');

    if (!isOpen) return null;

    const handleExtracted = (data, text) => {
        setOriginalData(data);
        setAmendedData({ ...data });
        setRawText(text);
        setStep(2);
    };

    const handleFieldChange = (field, value) => {
        setAmendedData(prev => ({ ...prev, [field]: value }));
    };

    const handleReset = () => {
        setStep(1);
        setOriginalData({});
        setAmendedData({});
        setAmendmentReason('');
        setRawText('');
    };

    const handleManualEntry = () => {
        setOriginalData({});
        setAmendedData({});
        setStep(2);
    };

    const handleGenerate = () => {
        setStep(3);
    };

    const handleDownloadAll = () => {
        const snapshot = createAmendedSnapshot(originalData, amendedData, amendmentReason);
        downloadSnapshotJson(snapshot);
        // The PDF download is handled inside InvoicePreview via the ref
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-[#1d1d1f]/60 backdrop-blur-md animate-in fade-in duration-500"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-6xl max-h-[90vh] bg-[#f5f5f7] rounded-[2.5rem] shadow-[0_24px_80px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 sm:px-10 border-b border-[#e5e5ea] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#4f86f7]/10 p-2.5 rounded-2xl">
                            <RotateCcw className="text-[#4f86f7]" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Amend Existing Invoice</h2>
                            <p className="text-[13px] text-[#6e6e73] font-medium uppercase tracking-widest mt-0.5">
                                Step {step} of 3: {step === 1 ? 'Source Upload' : step === 2 ? 'Correction' : 'Preview & Save'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-full hover:bg-[#f5f5f7] transition-all text-[#86868b] hover:text-[#1d1d1f] active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-[#f3f3f6]">
                    <div 
                        className="h-full bg-[#4f86f7] transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(79,134,247,0.4)]"
                        style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 lg:p-12 scroll-smooth">
                    {step === 1 && (
                        <div className="max-w-2xl mx-auto py-10">
                            <InvoicePdfUpload onExtracted={handleExtracted} onReset={handleManualEntry} />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="max-w-4xl mx-auto">
                            <AmendFieldEditor
                                original={originalData}
                                amended={amendedData}
                                onChange={handleFieldChange}
                                amendmentReason={amendmentReason}
                                onReasonChange={setAmendmentReason}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="max-w-5xl mx-auto">
                           <InvoicePreview 
                                invoiceData={{
                                    ...amendedData,
                                    isAmended: true,
                                    amendmentReason,
                                    amendedFromInvoice: originalData.invoiceNumber,
                                    amendedAt: new Date().toLocaleDateString('en-ZA')
                                }}
                                parsedData={[]} // In amendment mode, we often don't have row data unless we re-parse CSV
                                stats={{
                                    totalClaimValue: parseFloat(amendedData.subtotal || 0)
                                }}
                                filename={amendedData.sourceFilename || "Amended_Upload.pdf"}
                                onBack={() => setStep(2)}
                                onContinue={onClose}
                                isAmendmentMode={true}
                                onDownloadSnapshot={handleDownloadAll}
                           />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {step === 2 && (
                    <div className="px-8 py-6 sm:px-12 border-t border-[#e5e5ea] bg-white/90 backdrop-blur-sm flex items-center justify-between sticky bottom-0">
                        <button
                            onClick={handleReset}
                            className="text-[#1d1d1f] font-bold py-4 px-8 rounded-full border border-[#d2d2d7] hover:bg-[#f5f5f7] transition-all flex items-center active:scale-95"
                        >
                            <ArrowLeft size={18} className="mr-2" /> Start Over
                        </button>
                        
                        <button
                            onClick={handleGenerate}
                            className="bg-[#4f86f7] hover:bg-[#3b6bd6] text-white font-bold py-4 px-12 rounded-full shadow-[0_8px_32px_rgba(79,134,247,0.3)] transition-all flex items-center active:scale-95 group"
                        >
                            Review Amended Invoice
                            <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
