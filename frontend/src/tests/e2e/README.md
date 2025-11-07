# Sequential Agent Introduction E2E Tests

Comprehensive Playwright E2E tests for the sequential agent introduction system with screenshot validation.

## Test Suites

### 1. Sequential Introductions (`sequential-introductions.spec.ts`)

Tests the complete sequential introduction flow:

- **Phase 1: First Post → get-to-know-you-agent**
  - User creates their first post
  - get-to-know-you-agent introduces automatically
  - Screenshots capture the introduction moment

- **Phase 1 Completion → personal-todos-agent**
  - User completes Phase 1 by answering questions
  - personal-todos-agent introduces
  - Validates Phase 1 completion state

- **Engagement Score 3 → page-builder-agent**
  - User increases engagement to score 3
  - page-builder-agent introduces with showcase offer
  - Verifies "Yes, show me!" button is present

- **Engagement Score 5 → agent-ideas-agent**
  - User reaches engagement score 5
  - agent-ideas-agent introduces
  - Checks for tutorial mentions

- **WebSocket Real-time Updates**
  - Monitors WebSocket events during agent introductions
  - Verifies real-time post delivery
  - Tests instant appearance of agent introductions

- **Complete Full Flow**
  - End-to-end test from Phase 1 to Engagement 5
  - All agents introduced sequentially
  - Comprehensive screenshot trail

### 2. PageBuilder Showcase (`pagebuilder-showcase.spec.ts`)

Tests the PageBuilder showcase workflow:

- **Complete Showcase Workflow**
  - Triggers page-builder-agent introduction
  - Clicks "Yes, show me!" button
  - Verifies showcase page creation
  - Navigates to created showcase page
  - Validates page content

- **User Declines Showcase**
  - Tests "No" / "Maybe later" button
  - Verifies no showcase page is created

- **Showcase Page Components**
  - Validates page layout
  - Checks for header, content, sidebar, footer
  - Verifies component rendering

- **Multiple Showcase Interactions**
  - Tests creating multiple pages
  - Validates repeated PageBuilder interactions

### 3. Agent Builder Tutorial (`agent-builder-tutorial.spec.ts`)

Tests the agent-ideas-agent tutorial workflow:

- **Trigger at Engagement Score 5**
  - Increases engagement to score 5
  - Waits for agent-ideas-agent introduction
  - Verifies tutorial trigger

- **Step-by-Step Tutorial Flow**
  - Clicks "Start Tutorial" button
  - Progresses through tutorial steps
  - Screenshots each step
  - Validates tutorial completion

- **Tutorial Content Validation**
  - Checks for key concepts (agent creation, ideas, capabilities)
  - Validates educational content
  - Measures content coverage

- **Interactive Elements**
  - Tests agent mentions (@agent-ideas-agent)
  - Validates agent responses
  - Checks interactive buttons/forms

- **Complete Agent Builder Journey**
  - Full flow from Phase 1 to tutorial
  - Progressive engagement increase
  - Comprehensive journey documentation

- **Multiple Agent Idea Submissions**
  - Submits various agent ideas
  - Tests agent-ideas-agent response handling

## Test Utilities (`helpers/test-utils.ts`)

Shared helper functions:

- `setupTestUser()` - Initialize test user
- `waitForWebSocket()` - Wait for WebSocket connection
- `createPost()` - Create a post via UI
- `waitForAgentIntroduction()` - Wait for specific agent
- `completePhase1()` - Complete Phase 1 questions
- `getEngagementScore()` - Get current engagement score
- `increaseEngagementScore()` - Increase engagement to target
- `takeScreenshotWithMetadata()` - Capture screenshot with metadata
- `storeInSwarmMemory()` - Store results in `.swarm/memory.db`
- `setupWebSocketListener()` - Monitor WebSocket events
- `verifyWebSocketUpdate()` - Verify real-time updates

## Running Tests

### Prerequisites

1. **Backend must be running on localhost:3001**
   ```bash
   cd /workspaces/agent-feed/api-server
   node server.js
   ```

2. **Frontend must be running on localhost:5173**
   ```bash
   cd /workspaces/agent-feed/frontend
   npm run dev
   ```

### Run All Tests

```bash
cd /workspaces/agent-feed/frontend
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Sequential introductions
npm run test:e2e -- src/tests/e2e/sequential-introductions.spec.ts

# PageBuilder showcase
npm run test:e2e -- src/tests/e2e/pagebuilder-showcase.spec.ts

# Agent Builder tutorial
npm run test:e2e -- src/tests/e2e/agent-builder-tutorial.spec.ts
```

### Run with UI Mode

