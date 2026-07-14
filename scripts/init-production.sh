#!/bin/bash
# Production initialization script
# منصة اختبار الاختراق والأمن الهجومي

set -e

echo "=================================="
echo "Production Environment Setup"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Source environment variables
source .env

# Validate required environment variables
required_vars=(
    "DB_PASSWORD"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
)

echo "Validating environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env"
        exit 1
    fi
    
    # Check if using default values
    if [[ "${!var}" == *"change_this"* ]] || [[ "${!var}" == *"your_"* ]]; then
        echo "⚠️  Warning: $var appears to be using a default value"
        echo "   Please update it with a secure value"
        exit 1
    fi
done

echo "✓ Environment variables validated"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p nginx/ssl
mkdir -p backups
mkdir -p data/reports
mkdir -p data/uploads

echo "✓ Directories created"
echo ""

# Generate SSL certificates if they don't exist
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo "Generating self-signed SSL certificates..."
    echo "⚠️  Note: For production, use proper SSL certificates (e.g., Let's Encrypt)"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
        2>/dev/null
    
    echo "✓ SSL certificates generated"
else
    echo "✓ SSL certificates already exist"
fi
echo ""

# Build Docker images
echo "Building Docker images..."
docker-compose build --no-cache

echo "✓ Docker images built"
echo ""

# Start services
echo "Starting services..."
docker-compose up -d

echo "✓ Services started"
echo ""

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
echo "Checking service health..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo "✓ Services are healthy"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "Waiting... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "⚠️  Warning: Services may not be fully healthy yet"
    echo "Check logs with: docker-compose logs"
fi

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Application is running at:"
echo "  HTTP:  http://localhost:${PORT:-3000}"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop services:    docker-compose down"
echo "  Restart services: docker-compose restart"
echo ""
echo "⚠️  Security Reminders:"
echo "  1. Change all default passwords"
echo "  2. Use proper SSL certificates in production"
echo "  3. Configure firewall rules"
echo "  4. Set up automated backups"
echo "  5. Enable monitoring and alerts"
echo ""
