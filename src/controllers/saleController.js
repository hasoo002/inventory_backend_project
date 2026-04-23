const { query, pool } = require('../config/database');

const createSale = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { items, notes, input_method } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sale must include at least one item' });
    }
    await client.query('BEGIN');
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const saleResult = await client.query(
      'INSERT INTO sales (user_id, total_amount, notes, input_method) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, totalAmount, notes, input_method || 'manual']
    );
    const sale = saleResult.rows[0];
    for (const item of items) {
      await client.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [sale.id, item.product_id, item.quantity, item.unit_price]
      );
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND user_id = $3',
        [item.quantity, item.product_id, req.user.id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Sale recorded', sale });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const getSales = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, 
        json_agg(json_build_object(
          'product_id', si.product_id,
          'product_name', p.name,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'subtotal', si.subtotal
        )) as items
       FROM sales s
       LEFT JOIN sale_items si ON s.id = si.sale_id
       LEFT JOIN products p ON si.product_id = p.id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.sale_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, count: result.rows.length, sales: result.rows });
  } catch (err) { next(err); }
};

const getSalesSummary = async (req, res, next) => {
  try {
    const summary = await query(
      `SELECT 
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_sale_value,
        DATE_TRUNC('day', sale_date) as day
       FROM sales
       WHERE user_id = $1 AND sale_date >= NOW() - INTERVAL '30 days'
       GROUP BY day
       ORDER BY day ASC`,
      [req.user.id]
    );
    res.json({ success: true, summary: summary.rows });
  } catch (err) { next(err); }
};

module.exports = { createSale, getSales, getSalesSummary };