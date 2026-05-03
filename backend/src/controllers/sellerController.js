const prisma = require('../config/db');
const TakealotApiClient = require('../services/takealotApi');
const { encrypt } = require('../config/encryption');

exports.connectAccount = async (req, res) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey || !String(apiKey).trim()) {
            return res.status(400).json({
                success: false,
                error: 'apiKey is required'
            });
        }

        const client = new TakealotApiClient({
            rawKey: String(apiKey).trim()
        });

        const sellerData = await client.verifyConnection();

        const sellerId = sellerData.seller_id || sellerData.id || null;
        const storeName =
            sellerData.seller_name ||
            sellerData.display_name ||
            sellerData.name ||
            `Store ${sellerId || 'Unknown'}`;

        const encrypted = encrypt(String(apiKey).trim());

        const existing = sellerId
            ? await prisma.sellerAccount.findFirst({
                where: {
                    OR: [
                        { sellerId: Number(sellerId) },
                        { isActive: true }
                    ]
                }
            })
            : await prisma.sellerAccount.findFirst({
                where: { isActive: true }
            });

        let account;

        if (existing) {
            account = await prisma.sellerAccount.update({
                where: { id: existing.id },
                data: {
                    sellerId: sellerId ? Number(sellerId) : existing.sellerId,
                    storeName,
                    encryptedApiKey: encrypted.encryptedData,
                    encryptionIv: encrypted.iv,
                    isActive: true
                }
            });
        } else {
            account = await prisma.sellerAccount.create({
                data: {
                    sellerId: sellerId ? Number(sellerId) : null,
                    storeName,
                    encryptedApiKey: encrypted.encryptedData,
                    encryptionIv: encrypted.iv,
                    isActive: true
                }
            });
        }

        return res.json({
            success: true,
            data: {
                seller_id: account.sellerId,
                seller_name: account.storeName,
                status: sellerData.status || 'Active'
            }
        });
    } catch (error) {
        console.error('Seller Connect Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getConnectedSeller = async (req, res) => {
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

        return res.json({
            success: true,
            data: {
                seller_id: account.sellerId,
                seller_name: account.storeName,
                status: 'Active'
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.disconnectAccount = async (req, res) => {
    try {
        const account = await prisma.sellerAccount.findFirst({
            where: { isActive: true }
        });

        if (!account) {
            return res.json({
                success: true,
                data: { disconnected: true }
            });
        }

        await prisma.sellerAccount.update({
            where: { id: account.id },
            data: { isActive: false }
        });

        return res.json({
            success: true,
            data: { disconnected: true }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.verifyConnection = async (req, res) => {
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

        const client = new TakealotApiClient({
            encryptedKey: account.encryptedApiKey,
            iv: account.encryptionIv
        });

        const sellerData = await client.verifyConnection();

        return res.json({
            success: true,
            data: sellerData
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};