#!/bin/bash

echo "========================================="
echo "Component Validation API Test Suite"
echo "========================================="
echo ""

API_URL="http://localhost:3001/api/validate-components"

# Test 1: Valid component
echo "Test 1: Valid Metric Component"
echo "-------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[{"type":"Metric","props":{"value":42,"label":"Total Users","description":"Active users"}}]}' | python3 -m json.tool
echo ""

# Test 2: Missing required field
echo "Test 2: Missing Required Field (label)"
echo "---------------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[{"type":"Metric","props":{"value":42}}]}' | python3 -m json.tool
echo ""

# Test 3: Invalid enum value
echo "Test 3: Invalid Enum Value"
echo "---------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[{"type":"Badge","props":{"variant":"success","children":"Test"}}]}' | python3 -m json.tool
echo ""

# Test 4: Unknown component type
echo "Test 4: Unknown Component Type"
echo "--------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[{"type":"UnknownComponent","props":{}}]}' | python3 -m json.tool
echo ""

# Test 5: Multiple valid components
echo "Test 5: Multiple Valid Components"
echo "-----------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[{"type":"Metric","props":{"value":100,"label":"Tasks"}},{"type":"Badge","props":{"variant":"secondary","children":"Active"}},{"type":"Button","props":{"variant":"outline","children":"Click"}}]}' | python3 -m json.tool
echo ""

# Test 6: Nested components with error
echo "Test 6: Nested Components with Error"
echo "--------------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[{"type":"Card","props":{"title":"Dashboard"},"children":[{"type":"Metric","props":{"value":50}}]}]}' | python3 -m json.tool
echo ""

# Test 7: Empty components array
echo "Test 7: Empty Components Array"
echo "--------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[]}' | python3 -m json.tool
echo ""

# Test 8: Invalid input (not array)
echo "Test 8: Invalid Input (Not Array)"
echo "-----------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":"not-an-array"}' | python3 -m json.tool
echo ""

# Test 9: Multiple errors
echo "Test 9: Multiple Validation Errors"
echo "------------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[{"type":"Metric","props":{"value":1}},{"type":"Badge","props":{"variant":"wrong","children":"X"}},{"type":"Unknown","props":{}}]}' | python3 -m json.tool
echo ""

# Test 10: Complex valid structure
echo "Test 10: Complex Valid Structure"
echo "----------------------------------"
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"components":[{"type":"Grid","props":{"cols":2},"children":[{"type":"Card","props":{"title":"Card 1"},"children":[{"type":"Metric","props":{"value":100,"label":"Metric 1"}}]},{"type":"Card","props":{"title":"Card 2"},"children":[{"type":"Badge","props":{"children":"Status"}}]}]}]}' | python3 -m json.tool
echo ""

echo "========================================="
echo "All Tests Completed"
echo "========================================="
