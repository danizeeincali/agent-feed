# SPARC Specification: Complete Schema Validation System

**Project**: 4-Layer Defense System for Component Schema Validation
**Version**: 1.0.0
**Date**: 2025-10-05
**Status**: Specification Complete

---

## Executive Summary

This specification defines a comprehensive 4-layer defense system to prevent component schema validation errors in the dynamic page building system. The system ensures that all pages created by the page-builder-agent conform to strict schema requirements, preventing runtime errors and improving system reliability.

### System Goals

1. **Zero Schema Validation Errors**: Prevent all component schema validation errors before deployment
2. **Proactive Validation**: Catch errors at creation time, not runtime
3. **Developer Guidance**: Provide clear, actionable error messages and examples
4. **Automated Testing**: Continuous validation through E2E testing
5. **Self-Healing**: Automated feedback and correction loops

---

## PHASE 1: SPECIFICATION

### 1.1 Requirements Analysis

#### Functional Requirements

**FR-001: Schema Documentation System**
- **Priority**: P0 (Critical)
- **Description**: Create comprehensive documentation of all component schemas
- **Acceptance Criteria**:
  - All 27+ component schemas documented with examples
  - Required fields, optional fields, and enum values clearly specified
  - Common mistakes and validation rules documented
  - Both correct and incorrect examples provided
  - Searchable and well-organized format

**FR-002: API Validation Endpoint**
- **Priority**: P0 (Critical)
- **Description**: Create server-side validation endpoint for pre-creation validation
- **Acceptance Criteria**:
  - POST `/api/validate-components` endpoint accepts component JSON
  - Validates against Zod schemas with detailed error reporting
  - Returns validation results with field-level error paths
  - Supports batch validation of multiple components
  - Response time < 100ms for single component validation
  - Integration with page-builder-agent workflow

**FR-003: Dynamic Page Testing Agent**
- **Priority**: P1 (High)
- **Description**: Automated Playwright-based testing agent for E2E validation
- **Acceptance Criteria**:
  - Agent definition at `/workspaces/agent-feed/prod/.claude/agents/dynamic-page-testing-agent.md`
  - Playwright E2E tests for all component types
  - Automated validation error detection in rendered pages
  - Screenshot capture for debugging validation failures
  - Feedback loop to page-builder-agent with corrections
  - Test reports with actionable insights

**FR-004: Page-Builder Integration**
- **Priority**: P0 (Critical)
- **Description**: Update page-builder-agent with validation knowledge
- **Acceptance Criteria**:
  - Schema validation integrated into page creation workflow
  - Pre-creation validation checklist enforced
  - Validation helper functions available
  - API validation usage documented
  - Error recovery procedures defined

#### Non-Functional Requirements

**NFR-001: Performance**
- **Category**: Performance
- **Description**: Validation must not significantly impact page creation time
- **Measurement**:
  - API validation endpoint: < 100ms per component
  - E2E test suite: < 5 minutes full run
  - Validation overhead: < 5% of total page creation time

**NFR-002: Reliability**
- **Category**: Reliability
- **Description**: Validation system must be highly reliable
- **Measurement**:
  - 99.9% uptime for validation endpoint
  - Zero false positives in schema validation
  - < 0.1% false negatives in validation

**NFR-003: Usability**
- **Category**: Usability
- **Description**: Error messages must be clear and actionable
- **Measurement**:
  - Error messages include field path, expected type, and received value
  - Examples provided for common errors
  - Average time to fix validation error: < 2 minutes

**NFR-004: Maintainability**
- **Category**: Maintainability
- **Description**: System must be easy to extend with new components
- **Measurement**:
  - Time to add new component schema: < 30 minutes
  - Documentation auto-generated from schemas where possible
  - Single source of truth for schema definitions

### 1.2 Constraint Analysis

#### Technical Constraints

**TC-001: Existing Zod Schemas**
- **Constraint**: Must use existing Zod schemas in `/workspaces/agent-feed/frontend/src/schemas/componentSchemas.ts`
- **Impact**: Documentation and validation must align with current schema definitions
- **Mitigation**: Extract schema definitions programmatically to ensure consistency

**TC-002: API Server Architecture**
- **Constraint**: Validation endpoint must integrate with existing Express.js server at `/workspaces/agent-feed/api-server/server.js`
- **Impact**: Must follow existing route patterns and middleware structure
- **Mitigation**: Use established route mounting patterns and middleware

**TC-003: Playwright Test Infrastructure**
- **Constraint**: Must use existing Playwright configuration at `/workspaces/agent-feed/frontend/playwright.config.ts`
- **Impact**: Test agent must follow existing test patterns
- **Mitigation**: Extend existing test utilities and helpers

**TC-004: Production Environment**
- **Constraint**: All agent operations must occur within `/workspaces/agent-feed/prod/agent_workspace/`
- **Impact**: Testing agent workspace restricted to production directories
- **Mitigation**: Create dedicated workspace at `/prod/agent_workspace/dynamic-page-testing-agent/`

#### Business Constraints

**BC-001: Zero Breaking Changes**
- **Constraint**: Cannot break existing page creation functionality
- **Impact**: Validation must be additive, not disruptive
- **Mitigation**: Implement validation as opt-in initially, then enforce

**BC-002: Developer Experience**
- **Constraint**: Must improve, not hinder, page-builder-agent productivity
- **Impact**: Validation overhead must be minimal
- **Mitigation**: Fast validation API, clear error messages, automated fixes

**BC-003: Time to Market**
- **Constraint**: Full system implementation within 2 weeks
- **Impact**: Phased rollout required
- **Mitigation**: Prioritize P0 requirements, defer P2+ items

#### Regulatory Constraints

**RC-001: Schema Compliance**
- **Constraint**: All components must conform to documented schemas
- **Impact**: No exceptions allowed for production pages
- **Mitigation**: Validation endpoint as gatekeeper before database storage

### 1.3 Use Case Definitions

#### UC-001: Page-Builder Creates Valid Page

**Actor**: page-builder-agent
**Preconditions**:
- Agent has page creation request
- Component schemas documented
- Validation endpoint available

**Flow**:
1. Agent receives page creation request from user/agent
2. Agent reads COMPONENT_SCHEMAS.md documentation
3. Agent constructs page JSON with components
4. Agent calls POST `/api/validate-components` with JSON
5. Validation endpoint checks all components against Zod schemas
6. Validation returns success with validated components
7. Agent creates page file in `/data/agent-pages/`
8. Agent registers page in database via API
9. Agent verifies page accessibility
10. Agent reports success to requester

**Postconditions**:
- Valid page created and accessible
- Zero validation errors
- Page rendered correctly in frontend

**Exceptions**:
- **Invalid schema**: Validation endpoint returns detailed errors
- **Missing required field**: Error specifies field name and expected type
- **Invalid enum value**: Error lists valid enum options
- **Type mismatch**: Error shows expected vs. received type

**Success Metrics**:
- 100% of pages validated before creation
- 0% validation errors in production

---

#### UC-002: Validation Endpoint Detects Schema Error

**Actor**: API Server
**Preconditions**:
- Validation endpoint implemented
- Zod schemas loaded
- Component JSON received via POST request

**Flow**:
1. Validation endpoint receives POST request with component JSON
2. Endpoint parses JSON and extracts components array
3. For each component:
   - Extract component type
   - Lookup corresponding Zod schema
   - Validate component props against schema
   - Collect validation errors if any
4. Aggregate all validation results
5. Return response with detailed error information
6. Log validation request and results

**Postconditions**:
- Validation results returned within 100ms
- Detailed error paths provided for each invalid component
- Suggestions for fixes included in response

**Exceptions**:
- **Unknown component type**: Return warning with list of valid types
- **Malformed JSON**: Return 400 error with parsing details
- **Schema not found**: Log error, continue validation for other components

