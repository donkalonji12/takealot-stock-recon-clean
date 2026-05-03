import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Tag,
    Search,
    BarChart2,
    Zap,
    AlertCircle,
    Loader2,
    RefreshCw,
    Save,
    Play,
    History,
    Users
} from 'lucide-react';

const BACKEND_BASE_URL = 'http://localhost:3000';

const MetricCard = ({ label, value, sub }) => (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] px-5 py-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#86868b] mb-2">{label}</p>
        <p className="text-[26px] font-semibold text-[#1d1d1f] leading-none tracking-tight">{value}</p>
        {sub && <p className="text-[11px] mt-1.5 text-[#9ca3af] font-medium">{sub}</p>}
    </div>
);

const FeatureRow = ({ icon: Icon, title, desc }) => (
    <div className="flex items-start gap-3 py-3.5 border-b border-[#f5f5f7] last:border-0">
        <div className="p-2 rounded-xl bg-[#f5f5f7] shrink-0 mt-0.5">
            <Icon size={15} className="text-[#6e6e73]" />
        </div>
        <div>
            <p className="text-[13.5px] font-semibold text-[#374151]">{title}</p>
            <p className="text-[12px] text-[#9ca3af] mt-0.5">{desc}</p>
        </div>
    </div>
);

function formatCurrency(value) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
}

function toNumberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function roundPrice(value) {
    return Math.round(Number(value) * 100) / 100;
}

function getUndercutStep(pricingMode, marketState) {
    if (marketState === 'none') return 0;

    if (pricingMode === 'aggressive') {
        if (marketState === 'high') return 3;
        if (marketState === 'medium') return 2;
        return 1;
    }

    if (pricingMode === 'conservative') {
        if (marketState === 'high') return 1;
        return 0;
    }

    if (marketState === 'high') return 2;
    if (marketState === 'medium') return 1;
    return 1;
}

function getNoCompetitorPremium(pricingMode) {
    if (pricingMode === 'aggressive') return 0;
    if (pricingMode === 'conservative') return 25;
    return 10;
}

function getStrategyLabel(benchmarkPrice, suggestedPrice, pricingMode = 'balanced', marketState = 'none') {
    const benchmark = toNumberOrNull(benchmarkPrice);
    const suggested = toNumberOrNull(suggestedPrice);

    if (marketState === 'none') return 'Premium Hold';
    if (benchmark === null || suggested === null) return 'Rule-based only';
    if (pricingMode === 'conservative') return 'Premium';
    if (suggested < benchmark) return 'Undercutting';
    if (suggested === benchmark) return 'Matching';
    return 'Premium';
}

function getSuggestion(
    currentPrice,
    costPrice,
    minPrice,
    maxPrice,
    targetMargin,
    benchmarkPrice,
    pricingMode = 'balanced',
    marketState = 'none'
) {
    const current = Number(currentPrice || 0);
    const cost = toNumberOrNull(costPrice);
    const min = toNumberOrNull(minPrice);
    const max = toNumberOrNull(maxPrice);
    const margin = toNumberOrNull(targetMargin);
    const benchmark = toNumberOrNull(benchmarkPrice);

    let suggestedPrice = current;
    let marginPercent = null;
    let status = 'Insufficient data';
    let targetPriceFromMargin = null;

    if (cost !== null && cost > 0) {
        marginPercent = current > 0 ? ((current - cost) / current) * 100 : null;

        if (margin !== null && margin >= 0 && margin < 100) {
            targetPriceFromMargin = cost / (1 - margin / 100);
        }
    }

    const floorCandidates = [];
    if (min !== null) floorCandidates.push(min);
    if (targetPriceFromMargin !== null) floorCandidates.push(targetPriceFromMargin);

    const protectedFloor = floorCandidates.length ? Math.max(...floorCandidates) : 0;

    if (marketState === 'none') {
        const premiumLift = getNoCompetitorPremium(pricingMode);
        const premiumBase =
            benchmark !== null
                ? benchmark + premiumLift
                : current > 0
                    ? current + premiumLift
                    : protectedFloor;

        suggestedPrice = Math.max(protectedFloor, premiumBase);
    } else {
        if (benchmark !== null) {
            const undercutStep = getUndercutStep(pricingMode, marketState);
            const benchmarkDriven =
                pricingMode === 'conservative' && marketState !== 'high'
                    ? benchmark
                    : benchmark - undercutStep;

            suggestedPrice = Math.max(protectedFloor, benchmarkDriven);
        } else {
            suggestedPrice = Math.max(protectedFloor, current);
        }
    }

    if (max !== null) {
        suggestedPrice = Math.min(suggestedPrice, max);
    }

    if (protectedFloor > 0) {
        suggestedPrice = Math.max(suggestedPrice, protectedFloor);
    }

    suggestedPrice = roundPrice(suggestedPrice);

    const strategy = getStrategyLabel(benchmark, suggestedPrice, pricingMode, marketState);

    if (min !== null && current < min) {
        status = 'Below minimum';
    } else if (max !== null && current > max) {
        status = 'Above maximum';
    } else if (marketState === 'none') {
        status = 'Premium hold';
    } else if (benchmark !== null && suggestedPrice < benchmark) {
        status = 'Competing';
    } else if (cost !== null && targetPriceFromMargin !== null && current < targetPriceFromMargin) {
        status = 'Underpriced';
    } else if (cost !== null && margin !== null && marginPercent !== null && marginPercent >= margin) {
        status = 'On target';
    } else if (cost !== null || min !== null || max !== null || benchmark !== null) {
        status = 'Review';
    }

    return {
        suggestedPrice,
        marginPercent,
        benchmarkPrice: benchmark,
        strategy,
        status,
        marketState
    };
}

