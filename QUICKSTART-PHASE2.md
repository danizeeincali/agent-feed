# Phase 2 Orchestrator - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Enable Phase 2 Orchestrator

Add to your `.env` file:

```bash
# Enable AVI Orchestrator
AVI_ORCHESTRATOR_ENABLED=true

# Use Phase 2 implementation
AVI_USE_NEW_ORCHESTRATOR=true

# Optional: Customize settings
AVI_MAX_WORKERS=10
AVI_CHECK_INTERVAL=5000
```

### 2. Start Server

```bash
npm run dev
```

### 3. Verify Orchestrator Started

Look for these log messages:

```
✅ AVI Configuration loaded:
   Max Workers: 10
   Check Interval: 5000ms
   Health Monitor: enabled

🔧 Initializing AVI adapters...
   ✅ Work Queue Adapter initialized
   ✅ Health Monitor Adapter initialized
   ✅ Worker Spawner Adapter initialized
   ✅ AVI Database Adapter initialized

✅ Orchestrator instance created successfully
✅ AVI Orchestrator (Phase 2) started - monitoring for agent activity
```

### 4. Test Status Endpoint

```bash
curl http://localhost:3001/api/avi/status
```

Expected response:
```json
{
  "status": "running",
  "startTime": "2025-10-12T15:00:00.000Z",
  "ticketsProcessed": 0,
  "workersSpawned": 0,
  "activeWorkers": 0
}
```

## 🧪 Testing Standalone (Optional)

Run orchestrator without server:

```bash
npm run avi:orchestrator
```

Stop with `Ctrl+C` - graceful shutdown will complete active workers.

## 🔄 Rollback to Phase 1

If you encounter issues:

```bash
# In .env, change:
AVI_USE_NEW_ORCHESTRATOR=false

# Restart server
npm run dev
```

Server will use legacy Phase 1 orchestrator.

## 📊 Monitoring

### Check Orchestrator Status

```bash
# Via API
curl http://localhost:3001/api/avi/status

# Check logs
tail -f logs/server.log | grep -i orchestrator
```

### View Active Workers

```bash
curl http://localhost:3001/api/avi/status | jq '.activeWorkers'
```

### Health Check

```bash
curl http://localhost:3001/api/avi/metrics
```

## ⚙️ Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `AVI_MAX_WORKERS` | 10 | Maximum concurrent workers (1-100) |
| `AVI_CHECK_INTERVAL` | 5000 | Ticket check interval in ms (min 1000) |
| `AVI_HEALTH_MONITOR` | true | Enable health monitoring |
| `AVI_HEALTH_INTERVAL` | 30000 | Health check interval in ms |
| `AVI_SHUTDOWN_TIMEOUT` | 30000 | Graceful shutdown timeout in ms |
| `AVI_CONTEXT_LIMIT` | 50000 | Context bloat threshold (tokens) |
| `AVI_WORKER_TIMEOUT` | 120000 | Worker execution timeout in ms |

## 🐛 Troubleshooting

### Orchestrator Won't Start

1. Check database connection:
   ```bash
   npm run validate
   ```

2. Verify PostgreSQL is running:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. Check adapter logs for specific errors

### No Workers Spawning

1. Verify pending tickets exist:
   ```sql
   SELECT COUNT(*) FROM work_queue WHERE status='pending';
   ```

2. Check orchestrator status:
   ```bash
   curl localhost:3001/api/avi/status
   ```

3. Verify `activeWorkers < maxConcurrentWorkers`

### Shutdown Hangs

Workers have 30 seconds to complete. If shutdown hangs:

1. Reduce timeout:
   ```bash
   AVI_SHUTDOWN_TIMEOUT=10000
   ```

2. Check worker logs for slow operations

## 📚 More Information

- **Full Documentation**: [PHASE-2-IMPLEMENTATION.md](PHASE-2-IMPLEMENTATION.md)
- **Architecture Design**: [PHASE-2-ARCHITECTURE-DESIGN.md](PHASE-2-ARCHITECTURE-DESIGN.md)
- **Adapter Details**: [src/adapters/](src/adapters/)

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `src/config/avi.config.ts` | Configuration management |
| `src/avi/orchestrator-factory.ts` | Factory with DI |
| `api-server/server.js` | Server integration |
| `src/scripts/start-orchestrator.ts` | Standalone script |

## ✅ Success Checklist

- [ ] Orchestrator starts without errors
- [ ] Status endpoint returns valid data
- [ ] Workers spawn for pending tickets
- [ ] Workers complete successfully
- [ ] Graceful shutdown works (Ctrl+C)
- [ ] Health monitoring reports status

## 🚦 Status Indicators

| Message | Status |
|---------|--------|
| `✅ AVI Orchestrator started` | Working correctly |
| `⚠️ AVI Orchestrator disabled` | Not enabled in .env |
| `❌ Failed to start orchestrator` | Check database/adapters |
| `🔄 Restarting orchestrator` | Context bloat detected |

---

**Questions?** Check [PHASE-2-IMPLEMENTATION.md](PHASE-2-IMPLEMENTATION.md) for detailed troubleshooting.
