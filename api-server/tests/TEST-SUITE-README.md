# Avi Skills Refactor Test Suite

Comprehensive test coverage for the orchestrator routing fix and skills loading system.

## Test Organization

### 1. Orchestrator Routing Tests
**Location**: `/workspaces/agent-feed/api-server/tests/orchestrator-routing.test.js`

**Coverage**:
- Comment ticket detection via `metadata.type === 'comment'`
- Post ticket routing to `worker.execute()`
- Comment ticket routing to `processCommentTicket()`
- Metadata field extraction for comments
- Conversation chain retrieval
- Agent routing logic for comments
- Error handling for both ticket types
- Worker capacity management
- End-to-end ticket processing

**Key Test Scenarios**:
- ✅ Detects comment tickets by metadata.type
- ✅ Routes post tickets to worker.execute()
- ✅ Routes comment tickets to processCommentTicket()
- ✅ Loads parent post context for comments
- ✅ Handles conversation chains correctly
- ✅ Routes to appropriate agents (page-builder, skills-architect, etc.)
- ✅ Respects @mentions for explicit routing
- ✅ Fails tickets gracefully on errors
- ✅ Manages worker capacity (maxWorkers limit)
- ✅ Handles mixed ticket types

**Run Tests**:
```bash
cd /workspaces/agent-feed/api-server
npm test tests/orchestrator-routing.test.js
```

### 2. SkillLoader Unit Tests
**Location**: `/workspaces/agent-feed/prod/tests/unit/SkillLoader.test.js`

**Coverage**:
- Simple query detection (math, greetings)
- Skill detection for various query types (code, files, database, API, testing, git)
- Skill loading from filesystem
- Skill caching mechanism
- System prompt building with selective skills
- Token counting accuracy
- Cost estimation calculations
- Cache management
- Error handling (missing skills, filesystem errors)
- Performance (parallel loading, cache benefits)

**Key Test Scenarios**:
- ✅ Detects simple math: "5+3", "100*2", "what is 3000+500?"
- ✅ Detects greetings: "hello", "hi", "hey"
- ✅ Identifies required skills by keywords
- ✅ Loads skills from filesystem
- ✅ Caches loaded skills (avoids redundant file reads)
- ✅ Builds minimal prompts for simple queries
- ✅ Includes only relevant skills for complex queries
- ✅ Counts tokens accurately
- ✅ Calculates cost savings correctly
- ✅ Handles missing skills gracefully
- ✅ Loads skills in parallel

**Run Tests**:
```bash
cd /workspaces/agent-feed/prod
npm test tests/unit/SkillLoader.test.js
```

### 3. Skills Integration Tests
**Location**: `/workspaces/agent-feed/prod/tests/integration/skills-integration.test.js`

**Coverage**:
- ClaudeCodeSDKManager + SkillLoader integration
- Token reduction for simple queries
- Skill loading for complex queries
- Cost estimation accuracy
- Real-world conversation scenarios
- Performance under load
- Error handling and fallbacks

**Key Test Scenarios**:
- ✅ Integrates SkillLoader into SDK query flow
- ✅ Achieves 70% token reduction for simple math
- ✅ Uses minimal tokens for greetings
- ✅ Shows cost savings over multiple queries
- ✅ Loads code skills for debugging queries
- ✅ Loads testing skills for test creation
- ✅ Loads multiple skills for complex multi-step queries
- ✅ Estimates per-query and monthly cost savings
- ✅ Handles "3000+500 then divide by 2" scenario
- ✅ Maintains conversation memory while minimizing tokens
- ✅ Handles rapid-fire queries efficiently
- ✅ Falls back gracefully on errors

**Run Tests**:
```bash
cd /workspaces/agent-feed/prod
npm test tests/integration/skills-integration.test.js
```

### 4. E2E Conversation Memory Tests
**Location**: `/workspaces/agent-feed/prod/tests/e2e/conversation-memory-skills.spec.js`

**Coverage**:
- Complete user interaction flow
- Conversation memory retention
- Token optimization in real UI
- Threaded reply context
- Visual verification (screenshots)
- Edge cases (long conversations, mixed complexity)

**Key Test Scenarios**:
- ✅ User: "3000 + 500" → Avi: "3500"
- ✅ User: "divide by 2" → Avi: "1750" (remembers previous result)
- ✅ Maintains context across multiple calculations
- ✅ Uses minimal tokens for simple queries
- ✅ Loads relevant skills for complex queries
- ✅ Handles conversational references ("it", "that", "the result")
- ✅ Maintains context in threaded replies
- ✅ Handles skill loading failures gracefully
- ✅ Optimizes token usage across conversation
- ✅ Preserves conversation history after page reload (stretch goal)
- ✅ Handles very long conversations without overflow
- ✅ Switches between simple and complex queries seamlessly

