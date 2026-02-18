#!/bin/bash
set -e

echo "=== Work-Dashboard Deployment ==="
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is not installed. Install it first: https://docs.docker.com/engine/install/ubuntu/"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "ERROR: docker compose is not installed."; exit 1; }

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env

    # Generate random passwords
    DB_PASS=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
    JWT_SEC=$(openssl rand -base64 48 | tr -d '=/+' | head -c 64)

    # Replace placeholders
    sed -i "s/your-secure-password-here/$DB_PASS/" .env
    sed -i "s/your-jwt-secret-change-this/$JWT_SEC/" .env

    echo "Generated .env with secure random passwords."
    echo ""
    echo "IMPORTANT: Edit .env to set your domain, Google Calendar, and Rentvine credentials:"
    echo "  nano .env"
    echo ""
    read -p "Press Enter to continue after editing .env (or press Enter to use defaults)..."
fi

echo ""
echo "Building and starting containers..."
docker compose build
docker compose up -d

echo ""
echo "Waiting for database to be ready..."
sleep 5

echo ""
echo "Seeding default data..."
docker compose exec server sh -c "npx prisma db seed" 2>/dev/null || echo "Seed already applied or skipped."

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Application is running at: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Default login:"
echo "  Email:    admin@example.com"
echo "  Password: admin123"
echo ""
echo "Change the default password immediately after first login!"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f        # View logs"
echo "  docker compose restart        # Restart services"
echo "  docker compose down            # Stop services"
echo "  docker compose up -d --build   # Rebuild and restart"