**Example Response**:
```json
{
  "valid": false,
  "errors": [
    {
      "componentIndex": 0,
      "componentType": "header",
      "field": "title",
      "message": "Required field 'title' is missing",
      "expected": "string (min length 1)",
      "received": "undefined"
    },
    {
      "componentIndex": 2,
      "componentType": "Badge",
      "field": "variant",
      "message": "Invalid enum value",
      "expected": "One of: default, destructive, secondary, outline",
      "received": "invalid-variant"
    }
  ],
  "warnings": [],
  "suggestions": [
    "For header component: Add 'title' property with non-empty string",
    "For Badge component: Change 'variant' to one of the allowed values"
  ]
}
```

---

#### UC-003: Testing Agent Validates Rendered Pages

**Actor**: dynamic-page-testing-agent
**Preconditions**:
- Page created and registered in database
- Playwright test suite configured
- Test agent has access to frontend URL

**Flow**:
1. Testing agent receives notification of new page creation
2. Agent constructs test URL: `/agents/{agentId}/pages/{pageId}`
3. Agent launches Playwright browser
4. Agent navigates to page URL
5. Agent waits for page to render
6. Agent checks for ValidationError components in DOM
7. If validation errors found:
   - Capture screenshot of error state
   - Extract error details from ValidationError component
   - Generate correction suggestions
   - Send feedback to page-builder-agent
8. If no errors:
   - Verify all components rendered
   - Check component accessibility
   - Validate responsive behavior
9. Agent generates test report
10. Agent saves report to `/prod/agent_workspace/dynamic-page-testing-agent/reports/`

**Postconditions**:
- Page validated for schema compliance
- Errors detected and reported
- Test report available for review
- Feedback provided to page-builder if errors found

**Exceptions**:
- **Page not found**: Report 404 error to page-builder
- **Rendering timeout**: Capture screenshot, report performance issue
- **Network error**: Retry with exponential backoff, report if persistent

**Test Cases**:
```typescript
// Example test case structure
describe('Page Schema Validation', () => {
  test('should not render ValidationError components', async ({ page }) => {
    await page.goto('/agents/test-agent/pages/test-page');
    const validationErrors = await page.locator('[data-testid="validation-error"]').count();
    expect(validationErrors).toBe(0);
  });

  test('should render all expected components', async ({ page }) => {
    await page.goto('/agents/test-agent/pages/test-page');
    await expect(page.locator('[data-component-type="header"]')).toBeVisible();
    await expect(page.locator('[data-component-type="stat"]')).toBeVisible();
  });
});
```

---

#### UC-004: Page-Builder Receives Validation Feedback

**Actor**: page-builder-agent
**Preconditions**:
- Page created with validation errors
- Testing agent detected errors
- Feedback message generated

**Flow**:
1. Page-builder receives feedback from testing agent
2. Agent parses error details and suggestions
3. Agent reads original page specification
4. Agent identifies components with errors
5. Agent applies suggested corrections:
   - Add missing required fields
   - Fix invalid enum values
   - Correct type mismatches
6. Agent validates corrected JSON via API endpoint
7. If validation passes:
   - Update page file with corrections
   - Trigger page re-registration in database
   - Notify testing agent for re-validation
8. If validation still fails:
   - Log error for manual review
   - Notify system administrator

**Postconditions**:
- Page corrected and re-validated
- Validation errors resolved
- Self-healing loop completed

**Exceptions**:
- **Auto-correction fails**: Escalate to manual review
- **Infinite correction loop**: Break after 3 attempts, escalate
- **API validation unavailable**: Queue correction for retry

**Feedback Format**:
```json
{
  "pageId": "test-page-123",
  "agentId": "test-agent",
  "errors": [
    {
      "component": "header",
      "field": "title",
      "issue": "Required field missing",
      "correction": {
        "action": "add_field",
        "field": "title",
        "value": "Default Title"
      }
    }
  ],
  "correctedSpec": { /* corrected page JSON */ }
}
```

---

### 1.4 Success Metrics

#### Primary Metrics

**M-001: Schema Validation Error Rate**
- **Metric**: Percentage of pages with schema validation errors
- **Target**: 0%
- **Measurement**: Count of ValidationError components rendered / Total pages created
- **Frequency**: Real-time monitoring

**M-002: Validation Coverage**
- **Metric**: Percentage of components validated before creation
- **Target**: 100%
- **Measurement**: API validation calls / Page creation requests
- **Frequency**: Daily aggregation

**M-003: Auto-Correction Success Rate**
- **Metric**: Percentage of validation errors auto-corrected
- **Target**: > 80%
- **Measurement**: Successful auto-corrections / Total validation errors
- **Frequency**: Weekly reporting

#### Secondary Metrics

**M-004: Validation Performance**
- **Metric**: Average API validation response time
- **Target**: < 100ms
- **Measurement**: P50, P95, P99 latency metrics
- **Frequency**: Continuous monitoring

**M-005: Test Coverage**
- **Metric**: Percentage of component types with E2E tests
- **Target**: 100%
- **Measurement**: Tested component types / Total component types
- **Frequency**: Monthly review

**M-006: Developer Productivity Impact**
- **Metric**: Time to create valid page (before vs. after validation system)
- **Target**: < 5% increase
- **Measurement**: Average page creation time tracking
- **Frequency**: Monthly survey

---

## PHASE 2: PSEUDOCODE

### 2.1 API Validation Algorithm

```pseudocode
FUNCTION validateComponents(componentsJSON):
    // Parse and extract components
    TRY:
        components = parseJSON(componentsJSON)
    CATCH parseError:
        RETURN {
            valid: false,
            error: "Invalid JSON format",
            details: parseError.message
        }

    // Initialize validation results
    results = {
        valid: true,
        errors: [],
        warnings: [],
        validatedComponents: []
    }

    // Validate each component
    FOR EACH component IN components WITH index:
        componentType = component.type
        componentProps = component.props OR {}

        // Check if schema exists
        schema = ComponentSchemas[componentType]
        IF schema IS NULL:
            results.warnings.push({
                componentIndex: index,
                componentType: componentType,
                message: "Unknown component type, skipping validation"
            })
            CONTINUE

        // Validate props against schema
        TRY:
            validatedProps = schema.parse(componentProps)
            results.validatedComponents.push({
                type: componentType,
                props: validatedProps,
                children: component.children OR []
            })
        CATCH validationError:
            results.valid = false

            // Extract detailed error information
            FOR EACH error IN validationError.errors:
                results.errors.push({
                    componentIndex: index,
                    componentType: componentType,
                    field: error.path.join('.'),
                    message: error.message,
                    code: error.code,
                    expected: formatExpectedType(error),
                    received: formatReceivedValue(error)
                })

    // Generate suggestions for fixes
    IF results.valid IS false:
        results.suggestions = generateFixSuggestions(results.errors)

    // Log validation request
    logValidationRequest({
        timestamp: NOW(),
        componentCount: components.length,
        valid: results.valid,
        errorCount: results.errors.length
    })

    RETURN results
END FUNCTION

FUNCTION generateFixSuggestions(errors):
    suggestions = []

    FOR EACH error IN errors:
        SWITCH error.code:
            CASE "invalid_type":
                suggestion = "Change '" + error.field + "' to type " + error.expected
            CASE "too_small":
                suggestion = "Ensure '" + error.field + "' has minimum length " + error.minimum
            CASE "invalid_enum_value":
                suggestion = "Change '" + error.field + "' to one of: " + error.expected
            DEFAULT:
                suggestion = "Fix '" + error.field + "': " + error.message

        suggestions.push(suggestion)

    RETURN suggestions
END FUNCTION
```

---

### 2.2 Component Validation Logic

