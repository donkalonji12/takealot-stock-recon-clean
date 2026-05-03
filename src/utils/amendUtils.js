/**
 * Creates a structured snapshot of the amendment for historical tracking and JSON export.
 */
export const createAmendedSnapshot = (originalData, amendedData, reason) => {
    return {
        metadata: {
            amendedFromInvoiceNumber: originalData.invoiceNumber || 'Unknown',
            amendedAt: new Date().toISOString(),
            amendmentReason: reason || 'General correction',
            version: '1.0'
        },
        original: { ...originalData },
        amended: { ...amendedData },
        changes: getChangedFields(originalData, amendedData)
    };
};

/**
 * Identifies which fields were changed between original and amended versions.
 */
export const getChangedFields = (original, amended) => {
    const changes = {};
    const relevantKeys = [
        'invoiceNumber', 'invoiceDate', 'businessName', 'registrationNumber',
        'sellerAccountName', 'sellerId', 'vatStatus', 'taxReferenceNumber',
        'street', 'city', 'province', 'postalCode', 'country', 'notes',
        'subtotal', 'vatAmount', 'totalAmount'
    ];

    relevantKeys.forEach(key => {
        if (original[key] !== amended[key]) {
            changes[key] = {
                from: original[key],
                to: amended[key]
            };
        }
    });

    return changes;
};

/**
 * Triggers a browser download of the amendment snapshot as a JSON file.
 */
export const downloadSnapshotJson = (snapshot) => {
    try {
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().getTime();
        
        a.href = url;
        a.download = `amendment_snapshot_${snapshot.metadata.amendedFromInvoiceNumber}_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to download JSON snapshot:', error);
    }
};

/**
 * Formats a key name into a human-readable label (e.g., taxReferenceNumber -> Tax Reference Number)
 */
export const formatFieldLabel = (key) => {
    const labels = {
        invoiceNumber: 'Invoice Number',
        invoiceDate: 'Invoice Date',
        businessName: 'Business Name',
        registrationNumber: 'Registration Number',
        sellerAccountName: 'Seller Account Name',
        sellerId: 'Seller ID',
        vatStatus: 'VAT Status',
        taxReferenceNumber: 'Tax Reference / VAT Number',
        street: 'Street Address',
        city: 'City',
        province: 'Province',
        postalCode: 'Postal Code',
        country: 'Country',
        notes: 'Notes / Footer',
        subtotal: 'Subtotal Amount',
        vatAmount: 'VAT Amount',
        totalAmount: 'Total Amount'
    };
    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
};
