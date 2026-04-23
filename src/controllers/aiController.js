const { detectIntent, extractEntities, generateResponse } = require('../services/aiService');
const { query, pool } = require('../config/database');

const processVoiceInput = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { text } = req.body;
    const userId = req.user.id;
    if (!text) {
      return res.status(400).json({ success: false, message: 'No text provided' });
    }
    const intentResult = await detectIntent(text);
    const { intent } = intentResult;
    const entities = await extractEntities(text, intent);
    let actionResult = null;
    let aiResponse = '';

    if (intent === 'record_sale' && entities.product_name) {
      const productResult = await query(
        'SELECT * FROM products WHERE LOWER(name) ILIKE $1 AND user_id = $2 LIMIT 1',
        [`%${entities.product_name.toLowerCase()}%`, userId]
      );
      if (productResult.rows.length === 0) {
        aiResponse = `I couldn't find a product named "${entities.product_name}" in your inventory.`;
      } else {
        const product = productResult.rows[0];
        const quantity = entities.quantity || 1;
        const unitPrice = entities.unit_price || product.unit_price;
        await client.query('BEGIN');
        const saleResult = await client.query(
          'INSERT INTO sales (user_id, total_amount, input_method) VALUES ($1, $2, $3) RETURNING *',
          [userId, quantity * unitPrice, 'voice']
        );
        await client.query(
          'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
          [saleResult.rows[0].id, product.id, quantity, unitPrice]
        );
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [quantity, product.id]
        );
        await client.query('COMMIT');
        actionResult = { product: product.name, quantity, total: quantity * unitPrice };
        aiResponse = await generateResponse('sale_recorded', actionResult);
      }
    } else if (intent === 'check_stock' && entities.product_name) {
      const productResult = await query(
        'SELECT name, stock_quantity FROM products WHERE LOWER(name) ILIKE $1 AND user_id = $2 LIMIT 1',
        [`%${entities.product_name.toLowerCase()}%`, userId]
      );
      if (productResult.rows.length > 0) {
        aiResponse = await generateResponse('stock_check', productResult.rows[0]);
      } else {
        aiResponse = `Product "${entities.product_name}" not found in your inventory.`;
      }
    } else if (intent === 'get_analytics') {
      const salesData = await query(
        `SELECT SUM(total_amount) as revenue, COUNT(*) as transactions
         FROM sales WHERE user_id = $1 AND sale_date >= NOW() - INTERVAL '7 days'`,
        [userId]
      );
      aiResponse = await generateResponse('analytics_summary', salesData.rows[0]);
    } else {
      aiResponse = "I'm sorry, I didn't understand that. Could you rephrase?";
    }

    await query(
      'INSERT INTO voice_logs (user_id, original_text, detected_intent, ai_response) VALUES ($1, $2, $3, $4)',
      [userId, text, intent, aiResponse]
    );

    res.json({ success: true, input: text, intent, entities, response: aiResponse, data: actionResult });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

const getVoiceLogs = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM voice_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, logs: result.rows });
  } catch (err) { next(err); }
};

module.exports = { processVoiceInput, getVoiceLogs };