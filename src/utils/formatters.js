/**
 * Formats a recon period string or number (YYYYMM) into a human-readable format.
 * Example: 202508 -> August 2025
 * 
 * @param {string|number} period - The recon period in YYYYMM format.
 * @returns {string} - The formatted period or a fallback value.
 */
export const formatReconPeriod = (period) => {
    if (!period) return "-";
    
    const str = String(period).trim();
    if (str.length !== 6) return str;

    const year = str.substring(0, 4);
    const monthStr = str.substring(4, 6);
    const monthNum = parseInt(monthStr, 10);
    
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return str;
    
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    
    return `${months[monthNum - 1]} ${year}`;
};
