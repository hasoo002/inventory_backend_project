const { query } = require('../config/database');

const getProducts = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, c.name as category_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.user_id = $1
       ORDER BY p.name ASC`,
      [req.user.id]
    );
    res.json({ success: true, count: result.rows.length, products: result.rows });
  } catch (err) { next(err); }
};

const getProduct = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM products WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  try {
    const { name, sku, category_id, stock_quantity, unit_price, low_stock_threshold } = req.body;
    if (!name || !unit_price) {
      return res.status(400).json({ success: false, message: 'Product name and price are required' });
    }
    const result = await query(
      `INSERT INTO products (name, sku, category_id, user_id, stock_quantity, unit_price, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, sku, category_id, req.user.id, stock_quantity || 0, unit_price, low_stock_threshold || 10]
    );
    res.status(201).json({ success: true, message: 'Product created', product: result.rows[0] });
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  try {
    const { name, sku, category_id, stock_quantity, unit_price, low_stock_threshold } = req.body;
    const existing = await query(
      'SELECT id FROM products WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const result = await query(
      `UPDATE products SET 
        name = COALESCE($1, name),
        sku = COALESCE($2, sku),
        category_id = COALESCE($3, category_id),
        stock_quantity = COALESCE($4, stock_quantity),
        unit_price = COALESCE($5, unit_price),
        low_stock_threshold = COALESCE($6, low_stock_threshold),
        updated_at = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [name, sku, category_id, stock_quantity, unit_price, low_stock_threshold, req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Product updated', product: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) { next(err); }
};

const getLowStockProducts = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM products WHERE user_id = $1 AND stock_quantity <= low_stock_threshold ORDER BY stock_quantity ASC',
      [req.user.id]
    );
    res.json({ success: true, count: result.rows.length, products: result.rows });
  } catch (err) { next(err); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getLowStockProducts };