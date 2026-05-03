import * as pdfjs from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Use Vite's native URL import for the worker for better compatibility
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

/**
 * Extracts text from a PDF file and attempts to parse it into structured invoice fields.
 * Includes an OCR fallback for image-based PDFs.
 * @param {File} file - The PDF file object
 * @param {Function} onStatusUpdate - Callback for progress messages
 * @returns {Promise<Object>} - Parsed invoice data and raw text
 */
export const extractInvoiceData = async (file, onStatusUpdate) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Use Uint8Array to prevent some detachment oddities in different environments
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        let fullText = '';
        let isImageBased = false;

        if (onStatusUpdate) onStatusUpdate('Reading text layers...');

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        // If very little text is found, it's likely an image-based PDF
        if (fullText.trim().length < 50) {
            isImageBased = true;
            if (onStatusUpdate) onStatusUpdate('Image-based PDF detected. Initializing OCR engine...');
            // Pass the pdf object directly to avoid re-opening the detached buffer
            fullText = await runOcrOnPdf(pdf, onStatusUpdate);
        }

        const parsedData = parseTextToInvoiceData(fullText);
        return {
            success: true,
            data: parsedData,
            rawText: fullText,
            isImageBased
        };
    } catch (error) {
        console.error('PDF extraction failed:', error);
        return {
            success: false,
            error: `Failed to parse PDF: ${error.message || 'Unknown error. The file might be corrupted or protected.'}`,
            data: null
        };
    }
};

/**
 * Renders PDF pages from an existing PDF document object to canvases and runs Tesseract OCR.
 */
const runOcrOnPdf = async (pdf, onStatusUpdate) => {
    let ocrText = '';
    
    if (onStatusUpdate) onStatusUpdate('Scanning document pages (OCR)...');
    
    const worker = await createWorker('eng', 1, {
        logger: m => {
            if (m.status === 'recognizing text' && onStatusUpdate) {
                const progress = Math.round(m.progress * 100);
                onStatusUpdate(`Performing OCR: ${progress}%`);
            }
        }
    });

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR accuracy
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        
        const { data: { text } } = await worker.recognize(canvas);
        ocrText += text + '\n';
    }

    await worker.terminate();
    return ocrText;
};

/**
 * Helper to parse raw text into structured fields using regex patterns.
 * Optimized for the app's own generated invoice layout and OCR noise.
 */
const parseTextToInvoiceData = (text) => {
    const data = {};

    // Helper to clean OCR noise from numbers
    const cleanNum = (str) => {
        if (!str) return '';
        // Remove R, spaces, commas, etc.
        const cleaned = str.replace(/[RS,\s]/gi, '').replace('..', '.');
        return cleaned;
    };

    // Invoice Number (e.g., INV-20240421-1234)
    const invMatch = text.match(/INV-[\d-]+/i);
    if (invMatch) data.invoiceNumber = invMatch[0];

    // Date (supports YYYY/MM/DD and YYYY-MM-DD)
    const dateMatch = text.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
    if (dateMatch) data.invoiceDate = dateMatch[0].replace(/\//g, '-');

    // VAT/Tax Number (Takealot format is 10 digits)
    const vatMatch = text.match(/VAT:?\s*(\d{10})/i) || text.match(/Tax Ref:?\s*(\d{10})/i) || text.match(/4480252119/);
    if (vatMatch) data.taxReferenceNumber = Array.isArray(vatMatch) ? vatMatch[1] || vatMatch[0] : vatMatch;
    if (vatMatch) data.vatStatus = 'VAT Registered';

    // Registration Number
    const regMatch = text.match(/Reg(?: No)?:?\s*([\d/]{10,15})/i);
    if (regMatch) data.registrationNumber = regMatch[1];

    // Seller ID
    const sellerIdMatch = text.match(/Seller ID:?\s*(\d+)/i);
    if (sellerIdMatch) data.sellerId = sellerIdMatch[1];

    // Totals
    const subtotalMatch = text.match(/Subtotal\s*R?\s*([\d,.]+)/i);
    if (subtotalMatch) data.subtotal = cleanNum(subtotalMatch[1]);

    const vatAmountMatch = text.match(/VAT Total\s*\(15%\)\s*R?\s*([\d,.]+)/i) || text.match(/VAT Amount\s*R?\s*([\d,.]+)/i);
    if (vatAmountMatch) data.vatAmount = cleanNum(vatAmountMatch[1]);

    const totalMatch = text.match(/Total Due\s*R?\s*([\d,.]+)/i) || text.match(/Total\s*R?\s*([\d,.]+)/i) || text.match(/Total Due\s*R?\s*([\d,.]+)/i);
    if (totalMatch) data.totalAmount = cleanNum(totalMatch[1]);

    // Recon Period
    const periodMatch = text.match(/Recon Period:?\s*([A-Za-z\s\d,]+)/i);
    if (periodMatch) data.reconPeriod = periodMatch[1].trim();

    // Notes (look for notes or footer text)
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
        data.businessName = lines[0].trim();
    }

    return data;
};
