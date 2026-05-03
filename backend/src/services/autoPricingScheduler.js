const prisma = require('../config/db');
const TakealotApiClient = require('./takealotApi');
const {
    calculateSuggestedPrice,
    shouldApplyAutoPrice,
    isCooldownActive
} = require('./pricingEngine');
const {
    estimateCompetitorCount,
    getMarketState,
    detectMarketChange
} = require('./competitorEngine');

let schedulerHandle = null;
let isRunning = false;

async function runAutoPricingJob() {
    if (isRunning) {
        console.log('[AUTO PRICING SCHEDULER] Previous run still in progress. Skipping.');
        return;
    }

    isRunning = true;

    try {
        console.log('[AUTO PRICING SCHEDULER] Run started at', new Date().toISOString());

        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true }
        });

        if (!account) {
            console.log('[AUTO PRICING SCHEDULER] No active seller account found.');
            return;
        }

        const rules = await prisma.pricingRule.findMany({
            where: {
                sellerAccountId: account.id,
                automationEnabled: true
            }
        });

        if (!rules.length) {
            console.log('[AUTO PRICING SCHEDULER] No automation-enabled pricing rules found.');
            return;
        }

        const offers = await prisma.offer.findMany({
            where: { sellerAccountId: account.id }
        });

        const offerByTsn = new Map(
            offers
                .filter((o) => o.tsn)
                .map((o) => [String(o.tsn), o])
        );

        const client = new TakealotApiClient({
            encryptedKey: account.encryptedApiKey,
            iv: account.encryptionIv
        });

        const cooldownMinutes = Number(process.env.AUTO_PRICING_COOLDOWN_MINUTES || 60);
        const minDiff = Number(process.env.AUTO_PRICING_MIN_DIFF || 5);

        let scanned = 0;
        let applied = 0;
        let skipped = 0;

        for (const rule of rules) {
            scanned += 1;

            const offer = offerByTsn.get(String(rule.tsn));

            if (!offer || !offer.offerId || !offer.sku) {
                skipped += 1;
                console.log('[AUTO PRICING SCHEDULER] Skipped:', {
                    tsn: rule.tsn,
                    reason: 'offer_not_found_or_missing_identifier'
                });
                continue;
            }

            const estimatedCount = estimateCompetitorCount({
                yourPrice: offer.price,
                benchmarkPrice: offer.benchmarkPrice
            });

            const marketState = getMarketState(estimatedCount);

            const currentSnapshot = {
                benchmarkPrice: offer.benchmarkPrice,
                marketState
            };

            const previousSnapshot = await prisma.competitorSnapshot.findFirst({
                where: {
                    sellerAccountId: account.id,
                    tsn: String(rule.tsn)
                },
                orderBy: { createdAt: 'desc' }
            });

            const hasMarketChanged = detectMarketChange(previousSnapshot, currentSnapshot);

            if (!hasMarketChanged) {
                skipped += 1;
                console.log('[AUTO PRICING SCHEDULER] Skipped:', {
                    offerId: offer.offerId,
                    tsn: rule.tsn,
                    reason: 'no_market_change'
                });
                continue;
            }

            const lastLog = await prisma.priceChangeLog.findFirst({
                where: {
                    sellerAccountId: account.id,
                    offerId: String(offer.offerId),
                    status: 'applied'
                },
                orderBy: { createdAt: 'desc' }
            });

            if (isCooldownActive(lastLog?.createdAt, cooldownMinutes)) {
                skipped += 1;
                console.log('[AUTO PRICING SCHEDULER] Skipped:', {
                    offerId: offer.offerId,
                    tsn: rule.tsn,
                    reason: 'cooldown_active'
                });
                continue;
            }

            const suggestion = calculateSuggestedPrice({
                currentPrice: offer.price,
                costPrice: rule.costPrice,
                minPrice: rule.minPrice,
                maxPrice: rule.maxPrice,
                targetMargin: rule.targetMargin,
                benchmarkPrice: offer.benchmarkPrice,
                pricingMode: rule.pricingMode || 'balanced',
                marketState
            });

            const decision = shouldApplyAutoPrice({
                currentPrice: offer.price,
                suggestedPrice: suggestion.suggestedPrice,
                minDiff
            });

            if (!decision.apply) {
                skipped += 1;
                console.log('[AUTO PRICING SCHEDULER] Skipped:', {
                    offerId: offer.offerId,
                    tsn: rule.tsn,
                    currentPrice: offer.price,
                    suggestedPrice: suggestion.suggestedPrice,
                    marketState,
                    estimatedCount,
                    reason: decision.reason
                });
                continue;
            }

            const patchPayload = {
                sku: offer.sku,
                selling_price: Math.round(suggestion.suggestedPrice)
            };

            if (
                offer.rawTakealotData?.minimum_leadtime_days !== undefined &&
                offer.rawTakealotData?.minimum_leadtime_days !== null
            ) {
                patchPayload.minimum_leadtime_days = offer.rawTakealotData.minimum_leadtime_days;
            }

            if (
                offer.rawTakealotData?.rrp !== undefined &&
                offer.rawTakealotData?.rrp !== null
            ) {
                patchPayload.rrp = offer.rawTakealotData.rrp;
            }

            try {
                const apiResponse = await client.updateOfferById(offer.offerId, patchPayload);

                await prisma.offer.update({
                    where: {
                        sellerAccountId_offerId: {
                            sellerAccountId: account.id,
                            offerId: String(offer.offerId)
                        }
                    },
                    data: {
                        price: Number(suggestion.suggestedPrice),
                        rawTakealotData: {
                            ...(offer.rawTakealotData || {}),
                            ...apiResponse
                        }
                    }
                });

                await prisma.competitorSnapshot.create({
                    data: {
                        sellerAccountId: account.id,
                        tsn: String(rule.tsn),
                        benchmarkPrice: offer.benchmarkPrice,
                        yourPrice: Number(suggestion.suggestedPrice),
                        estimatedCount,
                        marketState
                    }
                });

                applied += 1;

                console.log('[AUTO PRICING SCHEDULER] Applied:', {
                    offerId: offer.offerId,
                    tsn: rule.tsn,
                    oldPrice: offer.price,
                    newPrice: suggestion.suggestedPrice,
                    strategy: suggestion.strategy,
                    marketState,
                    estimatedCount
                });
            } catch (error) {
                skipped += 1;
                console.log('[AUTO PRICING SCHEDULER] API error:', {
                    offerId: offer.offerId,
                    tsn: rule.tsn,
                    error: error.message
                });
            }
        }

        console.log('[AUTO PRICING SCHEDULER] Run finished:', {
            scanned,
            applied,
            skipped
        });
    } catch (error) {
        console.error('[AUTO PRICING SCHEDULER] Fatal error:', error);
    } finally {
        isRunning = false;
    }
}

