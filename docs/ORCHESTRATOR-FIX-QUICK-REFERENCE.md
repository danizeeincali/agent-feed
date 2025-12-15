# Orchestrator Event Emission Fix - Quick Reference

**Date**: 2025-11-13
**Status**: ✅ Fixed

---

## TL;DR

**What was wrong**: `tickets_processed: 0` made it look like orchestrator wasn't working
**Root cause**: Counter only incremented AFTER completion, not during processing
**What changed**: Added logging and WebSocket events to show in-flight work

---

## Quick Verification

### 1. Check Orchestrator Status
```bash
curl http://localhost:3001/api/avi/status
```

### 2. Watch Logs
```bash
tail -f logs/api-server.log | grep -E "(🔔|📊|🤖|✅)"
```

### 3. Expected Log Output
```
🤖 Spawning worker worker-123 for ticket 456
📊 Ticket 456 processing started (total in-flight: 1)
🔔 Emitting WebSocket event: processing (ticket: 456, agent: avi)
✅ Worker worker-123 completed successfully
📊 Tickets completed: 1 (active workers: 0)
🔔 Emitting WebSocket event: completed (ticket: 456, agent: avi)
🗑️ Worker worker-123 destroyed (0 active, 1 completed)
```

---

## Files Changed

1. `/workspaces/agent-feed/api-server/avi/orchestrator.js`
   - Lines 223-277: Regular ticket processing logs + events
   - Lines 354-409: Comment ticket processing logs + events

2. `/workspaces/agent-feed/api-server/worker/agent-worker.js`
   - Lines 30-50: Enhanced event emission logging

---

## WebSocket Events Now Emitted

### From Worker (existing, now with logs)
- `ticket_status_update` (processing)
- `ticket_status_update` (completed)
- `ticket_status_update` (failed)

### From Orchestrator (new)
- `ticket_completed`
- `ticket_failed`
- `comment_ticket_completed`
- `comment_ticket_failed`

---

## Understanding the Metrics

| Metric | Meaning |
|--------|---------|
| `activeWorkers` | Currently processing |
| `ticketsProcessed` | Successfully completed |
| `workersSpawned` | Total spawned since start |

**Example**:
```
activeWorkers: 2    ← 2 tickets being processed RIGHT NOW
ticketsProcessed: 5 ← 5 tickets have finished
workersSpawned: 7   ← 7 total workers created (2 active + 5 completed)
```

---

## Troubleshooting

### No logs appearing?
1. Check orchestrator is running: `curl http://localhost:3001/api/avi/status`
2. Check there are pending tickets in work queue
3. Verify database connection

### WebSocket events not emitting?
1. Check logs for: `⚠️ WebSocket not available for status update`
2. Verify WebSocket service is initialized
3. Check browser console: `window.socket.connected`

---

## See Full Details

Read: `/workspaces/agent-feed/docs/ORCHESTRATOR-EVENT-EMISSION-FIX.md`
