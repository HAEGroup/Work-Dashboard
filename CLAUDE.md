# CLAUDE.md - Work-Dashboard

This file provides context and conventions for AI assistants working on this repository.

## Project Overview

**Work-Dashboard** is a self-hosted work management suite for a small property management team (2-5 users). It includes email, calendar, double-entry accounting, task/project management, and Rentvine property management integration.

## Repository Structure

```
Work-Dashboard/
├── CLAUDE.md              # AI assistant guidelines (this file)
├── docker-compose.yml     # Production deployment config
├── .env.example           # Environment variable template
├── .gitignore
├── package.json           # Root workspace scripts
├── server/                # Backend (Express + TypeScript)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema (all models)
│   │   └── seed.ts        # Default data seeder
│   └── src/
│       ├── index.ts       # Express app entry point
│       ├── config/
│       │   ├── env.ts     # Environment variable config
│       │   └── database.ts # Prisma client singleton
│       ├── middleware/
│       │   ├── auth.ts    # JWT auth + role-based access
│       │   └── errorHandler.ts
│       └── modules/       # Feature modules (self-contained)
│           ├── auth/      # Login, register, user management
│           ├── accounting/ # Double-entry bookkeeping, reports
│           ├── email/     # IMAP/SMTP email client
│           ├── calendar/  # Events + Google Calendar sync
│           ├── tasks/     # Projects, tasks, time tracking
│           ├── rentvine/  # Rentvine API integration
│           └── dashboard/ # Aggregated dashboard data
├── client/                # Frontend (React + TypeScript)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx       # React entry point
│       ├── App.tsx        # Router + auth wrapper
│       ├── types/         # TypeScript interfaces
│       ├── services/      # API client (axios)
│       ├── store/         # Zustand auth store
│       ├── styles/        # Tailwind CSS + component classes
│       ├── components/
│       │   ├── layout/    # Sidebar, AppLayout
│       │   └── shared/    # Reusable components
│       └── pages/         # Page-level components
└── nginx/                 # Reverse proxy config
    └── nginx.conf
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 3, Zustand, React Router 7, Recharts, date-fns, Lucide icons
- **Backend:** Node.js, Express 4, TypeScript, Prisma ORM
- **Database:** PostgreSQL 16
- **Auth:** JWT + bcrypt, role-based (ADMIN, MANAGER, VIEWER)
- **Email:** ImapFlow (IMAP), Nodemailer (SMTP), mailparser
- **Calendar:** Google Calendar API (googleapis)
- **Deployment:** Docker Compose, nginx reverse proxy
- **Validation:** Zod (server-side)

## Development Setup

```bash
# 1. Clone and install
cd Work-Dashboard
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 2. Set up environment
cp server/.env.example server/.env
# Edit server/.env with your database URL

# 3. Start PostgreSQL (Docker or local)
docker run -d --name work-db -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=work_dashboard postgres:16-alpine

# 4. Set up database
cd server
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 5. Run development servers
npm run dev
# Server: http://localhost:3001
# Client: http://localhost:5173
```

## Common Commands

```bash
# Development
npm run dev              # Start both server and client
npm run dev:server       # Start server only
npm run dev:client       # Start client only

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema changes (dev)
npm run db:seed          # Seed default data
npm run db:studio        # Open Prisma Studio GUI

# Build
npm run build            # Build both server and client
npm run build:server     # Build server only
npm run build:client     # Build client only

# Docker (production)
npm run docker:build     # Build Docker images
npm run docker:up        # Start all services
npm run docker:down      # Stop all services

# Lint
npm run lint             # Lint both server and client
```

## Git Workflow

- **Default branch:** `main`
- Use descriptive commit messages in imperative mood (e.g., "Add user authentication")
- Feature branches should follow the pattern: `feature/<description>` or `claude/<session-id>`
- Keep commits focused and atomic

## Architecture

### Modular Backend

Each feature is a self-contained module in `server/src/modules/`:
- **routes.ts** - Express route handlers with Zod validation
- **service.ts** - Business logic (where applicable)
- **client.ts** - External API clients (Rentvine)

To add a new module:
1. Create `server/src/modules/<name>/routes.ts`
2. Register routes in `server/src/index.ts`
3. Add Prisma models to `prisma/schema.prisma` if needed

### Frontend Pages

Each page maps to a route in `client/src/App.tsx`. Pages are self-contained and fetch their own data via the API service.

To add a new page:
1. Create `client/src/pages/<Name>Page.tsx`
2. Add route in `client/src/App.tsx`
3. Add sidebar link in `client/src/components/layout/Sidebar.tsx`

## Code Conventions

### General

- TypeScript strict mode enabled
- Zod for all API input validation
- Prisma for all database operations (no raw SQL)
- JWT auth required on all /api routes except /api/auth/login and /api/health
- Role-based access: ADMIN > MANAGER > VIEWER
- Prefer clarity over cleverness
- Delete unused code rather than commenting it out

### File Naming

- Backend files: camelCase (e.g., `errorHandler.ts`)
- Frontend components: PascalCase (e.g., `DashboardPage.tsx`)
- Database tables: snake_case (via Prisma @@map)
- API routes: kebab-case (e.g., `/api/journal-entries`)

### Imports

- Group imports: external libraries first, then internal modules, then relative imports
- Backend uses relative imports
- Frontend uses `@/` alias for `src/`

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | Secret for JWT signing | Yes | - |
| `JWT_EXPIRES_IN` | Token expiry | No | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | No | - |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URL | No | - |
| `RENTVINE_API_KEY` | Rentvine API key | No | - |
| `RENTVINE_API_SECRET` | Rentvine API secret | No | - |
| `CLIENT_URL` | Frontend URL (for CORS) | No | `http://localhost:5173` |

## Default Login (after seeding)

- Email: `admin@example.com`
- Password: `admin123`

## Accounting Model

- Multi-entity: separate books per property/entity with consolidated views
- Double-entry: every journal entry must balance (debits = credits)
- Account types: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
- Reports: Trial Balance, Balance Sheet, Income Statement
- Default chart of accounts is property-management focused

## Rentvine Integration

- API credentials configured via Settings UI or environment variables
- Sync pulls: properties, units, tenants, maintenance requests, transactions
- All synced data stored locally with `rawData` JSON field for full API response
- Manual sync trigger from Properties page or API

## AI Assistant Guidelines

When working on this codebase:

1. **Read before writing** - Always read existing files before making modifications
2. **Follow existing patterns** - Match the style and conventions already present in the code
3. **Minimal changes** - Only modify what is necessary to accomplish the task
4. **No over-engineering** - Avoid adding features, abstractions, or error handling beyond what is requested
5. **Update this file** - When introducing new conventions, dependencies, or structural changes, update CLAUDE.md accordingly
6. **Test your changes** - Run the test suite after making changes (once tests exist)
7. **Check the build** - Verify the project builds successfully after changes
8. **Security first** - Never introduce secrets, credentials, or known vulnerabilities