function getRecommendedAction(item) {
    const gap = Number(item.priceGapToWinner || 0);
    const winnerPrice = item.winnerPrice;
    const competitorCount = item.estimatedCompetitorCount || item.competitorCount || 0;

    if (!competitorCount || !winnerPrice) {
        return {
            label: 'Hold / monitor',
            text: 'No competitor winner detected yet.',
            tone: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
        };
    }

    if (gap > 0) {
        return {
            label: 'Reduce to compete',
            text: `You are ${formatCurrency(gap)} above the winner.`,
            tone: 'bg-[#fff7ed] text-[#c2410c] border-[#fdba74]'
        };
    }

    if (gap < 0) {
        return {
            label: 'Protect margin',
            text: `You are ${formatCurrency(Math.abs(gap))} below the winner.`,
            tone: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]'
        };
    }

    return {
        label: 'Matching winner',
        text: 'You are matching the current winner.',
        tone: 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]'
    };
}

function explainPricingReason(reason) {
    const map = {
        change_too_small: 'Skipped because the price change was too small to safely apply.',
        missing_price_data: 'Skipped because price data is incomplete.',
        below_min_price: 'Skipped because the suggested price is below your minimum price.',
        above_max_price: 'Skipped because the suggested price is above your maximum price.',
        margin_floor_broken: 'Skipped because the target margin would be broken.',
        cooldown_active: 'Skipped because this offer is still in cooldown.',
        no_competitor_detected: 'Held price because no competitor was detected.',
        winner_price_detected: 'Used the winning competitor price as the benchmark.',
        benchmark_detected: 'Used benchmark price as the pricing reference.',
        safe_to_apply: 'Safe to apply based on your rules.'
    };

    return map[reason] || reason || 'No explanation available.';
}

function getReasonTone(reason) {
    if (['below_min_price', 'margin_floor_broken', 'above_max_price'].includes(reason)) {
        return 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]';
    }

    if (['change_too_small', 'cooldown_active'].includes(reason)) {
        return 'bg-[#fff7ed] text-[#c2410c] border-[#fdba74]';
    }

    if (['winner_price_detected', 'safe_to_apply'].includes(reason)) {
        return 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]';
    }

    return 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0]';
}

function StatusBadge({ status }) {
    const map = {
        'On target': 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
        'Underpriced': 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]',
        'Below minimum': 'bg-[#fff7ed] text-[#c2410c] border-[#fdba74]',
        'Above maximum': 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
        'Competing': 'bg-[#ecfeff] text-[#0f766e] border-[#a5f3fc]',
        'Premium hold': 'bg-[#faf5ff] text-[#7e22ce] border-[#e9d5ff]',
        'Review': 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]',
        'Insufficient data': 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]'
    };

    const cls = map[status] || map.Review;

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${cls}`}>
            {status}
        </span>
    );
}

function StrategyBadge({ strategy }) {
    const map = {
        'Undercutting': 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
        'Matching': 'bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]',
        'Premium': 'bg-[#fff7ed] text-[#c2410c] border-[#fdba74]',
        'Premium Hold': 'bg-[#faf5ff] text-[#7e22ce] border-[#e9d5ff]',
        'Rule-based only': 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]'
    };

    const cls = map[strategy] || map['Rule-based only'];

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${cls}`}>
            {strategy}
        </span>
    );
}

function MarketStateBadge({ state }) {
    const map = {
        none: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
        low: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]',
        medium: 'bg-[#fff7ed] text-[#c2410c] border-[#fdba74]',
        high: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
    };

    const cls = map[state] || 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]';

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold capitalize ${cls}`}>
            {state || 'unknown'}
        </span>
    );
}



function LogStatusBadge({ status }) {
    const map = {
        applied: 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]',
        skipped: 'bg-[#fff7ed] text-[#c2410c] border-[#fdba74]',
        failed: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]'
    };

    const cls = map[status] || 'bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]';

    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold capitalize ${cls}`}>
            {status || 'unknown'}
        </span>
    );
}

