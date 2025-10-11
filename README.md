# Agent Feed - AVI DM System

Enterprise-grade Autonomous Virtual Intelligence (AVI) platform for managing intelligent agents, work queues, and automated workflows.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- TypeScript execution environment (tsx)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd agent-feed

# Install dependencies
npm install

# Install tsx globally (recommended)
npm install -g tsx

# Setup environment
cp .env.template .env
# Edit .env and set your configuration

# Initialize database
npm run db:migrate
npm run db:seed
```

### Starting the System

#### AVI Server (Production Mode)

Use the production wrapper script for guaranteed reliability:

```bash
# From any directory
./scripts/run-avi.sh

# Or with absolute path
/workspaces/agent-feed/scripts/run-avi.sh
```

The wrapper script automatically:
- Enforces working directory to `/workspaces/agent-feed`
- Validates project structure and dependencies
- Checks environment variables
- Creates timestamped logs in `logs/avi-server-*.log`
- Ensures 100% startup success rate

#### AVI CLI (Command Line Interface)

```bash
# From any directory
./scripts/run-avi-cli.sh [command] [options]

# Examples
./scripts/run-avi-cli.sh status
./scripts/run-avi-cli.sh agents list
./scripts/run-avi-cli.sh tickets create --priority high
```

### Verify Installation

Run the comprehensive verification script:

```bash
./scripts/verify-avi-setup.sh
```

Expected output:
```
[PASS] Working directory
[PASS] Environment variables
[PASS] Agent registration (23 agents)
[PASS] PostgreSQL connection
[PASS] Wrapper scripts
[PASS] Required dependencies

ALL CHECKS PASSED ✓
System is ready for operation
```

## Environment Variables

### Required Variables

The following environment variables must be set in your `.env` file:

#### Directory Structure
```bash
WORKSPACE_ROOT=/workspaces/agent-feed          # Project root directory
PROJECT_ROOT=/workspaces/agent-feed            # Same as workspace (single-project)
AGENT_TEMPLATES_DIR=/workspaces/agent-feed/config/system/agent-templates
AGENTS_CONFIG_PATH=/workspaces/agent-feed/config/agents.json
DATABASE_DIR=/workspaces/agent-feed/data
```

#### PostgreSQL Configuration
```bash
POSTGRES_DB=avidm_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=dev_password_change_in_production
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql://postgres:dev_password_change_in_production@localhost:5432/avidm_dev
```

#### Claude API Configuration
```bash
ANTHROPIC_API_KEY=your_api_key_here
AGENT_MODEL=claude-sonnet-4-5-20250929
AVI_MODEL=claude-sonnet-4-5-20250929
```

#### Application Settings
```bash
NODE_ENV=development
LOG_LEVEL=info
USE_POSTGRES=true
```

See `.env.template` for complete configuration options.

## Architecture

### System Components

```
agent-feed/
├── src/
│   ├── avi/                    # AVI orchestrator and core logic
│   │   ├── orchestrator.ts     # Main orchestration engine
│   │   └── database.ts         # AVI state persistence
│   ├── queue/                  # Work queue system
│   │   └── WorkQueue.ts        # TDD-implemented queue
│   ├── workers/                # Agent workers
│   │   └── AgentWorker.ts      # Worker spawner and manager
│   ├── database/               # Database layer
│   │   ├── seed.ts             # Database seeding
│   │   ├── migrations/         # Schema migrations
│   │   └── queries/            # SQL query library
│   ├── agents/                 # Agent discovery and management
│   │   └── AgentDiscoveryService.ts
│   ├── services/               # Business logic services
│   ├── config/                 # Configuration management
│   └── types/                  # TypeScript type definitions
├── config/
│   └── system/
│       └── agent-templates/    # 23 system agent templates (JSON)
├── scripts/
│   ├── run-avi.sh              # Production AVI server wrapper
│   ├── run-avi-cli.sh          # Production AVI CLI wrapper
│   └── verify-avi-setup.sh     # System health check
├── logs/                       # Application logs
├── data/                       # SQLite databases (if not using PostgreSQL)
└── tests/                      # Test suites
```

### AVI Components

1. **Orchestrator** (`src/avi/orchestrator.ts`)
   - Monitors work queue for pending tickets
   - Spawns workers for ticket processing
   - Manages graceful shutdown
   - Persists state to database

2. **Work Queue** (`src/queue/WorkQueue.ts`)
   - PostgreSQL-backed ticket queue
   - Priority-based ticket processing
   - Ticket assignment and tracking

3. **Agent Workers** (`src/workers/AgentWorker.ts`)
   - Spawns specialized agents for tickets
   - Manages worker lifecycle
   - Tracks worker metrics

4. **Health Monitor** (`src/avi/health-monitor.ts`)
   - System health checks
   - Performance monitoring
   - Auto-restart on issues

## Agent System

### System Agents

The platform includes 23 pre-configured system agents in `config/system/agent-templates/`:

- `api-integrator` - API integration specialist
- `backend-developer` - Backend development expert
- `creative-writer` - Creative content generation
- `data-analyst` - Data analysis and insights
- `database-manager` - Database administration
- `performance-tuner` - Performance optimization
- `production-validator` - Production deployment validation
- `security-analyzer` - Security auditing
- `tech-guru` - Technology advisory
- ...and 14 more specialized agents

### Agent Template Structure

Each agent template is a JSON file with the following structure:

```json
{
  "name": "backend-developer",
  "version": "1.0.0",
  "model": "claude-sonnet-4-5-20250929",
  "posting_rules": {
    "max_posts_per_day": 10,
    "cooldown_minutes": 30
  },
  "api_schema": {
    "endpoints": ["/api/agents/backend-developer"]
  },
  "safety_constraints": {
    "max_context_tokens": 50000,
    "rate_limit_per_minute": 20
  },
  "default_personality": "Professional backend developer with expertise in server-side technologies"
}
```

### Creating New Agents

1. Create a new JSON file in `config/system/agent-templates/`
2. Follow the schema validation format
3. Run database seeding to register:
   ```bash
   npm run db:seed
   ```
4. Verify registration:
   ```bash
   ./scripts/verify-avi-setup.sh
   ```

## Database

### PostgreSQL Schema

The system uses PostgreSQL with the following main tables:

- `system_agent_templates` - Agent template definitions
- `work_tickets` - Work queue tickets
- `agent_workers` - Active worker tracking
- `avi_state` - AVI orchestrator state
- `health_metrics` - System health data

### Database Operations

```bash
# Run migrations
npm run db:migrate

