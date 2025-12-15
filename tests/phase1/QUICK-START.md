# Phase 1 Integration Tests - Quick Start

## 🚀 Get Started in 2 Minutes

### Step 1: Setup Test Database
```bash
npm run setup:test-db
```
This creates the `avidm_test` database and generates `.env.test` file.

---

### Step 2: Run Tests
```bash
# Run all integration tests
npm run test:phase1:integration

# Or run specific tests
npm run test:phase1:schema      # Schema creation tests
npm run test:phase1:seeding     # Template seeding tests
npm run test:phase1:integrity   # Data integrity tests
npm run test:phase1:migrations  # Migration tests
```

---

## 📚 What Gets Tested?

### ✅ Schema Creation (20+ tests)
- All 6 tables created correctly
- Columns have right data types
- Constraints enforced (PK, FK, UNIQUE, CHECK, NOT NULL)
- GIN indexes exist with jsonb_path_ops
- CASCADE DELETE works

### ✅ Template Seeding (15+ tests)
- 3 templates inserted from JSON files
- JSONB structures validated
- Idempotency verified (can run multiple times)
- UPSERT behavior tested

### ✅ Data Integrity (25+ tests)
- Foreign keys enforced
- UNIQUE constraints prevent duplicates
- CHECK constraints validate data
- Multi-user isolation verified
- ACID transactions tested

### ✅ Migrations (15+ tests)
- Schema creation via migrations
- Data protection during migrations
- Rollback on error
- Audit trail logging

---

## 🛠️ Common Commands

```bash
# Setup
npm run setup:test-db           # Create test database

# Run tests
npm run test:phase1:integration         # All tests
npm run test:phase1:integration:watch   # Watch mode
npm run test:phase1:integration:coverage # With coverage

# Individual test files
npm run test:phase1:schema      # Schema creation
npm run test:phase1:seeding     # Template seeding
npm run test:phase1:integrity   # Data integrity
npm run test:phase1:migrations  # Migrations

# Manual database access
docker exec -it agent-feed-postgres-phase1 psql -U postgres -d avidm_test
```

---

## 🔍 Test Database

- **Name**: `avidm_test`
- **User**: `postgres`
- **Password**: `dev_password_change_in_production`
- **Host**: `localhost`
- **Port**: `5432`

---

## 📦 What Was Created?

### Test Files (4 files)
- `tests/phase1/integration/schema-creation.test.ts` - 715 lines, 20+ tests
- `tests/phase1/integration/seeding.test.ts` - 515 lines, 15+ tests
- `tests/phase1/integration/data-integrity.test.ts` - 650 lines, 25+ tests
- `tests/phase1/integration/migrations.test.ts` - 459 lines, 15+ tests

### Helper Files
- `tests/phase1/helpers/database.ts` - Database test utilities
- `scripts/setup-test-db.sh` - Automated setup script
- `jest.integration.config.js` - Jest configuration
- `.env.test` - Auto-generated environment config

### Documentation
- `tests/phase1/integration/README.md` - Comprehensive guide
- `tests/phase1/INTEGRATION-TESTS-SUMMARY.md` - Detailed summary
- `tests/phase1/DELIVERABLES.md` - Complete deliverables list
- `tests/phase1/QUICK-START.md` - This file

---

## 🎯 Key Features

✅ **REAL PostgreSQL** - No mocks, tests actual database
✅ **75+ Tests** - Comprehensive coverage
✅ **Easy Setup** - One command setup script
✅ **Helper Utilities** - Database test helper provided
✅ **Complete Docs** - README + 3 summary files

---

## 🆘 Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL
docker-compose -f docker-compose.phase1.yml up -d postgres

# Recreate test database
npm run setup:test-db
```

### Tests Failing
```bash
# Drop and recreate test database
docker exec -it agent-feed-postgres-phase1 psql -U postgres -c "DROP DATABASE IF EXISTS avidm_test;"
npm run setup:test-db

# Run tests again
npm run test:phase1:integration
```

---

## 📖 More Information

- **Full Documentation**: `tests/phase1/integration/README.md`
- **Detailed Summary**: `tests/phase1/INTEGRATION-TESTS-SUMMARY.md`
- **Complete Deliverables**: `tests/phase1/DELIVERABLES.md`

---

## ✅ Verification

```bash
# Verify all files created
ls -la tests/phase1/integration/
ls -la tests/phase1/helpers/
ls -la scripts/setup-test-db.sh

# Verify test database exists
docker exec -it agent-feed-postgres-phase1 psql -U postgres -l | grep avidm_test

# Run tests
npm run test:phase1:integration
```

---

**Ready to go! Run `npm run setup:test-db` then `npm run test:phase1:integration` 🚀**
