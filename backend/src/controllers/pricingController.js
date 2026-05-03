const prisma = require('../config/db');
const TakealotApiClient = require('../services/takealotApi');
const { getLatestCompetitorStateMap } = require('../services/competitorService');
const {
    calculateSuggestedPrice,
    shouldApplyAutoPrice
} = require('../services/pricingEngine');

const SIMULATION_MODE = true;

async function getActiveAccount() {
    return prisma.sellerAccount.findFirst({
        where: { isActive: true }
    });
}

function getMarketState(count) {
    if (!count || count <= 0) return 'none';
    if (count === 1) return 'low';
    if (count <= 3) return 'medium';
    return 'high';
}

function buildTakealotClient(account) {
    if (account.rawKey) return new TakealotApiClient({ rawKey: account.rawKey });
    if (account.apiKey) return new TakealotApiClient({ rawKey: account.apiKey });

    if (account.encryptedKey && account.iv) {
        return new TakealotApiClient({
            encryptedKey: account.encryptedKey,
            iv: account.iv
        });
    }

    if (account.apiKeyEncrypted && account.iv) {
        return new TakealotApiClient({
            encryptedKey: account.apiKeyEncrypted,
            iv: account.iv
        });
    }

    throw new Error('No usable API key found for seller account');
}

async function createPriceLog({
    sellerAccountId,
    offer,
    oldPrice,
    newPrice,
    benchmarkPrice,
    strategy,
    pricingMode,
    changeSource,
    status,
    reason
}) {
    return prisma.priceChangeLog.create({
        data: {
            sellerAccountId,
            offerId: String(offer.offerId),
            tsn: offer.tsn ? String(offer.tsn) : null,
            oldPrice: oldPrice !== null && oldPrice !== undefined ? Number(oldPrice) : null,
            newPrice: newPrice !== null && newPrice !== undefined ? Number(newPrice) : null,
            benchmarkPrice: benchmarkPrice !== null && benchmarkPrice !== undefined ? Number(benchmarkPrice) : null,
            strategy,
            pricingMode,
            changeSource,
            status,
            reason
        }
    });
}

