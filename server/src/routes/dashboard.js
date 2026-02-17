const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all dashboard routes
router.use(auth);

// GET /summary - return dashboard summary data
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;

    // Unread email count for the current user
    const unreadEmailResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM emails
       WHERE user_id = $1 AND is_read = false AND folder = 'inbox'`,
      [userId]
    );

    // Today's task count (tasks due today assigned to current user)
    const todayTaskResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM tasks
       WHERE assignee_id = $1
         AND due_date IS NOT NULL
         AND due_date::date = CURRENT_DATE
         AND status != 'complete'`,
      [userId]
    );

    // Upcoming events count (events starting today or later for current user)
    const upcomingEventsResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM calendar_events
       WHERE user_id = $1
         AND start_time >= NOW()
         AND start_time <= NOW() + INTERVAL '7 days'`,
      [userId]
    );

    // Open leads count (contacts of type lead that are not lost or lease_signed)
    const openLeadsResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM contacts
       WHERE type = 'lead'
         AND (lead_stage IS NULL OR lead_stage NOT IN ('lost', 'lease_signed'))`
    );

    // Recent activities (limit 10)
    const recentActivitiesResult = await pool.query(
      `SELECT a.id, a.contact_id, a.user_id, a.type, a.description, a.metadata, a.created_at,
              u.first_name, u.last_name,
              c.first_name AS contact_first_name, c.last_name AS contact_last_name
       FROM activities a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN contacts c ON c.id = a.contact_id
       ORDER BY a.created_at DESC
       LIMIT 10`
    );

    res.json({
      summary: {
        unread_emails: parseInt(unreadEmailResult.rows[0].count),
        today_tasks: parseInt(todayTaskResult.rows[0].count),
        upcoming_events: parseInt(upcomingEventsResult.rows[0].count),
        open_leads: parseInt(openLeadsResult.rows[0].count),
        recent_activities: recentActivitiesResult.rows
      }
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard summary' });
  }
});

module.exports = router;
