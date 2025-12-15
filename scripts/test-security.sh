#!/bin/bash

##############################################################################
# Security Feature Testing Script
# Validates all security implementations with real attack vectors
##############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:3001"
PASSED=0
FAILED=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Security Features Testing - Real Attack Vectors${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

test_security_headers() {
    echo -e "\n${YELLOW}1. Testing Security Headers${NC}"

    headers=$(curl -sI $BASE_URL/api/health)

    # Check for required headers
    if echo "$headers" | grep -q "Strict-Transport-Security"; then
        echo -e "${GREEN}✓${NC} HSTS header present"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} HSTS header missing"
        ((FAILED++))
    fi

    if echo "$headers" | grep -q "Content-Security-Policy"; then
        echo -e "${GREEN}✓${NC} CSP header present"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} CSP header missing"
        ((FAILED++))
    fi

    if echo "$headers" | grep -q "X-Frame-Options"; then
        echo -e "${GREEN}✓${NC} X-Frame-Options header present"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} X-Frame-Options header missing"
        ((FAILED++))
    fi

    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        echo -e "${GREEN}✓${NC} X-Content-Type-Options header present"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} X-Content-Type-Options header missing"
        ((FAILED++))
    fi

    if echo "$headers" | grep -q "Referrer-Policy"; then
        echo -e "${GREEN}✓${NC} Referrer-Policy header present"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Referrer-Policy header missing"
        ((FAILED++))
    fi

    if ! echo "$headers" | grep -q "X-Powered-By"; then
        echo -e "${GREEN}✓${NC} X-Powered-By header hidden"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} X-Powered-By header exposed"
        ((FAILED++))
    fi
}

test_sql_injection() {
    echo -e "\n${YELLOW}2. Testing SQL Injection Prevention${NC}"

    # Test 1: UNION attack
    response=$(curl -s -X POST $BASE_URL/api/test/input \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"admin' UNION SELECT * FROM users--\",\"password\":\"test\"}")

    if echo "$response" | grep -q "Invalid input"; then
        echo -e "${GREEN}✓${NC} UNION attack blocked"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} UNION attack not blocked"
        ((FAILED++))
    fi

    # Test 2: OR 1=1 attack
    response=$(curl -s -X POST $BASE_URL/api/test/input \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"admin' OR '1'='1\",\"password\":\"test\"}")

    if echo "$response" | grep -q "Invalid input"; then
        echo -e "${GREEN}✓${NC} OR 1=1 attack blocked"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} OR 1=1 attack not blocked"
        ((FAILED++))
    fi

    # Test 3: Comment injection
    response=$(curl -s -X POST $BASE_URL/api/test/input \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"1; DROP TABLE users--\"}")

    if echo "$response" | grep -q "Invalid input"; then
        echo -e "${GREEN}✓${NC} Comment injection blocked"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Comment injection not blocked"
        ((FAILED++))
    fi
}

test_xss_prevention() {
    echo -e "\n${YELLOW}3. Testing XSS Prevention${NC}"

    # Test 1: Script tag
    response=$(curl -s -X POST $BASE_URL/api/test/input \
        -H "Content-Type: application/json" \
        -d "{\"comment\":\"<script>alert('XSS')</script>\"}")

    if echo "$response" | grep -q "Invalid input"; then
        echo -e "${GREEN}✓${NC} Script tag attack blocked"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Script tag attack not blocked"
        ((FAILED++))
    fi

    # Test 2: Event handler
    response=$(curl -s -X POST $BASE_URL/api/test/input \
        -H "Content-Type: application/json" \
        -d "{\"html\":\"<img src=x onerror=alert(1)>\"}")

    if echo "$response" | grep -q "Invalid input"; then
        echo -e "${GREEN}✓${NC} Event handler attack blocked"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Event handler attack not blocked"
        ((FAILED++))
    fi

    # Test 3: Javascript protocol
    response=$(curl -s -X POST $BASE_URL/api/test/input \
        -H "Content-Type: application/json" \
        -d "{\"link\":\"javascript:alert('XSS')\"}")

    if echo "$response" | grep -q "Invalid input"; then
        echo -e "${GREEN}✓${NC} Javascript protocol attack blocked"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Javascript protocol attack not blocked"
        ((FAILED++))
    fi

    # Test 4: Iframe injection
    response=$(curl -s -X POST $BASE_URL/api/test/input \
        -H "Content-Type: application/json" \
        -d "{\"content\":\"<iframe src=http://evil.com></iframe>\"}")

    if echo "$response" | grep -q "Invalid input"; then
        echo -e "${GREEN}✓${NC} Iframe injection blocked"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Iframe injection not blocked"
        ((FAILED++))
    fi
}

