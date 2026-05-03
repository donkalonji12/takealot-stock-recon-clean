import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Calendar, Clock, Info } from 'lucide-react';
import {
    estimateReportAvailabilityDate,
    calculateLateFee,
    RECOMMENDATION_META,
} from '../../utils/lateFeeCalculator';

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
};

const fmtDate = (date) => {
    if (!date || isNaN(date)) return '—';
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, subtext, tone }) {
    const tones = {
        neutral: 'bg-[#f9fafb] border-[#f0f0f0] text-[#1d1d1f]',
        good:    'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]',
        warn:    'bg-[#fffbeb] border-[#fde68a] text-[#92400e]',
        danger:  'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]',
    };
    return (
        <div className={`rounded-2xl border px-5 py-4 flex flex-col justify-between ${tones[tone] || tones.neutral}`}>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#86868b] mb-2 leading-tight">{label}</p>
            <p className="text-[19px] font-semibold tracking-tight leading-snug">{value}</p>
            {subtext && <p className="text-[11px] mt-1.5 opacity-60 font-medium">{subtext}</p>}
        </div>
    );
}

function CalcRow({ label, value, highlight }) {
    return (
        <div className={`flex items-center justify-between py-2.5 border-b border-[#f3f4f6] last:border-0 ${highlight ? 'font-semibold' : ''}`}>
            <span className={`text-[13px] ${highlight ? 'text-[#1d1d1f] font-semibold' : 'text-[#4b5563] font-medium'}`}>{label}</span>
            <span className={`text-[13px] tabular-nums ${highlight ? 'text-[#1d1d1f] font-semibold' : 'text-[#374151] font-semibold'}`}>{value}</span>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LateFeeEstimator({ parsedData, matchedColumns, stats }) {
    const [overrideDate, setOverrideDate] = useState('');

    // Derive the recon period from the first claimable row in parsed data
    const reconPeriod = useMemo(() => {
        if (!parsedData || !matchedColumns?.period) return null;
        const claimable = parsedData.filter(r => (r._numericClaim || 0) > 0);
        const row = claimable.length > 0 ? claimable[0] : parsedData[0];
        return row ? row[matchedColumns.period] : null;
    }, [parsedData, matchedColumns]);

    // Auto-estimated report availability date (1st of month after recon period)
    const autoDate = useMemo(() => estimateReportAvailabilityDate(reconPeriod), [reconPeriod]);

    // Effective date: manual override takes precedence over auto-estimate
    const effectiveDate = useMemo(() => {
        if (overrideDate) {
            const d = new Date(overrideDate + 'T00:00:00');
            return isNaN(d) ? autoDate : d;
        }
        return autoDate;
    }, [overrideDate, autoDate]);

    const isManualOverride = Boolean(overrideDate);
    const claimValue = stats?.totalClaimValue || 0;

    // Full fee calculation
    const feeData = useMemo(
        () => calculateLateFee(effectiveDate, claimValue),
        [effectiveDate, claimValue]
    );

    const rec = RECOMMENDATION_META[feeData.recommendation];
    const RecIcon = feeData.recommendation === 'worth_submitting' ? CheckCircle
                  : feeData.recommendation === 'low_value'        ? AlertTriangle
                  : XCircle;

    const netTone  = feeData.netClaimValue <= 0 ? 'danger' : feeData.netClaimValue < 500 ? 'warn' : 'good';
    const feeTone  = feeData.totalFee > 0 ? 'warn' : 'good';
    const lateTone = feeData.monthsLate > 0 ? 'warn' : 'good';

    const today = new Date();

    return (
        <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-[#e5e5ea] px-8 py-7 space-y-7">

            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-[#fffbeb] rounded-xl mt-0.5 shrink-0">
                        <Clock size={20} className="text-[#f59e0b]" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight mb-1">
                            Late Fee Estimator
                        </h3>
                        <p className="text-[13px] text-[#6e6e73] max-w-[500px]">
                            Takealot charges <strong className="text-[#1d1d1f]">R200 per full calendar month</strong> (+ 15% VAT) for invoices submitted more than 30 days after the stock report becomes available.
                            Partial months are not charged.
                        </p>
                    </div>
                </div>

                {/* ── Manual Override ── */}
                <div className="flex flex-col gap-2 shrink-0">
                    <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-widest">
                        Override Report Date
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={overrideDate}
                            onChange={e => setOverrideDate(e.target.value)}
                            className="border border-[#d2d2d7] rounded-xl px-3 py-2 text-[13px] font-medium outline-none shadow-sm focus:border-[#4f86f7] bg-[#fbfbfd] hover:bg-white transition-colors"
                        />
                        {isManualOverride && (
                            <button
                                onClick={() => setOverrideDate('')}
                                className="text-[12px] font-semibold text-[#4f86f7] hover:underline whitespace-nowrap"
                            >
                                Use Estimate
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] text-[#9ca3af]">
                        {isManualOverride
                            ? 'Using manually entered date'
                            : 'Using estimated date (1st of following month)'}
                    </p>
                </div>
            </div>

            {/* ── Calculation Breakdown ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Left: Date timeline */}
                <div className="bg-[#f9fafb] rounded-2xl border border-[#f0f0f0] px-6 py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar size={15} className="text-[#6b7280]" />
                        <p className="text-[12px] font-medium text-[#374151] uppercase tracking-widest">Date Timeline</p>
                    </div>
                    <div>
                        <CalcRow
                            label={`Stock Report Available${!isManualOverride ? ' (estimated)' : ' (manual)'}`}
                            value={fmtDate(effectiveDate)}
                        />
                        <CalcRow
                            label="Grace Period End  (+30 days)"
                            value={fmtDate(feeData.graceEndDate)}
                        />
                        <CalcRow
                            label="Calculation Date (today)"
                            value={fmtDate(today)}
                        />
                        <CalcRow
                            label="Status"
                            value={
                                !feeData.graceEndDate ? 'Unknown'
                                : today <= feeData.graceEndDate ? '✓ Within grace period'
                                : feeData.monthsLate === 0 ? '⚠ Past grace — no full month yet'
                                : `✗ ${feeData.monthsLate} full month${feeData.monthsLate !== 1 ? 's' : ''} late`
                            }
                            highlight
                        />
                    </div>
                </div>

                {/* Right: Fee formula */}
                <div className="bg-[#f9fafb] rounded-2xl border border-[#f0f0f0] px-6 py-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Info size={15} className="text-[#6b7280]" />
                        <p className="text-[12px] font-medium text-[#374151] uppercase tracking-widest">Fee Calculation</p>
                    </div>
                    <div>
                        <CalcRow
                            label="Full Months Late"
                            value={feeData.monthsLate === 0 ? '0 (no fee)' : `${feeData.monthsLate}`}
                        />
                        <CalcRow
                            label={`Admin Fee  (${feeData.monthsLate} × R200)`}
                            value={fmt(feeData.adminFee)}
                        />
                        <CalcRow
                            label="VAT on Admin Fee  (15%)"
                            value={fmt(feeData.vatOnFee)}
                        />
                        <CalcRow
                            label="Total Fee  (Admin + VAT)"
                            value={fmt(feeData.totalFee)}
                            highlight
                        />
                    </div>
                </div>
            </div>

            {/* ── Summary Metrics ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Claim Value"
                    value={fmt(claimValue)}
                    tone="neutral"
                />
                <MetricCard
                    label="Full Months Late"
                    value={feeData.monthsLate === 0 ? '0' : `${feeData.monthsLate}`}
                    subtext={feeData.monthsLate > 0 ? `${feeData.monthsLate} × R200 = R${feeData.adminFee}` : 'No full months elapsed'}
                    tone={lateTone}
                />
                <MetricCard
                    label="Total Late Fee (incl. VAT)"
                    value={feeData.totalFee > 0 ? fmt(feeData.totalFee) : 'None'}
                    subtext={
                        feeData.totalFee > 0
                            ? `${fmt(feeData.adminFee)} + ${fmt(feeData.vatOnFee)} VAT`
                            : 'No fee applies'
                    }
                    tone={feeTone}
                />
                <MetricCard
                    label="Est. Net Claim"
                    value={fmt(feeData.netClaimValue)}
                    subtext={feeData.totalFee > 0 ? `After ${fmt(feeData.totalFee)} deduction` : 'Full claim retained'}
                    tone={netTone}
                />
            </div>

            {/* ── Recommendation banner ── */}
            <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${rec.bg}`}>
                <RecIcon size={20} className={`${rec.color} mt-0.5 shrink-0`} />
                <div>
                    <p className={`text-[14px] font-semibold ${rec.color}`}>{rec.label}</p>
                    <p className="text-[12px] text-[#6e6e73] mt-0.5">
                        {feeData.recommendation === 'worth_submitting' && feeData.isLate &&
                            `Net claim of ${fmt(feeData.netClaimValue)} after ${fmt(feeData.totalFee)} in fees is still worthwhile. Proceed with submission.`}
                        {feeData.recommendation === 'worth_submitting' && !feeData.isLate && feeData.graceEndDate &&
                            `No full late months have elapsed — no fee applies. Full ${fmt(claimValue)} is recoverable.`}
                        {feeData.recommendation === 'low_value' &&
                            `Net claim of ${fmt(feeData.netClaimValue)} is marginal after the ${fmt(feeData.totalFee)} late fee. Review whether the effort is justified.`}
                        {feeData.recommendation === 'not_worth' &&
                            `The ${fmt(feeData.totalFee)} late fee exceeds the ${fmt(claimValue)} claim value. Submitting would result in a net loss.`}
                        {!feeData.graceEndDate &&
                            'Report date could not be estimated. Set the report availability date above to calculate the fee.'}
                    </p>
                </div>
            </div>

        </div>
    );
}
