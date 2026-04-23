const { Pool } = require('pg');

// Hardcode connection details directly to fix the issue
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'inventory_db',
  user: 'postgres',
  password: 'admin123',
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };