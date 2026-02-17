require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'redrock_dashboard',
  user: process.env.DB_USER || 'redrock',
  password: process.env.DB_PASSWORD || 'change_me_in_production',
});

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
        avatar VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Contacts (CRM)
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type VARCHAR(20) NOT NULL CHECK (type IN ('tenant', 'owner', 'vendor', 'lead')),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        notes TEXT,
        tags TEXT[] DEFAULT '{}',
        lead_stage VARCHAR(30) CHECK (lead_stage IN ('new_lead', 'contacted', 'showing', 'application', 'lease_signed', 'lost')),
        lead_source VARCHAR(100),
        property_id UUID,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Activities (CRM activity log)
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(30) NOT NULL CHECK (type IN ('call', 'email', 'note', 'meeting', 'task', 'stage_change', 'other')),
        description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Email accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email_address VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        imap_host VARCHAR(255) NOT NULL,
        imap_port INTEGER NOT NULL DEFAULT 993,
        smtp_host VARCHAR(255) NOT NULL,
        smtp_port INTEGER NOT NULL DEFAULT 587,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Emails
    await client.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        folder VARCHAR(20) NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'trash')),
        from_address VARCHAR(255) NOT NULL,
        to_addresses TEXT[] NOT NULL,
        cc_addresses TEXT[] DEFAULT '{}',
        subject VARCHAR(500),
        body TEXT,
        is_read BOOLEAN DEFAULT false,
        is_starred BOOLEAN DEFAULT false,
        message_id VARCHAR(500),
        in_reply_to VARCHAR(500),
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Email templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        category VARCHAR(50),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Calendar events
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        all_day BOOLEAN DEFAULT false,
        location VARCHAR(500),
        category VARCHAR(30) DEFAULT 'meeting' CHECK (category IN ('showing', 'inspection', 'maintenance', 'meeting', 'deadline', 'other')),
        color VARCHAR(20),
        recurrence_rule VARCHAR(255),
        google_event_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tasks
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'waiting', 'complete')),
        priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        due_date TIMESTAMP,
        assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        related_property VARCHAR(255),
        related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Task templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        items JSONB NOT NULL DEFAULT '[]',
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Chat channels
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_direct BOOLEAN DEFAULT false,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Chat channel members
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_channel_members (
        channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (channel_id, user_id)
      )
    `);

    // Chat messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Marketing campaigns
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(30) NOT NULL CHECK (type IN ('social_media', 'email_blast', 'print', 'online_ad', 'other')),
        budget DECIMAL(10, 2),
        start_date DATE,
        end_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
        notes TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Marketing content calendar
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_content (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        platform VARCHAR(50),
        scheduled_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Property listings
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_listings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        address VARCHAR(500),
        price DECIMAL(10, 2),
        bedrooms INTEGER,
        bathrooms DECIMAL(3, 1),
        sqft INTEGER,
        photos TEXT[] DEFAULT '{}',
        available_date DATE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rented', 'inactive')),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Rentvine metrics (manually updated or API-connected)
    await client.query(`
      CREATE TABLE IF NOT EXISTS rentvine_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        units_managed INTEGER DEFAULT 0,
        open_maintenance INTEGER DEFAULT 0,
        vacancy_count INTEGER DEFAULT 0,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
