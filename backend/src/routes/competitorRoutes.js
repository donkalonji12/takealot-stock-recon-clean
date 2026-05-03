const express = require('express');
const router = express.Router();
const controller = require('../controllers/competitorController');

router.post('/mock/generate', controller.generateMockData);
router.get('/latest', controller.getLatestState);

module.exports = router;