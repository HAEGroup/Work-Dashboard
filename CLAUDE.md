# CLAUDE.md - Work-Dashboard

This file provides context and conventions for AI assistants working on this repository.

## Project Overview

**Red Rock Property Management Dashboard** — a full-stack web application providing CRM, email, calendar, task management, real-time chat, marketing tools, and Rentvine integration for a property management company. Deployed via Docker on a VPS.

## Repository Structure

```
Work-Dashboard/
├── client/                     # React 18 frontend
│   ├── public/                 # Static assets (index.html)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Layout.js, Sidebar.js, Header.js
│   │   │   └── (module dirs)   # crm/, email/, calendar/, etc. (for future components)
│   │   ├── pages/              # Page-level components (one per route)
│   │   ├── services/           # api.js (axios instance with auth interceptor)
│   │   ├── store/              # AuthContext.js (React Context for auth state)
│   │   ├── styles/             # index.css (Tailwind + global styles)
│   │   ├── App.js              # Router, protected routes
│   │   └── index.js            # Entry point
│   ├── tailwind.config.js      # Custom colors: redrock, sandstone, slate
│   ├── package.json
│   └── Dockerfile
├── server/                     # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # PostgreSQL connection pool
│   │   │   ├── migrate.js      # Database schema creation
│   │   │   └── seed.js         # Sample data seeding
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT auth + role-based access (auth, requireRole)
│   │   ├── routes/             # One file per module: auth, users, contacts,
│   │   │                       # activities, emails, calendar, tasks, chat,
│   │   │                       # marketing, weather, rentvine, dashboard, settings
│   │   ├── services/
│   │   │   └── chatSocket.js   # Socket.io real-time chat handler
│   │   └── index.js            # Express app + Socket.io server setup
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── nginx.conf              # Reverse proxy with WebSocket support
├── docker-compose.yml          # Full stack: postgres, server, client, nginx
├── .env.example                # All environment variables documented
├── .gitignore
├── CLAUDE.md                   # This file
└── README.md                   # Deployment and usage instructions
```

## Tech Stack

- **Frontend:** React 18 with React Router v6
- **Styling:** Tailwind CSS with custom brand colors
- **Icons:** Lucide React
- **Backend:** Node.js with Express
- **Database:** PostgreSQL 15 (via `pg` driver, raw SQL queries)
- **Real-time:** Socket.io (server + client)
- **Authentication:** JWT (jsonwebtoken + bcryptjs)
- **Email:** Nodemailer (SMTP)
- **HTTP Client:** Axios (frontend), node-fetch (backend)
- **Deployment:** Docker + Docker Compose + Nginx reverse proxy
- **Package Manager:** npm

## Brand Colors

| Name | Hex | Tailwind Class |
|------|-----|----------------|
| Red Rock (primary) | `#8B2500` | `redrock-500` |
| Sandstone (warm accent) | `#D4A574` | `sandstone-400` |
| Dark Slate | `#2D3436` | `slate-500` |
| White | `#FFFFFF` | `white` |

These are defined in `client/tailwind.config.js` with full shade scales (50–900).

## Development Setup

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Set up PostgreSQL
createdb redrock_dashboard
cp .env.example .env  # Edit with your DB credentials

# 3. Run migrations and seed
cd server
npm run migrate
npm run seed

# 4. Start dev servers
cd server && npm run dev     # Backend on :5000
cd client && npm start       # Frontend on :3000
```

## Common Commands

```bash
# Server
cd server
npm start              # Production start
npm run dev            # Development with nodemon
npm run migrate        # Create/update database tables
npm run seed           # Load sample data
npm run migrate:seed   # Both in sequence

# Client
cd client
npm start              # Dev server on :3000
npm run build          # Production build

