import React, { useState, useEffect } from 'react';
import ProgressBar from '../components/layout/ProgressBar';
import UploadArea from '../components/step1/UploadArea';
import SummaryCards from '../components/step1/SummaryCards';
import DataTablePreview from '../components/step1/DataTablePreview';
import FlaggedClaims from '../components/step1/FlaggedClaims';
import EditInvoiceForm from '../components/step2/EditInvoiceForm';
import ClaimModal from '../components/step1/ClaimModal';
import InvoicePreview from '../components/step3/InvoicePreview';
import SubmitHelper from '../components/step4/SubmitHelper';
import BulkResultsTable from '../components/step1/BulkResultsTable';
import LateFeeEstimator from '../components/step1/LateFeeEstimator';
import AmendInvoiceModal from '../components/amend/AmendInvoiceModal';
import { parseTakealotCsv } from '../utils/csvParser';
import { sampleCsvData } from '../data/sampleData';
import { CheckCircle, AlertTriangle, Layers, FileDigit, FileEdit } from 'lucide-react';

export default function ClaimsPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [uploadMode, setUploadMode] = useState('single'); // 'single' | 'bulk'
    const [parsedState, setParsedState] = useState(null);
    const [errorState, setErrorState] = useState(null);
    const [filename, setFilename] = useState('');
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [modalStatus, setModalStatus] = useState('Claimable');
    const [showAmendModal, setShowAmendModal] = useState(false);

    const generateInvoiceNumber = () => {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].split('-').join('');
        const randDigits = Math.floor(1000 + Math.random() * 9000);
        return `INV-${dateStr}-${randDigits}`;
    };

    const [bulkBatches, setBulkBatches] = useState(() => {
        try {
            const savedBatches = localStorage.getItem('takealotReconBulkBatches');
            if (savedBatches) return JSON.parse(savedBatches);

            const oldRecords = localStorage.getItem('takealotReconBulkRecords');
            if (oldRecords) {
                const records = JSON.parse(oldRecords);
                if (records && records.length > 0) {
                    const ts = Date.now();
                    const legacyBatch = {
                        id: `Legacy_${ts}`,
                        createdAt: ts,
                        records: records.map(r => ({ ...r, batchId: `Legacy_${ts}` })),
                        stats: {
                            total: records.length,
                            claimable: records.filter(r => r.status === 'Claimable').length,
                            noClaim: records.filter(r => r.status === 'No Claim').length,
                            noData: records.filter(r => r.status === 'No Data').length,
                            invalid: records.filter(r => r.status === 'Invalid Format').length,
                            totalValue: records.reduce((acc, r) => acc + (r.stats?.totalClaimValue || 0), 0)
                        }
                    };
                    return [legacyBatch];
                }
            }
        } catch (err) { console.error("Migration/Load Error:", err); }
        return [];
    });

    useEffect(() => {
        try {
            localStorage.setItem('takealotReconBulkBatches', JSON.stringify(bulkBatches));
        } catch (e) {
            console.warn("Storage quota exceeded for bulk batches, ignoring limit.");
        }
    }, [bulkBatches]);

    const [invoiceData, setInvoiceData] = useState(() => {
        try {
            const saved = localStorage.getItem('takealotReconInvoice');
            if (saved) {
                const parsed = JSON.parse(saved);
                const date = new Date();
                const dateStr = date.toISOString().split('T')[0];
                const defaults = {
                    businessName: '',
                    registrationNumber: '',
                    sellerAccountName: '',
                    sellerId: '',
                    vatStatus: 'Not VAT Registered',
                    taxReferenceNumber: '',
                    invoiceNumber: generateInvoiceNumber(),
                    invoiceDate: dateStr,
                    street: '',
                    city: '',
                    province: '',
                    postalCode: '',
                    country: 'South Africa',
                    notes: '',
                    takealotVatNumber: '4480252119',
                    takealotRegNumber: '2010/020248/07',
                    takealotAddress: '12th Floor, 10 Rua Vasco Da Gama Plain, Foreshore, Cape Town - 8000'
                };
                if (parsed && typeof parsed.businessName === 'string') {
                    return { ...defaults, ...parsed };
                }
            }
        } catch (err) { }

        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        return {
            businessName: '',
            registrationNumber: '',
            sellerAccountName: '',
            sellerId: '',
            vatStatus: 'Not VAT Registered',
            taxReferenceNumber: '',
            invoiceNumber: generateInvoiceNumber(),
            invoiceDate: dateStr,
            street: '',
            city: '',
            province: '',
            postalCode: '',
            country: 'South Africa',
            notes: '',
            takealotVatNumber: '4480252119',
            takealotRegNumber: '2010/020248/07',
            takealotAddress: '12th Floor, 10 Rua Vasco Da Gama Plain, Foreshore, Cape Town - 8000'
        };
    });

    useEffect(() => {
        localStorage.setItem('takealotReconInvoice', JSON.stringify(invoiceData));
    }, [invoiceData]);

    const processFileAsync = (fileOrText) => new Promise((resolve) => {
        parseTakealotCsv(fileOrText,
            (res) => resolve({ success: true, result: res, error: null }),
            (err) => resolve({ success: false, result: null, error: err })
        );
    });

    const processBulkFiles = async (files) => {
        const fileArray = Array.from(files);
        let newRecords = [];
        let baseTimestamp = Date.now();

        const batchId = `Batch_${baseTimestamp}_${Math.random().toString(36).substring(7)}`;

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const fileOrText = file.content !== undefined ? file.content : file;
            const fileName = file.name || "Upload.csv";

            const { success, result, error } = await processFileAsync(fileOrText);

            let status = 'Invalid Format';
            const recordTimestamp = baseTimestamp + i;
            let mappedRecord = {
                id: recordTimestamp + Math.random().toString(36).substring(7),
                batchId,
                timestamp: recordTimestamp,
                filename: fileName,
                status: 'Invalid Format',
                reconPeriod: null,
                totalRows: 0,
                claimableItems: 0,
                stats: { totalClaimValue: 0 }
            };

            if (success && result) {
                const claimableItems = result.data.filter(row => row._numericClaim > 0);
                const isClaimable = result.stats?.totalClaimValue > 0;

                if (result.emptyDataFormat) status = 'No Data';
                else if (isClaimable) status = 'Claimable';
                else status = 'No Claim';

                let period = 'Unknown';
                if (result.matchedColumns?.period && claimableItems.length > 0) {
                    period = claimableItems[0][result.matchedColumns.period];
                } else if (result.matchedColumns?.period && result.data.length > 0) {
                    period = result.data[0][result.matchedColumns.period];
                }

                mappedRecord = {
                    ...mappedRecord,
                    status,
                    reconPeriod: period,
                    totalRows: result.data.length,
                    claimableItems: claimableItems.length,
                    stats: result.stats,
                    parsedState: result
                };
            }
            newRecords.push(mappedRecord);
        }

        const batchStats = {
            total: newRecords.length,
            claimable: newRecords.filter(r => r.status === 'Claimable').length,
            noClaim: newRecords.filter(r => r.status === 'No Claim').length,
            noData: newRecords.filter(r => r.status === 'No Data').length,
            invalid: newRecords.filter(r => r.status === 'Invalid Format').length,
            totalValue: newRecords.reduce((acc, r) => acc + (r.stats?.totalClaimValue || 0), 0)
        };

        const newBatch = {
            id: batchId,
            createdAt: baseTimestamp,
            records: newRecords,
            stats: batchStats
        };

        setBulkBatches(prev => [newBatch, ...prev]);
    };

    const handleDeleteBulkRecord = (id, batchId) => {
        setBulkBatches(prev => prev.map(batch => {
            if (batch.id !== batchId) return batch;
            const updatedRecords = batch.records.filter(r => r.id !== id);
            const updatedStats = {
                total: updatedRecords.length,
                claimable: updatedRecords.filter(r => r.status === 'Claimable').length,
                noClaim: updatedRecords.filter(r => r.status === 'No Claim').length,
                noData: updatedRecords.filter(r => r.status === 'No Data').length,
                invalid: updatedRecords.filter(r => r.status === 'Invalid Format').length,
                totalValue: updatedRecords.reduce((acc, r) => acc + (r.stats?.totalClaimValue || 0), 0)
            };
            return { ...batch, records: updatedRecords, stats: updatedStats };
        }).filter(batch => batch.records.length > 0));
    };

    const handleDeleteBatch = (batchId) => {
        setBulkBatches(prev => prev.filter(b => b.id !== batchId));
    };

    const handleStartClaimFromBulk = (record) => {
        setFilename(record.filename);
        setParsedState(record.parsedState);
        setErrorState(null);
        setInvoiceData(prev => ({
            ...prev,
            invoiceNumber: generateInvoiceNumber(),
            invoiceDate: new Date().toISOString().split('T')[0]
        }));
        setCurrentStep(2);
    };

    const processFile = (fileOrText, name) => {
        setErrorState(null);
        setParsedState(null);
        setFilename(name);

        parseTakealotCsv(
            fileOrText,
            (result) => {
                setParsedState(result);
                if (result) {
                    setInvoiceData(prev => ({
                        ...prev,
                        invoiceNumber: generateInvoiceNumber(),
                        invoiceDate: new Date().toISOString().split('T')[0]
                    }));
                    if (result.emptyDataFormat) {
                        setModalStatus('No Data');
                    } else if (result.stats?.totalClaimValue > 0) {
                        setModalStatus('Claimable');
                    } else {
                        setModalStatus('No Claim');
                    }
                    setShowClaimModal(true);
                }
            },
            (err) => {
                setErrorState(err);
                setModalStatus('Invalid Format');
                setShowClaimModal(true);
            }
        );
    };

    const handleUseSample = () => {
        processFile(sampleCsvData, "Sample_Takealot_Data.csv");
    };

    const handleFileSelect = (files) => {
        if (uploadMode === 'bulk') {
            processBulkFiles(Array.isArray(files) ? files : [files]);
        } else {
            processFile(files, files.name);
        }
    };

    const handleUseSampleBulk = () => {
        const sampleFiles = [
            { name: 'Sample_Claimable_A.csv', content: sampleCsvData },
            { name: 'Sample_Claimable_B.csv', content: sampleCsvData }
        ];
        processBulkFiles(sampleFiles);
    };

    const Badge = ({ active, label }) => {
        if (active) {
            return (
                <div className="flex items-center px-3 py-1.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0]/60 transition-all shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-[#22c55e] mr-1.5" strokeWidth={2.5} />
                    <span className="text-[12px] font-semibold text-[#166534]">{label}</span>
                </div>
            );
        }
        return (
            <div className="flex items-center px-3 py-1.5 rounded-lg bg-[#f5f5f7] border border-[#e5e5ea] opacity-60">
                <span className="w-3.5 h-3.5 rounded-full border border-[#d2d2d7] mr-1.5"></span>
                <span className="text-[12px] font-medium text-[#86868b]">{label}</span>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 selection:bg-[#4f86f7]/20 selection:text-[#4f86f7]">
            <ProgressBar currentStep={currentStep} />

            <div className="mt-8">

                {/* STEP 1 */}
                {currentStep === 1 && (
                    <div className="animate-in fade-in duration-500">

                        {/* Mode Selector */}
                        <div className="flex justify-center mb-8 sm:mb-10">
                            <div className="bg-[#e5e5ea] p-1.5 rounded-xl flex space-x-1 shadow-inner">
                                <button
                                    onClick={() => { setUploadMode('single'); setParsedState(null); setErrorState(null); }}
                                    className={`px-4 sm:px-8 py-3 rounded-lg font-semibold text-[14px] flex items-center transition-all duration-300 ${uploadMode === 'single' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
                                >
                                    <FileDigit size={18} className="mr-2" /> Single File
                                </button>
                                <button
                                    onClick={() => { setUploadMode('bulk'); setParsedState(null); setErrorState(null); }}
                                    className={`px-4 sm:px-8 py-3 rounded-lg font-semibold text-[14px] flex items-center transition-all duration-300 ${uploadMode === 'bulk' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
                                >
                                    <Layers size={18} className="mr-2" /> Bulk Scanner
                                </button>
                                <button
                                    onClick={() => setShowAmendModal(true)}
                                    className="px-4 sm:px-8 py-3 rounded-lg font-semibold text-[14px] flex items-center transition-all duration-300 text-[#4f86f7] hover:bg-white hover:shadow-sm"
                                >
                                    <FileEdit size={18} className="mr-2" /> Amend Invoice
                                </button>
                            </div>
                        </div>

                        <UploadArea
                            onFileSelect={handleFileSelect}
                            onUseSample={uploadMode === 'bulk' ? handleUseSampleBulk : handleUseSample}
                            allowMultiple={uploadMode === 'bulk'}
                        />

                        {/* Bulk Mode View */}
                        {uploadMode === 'bulk' && (
                            <BulkResultsTable
                                batches={bulkBatches}
                                onStartClaim={handleStartClaimFromBulk}
                                onDeleteRecord={handleDeleteBulkRecord}
                                onDeleteBatch={handleDeleteBatch}
                            />
                        )}

                        {/* Single Mode Success Parsed View */}
                        {uploadMode === 'single' && parsedState && !errorState && !parsedState.emptyDataFormat && (
                            <div className="space-y-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="rounded-3xl bg-white p-6 md:px-8 md:py-6 border border-[#e5e5ea] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center">
                                        <div className="bg-[#34c759]/10 p-2.5 rounded-full mr-5">
                                            <CheckCircle className="h-6 w-6 text-[#34c759]" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-[#1d1d1f] tracking-tight">File parsed successfully</h3>
                                            <p className="text-[13px] text-[#6e6e73] mt-0.5">
                                                <span className="font-medium text-[#1d1d1f]">{filename}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {!parsedState.matchedColumns?.claimValue && (
                                    <div className="rounded-3xl bg-[#fffbf0] p-6 border border-[#ffe5b4] shadow-sm flex items-start">
                                        <AlertTriangle className="h-6 w-6 text-[#ff9500] mt-0.5 mr-4 flex-shrink-0" strokeWidth={2} />
                                        <div>
                                            <h3 className="text-[15px] font-semibold text-[#8a5200]">Claim column missing</h3>
                                            <p className="text-[13px] text-[#8a5200]/80 mt-1">
                                                Claim totals may be inaccurate or display as zero because we could not automatically map a claim value column.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#e5e5ea] px-8 py-7">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-wider mb-1">Detected Fields</h3>
                                            <p className="text-xs text-[#86868b]">We found the following critical data columns in your file.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2.5">
                                            <Badge active={!!parsedState.matchedColumns?.claimValue}    label="Claim Value" />
                                            <Badge active={!!parsedState.matchedColumns?.productTitle}  label="Product Title" />
                                            <Badge active={!!parsedState.matchedColumns?.tsin}          label="TSIN" />
                                            <Badge active={!!parsedState.matchedColumns?.sku}           label="SKU" />
                                            <Badge active={!!parsedState.matchedColumns?.period}        label="Period" />
                                        </div>
                                    </div>
                                </div>

                                <SummaryCards stats={parsedState.stats} />

                                <LateFeeEstimator
                                    parsedData={parsedState.data}
                                    matchedColumns={parsedState.matchedColumns}
                                    stats={parsedState.stats}
                                />

                                <div id="flagged-claims-section">
                                    <FlaggedClaims data={parsedState.data} matchedColumns={parsedState.matchedColumns} />
                                </div>

                                <DataTablePreview data={parsedState.data} headers={parsedState.headers || []} matchedColumns={parsedState.matchedColumns} />

                                <div className="mt-8 mb-12 sm:mb-16 flex justify-center sm:justify-end animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="w-full sm:w-auto bg-[#4f86f7] hover:bg-[#3b6bd6] text-white font-medium py-4 px-10 rounded-full shadow-[0_8px_24px_rgba(79,134,247,0.3)] transition-all duration-300 active:scale-95 flex items-center justify-center group"
                                    >
                                        <span className="text-[15px]">Continue to Edit Invoice</span>
                                        <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        <ClaimModal
                            isOpen={showClaimModal}
                            onClose={() => setShowClaimModal(false)}
                            stats={parsedState?.stats}
                            status={modalStatus}
                            error={errorState}
                            onContinue={() => {
                                setShowClaimModal(false);
                                setCurrentStep(2);
                            }}
                            onReview={() => {
                                setShowClaimModal(false);
                                const el = document.getElementById('flagged-claims-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                        />
                    </div>
                )}

                {/* STEP 2 */}
                {currentStep === 2 && (
                    <EditInvoiceForm
                        data={invoiceData}
                        onChange={setInvoiceData}
                        onBack={() => setCurrentStep(1)}
                        onContinue={() => setCurrentStep(3)}
                    />
                )}

                {/* STEP 3 */}
                {currentStep === 3 && (
                    <InvoicePreview
                        invoiceData={invoiceData}
                        parsedData={parsedState?.data}
                        matchedColumns={parsedState?.matchedColumns}
                        stats={parsedState?.stats}
                        filename={filename}
                        onBack={() => setCurrentStep(2)}
                        onContinue={() => setCurrentStep(4)}
                    />
                )}

                {/* STEP 4 */}
                {currentStep === 4 && (
                    <SubmitHelper
                        invoiceData={invoiceData}
                        parsedData={parsedState?.data}
                        matchedColumns={parsedState?.matchedColumns}
                        stats={parsedState?.stats}
                        filename={filename}
                        onBack={() => setCurrentStep(3)}
                        onFinish={() => {
                            setCurrentStep(1);
                            setParsedState(null);
                        }}
                    />
                )}

                <AmendInvoiceModal 
                    isOpen={showAmendModal} 
                    onClose={() => setShowAmendModal(false)} 
                />

            </div>
        </div>
    );
}
