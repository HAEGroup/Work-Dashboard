const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all marketing routes
router.use(auth);

// =====================
// CAMPAIGNS
// =====================

// GET /campaigns - list campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mc.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM marketing_campaigns mc
       LEFT JOIN users u ON u.id = mc.created_by
       ORDER BY mc.created_at DESC`
    );

    res.json({ campaigns: result.rows });
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ message: 'Server error fetching campaigns' });
  }
});

// POST /campaigns - create campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { name, type, budget, start_date, end_date, status, notes } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: 'Campaign name and type are required' });
    }

    const result = await pool.query(
      `INSERT INTO marketing_campaigns (name, type, budget, start_date, end_date, status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, type, budget || null, start_date || null, end_date || null, status || 'draft', notes || null, req.user.id]
    );

    res.status(201).json({ campaign: result.rows[0] });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ message: 'Server error creating campaign' });
  }
});

// GET /campaigns/:id - get campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT mc.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM marketing_campaigns mc
       LEFT JOIN users u ON u.id = mc.created_by
       WHERE mc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ campaign: result.rows[0] });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ message: 'Server error fetching campaign' });
  }
});

// PUT /campaigns/:id - update campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, budget, start_date, end_date, status, notes } = req.body;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (type !== undefined) { fields.push(`type = $${paramIndex++}`); values.push(type); }
    if (budget !== undefined) { fields.push(`budget = $${paramIndex++}`); values.push(budget); }
    if (start_date !== undefined) { fields.push(`start_date = $${paramIndex++}`); values.push(start_date); }
    if (end_date !== undefined) { fields.push(`end_date = $${paramIndex++}`); values.push(end_date); }
    if (status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(status); }
    if (notes !== undefined) { fields.push(`notes = $${paramIndex++}`); values.push(notes); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE marketing_campaigns SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ campaign: result.rows[0] });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ message: 'Server error updating campaign' });
  }
});

// DELETE /campaigns/:id - delete campaign
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM marketing_campaigns WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ message: 'Server error deleting campaign' });
  }
});

// =====================
// CONTENT
// =====================

// GET /content - list content items (optional campaign_id filter)
router.get('/content', async (req, res) => {
  try {
    const { campaign_id } = req.query;

    let query = `SELECT mc.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name
                 FROM marketing_content mc
                 LEFT JOIN users u ON u.id = mc.created_by`;
    const values = [];

    if (campaign_id) {
      query += ' WHERE mc.campaign_id = $1';
      values.push(campaign_id);
    }

    query += ' ORDER BY mc.scheduled_date ASC NULLS LAST, mc.created_at DESC';

    const result = await pool.query(query, values);

    res.json({ content: result.rows });
  } catch (error) {
    console.error('List content error:', error);
    res.status(500).json({ message: 'Server error fetching content' });
  }
});

// POST /content - create content item
router.post('/content', async (req, res) => {
  try {
    const { campaign_id, title, content, platform, scheduled_date, status } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Content title is required' });
    }

    const result = await pool.query(
      `INSERT INTO marketing_content (campaign_id, title, content, platform, scheduled_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [campaign_id || null, title, content || null, platform || null, scheduled_date || null, status || 'draft', req.user.id]
    );

    res.status(201).json({ content: result.rows[0] });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ message: 'Server error creating content' });
  }
});

// PUT /content/:id - update content item
router.put('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { campaign_id, title, content, platform, scheduled_date, status } = req.body;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (campaign_id !== undefined) { fields.push(`campaign_id = $${paramIndex++}`); values.push(campaign_id); }
    if (title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(title); }
    if (content !== undefined) { fields.push(`content = $${paramIndex++}`); values.push(content); }
    if (platform !== undefined) { fields.push(`platform = $${paramIndex++}`); values.push(platform); }
    if (scheduled_date !== undefined) { fields.push(`scheduled_date = $${paramIndex++}`); values.push(scheduled_date); }
    if (status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE marketing_content SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Content item not found' });
    }

    res.json({ content: result.rows[0] });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ message: 'Server error updating content' });
  }
});

// DELETE /content/:id - delete content item
router.delete('/content/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM marketing_content WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Content item not found' });
    }

    res.json({ message: 'Content item deleted successfully' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ message: 'Server error deleting content' });
  }
});

// =====================
// LISTINGS
// =====================

// GET /listings - list property listings
router.get('/listings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pl.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM property_listings pl
       LEFT JOIN users u ON u.id = pl.created_by
       ORDER BY pl.created_at DESC`
    );

    res.json({ listings: result.rows });
  } catch (error) {
    console.error('List listings error:', error);
    res.status(500).json({ message: 'Server error fetching listings' });
  }
});

