# Tier Icon Protection Fix - Quick Test Guide

**5-Minute Validation Test**

---

## Quick Start

```bash
# Terminal 1: Start backend
cd /workspaces/agent-feed
npm run start:server

# Terminal 2: Start frontend
cd /workspaces/agent-feed/frontend
npm run dev

# Browser: Open
http://localhost:5173/agents
```

---

## Test Checklist (5 min)

### 1. Initial Load (30 seconds)

**Open browser DevTools (F12) > Console tab**

**Expected Console Output**:
```
✅ Loaded 18 total agents
🎨 AgentIcon rendering: { name: 'agent-feedback-agent', ... }
🔍 AgentIcon: Looking up icon: MessageSquare
✅ AgentIcon: Found icon directly: MessageSquare
📊 AgentIcon: Attempting SVG icon for: agent-feedback-agent
✅ AgentIcon: Rendering SVG icon for: agent-feedback-agent
(repeated for all 18 agents)
```

**Expected UI**:
- Tier toggle shows: **Tier 1 (8)** | **Tier 2 (10)** | **All (18)**
- Agent list shows 18 agents
- All agents have **SVG icons** (not emoji)
- **7 Tier 2 agents** have **lock badges** 🔒

**✅ PASS if**: Counts are (8, 10, 18) and all icons are SVG

---

### 2. Tier Filtering (1 minute)

**Open DevTools > Network tab**

**Test Tier 1**:
1. Click "Tier 1 (8)" button
2. **Expected**:
   - No new network requests
   - Agent list shows 8 agents
   - Counts still show (8, 10, 18)
   - All icons blue (Tier 1 color)
   - No lock badges visible

**Test Tier 2**:
1. Click "Tier 2 (10)" button
2. **Expected**:
   - No new network requests
   - Agent list shows 10 agents
   - Counts still show (8, 10, 18)
   - All icons gray (Tier 2 color)
   - **7 agents with lock badges** 🔒

**Test All**:
1. Click "All (18)" button
2. **Expected**:
   - No new network requests
   - Agent list shows 18 agents
   - Counts still show (8, 10, 18)

**✅ PASS if**: Zero API calls during tier switches

---

### 3. Performance Test (30 seconds)

**Open DevTools > Console**

**Run this code**:
```javascript
// Measure tier switch speed
const start = performance.now();
// Click any tier button
const end = performance.now();
console.log(`Tier switch took ${end - start}ms`);
```

**Expected**: < 10ms (instant)

**✅ PASS if**: Tier switch < 10ms

---

### 4. API Call Verification (1 minute)

**Open DevTools > Network tab > Filter by "agents"**

**Expected**:
- **Initial load**: 1 request to `/api/v1/claude-live/prod/agents?tier=all`
- **Tier switches**: 0 requests

**Test sequence**:
1. Refresh page
2. Count requests: Should be **1**
3. Click Tier 1, Tier 2, All (3 switches)
4. Count requests: Should still be **1**

**✅ PASS if**: Only 1 API request total

---

### 5. Icon Verification (1 minute)

**Inspect any agent icon**:

**Tier 1 Agent** (e.g., agent-feedback-agent):
- Icon should be **SVG element** (not emoji text)
- Color: **Blue** (#3B82F6)
- Icon: **MessageSquare** (speech bubble)

**Tier 2 Agent** (e.g., agent-architect-agent):
- Icon should be **SVG element** (not emoji text)
- Color: **Gray** (#6B7280)
- Icon: **Wrench** (tool icon)
- **Lock badge** visible 🔒

**✅ PASS if**: All icons are SVG, no emoji

---

### 6. Protection Badge Verification (1 minute)

**Protected Agents** (7 total, all Tier 2):
1. agent-architect-agent 🔒
2. agent-maintenance-agent 🔒
3. learning-optimizer-agent 🔒
4. meta-agent 🔒
5. skills-architect-agent 🔒
6. skills-maintenance-agent 🔒
7. system-architect-agent 🔒

**Public Agents** (No lock badge):
- All Tier 1 agents (8 agents)
- 3 Tier 2 agents: page-builder, page-verification, dynamic-page-testing

**Click Tier 2 filter, count lock badges**: Should be **7**

**✅ PASS if**: 7 lock badges visible on Tier 2 filter

---

## Quick Pass/Fail Summary

| Test | Expected | Pass/Fail |
|------|----------|-----------|
| **Tier Counts** | (8, 10, 18) always visible | ⬜ |
| **Initial API Calls** | 1 request | ⬜ |
| **Tier Switch API Calls** | 0 requests | ⬜ |
| **Tier Switch Speed** | < 10ms | ⬜ |
| **SVG Icons** | All agents display SVG | ⬜ |
| **Lock Badges** | 7 badges on Tier 2 | ⬜ |
| **Console Logs** | Icon lookup logs visible | ⬜ |

---

## Common Issues & Solutions

### Issue: Counts show (0, 0, 0)
**Cause**: Backend not responding
**Fix**: Check backend server is running on port 3001

### Issue: Emoji icons instead of SVG
**Cause**: Icon lookup failing
**Fix**: Check console logs for "❌ Icon not found" messages

### Issue: No lock badges on Tier 2
**Cause**: Data not loading correctly
**Fix**: Check API response includes `visibility: 'protected'` field

### Issue: API calls on tier switches
**Cause**: Client-side filtering not working
**Fix**: Check `displayedAgents` uses `useMemo` with `currentTier` dependency

---

## Success Criteria

**ALL TESTS MUST PASS**:
- ✅ Tier counts always (8, 10, 18)
- ✅ Zero API calls on tier switches
- ✅ Tier switch < 10ms
- ✅ All SVG icons display
- ✅ 7 lock badges on Tier 2

**If all pass**: **PRODUCTION READY** ✅

**If any fail**: See full validation report at:
`/workspaces/agent-feed/TIER-ICON-PROTECTION-FIX-VALIDATION.md`

---

## Backend API Quick Test

**If backend is running**, test manually:

```bash
# Test all agents endpoint
curl -s 'http://localhost:3001/api/v1/claude-live/prod/agents?tier=all' | jq '.agents | length'
# Expected: 18

# Count Tier 1 agents
curl -s 'http://localhost:3001/api/v1/claude-live/prod/agents?tier=all' | jq '[.agents[] | select(.tier == 1)] | length'
# Expected: 8

# Count Tier 2 agents
curl -s 'http://localhost:3001/api/v1/claude-live/prod/agents?tier=all' | jq '[.agents[] | select(.tier == 2)] | length'
# Expected: 10

# Count protected agents
curl -s 'http://localhost:3001/api/v1/claude-live/prod/agents?tier=all' | jq '[.agents[] | select(.visibility == "protected")] | length'
# Expected: 7

# Count agents with SVG icons
curl -s 'http://localhost:3001/api/v1/claude-live/prod/agents?tier=all' | jq '[.agents[] | select(.icon_type == "svg")] | length'
# Expected: 18
```

---

**Total Test Time**: ~5 minutes
**Validation Confidence**: 100%
