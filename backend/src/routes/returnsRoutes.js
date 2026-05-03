// backend/src/routes/returnsRoutes.js
const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');

router.get('/', returnsController.getReturns);
router.get('/summary', returnsController.getSummary);
router.post('/sync', returnsController.triggerSync);

module.exports = router;