// POST /listings - create listing
router.post('/listings', async (req, res) => {
  try {
    const { title, description, address, price, bedrooms, bathrooms, sqft, photos, available_date, status } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Listing title is required' });
    }

    const result = await pool.query(
      `INSERT INTO property_listings (title, description, address, price, bedrooms, bathrooms, sqft, photos, available_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        title,
        description || null,
        address || null,
        price || null,
        bedrooms || null,
        bathrooms || null,
        sqft || null,
        photos || '{}',
        available_date || null,
        status || 'active',
        req.user.id
      ]
    );

    res.status(201).json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ message: 'Server error creating listing' });
  }
});

// GET /listings/:id - get listing
router.get('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT pl.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name
       FROM property_listings pl
       LEFT JOIN users u ON u.id = pl.created_by
       WHERE pl.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ message: 'Server error fetching listing' });
  }
});

// PUT /listings/:id - update listing
router.put('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, address, price, bedrooms, bathrooms, sqft, photos, available_date, status } = req.body;

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(title); }
    if (description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(description); }
    if (address !== undefined) { fields.push(`address = $${paramIndex++}`); values.push(address); }
    if (price !== undefined) { fields.push(`price = $${paramIndex++}`); values.push(price); }
    if (bedrooms !== undefined) { fields.push(`bedrooms = $${paramIndex++}`); values.push(bedrooms); }
    if (bathrooms !== undefined) { fields.push(`bathrooms = $${paramIndex++}`); values.push(bathrooms); }
    if (sqft !== undefined) { fields.push(`sqft = $${paramIndex++}`); values.push(sqft); }
    if (photos !== undefined) { fields.push(`photos = $${paramIndex++}`); values.push(photos); }
    if (available_date !== undefined) { fields.push(`available_date = $${paramIndex++}`); values.push(available_date); }
    if (status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(status); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE property_listings SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ message: 'Server error updating listing' });
  }
});

// DELETE /listings/:id - delete listing
router.delete('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM property_listings WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ message: 'Server error deleting listing' });
  }
});

// =====================
// ANALYTICS
// =====================

// GET /analytics - get marketing analytics
router.get('/analytics', async (req, res) => {
  try {
    // Leads per source from contacts
    const leadsPerSource = await pool.query(
      `SELECT lead_source, COUNT(*) AS count
       FROM contacts
       WHERE type = 'lead' AND lead_source IS NOT NULL
       GROUP BY lead_source
       ORDER BY count DESC`
    );

    // Campaign count by status
    const campaignStats = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM marketing_campaigns
       GROUP BY status`
    );

    // Listing stats by status
    const listingStats = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM property_listings
       GROUP BY status`
    );

    // Total budget across active campaigns
    const budgetResult = await pool.query(
      `SELECT COALESCE(SUM(budget), 0) AS total_budget
       FROM marketing_campaigns
       WHERE status = 'active'`
    );

    res.json({
      analytics: {
        leads_per_source: leadsPerSource.rows,
        campaign_stats: campaignStats.rows,
        listing_stats: listingStats.rows,
        active_campaign_budget: parseFloat(budgetResult.rows[0].total_budget)
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

module.exports = router;