```bash
npm run test:e2e:ui
```

### Run in Headed Mode

```bash
npm run test:e2e -- --headed
```

### Run in Debug Mode

```bash
npm run test:e2e -- --debug
```

### Run Specific Test

```bash
npm run test:e2e -- --grep "Phase 1: User creates first post"
```

## Screenshots

All screenshots are saved to:
```
/workspaces/agent-feed/frontend/test-results/screenshots/
```

Screenshot naming convention:
```
{test-name}-{step-name}-{timestamp}.png
```

Each screenshot has accompanying metadata:
```
{test-name}-{step-name}-{timestamp}.json
```

## Test Results

### Swarm Memory Storage

All test results are stored in:
```
/workspaces/agent-feed/.swarm/memory.db
```

Memory keys:
- `sequential-intro/phase1-test`
- `sequential-intro/phase1-completion-test`
- `sequential-intro/engagement-3-test`
- `sequential-intro/engagement-5-test`
- `sequential-intro/websocket-test`
- `sequential-intro/full-flow-test`
- `sequential-intro/pagebuilder-showcase-test`
- `sequential-intro/pagebuilder-decline-test`
- `sequential-intro/pagebuilder-components-test`
- `sequential-intro/agent-builder-trigger-test`
- `sequential-intro/agent-builder-tutorial-test`
- `sequential-intro/agent-builder-validation-test`
- `sequential-intro/agent-builder-interactive-test`
- `sequential-intro/agent-builder-journey-test`

### Playwright Reports

HTML report:
```bash
npm run test:e2e:report
```

JSON results:
```
/workspaces/agent-feed/frontend/test-results/e2e-results.json
```

JUnit XML:
```
/workspaces/agent-feed/frontend/test-results/e2e-junit.xml
```

## Test Configuration

Configuration file: `/workspaces/agent-feed/frontend/playwright.config.ts`

Key settings:
- Base URL: `http://localhost:5173`
- Backend URL: `http://localhost:3001`
- Timeout: 60 seconds per test
- Screenshots: On failure + manual captures
- Video: On failure
- Trace: On first retry
- Retries: 1 (local), 3 (CI)

## Key Features

### 1. NO MOCKS
- All tests run against real backend (localhost:3001)
- Real database interactions
- Real WebSocket connections
- Real agent introductions

### 2. Screenshot Validation
- Every critical step captures a screenshot
- Screenshots include metadata
- Full page screenshots with scrolling
- Before/after comparisons

### 3. WebSocket Verification
- Real-time event monitoring
- Socket.io connection validation
- Event payload verification
- Instant update confirmation

### 4. Progressive Engagement
- Tests simulate real user behavior
- Gradual engagement score increase
- Natural interaction patterns
- Multiple post types

### 5. State Management
- User context tracking
- Phase completion verification
- Agent introduction state
- Engagement score monitoring

## Debugging

### View Screenshots

Screenshots are automatically captured at each step. Check:
```
/workspaces/agent-feed/frontend/test-results/screenshots/
```

### View Swarm Memory

```bash
cat /workspaces/agent-feed/.swarm/memory.db | jq
```

### Check Test Logs

```bash
npm run test:e2e -- --reporter=list
```

### Debug Specific Test

```bash
npm run test:e2e -- --debug src/tests/e2e/sequential-introductions.spec.ts --grep "Phase 1"
```

### Trace Viewer

```bash
npx playwright show-trace test-results/traces/trace.zip
```

## CI/CD Integration

Tests are configured for CI with:
- Increased retries (3x)
- JSON and JUnit reporting
- Screenshot on failure
- Video on failure
- Trace on first retry

## Test Coverage

### Scenarios Covered

- ✅ First post creation
- ✅ get-to-know-you-agent introduction
- ✅ Phase 1 completion
- ✅ personal-todos-agent introduction
- ✅ Engagement score progression
- ✅ page-builder-agent at score 3
- ✅ Showcase offer workflow
- ✅ Page creation and navigation
- ✅ agent-ideas-agent at score 5
- ✅ Tutorial trigger and flow
- ✅ WebSocket real-time updates
- ✅ Agent mentions and responses
- ✅ Multiple agent interactions
- ✅ Complete sequential flow

### Edge Cases

- ✅ User declines showcase offer
- ✅ Multiple page creation requests
- ✅ Repeated agent interactions
- ✅ WebSocket reconnection
- ✅ Engagement score edge cases

## Support

For issues or questions:
1. Check test logs
2. Review screenshots
3. Inspect swarm memory
4. Check backend logs
5. Verify WebSocket connection
6. Review agent configuration files
