#!/bin/bash

# Rollback Script for CI/CD Pipeline
# This script rolls back to the previous version in case of deployment failure

set -e

# Configuration
BACKUP_DIR="/opt/backups/pentest-platform"
APP_DIR="/opt/pentest-platform"

echo "=========================================="
echo "Starting rollback procedure..."
echo "=========================================="

# Stop current containers
echo "Stopping current containers..."
cd "${APP_DIR}"
docker-compose down

# Get the latest backup
LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/pentest_platform_*.sql.gz | head -1)

if [ -z "${LATEST_BACKUP}" ]; then
    echo "✗ No backup found! Cannot rollback database."
    echo "Attempting to restart services with previous image..."
else
    echo "Found backup: ${LATEST_BACKUP}"
    echo "Restoring database from backup..."
    
    # Start only the database container
    docker-compose up -d postgres
    sleep 10
    
    # Restore the database
    gunzip -c "${LATEST_BACKUP}" | docker-compose exec -T postgres psql -U postgres -d pentest_platform
    
    if [ $? -eq 0 ]; then
        echo "✓ Database restored successfully"
    else
        echo "✗ Database restoration failed!"
        exit 1
    fi
fi

# Pull the previous Docker image
echo "Pulling previous Docker image..."
PREVIOUS_TAG=$(docker images --format "{{.Tag}}" | grep -v "latest" | head -2 | tail -1)

if [ -z "${PREVIOUS_TAG}" ]; then
    echo "✗ No previous image found!"
    echo "Using 'latest' tag as fallback..."
    PREVIOUS_TAG="latest"
fi

echo "Rolling back to tag: ${PREVIOUS_TAG}"

# Update docker-compose to use previous tag
sed -i "s/image: .*pentest-platform:.*/image: ${DOCKER_REGISTRY}\/pentest-platform:${PREVIOUS_TAG}/" docker-compose.yml

# Start all services with previous version
echo "Starting services with previous version..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Health check
echo "Performing health check..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ Rollback successful! Services are healthy."
    echo ""
    echo "=========================================="
    echo "Rollback completed successfully"
    echo "Current version: ${PREVIOUS_TAG}"
    echo "=========================================="
    exit 0
else
    echo "✗ Health check failed after rollback!"
    echo "Manual intervention required."
    exit 1
fi