```pseudocode
FUNCTION validateSingleComponent(component):
    // Extract component data
    type = component.type
    props = component.props OR {}
    children = component.children OR []

    // Lookup schema
    schema = ComponentSchemas[type]
    IF schema IS NULL:
        RETURN {
            valid: true,
            warning: "No schema found for " + type,
            component: component
        }

    // Validate props
    TRY:
        validatedProps = schema.parse(props)

        // Recursively validate children
        validatedChildren = []
        FOR EACH child IN children:
            childResult = validateSingleComponent(child)
            IF childResult.valid IS false:
                THROW childResult.errors
            validatedChildren.push(childResult.component)

        RETURN {
            valid: true,
            component: {
                type: type,
                props: validatedProps,
                children: validatedChildren
            }
        }

    CATCH validationError:
        RETURN {
            valid: false,
            errors: formatValidationErrors(validationError, type),
            component: component
        }
END FUNCTION

FUNCTION formatValidationErrors(zodError, componentType):
    formattedErrors = []

    FOR EACH issue IN zodError.errors:
        formattedErrors.push({
            component: componentType,
            path: issue.path.join('.'),
            message: issue.message,
            expected: extractExpectedType(issue),
            received: extractReceivedValue(issue),
            suggestion: generateSuggestion(issue)
        })

    RETURN formattedErrors
END FUNCTION
```

---

### 2.3 Playwright Test Generation

```pseudocode
FUNCTION generatePlaywrightTest(pageId, agentId, components):
    testName = "Validate " + pageId + " schema compliance"
    testUrl = "/agents/" + agentId + "/pages/" + pageId

    testCode = `
    describe('${testName}', () => {
        test('should not render validation errors', async ({ page }) => {
            await page.goto('${testUrl}');
            await page.waitForLoadState('networkidle');

            // Check for validation error components
            const validationErrors = await page.locator('[data-testid="validation-error"]').count();
            expect(validationErrors).toBe(0);
        });

        test('should render all expected components', async ({ page }) => {
            await page.goto('${testUrl}');
    `

    // Generate component-specific tests
    FOR EACH component IN components:
        testCode += `
            // Validate ${component.type} component
            const ${component.type}Element = await page.locator('[data-component-type="${component.type}"]');
            await expect(${component.type}Element).toBeVisible();
        `

        // Add prop-specific assertions
        FOR EACH prop IN component.props:
            IF prop.isRequired:
                testCode += `
            await expect(${component.type}Element).toHaveAttribute('data-${prop.name}', '${prop.value}');
                `

    testCode += `
        });
    });
    `

    RETURN testCode
END FUNCTION

FUNCTION runPlaywrightTests(testFiles):
    results = {
        total: testFiles.length,
        passed: 0,
        failed: 0,
        errors: []
    }

    FOR EACH testFile IN testFiles:
        TRY:
            testResult = executePlaywrightTest(testFile)

            IF testResult.success:
                results.passed += 1
            ELSE:
                results.failed += 1
                results.errors.push({
                    testFile: testFile,
                    errors: testResult.errors,
                    screenshot: testResult.screenshot
                })

        CATCH executionError:
            results.failed += 1
            results.errors.push({
                testFile: testFile,
                error: executionError.message
            })

    RETURN results
END FUNCTION
```

---

### 2.4 Error Reporting Flow

```pseudocode
FUNCTION reportValidationError(error):
    // Create structured error report
    report = {
        timestamp: NOW(),
        errorType: "schema_validation",
        component: error.component,
        field: error.field,
        message: error.message,
        expected: error.expected,
        received: error.received,
        pageContext: {
            pageId: error.pageId,
            agentId: error.agentId,
            createdAt: error.createdAt
        },
        screenshot: error.screenshot,
        suggestions: error.suggestions
    }

    // Save error report
    saveErrorReport(report, "/prod/agent_workspace/dynamic-page-testing-agent/errors/")

    // Send feedback to page-builder-agent
    feedback = {
        pageId: error.pageId,
        errors: [error],
        correctionRequired: true,
        suggestedFixes: error.suggestions
    }

    sendFeedbackToPageBuilder(feedback)

    // Log error for monitoring
    logError({
        severity: "warning",
        category: "schema_validation",
        message: "Schema validation error detected",
        details: report
    })

    RETURN report
END FUNCTION

FUNCTION sendFeedbackToPageBuilder(feedback):
    // Construct feedback message
    message = {
        recipient: "page-builder-agent",
        type: "validation_feedback",
        payload: feedback,
        timestamp: NOW()
    }

    // Send via inter-agent communication channel
    TRY:
        response = sendMessage(message)
        IF response.acknowledged:
            logInfo("Feedback sent successfully to page-builder-agent")
        ELSE:
            logWarning("Feedback not acknowledged by page-builder-agent")

    CATCH communicationError:
        // Fallback: Save feedback to shared location
        saveFeedback(feedback, "/prod/agent_workspace/shared/feedback/")
        logError("Failed to send feedback, saved to shared location")
END FUNCTION
```

---

## PHASE 3: ARCHITECTURE

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEMA VALIDATION SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   User/Agent     │
                    │    Request       │
                    └────────┬─────────┘
                             │
                             ▼
            ┌────────────────────────────────┐
            │    PAGE-BUILDER-AGENT          │
            │  ┌──────────────────────────┐  │
            │  │ 1. Read Schema Docs      │  │
            │  │ 2. Construct Page JSON   │  │
            │  │ 3. Call Validation API   │  │
            │  │ 4. Create Page File      │  │
            │  │ 5. Register in DB        │  │
            │  └──────────────────────────┘  │
            └────────┬───────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌───────────┐  ┌─────────┐  ┌────────────┐
│  LAYER 1  │  │ LAYER 2 │  │  LAYER 3   │
│  Schema   │  │   API   │  │  Testing   │
│   Docs    │  │Validate │  │   Agent    │
└─────┬─────┘  └────┬────┘  └─────┬──────┘
      │             │              │
      │             │              │
      ▼             ▼              ▼
┌──────────────────────────────────────┐
│         COMPONENT SCHEMAS            │
│  (Zod Schema Definitions)            │
│  /frontend/src/schemas/              │
│  - componentSchemas.ts               │
│  - templateSchemas.ts                │
└──────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────┐
│       DYNAMIC PAGE RENDERER          │
│  (Runtime Schema Validation)         │
│  /frontend/src/components/           │
│  - DynamicPageRenderer.tsx           │
│  - ValidationError.tsx               │
└──────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  LAYER 4       │
            │  Feedback      │
            │  & Correction  │
            └────────┬───────┘
                     │
                     ▼
            ┌────────────────┐
            │   Auto-Heal    │
            │   & Report     │
            └────────────────┘
```

### 3.2 Data Flow

#### Flow 1: Page Creation with Validation

```
┌─────────────┐
│ User Request│
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│ PAGE-BUILDER-AGENT                   │
│                                      │
│ 1. Read COMPONENT_SCHEMAS.md         │
│    └─> Schema documentation          │
│                                      │
│ 2. Construct page JSON               │
│    └─> Based on request + schemas    │
│                                      │
│ 3. Validate via API                  │
│    POST /api/validate-components     │
│    Body: { components: [...] }       │
└──────────────┬───────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ VALIDATION ENDPOINT  │
    │                      │
    │ • Parse JSON         │
    │ • Load Zod schemas   │
    │ • Validate each comp │
    │ • Aggregate errors   │
    └──────────┬───────────┘
               │
         ┌─────┴─────┐
         │           │
    ┌────▼────┐ ┌───▼────┐
    │ SUCCESS │ │ ERRORS │
    └────┬────┘ └───┬────┘
         │          │
         │          └─────────────┐
         │                        │
         ▼                        ▼
┌────────────────┐      ┌─────────────────┐
│ Create Page    │      │ Return Errors   │
│ • Save file    │      │ • Field paths   │
│ • Register DB  │      │ • Suggestions   │
│ • Verify       │      │ • Examples      │
└────────┬───────┘      └─────────┬───────┘
         │                        │
         │                        │
         ▼                        ▼
