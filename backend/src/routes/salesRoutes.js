const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.get('/', salesController.getSales);
router.post('/sync', salesController.syncSales);

module.exports = router;