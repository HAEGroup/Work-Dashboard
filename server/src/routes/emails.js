const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// ─── Email Accounts ──────────────────────────────────────────────────────────

// GET /accounts - List user's email accounts
router.get('/accounts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, email_address, display_name,
              imap_host, imap_port, imap_secure,
              smtp_host, smtp_port, smtp_secure,
              created_at, updated_at
       FROM email_accounts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ accounts: result.rows });
  } catch (error) {
    console.error('List email accounts error:', error);
    res.status(500).json({ message: 'Server error fetching email accounts' });
  }
});

// POST /accounts - Add an email account (IMAP/SMTP settings)
router.post('/accounts', async (req, res) => {
  try {
    const {
      email_address,
      display_name,
      imap_host,
      imap_port,
      imap_secure,
      imap_username,
      imap_password,
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_username,
      smtp_password,
    } = req.body;

    if (!email_address) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const result = await pool.query(
      `INSERT INTO email_accounts
         (user_id, email_address, display_name,
          imap_host, imap_port, imap_secure, imap_username, imap_password,
          smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, user_id, email_address, display_name,
                 imap_host, imap_port, imap_secure,
                 smtp_host, smtp_port, smtp_secure,
                 created_at, updated_at`,
      [
        req.user.id,
        email_address,
        display_name || null,
        imap_host || null,
        imap_port || null,
        imap_secure !== undefined ? imap_secure : true,
        imap_username || null,
        imap_password || null,
        smtp_host || null,
        smtp_port || null,
        smtp_secure !== undefined ? smtp_secure : true,
        smtp_username || null,
        smtp_password || null,
      ]
    );

    res.status(201).json({ account: result.rows[0] });
  } catch (error) {
    console.error('Add email account error:', error);
    res.status(500).json({ message: 'Server error adding email account' });
  }
});

// DELETE /accounts/:id - Remove an email account
router.delete('/accounts/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM email_accounts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    res.json({ message: 'Email account removed' });
  } catch (error) {
    console.error('Remove email account error:', error);
    res.status(500).json({ message: 'Server error removing email account' });
  }
});

// ─── Email Templates ─────────────────────────────────────────────────────────

// GET /templates - List email templates
router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, subject, body, created_at, updated_at
       FROM email_templates
       WHERE user_id = $1
       ORDER BY name ASC`,
      [req.user.id]
    );

    res.json({ templates: result.rows });
  } catch (error) {
    console.error('List email templates error:', error);
    res.status(500).json({ message: 'Server error fetching email templates' });
  }
});

// POST /templates - Create an email template
router.post('/templates', async (req, res) => {
  try {
    const { name, subject, body } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Template name is required' });
    }

    const result = await pool.query(
      `INSERT INTO email_templates (user_id, name, subject, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, name, subject || '', body || '']
    );

    res.status(201).json({ template: result.rows[0] });
  } catch (error) {
    console.error('Create email template error:', error);
    res.status(500).json({ message: 'Server error creating email template' });
  }
});