┌────────────────┐      ┌─────────────────┐
│ Notify Testing │      │ Fix & Retry     │
│ Agent          │      │                 │
└────────────────┘      └─────────────────┘
```

#### Flow 2: E2E Testing and Feedback

```
┌──────────────────────┐
│ Page Created Event   │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│ DYNAMIC-PAGE-TESTING-AGENT         │
│                                    │
│ 1. Receive page creation event     │
│    └─> pageId, agentId, components │
│                                    │
│ 2. Generate Playwright test        │
│    └─> Component-specific tests    │
│                                    │
│ 3. Execute test suite              │
│    └─> Launch browser, navigate    │
└────────────┬───────────────────────┘
             │
             ▼
    ┌────────────────────┐
    │ Page Loads         │
    │ • Wait for render  │
    │ • Check for errors │
    └────────┬───────────┘
             │
       ┌─────┴─────┐
       │           │
  ┌────▼────┐ ┌───▼──────────┐
  │ PASS    │ │ VALIDATION   │
  │         │ │ ERRORS FOUND │
  └────┬────┘ └───┬──────────┘
       │          │
       │          ▼
       │    ┌──────────────────┐
       │    │ • Capture screenshot
       │    │ • Extract error details
       │    │ • Generate corrections
       │    └───┬──────────────┘
       │        │
       │        ▼
       │    ┌──────────────────┐
       │    │ Send Feedback to │
       │    │ Page-Builder     │
       │    └───┬──────────────┘
       │        │
       ▼        ▼
┌────────────────────────────┐
│ Generate Test Report       │
│ • Results summary          │
│ • Screenshots              │
│ • Error details            │
│ • Recommendations          │
└────────────────────────────┘
```

### 3.3 Integration Points

#### Integration Point 1: Schema Documentation → Page-Builder

**Location**: `/workspaces/agent-feed/COMPONENT_SCHEMAS.md`
**Type**: File-based documentation
**Access Pattern**: Read-only by page-builder-agent
**Update Frequency**: On schema changes

**Contract**:
```markdown
# Component: header

## Schema
- title: string (required, min length 1)
- level: number (optional, 1-6, default: 1)
- subtitle: string (optional)

## Example (Correct)
{
  "type": "header",
  "props": {
    "title": "Welcome",
    "level": 1,
    "subtitle": "Getting started"
  }
}

## Common Mistakes
- Missing title field → Add title property
- Level > 6 → Use values 1-6 only
```

---

#### Integration Point 2: Page-Builder → Validation API

**Endpoint**: `POST /api/validate-components`
**Location**: `/workspaces/agent-feed/api-server/routes/validate-components.js`
**Protocol**: HTTP REST API
**Authentication**: None (internal service)

**Request Contract**:
```typescript
interface ValidationRequest {
  components: Array<{
    type: string;
    props: Record<string, any>;
    children?: ComponentConfig[];
  }>;
}
```

**Response Contract**:
```typescript
interface ValidationResponse {
  valid: boolean;
  errors: Array<{
    componentIndex: number;
    componentType: string;
    field: string;
    message: string;
    code: string;
    expected: string;
    received: string;
  }>;
  warnings: Array<{
    componentIndex: number;
    componentType: string;
    message: string;
  }>;
  suggestions: string[];
  validatedComponents?: ComponentConfig[];
}
```

---

#### Integration Point 3: Testing Agent → Frontend

**Protocol**: Playwright E2E testing
**Base URL**: `http://localhost:5173`
**Test Pattern**: `/agents/{agentId}/pages/{pageId}`

**Test Interface**:
```typescript
interface PageTestConfig {
  agentId: string;
  pageId: string;
  expectedComponents: string[];
  validationRules: ValidationRule[];
}

interface ValidationRule {
  selector: string;
  assertion: 'visible' | 'not-exist' | 'has-text' | 'has-attribute';
  value?: string;
}
```

---

#### Integration Point 4: Testing Agent → Page-Builder (Feedback Loop)

**Location**: `/prod/agent_workspace/shared/feedback/`
**Type**: File-based message queue
**Format**: JSON

**Feedback Contract**:
```typescript
interface ValidationFeedback {
  pageId: string;
  agentId: string;
  timestamp: string;
  errors: Array<{
    component: string;
    field: string;
    issue: string;
    correction: {
      action: 'add_field' | 'change_value' | 'remove_field';
      field: string;
      value?: any;
    };
  }>;
  correctedSpec?: PageSpecification;
  screenshot?: string; // Base64 encoded
}
```

### 3.4 Error Handling Strategy

#### Error Categories

**Category 1: Schema Validation Errors**
- **Examples**: Missing required field, invalid type, wrong enum value
- **Detection**: API validation endpoint, runtime renderer
- **Handling**: Return detailed error with correction suggestions
- **Recovery**: Auto-correct if possible, otherwise escalate to manual review

**Category 2: API Errors**
- **Examples**: Network timeout, server error, malformed request
- **Detection**: HTTP error codes, timeout detection
- **Handling**: Retry with exponential backoff (3 attempts max)
- **Recovery**: Fall back to basic validation, log error for investigation

**Category 3: Test Execution Errors**
- **Examples**: Browser crash, navigation timeout, element not found
- **Detection**: Playwright error handlers
- **Handling**: Capture diagnostic information, retry test once
- **Recovery**: Mark test as inconclusive, notify administrator

**Category 4: Auto-Correction Errors**
- **Examples**: Correction generates new errors, correction loop detected
- **Detection**: Validation after correction, loop counter
- **Handling**: Break after 3 correction attempts
- **Recovery**: Escalate to manual review with full error history

#### Error Recovery Patterns

**Pattern 1: Immediate Retry**
- **Trigger**: Transient network errors, timeouts
- **Strategy**: Retry immediately up to 3 times
- **Backoff**: None (immediate)
- **Example**: API validation timeout → retry validation call

**Pattern 2: Exponential Backoff**
- **Trigger**: Server errors (500-series)
- **Strategy**: Retry with increasing delays
- **Backoff**: 1s, 2s, 4s
- **Example**: Validation endpoint unavailable → wait and retry

**Pattern 3: Circuit Breaker**
- **Trigger**: Repeated failures (> 5 in 1 minute)
- **Strategy**: Stop sending requests for 60 seconds
- **Recovery**: Auto-resume after cooldown period
- **Example**: Validation API consistently failing → pause requests

**Pattern 4: Graceful Degradation**
- **Trigger**: Critical service unavailable
- **Strategy**: Continue with reduced functionality
- **Fallback**: Basic validation only, log warning
- **Example**: API validation unavailable → skip pre-validation, rely on runtime validation

---

## PHASE 4: REFINEMENT

### 4.1 Edge Cases

#### Edge Case 1: Nested Component Validation

**Scenario**: Component contains deeply nested children with validation errors
**Challenge**: Error reporting must include full path to nested component
**Solution**:
```typescript
// Recursive validation with path tracking
function validateWithPath(component: ComponentConfig, path: string[]): ValidationResult {
  const currentPath = [...path, component.type];
  const schema = ComponentSchemas[component.type];

  try {
    const validatedProps = schema.parse(component.props);
    const validatedChildren = component.children?.map((child, index) =>
      validateWithPath(child, [...currentPath, `children[${index}]`])
    );

    return { valid: true, path: currentPath, component: { ...component, props: validatedProps } };
  } catch (error) {
    return {
      valid: false,
      path: currentPath,
      errors: error.errors.map(e => ({ ...e, path: [...currentPath, ...e.path] }))
    };
  }
}
```

**Test Case**:
```typescript
test('validates nested component errors with full path', async () => {
  const nestedComponent = {
    type: 'Card',
    props: { title: 'Parent' },
    children: [
      {
        type: 'Grid',
        props: { cols: 3 },
        children: [
          {
            type: 'Badge',
            props: { variant: 'invalid' } // ERROR
          }
        ]
      }
    ]
  };

  const result = await validateComponents([nestedComponent]);
  expect(result.valid).toBe(false);
  expect(result.errors[0].path).toEqual(['Card', 'children[0]', 'Grid', 'children[0]', 'Badge', 'variant']);
});
```

---

#### Edge Case 2: Schema Evolution