export default function PricingPage() {
    const [offers, setOffers] = useState([]);
    const [rules, setRules] = useState([]);
    const [logs, setLogs] = useState([]);
    const [draftRules, setDraftRules] = useState({});
    const [savingMap, setSavingMap] = useState({});
    const [applyingMap, setApplyingMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [runningAuto, setRunningAuto] = useState(false);
    const [generatingCompetitors, setGeneratingCompetitors] = useState(false);
    const [query, setQuery] = useState('');

    const [loadError, setLoadError] = useState(null);
    const [refreshError, setRefreshError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(null);
    const [applyError, setApplyError] = useState(null);
    const [applySuccess, setApplySuccess] = useState(null);
    const [autoError, setAutoError] = useState(null);
    const [autoResult, setAutoResult] = useState(null);

    const loadOffers = useCallback(async () => {
        const res = await fetch(`${BACKEND_BASE_URL}/api/offers`);
        const json = await res.json();

        if (!res.ok || !json?.success) {
            throw new Error(json?.error || json?.message || 'Failed to load offers');
        }

        return Array.isArray(json?.data?.items) ? json.data.items : [];
    }, []);

    const loadRules = useCallback(async () => {
        const res = await fetch(`${BACKEND_BASE_URL}/api/pricing`);
        const json = await res.json();

        if (!res.ok || !json?.success) {
            throw new Error(json?.error || json?.message || 'Failed to load pricing rules');
        }

        return Array.isArray(json?.data) ? json.data : [];
    }, []);

    const loadLogs = useCallback(async () => {
        const res = await fetch(`${BACKEND_BASE_URL}/api/pricing/logs`);
        const json = await res.json();

        if (!res.ok || !json?.success) {
            throw new Error(json?.error || json?.message || 'Failed to load price logs');
        }

        return Array.isArray(json?.data) ? json.data : [];
    }, []);

    const loadPageData = useCallback(async () => {
        try {
            setLoadError(null);

            const [offersData, rulesData, logsData] = await Promise.all([
                loadOffers(),
                loadRules(),
                loadLogs()
            ]);

            setOffers(offersData);
            setRules(rulesData);
            setLogs(logsData);

            const nextDrafts = {};
            rulesData.forEach((rule) => {
                nextDrafts[String(rule.tsn)] = {
                    costPrice: rule.costPrice ?? '',
                    minPrice: rule.minPrice ?? '',
                    maxPrice: rule.maxPrice ?? '',
                    targetMargin: rule.targetMargin ?? '',
                    automationEnabled: !!rule.automationEnabled,
                    pricingMode: rule.pricingMode || 'balanced'
                };
            });
            setDraftRules(nextDrafts);
        } catch (err) {
            console.error('Pricing page load failed:', err);
            setLoadError(err.message || 'Failed to load pricing data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [loadOffers, loadRules, loadLogs]);

    useEffect(() => {
        loadPageData();
    }, [loadPageData]);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            setRefreshError(null);

            const syncRes = await fetch(`${BACKEND_BASE_URL}/api/offers/sync`, {
                method: 'POST'
            });

            const syncJson = await syncRes.json().catch(() => ({}));

            if (!syncRes.ok || !syncJson?.success) {
                throw new Error(syncJson?.error || syncJson?.message || 'Offers sync failed');
            }

            await loadPageData();
        } catch (err) {
            console.error('Offers refresh failed:', err);
            setRefreshError(err.message || 'Offers sync failed');
            setRefreshing(false);
        }
    };

    const handleGenerateCompetitors = async () => {
        try {
            setGeneratingCompetitors(true);
            setRefreshError(null);

            const res = await fetch(`${BACKEND_BASE_URL}/api/competitors/mock/generate`, {
                method: 'POST'
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json?.success) {
                throw new Error(json?.error || json?.message || 'Failed to generate mock competitor data');
            }

            await loadPageData();
        } catch (err) {
            console.error('Mock competitor generation failed:', err);
            setRefreshError(err.message || 'Failed to generate mock competitor data');
        } finally {
            setGeneratingCompetitors(false);
        }
    };

    const runAutoPricing = async () => {
        try {
            setRunningAuto(true);
            setAutoError(null);
            setAutoResult(null);

            const res = await fetch(`${BACKEND_BASE_URL}/api/pricing/auto-run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json?.success) {
                throw new Error(json?.error || json?.message || 'Auto pricing failed');
            }

            setAutoResult(json.data || null);
            await loadPageData();
        } catch (err) {
            console.error('Auto pricing failed:', err);
            setAutoError(err.message || 'Auto pricing failed');
        } finally {
            setRunningAuto(false);
        }
    };

    const offersWithRules = useMemo(() => {
        return offers.map((offer) => {
            const rule = rules.find((r) => String(r.tsn) === String(offer.tsn));
            const draft = draftRules[String(offer.tsn)] || {
                costPrice: '',
                minPrice: '',
                maxPrice: '',
                targetMargin: '',
                automationEnabled: false,
                pricingMode: 'balanced'
            };

            const marketState = offer.marketState || 'none';

            const benchmarkForPricing =
                offer.winnerPrice != null
                    ? offer.winnerPrice
                    : offer.benchmarkPrice;

            const suggestion = getSuggestion(
                offer.price,
                draft.costPrice,
                draft.minPrice,
                draft.maxPrice,
                draft.targetMargin,
                benchmarkForPricing,
                draft.pricingMode,
                marketState
            );

            return {
                ...offer,
                rule,
                draft,
                suggestion,
                marketState
            };
        });
    }, [offers, rules, draftRules]);

    const filteredOffers = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return offersWithRules;

        return offersWithRules.filter((item) => (
            String(item.title || '').toLowerCase().includes(q) ||
            String(item.offerId || '').toLowerCase().includes(q) ||
            String(item.sku || '').toLowerCase().includes(q) ||
            String(item.tsn || '').toLowerCase().includes(q) ||
            String(item.winnerName || '').toLowerCase().includes(q) ||
            String(item.dominantCompetitor || '').toLowerCase().includes(q)
        ));
    }, [offersWithRules, query]);

    const metrics = useMemo(() => {
        const activeOffers = offers.filter((o) => {
            const status = String(o.status || '').toLowerCase();
            return status.includes('buyable') || status.includes('active') || status.includes('enabled');
        }).length;

        const avgPrice =
            offers.length > 0
                ? offers.reduce((sum, o) => sum + Number(o.price || 0), 0) / offers.length
                : 0;

        const needsReviewCount = offersWithRules.filter((o) =>
            ['Underpriced', 'Below minimum', 'Above maximum'].includes(o.suggestion.status)
        ).length;

        const highPressureCount = offersWithRules.filter((o) => o.marketState === 'high').length;

        const losingCount = offersWithRules.filter((o) => (o.priceGapToWinner || 0) > 0).length;

        return {
            totalOffers: offers.length,
            activeOffers,
            avgPrice,
            needsReviewCount,
            highPressureCount,
            losingCount
        };
    }, [offers, offersWithRules]);

    const historyAnalytics = useMemo(() => {
        const applied = logs.filter((l) => l.status === 'applied').length;
        const skipped = logs.filter((l) => l.status === 'skipped').length;
        const failed = logs.filter((l) => l.status === 'failed').length;

        const reasonMap = {};
        const offerMap = {};

        logs.forEach((log) => {
            if (log.reason) {
                reasonMap[log.reason] = (reasonMap[log.reason] || 0) + 1;
            }

            if (log.offerId) {
                offerMap[log.offerId] = (offerMap[log.offerId] || 0) + 1;
            }
        });

        const topReasons = Object.entries(reasonMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([reason, count]) => ({ reason, count }));

        const mostActiveOffers = Object.entries(offerMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([offerId, count]) => ({ offerId, count }));

        return {
            applied,
            skipped,
            failed,
            topReasons,
            mostActiveOffers
        };
    }, [logs]);

    const updateDraftRule = (tsn, field, value) => {
        setDraftRules((prev) => ({
            ...prev,
            [String(tsn)]: {
                costPrice: prev[String(tsn)]?.costPrice ?? '',
                minPrice: prev[String(tsn)]?.minPrice ?? '',
                maxPrice: prev[String(tsn)]?.maxPrice ?? '',
                targetMargin: prev[String(tsn)]?.targetMargin ?? '',
                automationEnabled: prev[String(tsn)]?.automationEnabled ?? false,
                pricingMode: prev[String(tsn)]?.pricingMode ?? 'balanced',
                ...prev[String(tsn)],
                [field]: value
            }
        }));
    };

    const saveRule = async (tsn) => {
        const key = String(tsn);
        const draft = draftRules[key] || {};

        try {
            setSavingMap((prev) => ({ ...prev, [key]: true }));
            setSaveError(null);
            setSaveSuccess(null);

            const res = await fetch(`${BACKEND_BASE_URL}/api/pricing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tsn: key,
                    costPrice: draft.costPrice === '' ? null : Number(draft.costPrice),
                    minPrice: draft.minPrice === '' ? null : Number(draft.minPrice),
                    maxPrice: draft.maxPrice === '' ? null : Number(draft.maxPrice),
                    targetMargin: draft.targetMargin === '' ? null : Number(draft.targetMargin),
                    automationEnabled: !!draft.automationEnabled,
                    pricingMode: draft.pricingMode || 'balanced'
                })
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json?.success) {
                throw new Error(json?.error || json?.message || 'Failed to save pricing rule');
            }

            const latestRules = await loadRules();
            setRules(latestRules);
            setSaveSuccess(`Rule saved for TSN ${key}.`);
        } catch (err) {
            console.error('Save rule failed:', err);
            setSaveError(err.message || 'Failed to save pricing rule');
        } finally {
            setSavingMap((prev) => ({ ...prev, [key]: false }));
        }
    };

    const applySuggestedPrice = async (item) => {
        const key = String(item.tsn);

        try {
            setApplyingMap((prev) => ({ ...prev, [key]: true }));
            setApplyError(null);
            setApplySuccess(null);

            const res = await fetch(`${BACKEND_BASE_URL}/api/pricing/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    offerId: item.offerId,
                    tsn: item.tsn,
                    newPrice: item.suggestion.suggestedPrice
                })
            });

            const json = await res.json().catch(() => ({}));

            if (!res.ok || !json?.success) {
                throw new Error(json?.error || json?.message || 'Apply failed');
            }

            setOffers((prev) =>
                prev.map((offer) =>
                    String(offer.offerId) === String(item.offerId)
                        ? { ...offer, price: item.suggestion.suggestedPrice }
                        : offer
                )
            );

            setApplySuccess(`Applied ${formatCurrency(item.suggestion.suggestedPrice)} to offer ${item.offerId}.`);
            const latestLogs = await loadLogs();
            setLogs(latestLogs);
        } catch (err) {
            console.error('Apply suggested price failed:', err);
            setApplyError(err.message || 'Apply price failed');
        } finally {
            setApplyingMap((prev) => ({ ...prev, [key]: false }));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
                <Loader2 size={38} className="text-[#22c55e] animate-spin" />
                <p className="text-[13.5px] font-medium text-[#6e6e73]">
                    Loading pricing data from Vendrix backend...
                </p>
            </div>
        );
    }

    if (loadError && !offers.length) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="p-6 bg-[#fef2f2] border border-[#fecaca] shadow-sm rounded-3xl flex flex-col items-start gap-2">
                    <h3 className="text-[15px] font-semibold text-[#b91c1c]">Pricing Load Failed</h3>
                    <p className="text-[13px] text-[#dc2626] font-medium">{loadError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-[#f0fdf4] shrink-0">
                        <Tag size={22} className="text-[#22c55e]" />
                    </div>
                    <div>
                        <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight">Pricing</h2>
                        <p className="text-[13px] text-[#6e6e73] mt-0.5">Competitor-aware pricing with winner price, pressure, and profit protection</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleGenerateCompetitors}
                        disabled={generatingCompetitors}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111827] border border-[#111827] text-white text-[13px] font-semibold shadow-sm hover:bg-[#1f2937] transition-colors disabled:opacity-60"
                    >
                        {generatingCompetitors ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                        Generate Mock Competitors
                    </button>

                    <button
                        onClick={runAutoPricing}
                        disabled={runningAuto}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563eb] border border-[#2563eb] text-white text-[13px] font-semibold shadow-sm hover:bg-[#1d4ed8] transition-colors disabled:opacity-60"
                    >
                        {runningAuto ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Run Auto Pricing
                    </button>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#e5e5ea] text-[13px] font-semibold text-[#1d1d1f] shadow-sm hover:bg-[#f9fafb] transition-colors disabled:opacity-60"
                    >
                        {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Refresh Offers
                    </button>
                </div>
            </div>

            {refreshError && (
                <div className="mb-4 p-4 bg-[#fffbeb] border border-[#fde68a] rounded-2xl">
                    <p className="text-[13px] font-semibold text-[#92400e]">Refresh failed</p>
                    <p className="text-[12.5px] text-[#b45309] mt-1">{refreshError}</p>
                </div>
            )}

            {saveError && (
                <div className="mb-4 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-2xl">
                    <p className="text-[13px] font-semibold text-[#b91c1c]">Rule save failed</p>
                    <p className="text-[12.5px] text-[#dc2626] mt-1">{saveError}</p>
                </div>
            )}

            {saveSuccess && (
                <div className="mb-4 p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl">
                    <p className="text-[13px] font-semibold text-[#166534]">Rule saved</p>
                    <p className="text-[12.5px] text-[#166534] mt-1">{saveSuccess}</p>
                </div>
            )}

            {applyError && (
                <div className="mb-4 p-4 bg-[#fff7ed] border border-[#fdba74] rounded-2xl">
                    <p className="text-[13px] font-semibold text-[#c2410c]">Apply failed</p>
                    <p className="text-[12.5px] text-[#c2410c] mt-1">{applyError}</p>
                </div>
            )}

            {applySuccess && (
                <div className="mb-4 p-4 bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl">
                    <p className="text-[13px] font-semibold text-[#1d4ed8]">Price applied</p>
                    <p className="text-[12.5px] text-[#1d4ed8] mt-1">{applySuccess}</p>
                </div>
            )}

            {autoError && (
                <div className="mb-4 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-2xl">
                    <p className="text-[13px] font-semibold text-[#b91c1c]">Auto pricing failed</p>
                    <p className="text-[12.5px] text-[#dc2626] mt-1">{autoError}</p>
                </div>
            )}

            {autoResult && (
                <div className="mb-6 bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-5">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Auto Pricing Results</h3>
                            <p className="text-[12px] text-[#6e6e73] mt-1">Last run summary</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl px-4 py-4">
                            <p className="text-[11px] uppercase tracking-widest text-[#86868b] font-medium mb-2">Scanned</p>
                            <p className="text-[24px] font-semibold text-[#1d1d1f]">{autoResult.scanned || 0}</p>
                        </div>
                        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl px-4 py-4">
                            <p className="text-[11px] uppercase tracking-widest text-[#166534] font-medium mb-2">Applied</p>
                            <p className="text-[24px] font-semibold text-[#166534]">{autoResult.applied || 0}</p>
                        </div>
                        <div className="bg-[#fff7ed] border border-[#fdba74] rounded-2xl px-4 py-4">
                            <p className="text-[11px] uppercase tracking-widest text-[#c2410c] font-medium mb-2">Skipped</p>
                            <p className="text-[24px] font-semibold text-[#c2410c]">{autoResult.skipped?.length || 0}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                <MetricCard label="Products Tracked" value={metrics.totalOffers} sub="Offers in database" />
                <MetricCard label="Active Offers" value={metrics.activeOffers} sub="Potentially sellable" />
                <MetricCard label="Average Price" value={formatCurrency(metrics.avgPrice)} sub="Across all offers" />
                <MetricCard label="Needs Review" value={metrics.needsReviewCount} sub="Rule conflicts detected" />
                <MetricCard label="High Pressure" value={metrics.highPressureCount} sub="Heavy competition" />
                <MetricCard label="Losing To Winner" value={metrics.losingCount} sub="Priced above winner" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 space-y-6">
                    <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                            <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest">Competitor Intelligence Pricing</h3>

                            <div className="relative w-full sm:w-[320px]">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search title, offer ID, SKU, TSN, winner"
                                    className="w-full bg-white border border-[#e5e5ea] rounded-xl pl-9 pr-3 py-2 text-[13px] text-[#1d1d1f] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-[#f5f5f7]">
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Product</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Current</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Winner Price</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Gap</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Winner</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Pressure</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Competitors</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">
                                            Recommended Action
                                        </th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Mode</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Cost</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Min</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Max</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Target %</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Suggested</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider">Strategy</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-widest">Status</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider text-center">Auto</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider text-center">Save</th>
                                        <th className="py-3.5 px-4 text-[11px] font-medium text-[#86868b] uppercase tracking-wider text-center">Apply</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOffers.map((item) => {
                                        const draft = item.draft || {};
                                        const isSaving = !!savingMap[String(item.tsn)];
                                        const isApplying = !!applyingMap[String(item.tsn)];
                                        const suggestion = item.suggestion;
                                        const gapClass =
                                            item.priceGapToWinner == null
                                                ? 'text-[#6b7280]'
                                                : item.priceGapToWinner > 0
                                                    ? 'text-[#b91c1c]'
                                                    : item.priceGapToWinner < 0
                                                        ? 'text-[#166534]'
                                                        : 'text-[#6b7280]';

                                        return (
                                            <tr key={item.id} className="border-b border-[#f5f5f7] last:border-0 hover:bg-[#f9fafb] transition-colors">
                                                <td className="py-4 px-4 min-w-[280px]">
                                                    <p className="text-[13.5px] font-semibold text-[#1d1d1f] truncate w-80">
                                                        {item.title || 'Unknown Product'}
                                                    </p>
                                                    <p className="text-[11px] text-[#9ca3af] font-mono mt-1">
                                                        Offer: {item.offerId || '—'} | SKU: {item.sku || '—'} | TSN: {item.tsn || '—'}
                                                    </p>
                                                    {item.dominantCompetitor && (
                                                        <p className="text-[11px] text-[#7c3aed] mt-1">
                                                            Dominant: {item.dominantCompetitor}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 text-[13px] font-semibold text-[#1d1d1f] whitespace-nowrap">
                                                    {formatCurrency(item.price)}
                                                </td>

                                                <td className="py-4 px-4 text-[13px] font-semibold text-[#7c3aed] whitespace-nowrap">
                                                    {item.winnerPrice != null ? formatCurrency(item.winnerPrice) : '—'}
                                                </td>

                                                <td className={`py-4 px-4 text-[12px] font-semibold whitespace-nowrap ${gapClass}`}>
                                                    {item.priceGapToWinner == null ? '—' : formatCurrency(item.priceGapToWinner)}
                                                </td>

                                                <td className="py-4 px-4 text-[12px] text-[#374151] whitespace-nowrap">
                                                    {item.winnerName || '—'}
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <MarketStateBadge state={item.marketState} />
                                                </td>

                                                <td className="py-4 px-4 text-[12px] font-semibold text-[#374151] text-center">
                                                    {item.estimatedCompetitorCount ?? 0}
                                                </td>

                                                <td className="py-4 px-4 min-w-[190px]">
                                                    {(() => {
                                                        const action = getRecommendedAction(item);

                                                        return (
                                                            <div className={`rounded-xl border px-3 py-2 ${action.tone}`}>
                                                                <p className="text-[11px] font-semibold">
                                                                    {action.label}
                                                                </p>
                                                                <p className="text-[10.5px] mt-0.5 leading-snug opacity-80">
                                                                    {action.text}
                                                                </p>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>

                                                <td className="py-4 px-4">
                                                    <select
                                                        value={draft.pricingMode || 'balanced'}
                                                        onChange={(e) => updateDraftRule(item.tsn, 'pricingMode', e.target.value)}
                                                        className="w-28 bg-white border border-[#e5e5ea] rounded-xl px-2 py-2 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                                    >
                                                        <option value="conservative">Conservative</option>
                                                        <option value="balanced">Balanced</option>
                                                        <option value="aggressive">Aggressive</option>
                                                    </select>
                                                </td>

                                                <td className="py-4 px-4">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={draft.costPrice}
                                                        onChange={(e) => updateDraftRule(item.tsn, 'costPrice', e.target.value)}
                                                        placeholder="Cost"
                                                        className="w-24 bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                                    />
                                                </td>

                                                <td className="py-4 px-4">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={draft.minPrice}
                                                        onChange={(e) => updateDraftRule(item.tsn, 'minPrice', e.target.value)}
                                                        placeholder="Minimum"
                                                        className="w-24 bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                                    />
                                                </td>

                                                <td className="py-4 px-4">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={draft.maxPrice}
                                                        onChange={(e) => updateDraftRule(item.tsn, 'maxPrice', e.target.value)}
                                                        placeholder="Maximum"
                                                        className="w-24 bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                                    />
                                                </td>

                                                <td className="py-4 px-4">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={draft.targetMargin}
                                                        onChange={(e) => updateDraftRule(item.tsn, 'targetMargin', e.target.value)}
                                                        placeholder="%"
                                                        className="w-20 bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20"
                                                    />
                                                </td>

                                                <td className="py-4 px-4 text-[13px] font-semibold text-[#2563eb] whitespace-nowrap">
                                                    {formatCurrency(suggestion.suggestedPrice)}
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <StrategyBadge strategy={suggestion.strategy} />
                                                </td>

                                                <td className="py-4 px-4 whitespace-nowrap">
                                                    <StatusBadge status={suggestion.status} />
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!draft.automationEnabled}
                                                        onChange={(e) => updateDraftRule(item.tsn, 'automationEnabled', e.target.checked)}
                                                        className="w-4 h-4 accent-[#22c55e]"
                                                    />
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <button
                                                        onClick={() => saveRule(item.tsn)}
                                                        disabled={isSaving || !item.tsn}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-[12px] font-semibold transition-colors disabled:opacity-60"
                                                    >
                                                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                                        Save
                                                    </button>
                                                </td>

                                                <td className="py-4 px-4 text-center">
                                                    <button
                                                        onClick={() => applySuggestedPrice(item)}
                                                        disabled={isApplying || !item.offerId || !item.tsn}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-semibold transition-colors disabled:opacity-60"
                                                    >
                                                        {isApplying ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {!filteredOffers.length && (
                            <div className="py-10 text-center text-[13px] text-[#6e6e73]">
                                No offers found for this search.
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart2 size={16} className="text-[#6e6e73]" />
                            <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest">Buy-box History Analytics</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-3">Top Skip Reasons</h4>
                                <div className="space-y-2">
                                    {historyAnalytics.topReasons.length === 0 ? (
                                        <p className="text-[12px] text-[#9ca3af]">No skip data yet.</p>
                                    ) : (
                                        historyAnalytics.topReasons.map((item) => (
                                            <div key={item.reason} className="flex items-center justify-between rounded-xl border border-[#f1f5f9] px-3 py-2">
                                                <span className="text-[12px] text-[#374151]">{item.reason}</span>
                                                <span className="text-[12px] font-semibold text-[#1d1d1f]">{item.count}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[13px] font-semibold text-[#1d1d1f] mb-3">Most Active Offers</h4>
                                <div className="space-y-2">
                                    {historyAnalytics.mostActiveOffers.length === 0 ? (
                                        <p className="text-[12px] text-[#9ca3af]">No activity yet.</p>
                                    ) : (
                                        historyAnalytics.mostActiveOffers.map((item) => (
                                            <div key={item.offerId} className="flex items-center justify-between rounded-xl border border-[#f1f5f9] px-3 py-2">
                                                <span className="text-[12px] text-[#374151]">Offer {item.offerId}</span>
                                                <span className="text-[12px] font-semibold text-[#1d1d1f]">{item.count} events</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-6">
                        <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest mb-4">Competitor Intelligence</h3>
                        <FeatureRow icon={Users} title="Winner Tracking" desc="Use current mock winning competitor price as the benchmark for safe repricing." />
                        <FeatureRow icon={BarChart2} title="Pressure Mapping" desc="Classify offers into none, low, medium, or high competition." />
                        <FeatureRow icon={Zap} title="Smarter Suggestions" desc="Suggested prices now react to winner price instead of static assumptions." />
                        <FeatureRow icon={AlertCircle} title="Upgrade Path" desc="Mock signals now, real competitor collection later without rewriting the UI." />
                    </div>

                    <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-sm px-6 py-6">
                        <div className="flex items-center gap-2 mb-4">
                            <History size={16} className="text-[#6e6e73]" />
                            <h3 className="text-[13px] font-medium text-[#86868b] uppercase tracking-widest">
                                Recent Pricing Activity
                            </h3>
                        </div>

                        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                            {logs.length === 0 ? (
                                <div className="text-[12px] text-[#9ca3af]">
                                    No pricing history yet.
                                </div>
                            ) : (
                                logs.slice(0, 20).map((log) => (
                                    <div
                                        key={log.id}
                                        className="rounded-2xl border border-[#f1f5f9] bg-[#fcfcfd] px-4 py-3"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div>
                                                <p className="text-[12px] font-semibold text-[#1d1d1f]">
                                                    Offer {log.offerId}
                                                </p>
                                                <p className="text-[11px] text-[#9ca3af] mt-0.5">
                                                    {formatDateTime(log.createdAt)}
                                                </p>
                                            </div>

                                            <LogStatusBadge status={log.status} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                                            <div>
                                                <span className="text-[#9ca3af]">Source:</span>{' '}
                                                <span className="font-medium text-[#374151]">
                                                    {log.changeSource || '—'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[#9ca3af]">Mode:</span>{' '}
                                                <span className="font-medium text-[#374151]">
                                                    {log.pricingMode || '—'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[#9ca3af]">Old:</span>{' '}
                                                <span className="font-medium text-[#374151]">
                                                    {log.oldPrice !== null && log.oldPrice !== undefined
                                                        ? formatCurrency(log.oldPrice)
                                                        : '—'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[#9ca3af]">New:</span>{' '}
                                                <span className="font-medium text-[#374151]">
                                                    {log.newPrice !== null && log.newPrice !== undefined
                                                        ? formatCurrency(log.newPrice)
                                                        : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {log.strategy && (
                                            <div className="mb-2">
                                                <StrategyBadge strategy={log.strategy} />
                                            </div>
                                        )}

                                        {log.reason && (
                                            <div
                                                className={`mt-2 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${getReasonTone(log.reason)}`}
                                            >
                                                <span className="font-semibold">
                                                    {log.status === 'skipped' ? 'Decision: ' : 'Reason: '}
                                                </span>
                                                {explainPricingReason(log.reason)}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#f0fdf4] to-white rounded-3xl border border-[#bbf7d0] px-6 py-6">
                        <p className="text-[12px] font-medium text-[#22c55e] uppercase tracking-widest mb-3">Next brain upgrade</p>
                        <h4 className="text-[18px] font-semibold text-[#1d1d1f] leading-snug mb-3">
                            Real competitor signal adapter
                        </h4>
                        <p className="text-[13px] text-[#6e6e73] leading-relaxed">
                            The next step is replacing mock competitor generation with real market signals while keeping this same decision layer and interface.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}