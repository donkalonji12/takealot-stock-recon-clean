const SyncService = require('../services/syncService');
const prisma = require('../config/db');
const { getLatestCompetitorStateMap } = require('../services/competitorService');

function getMarketState(competitorCount) {
    if (!competitorCount || competitorCount <= 0) return 'none';
    if (competitorCount === 1) return 'low';
    if (competitorCount <= 3) return 'medium';
    return 'high';
}

exports.syncOffers = async (req, res) => {
    try {
        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'No active seller account found'
            });
        }

        const result = await SyncService.syncOffers(account.id);

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Offers Sync Error:', error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getOffers = async (req, res) => {
    try {
        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'No active seller account found'
            });
        }

        const [offers, competitorMap] = await Promise.all([
            prisma.offer.findMany({
                where: { sellerAccountId: account.id },
                orderBy: { updatedAt: 'desc' }
            }),
            getLatestCompetitorStateMap(account.id)
        ]);

        const enrichedOffers = offers.map((offer) => {
            const state = competitorMap.get(String(offer.offerId));

            const competitorCount = state?.competitorCount ?? 0;
            const winnerPrice = state?.winnerPrice ?? null;
            const winnerName = state?.winnerName ?? null;
            const dominantCompetitor = state?.dominantCompetitor ?? winnerName ?? null;
            const priceGapToWinner =
                winnerPrice !== null && winnerPrice !== undefined
                    ? Number(offer.price || 0) - Number(winnerPrice)
                    : null;

            return {
                ...offer,
                estimatedCompetitorCount: competitorCount,
                competitorCount,
                winnerPrice,
                winnerName,
                dominantCompetitor,
                competitorRows: state?.rows ?? [],
                marketState: getMarketState(competitorCount),
                priceGapToWinner
            };
        });

        return res.json({
            success: true,
            data: {
                items: enrichedOffers,
                meta: {
                    total: enrichedOffers.length
                }
            }
        });
    } catch (error) {
        console.error('Get Offers Error:', error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};