exports.getPricingRules = async (req, res) => {
    try {
        const account = await getActiveAccount();

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'No active seller account found'
            });
        }

        const rules = await prisma.pricingRule.findMany({
            where: { sellerAccountId: account.id },
            orderBy: { updatedAt: 'desc' }
        });

        return res.json({
            success: true,
            data: rules
        });
    } catch (error) {
        console.error('[GET PRICING RULES ERROR]', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.savePricingRule = async (req, res) => {
    try {
        const account = await getActiveAccount();

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'No active seller account found'
            });
        }

        const {
            tsn,
            costPrice,
            minPrice,
            maxPrice,
            targetMargin,
            automationEnabled,
            pricingMode
        } = req.body;

        if (!tsn) {
            return res.status(400).json({
                success: false,
                error: 'TSN is required'
            });
        }

        const rule = await prisma.pricingRule.upsert({
            where: {
                sellerAccountId_tsn: {
                    sellerAccountId: account.id,
                    tsn: String(tsn)
                }
            },
            update: {
                costPrice: costPrice === null || costPrice === '' ? null : Number(costPrice),
                minPrice: minPrice === null || minPrice === '' ? null : Number(minPrice),
                maxPrice: maxPrice === null || maxPrice === '' ? null : Number(maxPrice),
                targetMargin: targetMargin === null || targetMargin === '' ? null : Number(targetMargin),
                automationEnabled: !!automationEnabled,
                pricingMode: pricingMode || 'balanced'
            },
            create: {
                sellerAccountId: account.id,
                tsn: String(tsn),
                costPrice: costPrice === null || costPrice === '' ? null : Number(costPrice),
                minPrice: minPrice === null || minPrice === '' ? null : Number(minPrice),
                maxPrice: maxPrice === null || maxPrice === '' ? null : Number(maxPrice),
                targetMargin: targetMargin === null || targetMargin === '' ? null : Number(targetMargin),
                automationEnabled: !!automationEnabled,
                pricingMode: pricingMode || 'balanced'
            }
        });

        return res.json({
            success: true,
            data: rule
        });
    } catch (error) {
        console.error('[SAVE PRICING RULE ERROR]', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getPriceLogs = async (req, res) => {
    try {
        const account = await getActiveAccount();

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'No active seller account found'
            });
        }

        const logs = await prisma.priceChangeLog.findMany({
            where: { sellerAccountId: account.id },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('[GET PRICE LOGS ERROR]', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.applyPrice = async (req, res) => {
    try {
        const account = await getActiveAccount();

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'No active seller account found'
            });
        }

        const { offerId, newPrice } = req.body;

        if (!offerId || !newPrice) {
            return res.status(400).json({
                success: false,
                error: 'offerId and newPrice are required'
            });
        }

        const offer = await prisma.offer.findFirst({
            where: {
                sellerAccountId: account.id,
                offerId: String(offerId)
            }
        });

        if (!offer) {
            return res.status(404).json({
                success: false,
                error: 'Offer not found'
            });
        }

        if (!SIMULATION_MODE) {
            const client = buildTakealotClient(account);

            await client.updateOfferById(offerId, {
                sku: offer.sku,
                selling_price: Number(newPrice),
                rrp: offer.rrp ? Number(offer.rrp) : Number(newPrice)
            });
        } else {
            console.log('[SIMULATED MANUAL PRICE UPDATE]', {
                offerId: offer.offerId,
                oldPrice: offer.price,
                newPrice
            });
        }

        await prisma.offer.update({
            where: { id: offer.id },
            data: { price: Number(newPrice) }
        });

        await createPriceLog({
            sellerAccountId: account.id,
            offer,
            oldPrice: offer.price,
            newPrice,
            benchmarkPrice: offer.benchmarkPrice,
            strategy: SIMULATION_MODE ? 'Manual Apply Simulation' : 'Manual Apply',
            pricingMode: 'manual',
            changeSource: SIMULATION_MODE ? 'manual_simulation' : 'manual',
            status: 'applied',
            reason: SIMULATION_MODE ? 'manual_apply_simulated' : 'manual_apply',
            winnerPrice: null,
            winnerName: null,
            competitorCount: null,
            priceGapToWinner: null
        });

        return res.json({
            success: true,
            data: {
                simulationMode: SIMULATION_MODE,
                offerId,
                oldPrice: offer.price,
                newPrice
            }
        });
    } catch (error) {
        console.error('[APPLY PRICE ERROR]', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.runAutoPricing = async (req, res) => {
    try {
        const account = await getActiveAccount();

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'No active seller account found'
            });
        }

        const [offers, rules, competitorMap] = await Promise.all([
            prisma.offer.findMany({
                where: { sellerAccountId: account.id }
            }),
            prisma.pricingRule.findMany({
                where: {
                    sellerAccountId: account.id,
                    automationEnabled: true
                }
            }),
            getLatestCompetitorStateMap(account.id)
        ]);

        const rulesByTsn = new Map(
            rules.map((rule) => [String(rule.tsn), rule])
        );

        let client = null;

        if (!SIMULATION_MODE) {
            client = buildTakealotClient(account);
        }

        const result = {
            simulationMode: SIMULATION_MODE,
            scanned: 0,
            applied: 0,
            skipped: [],
            failed: [],
            updated: []
        };

        for (const offer of offers) {
            const rule = rulesByTsn.get(String(offer.tsn));

            if (!rule) continue;

            result.scanned++;

            const competitorState = competitorMap.get(String(offer.offerId));
            const competitorCount = competitorState?.competitorCount ?? 0;
            const winnerPrice = competitorState?.winnerPrice ?? null;
            const winnerName = competitorState?.winnerName ?? null;
            const marketState = getMarketState(competitorCount);

            const priceGapToWinner =
                winnerPrice !== null && winnerPrice !== undefined
                    ? Number(offer.price || 0) - Number(winnerPrice)
                    : null;

            const suggestion = calculateSuggestedPrice({
                currentPrice: offer.price,
                winnerPrice,
                benchmarkPrice: offer.benchmarkPrice,
                costPrice: rule.costPrice,
                minPrice: rule.minPrice,
                maxPrice: rule.maxPrice,
                targetMargin: rule.targetMargin,
                pricingMode: rule.pricingMode || 'balanced',
                marketState
            });

            const decision = shouldApplyAutoPrice({
                currentPrice: offer.price,
                suggestedPrice: suggestion.suggestedPrice,
                minPrice: rule.minPrice,
                maxPrice: rule.maxPrice,
                costPrice: rule.costPrice,
                targetMargin: rule.targetMargin,
                cooldownMinutes: 10,
                lastChangedAt: SIMULATION_MODE ? null : rule.lastChangedAt
            });

            if (!decision.apply) {
                await createPriceLog({
                    sellerAccountId: account.id,
                    offer,
                    oldPrice: offer.price,
                    newPrice: suggestion.suggestedPrice,
                    benchmarkPrice: suggestion.benchmarkUsed,
                    strategy: suggestion.strategy,
                    pricingMode: rule.pricingMode || 'balanced',
                    changeSource: SIMULATION_MODE ? 'auto_simulation' : 'auto_run',
                    status: 'skipped',
                    reason: decision.reason,
                    winnerPrice,
                    winnerName,
                    competitorCount,
                    priceGapToWinner
                });

                result.skipped.push({
                    offerId: offer.offerId,
                    tsn: offer.tsn,
                    currentPrice: offer.price,
                    suggestedPrice: suggestion.suggestedPrice,
                    reason: decision.reason,
                    winnerPrice,
                    winnerName,
                    competitorCount,
                    priceGapToWinner
                });

                continue;
            }

            try {
                if (!SIMULATION_MODE) {
                    await client.updateOfferById(offer.offerId, {
                        sku: offer.sku,
                        selling_price: Number(suggestion.suggestedPrice),
                        rrp: offer.rrp ? Number(offer.rrp) : Number(suggestion.suggestedPrice)
                    });
                } else {
                    console.log('[SIMULATED AUTO PRICE UPDATE]', {
                        offerId: offer.offerId,
                        oldPrice: offer.price,
                        newPrice: suggestion.suggestedPrice,
                        winnerPrice,
                        winnerName,
                        competitorCount,
                        priceGapToWinner
                    });
                }

                await prisma.offer.update({
                    where: { id: offer.id },
                    data: {
                        price: Number(suggestion.suggestedPrice)
                    }
                });

                await prisma.pricingRule.update({
                    where: { id: rule.id },
                    data: {
                        lastChangedAt: new Date()
                    }
                });

                await createPriceLog({
                    sellerAccountId: account.id,
                    offer,
                    oldPrice: offer.price,
                    newPrice: suggestion.suggestedPrice,
                    benchmarkPrice: suggestion.benchmarkUsed,
                    strategy: suggestion.strategy,
                    pricingMode: rule.pricingMode || 'balanced',
                    changeSource: SIMULATION_MODE ? 'auto_simulation' : 'auto_run',
                    status: 'applied',
                    reason: SIMULATION_MODE ? `simulated_${suggestion.reason}` : suggestion.reason,
                    winnerPrice,
                    winnerName,
                    competitorCount,
                    priceGapToWinner
                });

                result.applied++;
                result.updated.push({
                    offerId: offer.offerId,
                    tsn: offer.tsn,
                    oldPrice: offer.price,
                    newPrice: suggestion.suggestedPrice,
                    reason: SIMULATION_MODE ? `simulated_${suggestion.reason}` : suggestion.reason,
                    strategy: suggestion.strategy,
                    winnerPrice,
                    winnerName,
                    competitorCount,
                    priceGapToWinner
                });
            } catch (error) {
                await createPriceLog({
                    sellerAccountId: account.id,
                    offer,
                    oldPrice: offer.price,
                    newPrice: suggestion.suggestedPrice,
                    benchmarkPrice: suggestion.benchmarkUsed,
                    strategy: suggestion.strategy,
                    pricingMode: rule.pricingMode || 'balanced',
                    changeSource: SIMULATION_MODE ? 'auto_simulation' : 'auto_run',
                    status: 'failed',
                    reason: error.message,
                    winnerPrice,
                    winnerName,
                    competitorCount,
                    priceGapToWinner
                });

                result.failed.push({
                    offerId: offer.offerId,
                    tsn: offer.tsn,
                    reason: error.message
                });
            }
        }

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[AUTO PRICING ERROR]', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};