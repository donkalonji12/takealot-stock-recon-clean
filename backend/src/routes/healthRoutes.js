// backend/src/routes/healthRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

router.get('/', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ success: true, data: { status: 'healthy', db: 'connected' } });
    } catch (err) {
        res.status(503).json({ success: false, error: 'Database disconnected' });
    }
});

module.exports = router;
