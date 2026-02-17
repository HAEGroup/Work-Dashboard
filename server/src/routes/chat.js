const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all chat routes
router.use(auth);

// GET /channels - list channels the user belongs to
router.get('/channels', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.description, c.is_direct, c.created_at,
              cm.joined_at
       FROM chat_channels c
       INNER JOIN chat_channel_members cm ON cm.channel_id = c.id
       WHERE cm.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ channels: result.rows });
  } catch (error) {
    console.error('List channels error:', error);
    res.status(500).json({ message: 'Server error fetching channels' });
  }
});

// POST /channels - create a channel
router.post('/channels', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Channel name is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const channelResult = await client.query(
        `INSERT INTO chat_channels (name, description, is_direct, created_by)
         VALUES ($1, $2, false, $3)
         RETURNING *`,
        [name, description || null, req.user.id]
      );

      const channel = channelResult.rows[0];

      // Add the creator as a member
      await client.query(
        `INSERT INTO chat_channel_members (channel_id, user_id)
         VALUES ($1, $2)`,
        [channel.id, req.user.id]
      );

      await client.query('COMMIT');

      res.status(201).json({ channel });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ message: 'Server error creating channel' });
  }
});

// POST /channels/:id/join - join a channel
router.post('/channels/:id/join', async (req, res) => {
  try {
    const { id } = req.params;

    // Check channel exists
    const channelResult = await pool.query(
      'SELECT id, name, is_direct FROM chat_channels WHERE id = $1',
      [id]
    );

    if (channelResult.rows.length === 0) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    if (channelResult.rows[0].is_direct) {
      return res.status(400).json({ message: 'Cannot join a direct message channel' });
    }

    // Check if already a member
    const memberCheck = await pool.query(
      'SELECT channel_id FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (memberCheck.rows.length > 0) {
      return res.json({ message: 'Already a member of this channel' });
    }

    await pool.query(
      'INSERT INTO chat_channel_members (channel_id, user_id) VALUES ($1, $2)',
      [id, req.user.id]
    );

    res.json({ message: 'Joined channel successfully' });
  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json({ message: 'Server error joining channel' });
  }
});

// POST /channels/direct - create or get a direct message channel
router.post('/channels/direct', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    if (user_id === req.user.id) {
      return res.status(400).json({ message: 'Cannot create a direct message channel with yourself' });
    }

    // Check target user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Check if a direct channel already exists between these two users
    const existingChannel = await pool.query(
      `SELECT c.id, c.name, c.is_direct, c.created_at
       FROM chat_channels c
       INNER JOIN chat_channel_members cm1 ON cm1.channel_id = c.id AND cm1.user_id = $1
       INNER JOIN chat_channel_members cm2 ON cm2.channel_id = c.id AND cm2.user_id = $2
       WHERE c.is_direct = true
       LIMIT 1`,
      [req.user.id, user_id]
    );

    if (existingChannel.rows.length > 0) {
      return res.json({ channel: existingChannel.rows[0] });
    }

    // Create new direct message channel
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const channelResult = await client.query(
        `INSERT INTO chat_channels (name, is_direct, created_by)
         VALUES ($1, true, $2)
         RETURNING *`,
        ['direct', req.user.id]
      );

      const channel = channelResult.rows[0];

      await client.query(
        'INSERT INTO chat_channel_members (channel_id, user_id) VALUES ($1, $2), ($1, $3)',
        [channel.id, req.user.id, user_id]
      );

      await client.query('COMMIT');

      res.status(201).json({ channel });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create direct channel error:', error);
    res.status(500).json({ message: 'Server error creating direct channel' });
  }
});

// GET /channels/:id/messages - get messages for a channel with pagination
router.get('/channels/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Check user is a member of this channel
    const memberCheck = await pool.query(
      'SELECT channel_id FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this channel' });
    }

    const result = await pool.query(
      `SELECT m.id, m.channel_id, m.user_id, m.content, m.created_at,
              u.first_name, u.last_name, u.avatar
       FROM chat_messages m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.channel_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// POST /channels/:id/messages - post a message
router.post('/channels/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Check user is a member of this channel
    const memberCheck = await pool.query(
      'SELECT channel_id FROM chat_channel_members WHERE channel_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this channel' });
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (channel_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, req.user.id, content.trim()]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (error) {
    console.error('Post message error:', error);
    res.status(500).json({ message: 'Server error posting message' });
  }
});

// GET /online - get online users (placeholder, handled by socket)
router.get('/online', async (req, res) => {
  try {
    res.json({ users: [] });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ message: 'Server error fetching online users' });
  }
});

module.exports = router;
