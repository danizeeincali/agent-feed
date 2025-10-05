#!/bin/bash

echo "========================================="
echo "Component Catalog API Validation Tests"
echo "========================================="
echo ""

BASE_URL="http://localhost:3001/api/components"
PASS_COUNT=0
FAIL_COUNT=0

# Test 1: Get all components
echo "Test 1: GET /catalog - All components"
RESPONSE=$(curl -s "$BASE_URL/catalog")
TOTAL=$(echo "$RESPONSE" | jq -r '.totalComponents')
if [ "$TOTAL" -eq 15 ]; then
  echo "✅ PASS: Returns 15 components"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Expected 15 components, got $TOTAL"
  ((FAIL_COUNT++))
fi
echo ""

# Test 2: Check all component types exist
echo "Test 2: Verify all 15 component types"
COMPONENT_TYPES=$(echo "$RESPONSE" | jq -r '.components[].type' | sort)
EXPECTED_TYPES="Badge
Button
CapabilityList
Card
Grid
Metric
ProfileHeader
dataTable
form
header
list
stat
tabs
timeline
todoList"
if [ "$COMPONENT_TYPES" == "$EXPECTED_TYPES" ]; then
  echo "✅ PASS: All expected component types present"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Component types mismatch"
  ((FAIL_COUNT++))
fi
echo ""

# Test 3: Get specific component
echo "Test 3: GET /catalog/header - Specific component"
HEADER_RESPONSE=$(curl -s "$BASE_URL/catalog/header")
HEADER_TYPE=$(echo "$HEADER_RESPONSE" | jq -r '.component.type')
if [ "$HEADER_TYPE" == "header" ]; then
  echo "✅ PASS: Returns header component"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Expected header type"
  ((FAIL_COUNT++))
fi
echo ""

# Test 4: Check examples exist
echo "Test 4: Verify component has examples"
EXAMPLES_COUNT=$(echo "$HEADER_RESPONSE" | jq -r '.component.examples | length')
if [ "$EXAMPLES_COUNT" -ge 2 ]; then
  echo "✅ PASS: Header has $EXAMPLES_COUNT examples"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Expected at least 2 examples"
  ((FAIL_COUNT++))
fi
echo ""

# Test 5: Check schema exists
echo "Test 5: Verify JSON Schema is present"
SCHEMA_TYPE=$(echo "$HEADER_RESPONSE" | jq -r '.component.schema.definitions.header.type')
if [ "$SCHEMA_TYPE" == "object" ]; then
  echo "✅ PASS: JSON Schema is valid"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Invalid JSON Schema"
  ((FAIL_COUNT++))
fi
echo ""

# Test 6: Test 404 for unknown component
echo "Test 6: GET /catalog/unknown - 404 handling"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/catalog/unknownComponent")
if [ "$HTTP_CODE" -eq 404 ]; then
  echo "✅ PASS: Returns 404 for unknown component"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Expected 404, got $HTTP_CODE"
  ((FAIL_COUNT++))
fi
echo ""

# Test 7: Get categories
echo "Test 7: GET /categories - List categories"
CATEGORIES_RESPONSE=$(curl -s "$BASE_URL/categories")
CATEGORIES_COUNT=$(echo "$CATEGORIES_RESPONSE" | jq -r '.totalCategories')
if [ "$CATEGORIES_COUNT" -eq 4 ]; then
  echo "✅ PASS: Returns 4 categories"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Expected 4 categories, got $CATEGORIES_COUNT"
  ((FAIL_COUNT++))
fi
echo ""

# Test 8: Filter by category
echo "Test 8: GET /catalog?category=Interactive - Category filter"
FILTER_RESPONSE=$(curl -s "$BASE_URL/catalog?category=Interactive")
FILTERED_COUNT=$(echo "$FILTER_RESPONSE" | jq -r '.totalComponents')
if [ "$FILTERED_COUNT" -eq 3 ]; then
  echo "✅ PASS: Returns 3 Interactive components"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Expected 3 components, got $FILTERED_COUNT"
  ((FAIL_COUNT++))
fi
echo ""

# Test 9: Search functionality
echo "Test 9: GET /catalog?search=button - Search"
SEARCH_RESPONSE=$(curl -s "$BASE_URL/catalog?search=button")
SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.totalComponents')
if [ "$SEARCH_COUNT" -ge 1 ]; then
  echo "✅ PASS: Search returns $SEARCH_COUNT result(s)"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Search returned no results"
  ((FAIL_COUNT++))
fi
echo ""

# Test 10: Verify all components have examples
echo "Test 10: All components have examples"
NO_EXAMPLES=$(echo "$RESPONSE" | jq -r '.components[] | select(.examples | length == 0) | .type')
if [ -z "$NO_EXAMPLES" ]; then
  echo "✅ PASS: All components have examples"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Components without examples: $NO_EXAMPLES"
  ((FAIL_COUNT++))
fi
echo ""

# Test 11: Verify all components have descriptions
echo "Test 11: All components have descriptions"
NO_DESC=$(echo "$RESPONSE" | jq -r '.components[] | select(.description == "") | .type')
if [ -z "$NO_DESC" ]; then
  echo "✅ PASS: All components have descriptions"
  ((PASS_COUNT++))
else
  echo "❌ FAIL: Components without descriptions: $NO_DESC"
  ((FAIL_COUNT++))
fi
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: $((PASS_COUNT + FAIL_COUNT))"
echo "✅ Passed: $PASS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed"
  exit 1
fi
