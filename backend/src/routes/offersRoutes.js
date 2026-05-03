const express = require('express');
const router = express.Router();
const offersController = require('../controllers/offersController');

router.get('/', offersController.getOffers);
router.post('/sync', offersController.syncOffers);

module.exports = router;