**Scenario**: Component schema changes, old pages become invalid
**Challenge**: Maintain backward compatibility while enforcing new requirements
**Solution**:
```typescript
// Schema versioning with migration
const BadgeSchemaV1 = z.object({
  variant: z.enum(['default', 'destructive']),
  children: z.string()
});

const BadgeSchemaV2 = z.object({
  variant: z.enum(['default', 'destructive', 'secondary', 'outline']),
  children: z.string()
});

function getSchemaVersion(component: ComponentConfig): number {
  return component.schemaVersion || 1;
}

function validateWithVersion(component: ComponentConfig): ValidationResult {
  const version = getSchemaVersion(component);
  const schema = version === 1 ? BadgeSchemaV1 : BadgeSchemaV2;

  try {
    const validated = schema.parse(component.props);
    return { valid: true, component: { ...component, props: validated } };
  } catch (error) {
    return {
      valid: false,
      errors: error.errors,
      migration: version < 2 ? generateMigration(component, version, 2) : null
    };
  }
}
```

**Test Case**:
```typescript
test('validates old schema version and suggests migration', async () => {
  const oldBadge = {
    type: 'Badge',
    schemaVersion: 1,
    props: { variant: 'default', children: 'Test' }
  };

  const result = await validateWithVersion(oldBadge);
  expect(result.valid).toBe(true);
  expect(result.migration).toBeNull(); // Valid in V1

  const newVariant = { ...oldBadge, props: { variant: 'secondary', children: 'Test' } };
  const result2 = await validateWithVersion(newVariant);
  expect(result2.valid).toBe(false); // Invalid in V1
  expect(result2.migration).toBeDefined(); // Migration suggested
});
```

---

#### Edge Case 3: Circular Component References

**Scenario**: Component tree contains circular references (parent → child → parent)
**Challenge**: Infinite recursion during validation
**Solution**:
```typescript
// Reference tracking to detect cycles
function validateWithCycleDetection(
  component: ComponentConfig,
  visited: Set<string> = new Set()
): ValidationResult {
  const componentId = generateComponentId(component);

  if (visited.has(componentId)) {
    return {
      valid: false,
      errors: [{
        message: 'Circular reference detected',
        path: [component.type],
        code: 'circular_reference'
      }]
    };
  }

  visited.add(componentId);

  // Validate component and children
  const result = validateComponent(component);
  if (component.children) {
    result.children = component.children.map(child =>
      validateWithCycleDetection(child, new Set(visited))
    );
  }

  return result;
}

function generateComponentId(component: ComponentConfig): string {
  // Generate unique ID based on component structure
  return `${component.type}-${JSON.stringify(component.props)}`;
}
```

**Test Case**:
```typescript
test('detects circular component references', async () => {
  const parent = { type: 'Card', props: { title: 'Parent' }, children: [] };
  const child = { type: 'Card', props: { title: 'Child' }, children: [parent] };
  parent.children = [child]; // Create circular reference

  const result = await validateWithCycleDetection(parent);
  expect(result.valid).toBe(false);
  expect(result.errors[0].code).toBe('circular_reference');
});
```

---

#### Edge Case 4: Large Component Trees

**Scenario**: Page contains hundreds of components, validation is slow
**Challenge**: Maintain < 100ms validation time
**Solution**:
```typescript
// Parallel validation with worker threads
import { Worker } from 'worker_threads';

async function validateComponentsParallel(components: ComponentConfig[]): Promise<ValidationResult> {
  const chunkSize = 50; // Validate 50 components per worker
  const chunks = chunkArray(components, chunkSize);

  const workers = chunks.map(chunk => {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./validation-worker.js');
      worker.postMessage({ components: chunk });
      worker.on('message', resolve);
      worker.on('error', reject);
    });
  });

  const results = await Promise.all(workers);

  return {
    valid: results.every(r => r.valid),
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
    validatedComponents: results.flatMap(r => r.validatedComponents)
  };
}
```

**Performance Test**:
```typescript
test('validates 1000 components in < 500ms', async () => {
  const components = Array.from({ length: 1000 }, (_, i) => ({
    type: 'Badge',
    props: { variant: 'default', children: `Badge ${i}` }
  }));

  const startTime = Date.now();
  const result = await validateComponentsParallel(components);
  const duration = Date.now() - startTime;

  expect(result.valid).toBe(true);
  expect(duration).toBeLessThan(500);
});
```

---

### 4.2 Performance Optimization

#### Optimization 1: Schema Caching

**Problem**: Loading Zod schemas on every validation call is expensive
**Solution**: Cache compiled schemas in memory with LRU eviction

```typescript
import LRU from 'lru-cache';

const schemaCache = new LRU<string, z.ZodSchema>({
  max: 100, // Cache up to 100 schemas
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true
});

function getSchema(componentType: string): z.ZodSchema | null {
  const cached = schemaCache.get(componentType);
  if (cached) return cached;

  const schema = ComponentSchemas[componentType];
  if (schema) {
    schemaCache.set(componentType, schema);
  }

  return schema || null;
}
```

---

#### Optimization 2: Batch Validation

**Problem**: Validating components one-by-one has high overhead
**Solution**: Batch multiple validation requests into single API call

```typescript
interface BatchValidationRequest {
  batches: Array<{
    id: string;
    components: ComponentConfig[];
  }>;
}

interface BatchValidationResponse {
  results: Array<{
    id: string;
    valid: boolean;
    errors: ValidationError[];
  }>;
}

// Batch validation endpoint
app.post('/api/validate-components/batch', async (req, res) => {
  const { batches } = req.body as BatchValidationRequest;

  const results = await Promise.all(
    batches.map(async batch => ({
      id: batch.id,
      ...(await validateComponents(batch.components))
    }))
  );

  res.json({ results });
});
```

---

#### Optimization 3: Incremental Validation

**Problem**: Re-validating entire page on small changes is wasteful
**Solution**: Validate only changed components

```typescript
interface IncrementalValidationRequest {
  previousComponents: ComponentConfig[];
  updatedComponents: ComponentConfig[];
}

function getChangedComponents(
  previous: ComponentConfig[],
  updated: ComponentConfig[]
): ComponentConfig[] {
  const changed: ComponentConfig[] = [];

  for (let i = 0; i < updated.length; i++) {
    const prev = previous[i];
    const curr = updated[i];

    if (!prev || !isEqual(prev, curr)) {
      changed.push(curr);
    }
  }

  return changed;
}

async function validateIncremental(request: IncrementalValidationRequest): Promise<ValidationResult> {
  const changed = getChangedComponents(request.previousComponents, request.updatedComponents);

  if (changed.length === 0) {
    return { valid: true, errors: [], warnings: [] };
  }

  return validateComponents(changed);
}
```

---

#### Optimization 4: Validation Result Caching

**Problem**: Same component configurations validated repeatedly
**Solution**: Cache validation results by component hash

```typescript
import { createHash } from 'crypto';

const validationResultCache = new LRU<string, ValidationResult>({
  max: 1000,
  ttl: 1000 * 60 * 5 // 5 minute TTL
});

function getComponentHash(component: ComponentConfig): string {
  const json = JSON.stringify(component, Object.keys(component).sort());
  return createHash('sha256').update(json).digest('hex');
}

async function validateWithCache(component: ComponentConfig): Promise<ValidationResult> {
  const hash = getComponentHash(component);
  const cached = validationResultCache.get(hash);

  if (cached) {
    return { ...cached, cached: true };
  }

  const result = await validateComponent(component);
  validationResultCache.set(hash, result);

  return result;
}
```

---

### 4.3 Error Message Clarity

#### Enhancement 1: Contextual Error Messages

**Before**:
```
Validation error: Expected string, received number
```

**After**:
```
Validation error in 'header' component at field 'title':
  Expected: string (min length 1)
  Received: 123 (number)

  Suggestion: Change 'title' from number to string
  Example: { "title": "My Header" }
```

