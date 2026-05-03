function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function estimateCompetitorCount({ yourPrice, benchmarkPrice }) {
    const your = toNumberOrNull(yourPrice);
    const benchmark = toNumberOrNull(benchmarkPrice);

    if (your === null || benchmark === null) return 0;

    const diff = your - benchmark;

    if (diff <= 0) return 0; // you are already cheapest / matching market
    if (diff < 5) return 1;
    if (diff < 20) return 2;
    if (diff < 50) return 3;

    return 4; // heavy competition estimate
}

function getMarketState(count) {
    if (count === 0) return 'none';
    if (count === 1) return 'low';
    if (count <= 3) return 'medium';
    return 'high';
}

function detectMarketChange(prev, current) {
    if (!prev) return true;

    return (
        Number(prev.benchmarkPrice ?? null) !== Number(current.benchmarkPrice ?? null) ||
        String(prev.marketState || '') !== String(current.marketState || '')
    );
}

module.exports = {
    estimateCompetitorCount,
    getMarketState,
    detectMarketChange
};