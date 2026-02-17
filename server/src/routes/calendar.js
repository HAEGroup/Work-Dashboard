const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/db');

// GET /today - get today's events for dashboard agenda
// (defined before /:id to avoid route conflict)
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const result = await pool.query(
      `SELECT * FROM events
       WHERE user_id = $1
         AND (
           (start_time >= $2 AND start_time < $3)
           OR (all_day = true AND DATE(start_time) = DATE($2))
         )
       ORDER BY all_day DESC, start_time ASC`,
      [req.user.id, startOfDay.toISOString(), endOfDay.toISOString()]
    );

    res.json({ events: result.rows });
  } catch (err) {
    console.error('Error fetching today\'s events:', err);
    res.status(500).json({ error: 'Failed to fetch today\'s events' });
  }
});

// POST /google/connect - placeholder for Google Calendar OAuth initiation
router.post('/google/connect', auth, async (req, res) => {
  res.status(501).json({ message: 'Google Calendar OAuth not yet configured' });
});

// GET /google/callback - placeholder for OAuth callback
router.get('/google/callback', async (req, res) => {
  res.status(501).json({ message: 'Google Calendar OAuth not yet configured' });
});

// GET / - list events for a date range
router.get('/', auth, async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Both start and end query parameters are required' });
    }

    const result = await pool.query(
      `SELECT * FROM events
       WHERE user_id = $1
         AND start_time >= $2
         AND end_time <= $3
       ORDER BY start_time ASC`,
      [req.user.id, start, end]
    );

    res.json({ events: result.rows });
  } catch (err) {
    console.error('Error listing events:', err);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

// POST / - create event
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      start_time,
      end_time,
      all_day,
      location,
      category,
      color,
      recurrence_rule
    } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'title, start_time, and end_time are required' });
    }

    const result = await pool.query(
      `INSERT INTO events (user_id, title, description, start_time, end_time, all_day, location, category, color, recurrence_rule)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.id,
        title,
        description || null,
        start_time,
        end_time,
        all_day || false,
        location || null,
        category || null,
        color || null,
        recurrence_rule || null
      ]
    );

    res.status(201).json({ event: result.rows[0] });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// GET /:id - get event
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event: result.rows[0] });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// PUT /:id - update event
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      start_time,
      end_time,
      all_day,
      location,
      category,
      color,
      recurrence_rule
    } = req.body;

    const existing = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await pool.query(
      `UPDATE events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           start_time = COALESCE($3, start_time),
           end_time = COALESCE($4, end_time),
           all_day = COALESCE($5, all_day),
           location = COALESCE($6, location),
           category = COALESCE($7, category),
           color = COALESCE($8, color),
           recurrence_rule = COALESCE($9, recurrence_rule),
           updated_at = NOW()
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [
        title,
        description,
        start_time,
        end_time,
        all_day,
        location,
        category,
        color,
        recurrence_rule,
        id,
        req.user.id
      ]
    );

    res.json({ event: result.rows[0] });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /:id - delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
