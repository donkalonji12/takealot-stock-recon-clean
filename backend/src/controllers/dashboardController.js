const prisma = require('../config/db');

exports.getDashboardSummary = async (req, res) => {
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

        const [
            offers,
            rules,
            recentLogs,
            returns,
            sales
        ] = await Promise.all([
            prisma.offer.findMany({
                where: { sellerAccountId: account.id }
            }),
            prisma.pricingRule.findMany({
                where: { sellerAccountId: account.id }
            }),
            prisma.priceChangeLog.findMany({
                where: { sellerAccountId: account.id },
                orderBy: { createdAt: 'desc' },
                take: 200
            }),
            prisma.return.findMany({
                where: { sellerAccountId: account.id }
            }),
            prisma.sale.findMany({
                where: { sellerAccountId: account.id }
            })
        ]);

        const rulesByTsn = new Map(
            rules
                .filter((r) => r.tsn)
                .map((r) => [String(r.tsn), r])
        );

        const recentFailed = recentLogs.filter((l) => l.status === 'failed');
        const recentSkipped = recentLogs.filter((l) => l.status === 'skipped');

        const repeatedSkipMap = {};
        for (const log of recentSkipped) {
            const key = String(log.offerId || '');
            if (!key) continue;
            repeatedSkipMap[key] = (repeatedSkipMap[key] || 0) + 1;
        }

        const repeatedSkips = Object.entries(repeatedSkipMap)
            .filter(([, count]) => count >= 3)
            .map(([offerId, count]) => ({ offerId, count }));

        const highPressureOffers = offers.filter((offer) => {
            const benchmark = Number(offer.benchmarkPrice || 0);
            const current = Number(offer.price || 0);
            const diff = current - benchmark;
            return benchmark > 0 && diff >= 20;
        });

        const highPressureUnprotected = highPressureOffers.filter((offer) => {
            const rule = rulesByTsn.get(String(offer.tsn));
            return !rule || !rule.automationEnabled;
        });

        const missingRules = offers.filter((offer) => {
            if (!offer.tsn) return false;
            const rule = rulesByTsn.get(String(offer.tsn));
            return !rule || rule.costPrice == null || rule.targetMargin == null;
        });

        const buyboxRisk = offers.filter((offer) => {
            const benchmark = Number(offer.benchmarkPrice || 0);
            const current = Number(offer.price || 0);
            return benchmark > 0 && current > benchmark;
        });

        const actionCards = [
            {
                key: 'buybox_risk',
                title: 'Buy-box risk',
                count: buyboxRisk.length,
                tone: 'warning',
                description: 'Offers priced above benchmark and likely losing competitiveness.'
            },
            {
                key: 'failed_repricing',
                title: 'Failed repricing',
                count: recentFailed.length,
                tone: 'danger',
                description: 'Recent pricing actions failed and may need manual review.'
            },
            {
                key: 'missing_rules',
                title: 'Missing pricing rules',
                count: missingRules.length,
                tone: 'neutral',
                description: 'Offers missing cost or margin data needed for safe automation.'
            },
            {
                key: 'high_pressure_unprotected',
                title: 'High-pressure offers not protected',
                count: highPressureUnprotected.length,
                tone: 'warning',
                description: 'Competitive offers without active automation or strong pricing rules.'
            },
            {
                key: 'repeated_skips',
                title: 'Repeated skipped actions',
                count: repeatedSkips.length,
                tone: 'neutral',
                description: 'Offers repeatedly skipped, likely due to cooldowns or conflicting rules.'
            }
        ];

        const summary = {
            totalOffers: offers.length,
            totalSales: sales.length,
            totalReturns: returns.length,
            activeRules: rules.length,
            failedActions: recentFailed.length
        };

        return res.json({
            success: true,
            data: {
                summary,
                actionCards,
                details: {
                    buyboxRisk: buyboxRisk.slice(0, 20),
                    failedRepricing: recentFailed.slice(0, 20),
                    missingRules: missingRules.slice(0, 20),
                    highPressureUnprotected: highPressureUnprotected.slice(0, 20),
                    repeatedSkips: repeatedSkips.slice(0, 20)
                }
            }
        });
    } catch (error) {
        console.error('[DASHBOARD SUMMARY ERROR]', error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};