function startAutoPricingScheduler() {
    const enabled = String(process.env.AUTO_PRICING_ENABLED || 'false').toLowerCase() === 'true';

    if (!enabled) {
        console.log('[AUTO PRICING SCHEDULER] Disabled via AUTO_PRICING_ENABLED env.');
        return;
    }

    const minutes = Number(process.env.AUTO_PRICING_INTERVAL_MINUTES || 15);

    if (!Number.isFinite(minutes) || minutes <= 0) {
        console.log('[AUTO PRICING SCHEDULER] Invalid AUTO_PRICING_INTERVAL_MINUTES. Scheduler not started.');
        return;
    }

    const intervalMs = minutes * 60 * 1000;

    if (schedulerHandle) {
        clearInterval(schedulerHandle);
    }

    schedulerHandle = setInterval(runAutoPricingJob, intervalMs);

    console.log(`[AUTO PRICING SCHEDULER] Started. Running every ${minutes} minute(s).`);

    if (String(process.env.AUTO_PRICING_RUN_ON_START || 'false').toLowerCase() === 'true') {
        runAutoPricingJob().catch((err) => {
            console.error('[AUTO PRICING SCHEDULER] Initial run failed:', err);
        });
    }
}

function stopAutoPricingScheduler() {
    if (schedulerHandle) {
        clearInterval(schedulerHandle);
        schedulerHandle = null;
        console.log('[AUTO PRICING SCHEDULER] Stopped.');
    }
}

module.exports = {
    startAutoPricingScheduler,
    stopAutoPricingScheduler,
    runAutoPricingJob
};