#!/bin/bash
# Development environment initialization script
# منصة اختبار الاختراق والأمن الهجومي

set -e

echo "=================================="
echo "Development Environment Setup"
echo "=================================="
echo ""

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    
    # Update with development defaults
    sed -i 's/DB_PASSWORD=your_password/DB_PASSWORD=devpassword/' .env
    sed -i 's/DB_NAME=penetration_testing_platform/DB_NAME=penetration_testing_platform_dev/' .env
    
    echo "✓ .env file created with development defaults"
else
    echo "✓ .env file already exists"
fi

echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p data/reports
mkdir -p data/uploads
mkdir -p backups

echo "✓ Directories created"
echo ""

# Build and start development environment
echo "Building and starting development environment..."
docker-compose -f docker-compose.dev.yml up -d --build

echo "✓ Development environment started"
echo ""

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
    echo "✓ Services are running"
else
    echo "⚠️  Warning: Some services may not be running"
    echo "Check logs with: docker-compose -f docker-compose.dev.yml logs"
fi

echo ""
echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Development server is running at:"
echo "  http://localhost:3000"
echo ""
echo "Services:"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose -f docker-compose.dev.yml logs -f"
echo "  Stop services:    docker-compose -f docker-compose.dev.yml down"
echo "  Restart services: docker-compose -f docker-compose.dev.yml restart"
echo "  Run tests:        docker-compose -f docker-compose.test.yml up"
echo ""
echo "Or use the Makefile:"
echo "  make dev          - Start development environment"
echo "  make dev-logs     - View logs"
echo "  make dev-down     - Stop environment"
echo ""
