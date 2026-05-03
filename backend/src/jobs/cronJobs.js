// backend/src/jobs/cronJobs.js
const cron = require('node-cron');
const prisma = require('../config/db');
const SyncService = require('../services/syncService');

function init() {
    if (process.env.DISABLE_CRON === 'true') {
        console.log('[CRON] Scheduled jobs disabled via DISABLE_CRON env flag.');
        return;
    }

    console.log('[CRON] Initializing background sync scheduler...');

    // Helper to run a specific sync method for all active accounts without crashing
    const runForActiveAccounts = async (syncMethodName) => {
        try {
            const activeAccounts = await prisma.sellerAccount.findMany({
                where: { isActive: true }
            });

            for (const account of activeAccounts) {
                try {
                    await SyncService[syncMethodName](account.id);
                } catch (err) {
                    console.error(`[CRON] Unhandled error running ${syncMethodName} for account ${account.id}:`, err);
                }
            }
        } catch (globalErr) {
            console.error(`[CRON] Fatal error checking active accounts for ${syncMethodName}:`, globalErr);
        }
    };

    // 1. Returns Sync - Every 10 Minutes
    cron.schedule('*/10 * * * *', () => {
        console.log('[CRON TRIGGER] Executing Returns Sync...');
        runForActiveAccounts('syncReturns');
    });

    // 2. Sales Sync - Every 10 Minutes
    // Offset slightly by making it run on a specific 10 min window to avoid immediate CPU spikes?
    // Using standard */10 runs at the same time as Returns. That's fine since SyncService handles locks.
    cron.schedule('*/10 * * * *', () => {
        console.log('[CRON TRIGGER] Executing Sales Sync...');
        runForActiveAccounts('syncSales');
    });

    // 3. Transactions Sync - Every 15 Minutes
    cron.schedule('*/15 * * * *', () => {
        console.log('[CRON TRIGGER] Executing Transactions Sync...');
        runForActiveAccounts('syncTransactions');
    });

    console.log('[CRON] Background sync scheduler successfully bound to 10m/15m intervals.');
}

module.exports = { init };
