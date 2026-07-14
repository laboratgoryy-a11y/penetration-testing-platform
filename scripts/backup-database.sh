#!/bin/bash

# Database Backup Script for CI/CD Pipeline
# This script creates a backup of the PostgreSQL database before deployment

set -e

# Configuration
BACKUP_DIR="/opt/backups/pentest-platform"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="pentest_platform_${TIMESTAMP}.sql"
RETENTION_DAYS=30

# Database credentials from environment or docker-compose
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-pentest_platform}"
DB_USER="${DB_USER:-postgres}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup..."
echo "Timestamp: ${TIMESTAMP}"
echo "Database: ${DB_NAME}"

# Create backup using pg_dump
if docker-compose exec -T postgres pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_DIR}/${BACKUP_FILE}"; then
    echo "✓ Database backup created successfully: ${BACKUP_FILE}"
    
    # Compress the backup
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    echo "✓ Backup compressed: ${BACKUP_FILE}.gz"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
    echo "✓ Backup size: ${BACKUP_SIZE}"
    
    # Remove old backups (older than RETENTION_DAYS)
    echo "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
    find "${BACKUP_DIR}" -name "pentest_platform_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    echo "✓ Old backups cleaned up"
    
    # List recent backups
    echo ""
    echo "Recent backups:"
    ls -lh "${BACKUP_DIR}" | tail -5
    
    exit 0
else
    echo "✗ Database backup failed!"
    exit 1
fi
