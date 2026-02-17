# Red Rock Property Management Dashboard

A full-stack web-based work dashboard for **Red Rock Property Management**, built with React, Node.js/Express, and PostgreSQL. Designed for VPS deployment via Docker.

## Features

- **CRM** — Contact database for tenants, owners, vendors, and leads with pipeline tracking, activity logs, CSV import/export
- **Email** — Integrated email client with IMAP/SMTP support, templates, folder management
- **Calendar** — Full calendar with month/week/day views, event categories, Google Calendar integration hook
- **Tasks** — Kanban board and list views with drag-and-drop, templates, overdue alerts
- **Chat** — Real-time internal messaging via Socket.io with channels and direct messages
- **Marketing** — Campaign tracker, content calendar, property listings, lead source analytics
- **Rentvine** — Integration panel with metrics dashboard and iframe embed
- **Weather** — OpenWeatherMap widget with current conditions and 5-day forecast
- **User Management** — JWT authentication, role-based access (Admin/Manager/Agent)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Lucide Icons |
| Backend | Node.js, Express |
| Database | PostgreSQL 15 |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Deployment | Docker, Docker Compose, Nginx |

## Quick Start (Development)

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm

### 1. Clone and configure

```bash
git clone <repository-url>
cd Work-Dashboard
cp .env.example .env
# Edit .env with your database credentials and API keys
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Set up the database

```bash
# Create the database
createdb redrock_dashboard

# Run migrations
cd server
npm run migrate

# Load sample data
npm run seed
```

### 4. Start the servers

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm start
```

The app will be available at `http://localhost:3000`. The API runs on port 5000.

### Default login credentials (from seed data)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@redrockpm.com | password123 |
| Manager | sarah@redrockpm.com | password123 |
| Agent | james@redrockpm.com | password123 |

## VPS Deployment (Ubuntu/Debian)

### Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Docker and Docker Compose installed
- Domain name pointed to your server (optional, for SSL)

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Log out and back in for group changes
```

### 2. Deploy the application

```bash
# Clone the repository
git clone <repository-url>
cd Work-Dashboard

# Configure environment
cp .env.example .env
nano .env  # Set production values:
           #   - Strong DB_PASSWORD
           #   - Random JWT_SECRET
           #   - SMTP credentials
           #   - API keys
           #   - Your DOMAIN

# Start everything
docker compose up -d

# Run database migrations
docker compose exec server npm run migrate

# Load seed data (optional)
docker compose exec server npm run seed
```

The application will be accessible at `http://your-server-ip` (port 80).

### 3. Enable SSL (optional)

1. Place your SSL certificate files in `nginx/ssl/`:
   - `fullchain.pem`
   - `privkey.pem`

2. Edit `nginx/nginx.conf` — uncomment the SSL server block and comment out the HTTP block.

3. Restart nginx:
   ```bash
   docker compose restart nginx
   ```

For Let's Encrypt:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

### 4. Maintenance commands

```bash
# View logs
docker compose logs -f server
docker compose logs -f client

# Restart services
docker compose restart

# Stop everything
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Database backup
docker compose exec postgres pg_dump -U redrock redrock_dashboard > backup.sql

# Database restore
cat backup.sql | docker compose exec -T postgres psql -U redrock redrock_dashboard
```

## Project Structure

```
Work-Dashboard/
├── client/                   # React frontend
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── layout/       # Layout, Sidebar, Header
│   │   │   └── ...           # Module-specific components
│   │   ├── pages/            # Page-level components
│   │   ├── services/         # API client (axios)
│   │   ├── store/            # AuthContext
│   │   ├── styles/           # Global CSS + Tailwind
│   │   └── App.js            # Router and app shell
│   ├── tailwind.config.js
│   ├── package.json
│   └── Dockerfile
├── server/                   # Express backend
│   ├── src/
│   │   ├── config/           # Database, migrations, seed
│   │   ├── middleware/        # Auth middleware
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Socket.io chat service
│   │   └── index.js          # Server entry point
│   ├── package.json
│   └── Dockerfile
├── nginx/                    # Reverse proxy config
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
├── CLAUDE.md
└── README.md
```

## API Endpoints

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/auth` | Login, register, current user |
| Users | `/api/users` | User management (admin) |
| Contacts | `/api/contacts` | CRM contacts CRUD |
| Activities | `/api/activities` | CRM activity log |
| Emails | `/api/emails` | Email client, accounts, templates |
| Calendar | `/api/calendar` | Events CRUD, Google Calendar hook |
| Tasks | `/api/tasks` | Tasks CRUD, templates |
| Chat | `/api/chat` | Channels, messages |
| Marketing | `/api/marketing` | Campaigns, content, listings, analytics |
| Weather | `/api/weather` | Current weather + forecast |
| Rentvine | `/api/rentvine` | Metrics, config |
| Dashboard | `/api/dashboard` | Aggregated summary data |
| Settings | `/api/settings` | App configuration |

## Environment Variables

See `.env.example` for all available configuration options including:

- Database connection (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- JWT configuration (JWT_SECRET, JWT_EXPIRES_IN)
- SMTP email settings (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- OpenWeatherMap API key (WEATHER_API_KEY)
- Google Calendar OAuth credentials
- Rentvine API configuration

## License

Private — Red Rock Property Management.
