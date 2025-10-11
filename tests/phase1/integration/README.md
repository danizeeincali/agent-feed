# Phase 1 Integration Tests

These integration tests use **REAL PostgreSQL** to verify database functionality. No mocks, no fakes - just actual database operations.

## Test Files

### 1. **schema-creation.test.ts**
Tests database schema creation with real PostgreSQL:
- ✅ All 6 tables created correctly
- ✅ Columns have correct data types
- ✅ Constraints enforced (CHECK, UNIQUE, NOT NULL, FK)
- ✅ GIN indexes exist and use `jsonb_path_ops`
- ✅ Default values applied
- ✅ Foreign keys work with CASCADE
- ✅ Multi-user data isolation

### 2. **seeding.test.ts**
Tests system template seeding from JSON files:
- ✅ 3 templates inserted from JSON files
- ✅ All fields populated correctly
- ✅ JSONB data structures match schema
- ✅ Idempotency (can run multiple times)
- ✅ UPSERT behavior on conflicts
- ✅ Data validation enforced
- ✅ Error handling and rollback

### 3. **migrations.test.ts** *(existing)*
Tests migration runner with real database:
- ✅ Schema creation and rollback
- ✅ Data integrity protection
- ✅ Transaction rollback on error
- ✅ Audit trail logging
- ✅ User data preservation

### 4. **data-integrity.test.ts**
Tests database constraints and data protection:
- ✅ Foreign key constraints
- ✅ UNIQUE constraints
- ✅ CHECK constraints
- ✅ CASCADE DELETE behavior
- ✅ Multi-user data isolation
- ✅ JSONB data validation
- ✅ Transaction isolation (ACID)
- ✅ Timestamp auto-population

## Prerequisites

### 1. PostgreSQL Docker Container
```bash
# Start PostgreSQL via Docker Compose
docker-compose -f docker-compose.phase1.yml up -d postgres

# Verify it's running
docker-compose -f docker-compose.phase1.yml ps
```

### 2. Test Database Setup
```bash
# Create test database
docker exec -it agent-feed-postgres-phase1 psql -U postgres -c "CREATE DATABASE avidm_test;"

# Verify test database exists
docker exec -it agent-feed-postgres-phase1 psql -U postgres -l | grep avidm_test
```

### 3. Environment Variables
Create `.env.test` in project root:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=dev_password_change_in_production
DB_NAME=avidm_test
```

## Running Tests

### Run All Integration Tests
```bash
npm run test:phase1:integration
```

### Run Individual Test Files
```bash
# Schema creation tests
npm test -- tests/phase1/integration/schema-creation.test.ts

# Seeding tests
npm test -- tests/phase1/integration/seeding.test.ts

# Data integrity tests
npm test -- tests/phase1/integration/data-integrity.test.ts

# Migration tests
npm test -- tests/phase1/integration/migrations.test.ts
```

### Run with Coverage
```bash
npm run test:coverage -- tests/phase1/integration/
```

### Watch Mode
```bash
npm test -- --watch tests/phase1/integration/
```

## Test Database Helper

Use the `DatabaseTestHelper` class for easier test setup:

```typescript
import { createTestDatabase } from '../helpers/database';

describe('My Integration Test', () => {
  let db: DatabaseTestHelper;

  beforeAll(async () => {
    db = createTestDatabase();
    await db.connect();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean and setup schema
    await db.reset();

    // Seed templates
    await db.seedTemplates();
  });

  it('should work with real database', async () => {
    // Insert test data
    await db.insertMemory('user_123', 'tech-guru', 'Test memory');

    // Verify
    const count = await db.getRowCount('agent_memories');
    expect(count).toBe(1);
  });
});
```

## Test Structure

Each test follows this pattern:

1. **beforeAll**: Connect to test database
2. **afterAll**: Close database connection
3. **beforeEach**: Clean and recreate schema
4. **it**: Test specific functionality
5. **Assertions**: Verify actual database state

## Key Features

### ✅ Real Database Testing
- No mocks or stubs
- Tests actual PostgreSQL behavior
- Catches real-world issues

### ✅ Transaction Testing
- ACID compliance verified
- Rollback behavior tested
- Concurrent operation handling

### ✅ Constraint Verification
- CHECK constraints enforced
- UNIQUE constraints prevent duplicates
- Foreign keys maintain referential integrity

### ✅ Performance Testing
- GIN indexes verified
- Query performance measured
- Containment queries tested

### ✅ Data Protection
- Multi-user isolation verified
- Timestamp immutability tested
- CASCADE behavior validated

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection settings
docker exec -it agent-feed-postgres-phase1 psql -U postgres -c "SELECT version();"
```

### Tests Failing
```bash
# Drop and recreate test database
docker exec -it agent-feed-postgres-phase1 psql -U postgres -c "DROP DATABASE IF EXISTS avidm_test;"
docker exec -it agent-feed-postgres-phase1 psql -U postgres -c "CREATE DATABASE avidm_test;"

# Run tests again
npm test -- tests/phase1/integration/
```

### Permission Errors
```bash
# Verify user permissions
docker exec -it agent-feed-postgres-phase1 psql -U postgres -d avidm_test -c "SELECT current_user, current_database();"
```

## CI/CD Integration

### GitHub Actions
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: avidm_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm test -- tests/phase1/integration/
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: postgres
          DB_PASSWORD: test_password
          DB_NAME: avidm_test
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clean State**: Reset database before each test
3. **Fast Execution**: Keep tests focused and fast
4. **Clear Assertions**: Use descriptive expect statements
5. **Error Messages**: Provide helpful failure messages

## Coverage Goals

- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

## Next Steps

- [ ] Add performance benchmarks
- [ ] Add stress testing
- [ ] Add backup/restore tests
- [ ] Add replication tests
- [ ] Add connection pooling tests
