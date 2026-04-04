import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText, Files } from 'lucide-react';

export default function UploadArea({ onFileSelect, onUseSample, allowMultiple = false }) {
    const fileInputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);

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
            onFileSelect(allowMultiple ? Array.from(e.dataTransfer.files) : e.dataTransfer.files[0]);
        }
    }, [onFileSelect, allowMultiple]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(allowMultiple ? Array.from(e.target.files) : e.target.files[0]);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#e5e5ea] overflow-hidden mb-16">
            <div className="px-10 py-8 border-b border-[#e5e5ea] bg-white">
                <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">{allowMultiple ? 'Bulk Upload Stock Data' : 'Upload Stock Data'}</h2>
                <p className="text-sm text-[#6e6e73] mt-1">
                    {allowMultiple ? 'Upload multiple Takealot Stock Recon CSV files concurrently to evaluate and triage.' : 'Upload a Takealot Stock Recon CSV file to get started.'}
                </p>
            </div>

            <div className="p-10 sm:p-16">
                <div
                    className={`border-[1.5px] border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer
            ${isDragOver
                            ? 'bg-[#f8faff] border-[#4f86f7] shadow-inner'
                            : 'bg-[#fbfbfd] border-[#d2d2d7] hover:bg-[#f5f5f7] hover:border-[#a1a1a6]'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                >
                    <div className="h-20 w-20 bg-white text-[#4f86f7] shadow-[0_4px_16px_rgba(0,0,0,0.04)] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_8px_24px_rgba(79,134,247,0.12)] transition-all duration-300">
                        {allowMultiple ? <Files size={34} strokeWidth={1.5} /> : <UploadCloud size={34} strokeWidth={1.5} />}
                    </div>
                    <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2 tracking-tight">Drag and drop your CSV{allowMultiple ? 's' : ''} here</h3>
                    <p className="text-sm text-[#86868b] mb-10 text-center max-w-sm">Expected format: Row 1 headers, Row 2 descriptions, Row 3+ data</p>

                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="bg-[#4f86f7] hover:bg-[#3b6bd6] text-white font-medium py-3 px-8 rounded-full shadow-[0_4px_16px_rgba(79,134,247,0.25)] transition-all duration-300 active:scale-95"
                        >
                            Browse Files
                        </button>
                        <input
                            type="file"
                            accept=".csv"
                            multiple={allowMultiple}
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <button
                            onClick={onUseSample}
                            className="bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7] font-medium py-3 px-8 rounded-full transition-all duration-300 flex items-center shadow-sm active:scale-95"
                        >
                            <FileText size={18} className="mr-2 text-[#86868b]" />
                            Use Sample Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
