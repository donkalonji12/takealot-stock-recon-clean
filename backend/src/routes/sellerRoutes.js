const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.post('/connect', sellerController.connectAccount);
router.get('/connected', sellerController.getConnectedSeller);
router.post('/disconnect', sellerController.disconnectAccount);
router.get('/verify', sellerController.verifyConnection);

module.exports = router;