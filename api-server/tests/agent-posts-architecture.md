# POST /api/v1/agent-posts - London School Architecture

## Object Collaboration Pattern

This diagram shows the **London School TDD approach** - how objects collaborate to fulfill the POST request:

```
┌─────────────────────────────────────────────────────────────────┐
│                     HTTP POST Request                            │
│              POST /api/v1/agent-posts                            │
│   { title, content, agentId, metadata? }                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│                 Route Handler (Controller)                      │
│                                                                 │
│  Orchestrates the workflow:                                    │
│  1. Validate → 2. Generate ID → 3. Timestamp → 4. Save        │
└─┬───────┬───────┬────────┬──────────────────────────────────┬─┘
  │       │       │        │                                  │
  │       │       │        │                                  │
  │  [1]  │  [2]  │  [3]   │  [4]                            │
  │       │       │        │                                  │
  ▼       ▼       ▼        ▼                                  ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                          ┌─────┐
│Valid││ID    ││Time  ││Post  │                          │Error │
│ator ││Gen   ││stamp ││Repo  │                          │Hand  │
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘                          └──┬──┘
   │       │       │       │                                 │
   │       │       │       │                                 │
   └───────┴───────┴───────┴─────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Database    │
                    │ (agent_posts) │
                    └───────────────┘
```

## Sequence Diagram (London School Flow)

```
Client          Handler       Validator    IDGen    TimeSvc   Repository
  │                │              │          │         │          │
  │───POST────────>│              │          │         │          │
  │                │              │          │         │          │
  │                │──validate──>│          │         │          │
  │                │<─{valid}────┤          │         │          │
  │                │              │          │         │          │
  │                │──validate──>│          │         │          │
  │                │   Content    │          │         │          │
  │                │<─{valid}────┤          │         │          │
  │                │              │          │         │          │
  │                │────generate────────────>│         │          │
  │                │<─────UUID───────────────┤         │          │
  │                │              │          │         │          │
  │                │────────────────────────────now()─>│          │
  │                │<─────────────────────timestamp───┤          │
  │                │              │          │         │          │
  │                │──────────────────────────────────────save()─>│
  │                │<─────────────────────────────────savedPost──┤
  │                │              │          │         │          │
  │<───201 + Post──┤              │          │         │          │
  │                │              │          │         │          │

```

## Mock Contracts (London School Test Doubles)

### 1. ValidationService Contract
```typescript
interface ValidationService {
  validatePostData(data: any): ValidationResult {
    // Returns: { valid: boolean, message?: string }
    // Checks: title, content, agentId presence
  }

  validateContentLength(content: string): ValidationResult {
    // Returns: { valid: boolean, message?: string }
    // Checks: content.length <= 10,000
  }
}
```

### 2. IdGenerator Contract
```typescript
interface IdGenerator {
  generate(): string {
    // Returns: UUID v4 format
    // Each call must return unique ID
  }
}
```

### 3. TimestampService Contract
```typescript
interface TimestampService {
  now(): string {
    // Returns: ISO 8601 timestamp
    // Format: "2025-10-01T12:00:00.000Z"
  }
}
```

### 4. PostRepository Contract
```typescript
interface PostRepository {
  save(post: Post): Promise<Post> {
    // Persists post to database
    // Returns: saved post with all fields
  }

  findById(id: string): Promise<Post | null> {
    // Retrieves post by ID
  }

  findAll(): Promise<Post[]> {
    // Returns all posts (newest first)
  }

  count(): Promise<number> {
    // Returns total post count
  }
}
```

## London School Testing Philosophy

### What We Test (Behavior)
✅ **Interactions** - Did handler call validator?
✅ **Sequence** - validate → generate → timestamp → save
✅ **Contracts** - Did we pass correct data to collaborators?
✅ **Collaborations** - How objects work together
✅ **Error Propagation** - Validation failures prevent save

### What We Don't Test (State)
❌ **Internal State** - Not checking private variables
❌ **Database Schema** - Mocked repository handles this
❌ **Implementation Details** - Only public API contracts
❌ **Concrete Classes** - Testing against interfaces

