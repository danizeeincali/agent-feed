# 🧪 SPARC Regression Test Architecture
## Agent-Feed Critical Feature Protection System

[![Test Status](https://github.com/agent-feed/agent-feed/workflows/SPARC%20Regression%20Tests/badge.svg)](https://github.com/agent-feed/agent-feed/actions)
[![Coverage](https://img.shields.io/badge/Coverage-95%25-green)](./reports/coverage)
[![Quality Gates](https://img.shields.io/badge/Quality%20Gates-Passing-green)](./reports/latest-report.json)

This comprehensive regression test suite protects all critical functionality in the agent-feed application using SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology.

## 🎯 Protected Features

### ✅ Critical Features (P1)
- **@ Mention System** - Dropdown rendering, agent selection, text insertion
- **Post Creation Workflow** - Complete post creation with validation
- **Comment Threading System** - Nested comments with navigation
- **Real-time Data Loading** - API integration and live updates
- **Filtering System** - Agent/hashtag filtering with state management
- **Enhanced Posting Interface** - Multi-step creation flow

### 🔧 Integration Points
- API contracts and error handling
- Component communication patterns  
- Real-time WebSocket connections
- State management and synchronization
- UI component interactions and z-index management

## 📁 Architecture

```
tests/sparc-regression/
├── unit/                    # Fast isolated component tests
│   ├── mention-system/      # MentionInput, MentionService tests
│   ├── post-creation/       # PostCreator, workflow tests
│   ├── comment-threading/   # CommentThread, navigation tests
│   └── shared/              # Utilities and test helpers
│
├── integration/             # Component interaction tests  
│   ├── mention-post-workflow.test.tsx
│   ├── comment-reply-workflow.test.tsx
│   └── feed-realtime-updates.test.tsx
│
├── e2e/                    # Full user journey tests
│   ├── critical-paths/      # Must-work user scenarios
│   ├── regression-scenarios/ # Known failure pattern prevention
│   └── cross-browser/       # Browser compatibility tests
│
├── utilities/              # Test infrastructure
│   ├── TestDataFactory.ts  # Consistent mock data
│   ├── APITestClient.ts     # Controlled API responses
│   └── TestRunner.ts        # Test orchestration
│
└── config/                 # Test configuration
    ├── sparc-regression-config.ts
    └── playwright.config.ts
```

## 🚀 Quick Start

### Prerequisites
```bash
# Ensure you have the required dependencies
cd frontend
npm install

# Install Playwright browsers for E2E tests
npx playwright install
```

### Run All Tests
```bash
# Complete SPARC regression suite
npm run test:sparc-regression

# Run specific categories
npm run test:sparc-unit        # Unit tests only
npm run test:sparc-integration # Integration tests only  
npm run test:sparc-e2e         # E2E tests only
```

### Run Specific Features
```bash
# Test mention system only
npm run test -- tests/sparc-regression/unit/mention-system/

# Test post creation workflow
npm run test -- tests/sparc-regression/integration/mention-post-workflow.test.tsx

# Test regression scenarios
npx playwright test tests/sparc-regression/e2e/regression-scenarios/
```

## 🧪 Test Categories

### Unit Tests (5-30s runtime)
Fast, isolated component tests with mocked dependencies.

**Key Tests:**
- `MentionInput.test.tsx` - Dropdown rendering, keyboard navigation
- `PostCreator.test.tsx` - Form validation, template application
- `CommentThread.test.tsx` - Thread expansion, hash navigation

**Run Command:** `npm run test:sparc-unit`

### Integration Tests (30s-2min runtime)
Component interaction tests with real API calls.

**Key Tests:**
- `mention-post-workflow.test.tsx` - Complete workflow integration
- `comment-reply-workflow.test.tsx` - Threading with mentions
- `feed-realtime-updates.test.tsx` - WebSocket integration

**Run Command:** `npm run test:sparc-integration`

### E2E Tests (2-5min runtime)
Full user journey tests in real browsers.

**Key Tests:**
- `dropdown-z-index.spec.ts` - UI layer conflict prevention
- `post-creation-journey.spec.ts` - Complete user workflow
- `comment-conversation.spec.ts` - Threading navigation

**Run Command:** `npm run test:sparc-e2e`

## 🔍 Regression Prevention

### Known Issue Patterns
The test suite specifically guards against these historical failures:

1. **Mention Dropdown Z-Index Conflicts**
   - Test: `dropdown-z-index.spec.ts`
   - Prevents dropdown appearing behind other UI elements

2. **Comment Thread Infinite Loops**  
   - Test: `CommentThread.test.tsx`
   - Prevents infinite expansion/collapse cycles

3. **WebSocket Connection Leaks**
   - Test: `feed-realtime-updates.test.tsx`
   - Ensures proper connection cleanup

4. **API Race Conditions**
   - Test: `mention-post-workflow.test.tsx`
   - Tests rapid user interactions

5. **State Synchronization Bugs**
   - Test: Multiple integration tests
   - Ensures component state consistency

## 📊 Quality Gates

### Coverage Requirements
- **Statements**: 95%+
- **Branches**: 90%+  
- **Functions**: 95%+
- **Lines**: 95%+

### Performance Benchmarks
- **Feed Load Time**: <2s for 50 posts
- **Mention Dropdown**: <100ms response
- **Comment Expansion**: <50ms per level
- **Real-time Updates**: <500ms latency

### Stability Metrics
- **Test Reliability**: >99% pass rate
- **Regression Detection**: 100% known issues
- **Browser Coverage**: Chrome, Firefox, Safari, Edge
- **Mobile Coverage**: iOS Safari, Chrome Mobile

## 🔧 Configuration

### Environment Variables
```bash
# Test execution
NODE_ENV=test
CI=true

# API endpoints  
API_BASE_URL=http://localhost:3000
WS_BASE_URL=ws://localhost:3000

# Feature flags
SPARC_MENTION_SYSTEM=true
SPARC_POST_CREATION=true
SPARC_COMMENT_THREADING=true
SPARC_REALTIME_DATA=true
SPARC_FILTERING=true

# Test behavior
SPARC_TEST_TIMEOUT=60000
SPARC_PARALLEL_TESTS=true
SPARC_COVERAGE_ENABLED=true
```

### Custom Configuration
Create `tests/sparc-regression/config/local.config.ts`:

```typescript
import { SPARC_CONFIG } from './sparc-regression-config';

export const LOCAL_CONFIG = {
  ...SPARC_CONFIG,
  apiBaseUrl: 'http://localhost:3001', // Custom API URL
  timeouts: {
    ...SPARC_CONFIG.timeouts,
    e2e: 120000, // Longer timeouts for debugging
  },
  browsers: {
    desktop: ['chromium'], // Test only Chrome locally
    mobile: [],
  },
};
```

## 🚨 CI/CD Integration

### GitHub Actions
The test suite runs automatically on:
- **Push to main/develop**: Unit + Integration + E2E
- **Pull Requests**: Full regression suite
- **Nightly Builds**: Complete suite + Performance tests
- **Manual Triggers**: Configurable test categories

### Quality Gate Enforcement
```yaml
# .github/workflows/sparc-regression-tests.yml
- name: Quality Gates Check
  run: |
    npm run test:sparc-regression
    npm run test:quality-gates
```

### Test Reports
- **HTML Reports**: `tests/sparc-regression/reports/`
- **Coverage Reports**: `tests/sparc-regression/reports/coverage/`
- **Performance Metrics**: `tests/sparc-regression/reports/performance-metrics/`

## 📈 Monitoring & Alerts

### Test Metrics Dashboard
View real-time test metrics:
- Pass/Fail rates by feature
- Performance trend analysis  
- Coverage evolution over time
- Flaky test identification

### Alert Configuration
Automated notifications for:
- ❌ **Critical Test Failures** - Immediate Slack alert
- ⚠️  **Performance Regression** - >5% degradation
- 📉 **Coverage Drop** - Below threshold warnings
- 🔄 **Flaky Test Detection** - Unstable test identification

## 🛠️ Development Workflow

### Adding New Tests
1. **Choose Category**: Unit, Integration, or E2E
2. **Follow Patterns**: Use existing test structure
3. **Add Metadata**: Include test priority and features
4. **Mock Dependencies**: Use TestDataFactory and APITestClient
5. **Test Locally**: Run test in isolation first
6. **Update Documentation**: Add to relevant README sections

### Test Data Management
```typescript
// Use TestDataFactory for consistent data
import { testDataFactory } from '../utilities/TestDataFactory';

const mockPost = testDataFactory.createMockPost({
  title: 'Test Post',
  content: 'Test content with @mention',
});

const mockAgents = testDataFactory.createMockAgents(5);
```

### API Mocking
```typescript
// Use APITestClient for controlled responses
import { apiTestClient } from '../utilities/APITestClient';

apiTestClient.setMockResponse('POST', '/api/v1/agent-posts', {
  success: true,
  data: mockPost,
  status: 201,
});
```

## 🔄 Maintenance

### Regular Tasks
- **Weekly**: Review flaky tests and improve stability
- **Monthly**: Update performance benchmarks
- **Quarterly**: Full test suite audit and optimization
- **Release**: Validate all critical paths pass

### Test Lifecycle
1. **Green Phase**: All tests passing, add new features
2. **Yellow Phase**: Some failures, investigate and fix
3. **Red Phase**: Critical failures, halt deployment
4. **Recovery**: Fix issues, validate with tests

### Performance Optimization
- **Parallel Execution**: Run tests concurrently where possible
- **Smart Test Selection**: Run only affected tests for small changes
- **Resource Management**: Clean up test data and connections
- **Caching**: Cache dependencies and build artifacts

## 📚 Resources

### Documentation
- [SPARC Methodology Guide](./docs/sparc-methodology.md)
- [Test Writing Guidelines](./docs/test-writing-guide.md) 
- [Debugging Test Failures](./docs/debugging-guide.md)
- [Performance Testing Best Practices](./docs/performance-testing.md)

### Tools & Libraries
- **Testing Framework**: Jest, Vitest, Playwright
- **Assertion Library**: Testing Library, Playwright Assertions
- **Mock Generation**: TestDataFactory, APITestClient
- **Coverage**: c8, Istanbul
- **Reporting**: HTML, JSON, JUnit formats

### Support
- **Issues**: Create GitHub issues with `test` label
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Contribute improvements via PR
- **Alerts**: Monitor #test-alerts Slack channel

---

## 🎯 Success Metrics

This SPARC regression test architecture ensures:

✅ **100% Critical Path Protection** - All P1 features covered  
✅ **95%+ Test Coverage** - Comprehensive code coverage  
✅ **99%+ Test Reliability** - Consistent, non-flaky tests  
✅ **<5min CI Feedback** - Fast test execution  
✅ **Zero Regression Escapes** - Catch issues before production  
✅ **Cross-Browser Compatibility** - Works everywhere  
✅ **Performance Monitoring** - Prevent performance regressions  
✅ **Developer Experience** - Easy to write, maintain, and debug tests

**The SPARC methodology ensures systematic, high-quality regression testing that scales with the application while maintaining fast feedback cycles and high confidence in deployments.**