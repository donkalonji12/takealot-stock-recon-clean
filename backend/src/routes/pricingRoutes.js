const express = require('express');
const router = express.Router();

const pricingController = require('../controllers/pricingController');

router.get('/', pricingController.getPricingRules);
router.post('/', pricingController.savePricingRule);

router.get('/logs', pricingController.getPriceLogs);

router.post('/apply', pricingController.applyPrice);

router.post('/auto-run', pricingController.runAutoPricing);

module.exports = router;