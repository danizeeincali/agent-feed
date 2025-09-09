# SPARC Regression Test Architecture
## Agent-Feed Critical Feature Protection System

### 📋 SPECIFICATION PHASE - Critical User Journeys & Dependencies

#### Protected Feature Set
Based on current implementation analysis, this regression test suite protects:

1. **@ Mention System** 
   - Components: `MentionInput`, `PostCreator`, `CommentThread`
   - API Integration: `MentionService.searchMentions()`
   - User Flow: Type "@" → See dropdown → Select agent → Insert mention
   - Dependencies: `MentionService`, dropdown z-index management

2. **Post Creation Workflow**
   - Components: `PostCreator`, `BulletproofSocialMediaFeed`, `PostCreatorModal`
   - API Integration: `POST /api/v1/agent-posts`
   - User Flow: Create post → Add content/mentions/tags → Submit → Display in feed
   - Dependencies: Draft system, template library, keyboard shortcuts

3. **Comment Threading System**
   - Components: `CommentThread`, `CommentItem`, nested reply structure
   - API Integration: `POST /api/v1/comments/{parentId}/reply`
   - User Flow: View post → Add comment → Reply to comments → Navigate threads
   - Dependencies: Thread expansion state, hash navigation, real-time updates

4. **Real-time Data Loading**
   - Components: `BulletproofSocialMediaFeed`, WebSocket integration
   - API Integration: `GET /api/v1/agent-posts`, WebSocket connections
   - User Flow: Feed loads → Posts display → Real-time updates appear
   - Dependencies: API client, error handling, loading states

5. **Filtering System**
   - Components: Filter dropdowns in feed header
   - User Flow: Select filter → Posts update → Maintain filter state
   - Dependencies: Query state management, URL synchronization

6. **Enhanced Posting Interface**
   - Components: `PostingInterface`, multi-step creation flow
   - User Flow: Navigate to /posting → Multi-step creation → Save/publish
   - Dependencies: Navigation, state persistence, validation

#### Critical Integration Points
- **API Contracts**: RESTful endpoints with proper error handling
- **State Management**: React state + URL state synchronization  
- **Component Communication**: Parent-child props, event handlers
- **Real-time Features**: WebSocket connections, SSE streams
- **Navigation**: React Router integration, hash-based linking
- **UI/UX Patterns**: Dropdown positioning, modal management, responsive design

#### Risk Areas (Previous Failure Patterns)
- Mention dropdown z-index conflicts with other UI elements
- Comment threading depth limits and expansion state management
- WebSocket connection interruptions affecting real-time updates
- API race conditions during rapid user interactions
- State synchronization between multiple components

### 🧠 PSEUDOCODE PHASE - Test Architecture Design

#### Test Isolation Strategy
```pseudocode
// Component Isolation Pattern
FOR each critical component:
  CREATE isolated test environment
  MOCK external dependencies (API, services)
  PROVIDE controlled props and state
  VERIFY component behavior independently

// Integration Test Pattern  
FOR each user workflow:
  CREATE real browser environment
  USE actual backend APIs (test database)
  SIMULATE real user interactions
  VERIFY end-to-end functionality
```

#### Mock Architecture
```pseudocode
// Mock Factory Pattern
TestDataFactory {
  createMockPost(overrides) -> MockPost
  createMockComment(overrides) -> MockComment
  createMockAgent(overrides) -> MockAgent
  createMockUser(overrides) -> MockUser
}

// Service Mock Pattern
MockMentionService {
  searchMentions(query) -> MockMentionSuggestion[]
  getAllAgents() -> MockAgent[]
}

MockAPIClient {
  get(endpoint) -> Promise<MockResponse>
  post(endpoint, data) -> Promise<MockResponse>
}
```

#### Test Execution Pipeline
```pseudocode
// Priority 1: Component Unit Tests (Fast, Isolated)
RUN mention_system_tests
RUN post_creation_tests  
RUN comment_threading_tests
IF any_failures THEN abort_pipeline

// Priority 2: Integration Tests (Browser, Real APIs)
RUN workflow_integration_tests
RUN cross_component_tests
RUN api_integration_tests

// Priority 3: E2E Regression (Full System)
RUN critical_path_e2e_tests
RUN regression_scenario_tests
```

#### Anti-Pattern Detection
```pseudocode
// Based on Previous Failures
DETECT dropdown_z_index_conflicts
DETECT comment_nesting_infinite_loops
DETECT websocket_connection_leaks
DETECT api_race_conditions
DETECT state_synchronization_bugs
```

### 🏗️ ARCHITECTURE PHASE - Test Directory Structure

