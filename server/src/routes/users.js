const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Apply auth middleware to all user routes
router.use(auth);

// GET / - List all users (admin and manager only)
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied. Admin or manager role required' });
    }

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// GET /:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// PUT /:id - Update user (admin or self only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === parseInt(id, 10);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Access denied. You can only update your own profile' });
    }

    const { email, password, first_name, last_name } = req.body;

    // Check the user exists
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If email is changing, check for conflicts
    if (email) {
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ message: 'That email is already in use by another account' });
      }
    }

    // Build the update dynamically based on provided fields
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (email) {
      fields.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      fields.push(`password = $${paramIndex++}`);
      values.push(hashedPassword);
    }
    if (first_name) {
      fields.push(`first_name = $${paramIndex++}`);
      values.push(first_name);
    }
    if (last_name) {
      fields.push(`last_name = $${paramIndex++}`);
      values.push(last_name);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
                   RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`;

    const result = await pool.query(query, values);

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// DELETE /:id - Deactivate user (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required' });
    }

    const { id } = req.params;

    // Prevent admin from deactivating themselves
    if (req.user.id === parseInt(id, 10)) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    const result = await pool.query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1
       RETURNING id, email, first_name, last_name, role, is_active, updated_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deactivated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Server error deactivating user' });
  }
});

// PUT /:id/role - Update user role (admin only)
router.put('/:id/role', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required' });
    }

    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'manager', 'employee'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Prevent admin from changing their own role
    if (req.user.id === parseInt(id, 10)) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, email, first_name, last_name, role, is_active, updated_at`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
});

module.exports = router;
