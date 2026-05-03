function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function roundPrice(value) {
    return Math.round(Number(value) * 100) / 100;
}

function calculateSuggestedPrice({
    currentPrice,
    winnerPrice,
    benchmarkPrice,
    costPrice,
    minPrice,
    maxPrice,
    targetMargin,
    pricingMode = 'balanced',
    marketState = 'none'
}) {
    const current = toNumber(currentPrice) || 0;
    const winner = toNumber(winnerPrice);
    const benchmark = winner ?? toNumber(benchmarkPrice);
    const cost = toNumber(costPrice);
    const min = toNumber(minPrice);
    const max = toNumber(maxPrice);
    const margin = toNumber(targetMargin);

    let reason = 'rule_based';
    let strategy = 'Rule-based only';

    let marginFloor = null;

    if (cost !== null && margin !== null && margin >= 0 && margin < 100) {
        marginFloor = cost / (1 - margin / 100);
    }

    const protectedFloor = Math.max(
        min ?? 0,
        marginFloor ?? 0
    );

    let suggested = current;

    if (benchmark !== null && marketState !== 'none') {
        let undercut = 1;

        if (pricingMode === 'aggressive') undercut = marketState === 'high' ? 3 : 2;
        if (pricingMode === 'balanced') undercut = marketState === 'high' ? 2 : 1;
        if (pricingMode === 'conservative') undercut = marketState === 'high' ? 1 : 0;

        suggested = benchmark - undercut;
        strategy = undercut > 0 ? 'Undercutting' : 'Matching';
        reason = winner !== null ? 'winner_price_detected' : 'benchmark_detected';
    } else {
        suggested = current;
        strategy = 'Premium Hold';
        reason = 'no_competitor_detected';
    }

    suggested = Math.max(suggested, protectedFloor);

    if (max !== null) {
        suggested = Math.min(suggested, max);
    }

    suggested = roundPrice(suggested);

    const marginPercent =
        cost !== null && suggested > 0
            ? ((suggested - cost) / suggested) * 100
            : null;

    return {
        suggestedPrice: suggested,
        strategy,
        reason,
        marginPercent,
        protectedFloor: roundPrice(protectedFloor),
        benchmarkUsed: benchmark
    };
}

function shouldApplyAutoPrice({
    currentPrice,
    suggestedPrice,
    minPrice,
    maxPrice,
    costPrice,
    targetMargin,
    cooldownMinutes = 10,
    lastChangedAt
}) {
    const current = toNumber(currentPrice);
    const suggested = toNumber(suggestedPrice);
    const min = toNumber(minPrice);
    const max = toNumber(maxPrice);
    const cost = toNumber(costPrice);
    const margin = toNumber(targetMargin);

    if (current === null || suggested === null) {
        return { apply: false, reason: 'missing_price_data' };
    }

    const change = Math.abs(current - suggested);

    if (change < 1) {
        return { apply: false, reason: 'change_too_small' };
    }

    if (min !== null && suggested < min) {
        return { apply: false, reason: 'below_min_price' };
    }

    if (max !== null && suggested > max) {
        return { apply: false, reason: 'above_max_price' };
    }

    if (cost !== null && margin !== null && margin >= 0 && margin < 100) {
        const actualMargin = ((suggested - cost) / suggested) * 100;

        if (actualMargin < margin) {
            return { apply: false, reason: 'margin_floor_broken' };
        }
    }

    if (lastChangedAt) {
        const last = new Date(lastChangedAt).getTime();
        const now = Date.now();
        const diffMinutes = (now - last) / 1000 / 60;

        if (diffMinutes < cooldownMinutes) {
            return { apply: false, reason: 'cooldown_active' };
        }
    }

    return { apply: true, reason: 'safe_to_apply' };
}

module.exports = {
    calculateSuggestedPrice,
    shouldApplyAutoPrice
};