**Implementation**:
```typescript
function formatError(error: ZodIssue, componentType: string): FormattedError {
  return {
    component: componentType,
    field: error.path.join('.'),
    message: `Validation error in '${componentType}' component at field '${error.path.join('.')}'`,
    details: {
      expected: formatExpectedType(error.expected),
      received: `${error.received} (${typeof error.received})`,
      code: error.code
    },
    suggestion: generateSuggestion(error, componentType),
    example: getComponentExample(componentType)
  };
}
```

---

#### Enhancement 2: Multi-Language Error Messages

**Support**: English (primary), Spanish, French
**Implementation**:
```typescript
const errorMessages = {
  en: {
    required_field: "Required field '{field}' is missing",
    invalid_type: "Expected {expected}, received {received}",
    invalid_enum: "'{value}' is not a valid option. Choose from: {options}"
  },
  es: {
    required_field: "Falta el campo requerido '{field}'",
    invalid_type: "Se esperaba {expected}, se recibió {received}",
    invalid_enum: "'{value}' no es una opción válida. Elija entre: {options}"
  }
};

function translateError(error: ValidationError, locale: string = 'en'): string {
  const template = errorMessages[locale][error.code];
  return template.replace(/{(\w+)}/g, (_, key) => error[key]);
}
```

---

#### Enhancement 3: Visual Error Rendering

**Terminal Output**:
```
╔════════════════════════════════════════════════════════════╗
║  VALIDATION ERROR                                          ║
╠════════════════════════════════════════════════════════════╣
║  Component: header                                         ║
║  Field:     props.title                                    ║
║  Error:     Required field missing                         ║
║                                                            ║
║  Expected:  string (min length 1)                          ║
║  Received:  undefined                                      ║
║                                                            ║
║  Suggestion:                                               ║
║  Add the 'title' property with a non-empty string value   ║
║                                                            ║
║  Example:                                                  ║
║  {                                                         ║
║    "type": "header",                                       ║
║    "props": {                                              ║
║      "title": "Welcome to My Page",                        ║
║      "level": 1                                            ║
║    }                                                       ║
║  }                                                         ║
╚════════════════════════════════════════════════════════════╝
```

---

### 4.4 Documentation Completeness

#### Component Schema Documentation Template

```markdown
# Component: {ComponentName}

## Overview
Brief description of the component and its purpose.

## Schema Definition

### Required Fields
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| field1 | string | Field description | min length: 1 |
| field2 | number | Field description | min: 1, max: 6 |

### Optional Fields
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| field3 | string | null | Optional field description |

### Enum Fields
| Field | Type | Valid Values | Description |
|-------|------|--------------|-------------|
| variant | string | 'default', 'destructive', 'secondary', 'outline' | Component variant |

## Examples

### Correct Usage
\```json
{
  "type": "ComponentName",
  "props": {
    "field1": "value",
    "field2": 1,
    "variant": "default"
  }
}
\```

### Common Mistakes

#### Missing Required Field
❌ **Incorrect**:
\```json
{
  "type": "ComponentName",
  "props": {
    "field2": 1
  }
}
\```

✅ **Correct**:
\```json
{
  "type": "ComponentName",
  "props": {
    "field1": "value",
    "field2": 1
  }
}
\```

**Error**: Required field 'field1' is missing
**Fix**: Add the 'field1' property with a non-empty string

## Validation Rules

1. **Rule 1**: Description of validation rule
2. **Rule 2**: Description of validation rule

## Visual Examples

[Screenshot of rendered component]

## Related Components
- RelatedComponent1
- RelatedComponent2

## Change Log
- v1.1.0: Added 'field3' optional field
- v1.0.0: Initial schema definition
```

---

## PHASE 5: COMPLETION

### 5.1 Implementation Checklist

#### Layer 1: Schema Documentation

- [ ] **Create COMPONENT_SCHEMAS.md** at `/workspaces/agent-feed/COMPONENT_SCHEMAS.md`
  - [ ] Document all 27+ component schemas
  - [ ] Include required fields, optional fields, enum values
  - [ ] Provide correct and incorrect examples for each component
  - [ ] Add validation rules and common mistakes
  - [ ] Create table of contents for easy navigation
  - [ ] Add search-friendly section headers

- [ ] **Auto-Generate Documentation**
  - [ ] Create script to extract schemas from `componentSchemas.ts`
  - [ ] Generate markdown documentation programmatically
  - [ ] Ensure documentation stays in sync with schemas
  - [ ] Location: `/workspaces/agent-feed/scripts/generate-schema-docs.js`

- [ ] **Update Page-Builder Agent**
  - [ ] Add reference to COMPONENT_SCHEMAS.md in agent instructions
  - [ ] Include schema reading step in page creation workflow
  - [ ] Update examples to reference schema documentation

---

#### Layer 2: API Validation Endpoint

- [ ] **Create Validation Route**
  - [ ] Create `/workspaces/agent-feed/api-server/routes/validate-components.js`
  - [ ] Implement POST `/api/validate-components` endpoint
  - [ ] Import Zod schemas from frontend
  - [ ] Implement validation logic with detailed error reporting

- [ ] **Request/Response Handling**
  - [ ] Parse incoming JSON components
  - [ ] Validate against Zod schemas
  - [ ] Generate detailed error messages with field paths
  - [ ] Return suggestions for common errors
  - [ ] Handle batch validation requests

- [ ] **Error Handling**
  - [ ] Handle malformed JSON gracefully
  - [ ] Provide helpful error messages
  - [ ] Log validation requests for monitoring
  - [ ] Implement rate limiting to prevent abuse

- [ ] **Integration**
  - [ ] Mount route in `api-server/server.js`
  - [ ] Test endpoint with curl/Postman
  - [ ] Create integration tests
  - [ ] Document API contract

- [ ] **Performance Optimization**
  - [ ] Implement schema caching
  - [ ] Add validation result caching
  - [ ] Monitor response times
  - [ ] Ensure < 100ms response time for single component

---

#### Layer 3: Dynamic Page Testing Agent

- [ ] **Create Agent Definition**
  - [ ] Create `/workspaces/agent-feed/prod/.claude/agents/dynamic-page-testing-agent.md`
  - [ ] Define agent purpose and responsibilities
  - [ ] Document agent workspace: `/prod/agent_workspace/dynamic-page-testing-agent/`
  - [ ] Specify tools: Bash, Read, Write, Grep, Glob

- [ ] **Playwright Test Suite**
  - [ ] Create test directory: `/prod/agent_workspace/dynamic-page-testing-agent/tests/`
  - [ ] Implement base test template for page validation
  - [ ] Create tests for each component type
  - [ ] Add validation error detection tests
  - [ ] Implement screenshot capture on errors

- [ ] **Test Generation**
  - [ ] Create function to generate Playwright tests from page spec
  - [ ] Include component-specific assertions
  - [ ] Add accessibility checks (WCAG 2.1 AA)
  - [ ] Test responsive behavior (mobile, tablet, desktop)

- [ ] **Error Detection**
  - [ ] Check for ValidationError components in DOM
  - [ ] Extract error details from rendered errors
  - [ ] Capture screenshots for debugging
  - [ ] Generate error reports

- [ ] **Feedback Loop**
  - [ ] Implement feedback message generation
  - [ ] Send feedback to page-builder-agent
  - [ ] Include correction suggestions
  - [ ] Provide corrected component specs

- [ ] **Test Execution**
  - [ ] Create test runner script
  - [ ] Implement test scheduling (run on page creation)
  - [ ] Generate test reports
  - [ ] Store reports in agent workspace

---

#### Layer 4: Automated Feedback and Correction

- [ ] **Feedback System**
  - [ ] Create feedback message format
  - [ ] Implement inter-agent communication
  - [ ] Create shared feedback directory: `/prod/agent_workspace/shared/feedback/`
  - [ ] Implement feedback queue for page-builder

- [ ] **Auto-Correction Logic**
  - [ ] Implement correction suggestion generator
  - [ ] Create auto-fix algorithms for common errors
  - [ ] Add missing required fields with sensible defaults
  - [ ] Fix invalid enum values to closest valid option
  - [ ] Correct type mismatches where possible

