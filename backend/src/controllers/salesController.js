const SyncService = require('../services/syncService');
const prisma = require('../config/db');

exports.syncSales = async (req, res) => {
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

        const result = await SyncService.syncSales(account.id);

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Sales Sync Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getSales = async (req, res) => {
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

        const items = await prisma.sale.findMany({
            where: { sellerAccountId: account.id },
            orderBy: { orderDate: 'desc' }
        });

        return res.json({
            success: true,
            items
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};