# Seed database with system agents
npm run db:seed

# Reset database (clean + seed)
npm run db:reset

# Backup database
npm run db:backup

# Restore database
npm run db:restore
```

## Development

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### Development Mode

```bash
# Run with hot reload
npm run dev

# Run with debugging
npm run dev:debug
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

## Troubleshooting

### Common Issues

#### 1. Startup Failures

**Symptom**: AVI fails to start with "ENOENT" errors

**Solution**: Use the wrapper scripts instead of direct execution:
```bash
./scripts/run-avi.sh  # Not: tsx src/server.ts
```

See [Troubleshooting Guide](./AVI-WORKING-DIRECTORY-FIX.md#troubleshooting-guide) for details.

#### 2. Agent Templates Not Found

**Symptom**: "No JSON template files found" error

**Solution**:
1. Verify `AGENT_TEMPLATES_DIR` in `.env`
2. Check templates exist: `ls config/system/agent-templates/`
3. Run verification: `./scripts/verify-avi-setup.sh`

#### 3. PostgreSQL Connection Issues

**Symptom**: "connect ECONNREFUSED" errors

**Solution**:
1. Start PostgreSQL: `sudo systemctl start postgresql`
2. Verify connection in `.env`: `DATABASE_URL`
3. Test manually: `psql -U postgres -d avidm_dev`

#### 4. Environment Variables Missing

**Symptom**: Warning about missing `.env` file

**Solution**:
```bash
cp .env.template .env
# Edit .env with your configuration
source .env
```

### Getting Help

1. Review comprehensive documentation:
   - [Working Directory Fix](./AVI-WORKING-DIRECTORY-FIX.md) - Complete fix details
   - [Phase 1 Deployment Guide](./PHASE1-DEPLOYMENT-GUIDE.md)
   - [Environment Setup](./docs/ENVIRONMENT-SETUP.md)

2. Run verification script:
   ```bash
   ./scripts/verify-avi-setup.sh
   ```

3. Check logs:
   ```bash
   tail -f logs/combined.log
   tail -f logs/error.log
   ```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Run verification script: `./scripts/verify-avi-setup.sh`
- [ ] All tests passing: `npm run test:all`
- [ ] Environment variables configured
- [ ] PostgreSQL running and accessible
- [ ] All 23 agents registered
- [ ] Backup strategy in place
- [ ] Monitoring configured

### Docker Deployment

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f avi-server

# Stop services
docker-compose down
```

### Environment-Specific Configuration

Development:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

Production:
```bash
NODE_ENV=production
LOG_LEVEL=info
USE_DOCKER_SECRETS=true
```

## Monitoring

### Health Checks

The system includes built-in health monitoring:

```bash
# Check system health
curl http://localhost:3000/health

# Check AVI status
./scripts/run-avi-cli.sh status

# View metrics
curl http://localhost:3000/metrics
```

### Logs

Logs are stored in the `logs/` directory:

- `logs/avi-server-*.log` - AVI server logs (timestamped)
- `logs/avi-cli-*.log` - CLI command logs (timestamped)
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only

## Performance

### System Requirements

- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 10GB+ for logs and database
- **Network**: Stable internet for Claude API

### Tuning

Adjust these settings in `.env` for your workload:

```bash
# Worker settings
MAX_AGENT_WORKERS=10              # Max concurrent workers
DB_POOL_MAX=16                    # Database connection pool size
HEALTH_CHECK_INTERVAL=30000       # Health check frequency (ms)

# Performance
AVI_CONTEXT_LIMIT=50000           # Max context tokens
RETRY_MAX_ATTEMPTS=3              # Max retry attempts
```

## Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes with tests
3. Run verification: `./scripts/verify-avi-setup.sh`
4. Run all tests: `npm run test:all`
5. Create pull request

### Code Standards

- Follow TypeScript best practices
- Write tests for new features (TDD)
- Update documentation
- Follow London School TDD for core logic

## License

[Your License Here]

## Support

For issues, questions, or contributions:
- Review documentation in `/docs`
- Check troubleshooting guide
- Run verification script
- Contact development team

---

**Version**: 1.0
**Last Updated**: October 10, 2025
**Status**: Production Ready
