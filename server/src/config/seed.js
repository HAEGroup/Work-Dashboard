require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'redrock_dashboard',
  user: process.env.DB_USER || 'redrock',
  password: process.env.DB_PASSWORD || 'change_me_in_production',
});

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting seed...');

    // -------------------------------------------------------
    // Clear tables in reverse dependency order
    // -------------------------------------------------------
    console.log('Clearing existing data...');
    await client.query('DELETE FROM chat_messages');
    await client.query('DELETE FROM chat_channel_members');
    await client.query('DELETE FROM chat_channels');
    await client.query('DELETE FROM marketing_content');
    await client.query('DELETE FROM marketing_campaigns');
    await client.query('DELETE FROM tasks');
    await client.query('DELETE FROM task_templates');
    await client.query('DELETE FROM calendar_events');
    await client.query('DELETE FROM email_templates');
    await client.query('DELETE FROM emails');
    await client.query('DELETE FROM email_accounts');
    await client.query('DELETE FROM activities');
    await client.query('DELETE FROM contacts');
    await client.query('DELETE FROM property_listings');
    await client.query('DELETE FROM rentvine_metrics');
    await client.query('DELETE FROM settings');
    await client.query('DELETE FROM users');
    console.log('All tables cleared.');

    // -------------------------------------------------------
    // Users
    // -------------------------------------------------------
    console.log('Inserting users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const usersResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES
         ('admin@redrockpm.com',  $1, 'Mike',  'Henderson', 'admin'),
         ('sarah@redrockpm.com',  $1, 'Sarah', 'Johnson',   'manager'),
         ('james@redrockpm.com',  $1, 'James', 'Martinez',  'agent')
       RETURNING id, email, role`,
      [passwordHash]
    );

    const users = {};
    usersResult.rows.forEach((u) => {
      users[u.role] = u.id;
    });
    const adminId   = users.admin;
    const managerId = users.manager;
    const agentId   = users.agent;

    console.log(`  Inserted ${usersResult.rowCount} users.`);

    // -------------------------------------------------------
    // Contacts
    // -------------------------------------------------------
    console.log('Inserting contacts...');
    const contactsResult = await client.query(
      `INSERT INTO contacts
         (type, first_name, last_name, email, phone, address, notes, tags, lead_stage, lead_source, assigned_to, created_by)
       VALUES
         ('tenant', 'Carlos',    'Reyes',     'carlos.reyes@email.com',     '(702) 555-0101', '4521 Desert Inn Rd, Unit 12, Las Vegas, NV 89121', 'Long-term tenant since 2023. Always pays on time.', ARRAY['vip'], NULL, NULL, $2, $1),
         ('tenant', 'Angela',    'Brooks',    'angela.brooks@email.com',    '(702) 555-0102', '8910 Flamingo Rd, Apt 204, Las Vegas, NV 89147',   'Lease renewal coming up in March.', ARRAY['priority'], NULL, NULL, $2, $1),
         ('owner',  'David',     'Nakamura',  'david.nakamura@email.com',   '(702) 555-0201', '1200 S Main St, Las Vegas, NV 89104',               'Owns 3 properties in portfolio. Prefers email.', ARRAY['vip'], NULL, NULL, $2, $1),
         ('owner',  'Linda',     'Prescott',  'linda.prescott@email.com',   '(702) 555-0202', '6780 W Charleston Blvd, Las Vegas, NV 89146',       'Recently acquired duplex on Sahara.', ARRAY['new'], NULL, NULL, $3, $1),
         ('vendor', 'Tony',      'Vasquez',   'tony@vasvezplumbing.com',    '(702) 555-0301', '3300 N Rancho Dr, Las Vegas, NV 89130',              'Licensed plumber. Available 24/7 for emergencies.', ARRAY['priority'], NULL, NULL, $3, $1),
         ('vendor', 'Rachel',    'Kim',       'rachel@kimhvac.com',         '(702) 555-0302', '950 E Sahara Ave, Las Vegas, NV 89104',              'HVAC specialist. Competitive rates.', NULL, NULL, NULL, $3, $1),
         ('lead',   'Marcus',    'Thompson',  'marcus.t@gmail.com',         '(702) 555-0401', NULL, 'Looking for 2BR near the Strip. Budget $1,800/mo.', ARRAY['new'], 'new_lead', 'website', $3, $1),
         ('lead',   'Jennifer',  'Sullivan',  'jsullivan@yahoo.com',        '(702) 555-0402', NULL, 'Relocating from Phoenix. Needs 3BR by April.', NULL, 'contacted', 'zillow', $3, $1),
         ('lead',   'Robert',    'Chang',     'r.chang@outlook.com',        '(702) 555-0403', NULL, 'Referred by David Nakamura. High-income applicant.', ARRAY['vip','priority'], 'showing', 'referral', $2, $1),
         ('lead',   'Priya',     'Desai',     'priya.desai@email.com',      '(702) 555-0404', NULL, 'Interested in townhome listings. Pre-approved.', ARRAY['new'], 'application', 'website', $3, $1)
       RETURNING id, first_name, last_name, type`,
      [adminId, managerId, agentId]
    );

    const contacts = contactsResult.rows;
    console.log(`  Inserted ${contacts.length} contacts.`);

    // -------------------------------------------------------
    // Activities
    // -------------------------------------------------------
    console.log('Inserting activities...');
    const activitiesResult = await client.query(
      `INSERT INTO activities (contact_id, user_id, type, description, metadata)
       VALUES
         ($1, $7, 'call',   'Called to discuss lease renewal options. Tenant interested in 12-month extension.', '{"duration_minutes": 15}'),
         ($2, $7, 'email',  'Sent lease renewal reminder with updated terms and rent adjustment notice.', '{"template": "lease_reminder"}'),
         ($3, $8, 'note',   'Owner requested quarterly financial reports going forward. Added to distribution list.', '{}'),
         ($4, $9, 'meeting','Met at the Sahara duplex for walkthrough. Owner approved renovation budget.', '{"location": "2450 Sahara Ave"}'),
         ($5, $9, 'call',   'Scheduled showing at Sunset Terrace for Saturday 2pm. Very interested.', '{"duration_minutes": 8}'),
         ($6, $8, 'stage_change', 'Lead moved from contacted to showing stage after phone screening.', '{"from_stage": "contacted", "to_stage": "showing"}')
       RETURNING id`,
      [
        contacts[0].id, contacts[1].id, contacts[2].id,
        contacts[3].id, contacts[6].id, contacts[7].id,
        managerId, agentId, agentId
      ]
    );
    console.log(`  Inserted ${activitiesResult.rowCount} activities.`);

    // -------------------------------------------------------
    // Email templates
    // -------------------------------------------------------
    console.log('Inserting email templates...');
    const templatesResult = await client.query(
      `INSERT INTO email_templates (name, subject, body, category, created_by)
       VALUES
         ('Lease Reminder',
          'Upcoming Lease Renewal - Action Required',
          'Dear {{first_name}},\n\nThis is a friendly reminder that your lease at {{address}} is set to expire on {{lease_end_date}}. We would love to have you continue as a valued tenant.\n\nPlease review the attached renewal terms and let us know your decision by {{response_deadline}}.\n\nBest regards,\nRed Rock Property Management',
          'leasing', $1),
         ('Maintenance Update',
          'Maintenance Request Update - Ticket #{{ticket_id}}',
          'Dear {{first_name}},\n\nWe wanted to update you on your maintenance request (Ticket #{{ticket_id}}).\n\nStatus: {{status}}\nScheduled Date: {{scheduled_date}}\nAssigned Vendor: {{vendor_name}}\n\nPlease ensure access to the unit during the scheduled time. If you need to reschedule, contact us at least 24 hours in advance.\n\nThank you,\nRed Rock Property Management',
          'maintenance', $1),
         ('Welcome Letter',
          'Welcome to Your New Home at {{property_name}}!',
          'Dear {{first_name}} {{last_name}},\n\nWelcome to {{property_name}}! We are thrilled to have you as our newest resident.\n\nHere are some important details:\n- Move-in Date: {{move_in_date}}\n- Monthly Rent: {{rent_amount}}\n- Rent Due Date: 1st of each month\n- Emergency Maintenance: (702) 555-0999\n\nPlease review the attached move-in checklist and tenant handbook.\n\nWarm regards,\nRed Rock Property Management',
          'leasing', $1),
         ('Late Rent Notice',
          'Important: Past Due Rent Notice for {{address}}',
          'Dear {{first_name}},\n\nOur records indicate that your rent payment of {{rent_amount}} for {{address}} was due on {{due_date}} and has not been received.\n\nCurrent Balance Due: {{total_due}} (including {{late_fee}} late fee)\n\nPlease submit payment immediately to avoid further action. If you have already made this payment, please disregard this notice and contact us with your confirmation number.\n\nRegards,\nRed Rock Property Management',
          'collections', $1),
         ('Showing Confirmation',
          'Showing Confirmed - {{property_address}}',
          'Hi {{first_name}},\n\nYour showing has been confirmed!\n\nProperty: {{property_address}}\nDate: {{showing_date}}\nTime: {{showing_time}}\nAgent: {{agent_name}} | {{agent_phone}}\n\nPlease arrive 5 minutes early. If you need to cancel or reschedule, reply to this email or call us at (702) 555-0100.\n\nSee you there!\nRed Rock Property Management',
          'leasing', $1)
       RETURNING id`,
      [adminId]
    );
    console.log(`  Inserted ${templatesResult.rowCount} email templates.`);

    // -------------------------------------------------------
    // Calendar events (relative to NOW())
    // -------------------------------------------------------
    console.log('Inserting calendar events...');
    const eventsResult = await client.query(
      `INSERT INTO calendar_events (user_id, title, description, start_time, end_time, location, category, color)
       VALUES
         ($1, 'Showing: 4521 Desert Inn Rd',
          'Show 2BR unit to Marcus Thompson. Pre-approved lead from website.',
          NOW() + INTERVAL '1 day' + TIME '14:00',
          NOW() + INTERVAL '1 day' + TIME '14:45',
          '4521 Desert Inn Rd, Las Vegas, NV 89121', 'showing', '#4CAF50'),
         ($1, 'Showing: Sunset Terrace Townhome',
          'Show townhome to Robert Chang. Referred by David Nakamura.',
          NOW() + INTERVAL '3 days' + TIME '10:00',
          NOW() + INTERVAL '3 days' + TIME '10:45',
          '7890 Sunset Rd, Las Vegas, NV 89113', 'showing', '#4CAF50'),
         ($2, 'Quarterly Property Inspection',
          'Inspect units at Flamingo Rd complex. Check HVAC, plumbing, exterior.',
          NOW() + INTERVAL '5 days' + TIME '09:00',
          NOW() + INTERVAL '5 days' + TIME '12:00',
          '8910 Flamingo Rd, Las Vegas, NV 89147', 'inspection', '#FF9800'),
         ($3, 'Team Meeting - Weekly Sync',
          'Review occupancy rates, open maintenance tickets, and upcoming lease renewals.',
          NOW() + INTERVAL '2 days' + TIME '09:00',
          NOW() + INTERVAL '2 days' + TIME '10:00',
          'Red Rock PM Office, Conference Room A', 'meeting', '#2196F3'),
         ($1, 'AC Unit Replacement - Unit 204',
          'Rachel Kim HVAC scheduled to replace AC unit. Tenant notified.',
          NOW() + INTERVAL '7 days' + TIME '08:00',
          NOW() + INTERVAL '7 days' + TIME '11:00',
          '8910 Flamingo Rd, Apt 204, Las Vegas, NV 89147', 'maintenance', '#F44336'),
         ($2, 'Owner Meeting - David Nakamura',
          'Quarterly portfolio review. Bring financial statements and vacancy report.',
          NOW() + INTERVAL '10 days' + TIME '13:00',
          NOW() + INTERVAL '10 days' + TIME '14:00',
          'Red Rock PM Office', 'meeting', '#2196F3')
       RETURNING id`,
      [agentId, managerId, adminId]
    );
    console.log(`  Inserted ${eventsResult.rowCount} calendar events.`);

    // -------------------------------------------------------
    // Tasks
    // -------------------------------------------------------
    console.log('Inserting tasks...');
    const tasksResult = await client.query(
      `INSERT INTO tasks (title, description, status, priority, due_date, assignee_id, created_by, related_property, related_contact_id, position)
       VALUES
         ('Process lease renewal for Angela Brooks',
          'Prepare renewal documents with 3% rent increase. Current lease expires March 31.',
          'in_progress', 'high', NOW() + INTERVAL '7 days', $2, $1, '8910 Flamingo Rd, Apt 204', $4, 1),
         ('Schedule move-in inspection',
          'New tenant Priya Desai approved. Schedule pre-move-in walkthrough and document condition.',
          'todo', 'high', NOW() + INTERVAL '10 days', $3, $2, NULL, $5, 2),
         ('Follow up with Marcus Thompson',
          'Send available 2BR listings near the Strip. Budget $1,800/mo.',
          'todo', 'medium', NOW() + INTERVAL '2 days', $3, $1, NULL, $6, 3),
         ('Repair request - Kitchen faucet leak',
          'Unit 12 tenant reported slow drip in kitchen. Assign Tony Vasquez for repair.',
          'waiting', 'medium', NOW() + INTERVAL '4 days', $3, $2, '4521 Desert Inn Rd, Unit 12', $7, 4),
         ('Update property photos - Sunset Terrace',
          'Hire photographer for updated listing photos. Current photos are 8 months old.',
          'todo', 'low', NOW() + INTERVAL '14 days', $3, $1, '7890 Sunset Rd', NULL, 5),
         ('Send late rent notice - Unit 308',
          'Rent 5 days past due. Send formal notice per Nevada NRS 118A.210.',
          'complete', 'urgent', NOW() - INTERVAL '1 day', $2, $1, '4521 Desert Inn Rd, Unit 308', NULL, 6),
         ('Prepare Q1 owner financial reports',
          'Compile income/expense reports for all owner accounts. Due by end of month.',
          'in_progress', 'high', NOW() + INTERVAL '12 days', $2, $1, NULL, NULL, 7),
         ('Review vendor insurance certificates',
          'Annual review of COIs for all active vendors. Ensure current coverage.',
          'todo', 'medium', NOW() + INTERVAL '21 days', $1, $1, NULL, NULL, 8),
         ('Marketing campaign review',
          'Evaluate performance of Zillow and social media campaigns. Adjust budgets if needed.',
          'waiting', 'low', NOW() + INTERVAL '9 days', $2, $1, NULL, NULL, 9),
         ('Coordinate AC replacement - Unit 204',
          'Confirm schedule with Rachel Kim HVAC. Order unit and notify tenant of access window.',
          'in_progress', 'urgent', NOW() + INTERVAL '5 days', $3, $2, '8910 Flamingo Rd, Apt 204', NULL, 10)
       RETURNING id`,
      [
        adminId, managerId, agentId,
        contacts[1].id,  // Angela Brooks
        contacts[9].id,  // Priya Desai
        contacts[6].id,  // Marcus Thompson
        contacts[0].id   // Carlos Reyes
      ]
    );
    console.log(`  Inserted ${tasksResult.rowCount} tasks.`);

    // -------------------------------------------------------
    // Task templates
    // -------------------------------------------------------
    console.log('Inserting task templates...');
    const taskTemplatesResult = await client.query(
      `INSERT INTO task_templates (name, description, items, created_by)
       VALUES
         ('Move-In Checklist',
          'Standard checklist for new tenant move-ins.',
          $2::jsonb, $1),
         ('Move-Out Checklist',
          'Standard checklist for tenant move-outs and unit turnover.',
          $3::jsonb, $1),
         ('Lease Renewal Process',
          'Step-by-step process for handling lease renewals.',
          $4::jsonb, $1)
       RETURNING id`,
      [
        adminId,
        JSON.stringify([
          { title: 'Pre-move-in inspection', description: 'Complete unit walkthrough and document condition with photos. Note all existing damage on move-in checklist form.' },
          { title: 'Verify utilities transferred', description: 'Confirm electric, gas, water, and internet accounts are transferred to the new tenant name.' },
          { title: 'Collect move-in funds', description: 'Collect first month rent, security deposit, and any pet deposits. Issue receipts.' },
          { title: 'Distribute keys and access devices', description: 'Provide unit keys, mailbox key, gate remote/code, and parking pass.' },
          { title: 'Review lease terms with tenant', description: 'Walk through key lease provisions: rent due date, maintenance procedures, noise policy, and pet rules.' },
          { title: 'Set up tenant portal account', description: 'Create tenant account in Rentvine for online rent payments and maintenance requests.' },
          { title: 'Update unit status', description: 'Mark unit as occupied in property management system. Update vacancy reports.' }
        ]),
        JSON.stringify([
          { title: 'Send move-out notice acknowledgment', description: 'Confirm receipt of tenant notice. Provide move-out instructions and cleaning checklist.' },
          { title: 'Schedule pre-move-out inspection', description: 'Walk the unit with tenant 1-2 weeks before move-out to identify potential deposit deductions.' },
          { title: 'Conduct final inspection', description: 'Complete detailed inspection after tenant vacates. Document all damage beyond normal wear with photos.' },
          { title: 'Process security deposit disposition', description: 'Itemize deductions and return remaining deposit within 30 days per Nevada law (NRS 118A.242).' },
          { title: 'Coordinate unit turnover', description: 'Schedule cleaning, painting, carpet cleaning, and any necessary repairs for next tenant.' },
          { title: 'Update listings', description: 'If not pre-leased, create or reactivate property listing with updated photos and availability date.' }
        ]),
        JSON.stringify([
          { title: 'Review current lease terms', description: 'Check lease expiration date, current rent, any escalation clauses, and tenant payment history.' },
          { title: 'Run market rent analysis', description: 'Compare current rent to market comps. Determine appropriate rent adjustment if any.' },
          { title: 'Send renewal offer', description: 'Email tenant renewal terms 60-90 days before lease expiration. Include rent adjustment and any updated provisions.' },
          { title: 'Follow up on renewal decision', description: 'Contact tenant if no response within 2 weeks. Document all communication.' },
          { title: 'Prepare new lease documents', description: 'Generate updated lease agreement with new dates, rent amount, and any modified terms.' },
          { title: 'Execute lease', description: 'Collect signatures from all parties. Distribute copies and update property management system.' }
        ])
      ]
    );
    console.log(`  Inserted ${taskTemplatesResult.rowCount} task templates.`);

    // -------------------------------------------------------
    // Chat channels
    // -------------------------------------------------------
    console.log('Inserting chat channels...');
    const channelsResult = await client.query(
      `INSERT INTO chat_channels (name, description, is_direct, created_by)
       VALUES
         ('general',     'Company-wide announcements and discussion',         false, $1),
         ('maintenance', 'Maintenance requests, vendor coordination, and updates', false, $1),
         ('leasing',     'Leasing inquiries, showings, and applications',     false, $1),
         ('urgent',      'Urgent issues requiring immediate attention',       false, $1)
       RETURNING id, name`,
      [adminId]
    );
    console.log(`  Inserted ${channelsResult.rowCount} chat channels.`);

    // Add all users to #general
    const generalChannel = channelsResult.rows.find((c) => c.name === 'general');
    await client.query(
      `INSERT INTO chat_channel_members (channel_id, user_id)
       VALUES ($1, $2), ($1, $3), ($1, $4)`,
      [generalChannel.id, adminId, managerId, agentId]
    );
    console.log('  Added all users to #general channel.');

    // -------------------------------------------------------
    // Marketing campaigns
    // -------------------------------------------------------
    console.log('Inserting marketing campaigns...');
    const campaignsResult = await client.query(
      `INSERT INTO marketing_campaigns (name, type, budget, start_date, end_date, status, notes, created_by)
       VALUES
         ('Spring Vacancy Push - Social Media',
          'social_media', 1500.00,
          (NOW() - INTERVAL '7 days')::date, (NOW() + INTERVAL '23 days')::date,
          'active',
          'Targeted Facebook and Instagram ads for 3 vacant units. Geo-targeted within 15 miles of Las Vegas Strip. A/B testing two ad creatives.',
          $1),
         ('Q1 Owner Acquisition - Email Blast',
          'email_blast', 500.00,
          (NOW() + INTERVAL '3 days')::date, (NOW() + INTERVAL '10 days')::date,
          'draft',
          'Email campaign targeting property owners in Clark County who may need management services. List sourced from county records.',
          $1),
         ('Zillow Premium Listings',
          'online_ad', 800.00,
          (NOW() - INTERVAL '30 days')::date, (NOW() + INTERVAL '60 days')::date,
          'active',
          'Premium placement on Zillow for all active listings. Includes featured badges and priority in search results.',
          $2)
       RETURNING id`,
      [adminId, managerId]
    );
    console.log(`  Inserted ${campaignsResult.rowCount} marketing campaigns.`);

    // -------------------------------------------------------
    // Property listings
    // -------------------------------------------------------
    console.log('Inserting property listings...');
    const listingsResult = await client.query(
      `INSERT INTO property_listings (title, description, address, price, bedrooms, bathrooms, sqft, photos, available_date, status, created_by)
       VALUES
         ('Desert Inn 2BR Apartment',
          'Spacious 2-bedroom apartment with updated kitchen, in-unit washer/dryer, and mountain views. Gated community with pool and fitness center. Minutes from shopping and dining.',
          '4521 Desert Inn Rd, Unit 15, Las Vegas, NV 89121',
          1750.00, 2, 2.0, 1050,
          ARRAY['desert_inn_living.jpg', 'desert_inn_kitchen.jpg', 'desert_inn_bed.jpg'],
          (NOW() + INTERVAL '14 days')::date, 'active', $1),
         ('Sunset Terrace Townhome',
          'Beautiful 3-bedroom townhome with attached 2-car garage, private patio, and open floor plan. Recently renovated with quartz countertops and luxury vinyl plank flooring throughout.',
          '7890 Sunset Rd, Unit B, Las Vegas, NV 89113',
          2350.00, 3, 2.5, 1650,
          ARRAY['sunset_exterior.jpg', 'sunset_living.jpg', 'sunset_kitchen.jpg', 'sunset_master.jpg'],
          (NOW() + INTERVAL '7 days')::date, 'active', $1),
         ('Flamingo Studio - Furnished',
          'Fully furnished studio in vibrant Flamingo corridor. Ideal for traveling professionals. All utilities included. 6-month minimum lease.',
          '8910 Flamingo Rd, Apt 110, Las Vegas, NV 89147',
          1200.00, 0, 1.0, 480,
          ARRAY['flamingo_studio_main.jpg', 'flamingo_studio_kitchen.jpg'],
          NOW()::date, 'active', $2),
         ('Sahara Duplex - Upper Unit',
          'Charming 2-bedroom upper unit in recently renovated duplex. Hardwood floors, central AC, and private balcony. Quiet residential neighborhood.',
          '2450 Sahara Ave, Unit A, Las Vegas, NV 89102',
          1550.00, 2, 1.0, 900,
          ARRAY['sahara_exterior.jpg', 'sahara_living.jpg', 'sahara_bedroom.jpg'],
          (NOW() + INTERVAL '30 days')::date, 'pending', $1)
       RETURNING id`,
      [adminId, managerId]
    );
    console.log(`  Inserted ${listingsResult.rowCount} property listings.`);

    // -------------------------------------------------------
    // Rentvine metrics
    // -------------------------------------------------------
    console.log('Inserting rentvine metrics...');
    await client.query(
      `INSERT INTO rentvine_metrics (units_managed, open_maintenance, vacancy_count, updated_by)
       VALUES (47, 8, 3, $1)`,
      [adminId]
    );
    console.log('  Inserted 1 rentvine metrics row.');

    // -------------------------------------------------------
    // Settings
    // -------------------------------------------------------
    console.log('Inserting settings...');
    await client.query(
      `INSERT INTO settings (key, value)
       VALUES ('weather_config', $1::jsonb)`,
      [JSON.stringify({ location: 'Las Vegas,NV,US', units: 'imperial' })]
    );
    console.log('  Inserted settings.');

    // -------------------------------------------------------
    // Commit
    // -------------------------------------------------------
    await client.query('COMMIT');
    console.log('\nSeed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
