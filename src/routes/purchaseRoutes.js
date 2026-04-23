const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { query, pool } = require('../config/database');

router.use(protect);

router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { items, supplier_name, notes } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Purchase must include at least one item' });
    }
    await client.query('BEGIN');
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const purchaseResult = await client.query(
      'INSERT INTO purchases (user_id, total_amount, supplier_name, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, totalAmount, supplier_name, notes]
    );
    const purchase = purchaseResult.rows[0];
    for (const item of items) {
      await client.query(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost) VALUES ($1, $2, $3, $4)',
        [purchase.id, item.product_id, item.quantity, item.unit_cost]
      );
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2 AND user_id = $3',
        [item.quantity, item.product_id, req.user.id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Purchase recorded', purchase });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM purchases WHERE user_id = $1 ORDER BY purchase_date DESC', [req.user.id]);
    res.json({ success: true, purchases: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;