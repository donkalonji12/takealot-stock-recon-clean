// backend/src/routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

router.post('/takealot', async (req, res, next) => {
    try {
        // NOTE: req.body is a raw buffer here because of express.raw() in app.js
        const rawPayload = req.body;
        const signature = req.headers['x-takealot-signature'] || 'unknown'; // Example
        
        // TODO: Validate webhook signature using process.env.WEBHOOK_SECRET

        const parsedPayload = JSON.parse(rawPayload.toString());
        
        // Save the webhook event for async processing or audit trail
        const storedWebhook = await prisma.webhookEvent.create({
            data: {
                sellerAccountId: "DEFAULT", // TODO: lookup seller account by payload details
                eventType: parsedPayload.event_type || 'Unknown',
                eventId: parsedPayload.event_id || null,
                payload: parsedPayload,
                processed: false
            }
        });

        // Respond immediately to Takealot to prevent timeouts
        res.status(202).json({ success: true, message: 'Webhook received' });

        // TODO: Fire off async worker to process the webhook (update Sale/Offer records in DB)

    } catch (err) {
        next(err);
    }
});

module.exports = router;