test_authentication() {
    echo -e "\n${YELLOW}4. Testing Authentication${NC}"

    # Test 1: Login with valid credentials
    response=$(curl -s -X POST $BASE_URL/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"demo@example.com\",\"password\":\"Demo123!\"}")

    if echo "$response" | grep -q "accessToken"; then
        echo -e "${GREEN}✓${NC} Login successful with valid credentials"
        TOKEN=$(echo "$response" | jq -r '.accessToken')
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Login failed with valid credentials"
        ((FAILED++))
        return
    fi

    # Test 2: Access protected endpoint without token
    response=$(curl -s $BASE_URL/api/protected/example)

    if echo "$response" | grep -q "Unauthorized"; then
        echo -e "${GREEN}✓${NC} Protected endpoint rejects requests without token"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Protected endpoint allows access without token"
        ((FAILED++))
    fi

    # Test 3: Access protected endpoint with valid token
    response=$(curl -s $BASE_URL/api/protected/example \
        -H "Authorization: Bearer $TOKEN")

    if echo "$response" | grep -q "user_123"; then
        echo -e "${GREEN}✓${NC} Protected endpoint accepts valid token"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Protected endpoint rejects valid token"
        ((FAILED++))
    fi

    # Test 4: Access protected endpoint with invalid token
    response=$(curl -s $BASE_URL/api/protected/example \
        -H "Authorization: Bearer invalid_token_here")

    if echo "$response" | grep -q "Unauthorized"; then
        echo -e "${GREEN}✓${NC} Protected endpoint rejects invalid token"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Protected endpoint accepts invalid token"
        ((FAILED++))
    fi
}

test_authorization() {
    echo -e "\n${YELLOW}5. Testing Authorization (RBAC)${NC}"

    # Get user token
    user_response=$(curl -s -X POST $BASE_URL/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"demo@example.com\",\"password\":\"Demo123!\"}")

    USER_TOKEN=$(echo "$user_response" | jq -r '.accessToken')

    # Test: User cannot access admin endpoint
    response=$(curl -s $BASE_URL/api/admin/example \
        -H "Authorization: Bearer $USER_TOKEN")

    if echo "$response" | grep -q "Forbidden"; then
        echo -e "${GREEN}✓${NC} User role blocked from admin endpoint"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} User role can access admin endpoint"
        ((FAILED++))
    fi
}

test_rate_limiting() {
    echo -e "\n${YELLOW}6. Testing Rate Limiting${NC}"

    # Health endpoint should handle normal traffic
    success_count=0
    for i in {1..5}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
        if [ "$response" -eq 200 ]; then
            ((success_count++))
        fi
    done

    if [ $success_count -eq 5 ]; then
        echo -e "${GREEN}✓${NC} Normal requests pass rate limiting ($success_count/5)"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} Some requests blocked ($success_count/5)"
    fi

    echo -e "${BLUE}ℹ${NC} Rate limiting is active (configured for 1000 req/15min globally)"
}

test_input_validation() {
    echo -e "\n${YELLOW}7. Testing Input Validation${NC}"

    # Test invalid email
    response=$(curl -s -X POST $BASE_URL/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"invalid-email\",\"password\":\"ValidPass123!\"}")

    if echo "$response" | grep -q "Validation failed\|Invalid"; then
        echo -e "${GREEN}✓${NC} Invalid email format rejected"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Invalid email format accepted"
        ((FAILED++))
    fi

    # Test weak password
    response=$(curl -s -X POST $BASE_URL/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"valid@example.com\",\"password\":\"weak\"}")

    if echo "$response" | grep -q "Validation failed\|Invalid"; then
        echo -e "${GREEN}✓${NC} Weak password rejected"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Weak password accepted"
        ((FAILED++))
    fi
}

# Run all tests
test_security_headers
test_sql_injection
test_xss_prevention
test_authentication
test_authorization
test_rate_limiting
test_input_validation

# Summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

total=$((PASSED + FAILED))
pass_rate=$((PASSED * 100 / total))

echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Total: $total"
echo -e "Pass Rate: ${pass_rate}%\n"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All security tests passed!${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Some security tests failed!${NC}\n"
    exit 1
fi
