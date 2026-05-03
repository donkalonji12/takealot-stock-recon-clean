const prisma = require('../config/db');
const TakealotApiClient = require('./takealotApi');
const {
    estimateCompetitorCount,
    getMarketState
} = require('./competitorEngine');

class SyncService {
    static _safeNumber(value, fallback = null) {
        if (value === null || value === undefined || value === '') return fallback;
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    static _safeDate(value) {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    static _extractArray(payload, keys = []) {
        if (Array.isArray(payload)) return payload;

        for (const key of keys) {
            if (Array.isArray(payload?.[key])) {
                return payload[key];
            }
        }

        return [];
    }

    static _extractNextToken(payload) {
        return (
            payload?.next_token ||
            payload?.nextToken ||
            payload?.continuation_token ||
            payload?.continuationToken ||
            null
        );
    }

    static async _aquireSyncLock(sellerAccountId, moduleSynced) {
        const existing = await prisma.syncRun.findFirst({
            where: {
                sellerAccountId,
                moduleSynced,
                status: 'IN_PROGRESS'
            }
        });

        if (existing) return null;

        return prisma.syncRun.create({
            data: {
                sellerAccountId,
                moduleSynced,
                status: 'IN_PROGRESS'
            }
        });
    }

    static async syncOffers(sellerAccountId) {
        let syncRun;

        try {
            const account = await prisma.sellerAccount.findUnique({
                where: { id: sellerAccountId }
            });

            if (!account) throw new Error('Account not found');

            syncRun = await this._aquireSyncLock(sellerAccountId, 'OFFERS');
            if (!syncRun) return { success: false, reason: 'LOCKED' };

            const client = new TakealotApiClient({
                encryptedKey: account.encryptedApiKey,
                iv: account.encryptionIv
            });

            let pageToken = null;
            let totalSaved = 0;
            let totalFetched = 0;
            let pages = 0;

            do {
                const payload = await client.fetchOffers(pageToken);
                const items = this._extractArray(payload, ['offers', 'items', 'results']);

                pages += 1;
                totalFetched += items.length;

                for (const item of items) {
                    const offerId = String(
                        item.offer_id ||
                        item.offerId ||
                        item.id ||
                        ''
                    );

                    if (!offerId) continue;

                    const mappedPrice = this._safeNumber(
                        item.price ??
                        item.selling_price ??
                        item.sale_price ??
                        item.current_price ??
                        item.list_price,
                        0
                    );

                    const mappedBenchmarkPrice = this._safeNumber(
                        item.benchmark_price,
                        null
                    );

                    const mappedListingQuality = this._safeNumber(
                        item.listing_quality,
                        null
                    );

                    const mappedConversionRate = this._safeNumber(
                        item.conversion_percentage_30_days ??
                        item.conversion_rate_30_days,
                        null
                    );

                    const mappedTsn =
                        item.tsn?.toString() ||
                        item.tsin?.toString() ||
                        item.tsin_id?.toString() ||
                        null;

                    const mappedSku = item.sku?.toString() || null;

                    const savedOffer = await prisma.offer.upsert({
                        where: {
                            sellerAccountId_offerId: {
                                sellerAccountId: account.id,
                                offerId
                            }
                        },
                        update: {
                            tsn: mappedTsn,
                            sku: mappedSku,
                            title: item.title || item.product_title || item.name || 'Unknown Product',
                            price: mappedPrice,
                            stock: this._safeNumber(
                                item.stock_available ??
                                item.stock ??
                                item.quantity,
                                null
                            ),
                            status: item.status || null,
                            benchmarkPrice: mappedBenchmarkPrice,
                            listingQuality: mappedListingQuality,
                            conversionRate: mappedConversionRate,
                            rawTakealotData: item
                        },
                        create: {
                            sellerAccountId: account.id,
                            offerId,
                            tsn: mappedTsn,
                            sku: mappedSku,
                            title: item.title || item.product_title || item.name || 'Unknown Product',
                            price: mappedPrice,
                            stock: this._safeNumber(
                                item.stock_available ??
                                item.stock ??
                                item.quantity,
                                null
                            ),
                            status: item.status || null,
                            benchmarkPrice: mappedBenchmarkPrice,
                            listingQuality: mappedListingQuality,
                            conversionRate: mappedConversionRate,
                            rawTakealotData: item
                        }
                    });

                    if (savedOffer.tsn) {
                        const competitorCount = estimateCompetitorCount({
                            yourPrice: savedOffer.price,
                            benchmarkPrice: savedOffer.benchmarkPrice
                        });

                        const marketState = getMarketState(competitorCount);

                        await prisma.competitorSnapshot.create({
                            data: {
                                sellerAccountId: account.id,
                                tsn: savedOffer.tsn,
                                benchmarkPrice: savedOffer.benchmarkPrice,
                                yourPrice: savedOffer.price,
                                estimatedCount: competitorCount,
                                marketState
                            }
                        });
                    }

                    totalSaved += 1;
                }

                pageToken = this._extractNextToken(payload);
            } while (pageToken);

            await prisma.syncRun.update({
                where: { id: syncRun.id },
                data: {
                    status: 'SUCCESS',
                    recordsFetched: totalFetched,
                    completedAt: new Date()
                }
            });

            return {
                success: true,
                recordsFetched: totalFetched,
                recordsSaved: totalSaved,
                pages
            };
        } catch (error) {
            if (syncRun) {
                await prisma.syncRun.update({
                    where: { id: syncRun.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: error.message,
                        completedAt: new Date()
                    }
                });
            }

            throw error;
        }
    }

    static async syncReturns(sellerAccountId) {
        let syncRun;

        try {
            const account = await prisma.sellerAccount.findUnique({
                where: { id: sellerAccountId }
            });

            if (!account) throw new Error('Account not found');

            syncRun = await this._aquireSyncLock(sellerAccountId, 'RETURNS');
            if (!syncRun) return { success: false, reason: 'LOCKED' };

            const client = new TakealotApiClient({
                encryptedKey: account.encryptedApiKey,
                iv: account.encryptionIv
            });

            let pageToken = null;
            let totalSaved = 0;
            let totalFetched = 0;
            let pages = 0;

            do {
                const payload = await client.fetchReturns({
                    pageToken
                });

                const items = this._extractArray(payload, ['returns', 'items', 'results']);

                pages += 1;
                totalFetched += items.length;

                for (const item of items) {
                    const returnReferenceNumber = String(
                        item.return_reference_number ||
                        item.returnReferenceNumber ||
                        item.reference_number ||
                        item.reference ||
                        ''
                    );

                    if (!returnReferenceNumber) continue;

                    await prisma.return.upsert({
                        where: {
                            sellerAccountId_returnReferenceNumber: {
                                sellerAccountId: account.id,
                                returnReferenceNumber
                            }
                        },
                        update: {
                            sellerReturnId: item.seller_return_id?.toString() || item.id?.toString() || null,
                            orderId: item.order_id?.toString() || null,
                            offerId: item.offer_id?.toString() || null,
                            sku: item.sku?.toString() || null,
                            tsin: item.tsin_id?.toString() || item.tsn?.toString() || null,
                            productTitle: item.title || item.product_title || 'Unknown Product',
                            returnDate: this._safeDate(item.return_date),
                            status: item.status || null,
                            customerComment: item.customer_comment || null,
                            returnReason: item.return_reason || item.reason || null,
                            rawPayloadJson: item
                        },
                        create: {
                            sellerAccountId: account.id,
                            sellerReturnId: item.seller_return_id?.toString() || item.id?.toString() || null,
                            returnReferenceNumber,
                            orderId: item.order_id?.toString() || null,
                            offerId: item.offer_id?.toString() || null,
                            sku: item.sku?.toString() || null,
                            tsin: item.tsin_id?.toString() || item.tsn?.toString() || null,
                            productTitle: item.title || item.product_title || 'Unknown Product',
                            returnDate: this._safeDate(item.return_date),
                            status: item.status || null,
                            customerComment: item.customer_comment || null,
                            returnReason: item.return_reason || item.reason || null,
                            rawPayloadJson: item
                        }
                    });

                    totalSaved += 1;
                }

                pageToken = this._extractNextToken(payload);
            } while (pageToken);

            await prisma.syncRun.update({
                where: { id: syncRun.id },
                data: {
                    status: 'SUCCESS',
                    recordsFetched: totalFetched,
                    completedAt: new Date()
                }
            });

            return {
                success: true,
                recordsFetched: totalFetched,
                recordsSaved: totalSaved,
                pages
            };
        } catch (error) {
            if (syncRun) {
                await prisma.syncRun.update({
                    where: { id: syncRun.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: error.message,
                        completedAt: new Date()
                    }
                });
            }

            throw error;
        }
    }

    static async syncSales(sellerAccountId) {
        let syncRun;

        try {
            const account = await prisma.sellerAccount.findUnique({
                where: { id: sellerAccountId }
            });

            if (!account) throw new Error('Account not found');

            syncRun = await this._aquireSyncLock(sellerAccountId, 'SALES');
            if (!syncRun) return { success: false, reason: 'LOCKED' };

            const client = new TakealotApiClient({
                encryptedKey: account.encryptedApiKey,
                iv: account.encryptionIv
            });

            let pageToken = null;
            let totalSaved = 0;
            let totalFetched = 0;
            let pages = 0;

            do {
                const payload = await client.fetchSales(pageToken);
                const items = this._extractArray(payload, ['sales', 'items', 'results']);

                pages += 1;
                totalFetched += items.length;

                for (const item of items) {
                    const orderId = String(item.order_id || item.orderId || '');
                    const tsn = String(item.tsin_id || item.tsn || '');

                    if (!orderId || !tsn) continue;

                    await prisma.sale.upsert({
                        where: {
                            sellerAccountId_orderId_tsn: {
                                sellerAccountId: account.id,
                                orderId,
                                tsn
                            }
                        },
                        update: {
                            orderDate: this._safeDate(item.order_date) || new Date(),
                            orderItemStatus: item.sale_status || item.status || 'unknown',
                            productTitle: item.title || item.product_title || 'Unknown Product',
                            sellingPrice: this._safeNumber(item.selling_price, 0),
                            rawTakealotData: item
                        },
                        create: {
                            sellerAccountId: account.id,
                            orderId,
                            orderDate: this._safeDate(item.order_date) || new Date(),
                            orderItemStatus: item.sale_status || item.status || 'unknown',
                            tsn,
                            productTitle: item.title || item.product_title || 'Unknown Product',
                            sellingPrice: this._safeNumber(item.selling_price, 0),
                            rawTakealotData: item
                        }
                    });

                    totalSaved += 1;
                }

                pageToken = this._extractNextToken(payload);
            } while (pageToken);

            await prisma.syncRun.update({
                where: { id: syncRun.id },
                data: {
                    status: 'SUCCESS',
                    recordsFetched: totalFetched,
                    completedAt: new Date()
                }
            });

            return {
                success: true,
                recordsFetched: totalFetched,
                recordsSaved: totalSaved,
                pages
            };
        } catch (error) {
            if (syncRun) {
                await prisma.syncRun.update({
                    where: { id: syncRun.id },
                    data: {
                        status: 'FAILED',
                        errorMessage: error.message,
                        completedAt: new Date()
                    }
                });
            }

            throw error;
        }
    }
}

module.exports = SyncService;