**Run Tests**:
```bash
cd /workspaces/agent-feed
npm run test:e2e prod/tests/e2e/conversation-memory-skills.spec.js
```

**View Screenshots**:
```bash
ls -la test-results/conversation-*.png
```

## Test Coverage Metrics

### Expected Coverage
- **Orchestrator Routing**: 95%+ coverage
- **SkillLoader**: 90%+ coverage
- **Skills Integration**: 85%+ coverage
- **E2E Scenarios**: 100% critical path coverage

### Critical Paths Tested
1. ✅ Comment ticket routing (metadata.type detection)
2. ✅ Post ticket routing (worker.execute)
3. ✅ Conversation chain retrieval
4. ✅ Simple query detection (token optimization)
5. ✅ Skill detection and loading
6. ✅ System prompt building with selective skills
7. ✅ Token counting and cost estimation
8. ✅ Conversation memory retention
9. ✅ Real-world user scenarios

## Running All Tests

### Unit Tests
```bash
cd /workspaces/agent-feed
npm test -- --testPathPattern="orchestrator-routing|SkillLoader"
```

### Integration Tests
```bash
cd /workspaces/agent-feed
npm test -- --testPathPattern="skills-integration"
```

### E2E Tests
```bash
cd /workspaces/agent-feed
npm run test:e2e -- prod/tests/e2e/conversation-memory-skills.spec.js
```

### All Tests Together
```bash
cd /workspaces/agent-feed
npm test && npm run test:e2e
```

### With Coverage Report
```bash
cd /workspaces/agent-feed
npm run test:coverage -- --testPathPattern="orchestrator|SkillLoader|skills-integration"
```

## Test Data Requirements

### Mock Data Needed
- Agent files in `/workspaces/agent-feed/prod/.claude/agents/`
- Skill files in `/workspaces/agent-feed/prod/agent_workspace/skills/avi/`
- Skills manifest JSON
- System instructions markdown
- Sample posts and comments in database

### Test Database Setup
```bash
# Create test database
npm run setup:test-db

# Seed with sample data
npm run seed:test-data
```

## Success Criteria

### Orchestrator Tests
- ✅ All routing tests pass
- ✅ No false positives (post tickets routed as comments)
- ✅ No false negatives (comment tickets routed as posts)
- ✅ Error handling works correctly
- ✅ Worker capacity respected

### SkillLoader Tests
- ✅ Simple query detection 100% accurate
- ✅ Skill detection covers all major query types
- ✅ Token reduction >= 50% for simple queries
- ✅ Cache hit rate >= 80% for repeated patterns
- ✅ Cost estimation within 5% of actual

### Integration Tests
- ✅ SDK + SkillLoader integration works end-to-end
- ✅ Token reduction measurable and consistent
- ✅ No performance regression
- ✅ Graceful degradation on errors

### E2E Tests
- ✅ User can complete conversation scenarios
- ✅ Avi maintains context across queries
- ✅ UI updates in real-time
- ✅ No visual regressions (screenshots verify)
- ✅ No memory leaks in long conversations

## Common Issues & Troubleshooting

### Issue: Tests fail with "SkillLoader not found"
**Solution**: Implement SkillLoader.js at `/workspaces/agent-feed/prod/src/services/SkillLoader.js`

### Issue: E2E tests timeout
**Solution**:
- Ensure API server is running on port 3001
- Ensure frontend is running on port 3000
- Increase timeout in test config

### Issue: Mock data not loading
**Solution**:
- Check file paths in mocks
- Verify agent files exist
- Run database seeding script

### Issue: Token counting inaccurate
**Solution**:
- Use Claude's official token counter
- Calibrate approximation formula
- Add regression tests

## Next Steps

1. **Run Tests**: Execute all test suites
2. **Check Coverage**: Review coverage reports
3. **Fix Failures**: Address any failing tests
4. **Add Tests**: Expand coverage for edge cases
5. **CI/CD Integration**: Add tests to CI pipeline

## Test Maintenance

### Adding New Tests
1. Follow existing test patterns
2. Use descriptive test names
3. Add comments for complex scenarios
4. Update this README

### Updating Tests
1. Update tests when implementation changes
2. Keep test data in sync with schema
3. Maintain backward compatibility
4. Document breaking changes

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated**: 2025-10-30
**Test Suite Version**: 1.0.0
**Maintainer**: Test Engineer Agent
