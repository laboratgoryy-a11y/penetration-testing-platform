#!/bin/bash
# Docker setup validation script
# منصة اختبار الاختراق والأمن الهجومي

set -e

echo "=================================="
echo "Docker Setup Validation"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing"
        return 1
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

# Track errors
errors=0

echo "Checking required commands..."
check_command docker || ((errors++))
check_command docker-compose || ((errors++))
echo ""

echo "Checking Docker files..."
check_file "Dockerfile" || ((errors++))
check_file "Dockerfile.dev" || ((errors++))
check_file "docker-compose.yml" || ((errors++))
check_file "docker-compose.dev.yml" || ((errors++))
check_file "docker-compose.test.yml" || ((errors++))
check_file ".dockerignore" || ((errors++))
echo ""

echo "Checking configuration files..."
check_file ".env.example" || ((errors++))
check_file ".env.docker.example" || ((errors++))
check_file "Makefile" || ((errors++))
echo ""

echo "Checking scripts..."
check_file "scripts/init-development.sh" || ((errors++))
check_file "scripts/init-production.sh" || ((errors++))
check_file "scripts/healthcheck.sh" || ((errors++))
echo ""

echo "Checking nginx configuration..."
check_file "nginx/nginx.conf" || ((errors++))
echo ""

echo "Checking documentation..."
check_file "DOCKER_SETUP.md" || ((errors++))
check_file "DOCKER_QUICK_REFERENCE.md" || ((errors++))
echo ""

# Validate Dockerfile syntax
echo "Validating Dockerfile syntax..."
if docker build -f Dockerfile --no-cache -t pentest-validation-test . > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dockerfile syntax is valid"
    docker rmi pentest-validation-test > /dev/null 2>&1
else
    echo -e "${RED}✗${NC} Dockerfile has syntax errors"
    ((errors++))
fi
echo ""

# Validate docker-compose files
echo "Validating docker-compose files..."
if docker-compose -f docker-compose.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.yml has errors"
    ((errors++))
fi

if docker-compose -f docker-compose.dev.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.dev.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.dev.yml has errors"
    ((errors++))
fi

if docker-compose -f docker-compose.test.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.test.yml is valid"
else
    echo -e "${RED}✗${NC} docker-compose.test.yml has errors"
    ((errors++))
fi
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
else
    echo -e "${YELLOW}⚠${NC}  .env file not found (copy from .env.example)"
fi
echo ""

# Summary
echo "=================================="
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Docker setup is ready to use."
    echo ""
    echo "Next steps:"
    echo "  1. Copy .env.example to .env and configure"
    echo "  2. Run: make dev (for development)"
    echo "  3. Run: make up (for production)"
else
    echo -e "${RED}✗ Found $errors error(s)${NC}"
    echo "Please fix the errors above before proceeding."
    exit 1
fi
echo "=================================="
