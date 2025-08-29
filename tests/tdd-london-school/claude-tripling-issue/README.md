# Claude Output Tripling Issue - TDD London School Tests

This test suite uses the **London School (Mockist) TDD approach** to isolate and identify the root cause of Claude terminal output tripling behavior through comprehensive mock-driven testing.

## 🎯 Mission

**PROBLEM**: Claude terminal output appears 3 times despite backend fixes.

**APPROACH**: Mock-driven testing to isolate each component and find where tripling occurs.

**EXPECTED OUTCOME**: Failing tests that demonstrate the exact root cause of message duplication.

## 📁 Test Files

### Core Test Suites

1. **`websocket-message-handling.test.ts`**
   - Mock WebSocket interactions
   - Test message routing and duplication prevention
   - Verify echo message filtering
   - Test deduplication logic

2. **`claude-output-parser.test.ts`**
   - Mock ClaudeOutputParser behavior
   - Test box content extraction
   - Verify ANSI sequence removal
   - Test section splitting logic

3. **`react-component-rendering.test.tsx`**
   - Mock React component rendering
   - Test state update behavior
   - Verify message list rendering
   - Test WebSocket integration with components

4. **`message-deduplication.test.ts`**
   - Mock deduplication mechanisms
   - Test message ID generation
   - Verify duplicate detection
   - Test memory cleanup behavior

5. **`integration-scenarios.test.ts`**
   - End-to-end pipeline testing
   - Mock complete message flow
   - Integration between all components
   - Real-world scenario testing

## 🧪 London School TDD Methodology

### Mock-First Approach
- Every external dependency is mocked
- Focus on **interactions** rather than state
- Test **how objects collaborate**
- Use mocks to define contracts

### Key Principles Applied
- **Outside-In Development**: Start with user behavior (WebSocket messages)
- **Behavior Verification**: Test interactions between components  
- **Mock-Driven Design**: Use mocks to drive interface design
- **Contract Testing**: Verify component collaborations

## 🚀 Running the Tests

### Install Dependencies
```bash
cd /workspaces/agent-feed/tests/tdd-london-school/claude-tripling-issue
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
npm run test:websocket     # WebSocket message handling
npm run test:parser        # Claude output parser
npm run test:react         # React component rendering
npm run test:dedup         # Message deduplication
npm run test:integration   # Integration scenarios
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### Debug Mode
```bash
npm run test:debug
```

## 🔍 Test Analysis

### Expected Failures (Demonstrating Issues)

The tests are **intentionally designed to FAIL** to expose the tripling issue:

1. **WebSocket Duplication**: Tests show same message processed 3 times
2. **Parser Splitting**: Tests reveal over-parsing of single responses  
3. **State Accumulation**: Tests expose React state tripling content
4. **Deduplication Gaps**: Tests show where deduplication fails

### Mock Strategy

Each test isolates a specific component:

```typescript
// Example: Mock WebSocket without real network calls
const mockWebSocket = new MockWebSocket('ws://localhost:3000/terminal');
mockWebSocket.simulateMessage({
  type: 'output',
  data: 'Claude response that gets tripled'
});

// Verify behavior without side effects
expect(messageHandler).toHaveBeenCalledTimes(1); // Should be 1, but might be 3
```

## 📊 Key Test Scenarios

### 1. Single Message Tripling
```typescript
// Send same message 3 times (simulating the bug)
mockWebSocket.simulateMessage(duplicateMessage);
mockWebSocket.simulateMessage(duplicateMessage);  
mockWebSocket.simulateMessage(duplicateMessage);

// Should process only once, but currently processes 3 times
expect(processedMessages.size).toBe(1); // FAILS - shows bug exists
```

### 2. Echo Message Filtering
```typescript
// Echo messages should be filtered to prevent duplication
const echoMessage = { type: 'echo', data: 'Echo content' };
mockWebSocket.simulateMessage(echoMessage);

// Should NOT trigger output handlers
expect(outputHandler).not.toHaveBeenCalled(); // PASSES - echo filtering works
```

### 3. Parser Over-Splitting  
```typescript
// Single Claude response should create one message
const singleResponse = "┌─────┐\n│ Hi │\n└─────┘";
const parsed = ClaudeOutputParser.parseOutput(singleResponse);

expect(parsed).toHaveLength(1); // FAILS if parser over-splits
```

### 4. State Duplication
```typescript
// React state updates should not accumulate duplicates
setState(prev => prev + newContent); // If called 3x, content triples

expect(state.content.match(/pattern/g)).toHaveLength(1); // FAILS if tripled
```

## 🎯 Root Cause Investigation

### Hypotheses to Test

1. **WebSocket Message Routing**: Multiple handlers processing same message
2. **Echo vs Output Confusion**: Echo messages not properly filtered  
3. **Parser Section Splitting**: Single responses split into multiple messages
4. **React State Race Conditions**: Rapid state updates causing accumulation
5. **Deduplication Logic Gaps**: Message IDs not preventing duplicates

### Mock Verification Points

- ✅ **WebSocket receives message once**
- ❌ **Message routed to single handler** (likely fails)
- ❌ **Deduplication blocks duplicates** (likely fails)  
- ❌ **Parser creates single message** (likely fails)
- ❌ **State updated only once** (likely fails)
- ❌ **Component renders content once** (likely fails)

## 🔧 Mock Infrastructure

### Global Test Helpers
- `MockWebSocket`: Controllable WebSocket for testing
- `MockEventSource`: SSE testing without real connections
- `testHelpers.createTestMessage()`: Generate test data
- `testHelpers.verifyNoDuplication()`: Check for duplicate content

### Component Mocks
- `MockMessageList`: Simulates message rendering
- `MockChatInterface`: Simulates chat component behavior  
- `MockClaudeInstanceManager`: Simulates main component state

## 📈 Success Criteria

### When Tests Pass (After Fixes)
1. Single WebSocket message → Single rendered output
2. Duplicate WebSocket messages → Single rendered output (deduplication works)
3. Echo messages → No output (properly filtered)
4. Complex Claude responses → Appropriate message count (not over-split)
5. Rapid state updates → No content accumulation

### Current Expected Failures
- Messages processed 3x instead of 1x
- Content appears tripled in rendered output
- Deduplication not preventing all duplicates
- Parser creating multiple messages from single input

## 🛠 Development Workflow

1. **Run failing tests** to confirm issue exists
2. **Analyze mock interactions** to see where duplication occurs
3. **Fix the identified component** (WebSocket routing, parser, deduplication, etc.)
4. **Re-run tests** to verify fix
5. **Refactor with confidence** knowing behavior is verified

The London School approach ensures we understand **exactly how components should collaborate** to prevent the tripling issue.

## 📝 Notes

- Tests use **jsdom** for React component testing without browser
- **No real WebSocket connections** - all mocked for reliability  
- **Comprehensive coverage** of the entire message flow pipeline
- **Behavior-focused** rather than implementation-focused
- **Fast execution** due to mock-driven approach

This test suite serves as both **issue diagnosis** and **regression prevention** for the Claude output tripling problem.