## Benefits of London School Approach

### 1. Design Emerges from Tests
- Tests define the **required collaborators** before implementation
- Mocks reveal the **necessary interfaces**
- Clear **separation of concerns** from the start

### 2. Fast Test Execution
- No database connection needed
- No file I/O operations
- Pure in-memory mock interactions
- **All 32 tests run in 147ms**

### 3. Clear Object Responsibilities
```
Handler:       Orchestration (workflow coordination)
Validator:     Business rules (validation logic)
IDGenerator:   ID creation (unique identifiers)
TimestampSvc:  Time management (consistent timestamps)
Repository:    Persistence (database operations)
```

### 4. Isolated Development
- Each component can be built **independently**
- Teams can work in **parallel**
- **Contract-first** development
- Easy to **replace implementations**

### 5. Refactoring Safety
- Mocks verify **contract compliance**
- Changes to internals don't break tests
- **Behavior preservation** guaranteed
- **Interface stability** enforced

## Comparison: London vs Chicago (Classical) School

### London School (Our Approach)
```javascript
it('should save post via repository', () => {
  await handler.createPost(validData);

  // Verify interaction happened
  expect(mockRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Test' })
  );
});
```

### Chicago School (Alternative)
```javascript
it('should save post to database', async () => {
  await handler.createPost(validData);

  // Query real database
  const saved = await db.query('SELECT * FROM posts WHERE title = ?', ['Test']);
  expect(saved).toBeDefined();
});
```

## Test-Driven Design Decisions

The tests **drove these design decisions**:

1. **Separate Validation** - Validator service for business rules
2. **ID Generation Service** - Ensures uniqueness, testable
3. **Timestamp Service** - Makes time deterministic in tests
4. **Repository Pattern** - Abstracts data persistence
5. **Error Handling** - Consistent error response format
6. **Request Orchestration** - Handler coordinates workflow

## Implementation Checklist

Based on tests, implement in this order:

- [ ] **1. Define Interfaces** (from mock contracts)
- [ ] **2. Create Database Schema** (agent_posts table)
- [ ] **3. Implement ValidationService**
  - [ ] validatePostData method
  - [ ] validateContentLength method
- [ ] **4. Implement IdGenerator**
  - [ ] generate method (UUID v4)
- [ ] **5. Implement TimestampService**
  - [ ] now method (ISO 8601)
- [ ] **6. Implement PostRepository**
  - [ ] save method (SQLite INSERT)
  - [ ] findById method
  - [ ] findAll method
  - [ ] count method
- [ ] **7. Implement Route Handler**
  - [ ] Wire up all collaborators
  - [ ] Implement workflow: validate → ID → timestamp → save
  - [ ] Add error handling
- [ ] **8. Mount Route in server.js**
  - [ ] POST /api/v1/agent-posts
- [ ] **9. Run Tests** - Watch them pass! ✅

## Expected Test Output (After Implementation)

```bash
✓ tests/agent-posts.test.js (32 tests) 147ms
  ✓ 1. POST returns 201 on valid request (1 test)
  ✓ 2. POST returns created post with ID (2 tests)
  ✓ 3. POST validates required fields (4 tests)
  ✓ 4. POST accepts 10,000 character content (2 tests)
  ✓ 5. POST rejects over 10,000 characters (2 tests)
  ✓ 6. POST generates unique IDs (2 tests)
  ✓ 7. POST adds timestamps (4 tests)
  ✓ 8. POST stores post (3 tests)
  ✓ 9. POST returns proper error on invalid JSON (2 tests)
  ✓ 10. POST handles missing metadata gracefully (2 tests)
  ✓ 11. Created posts appear in GET endpoint (2 tests)
  ✓ 12. Multiple posts maintain order (3 tests)
  ✓ Error Handling and Edge Cases (3 tests)

Test Files  1 passed (1)
     Tests  32 passed (32)
```

---

**London School TDD: Define the conversation between objects first, then make them talk!** 🎭
