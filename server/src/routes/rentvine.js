const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all rentvine routes
router.use(auth);

// GET /metrics - get rentvine metrics
router.get('/metrics', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rm.*, u.first_name AS updater_first_name, u.last_name AS updater_last_name
       FROM rentvine_metrics rm
       LEFT JOIN users u ON u.id = rm.updated_by
       ORDER BY rm.updated_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({
        metrics: {
          units_managed: 0,
          open_maintenance: 0,
          vacancy_count: 0,
          updated_at: null
        }
      });
    }

    res.json({ metrics: result.rows[0] });
  } catch (error) {
    console.error('Get rentvine metrics error:', error);
    res.status(500).json({ message: 'Server error fetching rentvine metrics' });
  }
});

// PUT /metrics - update rentvine metrics manually
router.put('/metrics', async (req, res) => {
  try {
    const { units_managed, open_maintenance, vacancy_count } = req.body;

    // Check if metrics row exists
    const existing = await pool.query('SELECT id FROM rentvine_metrics LIMIT 1');

    let result;
    if (existing.rows.length > 0) {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      if (units_managed !== undefined) { fields.push(`units_managed = $${paramIndex++}`); values.push(units_managed); }
      if (open_maintenance !== undefined) { fields.push(`open_maintenance = $${paramIndex++}`); values.push(open_maintenance); }
      if (vacancy_count !== undefined) { fields.push(`vacancy_count = $${paramIndex++}`); values.push(vacancy_count); }

      if (fields.length === 0) {
        return res.status(400).json({ message: 'No fields provided to update' });
      }

      fields.push(`updated_by = $${paramIndex++}`);
      values.push(req.user.id);
      fields.push(`updated_at = NOW()`);

      values.push(existing.rows[0].id);

      result = await pool.query(
        `UPDATE rentvine_metrics SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
    } else {
      result = await pool.query(
        `INSERT INTO rentvine_metrics (units_managed, open_maintenance, vacancy_count, updated_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [units_managed || 0, open_maintenance || 0, vacancy_count || 0, req.user.id]
      );
    }

    res.json({
      message: 'Rentvine metrics updated successfully',
      metrics: result.rows[0]
    });
  } catch (error) {
    console.error('Update rentvine metrics error:', error);
    res.status(500).json({ message: 'Server error updating rentvine metrics' });
  }
});

// GET /config - get Rentvine URL config
router.get('/config', async (req, res) => {
  try {
    res.json({
      config: {
        rentvine_api_url: process.env.RENTVINE_API_URL || null
      }
    });
  } catch (error) {
    console.error('Get rentvine config error:', error);
    res.status(500).json({ message: 'Server error fetching rentvine config' });
  }
});

module.exports = router;
