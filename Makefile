.PHONY: help build up down restart logs clean dev prod backup restore

# Default target
help:
	@echo "منصة اختبار الاختراق والأمن الهجومي - Docker Commands"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev              - Start development environment"
	@echo "  make dev-logs         - View development logs"
	@echo "  make dev-down         - Stop development environment"
	@echo ""
	@echo "Production Commands:"
	@echo "  make build            - Build production images"
	@echo "  make up               - Start production environment"
	@echo "  make down             - Stop production environment"
	@echo "  make restart          - Restart production environment"
	@echo "  make logs             - View production logs"
	@echo "  make prod-nginx       - Start production with Nginx"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-backup        - Backup database"
	@echo "  make db-restore       - Restore database from backup"
	@echo "  make db-shell         - Access database shell"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  make clean            - Remove all containers and volumes"
	@echo "  make prune            - Clean up Docker resources"
	@echo "  make ps               - Show running containers"
	@echo "  make stats            - Show container resource usage"

# Development environment
dev:
	docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started at http://localhost:3000"

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-rebuild:
	docker-compose -f docker-compose.dev.yml up -d --build

# Production environment
build:
	docker-compose build --no-cache

up:
	docker-compose up -d
	@echo "Production environment started at http://localhost:3000"

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

prod-nginx:
	docker-compose --profile production up -d
	@echo "Production environment with Nginx started"
	@echo "HTTP: http://localhost"
	@echo "HTTPS: https://localhost"

# Container management
ps:
	docker-compose ps

stats:
	docker stats

shell-app:
	docker-compose exec app sh

shell-db:
	docker-compose exec postgres psql -U postgres -d penetration_testing_platform

shell-redis:
	docker-compose exec redis redis-cli

# Database operations
db-backup:
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres penetration_testing_platform > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Database backup created in backups/"

db-restore:
	@read -p "Enter backup file path: " backup_file; \
	docker-compose exec -T postgres psql -U postgres penetration_testing_platform < $$backup_file
	@echo "Database restored"

db-shell:
	docker-compose exec postgres psql -U postgres -d penetration_testing_platform

# Cleanup
clean:
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	@echo "All containers and volumes removed"

prune:
	docker system prune -a --volumes
	@echo "Docker resources cleaned up"

# SSL certificates (for testing)
ssl-cert:
	@mkdir -p nginx/ssl
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout nginx/ssl/key.pem \
		-out nginx/ssl/cert.pem \
		-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
	@echo "Self-signed SSL certificate created"

# Health checks
health:
	@echo "Checking service health..."
	@docker-compose ps
	@echo ""
	@curl -f http://localhost:3000/health || echo "App health check failed"
