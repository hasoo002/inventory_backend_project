const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProducts, getProduct, createProduct,
  updateProduct, deleteProduct, getLowStockProducts
} = require('../controllers/productController');

router.use(protect);
router.get('/low-stock', getLowStockProducts);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;