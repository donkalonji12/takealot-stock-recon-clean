import Papa from 'papaparse';

export const parseNumberSafe = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
}

export const parseTakealotCsv = (fileOrtxt, onComplete, onError) => {
    Papa.parse(fileOrtxt, {
        skipEmptyLines: true,
        complete: (results) => {
            const allRows = results.data;
            if (allRows.length < 2) {
                onError("No valid data found in the CSV file");
                return;
            }

            const rawHeaders = allRows[0];
            const headers = rawHeaders.map(h => h ? h.trim() : '');
            const dataRows = allRows.slice(2);

            // Validate headers
            const columnAliases = {
                claimValue: ['total_claim_value', 'claim value', 'claim', 'value'],
                productTitle: ['product_title', 'title', 'description', 'product'],
                tsin: ['tsin_id', 'tsin'],
                sku: ['sku', 'merchant sku'],
                period: ['period']
            };

            const matchedColumns = {
                claimValue: null,
                productTitle: null,
                tsin: null,
                sku: null,
                period: null
            };

            const headerLowerTrimmed = headers.map(h => h.toLowerCase().trim());

            const findMatch = (aliases) => {
                for (const alias of aliases) {
                    const index = headerLowerTrimmed.findIndex(h => h === alias || h.replace(/\s+/g, '_') === alias.replace(/\s+/g, '_'));
                    if (index !== -1) return headers[index];
                }
                for (const alias of aliases) {
                    const index = headerLowerTrimmed.findIndex(h => h.includes(alias));
                    if (index !== -1) return headers[index];
                }
                return null;
            };

            matchedColumns.claimValue = findMatch(columnAliases.claimValue);
            matchedColumns.productTitle = findMatch(columnAliases.productTitle);
            matchedColumns.tsin = findMatch(columnAliases.tsin);
            matchedColumns.sku = findMatch(columnAliases.sku);
            matchedColumns.period = findMatch(columnAliases.period);

            // We consider it a "valid format" if we found at least one logical header mapping
            const hasValidFormat = Object.values(matchedColumns).some(v => v !== null);

            if (!hasValidFormat) {
                onError("No valid data found in the CSV file");
                return;
            }

            // Safe formatting check -- if no data rows exist, fail gracefully with info
            if (allRows.length === 2 || dataRows.length === 0) {
                onComplete({
                    data: [],
                    headers,
                    matchedColumns,
                    emptyDataFormat: true,
                    stats: {
                        totalRows: 0,
                        rowsWithOutflow: 0,
                        totalClaimValue: 0
                    }
                });
                return;
            }

            const parsedData = dataRows.map(row => {
                const rowObj = {};
                headers.forEach((h, i) => {
                    if (h) {
                        rowObj[h] = row[i] ? String(row[i]).trim() : '';
                    }
                });
                return rowObj;
            });

            // Calculations
            let totalClaimValue = 0;
            let rowsWithOutflow = 0;
            const claimValKey = matchedColumns.claimValue;

            const enrichedData = parsedData.map(row => {
                let numericClaim = 0;
                if (claimValKey) {
                    numericClaim = parseNumberSafe(row[claimValKey]);
                    if (numericClaim > 0) {
                        rowsWithOutflow++;
                    }
                    totalClaimValue += numericClaim;
                }
                return {
                    ...row,
                    _numericClaim: numericClaim
                };
            });

            onComplete({
                data: enrichedData,
                headers,
                matchedColumns,
                stats: {
                    totalRows: enrichedData.length,
                    rowsWithOutflow,
                    totalClaimValue
                }
            });
        },
        error: (err) => {
            onError("Error parsing CSV: " + err.message);
        }
    });
};