// PUT /templates/:id - Update an email template
router.put('/templates/:id', async (req, res) => {
  try {
    const { name, subject, body } = req.body;

    const result = await pool.query(
      `UPDATE email_templates
       SET name = COALESCE($1, name),
           subject = COALESCE($2, subject),
           body = COALESCE($3, body),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, subject, body, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email template not found' });
    }

    res.json({ template: result.rows[0] });
  } catch (error) {
    console.error('Update email template error:', error);
    res.status(500).json({ message: 'Server error updating email template' });
  }
});

// DELETE /templates/:id - Delete an email template
router.delete('/templates/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM email_templates WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email template not found' });
    }

    res.json({ message: 'Email template deleted' });
  } catch (error) {
    console.error('Delete email template error:', error);
    res.status(500).json({ message: 'Server error deleting email template' });
  }
});

// ─── Emails ──────────────────────────────────────────────────────────────────

// GET / - List emails with folder filter and pagination
router.get('/', async (req, res) => {
  try {
    const {
      folder = 'inbox',
      page = 1,
      limit = 25,
      account_id,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const validFolders = ['inbox', 'sent', 'drafts', 'trash'];
    if (!validFolders.includes(folder)) {
      return res.status(400).json({ message: `Invalid folder. Must be one of: ${validFolders.join(', ')}` });
    }

    const conditions = ['e.user_id = $1', 'e.folder = $2'];
    const params = [req.user.id, folder];
    let paramIndex = 3;

    if (account_id) {
      conditions.push(`e.account_id = $${paramIndex}`);
      params.push(account_id);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM emails e WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT e.id, e.account_id, e.user_id, e.contact_id,
              e.from_address, e.to_address, e.cc, e.bcc,
              e.subject, e.body_preview, e.folder,
              e.is_read, e.is_starred, e.sent_at,
              e.created_at, e.updated_at
       FROM emails e
       WHERE ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    res.json({
      emails: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List emails error:', error);
    res.status(500).json({ message: 'Server error fetching emails' });
  }
});

// GET /:id - Get a single email
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, account_id, user_id, contact_id,
              from_address, to_address, cc, bcc,
              subject, body, body_preview, folder,
              is_read, is_starred, sent_at,
              created_at, updated_at
       FROM emails
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    res.json({ email: result.rows[0] });
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ message: 'Server error fetching email' });
  }
});

// POST / - Compose and send an email
router.post('/', async (req, res) => {
  try {
    const { to, cc, bcc, subject, body, contact_id, account_id } = req.body;

    if (!to) {
      return res.status(400).json({ message: 'Recipient (to) is required' });
    }

    // Generate a plain-text preview (first 200 chars, strip HTML tags)
    const bodyPreview = body
      ? body.replace(/<[^>]*>/g, '').substring(0, 200)
      : '';

    // Determine from address
    let fromAddress = req.user.email;
    let smtpConfig = null;

    if (account_id) {
      const accountResult = await pool.query(
        `SELECT email_address, smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password
         FROM email_accounts
         WHERE id = $1 AND user_id = $2`,
        [account_id, req.user.id]
      );

      if (accountResult.rows.length > 0) {
        const account = accountResult.rows[0];
        fromAddress = account.email_address;

        if (account.smtp_host && account.smtp_username && account.smtp_password) {
          smtpConfig = {
            host: account.smtp_host,
            port: account.smtp_port || 587,
            secure: account.smtp_secure || false,
            auth: {
              user: account.smtp_username,
              pass: account.smtp_password,
            },
          };
        }
      }
    }

    // Save the email to the database
    const result = await pool.query(
      `INSERT INTO emails
         (user_id, account_id, contact_id, from_address, to_address, cc, bcc,
          subject, body, body_preview, folder, is_read, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'sent', true, NOW())
       RETURNING *`,
      [
        req.user.id,
        account_id || null,
        contact_id || null,
        fromAddress,
        to,
        cc || null,
        bcc || null,
        subject || '(No Subject)',
        body || '',
        bodyPreview,
      ]
    );

    const email = result.rows[0];

    // Attempt to send via SMTP if configured
    if (smtpConfig) {
      try {
        const transporter = nodemailer.createTransport(smtpConfig);

        await transporter.sendMail({
          from: fromAddress,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject: subject || '(No Subject)',
          html: body || '',
        });
      } catch (smtpError) {
        console.error('SMTP send error:', smtpError);
        // Email is saved to DB but SMTP delivery failed
        return res.status(201).json({
          email,
          warning: 'Email saved but SMTP delivery failed. Check your account settings.',
        });
      }
    }

    res.status(201).json({ email });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ message: 'Server error sending email' });
  }
});

// POST /draft - Save a draft
router.post('/draft', async (req, res) => {
  try {
    const { to, cc, bcc, subject, body, contact_id, account_id } = req.body;

    const bodyPreview = body
      ? body.replace(/<[^>]*>/g, '').substring(0, 200)
      : '';

    let fromAddress = req.user.email;

    if (account_id) {
      const accountResult = await pool.query(
        'SELECT email_address FROM email_accounts WHERE id = $1 AND user_id = $2',
        [account_id, req.user.id]
      );
      if (accountResult.rows.length > 0) {
        fromAddress = accountResult.rows[0].email_address;
      }
    }

    const result = await pool.query(
      `INSERT INTO emails
         (user_id, account_id, contact_id, from_address, to_address, cc, bcc,
          subject, body, body_preview, folder, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'drafts', true)
       RETURNING *`,
      [
        req.user.id,
        account_id || null,
        contact_id || null,
        fromAddress,
        to || null,
        cc || null,
        bcc || null,
        subject || '',
        body || '',
        bodyPreview,
      ]
    );

    res.status(201).json({ email: result.rows[0] });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ message: 'Server error saving draft' });
  }
});

// PUT /:id/read - Mark email as read
router.put('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE emails
       SET is_read = true, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    res.json({ email: result.rows[0] });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error marking email as read' });
  }
});

// PUT /:id/star - Toggle star on an email
router.put('/:id/star', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE emails
       SET is_starred = NOT is_starred, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    res.json({ email: result.rows[0] });
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({ message: 'Server error toggling star' });
  }
});

// DELETE /:id - Move email to trash, or permanently delete if already in trash
router.delete('/:id', async (req, res) => {
  try {
    // First, check the current folder
    const checkResult = await pool.query(
      'SELECT id, folder FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const email = checkResult.rows[0];

    if (email.folder === 'trash') {
      // Permanently delete
      await pool.query(
        'DELETE FROM emails WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );

      return res.json({ message: 'Email permanently deleted' });
    }

    // Move to trash
    const result = await pool.query(
      `UPDATE emails
       SET folder = 'trash', updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    res.json({ email: result.rows[0], message: 'Email moved to trash' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ message: 'Server error deleting email' });
  }
});

module.exports = router;
