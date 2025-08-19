# Makefile for Claude Code + AgentLink Development Environment
# Infrastructure management and development commands

.PHONY: help build dev prod up down logs shell test clean backup restore health

# Default target
help: ## Show this help message
	@echo "Claude Code + AgentLink Development Environment"
	@echo "================================================"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development Commands
dev: ## Start development environment with hot reload
	@echo "Starting development environment..."
	docker-compose -f docs/docker-compose.yml up --build

dev-detached: ## Start development environment in background
	@echo "Starting development environment (detached)..."
	docker-compose -f docs/docker-compose.yml up --build -d

dev-rebuild: ## Rebuild and start development environment
	@echo "Rebuilding development environment..."
	docker-compose -f docs/docker-compose.yml up --build --force-recreate

# Production Commands
prod: ## Start production environment
	@echo "Starting production environment..."
	docker-compose -f docs/docker-compose.prod.yml up --build

prod-detached: ## Start production environment in background
	@echo "Starting production environment (detached)..."
	docker-compose -f docs/docker-compose.prod.yml up --build -d

# Build Commands
build: ## Build Docker images
	@echo "Building Docker images..."
	docker-compose -f docs/docker-compose.yml build

build-prod: ## Build production Docker images
	@echo "Building production Docker images..."
	docker-compose -f docs/docker-compose.prod.yml build

build-no-cache: ## Build Docker images without cache
	@echo "Building Docker images (no cache)..."
	docker-compose -f docs/docker-compose.yml build --no-cache

# Container Management
up: dev ## Alias for dev command

down: ## Stop and remove containers
	@echo "Stopping containers..."
	docker-compose -f docs/docker-compose.yml down
	docker-compose -f docs/docker-compose.prod.yml down

stop: ## Stop containers without removing
	@echo "Stopping containers..."
	docker-compose -f docs/docker-compose.yml stop
	docker-compose -f docs/docker-compose.prod.yml stop

restart: ## Restart containers
	@echo "Restarting containers..."
	$(MAKE) down
	$(MAKE) dev

# Logging and Debugging
logs: ## Show container logs
	docker-compose -f docs/docker-compose.yml logs -f

logs-prod: ## Show production container logs
	docker-compose -f docs/docker-compose.prod.yml logs -f

logs-tail: ## Show last 100 lines of logs
	docker-compose -f docs/docker-compose.yml logs --tail=100

shell: ## Open shell in development container
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev /bin/bash

shell-prod: ## Open shell in production container
	docker-compose -f docs/docker-compose.prod.yml exec agentfeed-prod /bin/bash

# Database Commands
db-shell: ## Open PostgreSQL shell
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev su postgres -c "psql -d agentfeed"

db-dump: ## Create database backup
	@echo "Creating database backup..."
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev su postgres -c "pg_dump agentfeed" > backup_$(shell date +%Y%m%d_%H%M%S).sql

db-restore: ## Restore database from backup (requires BACKUP_FILE variable)
	@if [ -z "$(BACKUP_FILE)" ]; then echo "Usage: make db-restore BACKUP_FILE=backup.sql"; exit 1; fi
	@echo "Restoring database from $(BACKUP_FILE)..."
	docker-compose -f docs/docker-compose.yml exec -T agentfeed-dev su postgres -c "psql -d agentfeed" < $(BACKUP_FILE)

db-reset: ## Reset database to initial state
	@echo "Resetting database..."
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev su postgres -c "dropdb agentfeed && createdb agentfeed"
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev su postgres -c "psql -d agentfeed -f /app/database/schema.sql"

# Testing Commands
test: ## Run tests in container
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npm test

test-watch: ## Run tests in watch mode
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npm run test:watch

test-coverage: ## Run tests with coverage
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npm run test:coverage

e2e-test: ## Run end-to-end tests
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npm run test:e2e

# Claude Flow Commands
swarm-init: ## Initialize Claude Flow swarm
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npx claude-flow@alpha swarm init mesh --max-agents 17

swarm-status: ## Check swarm status
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npx claude-flow@alpha swarm status

agents-list: ## List active agents
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npx claude-flow@alpha agent list

sparc-dev: ## Run SPARC development mode
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npx claude-flow@alpha sparc dev "$(TASK)"

# Health and Monitoring
health: ## Check system health
	@echo "Checking system health..."
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev /app/healthcheck.sh

health-prod: ## Check production system health
	@echo "Checking production system health..."
	docker-compose -f docs/docker-compose.prod.yml exec agentfeed-prod /app/healthcheck.sh

stats: ## Show container resource usage
	docker stats

ps: ## Show running containers
	docker-compose -f docs/docker-compose.yml ps
	docker-compose -f docs/docker-compose.prod.yml ps

# Maintenance Commands
clean: ## Clean up containers, images, and volumes
	@echo "Cleaning up Docker resources..."
	docker-compose -f docs/docker-compose.yml down -v --remove-orphans
	docker-compose -f docs/docker-compose.prod.yml down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

clean-all: ## Clean up everything including images
	@echo "Cleaning up all Docker resources..."
	$(MAKE) clean
	docker image prune -a -f

backup: ## Create full system backup
	@echo "Creating system backup..."
	mkdir -p backups/$(shell date +%Y%m%d_%H%M%S)
	$(MAKE) db-dump
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev tar -czf /tmp/claude-config-backup.tar.gz -C /app .claude
	docker cp agentfeed-dev:/tmp/claude-config-backup.tar.gz backups/$(shell date +%Y%m%d_%H%M%S)/
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev tar -czf /tmp/memory-backup.tar.gz -C /app memory
	docker cp agentfeed-dev:/tmp/memory-backup.tar.gz backups/$(shell date +%Y%m%d_%H%M%S)/

restore: ## Restore from backup (requires BACKUP_DIR variable)
	@if [ -z "$(BACKUP_DIR)" ]; then echo "Usage: make restore BACKUP_DIR=backups/20231201_120000"; exit 1; fi
	@echo "Restoring from $(BACKUP_DIR)..."
	# Implementation depends on backup structure

# Security Commands
security-scan: ## Run security scan on containers
	@echo "Running security scan..."
	docker scout cves agentfeed-dev 2>/dev/null || echo "Docker Scout not available"
	
vulnerability-check: ## Check for vulnerabilities
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npm audit

# Performance Commands
benchmark: ## Run performance benchmarks
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npx claude-flow@alpha benchmark run

memory-usage: ## Show memory usage
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev free -h
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npx claude-flow@alpha memory usage

# Development Utilities
lint: ## Run linter
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npm run lint

format: ## Format code
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npm run format

typecheck: ## Run TypeScript type checking
	docker-compose -f docs/docker-compose.yml exec agentfeed-dev npm run typecheck

# Installation and Setup
install: ## Install and setup development environment
	@echo "Setting up Claude Code + AgentLink development environment..."
	@echo "1. Building Docker images..."
	$(MAKE) build
	@echo "2. Starting development environment..."
	$(MAKE) dev-detached
	@echo "3. Waiting for services to be ready..."
	sleep 30
	@echo "4. Checking health..."
	$(MAKE) health
	@echo "5. Initializing swarm..."
	$(MAKE) swarm-init
	@echo "Installation complete! Access the application at http://localhost:3000"

uninstall: ## Uninstall and clean up everything
	@echo "Uninstalling Claude Code + AgentLink environment..."
	$(MAKE) clean-all
	@echo "Uninstall complete!"

# Quick commands
quick-start: install ## Quick installation and startup
quick-test: test health ## Quick test and health check
quick-deploy: build-prod prod-detached health-prod ## Quick production deployment