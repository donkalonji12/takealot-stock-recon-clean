const prisma = require('../config/db');
const {
    generateMockCompetitorSnapshots,
    getLatestCompetitorStateMap
} = require('../services/competitorService');

exports.generateMockData = async (req, res) => {
    try {
        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'No active seller account found'
            });
        }

        const result = await generateMockCompetitorSnapshots(account.id);

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[MOCK COMPETITOR ERROR]', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getLatestState = async (req, res) => {
    try {
        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'No active seller account found'
            });
        }

        const stateMap = await getLatestCompetitorStateMap(account.id);

        return res.json({
            success: true,
            data: Array.from(stateMap.entries()).map(([offerId, state]) => ({
                offerId,
                ...state
            }))
        });
    } catch (error) {
        console.error('[GET COMPETITOR STATE ERROR]', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};