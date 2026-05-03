import React, { useCallback, useRef, useState } from 'react';
import { FileUp, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { extractInvoiceData } from '../../utils/pdfExtractor';

export default function InvoicePdfUpload({ onExtracted, onReset }) {
    const fileInputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [fileName, setFileName] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const handleFile = async (file) => {
        if (!file || file.type !== 'application/pdf') {
            setError('Please upload a valid PDF invoice file.');
            return;
        }

        setError(null);
        setSuccess(false);
        setIsProcessing(true);
        setFileName(file.name);
        setStatusMessage('Initializing...');

        try {
            const result = await extractInvoiceData(file, setStatusMessage);
            if (result.success) {
                if (result.isImageBased) {
                    setStatusMessage('OCR Complete! Mapping fields...');
                }
                setSuccess(true);
                // Artificial delay for better UX (so it doesn't just flash)
                setTimeout(() => {
                    onExtracted(result.data, result.rawText);
                    setIsProcessing(false);
                }, 800);
            } else {
                setError(result.error);
                setIsProcessing(false);
            }
        } catch (err) {
            setError('An unexpected error occurred while reading the PDF.');
            setIsProcessing(false);
        }
    };

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-[#e5e5ea] overflow-hidden">
            <div className="p-8 sm:p-12 md:p-16">
                <div
                    className={`border-[2px] border-dashed rounded-[2.5rem] p-10 sm:p-16 flex flex-col items-center justify-center transition-all duration-500 group relative
                        ${isDragOver
                            ? 'bg-[#f0f7ff] border-[#4f86f7] scale-[1.02]'
                            : 'bg-[#fbfbfd] border-[#d2d2d7] hover:bg-white hover:border-[#4f86f7]/50'
                        }
                        ${isProcessing ? 'pointer-events-none opacity-80' : 'cursor-pointer'}
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isProcessing && fileInputRef.current.click()}
                >
                    {/* Status Icons */}
                    <div className="relative mb-8">
                        <div className={`h-24 w-24 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-sm
                            ${success ? 'bg-[#f0fdf4] text-[#22c55e]' : 
                              error ? 'bg-[#fef2f2] text-[#ef4444]' : 
                              isProcessing ? 'bg-[#f0f7ff] text-[#4f86f7]' : 
                              'bg-white text-[#4f86f7] group-hover:shadow-md'}
                        `}>
                            {isProcessing ? (
                                <Loader2 size={36} className="animate-spin" />
                            ) : success ? (
                                <CheckCircle2 size={36} strokeWidth={1.5} />
                            ) : error ? (
                                <AlertCircle size={36} strokeWidth={1.5} />
                            ) : (
                                <FileUp size={36} strokeWidth={1.5} className="group-hover:translate-y-[-4px] transition-transform" />
                            )}
                        </div>
                        
                        {isProcessing && (
                            <div className="absolute inset-0 border-2 border-[#4f86f7] border-t-transparent rounded-3xl animate-spin-slow opacity-20"></div>
                        )}
                    </div>

                    <div className="text-center max-w-sm">
                        <h3 className="text-xl font-bold text-[#1d1d1f] mb-3 tracking-tight">
                            {isProcessing ? 'Extracting Invoice Data...' : 
                             success ? 'Extraction Successful' :
                             error ? 'Couldn\'t Read PDF' :
                             'Upload Original Invoice PDF'}
                        </h3>
                        <p className="text-[15px] text-[#6e6e73] font-medium leading-relaxed px-4">
                            {isProcessing ? statusMessage : 
                             success ? `Extracted all visible fields from ${fileName}.` :
                             error ? error :
                             'Drag and drop your existing PDF invoice here, or click to browse.'}
                        </p>
                    </div>

                    {!isProcessing && !success && (
                        <div className="mt-8">
                            <button
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                                className="bg-[#4f86f7] hover:bg-[#3b6bd6] text-white font-bold py-4 px-10 rounded-full shadow-[0_8px_24px_rgba(79,134,247,0.2)] transition-all duration-300 active:scale-95 flex items-center"
                            >
                                <FileText size={18} className="mr-2" />
                                Select PDF Invoice
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {/* Progress Bar for Processing State */}
                    {isProcessing && (
                        <div className="mt-10 w-48 bg-[#e5e5ea] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#4f86f7] h-full animate-progress-indeterminate rounded-full"></div>
                        </div>
                    )}
                </div>

                {/* Manual Entry Fallback */}
                {!isProcessing && (
                    <div className="mt-10 pt-8 border-t border-[#f3f3f6] text-center">
                        <p className="text-[13px] text-[#86868b] font-medium mb-4">Having trouble reading your PDF?</p>
                        <button
                            onClick={onReset}
                            className="text-[#4f86f7] hover:text-[#3b6bd6] font-bold text-sm underline underline-offset-4 decoration-2 transition-all"
                        >
                            Skip Upload & Enter Details Manually
                        </button>
                    </div>
                )}

                {/* Requirements/Tips */}
                {!isProcessing && !success && !error && (
                    <div className="mt-12 flex flex-wrap justify-center gap-8 px-4 opacity-60">
                        <div className="flex items-center text-xs font-semibold uppercase tracking-widest text-[#86868b]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4f86f7] mr-2"></span>
                            Max Size: 10MB
                        </div>
                        <div className="flex items-center text-xs font-semibold uppercase tracking-widest text-[#86868b]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4f86f7] mr-2"></span>
                            Format: PDF Only
                        </div>
                        <div className="flex items-center text-xs font-semibold uppercase tracking-widest text-[#86868b]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4f86f7] mr-2"></span>
                            Type: Digital or Scanned
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
