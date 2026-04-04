/**
 * Takealot Stock Loss Claim — Late Administrative Fee Estimator
 *
 * Rules:
 *  - Stock report is assumed available at the start of the month following the recon period.
 *    Example: recon period "202407" → available from 2024-08-01.
 *  - First 30 days after report availability: free (grace period).
 *  - After 30 days: R200 excl. VAT admin fee per full calendar month late.
 *    Partial months are NOT charged.
 *  - VAT of 15% is added on top of the admin fee.
 *  - Net Claim Value = Claim Value − (Admin Fee + VAT on Fee).
 */

const ADMIN_FEE_PER_MONTH = 200; // ZAR, excl. VAT
const VAT_RATE = 0.15;
const GRACE_DAYS = 30;

/** Returns a new Date exactly N calendar days after the given date. */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Counts the number of FULL calendar months elapsed between two dates.
 * A month is only counted once the day-of-month in `end` has reached
 * or passed the corresponding day-of-month in `start`.
 *
 * Examples:
 *   Oct 1 → Apr 4  = 6  (Oct→Nov→Dec→Jan→Feb→Mar are complete; Apr 4 ≥ Oct 1 day)
 *   Mar 3 → Apr 4  = 1  (Apr 4 ≥ Mar 3: the month Mar→Apr is complete)
 *   Mar 31→ Apr 4  = 0  (Apr 4 < Mar 31: the month Mar→Apr is NOT yet complete)
 */
function calendarMonthsBetween(start, end) {
    let months =
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) months--;
    return Math.max(0, months);
}

/**
 * Estimates the date a Takealot stock report becomes available on Seller Portal.
 * Assumes: report is available from the 1st of the month after the recon period.
 *
 * @param {string|number} reconPeriod - YYYYMM format (e.g. "202407")
 * @returns {Date|null}
 */
export function estimateReportAvailabilityDate(reconPeriod) {
    if (!reconPeriod) return null;
    const str = String(reconPeriod).trim();
    if (str.length !== 6) return null;

    const year  = parseInt(str.substring(0, 4), 10);
    const month = parseInt(str.substring(4, 6), 10); // 1-indexed
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear  = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 1); // midnight local, first of following month
}

/**
 * Calculates the Takealot late administrative fee for a stock loss claim.
 *
 * PARTIAL MONTHS ARE NOT CHARGED.
 * A claim submitted any time before one full calendar month has elapsed
 * after the grace period ends will have monthsLate = 0 and totalFee = 0.
 *
 * @param {Date|null} reportAvailableDate - When the stock report became available
 * @param {number}    claimValue          - Gross claim value (excl. seller VAT)
 * @param {Date}      [submissionDate]    - Defaults to today
 * @returns {{
 *   reportAvailableDate: Date|null,
 *   graceEndDate:        Date|null,
 *   monthsLate:          number,
 *   adminFee:            number,
 *   vatOnFee:            number,
 *   totalFee:            number,
 *   netClaimValue:       number,
 *   recommendation:      'worth_submitting'|'low_value'|'not_worth',
 *   isLate:              boolean
 * }}
 */
export function calculateLateFee(reportAvailableDate, claimValue, submissionDate = new Date()) {
    const safe = Number(claimValue) || 0;

    const graceEndDate = reportAvailableDate instanceof Date && !isNaN(reportAvailableDate)
        ? addDays(reportAvailableDate, GRACE_DAYS)
        : null;

    const empty = {
        reportAvailableDate: reportAvailableDate || null,
        graceEndDate,
        monthsLate: 0,
        adminFee: 0,
        vatOnFee: 0,
        totalFee: 0,
        netClaimValue: safe,
        recommendation: getRecommendation(safe),
        isLate: false,
    };

    if (!graceEndDate || safe <= 0) return empty;

    // Within grace period — no fee.
    if (submissionDate <= graceEndDate) return { ...empty };

    // Full calendar months elapsed since grace ended.
    // calendarMonthsBetween returns 0 for partial months — they are never charged.
    const monthsLate = calendarMonthsBetween(graceEndDate, submissionDate);

    const adminFee      = ADMIN_FEE_PER_MONTH * monthsLate;
    const vatOnFee      = Math.round(adminFee * VAT_RATE * 100) / 100;
    const totalFee      = adminFee + vatOnFee;
    const netClaimValue = safe - totalFee;

    return {
        reportAvailableDate,
        graceEndDate,
        monthsLate,
        adminFee,
        vatOnFee,
        totalFee,
        netClaimValue,
        recommendation: getRecommendation(netClaimValue),
        isLate: monthsLate > 0,
    };
}

function getRecommendation(netClaimValue) {
    if (netClaimValue <= 0) return 'not_worth';
    if (netClaimValue < 500) return 'low_value';
    return 'worth_submitting';
}

export const RECOMMENDATION_META = {
    worth_submitting: { label: 'Worth Submitting', short: 'Submit', color: 'text-[#166534]', bg: 'bg-[#f0fdf4] border-[#bbf7d0]' },
    low_value:        { label: 'Low Value',         short: 'Low',    color: 'text-[#92400e]', bg: 'bg-[#fffbeb] border-[#fde68a]' },
    not_worth:        { label: 'Not Worth It',       short: 'Skip',   color: 'text-[#991b1b]', bg: 'bg-[#fef2f2] border-[#fecaca]' },
};