# Docker (production)
docker compose up -d              # Start all services
docker compose exec server npm run migrate   # Run migrations
docker compose exec server npm run seed      # Seed data
docker compose down               # Stop all services
docker compose up -d --build      # Rebuild after changes
```

## Default Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@redrockpm.com | password123 |
| Manager | sarah@redrockpm.com | password123 |
| Agent | james@redrockpm.com | password123 |

## Database

PostgreSQL with these tables:

- `users` — app users with roles (admin/manager/agent)
- `contacts` — CRM contacts (tenant/owner/vendor/lead)
- `activities` — CRM activity log per contact
- `email_accounts` — IMAP/SMTP account configurations
- `emails` — stored emails with folder system
- `email_templates` — reusable email templates
- `calendar_events` — calendar entries with categories
- `tasks` — task items with kanban status tracking
- `task_templates` — reusable task checklists
- `chat_channels` — team and direct message channels
- `chat_channel_members` — channel membership
- `chat_messages` — chat message history
- `marketing_campaigns` — marketing campaign tracker
- `marketing_content` — content calendar items
- `property_listings` — property listings for marketing
- `rentvine_metrics` — manually updated Rentvine KPIs
- `settings` — key-value app configuration

Schema is defined in `server/src/config/migrate.js`. All tables use UUID primary keys.

## API Route Pattern

All routes are in `server/src/routes/`. Each file exports an Express Router.

- Routes are mounted at `/api/<module>` in `server/src/index.js`
- Protected routes use `auth` middleware from `server/src/middleware/auth.js`
- Admin-only routes add `requireRole('admin')` middleware
- All queries use parameterized SQL (no ORM)
- Standard response pattern: `res.json({ data })` or `res.status(code).json({ error })`

## Frontend Architecture

- **Routing:** React Router v6 in `App.js`. All authenticated routes render inside `<Layout>` (sidebar + header).
- **Auth:** `AuthContext` provides `user`, `login`, `logout`, `register`. Token stored in `localStorage`.
- **API calls:** All go through `services/api.js` (axios instance with auth interceptor). 401 responses auto-redirect to login.
- **Pages:** Each module has one page component in `pages/`. Pages manage their own state and API calls.
- **No state management library** — local state with `useState`/`useEffect` per page, auth via React Context.

## Git Workflow

- **Default branch:** `master`
- **Remote:** `origin` → `HAEGroup/Work-Dashboard`
- Use descriptive commit messages in imperative mood
- Feature branches: `feature/<description>` or `claude/<session-id>`
- Keep commits focused and atomic

## Code Conventions

### General
- Prefer clarity over cleverness
- Keep functions small and single-purpose
- Use meaningful variable and function names
- Delete unused code rather than commenting it out

### File Naming
- React components and pages: PascalCase (e.g., `ContactsPage.js`, `Sidebar.js`)
- Services/utilities: camelCase (e.g., `api.js`, `chatSocket.js`)
- Route files: camelCase, plural noun (e.g., `contacts.js`, `emails.js`)
- Config files: camelCase (e.g., `db.js`, `migrate.js`)

### Imports
- Group: external libraries → internal services/store → relative imports
- React and hooks first, then libraries, then local modules

### Backend Pattern
- Each route file: `const router = require('express').Router()` + `router.use(auth)` + route handlers + `module.exports = router`
- Use `COALESCE` for partial updates in PUT endpoints
- Static routes (e.g., `/overdue`, `/templates`) defined before `/:id` param routes

### Frontend Pattern
- Each page: functional component with hooks, fetch data in `useEffect`, local state management
- Loading states: spinner or skeleton UI
- Forms: controlled inputs with `useState` object, submit via `api.post/put`
- Modals: toggled by boolean state, render inline with backdrop

## Environment Variables

See `.env.example` for the full list. Key groups:

| Group | Variables | Required |
|-------|-----------|----------|
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Yes |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN` | Yes |
| Server | `NODE_ENV`, `SERVER_PORT` | No (defaults exist) |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No (email sending disabled without) |
| Weather | `WEATHER_API_KEY`, `WEATHER_DEFAULT_LOCATION` | No (mock data without key) |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | No (placeholder) |
| Rentvine | `RENTVINE_API_URL`, `RENTVINE_API_KEY` | No (manual metrics without) |

## AI Assistant Guidelines

When working on this codebase:

1. **Read before writing** — Always read existing files before making modifications
2. **Follow existing patterns** — Match the route/page/component patterns already established
3. **Minimal changes** — Only modify what is necessary to accomplish the task
4. **No over-engineering** — Avoid adding unnecessary abstractions or features
5. **Update this file** — When introducing structural changes, update CLAUDE.md
6. **Raw SQL** — The backend uses raw parameterized SQL queries (no ORM). Keep this pattern.
7. **No new state libraries** — Frontend uses React Context + local state. Don't introduce Redux/Zustand/etc.
8. **Brand consistency** — Use the defined Tailwind color classes (redrock, sandstone, slate)
9. **Security** — Never commit `.env` or credentials. Use parameterized queries for all DB operations.
10. **Test with seed data** — Run `npm run migrate:seed` to reset the database to a known state
