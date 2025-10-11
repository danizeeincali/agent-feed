#!/bin/bash

# Phase 1 Performance Test Runner and Report Generator
# Runs all performance tests and updates the performance report

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="tests/phase1/performance"
REPORT_FILE="tests/phase1/PERFORMANCE-REPORT.md"
RESULTS_FILE="/tmp/performance-results-$(date +%Y%m%d-%H%M%S).txt"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Phase 1 Performance Test Runner${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if PostgreSQL is running
if ! docker-compose -f docker-compose.phase1.yml ps postgres | grep -q "Up"; then
    echo -e "${RED}❌ PostgreSQL container not running${NC}"
    echo "Starting PostgreSQL..."
    docker-compose -f docker-compose.phase1.yml up -d postgres
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Check if database is accessible
if ! docker exec agent-feed-postgres-1 pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL not ready${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL ready${NC}"
echo ""

# Set test database environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=agentfeed_test
export DB_USER=postgres
export DB_PASSWORD=postgres

echo -e "${YELLOW}Creating test database...${NC}"

# Create test database
docker exec agent-feed-postgres-1 psql -U postgres -c "DROP DATABASE IF EXISTS agentfeed_test;" > /dev/null 2>&1 || true
docker exec agent-feed-postgres-1 psql -U postgres -c "CREATE DATABASE agentfeed_test;" > /dev/null 2>&1

echo -e "${GREEN}✅ Test database created${NC}"
echo ""

# Run performance tests
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Running Performance Tests${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Track overall status
ALL_TESTS_PASSED=true

# Run each test suite
echo -e "${YELLOW}1/3 Running Query Performance Tests...${NC}"
if npm test -- ${TEST_DIR}/query-performance.test.ts --verbose 2>&1 | tee -a "${RESULTS_FILE}"; then
    echo -e "${GREEN}✅ Query performance tests passed${NC}"
else
    echo -e "${RED}❌ Query performance tests failed${NC}"
    ALL_TESTS_PASSED=false
fi
echo ""

echo -e "${YELLOW}2/3 Running Seeding Performance Tests...${NC}"
if npm test -- ${TEST_DIR}/seeding-performance.test.ts --verbose 2>&1 | tee -a "${RESULTS_FILE}"; then
    echo -e "${GREEN}✅ Seeding performance tests passed${NC}"
else
    echo -e "${RED}❌ Seeding performance tests failed${NC}"
    ALL_TESTS_PASSED=false
fi
echo ""

echo -e "${YELLOW}3/3 Running Migration Performance Tests...${NC}"
if npm test -- ${TEST_DIR}/migration-performance.test.ts --verbose 2>&1 | tee -a "${RESULTS_FILE}"; then
    echo -e "${GREEN}✅ Migration performance tests passed${NC}"
else
    echo -e "${RED}❌ Migration performance tests failed${NC}"
    ALL_TESTS_PASSED=false
fi
echo ""

# Extract metrics from test results
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Extracting Performance Metrics${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Parse results file for key metrics
echo -e "${YELLOW}Analyzing results...${NC}"

# Memory retrieval query time
MEMORY_QUERY_TIME=$(grep -oP "Memory retrieval time: \K[0-9]+\.[0-9]+" "${RESULTS_FILE}" | head -1 || echo "N/A")
echo "  Memory Query Time: ${MEMORY_QUERY_TIME}ms"

# JSONB containment query time
JSONB_QUERY_TIME=$(grep -oP "JSONB containment query time: \K[0-9]+\.[0-9]+" "${RESULTS_FILE}" | head -1 || echo "N/A")
echo "  JSONB Query Time: ${JSONB_QUERY_TIME}ms"

# Seeding time
SEEDING_TIME=$(grep -oP "Seeding time for 3 templates: \K[0-9]+\.[0-9]+" "${RESULTS_FILE}" | head -1 || echo "N/A")
echo "  Seeding Time (3 templates): ${SEEDING_TIME}ms"

# Migration time
MIGRATION_TIME=$(grep -oP "Migration 001 execution time: \K[0-9]+\.[0-9]+" "${RESULTS_FILE}" | head -1 || echo "N/A")
echo "  Migration Time: ${MIGRATION_TIME}ms"

# Concurrent query average
CONCURRENT_AVG=$(grep -oP "Concurrent queries.*Avg: \K[0-9]+\.[0-9]+" "${RESULTS_FILE}" | head -1 || echo "N/A")
echo "  Concurrent Query Avg: ${CONCURRENT_AVG}ms"

echo ""

# Generate summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Performance Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check against thresholds
MEMORY_THRESHOLD=100
SEEDING_THRESHOLD=2000
MIGRATION_THRESHOLD=10000

echo "Performance Requirements:"
echo ""

# Memory query check
if [ "${MEMORY_QUERY_TIME}" != "N/A" ]; then
    if (( $(echo "${MEMORY_QUERY_TIME} < ${MEMORY_THRESHOLD}" | bc -l) )); then
        echo -e "  ${GREEN}✅ Memory Retrieval: ${MEMORY_QUERY_TIME}ms < ${MEMORY_THRESHOLD}ms${NC}"
    else
        echo -e "  ${RED}❌ Memory Retrieval: ${MEMORY_QUERY_TIME}ms >= ${MEMORY_THRESHOLD}ms${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  Memory Retrieval: Not measured${NC}"
fi

# Seeding check
if [ "${SEEDING_TIME}" != "N/A" ]; then
    if (( $(echo "${SEEDING_TIME} < ${SEEDING_THRESHOLD}" | bc -l) )); then
        echo -e "  ${GREEN}✅ Seeding (3 templates): ${SEEDING_TIME}ms < ${SEEDING_THRESHOLD}ms${NC}"
    else
        echo -e "  ${RED}❌ Seeding (3 templates): ${SEEDING_TIME}ms >= ${SEEDING_THRESHOLD}ms${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  Seeding: Not measured${NC}"
fi

# Migration check
if [ "${MIGRATION_TIME}" != "N/A" ]; then
    if (( $(echo "${MIGRATION_TIME} < ${MIGRATION_THRESHOLD}" | bc -l) )); then
        echo -e "  ${GREEN}✅ Migration: ${MIGRATION_TIME}ms < ${MIGRATION_THRESHOLD}ms${NC}"
    else
        echo -e "  ${RED}❌ Migration: ${MIGRATION_TIME}ms >= ${MIGRATION_THRESHOLD}ms${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  Migration: Not measured${NC}"
fi

echo ""

# Save results
echo -e "${YELLOW}Saving detailed results to: ${RESULTS_FILE}${NC}"
echo ""

# Offer to update report
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Update Performance Report${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

echo "Performance metrics extracted:"
echo "  Memory Query: ${MEMORY_QUERY_TIME}ms"
echo "  JSONB Query: ${JSONB_QUERY_TIME}ms"
echo "  Seeding: ${SEEDING_TIME}ms"
echo "  Migration: ${MIGRATION_TIME}ms"
echo "  Concurrent Avg: ${CONCURRENT_AVG}ms"
echo ""

echo "To update the performance report, manually edit:"
echo "  ${REPORT_FILE}"
echo ""
echo "Replace placeholder values (XX ms) with actual metrics."
echo ""

# Final status
echo -e "${BLUE}================================================${NC}"
if [ "${ALL_TESTS_PASSED}" = true ]; then
    echo -e "${GREEN}  ✅ ALL PERFORMANCE TESTS PASSED${NC}"
else
    echo -e "${RED}  ❌ SOME PERFORMANCE TESTS FAILED${NC}"
fi
echo -e "${BLUE}================================================${NC}"
echo ""

# Cleanup test database
echo -e "${YELLOW}Cleaning up test database...${NC}"
docker exec agent-feed-postgres-1 psql -U postgres -c "DROP DATABASE IF EXISTS agentfeed_test;" > /dev/null 2>&1 || true
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

echo "Performance test results saved to: ${RESULTS_FILE}"
echo ""

# Exit with appropriate status
if [ "${ALL_TESTS_PASSED}" = true ]; then
    exit 0
else
    exit 1
fi
