// backend/src/controllers/returnsController.js
const prisma = require('../config/db');
const SyncService = require('../services/syncService');

const triggerSync = async (req, res, next) => {
    try {
        // Grab the active account logically (ideally via auth middleware later)
        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true }
        });

        if (!account) {
            return res.status(400).json({ success: false, error: "No active seller account configured" });
        }

        // Trigger sync asynchronously or await it
        // Depending on volume, this could be slow. For now, await it to report exact counts.
        const result = await SyncService.syncReturns(account.id);

        res.status(200).json({
            success: true,
            data: {
                message: "Returns sync mapped successfully",
                details: result
            }
        });
    } catch (error) {
        next(error);
    }
};

// ========================================================
// FUTURE MODULE HOOKUPS:
// - Offers (GET /api/offers, POST /api/offers/sync)
// - Pricing Automation (POST /api/pricing/rules)
// - Claims (GET /api/claims, POST /api/claims/file)
// - Shipments (GET /api/shipments)
// - Profit Reporting (GET /api/profit/summary)
// ========================================================

const getReturns = async (req, res, next) => {
    try {
        // Read directly from our resilient database cache
        const returns = await prisma.return.findMany({
            orderBy: { returnDate: 'desc' },
            take: 250 // reasonable explicit limit for frontend rendering
        });

        // Read latest sync timestamp to return to frontend
        const latestSync = await prisma.syncRun.findFirst({
            where: { moduleSynced: "RETURNS", status: "SUCCESS" },
            orderBy: { completedAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            data: {
                items: returns,
                meta: { 
                    total: returns.length,
                    lastSyncedAt: latestSync ? latestSync.completedAt : null 
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

const getSummary = async (req, res, next) => {
    try {
        const returns = await prisma.return.findMany({
            select: {
                status: true,
                returnReason: true,
                sku: true,
                productTitle: true
            }
        });

        let defectiveCount = 0;
        let highRiskSkus = 0;
        const reasons = {};
        const skuCounts = {};

        returns.forEach(r => {
            const reasonLower = (r.returnReason || '').toLowerCase();
            if (reasonLower.includes('defective') || reasonLower.includes('damaged')) {
                defectiveCount++;
            }

            const reasonStr = r.returnReason || 'Unknown';
            reasons[reasonStr] = (reasons[reasonStr] || 0) + 1;

            if (r.sku) {
                skuCounts[r.sku] = (skuCounts[r.sku] || 0) + 1;
            }
        });

        // Count high risk SKUs (e.g. >= 3 returns)
        Object.values(skuCounts).forEach(count => {
            if (count >= 3) highRiskSkus++;
        });

        // Read latest sync timestamp to return to frontend
        const latestSync = await prisma.syncRun.findFirst({
            where: { moduleSynced: "RETURNS", status: "SUCCESS" },
            orderBy: { completedAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            data: {
                totalReturns: returns.length,
                defectiveDamaged: defectiveCount,
                highRiskSkus: highRiskSkus,
                topReasons: reasons,
                lastSyncedAt: latestSync ? latestSync.completedAt : null
            }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    triggerSync,
    getReturns,
    getSummary
};
