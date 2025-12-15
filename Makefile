# Claude Code Development Workflow System
# Complete containerized development environment

.PHONY: help install dev prod stop clean logs shell health test build deploy

# Default target
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

## Show this help message
help:
	@echo "$(GREEN)Claude Code Development Workflow System$(NC)"
	@echo "$(YELLOW)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(GREEN)<target>$(NC)\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## Install dependencies and setup system
install:
	@echo "$(GREEN)Installing dependencies...$(NC)"
	npm install
	cd frontend && npm install
	@echo "$(GREEN)Setting up database...$(NC)"
	npm run migrate
	@echo "$(GREEN)Installation complete!$(NC)"

## Start development environment
dev:
	@echo "$(GREEN)Starting development environment...$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3001$(NC)"
	docker-compose -f docker-compose.dev.yml up -d || true
	npm run dev &
	cd frontend && npm run dev &
	@echo "$(GREEN)Development servers started!$(NC)"

## Start production environment
prod:
	@echo "$(GREEN)Starting production environment...$(NC)"
	docker-compose -f docker-compose.prod.yml up -d
	@echo "$(GREEN)Production environment started on port 3000$(NC)"

## Stop all services
stop:
	@echo "$(YELLOW)Stopping all services...$(NC)"
	docker-compose -f docker-compose.dev.yml down || true
	docker-compose -f docker-compose.prod.yml down || true
	pkill -f "npm run dev" || true
	pkill -f "tsx watch" || true
	@echo "$(GREEN)All services stopped$(NC)"

## Clean up containers and volumes
clean: stop
	@echo "$(YELLOW)Cleaning up containers and volumes...$(NC)"
	docker-compose -f docker-compose.dev.yml down -v || true
	docker-compose -f docker-compose.prod.yml down -v || true
	docker system prune -f
	@echo "$(GREEN)Cleanup complete$(NC)"

## View logs from all services
logs:
	@echo "$(GREEN)Viewing service logs...$(NC)"
	docker-compose -f docker-compose.dev.yml logs -f || tail -f logs/*.log

## Access container shell
shell:
	@echo "$(GREEN)Accessing container shell...$(NC)"
	docker-compose -f docker-compose.dev.yml exec app bash || docker run -it --rm -v $(PWD):/workspace node:18-alpine sh

## Check system health
health:
	@echo "$(GREEN)Checking system health...$(NC)"
	@curl -s http://localhost:3000/health || echo "$(RED)Backend not responding$(NC)"
	@curl -s http://localhost:3001 > /dev/null && echo "$(GREEN)Frontend: OK$(NC)" || echo "$(RED)Frontend: Not responding$(NC)"

## Run all tests
test:
	@echo "$(GREEN)Running test suite...$(NC)"
	npm run test
	cd frontend && npm run test

## Build for production
build:
	@echo "$(GREEN)Building for production...$(NC)"
	npm run build
	cd frontend && npm run build

## Deploy to production
deploy:
	@echo "$(GREEN)Deploying to production...$(NC)"
	./scripts/deploy-production.sh

## Quick development setup (install + dev)
quick: install dev

## Restart development environment
restart: stop dev

## Update dependencies
update:
	@echo "$(GREEN)Updating dependencies...$(NC)"
	npm update
	cd frontend && npm update

## Database operations
db-migrate:
	@echo "$(GREEN)Running database migrations...$(NC)"
	npm run migrate

db-seed:
	@echo "$(GREEN)Seeding database...$(NC)"
	npm run seed

db-reset: stop
	@echo "$(YELLOW)Resetting database...$(NC)"
	npm run migrate
	npm run seed

## Claude Code operations
claude-setup:
	@echo "$(GREEN)Setting up Claude Code...$(NC)"
	./scripts/claude-setup.sh

claude-auth:
	@echo "$(GREEN)Authenticating with Claude...$(NC)"
	./scripts/claude-auth.sh

claude-terminal:
	@echo "$(GREEN)Opening Claude Code terminal...$(NC)"
	docker-compose -f docker-compose.dev.yml exec app claude

## Agent operations
agents-list:
	@echo "$(GREEN)Listing active agents...$(NC)"
	curl -s http://localhost:3000/api/v1/agents || echo "$(RED)API not available$(NC)"

agents-status:
	@echo "$(GREEN)Checking agent status...$(NC)"
	curl -s http://localhost:3000/api/v1/claude/sessions || echo "$(RED)Claude integration not available$(NC)"

## SPARC operations
sparc-init:
	@echo "$(GREEN)Initializing SPARC workflow...$(NC)"
	curl -X POST -s http://localhost:3000/api/v1/claude/workflows -H "Content-Type: application/json" -d '{"type":"sparc","name":"Development Workflow"}' || echo "$(RED)SPARC init failed$(NC)"

## Monitoring
monitor:
	@echo "$(GREEN)Starting system monitoring...$(NC)"
	./scripts/health-monitor.sh

## Security scan
security-scan:
	@echo "$(GREEN)Running security scan...$(NC)"
	npm audit
	cd frontend && npm audit

## Performance test
perf-test:
	@echo "$(GREEN)Running performance tests...$(NC)"
	./scripts/performance-test.sh

## Backup system
backup:
	@echo "$(GREEN)Creating system backup...$(NC)"
	./scripts/backup-system.sh

## Show system status
status:
	@echo "$(GREEN)System Status:$(NC)"
	@echo "$(YELLOW)Backend:$(NC)"
	@curl -s http://localhost:3000/health | jq . 2>/dev/null || echo "$(RED)Backend offline$(NC)"
	@echo "$(YELLOW)Frontend:$(NC)"
	@curl -s http://localhost:3001 > /dev/null && echo "$(GREEN)Online$(NC)" || echo "$(RED)Offline$(NC)"
	@echo "$(YELLOW)Database:$(NC)"
	@docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready 2>/dev/null && echo "$(GREEN)Connected$(NC)" || echo "$(RED)Disconnected$(NC)"

## Open frontend in browser
open:
	@echo "$(GREEN)Opening AgentLink frontend...$(NC)"
	open http://localhost:3001 || xdg-open http://localhost:3001 || echo "$(YELLOW)Please open http://localhost:3001 manually$(NC)"

## Development workflow shortcuts
work: quick open
	@echo "$(GREEN)Development environment ready!$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3001$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:3000$(NC)"
	@echo "$(YELLOW)API Docs: http://localhost:3000/api/v1$(NC)"