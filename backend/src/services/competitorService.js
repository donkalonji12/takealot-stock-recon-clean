const prisma = require('../config/db');

const COMPETITOR_NAMES = [
    'ValueMart',
    'Prime Deals',
    'TopSeller SA',
    'Mega Retail',
    'Blue Box Trading',
    'Urban Supply',
    'Fast Cart',
    'Discount Hub'
];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(value) {
    return Math.round(Number(value) * 100) / 100;
}

async function generateMockCompetitorSnapshots(sellerAccountId) {
    const offers = await prisma.offer.findMany({
        where: { sellerAccountId }
    });

    let created = 0;

    for (const offer of offers) {
        const currentPrice = Number(offer.price || 0);
        if (!currentPrice || currentPrice <= 0) continue;

        const competitorCount = randomInt(0, 4);
        if (competitorCount === 0) continue;

        const competitors = [];

        for (let i = 0; i < competitorCount; i++) {
            const direction = Math.random() < 0.65 ? -1 : 1;
            const variance = randomInt(2, 80);
            const competitorPrice = Math.max(1, round2(currentPrice + direction * variance));

            competitors.push({
                competitorName: `${randomItem(COMPETITOR_NAMES)} ${i + 1}`,
                competitorPrice,
                isWinner: false
            });
        }

        competitors.sort((a, b) => a.competitorPrice - b.competitorPrice);
        competitors[0].isWinner = true;

        for (const comp of competitors) {
            await prisma.competitorSnapshot.create({
                data: {
                    sellerAccountId,
                    offerId: String(offer.offerId),
                    tsn: offer.tsn || null,
                    competitorName: comp.competitorName,
                    competitorPrice: comp.competitorPrice,
                    isWinner: comp.isWinner,
                    priceGap: round2(currentPrice - comp.competitorPrice),
                    signalSource: 'mock'
                }
            });

            created++;
        }
    }

    return {
        offersScanned: offers.length,
        snapshotsCreated: created
    };
}

async function getLatestCompetitorStateMap(sellerAccountId) {
    const rows = await prisma.competitorSnapshot.findMany({
        where: { sellerAccountId },
        orderBy: { createdAt: 'desc' }
    });

    const grouped = new Map();

    for (const row of rows) {
        const key = String(row.offerId);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(row);
    }

    const map = new Map();

    for (const [offerId, offerRows] of grouped.entries()) {
        const latestTime = new Date(offerRows[0].createdAt).getTime();
        const latestRows = offerRows.filter(
            (row) => new Date(row.createdAt).getTime() === latestTime
        );

        const winner = latestRows.find((row) => row.isWinner) || null;

        map.set(offerId, {
            competitorCount: latestRows.length,
            winnerPrice: winner?.competitorPrice ?? null,
            winnerName: winner?.competitorName ?? null,
            dominantCompetitor: winner?.competitorName ?? null,
            rows: latestRows
        });
    }

    return map;
}

module.exports = {
    generateMockCompetitorSnapshots,
    getLatestCompetitorStateMap
};