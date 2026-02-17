const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// GET /contact/:contactId - List activities for a contact
router.get('/contact/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    // Verify the contact exists
    const contactCheck = await pool.query(
      'SELECT id FROM contacts WHERE id = $1',
      [contactId]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const result = await pool.query(
      `SELECT *
       FROM activities
       WHERE contact_id = $1
       ORDER BY created_at DESC`,
      [contactId]
    );

    res.json({ activities: result.rows });
  } catch (err) {
    console.error('Error listing activities:', err);
    res.status(500).json({ error: 'Failed to list activities' });
  }
});

// POST / - Create an activity
router.post('/', async (req, res) => {
  try {
    const { contact_id, type, description } = req.body;

    if (!contact_id || !type || !description) {
      return res.status(400).json({
        error: 'contact_id, type, and description are required'
      });
    }

    // Verify the contact exists
    const contactCheck = await pool.query(
      'SELECT id FROM contacts WHERE id = $1',
      [contact_id]
    );

    if (contactCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const result = await pool.query(
      `INSERT INTO activities (contact_id, type, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [contact_id, type, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// DELETE /:id - Delete an activity
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM activities WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted', activity: result.rows[0] });
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

module.exports = router;