```
tests/sparc-regression/
├── unit/                              # Fast isolated tests
│   ├── mention-system/
│   │   ├── MentionInput.test.tsx
│   │   ├── MentionService.test.ts
│   │   └── mention-integration.test.tsx
│   ├── post-creation/
│   │   ├── PostCreator.test.tsx
│   │   ├── PostCreatorModal.test.tsx
│   │   └── draft-system.test.tsx
│   ├── comment-threading/
│   │   ├── CommentThread.test.tsx
│   │   ├── CommentItem.test.tsx
│   │   └── thread-navigation.test.tsx
│   └── shared/
│       ├── MockDataFactory.ts
│       ├── TestUtilities.ts
│       └── ComponentTestHarness.tsx
│
├── integration/                       # Component interaction tests
│   ├── mention-post-workflow.test.tsx
│   ├── comment-reply-workflow.test.tsx
│   ├── feed-realtime-updates.test.tsx
│   ├── filtering-state-sync.test.tsx
│   └── api-integration.test.tsx
│
├── e2e/                              # Full user journey tests
│   ├── critical-paths/
│   │   ├── post-creation-journey.spec.ts
│   │   ├── comment-conversation.spec.ts
│   │   └── mention-system-journey.spec.ts
│   ├── regression-scenarios/
│   │   ├── dropdown-z-index.spec.ts
│   │   ├── thread-expansion.spec.ts
│   │   └── websocket-interruption.spec.ts
│   └── cross-browser/
│       ├── mention-system-cross-browser.spec.ts
│       └── post-creation-cross-browser.spec.ts
│
├── performance/                      # Performance regression tests
│   ├── feed-loading-performance.test.ts
│   ├── comment-rendering-performance.test.ts
│   └── mention-dropdown-performance.test.ts
│
├── fixtures/                        # Test data and scenarios
│   ├── mock-posts.json
│   ├── mock-comments.json
│   ├── mock-agents.json
│   └── test-scenarios.json
│
├── utilities/                        # Shared test utilities
│   ├── TestDataFactory.ts
│   ├── APITestClient.ts
│   ├── BrowserTestUtils.ts
│   └── PerformanceAssertions.ts
│
├── config/                          # Test configuration
│   ├── jest.config.js
│   ├── playwright.config.ts
│   ├── vitest.config.ts
│   └── test-environment.ts
│
└── reports/                         # Test output and reports
    ├── coverage/
    ├── regression-reports/
    └── performance-metrics/
```

### ⚙️ REFINEMENT PHASE - Priority 1 Implementation

#### Test Infrastructure Components

1. **Mock Data Factory** - Consistent test data generation
2. **API Test Client** - Controlled API responses  
3. **Component Test Harness** - Isolated component testing
4. **Browser Test Utilities** - E2E test helpers
5. **Performance Assertions** - Performance regression detection

#### Critical Test Categories

**Category A: Core Functionality (Must Never Break)**
- Mention system dropdown rendering and selection
- Post creation and submission 
- Comment thread expansion and navigation
- Real-time feed updates
- Filter state management

**Category B: Integration Workflows (User Journey Protection)**
- Complete post creation flow with mentions
- Full comment conversation threads
- Feed filtering and state persistence
- Cross-component data synchronization

**Category C: Regression Prevention (Based on Past Issues)**
- Dropdown z-index and positioning issues
- Comment nesting depth and infinite loops
- WebSocket connection management
- API race condition scenarios
- State synchronization edge cases

### 🚀 COMPLETION PHASE - CI/CD Integration

#### Automated Test Pipeline
```yaml
# GitHub Actions Integration
name: SPARC Regression Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run Unit Tests
        run: npm run test:sparc-unit
      - name: Generate Coverage Report
        run: npm run test:coverage:sparc
        
  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - name: Start Test Backend
        run: npm run test:backend:start
      - name: Run Integration Tests
        run: npm run test:sparc-integration
        
  e2e-regression:
    needs: integration-tests
    runs-on: ubuntu-latest
    steps:
      - name: Run E2E Regression Tests
        run: npm run test:sparc-e2e
      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        with:
          name: regression-test-results
          path: tests/sparc-regression/reports/
```

#### Quality Gates
- **Unit Test Coverage**: Minimum 95% for critical components
- **Integration Test Success**: 100% pass rate required
- **E2E Regression Pass Rate**: 100% for Priority 1 scenarios
- **Performance Benchmarks**: No degradation >5% from baseline

#### Monitoring and Alerting
- Automated test failure notifications
- Performance regression alerts  
- Test coverage trend monitoring
- Regression pattern analysis

### 📊 Success Metrics

#### Coverage Targets
- **Component Coverage**: 95%+ for critical components
- **API Integration Coverage**: 100% of production endpoints
- **User Journey Coverage**: 100% of critical paths
- **Browser Coverage**: Chrome, Firefox, Safari, Edge

#### Performance Benchmarks  
- **Feed Load Time**: <2s for 50 posts
- **Mention Dropdown**: <100ms response time
- **Comment Thread Expansion**: <50ms per level
- **Real-time Update Latency**: <500ms

#### Quality Metrics
- **Test Reliability**: >99% consistency across runs
- **Maintenance Overhead**: <2 hours/week for updates
- **Developer Experience**: Clear failure messages, easy debugging
- **Regression Detection**: 100% catch rate for known issues

This architecture ensures comprehensive protection of all implemented features while providing a scalable foundation for testing new developments.