- [ ] **Correction Loop**
  - [ ] Page-builder reads feedback messages
  - [ ] Apply corrections to page spec
  - [ ] Re-validate via API endpoint
  - [ ] Update page file if validation passes
  - [ ] Re-trigger testing agent for verification

- [ ] **Loop Prevention**
  - [ ] Implement correction attempt counter
  - [ ] Break after 3 failed correction attempts
  - [ ] Escalate to manual review if auto-correction fails
  - [ ] Log correction history for debugging

---

### 5.2 Testing Requirements

#### Unit Tests

**Test Suite 1: API Validation Endpoint**
- [ ] Test valid component validation
- [ ] Test missing required field detection
- [ ] Test invalid type detection
- [ ] Test invalid enum value detection
- [ ] Test nested component validation
- [ ] Test batch validation
- [ ] Test error message formatting
- [ ] Test suggestion generation
- [ ] Test performance (< 100ms for single component)
- [ ] Test rate limiting

**Test Suite 2: Schema Validation Logic**
- [ ] Test each component schema individually
- [ ] Test required field validation
- [ ] Test optional field defaults
- [ ] Test enum value validation
- [ ] Test type coercion where applicable
- [ ] Test custom validation rules
- [ ] Test error path generation

**Test Suite 3: Auto-Correction Logic**
- [ ] Test missing field auto-correction
- [ ] Test invalid enum auto-correction
- [ ] Test type mismatch auto-correction
- [ ] Test correction loop detection
- [ ] Test correction history tracking

---

#### Integration Tests

**Test Suite 4: End-to-End Page Creation**
- [ ] Test complete page creation workflow
- [ ] Test validation API integration
- [ ] Test database registration
- [ ] Test page accessibility verification
- [ ] Test error handling and recovery

**Test Suite 5: Testing Agent Integration**
- [ ] Test page creation event detection
- [ ] Test Playwright test generation
- [ ] Test test execution
- [ ] Test error detection
- [ ] Test feedback generation
- [ ] Test feedback delivery to page-builder

**Test Suite 6: Feedback Loop Integration**
- [ ] Test feedback message format
- [ ] Test page-builder feedback processing
- [ ] Test correction application
- [ ] Test re-validation after correction
- [ ] Test page update after successful correction

---

#### E2E Tests (Playwright)

**Test Suite 7: Component Rendering Validation**
- [ ] Test all 27+ component types render without errors
- [ ] Test ValidationError component is not present
- [ ] Test component accessibility (WCAG 2.1 AA)
- [ ] Test responsive behavior (mobile, tablet, desktop)
- [ ] Test component interactions (buttons, forms, tabs)

**Test Suite 8: Schema Error Detection**
- [ ] Test page with missing required field renders ValidationError
- [ ] Test page with invalid enum value renders ValidationError
- [ ] Test page with type mismatch renders ValidationError
- [ ] Test error message clarity and actionability
- [ ] Test screenshot capture on validation errors

**Test Suite 9: Auto-Correction Verification**
- [ ] Create page with known errors
- [ ] Verify testing agent detects errors
- [ ] Verify feedback sent to page-builder
- [ ] Verify corrections applied
- [ ] Verify corrected page renders without errors

---

### 5.3 Deployment Steps

#### Phase 1: Schema Documentation (Week 1, Days 1-2)

**Day 1**:
1. Create `COMPONENT_SCHEMAS.md` skeleton
2. Document first 10 component schemas (header, stat, todoList, dataTable, list, form, tabs, timeline, Card, Grid)
3. Add correct and incorrect examples for each
4. Create script to auto-generate documentation from Zod schemas
5. Review and validate documentation accuracy

**Day 2**:
1. Document remaining 17+ component schemas
2. Add validation rules and common mistakes sections
3. Create table of contents and navigation
4. Add visual examples (screenshots)
5. Update page-builder-agent instructions to reference documentation
6. Deploy documentation to production

**Validation**:
- [ ] All component schemas documented
- [ ] Examples verified against actual schemas
- [ ] Page-builder-agent can read and understand documentation

---

#### Phase 2: API Validation Endpoint (Week 1, Days 3-4)

**Day 3**:
1. Create `api-server/routes/validate-components.js`
2. Implement validation logic with Zod schemas
3. Add error formatting and suggestion generation
4. Create unit tests for validation endpoint
5. Test endpoint with curl/Postman

**Day 4**:
1. Implement schema caching for performance
2. Add batch validation support
3. Create integration tests
4. Mount route in `api-server/server.js`
5. Deploy to development environment
6. Performance testing and optimization
7. Deploy to production

**Validation**:
- [ ] Endpoint responds in < 100ms
- [ ] All component types validated correctly
- [ ] Error messages are clear and actionable
- [ ] Integration tests passing

---

#### Phase 3: Testing Agent (Week 2, Days 1-3)

**Day 1**:
1. Create `dynamic-page-testing-agent.md` definition
2. Set up agent workspace directory structure
3. Create base Playwright test template
4. Implement test generation from page spec
5. Add component-specific test cases

**Day 2**:
1. Implement validation error detection logic
2. Add screenshot capture on errors
3. Create feedback message generation
4. Implement inter-agent communication
5. Create test execution runner

**Day 3**:
1. Integration testing with existing pages
2. Test feedback delivery to page-builder
3. Verify test reports are generated correctly
4. Deploy testing agent to production
5. Schedule automated test runs

**Validation**:
- [ ] Agent can detect validation errors in rendered pages
- [ ] Screenshots captured on errors
- [ ] Feedback delivered to page-builder
- [ ] Test reports generated and stored

---

#### Phase 4: Automated Feedback and Correction (Week 2, Days 4-5)

**Day 4**:
1. Implement feedback processing in page-builder-agent
2. Create auto-correction algorithms
3. Add correction attempt tracking
4. Implement loop prevention logic
5. Create unit tests for auto-correction

**Day 5**:
1. Integration testing of full feedback loop
2. Test auto-correction with known error patterns
3. Verify correction loop prevention works
4. Deploy to production
5. Monitor initial auto-correction performance
6. Fine-tune correction algorithms based on results

**Validation**:
- [ ] Page-builder receives and processes feedback
- [ ] Auto-correction fixes common errors
- [ ] Correction loops prevented
- [ ] Escalation to manual review works

---

### 5.4 Monitoring Setup

#### Metrics to Track

**Validation Metrics**:
- Schema validation error rate (errors per page created)
- Validation API response time (P50, P95, P99)
- Validation API error rate
- Component types with highest error rates
- Common error types (missing field, invalid type, etc.)

**Testing Metrics**:
- E2E test pass rate
- E2E test execution time
- Pages tested per day
- Validation errors detected by tests
- Test coverage by component type

**Auto-Correction Metrics**:
- Auto-correction success rate
- Correction attempts per page
- Correction loop occurrences
- Manual review escalations
- Time to correction

**Performance Metrics**:
- API validation overhead (% of page creation time)
- Test execution overhead
- End-to-end page creation time
- System resource usage (CPU, memory)

#### Monitoring Tools

**Application Performance Monitoring (APM)**:
- Monitor API endpoint response times
- Track error rates and types
- Alert on performance degradation
- Dashboard for real-time metrics

**Logging**:
- Centralized logging for all validation events
- Structured logs for easy querying
- Log levels: INFO, WARN, ERROR
- Log rotation and retention policies

**Alerting**:
- Alert on validation error rate spike (> 5%)
- Alert on API response time degradation (> 200ms)
- Alert on test failure rate increase (> 10%)
- Alert on auto-correction loop detection
- Email and Slack notifications

**Dashboards**:
- Real-time validation metrics dashboard
- Component error rate breakdown
- Auto-correction performance dashboard
- System health overview

---

### 5.5 Success Criteria

#### Go-Live Criteria

**Must Have (P0)**:
- [ ] All 27+ component schemas documented in COMPONENT_SCHEMAS.md
- [ ] API validation endpoint deployed and responding < 100ms
- [ ] Page-builder-agent integrated with validation API
- [ ] Testing agent deployed and running automated tests
- [ ] Zero schema validation errors in newly created pages
- [ ] All unit tests passing (100% of test suites)
- [ ] All integration tests passing
- [ ] E2E tests passing for all component types

