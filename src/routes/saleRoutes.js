const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createSale, getSales, getSalesSummary } = require('../controllers/saleController');

router.use(protect);
router.get('/summary', getSalesSummary);
router.get('/', getSales);
router.post('/', createSale);

module.exports = router;