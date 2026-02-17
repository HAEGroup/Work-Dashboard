const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List contacts with search/filter and pagination
router.get('/', async (req, res) => {
  try {
    const {
      type,
      lead_stage,
      tag,
      search,
      limit = 25,
      offset = 0
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (type) {
      conditions.push(`c.type = $${paramIndex++}`);
      params.push(type);
    }

    if (lead_stage) {
      conditions.push(`c.lead_stage = $${paramIndex++}`);
      params.push(lead_stage);
    }

    if (tag) {
      conditions.push(`$${paramIndex++} = ANY(c.tags)`);
      params.push(tag);
    }

    if (search) {
      conditions.push(
        `(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const countQuery = `SELECT COUNT(*) FROM contacts c ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT c.*
      FROM contacts c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await pool.query(dataQuery, params);

    res.json({
      contacts: result.rows,
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    console.error('Error listing contacts:', err);
    res.status(500).json({ error: 'Failed to list contacts' });
  }
});

// POST / - Create a contact
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      type,
      lead_stage,
      tags,
      notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO contacts (name, email, phone, company, type, lead_stage, tags, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, email, phone, company, type, lead_stage, tags || [], notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating contact:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// GET /export/csv - Export contacts as CSV text
// NOTE: This must be defined before /:id to avoid route conflicts
router.get('/export/csv', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contacts ORDER BY created_at DESC'
    );

    const contacts = result.rows;

    if (contacts.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      return res.send('');
    }

    const columns = Object.keys(contacts[0]);
    const header = columns.join(',');

    const rows = contacts.map((contact) => {
      return columns.map((col) => {
        const value = contact[col];
        if (value === null || value === undefined) return '';
        const str = Array.isArray(value) ? value.join(';') : String(value);
        // Escape quotes and wrap in quotes if the value contains commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',');
    });

    const csv = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Error exporting contacts:', err);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

// GET /:id - Get a single contact
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM contacts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching contact:', err);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// PUT /:id - Update a contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      company,
      type,
      lead_stage,
      tags,
      notes
    } = req.body;

    const result = await pool.query(
      `UPDATE contacts
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           company = COALESCE($4, company),
           type = COALESCE($5, type),
           lead_stage = COALESCE($6, lead_stage),
           tags = COALESCE($7, tags),
           notes = COALESCE($8, notes),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, email, phone, company, type, lead_stage, tags, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// DELETE /:id - Delete a contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM contacts WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted', contact: result.rows[0] });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// PUT /:id/stage - Update lead stage and log activity
router.put('/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { lead_stage } = req.body;

    if (!lead_stage) {
      return res.status(400).json({ error: 'lead_stage is required' });
    }

    // Get the current stage before updating
    const current = await pool.query(
      'SELECT lead_stage FROM contacts WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const previousStage = current.rows[0].lead_stage;

    // Update the lead stage
    const result = await pool.query(
      `UPDATE contacts
       SET lead_stage = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [lead_stage, id]
    );

    // Log the stage change as an activity
    await pool.query(
      `INSERT INTO activities (contact_id, type, description)
       VALUES ($1, $2, $3)`,
      [
        id,
        'stage_change',
        `Lead stage changed from "${previousStage}" to "${lead_stage}"`
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating lead stage:', err);
    res.status(500).json({ error: 'Failed to update lead stage' });
  }
});

// POST /import - Import contacts from a JSON array
router.post('/import', async (req, res) => {
  try {
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'contacts must be a non-empty array' });
    }

    const imported = [];
    const errors = [];

    for (let i = 0; i < contacts.length; i++) {
      const {
        name,
        email,
        phone,
        company,
        type,
        lead_stage,
        tags,
        notes
      } = contacts[i];

      if (!name) {
        errors.push({ index: i, error: 'name is required' });
        continue;
      }

      try {
        const result = await pool.query(
          `INSERT INTO contacts (name, email, phone, company, type, lead_stage, tags, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [name, email || null, phone || null, company || null, type || null, lead_stage || null, tags || [], notes || null]
        );
        imported.push(result.rows[0]);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    res.status(201).json({
      imported: imported.length,
      failed: errors.length,
      contacts: imported,
      errors
    });
  } catch (err) {
    console.error('Error importing contacts:', err);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

module.exports = router;