**Should Have (P1)**:
- [ ] Auto-correction system deployed and functional
- [ ] Auto-correction success rate > 50%
- [ ] Feedback loop operational
- [ ] Test coverage > 80% of component types
- [ ] Monitoring and alerting in place
- [ ] Performance metrics within targets

**Nice to Have (P2)**:
- [ ] Auto-correction success rate > 80%
- [ ] Multi-language error messages
- [ ] Visual error rendering in terminal
- [ ] Auto-generated documentation from schemas
- [ ] Performance optimization (caching, batching)

---

#### Post-Deployment Validation

**Week 1 Post-Deployment**:
- [ ] Monitor schema validation error rate → Target: < 1%
- [ ] Monitor API performance → Target: P95 < 100ms
- [ ] Monitor auto-correction success rate → Target: > 50%
- [ ] Review test reports for patterns
- [ ] Collect feedback from page-builder-agent operations

**Week 2 Post-Deployment**:
- [ ] Analyze error patterns and update auto-correction algorithms
- [ ] Fine-tune validation rules based on real-world usage
- [ ] Update documentation based on common mistakes
- [ ] Optimize performance based on metrics
- [ ] Prepare final deployment report

**Week 4 Post-Deployment**:
- [ ] Final validation: Zero schema validation errors in production
- [ ] Performance review: All targets met
- [ ] Coverage review: 100% of component types tested
- [ ] System stability review: No incidents or outages
- [ ] Prepare handoff documentation

---

## Appendix

### A. Component Schema Catalog

#### Complete List of Component Schemas

1. **Layout Components**
   - Card
   - Grid
   - Container
   - Stack
   - Sidebar
   - MobileStack
   - ResponsiveGrid
   - FlexWrap
   - SplitView

2. **Interactive Components**
   - Button
   - Input
   - Textarea
   - Select
   - Checkbox
   - Switch
   - Progress
   - Tabs
   - Slider
   - SearchInput
   - FileUpload

3. **Form Components**
   - FormField
   - FormGrid
   - FormSection

4. **Data Display Components**
   - Badge
   - Avatar
   - Metric
   - Stats
   - Timeline
   - Table
   - DataCard
   - AlertBox

5. **Navigation Components**
   - Breadcrumb
   - Pagination
   - Menu
   - BottomNavigation

6. **Agent Profile Components**
   - ProfileHeader
   - CapabilityGrid
   - PerformanceMetrics
   - ActivityFeed
   - ConfigPanel

7. **Legacy Components** (for backward compatibility)
   - header
   - stat
   - todoList
   - dataTable
   - list
   - form
   - tabs
   - timeline

**Total**: 50+ component schemas

---

### B. API Reference

#### POST /api/validate-components

**Endpoint**: `http://localhost:3001/api/validate-components`
**Method**: POST
**Content-Type**: application/json
**Authentication**: None (internal service)

**Request Body**:
```json
{
  "components": [
    {
      "type": "header",
      "props": {
        "title": "My Page",
        "level": 1
      },
      "children": []
    },
    {
      "type": "Badge",
      "props": {
        "variant": "default",
        "children": "New"
      }
    }
  ]
}
```

**Response (Success)**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "validatedComponents": [
    {
      "type": "header",
      "props": {
        "title": "My Page",
        "level": 1
      },
      "children": []
    },
    {
      "type": "Badge",
      "props": {
        "variant": "default",
        "children": "New"
      }
    }
  ]
}
```

**Response (Validation Errors)**:
```json
{
  "valid": false,
  "errors": [
    {
      "componentIndex": 0,
      "componentType": "header",
      "field": "title",
      "message": "Required field 'title' is missing",
      "code": "invalid_type",
      "expected": "string (min length 1)",
      "received": "undefined"
    }
  ],
  "warnings": [],
  "suggestions": [
    "Add 'title' property to header component with a non-empty string value"
  ]
}
```

**Error Codes**:
- `invalid_type`: Type mismatch (expected string, received number)
- `too_small`: Value below minimum (string length, number value)
- `too_big`: Value above maximum
- `invalid_enum_value`: Value not in allowed enum options
- `unrecognized_keys`: Extra properties not in schema
- `invalid_union`: None of the union types matched

---

### C. File Structure

```
/workspaces/agent-feed/
├── COMPONENT_SCHEMAS.md                    # Layer 1: Schema Documentation
├── api-server/
│   ├── routes/
│   │   └── validate-components.js          # Layer 2: Validation API
│   └── server.js                           # Mount validation route
├── frontend/
│   ├── src/
│   │   ├── schemas/
│   │   │   ├── componentSchemas.ts         # Source of truth for schemas
│   │   │   └── templateSchemas.ts
│   │   └── components/
│   │       ├── DynamicPageRenderer.tsx     # Runtime validation
│   │       └── ValidationError.tsx         # Error display component
│   └── tests/
│       └── e2e/
│           └── schema-validation/          # E2E validation tests
├── prod/
│   ├── .claude/
│   │   └── agents/
│   │       ├── page-builder-agent.md       # Updated with validation
│   │       └── dynamic-page-testing-agent.md # Layer 3: Testing Agent
│   └── agent_workspace/
│       ├── dynamic-page-testing-agent/     # Testing agent workspace
│       │   ├── tests/                      # Generated Playwright tests
│       │   ├── reports/                    # Test reports
│       │   └── errors/                     # Error screenshots
│       └── shared/
│           └── feedback/                   # Layer 4: Feedback messages
└── scripts/
    └── generate-schema-docs.js             # Auto-generate documentation
```

---

### D. Glossary

**Component Schema**: Zod schema definition that specifies required fields, optional fields, types, and validation rules for a component

**Validation Error**: Error that occurs when component props do not conform to the component schema

**ValidationError Component**: React component that renders when schema validation fails at runtime

**API Validation Endpoint**: Server-side endpoint that validates component JSON before page creation

**Testing Agent**: Automated agent that runs Playwright E2E tests to detect validation errors in rendered pages

**Auto-Correction**: Automated process to fix common validation errors without manual intervention

**Feedback Loop**: System where testing agent provides feedback to page-builder-agent for error correction

**Schema Evolution**: Process of updating component schemas while maintaining backward compatibility

**Validation Coverage**: Percentage of components validated before page creation

**Correction Loop**: Situation where auto-correction generates new errors, requiring loop prevention

---

### E. References

**Internal Documentation**:
- Page-Builder Agent Instructions: `/workspaces/agent-feed/prod/.claude/agents/page-builder-agent.md`
- Component Schemas: `/workspaces/agent-feed/frontend/src/schemas/componentSchemas.ts`
- Dynamic Page Renderer: `/workspaces/agent-feed/frontend/src/components/DynamicPageRenderer.tsx`
- Playwright Config: `/workspaces/agent-feed/frontend/playwright.config.ts`

**External References**:
- Zod Documentation: https://zod.dev/
- Playwright Documentation: https://playwright.dev/
- WCAG 2.1 AA Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Express.js Routing: https://expressjs.com/en/guide/routing.html

**Standards**:
- JSON Schema: https://json-schema.org/
- REST API Design: https://restfulapi.net/
- TDD Best Practices: https://martinfowler.com/bliki/TestDrivenDevelopment.html

---

## Document Control

**Version History**:
- v1.0.0 (2025-10-05): Initial SPARC specification created
- v1.0.1 (TBD): Post-review updates
- v2.0.0 (TBD): Production deployment updates

**Approvals**:
- [ ] Technical Review
- [ ] Architecture Review
- [ ] Security Review
- [ ] Product Owner Approval

**Next Steps**:
1. Review and approve specification
2. Begin Phase 1 implementation (Schema Documentation)
3. Weekly progress reviews
4. Final deployment and validation

---

**END OF SPARC SPECIFICATION**
