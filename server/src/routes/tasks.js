const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/db');

// GET /overdue - get overdue tasks
// (defined before /:id to avoid route conflict)
router.get('/overdue', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = $1
         AND due_date < NOW()
         AND status != 'done'
       ORDER BY due_date ASC`,
      [req.user.id]
    );

    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('Error fetching overdue tasks:', err);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
});

// GET /templates - list task templates
router.get('/templates', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM task_templates WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ templates: result.rows });
  } catch (err) {
    console.error('Error listing task templates:', err);
    res.status(500).json({ error: 'Failed to list task templates' });
  }
});

// POST /templates - create task template
router.post('/templates', auth, async (req, res) => {
  try {
    const { name, description, items } = req.body;

    if (!name || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'name and items (JSON array) are required' });
    }

    const result = await pool.query(
      `INSERT INTO task_templates (user_id, name, description, items)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, name, description || null, JSON.stringify(items)]
    );

    res.status(201).json({ template: result.rows[0] });
  } catch (err) {
    console.error('Error creating task template:', err);
    res.status(500).json({ error: 'Failed to create task template' });
  }
});

// POST /templates/:id/apply - create tasks from template
router.post('/templates/:id/apply', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const templateResult = await pool.query(
      'SELECT * FROM task_templates WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task template not found' });
    }

    const template = templateResult.rows[0];
    const items = typeof template.items === 'string'
      ? JSON.parse(template.items)
      : template.items;

    const createdTasks = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = await pool.query(
        `INSERT INTO tasks (user_id, title, description, priority, status, position)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          req.user.id,
          item.title,
          item.description || null,
          item.priority || 'medium',
          'todo',
          i
        ]
      );
      createdTasks.push(result.rows[0]);
    }

    res.status(201).json({ tasks: createdTasks });
  } catch (err) {
    console.error('Error applying task template:', err);
    res.status(500).json({ error: 'Failed to apply task template' });
  }
});

// GET / - list tasks with filters and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      priority,
      assignee_id,
      due_date,
      related_property,
      page = 1,
      limit = 20
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE user_id = $1';
    const params = [req.user.id];
    const countParams = [req.user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      countQuery += ` AND status = $${paramIndex}`;
      params.push(status);
      countParams.push(status);
      paramIndex++;
    }

    if (priority) {
      query += ` AND priority = $${paramIndex}`;
      countQuery += ` AND priority = $${paramIndex}`;
      params.push(priority);
      countParams.push(priority);
      paramIndex++;
    }

    if (assignee_id) {
      query += ` AND assignee_id = $${paramIndex}`;
      countQuery += ` AND assignee_id = $${paramIndex}`;
      params.push(assignee_id);
      countParams.push(assignee_id);
      paramIndex++;
    }

    if (due_date) {
      query += ` AND DATE(due_date) = DATE($${paramIndex})`;
      countQuery += ` AND DATE(due_date) = DATE($${paramIndex})`;
      params.push(due_date);
      countParams.push(due_date);
      paramIndex++;
    }

    if (related_property) {
      query += ` AND related_property = $${paramIndex}`;
      countQuery += ` AND related_property = $${paramIndex}`;
      params.push(related_property);
      countParams.push(related_property);
      paramIndex++;
    }

    query += ` ORDER BY position ASC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      tasks: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Error listing tasks:', err);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// POST / - create task
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      assignee_id,
      due_date,
      related_property,
      position
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, status, priority, assignee_id, due_date, related_property, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        title,
        description || null,
        status || 'todo',
        priority || 'medium',
        assignee_id || null,
        due_date || null,
        related_property || null,
        position != null ? position : 0
      ]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /:id - get task
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PUT /:id - update task
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      assignee_id,
      due_date,
      related_property,
      position
    } = req.body;

    const existing = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           assignee_id = COALESCE($5, assignee_id),
           due_date = COALESCE($6, due_date),
           related_property = COALESCE($7, related_property),
           position = COALESCE($8, position),
           updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        title,
        description,
        status,
        priority,
        assignee_id,
        due_date,
        related_property,
        position,
        id,
        req.user.id
      ]
    );

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PUT /:id/status - update task status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['todo', 'in_progress', 'review', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error updating task status:', err);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// PUT /:id/position - update task position (for kanban reorder)
router.put('/:id/position', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { position, status } = req.body;

    if (position == null) {
      return res.status(400).json({ error: 'position is required' });
    }

    let query;
    let params;

    if (status) {
      query = `UPDATE tasks
               SET position = $1, status = $2, updated_at = NOW()
               WHERE id = $3 AND user_id = $4
               RETURNING *`;
      params = [position, status, id, req.user.id];
    } else {
      query = `UPDATE tasks
               SET position = $1, updated_at = NOW()
               WHERE id = $2 AND user_id = $3
               RETURNING *`;
      params = [position, id, req.user.id];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error('Error updating task position:', err);
    res.status(500).json({ error: 'Failed to update task position' });
  }
});

// DELETE /:id - delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
