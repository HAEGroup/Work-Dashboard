const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

// Apply auth middleware to all settings routes
router.use(auth);

// GET / - get all settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, value, updated_at FROM settings ORDER BY key'
    );

    res.json({ settings: result.rows });
  } catch (error) {
    console.error('List settings error:', error);
    res.status(500).json({ message: 'Server error fetching settings' });
  }
});

// GET /:key - get a single setting
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const result = await pool.query(
      'SELECT key, value, updated_at FROM settings WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json({ setting: result.rows[0] });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ message: 'Server error fetching setting' });
  }
});

// PUT /:key - update a setting (admin only)
router.put('/:key', requireRole('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ message: 'Setting value is required' });
    }

    const result = await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value)]
    );

    res.json({
      message: 'Setting updated successfully',
      setting: result.rows[0]
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Server error updating setting' });
  }
});

module.exports = router;
