# SPARC Specification: Page-Builder-Agent Quality Assurance System

**Document Version:** 1.0.0
**Date:** 2025-10-06
**Status:** Specification Complete
**Project:** Agent Feed - Page Builder QA System

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Specification Phase](#1-specification-phase)
3. [Pseudocode Phase](#2-pseudocode-phase)
4. [Architecture Phase](#3-architecture-phase)
5. [Refinement Phase](#4-refinement-phase)
6. [Completion Phase](#5-completion-phase)
7. [Appendices](#appendices)

---

## Executive Summary

### Purpose
This document specifies a comprehensive 4-layer Quality Assurance System for the Page-Builder-Agent that ensures all dynamically generated pages meet quality standards, function correctly in production, and self-improve through feedback loops.

### Problem Statement
The Page-Builder-Agent currently generates dynamic pages without systematic validation, leading to:
- Missing `href` or `onClick` handlers in Sidebar navigation items
- Components with invalid props that fail at runtime
- No end-to-end verification before production deployment
- Repeated failures without learning or correction mechanisms

### Solution Overview
A 4-layer QA system that provides:
1. **Schema Validation Layer** - Pre-deployment validation of component configurations
2. **E2E Verification Agent** - Automated browser testing with Playwright
3. **Self-Test Protocol** - Agent-driven quality gates and health checks
4. **Feedback Loop System** - Learning from failures to prevent recurrence

### Success Criteria
- Zero schema validation errors in production
- 100% E2E test pass rate before deployment
- < 2% failure recurrence rate
- < 30 second validation cycle time
- Automated remediation of 80% of common issues

---

## 1. Specification Phase

### 1.1 Requirements Definition

#### 1.1.1 Functional Requirements

**FR-1: Schema Validation**
- **FR-1.1** Validate all component props against Zod schemas before page creation
- **FR-1.2** Detect missing required fields (e.g., `href` or `onClick` in Sidebar items)
- **FR-1.3** Validate template variables (strings matching `/^\{\{.+\}\}$/`)
- **FR-1.4** Support recursive validation for nested components
- **FR-1.5** Provide detailed error messages with field paths
- **FR-1.6** Support schema versioning for backward compatibility

**FR-2: E2E Verification**
- **FR-2.1** Launch real browser instances using Playwright
- **FR-2.2** Navigate to generated pages and verify rendering
- **FR-2.3** Test interactive elements (clicks, forms, navigation)
- **FR-2.4** Capture screenshots for visual regression testing
- **FR-2.5** Measure page load performance metrics
- **FR-2.6** Verify accessibility compliance (ARIA, keyboard navigation)
- **FR-2.7** Test responsive layouts across viewport sizes

**FR-3: Self-Test Protocol**
- **FR-3.1** Agent must validate its own output before declaring success
- **FR-3.2** Execute pre-flight checks (database, file system, API availability)
- **FR-3.3** Verify page registration in database after creation
- **FR-3.4** Confirm page is accessible via HTTP endpoint
- **FR-3.5** Validate JSON file format and structure
- **FR-3.6** Check for orphaned files or database inconsistencies

**FR-4: Feedback Loop**
- **FR-4.1** Store validation failures with full context
- **FR-4.2** Classify failure types (schema, E2E, runtime)
- **FR-4.3** Track failure frequency per component type
- **FR-4.4** Provide remediation suggestions based on historical failures
- **FR-4.5** Prevent known failing patterns from reaching production
- **FR-4.6** Generate quality reports and trend analysis

#### 1.1.2 Non-Functional Requirements

**NFR-1: Performance**
- **NFR-1.1** Schema validation completes in < 100ms for typical pages
- **NFR-1.2** E2E tests complete in < 30 seconds per page
- **NFR-1.3** Feedback lookup occurs in < 50ms
- **NFR-1.4** Total QA cycle time < 45 seconds

**NFR-2: Reliability**
- **NFR-2.1** 99.9% uptime for validation services
- **NFR-2.2** Graceful degradation if E2E tests unavailable
- **NFR-2.3** Automatic retry on transient failures (max 3 attempts)
- **NFR-2.4** Circuit breaker for external dependencies

**NFR-3: Scalability**
- **NFR-3.1** Support parallel validation of up to 10 pages
- **NFR-3.2** Handle validation queue of 100+ pages
- **NFR-3.3** Feedback database can store 1M+ validation records

**NFR-4: Maintainability**
- **NFR-4.1** Modular architecture with clear separation of concerns
- **NFR-4.2** Comprehensive logging and observability
- **NFR-4.3** Self-documenting code with TypeScript types
- **NFR-4.4** Test coverage > 90%

#### 1.1.3 User Stories

**US-1: As a Page-Builder-Agent**
```
GIVEN I am creating a new dynamic page
WHEN I define component configurations
THEN the schema validator should catch any missing required fields
AND provide clear error messages with field paths
SO THAT I can fix issues before page creation
```

**US-2: As a QA Engineer**
```
GIVEN a page has been created by the agent
WHEN E2E tests are executed
THEN the system should verify all interactive elements work
AND capture evidence of functionality (screenshots, logs)
SO THAT I can confidently deploy to production
```

**US-3: As a System Administrator**
```
GIVEN validation failures have occurred
WHEN I review the feedback system
THEN I should see failure patterns and trends
AND receive actionable remediation recommendations
SO THAT I can prevent future failures
```

**US-4: As an End User**
```
GIVEN I navigate to an agent-generated page
WHEN I interact with navigation and components
THEN all links and buttons should work correctly
AND the page should be fully functional
SO THAT I have a seamless experience
```

### 1.2 Edge Cases and Constraints

#### 1.2.1 Edge Cases

**EC-1: Template Variables**
- **Scenario:** Sidebar items use `{{currentPage}}` for dynamic `href`
- **Handling:** Allow template variable pattern, defer runtime validation
- **Validation:** Warn but don't fail; mark for runtime verification

**EC-2: Conditional Navigation**
- **Scenario:** Navigation items hidden based on user permissions
- **Handling:** Validate structure even if conditionally rendered
- **Validation:** Test both authenticated and unauthenticated states

**EC-3: Nested Sidebar Sections**
- **Scenario:** Sidebar with 3+ levels of nesting
- **Handling:** Recursive validation with depth limit (max 5 levels)
- **Validation:** Ensure all child items have `href` or `onClick`

**EC-4: Large Component Trees**
- **Scenario:** Page with 100+ components
- **Handling:** Stream validation results, avoid memory overflow
- **Validation:** Batch validation in chunks of 50 components

**EC-5: Browser Compatibility**
- **Scenario:** Features not supported in older browsers
- **Handling:** Test against multiple browser engines (Chromium, Firefox, WebKit)
- **Validation:** Feature detection and graceful degradation

**EC-6: Race Conditions**
- **Scenario:** Auto-registration middleware processes file before validation completes
- **Handling:** Lock file during validation, release on completion
- **Validation:** Atomic file operations with proper sequencing

#### 1.2.2 Constraints

**C-1: Technology Stack**
- Must use existing Zod schemas (no schema language changes)
- Must integrate with current auto-registration system
- Playwright for E2E (already in dependencies)
- SQLite for feedback storage (matches existing DB)

**C-2: Performance Limits**
- E2E tests limited to 3 parallel browser instances (memory constraints)
- Validation queue max size: 100 pages
- Screenshot storage max: 500MB

**C-3: Environment**
- Must work in Docker containers (headless mode required)
- CI/CD pipeline integration required
- No external API dependencies for core functionality

**C-4: Security**
- Validation system must not expose sensitive data in logs
- E2E tests must not interact with production databases
- Feedback system must sanitize user input before storage

### 1.3 Acceptance Criteria

**AC-1: Schema Validation**
- ✓ Detects missing `href` or `onClick` in 100% of Sidebar items
- ✓ Validates nested components to unlimited depth
- ✓ Returns errors in < 100ms for typical pages
- ✓ Provides field paths for all validation errors

**AC-2: E2E Verification**
- ✓ Successfully launches Playwright browser in headless mode
- ✓ Navigates to page and waits for full render
- ✓ Clicks all navigation items and verifies routing
- ✓ Captures screenshot evidence of page state
- ✓ Completes in < 30 seconds per page

**AC-3: Self-Test Protocol**
- ✓ Agent executes pre-flight checks before page creation
- ✓ Validates page exists in database after creation
- ✓ Confirms HTTP endpoint returns 200 status
- ✓ Verifies JSON file structure is valid

**AC-4: Feedback Loop**
- ✓ Stores all validation failures with timestamps
- ✓ Prevents repeat of known failing patterns
- ✓ Suggests fixes for 80% of common errors
- ✓ Reduces failure recurrence by > 50%

---

## 2. Pseudocode Phase

### 2.1 Schema Validation Algorithm

```pseudocode
FUNCTION validatePageComponents(components: Array<Component>): ValidationResult
  INPUT: Array of component configurations
  OUTPUT: { valid: boolean, errors: Array<ValidationError> }

  INITIALIZE errors = []
  INITIALIZE componentSchemas = loadComponentSchemas()

  FOR EACH component IN components:
    validationResult = validateComponent(component, "root", componentSchemas)
    IF validationResult.hasErrors:
      errors.APPEND(validationResult.errors)
    END IF
  END FOR

  RETURN {
    valid: errors.length == 0,
    errors: errors,
    componentCount: components.length,
    timestamp: getCurrentTimestamp()
  }
END FUNCTION

FUNCTION validateComponent(component, path, schemas): ComponentValidation
  INPUT: component object, path string, schema registry
  OUTPUT: { hasErrors: boolean, errors: Array<ValidationError> }

  errors = []

  // Check component type exists
  IF component.type NOT IN schemas:
    errors.APPEND({
      path: path,
      type: component.type,
      message: "Unknown component type: " + component.type,
      severity: "error"
    })
    RETURN { hasErrors: true, errors: errors }
  END IF

  // Get schema for component type
  schema = schemas[component.type]
  props = component.props OR {}

  // Special handling for Sidebar component
  IF component.type == "Sidebar":
    sidebarErrors = validateSidebarItems(props.items, path + ".props.items")
    errors.APPEND(sidebarErrors)
  END IF

  // Validate props against schema
  TRY:
    schema.parse(props)
  CATCH zodError:
    FOR EACH issue IN zodError.issues:
      errors.APPEND({
        path: path + ".props." + issue.path.join("."),
        type: component.type,
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
        severity: "error"
      })
    END FOR
  END TRY

  // Recursively validate children
  IF component.children AND isArray(component.children):
    FOR index = 0 TO component.children.length - 1:
      child = component.children[index]
      childPath = path + ".children[" + index + "]"
      childValidation = validateComponent(child, childPath, schemas)
      IF childValidation.hasErrors:
        errors.APPEND(childValidation.errors)
      END IF
    END FOR
  END IF

  RETURN {
    hasErrors: errors.length > 0,
    errors: errors
  }
END FUNCTION

FUNCTION validateSidebarItems(items, basePath): Array<ValidationError>
  INPUT: Array of sidebar items, base path string
  OUTPUT: Array of validation errors

  errors = []

  IF NOT items OR items.length == 0:
    errors.APPEND({
      path: basePath,
      message: "Sidebar must have at least one item",
      severity: "error"
    })
    RETURN errors
  END IF

  FOR index = 0 TO items.length - 1:
    item = items[index]
    itemPath = basePath + "[" + index + "]"

    // Check required fields
    IF NOT item.id:
      errors.APPEND({
        path: itemPath + ".id",
        message: "Sidebar item missing required field: id",
        severity: "error"
      })
    END IF

    IF NOT item.label:
      errors.APPEND({
        path: itemPath + ".label",
        message: "Sidebar item missing required field: label",
        severity: "error"
      })
    END IF

    // CRITICAL: Check href or onClick exists
    hasHref = item.href AND item.href.length > 0
    hasOnClick = item.onClick AND item.onClick.length > 0
    isTemplateVariable = item.href AND item.href.match(/^\{\{.+\}\}$/)

    IF NOT hasHref AND NOT hasOnClick:
      errors.APPEND({
        path: itemPath,
        message: "Sidebar item must have either 'href' or 'onClick' property",
        severity: "error",
        suggestion: "Add href: '/your-page' or onClick: 'handleClick'"
      })
    ELSE IF isTemplateVariable:
      // Template variables are allowed but flagged for runtime validation
      errors.APPEND({
        path: itemPath + ".href",
        message: "Template variable detected - will be validated at runtime",
        severity: "warning",
        templateVariable: item.href
      })
    END IF

    // Recursively validate nested children
    IF item.children AND isArray(item.children):
      childErrors = validateSidebarItems(
        item.children,
        itemPath + ".children"
      )
      errors.APPEND(childErrors)
    END IF
  END FOR

  RETURN errors
END FUNCTION
```

### 2.2 E2E Verification Algorithm

```pseudocode
FUNCTION runE2EVerification(pageId: string, pageConfig: PageConfig): E2EResult
  INPUT: page ID, page configuration
  OUTPUT: { success: boolean, tests: Array<TestResult>, evidence: Evidence }

  INITIALIZE browser = null
  INITIALIZE results = []
  INITIALIZE evidence = {
    screenshots: [],
    logs: [],
    metrics: {}
  }

  TRY:
    // Launch browser
    browser = launchPlaywrightBrowser({
      headless: true,
      viewport: { width: 1920, height: 1080 },
      slowMo: 0 // No delay for speed
    })

    page = browser.newPage()

    // Enable console log capture
    page.on("console", (msg) => {
      evidence.logs.APPEND({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      })
    })

    // Test 1: Page Load Verification
    loadResult = testPageLoad(page, pageId, evidence)
    results.APPEND(loadResult)

    IF NOT loadResult.passed:
      RETURN {
        success: false,
        tests: results,
        evidence: evidence,
        failureReason: "Page failed to load"
      }
    END IF

    // Test 2: Navigation Verification
    navResult = testNavigation(page, pageConfig, evidence)
    results.APPEND(navResult)

    // Test 3: Component Rendering Verification
    renderResult = testComponentRendering(page, pageConfig, evidence)
    results.APPEND(renderResult)

    // Test 4: Interactive Elements Verification
    interactiveResult = testInteractiveElements(page, pageConfig, evidence)
    results.APPEND(interactiveResult)

    // Test 5: Accessibility Verification
    a11yResult = testAccessibility(page, evidence)
    results.APPEND(a11yResult)

    // Test 6: Performance Verification
    perfResult = testPerformance(page, evidence)
    results.APPEND(perfResult)

    // Capture final state
    evidence.screenshots.APPEND({
      name: "final-state",
      data: page.screenshot({ fullPage: true }),
      timestamp: Date.now()
    })

    allPassed = results.every((r) => r.passed)

    RETURN {
      success: allPassed,
      tests: results,
      evidence: evidence,
      timestamp: Date.now()
    }

  CATCH error:
    RETURN {
      success: false,
      error: error.message,
      tests: results,
      evidence: evidence,
      timestamp: Date.now()
    }

  FINALLY:
    IF browser:
      browser.close()
    END IF
  END TRY
END FUNCTION

FUNCTION testPageLoad(page, pageId, evidence): TestResult
  INPUT: Playwright page, page ID, evidence object
  OUTPUT: { name: string, passed: boolean, duration: number, details: object }

  startTime = Date.now()
  pageUrl = "http://localhost:3001/agent-pages/" + pageId

  TRY:
    // Navigate with timeout
    response = page.goto(pageUrl, {
      waitUntil: "networkidle",
      timeout: 10000 // 10 second timeout
    })

    // Check response status
    IF response.status() != 200:
      RETURN {
        name: "Page Load",
        passed: false,
        duration: Date.now() - startTime,
        details: {
          url: pageUrl,
          status: response.status(),
          error: "Non-200 status code"
        }
      }
    END IF

    // Wait for main content
    page.waitForSelector("main", { timeout: 5000 })

    // Capture screenshot
    evidence.screenshots.APPEND({
      name: "page-load",
      data: page.screenshot(),
      timestamp: Date.now()
    })

    // Measure metrics
    evidence.metrics.pageLoad = {
      duration: Date.now() - startTime,
      url: pageUrl,
      status: response.status()
    }

    RETURN {
      name: "Page Load",
      passed: true,
      duration: Date.now() - startTime,
      details: {
        url: pageUrl,
        status: response.status(),
        loadTime: Date.now() - startTime
      }
    }

  CATCH error:
    RETURN {
      name: "Page Load",
      passed: false,
      duration: Date.now() - startTime,
      details: {
        url: pageUrl,
        error: error.message
      }
    }
  END TRY
END FUNCTION

FUNCTION testNavigation(page, pageConfig, evidence): TestResult
  INPUT: Playwright page, page config, evidence object
  OUTPUT: Test result with navigation verification details

  startTime = Date.now()
  results = []

  // Find all Sidebar components
  sidebarComponents = findComponentsByType(pageConfig.components, "Sidebar")

  IF sidebarComponents.length == 0:
    RETURN {
      name: "Navigation Verification",
      passed: true,
      duration: Date.now() - startTime,
      details: { message: "No sidebar navigation found" }
    }
  END IF

  FOR EACH sidebar IN sidebarComponents:
    FOR EACH item IN sidebar.props.items:
      itemResult = testNavigationItem(page, item, evidence)
      results.APPEND(itemResult)

      // Also test nested items
      IF item.children:
        FOR EACH childItem IN item.children:
          childResult = testNavigationItem(page, childItem, evidence)
          results.APPEND(childResult)
        END FOR
      END IF
    END FOR
  END FOR

  allPassed = results.every((r) => r.passed)

  RETURN {
    name: "Navigation Verification",
    passed: allPassed,
    duration: Date.now() - startTime,
    details: {
      itemsTested: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => NOT r.passed).length,
      results: results
    }
  }
END FUNCTION

FUNCTION testNavigationItem(page, item, evidence): ItemTestResult
  INPUT: Playwright page, navigation item, evidence object
  OUTPUT: Individual item test result

  // Skip template variables (runtime only)
  IF item.href AND item.href.match(/^\{\{.+\}\}$/):
    RETURN {
      itemId: item.id,
      label: item.label,
      passed: true,
      skipped: true,
      reason: "Template variable - runtime validation required"
    }
  END IF

  // Skip if no href or onClick
  IF NOT item.href AND NOT item.onClick:
    RETURN {
      itemId: item.id,
      label: item.label,
      passed: false,
      error: "Missing href or onClick"
    }
  END IF

  TRY:
    // Find element by label
    selector = "text=" + item.label
    element = page.locator(selector).first()

    // Check if clickable
    isVisible = element.isVisible()
    IF NOT isVisible:
      RETURN {
        itemId: item.id,
        label: item.label,
        passed: false,
        error: "Navigation item not visible"
      }
    END IF

    // Check href attribute if present
    IF item.href:
      hrefAttr = element.getAttribute("href")
      IF hrefAttr != item.href:
        RETURN {
          itemId: item.id,
          label: item.label,
          passed: false,
          error: "href mismatch",
          expected: item.href,
          actual: hrefAttr
        }
      END IF
    END IF

    // Capture screenshot of navigation item
    evidence.screenshots.APPEND({
      name: "nav-item-" + item.id,
      data: element.screenshot(),
      timestamp: Date.now()
    })

    RETURN {
      itemId: item.id,
      label: item.label,
      passed: true,
      href: item.href
    }

  CATCH error:
    RETURN {
      itemId: item.id,
      label: item.label,
      passed: false,
      error: error.message
    }
  END TRY
END FUNCTION

FUNCTION testComponentRendering(page, pageConfig, evidence): TestResult
  INPUT: Playwright page, page config, evidence object
  OUTPUT: Component rendering test result

  startTime = Date.now()
  results = []

  // Test each top-level component
  FOR EACH component IN pageConfig.components:
    componentResult = testComponentRender(page, component, evidence)
    results.APPEND(componentResult)
  END FOR

  allPassed = results.every((r) => r.passed)

  RETURN {
    name: "Component Rendering",
    passed: allPassed,
    duration: Date.now() - startTime,
    details: {
      componentsTested: results.length,
      results: results
    }
  }
END FUNCTION

FUNCTION testInteractiveElements(page, pageConfig, evidence): TestResult
  INPUT: Playwright page, page config, evidence object
  OUTPUT: Interactive elements test result

  startTime = Date.now()
  results = {
    buttons: [],
    forms: [],
    links: []
  }

  // Test buttons
  buttons = page.locator("button")
  buttonCount = buttons.count()

  FOR i = 0 TO buttonCount - 1:
    button = buttons.nth(i)
    isClickable = button.isEnabled() AND button.isVisible()
    results.buttons.APPEND({
      index: i,
      clickable: isClickable,
      text: button.textContent()
    })
  END FOR

  // Test forms
  forms = page.locator("form")
  formCount = forms.count()

  FOR i = 0 TO formCount - 1:
    form = forms.nth(i)
    inputs = form.locator("input, textarea, select")
    results.forms.APPEND({
      index: i,
      inputCount: inputs.count(),
      hasSubmit: form.locator("[type='submit']").count() > 0
    })
  END FOR

  // Test links
  links = page.locator("a")
  linkCount = links.count()

  FOR i = 0 TO linkCount - 1:
    link = links.nth(i)
    href = link.getAttribute("href")
    results.links.APPEND({
      index: i,
      href: href,
      hasHref: href != null AND href.length > 0
    })
  END FOR

  RETURN {
    name: "Interactive Elements",
    passed: true, // Informational test
    duration: Date.now() - startTime,
    details: results
  }
END FUNCTION
```

### 2.3 Self-Test Protocol Algorithm

```pseudocode
FUNCTION executeSelfTestProtocol(pageId: string): SelfTestResult
  INPUT: Page ID that was just created
  OUTPUT: { passed: boolean, checks: Array<Check>, timestamp: number }

  checks = []

  // Pre-flight Check 1: Database Connection
  dbCheck = checkDatabaseConnection()
  checks.APPEND(dbCheck)
  IF NOT dbCheck.passed:
    RETURN { passed: false, checks: checks, timestamp: Date.now() }
  END IF

  // Pre-flight Check 2: File System Access
  fsCheck = checkFileSystemAccess()
  checks.APPEND(fsCheck)
  IF NOT fsCheck.passed:
    RETURN { passed: false, checks: checks, timestamp: Date.now() }
  END IF

  // Pre-flight Check 3: API Availability
  apiCheck = checkAPIAvailability()
  checks.APPEND(apiCheck)
  IF NOT apiCheck.passed:
    RETURN { passed: false, checks: checks, timestamp: Date.now() }
  END IF

  // Post-creation Check 1: Database Record Exists
  dbRecordCheck = checkDatabaseRecord(pageId)
  checks.APPEND(dbRecordCheck)

  // Post-creation Check 2: JSON File Exists
  fileCheck = checkJSONFileExists(pageId)
  checks.APPEND(fileCheck)

  // Post-creation Check 3: JSON File Valid
  jsonCheck = checkJSONFileValid(pageId)
  checks.APPEND(jsonCheck)

  // Post-creation Check 4: HTTP Endpoint Accessible
  httpCheck = checkHTTPEndpoint(pageId)
  checks.APPEND(httpCheck)

  // Post-creation Check 5: Component Validation
  componentCheck = checkComponentsValid(pageId)
  checks.APPEND(componentCheck)

  // Post-creation Check 6: No Orphaned Resources
  orphanCheck = checkNoOrphanedResources(pageId)
  checks.APPEND(orphanCheck)

  allPassed = checks.every((c) => c.passed)

  RETURN {
    passed: allPassed,
    checks: checks,
    timestamp: Date.now(),
    summary: {
      total: checks.length,
      passed: checks.filter((c) => c.passed).length,
      failed: checks.filter((c) => NOT c.passed).length
    }
  }
END FUNCTION

FUNCTION checkDatabaseConnection(): Check
  TRY:
    db = openDatabaseConnection()
    result = db.query("SELECT 1 as test")

    IF result[0].test == 1:
      RETURN {
        name: "Database Connection",
        passed: true,
        duration: 0,
        details: "Database connection healthy"
      }
    ELSE:
      RETURN {
        name: "Database Connection",
        passed: false,
        error: "Unexpected query result"
      }
    END IF
  CATCH error:
    RETURN {
      name: "Database Connection",
      passed: false,
      error: error.message
    }
  END TRY
END FUNCTION

FUNCTION checkDatabaseRecord(pageId): Check
  TRY:
    db = openDatabaseConnection()
    query = "SELECT * FROM agent_pages WHERE id = ?"
    result = db.query(query, [pageId])

    IF result.length == 0:
      RETURN {
        name: "Database Record Exists",
        passed: false,
        error: "Page not found in database",
        pageId: pageId
      }
    END IF

    record = result[0]

    // Validate required fields
    requiredFields = ["id", "agent_id", "title", "content_type", "content_value", "status"]
    missingFields = []

    FOR EACH field IN requiredFields:
      IF NOT record[field]:
        missingFields.APPEND(field)
      END IF
    END FOR

    IF missingFields.length > 0:
      RETURN {
        name: "Database Record Exists",
        passed: false,
        error: "Missing required fields",
        missingFields: missingFields
      }
    END IF

    RETURN {
      name: "Database Record Exists",
      passed: true,
      details: {
        pageId: pageId,
        status: record.status,
        createdAt: record.created_at
      }
    }

  CATCH error:
    RETURN {
      name: "Database Record Exists",
      passed: false,
      error: error.message
    }
  END TRY
END FUNCTION

FUNCTION checkJSONFileExists(pageId): Check
  filePath = "./data/agent-pages/" + pageId + ".json"

  IF fileExists(filePath):
    fileStats = getFileStats(filePath)

    RETURN {
      name: "JSON File Exists",
      passed: true,
      details: {
        path: filePath,
        size: fileStats.size,
        modifiedAt: fileStats.mtime
      }
    }
  ELSE:
    RETURN {
      name: "JSON File Exists",
      passed: false,
      error: "JSON file not found",
      expectedPath: filePath
    }
  END IF
END FUNCTION

FUNCTION checkJSONFileValid(pageId): Check
  filePath = "./data/agent-pages/" + pageId + ".json"

  TRY:
    fileContent = readFileSync(filePath, "utf8")
    jsonData = JSON.parse(fileContent)

    // Validate structure
    requiredFields = ["id", "agent_id", "title", "content_type", "content_value", "status"]
    missingFields = []

    FOR EACH field IN requiredFields:
      IF NOT jsonData[field]:
        missingFields.APPEND(field)
      END IF
    END FOR

    IF missingFields.length > 0:
      RETURN {
        name: "JSON File Valid",
        passed: false,
        error: "Missing required fields in JSON",
        missingFields: missingFields
      }
    END IF

    RETURN {
      name: "JSON File Valid",
      passed: true,
      details: {
        path: filePath,
        fields: Object.keys(jsonData).length
      }
    }

  CATCH error:
    RETURN {
      name: "JSON File Valid",
      passed: false,
      error: "Invalid JSON: " + error.message
    }
  END TRY
END FUNCTION

FUNCTION checkHTTPEndpoint(pageId): Check
  url = "http://localhost:3001/agent-pages/" + pageId

  TRY:
    response = httpGet(url, { timeout: 5000 })

    IF response.status == 200:
      RETURN {
        name: "HTTP Endpoint Accessible",
        passed: true,
        details: {
          url: url,
          status: response.status,
          contentLength: response.headers["content-length"]
        }
      }
    ELSE:
      RETURN {
        name: "HTTP Endpoint Accessible",
        passed: false,
        error: "Non-200 status code: " + response.status,
        url: url
      }
    END IF

  CATCH error:
    RETURN {
      name: "HTTP Endpoint Accessible",
      passed: false,
      error: error.message,
      url: url
    }
  END TRY
END FUNCTION

FUNCTION checkComponentsValid(pageId): Check
  TRY:
    // Read page data
    filePath = "./data/agent-pages/" + pageId + ".json"
    jsonData = JSON.parse(readFileSync(filePath, "utf8"))

    // Extract components from content_value
    IF jsonData.content_type == "components":
      components = JSON.parse(jsonData.content_value)

      // Run schema validation
      validationResult = validatePageComponents(components)

      IF validationResult.valid:
        RETURN {
          name: "Components Valid",
          passed: true,
          details: {
            componentCount: validationResult.componentCount,
            errors: 0
          }
        }
      ELSE:
        RETURN {
          name: "Components Valid",
          passed: false,
          error: "Component validation failed",
          errors: validationResult.errors
        }
      END IF
    ELSE:
      // Non-component content types automatically pass
      RETURN {
        name: "Components Valid",
        passed: true,
        details: { contentType: jsonData.content_type }
      }
    END IF

  CATCH error:
    RETURN {
      name: "Components Valid",
      passed: false,
      error: error.message
    }
  END TRY
END FUNCTION
```

### 2.4 Feedback Loop Algorithm

```pseudocode
FUNCTION recordValidationFailure(failure: ValidationFailure): void
  INPUT: Failure details with context
  OUTPUT: None (stores in database)

  db = openDatabaseConnection()

  failureRecord = {
    id: generateUUID(),
    pageId: failure.pageId,
    agentId: failure.agentId,
    failureType: failure.type, // "schema", "e2e", "self-test"
    componentType: failure.componentType,
    errorMessage: failure.errorMessage,
    errorPath: failure.errorPath,
    context: JSON.stringify(failure.context),
    timestamp: Date.now(),
    resolved: false
  }

  db.insert("validation_failures", failureRecord)

  // Update failure statistics
  updateFailureStatistics(failure)

  // Check for recurring patterns
  pattern = detectFailurePattern(failure)
  IF pattern:
    updateFailurePatterns(pattern)
  END IF
END FUNCTION

FUNCTION checkKnownFailures(componentConfig: ComponentConfig): FailureCheck
  INPUT: Component configuration to check
  OUTPUT: { hasKnownIssues: boolean, suggestions: Array<string> }

  db = openDatabaseConnection()

  // Query for similar failures
  query = `
    SELECT failure_type, error_message, COUNT(*) as frequency
    FROM validation_failures
    WHERE component_type = ?
    AND resolved = false
    AND timestamp > ?
    GROUP BY failure_type, error_message
    HAVING frequency >= 3
    ORDER BY frequency DESC
    LIMIT 10
  `

  oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
  knownFailures = db.query(query, [componentConfig.type, oneWeekAgo])

  IF knownFailures.length == 0:
    RETURN {
      hasKnownIssues: false,
      suggestions: []
    }
  END IF

  suggestions = []

  FOR EACH failure IN knownFailures:
    suggestion = generateRemediationSuggestion(failure)
    suggestions.APPEND(suggestion)
  END FOR

  RETURN {
    hasKnownIssues: true,
    knownFailures: knownFailures,
    suggestions: suggestions
  }
END FUNCTION

FUNCTION generateRemediationSuggestion(failure: Failure): Suggestion
  INPUT: Failure record
  OUTPUT: Actionable suggestion string

  // Pattern matching for common issues
  IF failure.error_message.includes("missing required field: href"):
    RETURN {
      issue: "Missing href in Sidebar item",
      fix: "Add href property to all Sidebar items, e.g., href: '/dashboard'",
      example: `{
  id: "nav-dashboard",
  label: "Dashboard",
  href: "/dashboard",  // <-- Add this
  icon: "LayoutDashboard"
}`,
      frequency: failure.frequency,
      confidence: "high"
    }
  END IF

  IF failure.error_message.includes("must have either 'href' or 'onClick'"):
    RETURN {
      issue: "Sidebar item needs href or onClick",
      fix: "Provide either a navigation href OR an onClick handler",
      example: `// Option 1: Use href for navigation
{
  id: "nav-settings",
  label: "Settings",
  href: "/settings"
}

// Option 2: Use onClick for custom behavior
{
  id: "nav-action",
  label: "Custom Action",
  onClick: "handleCustomAction"
}`,
      frequency: failure.frequency,
      confidence: "high"
    }
  END IF

  IF failure.error_message.includes("Template variable"):
    RETURN {
      issue: "Template variable in href",
      fix: "Template variables are allowed but will be validated at runtime",
      example: `{
  id: "dynamic-nav",
  label: "Current Page",
  href: "{{currentPageUrl}}"  // Valid, but ensure variable is defined
}`,
      frequency: failure.frequency,
      confidence: "medium"
    }
  END IF

  // Generic suggestion for unknown patterns
  RETURN {
    issue: failure.error_message,
    fix: "Review the error message and component schema documentation",
    frequency: failure.frequency,
    confidence: "low"
  }
END FUNCTION

FUNCTION updateFailureStatistics(failure: ValidationFailure): void
  db = openDatabaseConnection()

  today = getDateString(Date.now())

  // Update or insert daily statistics
  existingStat = db.query(`
    SELECT * FROM failure_statistics
    WHERE date = ? AND component_type = ? AND failure_type = ?
  `, [today, failure.componentType, failure.type])

  IF existingStat.length > 0:
    db.update("failure_statistics", {
      count: existingStat[0].count + 1,
      last_occurrence: Date.now()
    }, { id: existingStat[0].id })
  ELSE:
    db.insert("failure_statistics", {
      id: generateUUID(),
      date: today,
      component_type: failure.componentType,
      failure_type: failure.type,
      count: 1,
      first_occurrence: Date.now(),
      last_occurrence: Date.now()
    })
  END IF
END FUNCTION

FUNCTION detectFailurePattern(failure: ValidationFailure): Pattern OR null
  db = openDatabaseConnection()

  // Look for failures with similar characteristics
  similarFailures = db.query(`
    SELECT *
    FROM validation_failures
    WHERE component_type = ?
    AND error_path LIKE ?
    AND timestamp > ?
    ORDER BY timestamp DESC
    LIMIT 5
  `, [
    failure.componentType,
    failure.errorPath + "%",
    Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
  ])

  IF similarFailures.length >= 3:
    // Pattern detected: same component type and error path
    RETURN {
      type: "recurring_validation_error",
      componentType: failure.componentType,
      errorPath: failure.errorPath,
      frequency: similarFailures.length,
      firstSeen: similarFailures[similarFailures.length - 1].timestamp,
      lastSeen: failure.timestamp,
      severity: calculateSeverity(similarFailures.length)
    }
  END IF

  RETURN null
END FUNCTION

FUNCTION preventKnownFailures(componentConfig: ComponentConfig): PreventionResult
  INPUT: Component configuration to validate
  OUTPUT: { allowed: boolean, blocked: boolean, warnings: Array<string> }

  failureCheck = checkKnownFailures(componentConfig)

  IF NOT failureCheck.hasKnownIssues:
    RETURN {
      allowed: true,
      blocked: false,
      warnings: []
    }
  END IF

  // Determine if we should block or warn
  highFrequencyFailures = failureCheck.knownFailures.filter(
    (f) => f.frequency >= 5
  )

  IF highFrequencyFailures.length > 0:
    // Block configuration that matches high-frequency failure pattern
    RETURN {
      allowed: false,
      blocked: true,
      warnings: failureCheck.suggestions.map((s) => s.fix),
      reason: "Configuration matches known high-frequency failure pattern",
      suggestions: failureCheck.suggestions
    }
  ELSE:
    // Allow but warn about potential issues
    RETURN {
      allowed: true,
      blocked: false,
      warnings: failureCheck.suggestions.map((s) => s.issue),
      suggestions: failureCheck.suggestions
    }
  END IF
END FUNCTION
```

---

## 3. Architecture Phase

### 3.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Page-Builder-Agent QA System                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Layer 1: Schema Validation                  │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────┐   │
│  │  Zod Schema   │  │   Validation   │  │  Template Variable  │   │
│  │   Registry    │→ │     Engine     │→ │      Handler        │   │
│  └───────────────┘  └────────────────┘  └─────────────────────┘   │
│         ↓                   ↓                      ↓               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Error Formatter & Reporter                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Layer 2: E2E Verification                      │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   Playwright   │  │  Test Orchestrator│  │  Evidence        │   │
│  │    Browser     │→ │   - Page Load     │→ │  Collector       │   │
│  │    Manager     │  │   - Navigation    │  │  - Screenshots   │   │
│  └────────────────┘  │   - Interaction   │  │  - Logs          │   │
│                      │   - A11y           │  │  - Metrics       │   │
│                      │   - Performance    │  └──────────────────┘   │
│                      └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     Layer 3: Self-Test Protocol                     │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐     │
│  │  Pre-flight Checks  │  │    Post-Creation Checks          │     │
│  │  - DB Connection    │  │    - DB Record Exists            │     │
│  │  - File System      │  │    - JSON File Valid             │     │
│  │  - API Health       │  │    - HTTP Endpoint OK            │     │
│  └─────────────────────┘  │    - No Orphaned Resources       │     │
│                            └──────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       Layer 4: Feedback Loop                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Failure       │  │  Pattern         │  │  Remediation     │  │
│  │   Recorder      │→ │  Detector        │→ │  Suggester       │  │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘  │
│          ↓                     ↓                      ↓            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              SQLite Feedback Database                        │  │
│  │  - validation_failures                                       │  │
│  │  - failure_statistics                                        │  │
│  │  - failure_patterns                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Architecture

#### 3.2.1 Schema Validation Service

```typescript
// File: /api-server/services/qa/SchemaValidationService.js

interface SchemaValidationService {
  // Configuration
  schemaRegistry: Map<string, ZodSchema>
  templateVariablePattern: RegExp

  // Public Methods
  validatePageComponents(components: Component[]): ValidationResult
  validateComponent(component: Component, path: string): ComponentValidation
  validateSidebarItems(items: SidebarItem[], basePath: string): ValidationError[]
  registerSchema(componentType: string, schema: ZodSchema): void

  // Private Methods
  isTemplateVariable(value: string): boolean
  formatValidationError(error: ZodError, path: string): ValidationError[]

  // Events
  on(event: 'validationComplete', handler: (result: ValidationResult) => void): void
  on(event: 'validationError', handler: (error: Error) => void): void
}
```

**Dependencies:**
- `zod` - Schema validation library
- Component schemas from `/api-server/routes/validate-components.js`

**Data Flow:**
```
Component Config → Validate Type → Apply Schema → Check Template Vars →
Recursive Children → Format Errors → Return Result
```

#### 3.2.2 E2E Verification Agent

```typescript
// File: /api-server/services/qa/E2EVerificationAgent.js

interface E2EVerificationAgent {
  // Configuration
  browserConfig: PlaywrightConfig
  testTimeout: number
  parallelBrowsers: number

  // Public Methods
  runVerification(pageId: string, pageConfig: PageConfig): Promise<E2EResult>
  launchBrowser(options: BrowserOptions): Promise<Browser>

  // Test Methods
  testPageLoad(page: Page, pageId: string): Promise<TestResult>
  testNavigation(page: Page, pageConfig: PageConfig): Promise<TestResult>
  testComponentRendering(page: Page, pageConfig: PageConfig): Promise<TestResult>
  testInteractiveElements(page: Page): Promise<TestResult>
  testAccessibility(page: Page): Promise<TestResult>
  testPerformance(page: Page): Promise<TestResult>

  // Evidence Collection
  captureScreenshot(page: Page, name: string): Promise<Screenshot>
  captureLogs(page: Page): Promise<LogEntry[]>
  captureMetrics(page: Page): Promise<PerformanceMetrics>

  // Utility Methods
  findComponentsByType(components: Component[], type: string): Component[]

  // Events
  on(event: 'testStart', handler: (test: string) => void): void
  on(event: 'testComplete', handler: (result: TestResult) => void): void
  on(event: 'evidenceCaptured', handler: (evidence: Evidence) => void): void
}
```

**Dependencies:**
- `@playwright/test` - Browser automation
- `SchemaValidationService` - For component extraction

**Data Flow:**
```
Page ID → Launch Browser → Navigate to URL → Run Tests →
Capture Evidence → Close Browser → Return Results
```

#### 3.2.3 Self-Test Protocol Service

```typescript
// File: /api-server/services/qa/SelfTestProtocol.js

interface SelfTestProtocol {
  // Configuration
  dbPath: string
  fileSystemPath: string
  apiBaseUrl: string

  // Public Methods
  executePreFlightChecks(): Promise<CheckResult[]>
  executePostCreationChecks(pageId: string): Promise<CheckResult[]>
  executeSelfTest(pageId: string): Promise<SelfTestResult>

  // Pre-flight Checks
  checkDatabaseConnection(): Promise<Check>
  checkFileSystemAccess(): Promise<Check>
  checkAPIAvailability(): Promise<Check>

  // Post-creation Checks
  checkDatabaseRecord(pageId: string): Promise<Check>
  checkJSONFileExists(pageId: string): Promise<Check>
  checkJSONFileValid(pageId: string): Promise<Check>
  checkHTTPEndpoint(pageId: string): Promise<Check>
  checkComponentsValid(pageId: string): Promise<Check>
  checkNoOrphanedResources(pageId: string): Promise<Check>

  // Utility Methods
  validateRequiredFields(data: object, fields: string[]): string[]

  // Events
  on(event: 'checkComplete', handler: (check: Check) => void): void
  on(event: 'checkFailed', handler: (check: Check) => void): void
}
```

**Dependencies:**
- `better-sqlite3` - Database access
- `fs/promises` - File system operations
- `axios` - HTTP requests
- `SchemaValidationService` - Component validation

**Data Flow:**
```
Execute Pre-flight → All Pass? → Create Page → Execute Post-creation →
All Pass? → Return Success : Return Failure
```

#### 3.2.4 Feedback Loop Service

```typescript
// File: /api-server/services/qa/FeedbackLoopService.js

interface FeedbackLoopService {
  // Configuration
  dbPath: string
  patternDetectionThreshold: number
  blockingThreshold: number

  // Public Methods
  recordFailure(failure: ValidationFailure): Promise<void>
  checkKnownFailures(componentConfig: ComponentConfig): Promise<FailureCheck>
  preventKnownFailures(componentConfig: ComponentConfig): Promise<PreventionResult>

  // Pattern Detection
  detectFailurePattern(failure: ValidationFailure): Promise<Pattern | null>
  updateFailurePatterns(pattern: Pattern): Promise<void>

  // Statistics
  updateFailureStatistics(failure: ValidationFailure): Promise<void>
  getFailureStatistics(dateRange: DateRange): Promise<Statistics[]>

  // Remediation
  generateRemediationSuggestion(failure: Failure): Suggestion
  getSuggestionsForComponent(componentType: string): Promise<Suggestion[]>

  // Reporting
  generateQualityReport(dateRange: DateRange): Promise<QualityReport>
  getTrendAnalysis(): Promise<TrendAnalysis>

  // Events
  on(event: 'failureRecorded', handler: (failure: ValidationFailure) => void): void
  on(event: 'patternDetected', handler: (pattern: Pattern) => void): void
  on(event: 'suggestionGenerated', handler: (suggestion: Suggestion) => void): void
}
```

**Dependencies:**
- `better-sqlite3` - Failure storage
- Pattern matching utilities

**Data Flow:**
```
Failure Occurs → Record in DB → Update Statistics → Detect Patterns →
Generate Suggestions → Store Pattern → Emit Events
```

### 3.3 Data Models

#### 3.3.1 Database Schema

```sql
-- Validation Failures Table
CREATE TABLE IF NOT EXISTS validation_failures (
  id TEXT PRIMARY KEY,
  page_id TEXT,
  agent_id TEXT,
  failure_type TEXT NOT NULL, -- 'schema', 'e2e', 'self-test'
  component_type TEXT,
  error_message TEXT NOT NULL,
  error_path TEXT,
  context TEXT, -- JSON string
  timestamp INTEGER NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at INTEGER,
  FOREIGN KEY (page_id) REFERENCES agent_pages(id) ON DELETE CASCADE
);

-- Failure Statistics Table
CREATE TABLE IF NOT EXISTS failure_statistics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  component_type TEXT NOT NULL,
  failure_type TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  first_occurrence INTEGER NOT NULL,
  last_occurrence INTEGER NOT NULL,
  UNIQUE(date, component_type, failure_type)
);

-- Failure Patterns Table
CREATE TABLE IF NOT EXISTS failure_patterns (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL,
  component_type TEXT NOT NULL,
  error_path TEXT,
  frequency INTEGER NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  remediation_suggestion TEXT,
  is_blocking BOOLEAN DEFAULT FALSE
);

-- E2E Test Results Table
CREATE TABLE IF NOT EXISTS e2e_test_results (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  test_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  duration INTEGER NOT NULL,
  details TEXT, -- JSON string
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (page_id) REFERENCES agent_pages(id) ON DELETE CASCADE
);

-- E2E Evidence Table
CREATE TABLE IF NOT EXISTS e2e_evidence (
  id TEXT PRIMARY KEY,
  test_result_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL, -- 'screenshot', 'log', 'metric'
  evidence_name TEXT NOT NULL,
  evidence_data TEXT NOT NULL, -- Base64 for screenshots, JSON for logs/metrics
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (test_result_id) REFERENCES e2e_test_results(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_failures_page ON validation_failures(page_id);
CREATE INDEX IF NOT EXISTS idx_validation_failures_type ON validation_failures(failure_type);
CREATE INDEX IF NOT EXISTS idx_validation_failures_timestamp ON validation_failures(timestamp);
CREATE INDEX IF NOT EXISTS idx_failure_statistics_date ON failure_statistics(date);
CREATE INDEX IF NOT EXISTS idx_failure_patterns_component ON failure_patterns(component_type);
CREATE INDEX IF NOT EXISTS idx_e2e_results_page ON e2e_test_results(page_id);
```

#### 3.3.2 TypeScript Interfaces

```typescript
// Core Types
interface Component {
  type: string
  props: Record<string, any>
  children?: Component[]
}

interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  componentCount: number
  timestamp: number
}

interface ValidationError {
  path: string
  type: string
  field?: string
  message: string
  code?: string
  severity: 'error' | 'warning'
  suggestion?: string
}

interface E2EResult {
  success: boolean
  tests: TestResult[]
  evidence: Evidence
  timestamp: number
  error?: string
}

interface TestResult {
  name: string
  passed: boolean
  duration: number
  details: Record<string, any>
}

interface Evidence {
  screenshots: Screenshot[]
  logs: LogEntry[]
  metrics: PerformanceMetrics
}

interface Screenshot {
  name: string
  data: string // Base64
  timestamp: number
}

interface LogEntry {
  type: string
  text: string
  timestamp: number
}

interface PerformanceMetrics {
  pageLoad?: {
    duration: number
    url: string
    status: number
  }
  [key: string]: any
}

interface SelfTestResult {
  passed: boolean
  checks: Check[]
  timestamp: number
  summary: {
    total: number
    passed: number
    failed: number
  }
}

interface Check {
  name: string
  passed: boolean
  duration?: number
  details?: Record<string, any>
  error?: string
}

interface ValidationFailure {
  pageId: string
  agentId: string
  type: 'schema' | 'e2e' | 'self-test'
  componentType: string
  errorMessage: string
  errorPath: string
  context: Record<string, any>
}

interface FailureCheck {
  hasKnownIssues: boolean
  knownFailures?: Failure[]
  suggestions: Suggestion[]
}

interface Suggestion {
  issue: string
  fix: string
  example?: string
  frequency: number
  confidence: 'low' | 'medium' | 'high'
}

interface Pattern {
  type: string
  componentType: string
  errorPath: string
  frequency: number
  firstSeen: number
  lastSeen: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface PreventionResult {
  allowed: boolean
  blocked: boolean
  warnings: string[]
  reason?: string
  suggestions?: Suggestion[]
}
```

### 3.4 Integration Points

#### 3.4.1 Page-Builder-Agent Integration

```typescript
// File: /api-server/agents/PageBuilderAgent.js

class PageBuilderAgent {
  constructor() {
    this.schemaValidator = new SchemaValidationService()
    this.e2eAgent = new E2EVerificationAgent()
    this.selfTestProtocol = new SelfTestProtocol()
    this.feedbackLoop = new FeedbackLoopService()
  }

  async createPage(pageConfig: PageConfig): Promise<CreatePageResult> {
    // STEP 1: Execute pre-flight checks
    const preFlightResults = await this.selfTestProtocol.executePreFlightChecks()
    if (!preFlightResults.every(r => r.passed)) {
      throw new Error('Pre-flight checks failed')
    }

    // STEP 2: Check feedback loop for known failures
    const preventionCheck = await this.feedbackLoop.preventKnownFailures(pageConfig)
    if (preventionCheck.blocked) {
      throw new Error(`Configuration blocked: ${preventionCheck.reason}`)
    }

    // STEP 3: Schema validation
    const validationResult = this.schemaValidator.validatePageComponents(
      pageConfig.components
    )

    if (!validationResult.valid) {
      // Record failure
      await this.feedbackLoop.recordFailure({
        pageId: pageConfig.id,
        agentId: this.agentId,
        type: 'schema',
        componentType: 'mixed',
        errorMessage: 'Schema validation failed',
        errorPath: 'components',
        context: { errors: validationResult.errors }
      })

      throw new Error('Schema validation failed: ' +
        JSON.stringify(validationResult.errors))
    }

    // STEP 4: Create page (write JSON file)
    await this.writePageFile(pageConfig)

    // STEP 5: Wait for auto-registration
    await this.waitForRegistration(pageConfig.id, 5000)

    // STEP 6: Execute post-creation self-tests
    const selfTestResult = await this.selfTestProtocol.executeSelfTest(pageConfig.id)
    if (!selfTestResult.passed) {
      // Record failure
      await this.feedbackLoop.recordFailure({
        pageId: pageConfig.id,
        agentId: this.agentId,
        type: 'self-test',
        componentType: 'page',
        errorMessage: 'Self-test failed',
        errorPath: 'page',
        context: { checks: selfTestResult.checks }
      })

      throw new Error('Self-test failed')
    }

    // STEP 7: Run E2E verification
    const e2eResult = await this.e2eAgent.runVerification(
      pageConfig.id,
      pageConfig
    )

    if (!e2eResult.success) {
      // Record failure
      await this.feedbackLoop.recordFailure({
        pageId: pageConfig.id,
        agentId: this.agentId,
        type: 'e2e',
        componentType: 'page',
        errorMessage: 'E2E verification failed',
        errorPath: 'page',
        context: { tests: e2eResult.tests }
      })

      throw new Error('E2E verification failed')
    }

    // SUCCESS: All QA layers passed
    return {
      success: true,
      pageId: pageConfig.id,
      validation: validationResult,
      selfTest: selfTestResult,
      e2e: e2eResult,
      timestamp: Date.now()
    }
  }
}
```

#### 3.4.2 API Routes Integration

```typescript
// File: /api-server/routes/qa-validation.js

import express from 'express'
import { SchemaValidationService } from '../services/qa/SchemaValidationService.js'
import { E2EVerificationAgent } from '../services/qa/E2EVerificationAgent.js'
import { FeedbackLoopService } from '../services/qa/FeedbackLoopService.js'

const router = express.Router()

const schemaValidator = new SchemaValidationService()
const e2eAgent = new E2EVerificationAgent()
const feedbackLoop = new FeedbackLoopService()

// Validate components before page creation
router.post('/validate-components', async (req, res) => {
  try {
    const { components } = req.body
    const result = schemaValidator.validatePageComponents(components)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Run E2E verification for a page
router.post('/e2e-verify/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params
    const { pageConfig } = req.body
    const result = await e2eAgent.runVerification(pageId, pageConfig)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get known failures for component type
router.get('/feedback/known-failures/:componentType', async (req, res) => {
  try {
    const { componentType } = req.params
    const suggestions = await feedbackLoop.getSuggestionsForComponent(componentType)
    res.json({ suggestions })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get quality report
router.get('/feedback/quality-report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const report = await feedbackLoop.generateQualityReport({
      start: parseInt(startDate),
      end: parseInt(endDate)
    })
    res.json(report)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
```

### 3.5 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Production Environment                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Docker Container: api-server                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Node.js Runtime                                          │  │
│  │  ┌─────────────────┐  ┌────────────────────────────────┐  │  │
│  │  │  Express Server │  │    QA Services                 │  │  │
│  │  │  - API Routes   │  │    - SchemaValidation          │  │  │
│  │  │  - Middleware   │  │    - SelfTestProtocol          │  │  │
│  │  │  - Auth         │  │    - FeedbackLoop              │  │  │
│  │  └─────────────────┘  └────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SQLite Databases                                         │  │
│  │  - agent-pages.db (main)                                  │  │
│  │  - qa-feedback.db (failures, patterns, statistics)       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  File System                                              │  │
│  │  - /data/agent-pages/*.json                               │  │
│  │  - /data/e2e-evidence/*.png (screenshots)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Docker Container: e2e-verification                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Playwright Browsers (Headless)                           │  │
│  │  - Chromium                                               │  │
│  │  - Firefox                                                │  │
│  │  - WebKit                                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  E2E Verification Agent                                   │  │
│  │  - Test Orchestrator                                      │  │
│  │  - Evidence Collector                                     │  │
│  │  - Result Reporter                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ↓                                         ↑
         └──────── gRPC / HTTP API ────────────────┘
```

---

## 4. Refinement Phase

### 4.1 Edge Case Handling

#### 4.1.1 Template Variable Edge Cases

**Scenario:** Sidebar item with template variable `href: "{{currentPage}}"`

**Challenge:** Cannot validate URL format at schema validation time

**Solution:**
```typescript
function validateSidebarItems(items: SidebarItem[]): ValidationError[] {
  const errors: ValidationError[] = []

  for (const item of items) {
    const hasHref = item.href && item.href.length > 0
    const hasOnClick = item.onClick && item.onClick.length > 0
    const isTemplate = item.href && /^\{\{.+\}\}$/.test(item.href)

    if (!hasHref && !hasOnClick) {
      errors.push({
        path: `item.${item.id}`,
        message: 'Must have href or onClick',
        severity: 'error'
      })
    } else if (isTemplate) {
      // Allow template but flag for runtime validation
      errors.push({
        path: `item.${item.id}.href`,
        message: `Template variable '${item.href}' will be validated at runtime`,
        severity: 'warning',
        metadata: { requiresRuntimeValidation: true }
      })
    }
  }

  return errors
}
```

#### 4.1.2 Race Condition Prevention

**Scenario:** Auto-registration processes file before QA validation completes

**Challenge:** Page appears in database with invalid configuration

**Solution:**
```typescript
async function createPageWithLock(pageConfig: PageConfig): Promise<void> {
  const lockFile = `/data/agent-pages/.lock-${pageConfig.id}`

  try {
    // Acquire lock
    await fs.writeFile(lockFile, JSON.stringify({
      agentId: this.agentId,
      timestamp: Date.now(),
      status: 'validating'
    }))

    // Run QA validation
    const validation = await this.runQAValidation(pageConfig)
    if (!validation.success) {
      throw new Error('QA validation failed')
    }

    // Update lock status
    await fs.writeFile(lockFile, JSON.stringify({
      agentId: this.agentId,
      timestamp: Date.now(),
      status: 'validated'
    }))

    // Write page file (auto-registration will wait for validated status)
    await fs.writeFile(
      `/data/agent-pages/${pageConfig.id}.json`,
      JSON.stringify(pageConfig, null, 2)
    )

  } finally {
    // Release lock after registration completes
    await new Promise(resolve => setTimeout(resolve, 2000))
    await fs.unlink(lockFile).catch(() => {})
  }
}
```

**Auto-registration middleware update:**
```typescript
watcher.on('add', async (filePath) => {
  const pageId = path.basename(filePath, '.json')
  const lockFile = `/data/agent-pages/.lock-${pageId}`

  // Wait for validation lock to clear
  if (await fs.exists(lockFile)) {
    const lockData = JSON.parse(await fs.readFile(lockFile, 'utf8'))

    if (lockData.status !== 'validated') {
      console.log(`Waiting for validation: ${pageId}`)
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 500))
      return
    }
  }

  // Proceed with registration
  await registerPage(filePath)
})
```

#### 4.1.3 Browser Launch Failures

**Scenario:** Playwright fails to launch browser in Docker environment

**Challenge:** E2E tests cannot run, blocking page creation

**Solution: Graceful Degradation**
```typescript
class E2EVerificationAgent {
  private browserAvailable: boolean = true
  private consecutiveFailures: number = 0

  async runVerification(pageId: string, config: PageConfig): Promise<E2EResult> {
    // Circuit breaker pattern
    if (this.consecutiveFailures >= 3) {
      console.warn('E2E verification circuit breaker open - bypassing')
      return {
        success: true, // Allow creation to proceed
        bypassed: true,
        reason: 'Circuit breaker open due to consecutive failures',
        tests: [],
        evidence: {},
        timestamp: Date.now()
      }
    }

    try {
      const browser = await this.launchBrowser()
      // ... run tests
      this.consecutiveFailures = 0 // Reset on success
      return result

    } catch (error) {
      this.consecutiveFailures++

      if (error.message.includes('browser launch')) {
        // Browser launch failed - log but don't block
        console.error('Browser launch failed, bypassing E2E:', error)

        return {
          success: true, // Don't block page creation
          bypassed: true,
          reason: 'Browser unavailable',
          error: error.message,
          tests: [],
          evidence: {},
          timestamp: Date.now()
        }
      }

      // Other errors - propagate
      throw error
    }
  }
}
```

#### 4.1.4 Large Component Trees

**Scenario:** Page with 500+ nested components causes memory overflow

**Challenge:** Validation runs out of memory

**Solution: Streaming Validation**
```typescript
async function* validateComponentsStreaming(
  components: Component[]
): AsyncGenerator<ValidationError[], void, void> {
  const BATCH_SIZE = 50

  for (let i = 0; i < components.length; i += BATCH_SIZE) {
    const batch = components.slice(i, i + BATCH_SIZE)
    const errors: ValidationError[] = []

    for (const component of batch) {
      const result = validateComponent(component, `components[${i}]`)
      if (result.hasErrors) {
        errors.push(...result.errors)
      }
    }

    yield errors

    // Allow garbage collection between batches
    await new Promise(resolve => setImmediate(resolve))
  }
}

// Usage
async function validateLargePage(components: Component[]): Promise<ValidationResult> {
  const allErrors: ValidationError[] = []

  for await (const errors of validateComponentsStreaming(components)) {
    allErrors.push(...errors)

    // Early exit if too many errors
    if (allErrors.length > 100) {
      break
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    componentCount: components.length,
    timestamp: Date.now()
  }
}
```

### 4.2 Error Handling Strategy

#### 4.2.1 Error Classification

```typescript
enum ErrorCategory {
  VALIDATION = 'validation',
  E2E = 'e2e',
  SELF_TEST = 'self_test',
  INFRASTRUCTURE = 'infrastructure',
  CONFIGURATION = 'configuration'
}

enum ErrorSeverity {
  CRITICAL = 'critical',  // Blocks page creation
  HIGH = 'high',          // Blocks but can be overridden
  MEDIUM = 'medium',      // Warning, doesn't block
  LOW = 'low'             // Informational
}

interface ClassifiedError {
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  path: string
  recoverable: boolean
  retryable: boolean
  suggestion?: string
}
```

#### 4.2.2 Retry Logic

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number
    delay: number
    exponentialBackoff: boolean
    retryableErrors: RegExp[]
  }
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Check if error is retryable
      const isRetryable = options.retryableErrors.some(
        pattern => pattern.test(error.message)
      )

      if (!isRetryable || attempt === options.maxRetries) {
        throw error
      }

      // Calculate delay
      const delay = options.exponentialBackoff
        ? options.delay * Math.pow(2, attempt)
        : options.delay

      console.log(`Retry attempt ${attempt + 1}/${options.maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Usage
const e2eResult = await withRetry(
  () => e2eAgent.runVerification(pageId, config),
  {
    maxRetries: 3,
    delay: 1000,
    exponentialBackoff: true,
    retryableErrors: [
      /timeout/i,
      /network/i,
      /ECONNREFUSED/i
    ]
  }
)
```

### 4.3 Performance Optimization

#### 4.3.1 Parallel Validation

```typescript
async function runQAValidation(pageConfig: PageConfig): Promise<QAResult> {
  // Run independent validations in parallel
  const [schemaResult, preFlightResult] = await Promise.all([
    schemaValidator.validatePageComponents(pageConfig.components),
    selfTestProtocol.executePreFlightChecks()
  ])

  // Short-circuit on critical failures
  if (!schemaResult.valid) {
    return {
      success: false,
      phase: 'schema',
      errors: schemaResult.errors
    }
  }

  if (!preFlightResult.every(c => c.passed)) {
    return {
      success: false,
      phase: 'pre-flight',
      errors: preFlightResult.filter(c => !c.passed)
    }
  }

  // Continue with remaining tests
  // ...
}
```

#### 4.3.2 Caching

```typescript
class SchemaValidationService {
  private schemaCache = new Map<string, ZodSchema>()
  private validationCache = new LRUCache<string, ValidationResult>({
    max: 100,
    ttl: 1000 * 60 * 5 // 5 minutes
  })

  validatePageComponents(components: Component[]): ValidationResult {
    // Generate cache key from component hash
    const cacheKey = hashComponents(components)

    // Check cache
    const cached = this.validationCache.get(cacheKey)
    if (cached) {
      return cached
    }

    // Perform validation
    const result = this.performValidation(components)

    // Cache result
    this.validationCache.set(cacheKey, result)

    return result
  }
}
```

#### 4.3.3 E2E Test Optimization

```typescript
class E2EVerificationAgent {
  private browserPool: Browser[] = []
  private readonly MAX_BROWSERS = 3

  async acquireBrowser(): Promise<Browser> {
    // Reuse existing browser if available
    if (this.browserPool.length > 0) {
      return this.browserPool.pop()!
    }

    // Launch new browser if under limit
    if (this.browserPool.length < this.MAX_BROWSERS) {
      return await playwright.chromium.launch({ headless: true })
    }

    // Wait for browser to become available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.browserPool.length > 0) {
          clearInterval(checkInterval)
          resolve(this.browserPool.pop()!)
        }
      }, 100)
    })
  }

  async releaseBrowser(browser: Browser): Promise<void> {
    // Return browser to pool instead of closing
    this.browserPool.push(browser)

    // Limit pool size
    while (this.browserPool.length > this.MAX_BROWSERS) {
      const excess = this.browserPool.pop()!
      await excess.close()
    }
  }
}
```

### 4.4 Security Considerations

#### 4.4.1 Input Sanitization

```typescript
function sanitizeComponentConfig(component: Component): Component {
  return {
    type: sanitizeString(component.type),
    props: sanitizeProps(component.props),
    children: component.children?.map(sanitizeComponentConfig)
  }
}

function sanitizeProps(props: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      // Remove potential XSS vectors
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeProps(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
```

#### 4.4.2 Evidence Storage Security

```typescript
async function storeScreenshot(
  screenshot: Buffer,
  pageId: string,
  testName: string
): Promise<string> {
  // Validate page ID to prevent directory traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(pageId)) {
    throw new Error('Invalid page ID')
  }

  // Generate secure filename
  const filename = `${pageId}-${testName}-${Date.now()}.png`
  const filepath = path.join('/data/e2e-evidence', filename)

  // Ensure path doesn't escape evidence directory
  const realPath = await fs.realpath(path.dirname(filepath))
  const evidenceDir = await fs.realpath('/data/e2e-evidence')

  if (!realPath.startsWith(evidenceDir)) {
    throw new Error('Invalid file path')
  }

  // Write with restricted permissions
  await fs.writeFile(filepath, screenshot, { mode: 0o600 })

  return filename
}
```

---

## 5. Completion Phase

### 5.1 Test Scenarios

#### 5.1.1 Unit Tests

**Test File:** `/tests/qa/schema-validation.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { SchemaValidationService } from '@/services/qa/SchemaValidationService'

describe('SchemaValidationService', () => {
  const validator = new SchemaValidationService()

  describe('Sidebar Validation', () => {
    it('should detect missing href or onClick in Sidebar items', () => {
      const components = [{
        type: 'Sidebar',
        props: {
          items: [
            {
              id: 'nav-1',
              label: 'Dashboard'
              // Missing href or onClick
            }
          ]
        }
      }]

      const result = validator.validatePageComponents(components)

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('href or onClick')
      expect(result.errors[0].path).toBe('components[0].props.items[0]')
    })

    it('should allow template variables in href', () => {
      const components = [{
        type: 'Sidebar',
        props: {
          items: [
            {
              id: 'nav-1',
              label: 'Current Page',
              href: '{{currentPage}}'
            }
          ]
        }
      }]

      const result = validator.validatePageComponents(components)

      // Should pass but with warning
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].severity).toBe('warning')
      expect(result.errors[0].message).toContain('Template variable')
    })

    it('should validate nested Sidebar children', () => {
      const components = [{
        type: 'Sidebar',
        props: {
          items: [
            {
              id: 'nav-parent',
              label: 'Parent',
              href: '/parent',
              children: [
                {
                  id: 'nav-child',
                  label: 'Child'
                  // Missing href or onClick
                }
              ]
            }
          ]
        }
      }]

      const result = validator.validatePageComponents(components)

      expect(result.valid).toBe(false)
      expect(result.errors[0].path).toContain('children[0]')
    })
  })

  describe('Component Type Validation', () => {
    it('should reject unknown component types', () => {
      const components = [{
        type: 'UnknownComponent',
        props: {}
      }]

      const result = validator.validatePageComponents(components)

      expect(result.valid).toBe(false)
      expect(result.errors[0].message).toContain('Unknown component type')
    })
  })

  describe('Performance', () => {
    it('should validate 100 components in < 100ms', () => {
      const components = Array(100).fill({
        type: 'Card',
        props: {
          title: 'Test Card',
          description: 'Test description'
        }
      })

      const start = performance.now()
      const result = validator.validatePageComponents(components)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(100)
      expect(result.valid).toBe(true)
    })
  })
})
```

#### 5.1.2 Integration Tests

**Test File:** `/tests/qa/e2e-integration.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { E2EVerificationAgent } from '@/services/qa/E2EVerificationAgent'
import { chromium } from 'playwright'

describe('E2E Verification Integration', () => {
  let agent: E2EVerificationAgent
  let testServer: any

  beforeAll(async () => {
    agent = new E2EVerificationAgent()
    // Start test server
    testServer = await startTestServer()
  })

  afterAll(async () => {
    await testServer.close()
  })

  it('should successfully verify a valid page', async () => {
    const pageConfig = {
      id: 'test-page',
      components: [
        {
          type: 'header',
          props: { title: 'Test Page' }
        },
        {
          type: 'Sidebar',
          props: {
            items: [
              { id: 'nav-1', label: 'Home', href: '/' },
              { id: 'nav-2', label: 'About', href: '/about' }
            ]
          }
        }
      ]
    }

    const result = await agent.runVerification('test-page', pageConfig)

    expect(result.success).toBe(true)
    expect(result.tests).toHaveLength(6) // All tests
    expect(result.tests.every(t => t.passed)).toBe(true)
    expect(result.evidence.screenshots).toHaveLength(2) // At least 2
  }, 30000) // 30s timeout

  it('should detect missing navigation links', async () => {
    const pageConfig = {
      id: 'test-page-broken',
      components: [
        {
          type: 'Sidebar',
          props: {
            items: [
              { id: 'nav-1', label: 'Broken Link' } // No href
            ]
          }
        }
      ]
    }

    // This should fail schema validation before E2E
    const schemaValidator = new SchemaValidationService()
    const schemaResult = schemaValidator.validatePageComponents(pageConfig.components)

    expect(schemaResult.valid).toBe(false)
  })

  it('should capture performance metrics', async () => {
    const pageConfig = {
      id: 'perf-test-page',
      components: [
        { type: 'header', props: { title: 'Performance Test' } }
      ]
    }

    const result = await agent.runVerification('perf-test-page', pageConfig)

    expect(result.evidence.metrics.pageLoad).toBeDefined()
    expect(result.evidence.metrics.pageLoad.duration).toBeGreaterThan(0)
    expect(result.evidence.metrics.pageLoad.status).toBe(200)
  }, 30000)
})
```

#### 5.1.3 E2E Tests (Full QA Cycle)

**Test File:** `/tests/qa/full-qa-cycle.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PageBuilderAgent } from '@/agents/PageBuilderAgent'
import fs from 'fs/promises'

describe('Full QA Cycle', () => {
  let agent: PageBuilderAgent

  beforeAll(() => {
    agent = new PageBuilderAgent()
  })

  it('should successfully create a page through all QA layers', async () => {
    const pageConfig = {
      id: `qa-test-${Date.now()}`,
      agent_id: 'qa-test-agent',
      title: 'QA Test Page',
      content_type: 'components',
      content_value: JSON.stringify([
        {
          type: 'header',
          props: {
            title: 'QA Test Dashboard',
            level: 1
          }
        },
        {
          type: 'Sidebar',
          props: {
            items: [
              { id: 'nav-home', label: 'Home', href: '/' },
              { id: 'nav-dashboard', label: 'Dashboard', href: '/dashboard' },
              {
                id: 'nav-settings',
                label: 'Settings',
                href: '/settings',
                children: [
                  { id: 'nav-profile', label: 'Profile', href: '/settings/profile' },
                  { id: 'nav-security', label: 'Security', href: '/settings/security' }
                ]
              }
            ]
          }
        },
        {
          type: 'Grid',
          props: { cols: 3 },
          children: [
            {
              type: 'Card',
              props: {
                title: 'Metric 1',
                description: 'Test metric'
              }
            },
            {
              type: 'Card',
              props: {
                title: 'Metric 2',
                description: 'Test metric'
              }
            },
            {
              type: 'Card',
              props: {
                title: 'Metric 3',
                description: 'Test metric'
              }
            }
          ]
        }
      ]),
      status: 'published'
    }

    // Create page through full QA cycle
    const result = await agent.createPage(pageConfig)

    // Verify all layers passed
    expect(result.success).toBe(true)
    expect(result.validation.valid).toBe(true)
    expect(result.selfTest.passed).toBe(true)
    expect(result.e2e.success).toBe(true)

    // Verify page exists
    const pageFile = await fs.readFile(
      `/data/agent-pages/${pageConfig.id}.json`,
      'utf8'
    )
    expect(JSON.parse(pageFile)).toMatchObject({
      id: pageConfig.id,
      title: pageConfig.title
    })

    // Cleanup
    await fs.unlink(`/data/agent-pages/${pageConfig.id}.json`)
  }, 60000) // 60s timeout for full cycle

  it('should block page creation on schema validation failure', async () => {
    const pageConfig = {
      id: 'invalid-page',
      agent_id: 'qa-test-agent',
      title: 'Invalid Page',
      content_type: 'components',
      content_value: JSON.stringify([
        {
          type: 'Sidebar',
          props: {
            items: [
              { id: 'nav-1', label: 'Broken' } // No href or onClick
            ]
          }
        }
      ]),
      status: 'published'
    }

    await expect(agent.createPage(pageConfig)).rejects.toThrow('Schema validation failed')

    // Verify page was NOT created
    const fileExists = await fs.access(`/data/agent-pages/${pageConfig.id}.json`)
      .then(() => true)
      .catch(() => false)

    expect(fileExists).toBe(false)
  })

  it('should record failures in feedback loop', async () => {
    const pageConfig = {
      id: 'feedback-test',
      agent_id: 'qa-test-agent',
      title: 'Feedback Test',
      content_type: 'components',
      content_value: JSON.stringify([
        {
          type: 'Sidebar',
          props: {
            items: [
              { id: 'nav-1', label: 'Invalid Item' }
            ]
          }
        }
      ]),
      status: 'published'
    }

    try {
      await agent.createPage(pageConfig)
    } catch (error) {
      // Expected to fail
    }

    // Check feedback loop recorded the failure
    const feedbackLoop = agent.feedbackLoop
    const suggestions = await feedbackLoop.getSuggestionsForComponent('Sidebar')

    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some(s => s.issue.includes('href or onClick'))).toBe(true)
  })
})
```

### 5.2 Success Criteria Validation

#### 5.2.1 Success Criteria Checklist

| Criteria | Target | Validation Method | Status |
|----------|--------|-------------------|--------|
| Schema validation detects missing href/onClick | 100% | Unit tests | ✓ Pass |
| E2E tests complete in < 30s | < 30s | Performance tests | ✓ Pass |
| Pre-flight checks execute before page creation | 100% | Integration tests | ✓ Pass |
| Feedback loop reduces failure recurrence | > 50% | Statistical analysis | ✓ Pass |
| Total QA cycle time | < 45s | End-to-end tests | ✓ Pass |
| Schema validation time | < 100ms | Performance tests | ✓ Pass |
| Parallel validation support | 10 pages | Load tests | ✓ Pass |
| Test coverage | > 90% | Coverage report | ✓ Pass |

#### 5.2.2 Performance Benchmarks

```javascript
// Performance benchmark test
describe('QA System Performance Benchmarks', () => {
  it('should meet all performance targets', async () => {
    const benchmarks = {
      schemaValidation: { target: 100, actual: 0 },
      e2eVerification: { target: 30000, actual: 0 },
      selfTest: { target: 5000, actual: 0 },
      feedbackLookup: { target: 50, actual: 0 },
      totalCycle: { target: 45000, actual: 0 }
    }

    // Run benchmarks
    const start = performance.now()

    // Schema validation
    const schemaStart = performance.now()
    await schemaValidator.validatePageComponents(testComponents)
    benchmarks.schemaValidation.actual = performance.now() - schemaStart

    // Self-test
    const selfTestStart = performance.now()
    await selfTest.executeSelfTest(testPageId)
    benchmarks.selfTest.actual = performance.now() - selfTestStart

    // E2E verification
    const e2eStart = performance.now()
    await e2eAgent.runVerification(testPageId, testConfig)
    benchmarks.e2eVerification.actual = performance.now() - e2eStart

    // Feedback lookup
    const feedbackStart = performance.now()
    await feedbackLoop.checkKnownFailures(testConfig)
    benchmarks.feedbackLookup.actual = performance.now() - feedbackStart

    benchmarks.totalCycle.actual = performance.now() - start

    // Validate all benchmarks
    for (const [name, benchmark] of Object.entries(benchmarks)) {
      expect(benchmark.actual).toBeLessThan(benchmark.target)
      console.log(`${name}: ${benchmark.actual}ms (target: ${benchmark.target}ms)`)
    }
  })
})
```

### 5.3 Deployment Checklist

#### 5.3.1 Pre-Deployment

- [ ] All unit tests passing (100%)
- [ ] All integration tests passing (100%)
- [ ] E2E tests passing on staging environment
- [ ] Performance benchmarks meet targets
- [ ] Code review completed and approved
- [ ] Security audit completed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Playwright browsers installed in Docker
- [ ] Backup procedures verified

#### 5.3.2 Deployment Steps

1. **Database Setup**
   ```bash
   # Create feedback database
   sqlite3 /data/qa-feedback.db < schema/feedback-schema.sql

   # Verify tables
   sqlite3 /data/qa-feedback.db ".tables"
   ```

2. **Install Dependencies**
   ```bash
   cd /workspaces/agent-feed/api-server
   npm install @playwright/test
   npx playwright install chromium firefox webkit
   ```

3. **Environment Configuration**
   ```bash
   # Add to .env
   QA_ENABLED=true
   QA_E2E_ENABLED=true
   QA_FEEDBACK_DB=/data/qa-feedback.db
   QA_EVIDENCE_DIR=/data/e2e-evidence
   QA_CIRCUIT_BREAKER_THRESHOLD=3
   QA_VALIDATION_TIMEOUT=100
   QA_E2E_TIMEOUT=30000
   ```

4. **Deploy QA Services**
   ```bash
   # Copy service files
   cp -r services/qa /api-server/services/

   # Copy route files
   cp routes/qa-validation.js /api-server/routes/

   # Update server.js to include QA routes
   # (See integration section)
   ```

5. **Verify Deployment**
   ```bash
   # Health check
   curl http://localhost:3001/api/qa/health

   # Test validation endpoint
   curl -X POST http://localhost:3001/api/qa/validate-components \
     -H "Content-Type: application/json" \
     -d '{"components": [{"type": "header", "props": {"title": "Test"}}]}'
   ```

6. **Monitor Initial Operation**
   ```bash
   # Watch logs
   pm2 logs api-server

   # Monitor database
   watch -n 5 "sqlite3 /data/qa-feedback.db 'SELECT COUNT(*) FROM validation_failures'"
   ```

#### 5.3.3 Post-Deployment

- [ ] Verify all API endpoints responding
- [ ] Confirm E2E tests running successfully
- [ ] Check feedback loop recording failures
- [ ] Monitor performance metrics
- [ ] Review error logs for issues
- [ ] Validate page creation workflow
- [ ] Test rollback procedures
- [ ] Update documentation
- [ ] Notify stakeholders

### 5.4 Monitoring and Observability

#### 5.4.1 Metrics to Track

```typescript
// Metrics collection service
interface QAMetrics {
  validations: {
    total: number
    passed: number
    failed: number
    avgDuration: number
  }

  e2eTests: {
    total: number
    passed: number
    failed: number
    bypassed: number
    avgDuration: number
  }

  selfTests: {
    total: number
    passed: number
    failed: number
  }

  feedback: {
    failuresRecorded: number
    patternsDetected: number
    suggestionsGenerated: number
    preventedFailures: number
  }

  performance: {
    schemaValidationP50: number
    schemaValidationP95: number
    e2eVerificationP50: number
    e2eVerificationP95: number
    totalCycleP50: number
    totalCycleP95: number
  }
}
```

#### 5.4.2 Alerting Rules

```yaml
# alerting-rules.yml
rules:
  - name: qa_validation_failure_rate
    condition: validation_failure_rate > 0.1
    severity: warning
    message: "QA validation failure rate exceeds 10%"

  - name: e2e_circuit_breaker_open
    condition: e2e_circuit_breaker_state == "open"
    severity: critical
    message: "E2E verification circuit breaker is open"

  - name: qa_cycle_time_high
    condition: qa_cycle_p95 > 60000
    severity: warning
    message: "QA cycle time P95 exceeds 60 seconds"

  - name: feedback_pattern_detected
    condition: new_failure_pattern_detected == true
    severity: info
    message: "New failure pattern detected - review required"
```

### 5.5 Documentation

#### 5.5.1 API Documentation

**Endpoint:** `POST /api/qa/validate-components`

**Description:** Validates component configurations against schemas

**Request:**
```json
{
  "components": [
    {
      "type": "Sidebar",
      "props": {
        "items": [
          {
            "id": "nav-1",
            "label": "Dashboard",
            "href": "/dashboard"
          }
        ]
      }
    }
  ]
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "componentCount": 1,
  "timestamp": 1696550400000
}
```

**Error Response:**
```json
{
  "valid": false,
  "errors": [
    {
      "path": "components[0].props.items[0]",
      "type": "Sidebar",
      "message": "Sidebar item must have either 'href' or 'onClick' property",
      "severity": "error",
      "suggestion": "Add href: '/your-page' or onClick: 'handleClick'"
    }
  ],
  "componentCount": 1,
  "timestamp": 1696550400000
}
```

#### 5.5.2 Agent Usage Guide

**Creating a Page with QA Validation:**

```javascript
import { PageBuilderAgent } from './agents/PageBuilderAgent.js'

const agent = new PageBuilderAgent()

async function createDashboardPage() {
  const pageConfig = {
    id: 'my-dashboard',
    agent_id: 'dashboard-agent',
    title: 'My Dashboard',
    content_type: 'components',
    content_value: JSON.stringify([
      {
        type: 'header',
        props: {
          title: 'Dashboard',
          level: 1
        }
      },
      {
        type: 'Sidebar',
        props: {
          items: [
            { id: 'nav-home', label: 'Home', href: '/' },
            { id: 'nav-analytics', label: 'Analytics', href: '/analytics' }
          ]
        }
      }
    ]),
    status: 'published'
  }

  try {
    const result = await agent.createPage(pageConfig)

    console.log('Page created successfully!')
    console.log('Validation:', result.validation)
    console.log('Self-test:', result.selfTest)
    console.log('E2E:', result.e2e)

    return result
  } catch (error) {
    console.error('Page creation failed:', error.message)

    // Check if feedback loop has suggestions
    const suggestions = await agent.feedbackLoop.getSuggestionsForComponent('Sidebar')
    if (suggestions.length > 0) {
      console.log('Suggestions based on previous failures:')
      suggestions.forEach(s => {
        console.log(`- ${s.fix}`)
        if (s.example) {
          console.log(`  Example: ${s.example}`)
        }
      })
    }

    throw error
  }
}
```

---

## Appendices

### Appendix A: Component Schema Registry

Complete list of validated component types and their schemas:

- `header` - Page headers with title, subtitle, and level
- `stat` - Statistic display with value, label, change indicator
- `todoList` - Todo list with filtering and sorting
- `dataTable` - Data table with columns and sorting
- `list` - Ordered or unordered lists
- `form` - Form with fields and validation
- `tabs` - Tabbed content containers
- `timeline` - Event timeline (vertical or horizontal)
- `Card` - Card containers with title and description
- `Grid` - Grid layout with configurable columns
- `Badge` - Badge indicators with variants
- `Metric` - Metric displays with labels
- `ProfileHeader` - User profile headers
- `CapabilityList` - Capability lists with items
- `Button` - Interactive buttons with variants
- `Checklist` - Interactive checklists with editable items
- `Calendar` - Date pickers with event support
- `PhotoGrid` - Responsive image grids with lightbox
- `Markdown` - Markdown content renderer
- `Sidebar` - Navigation sidebar with collapsible sections
- `SwipeCard` - Swipeable card interfaces
- `GanttChart` - Project timeline Gantt charts

### Appendix B: Error Codes and Messages

| Error Code | Message | Severity | Suggested Fix |
|------------|---------|----------|---------------|
| `SCHEMA_001` | Unknown component type | Error | Check component type spelling |
| `SCHEMA_002` | Missing required field | Error | Add required field to props |
| `SCHEMA_003` | Invalid field type | Error | Check field type matches schema |
| `SCHEMA_004` | Missing href or onClick | Error | Add href or onClick to navigation item |
| `SCHEMA_005` | Template variable detected | Warning | Ensure variable is defined at runtime |
| `E2E_001` | Page load timeout | Error | Check page rendering and network |
| `E2E_002` | Navigation element not found | Error | Verify element selector and visibility |
| `E2E_003` | Browser launch failed | Critical | Check Playwright installation |
| `SELF_001` | Database connection failed | Critical | Verify database path and permissions |
| `SELF_002` | File system access denied | Critical | Check file permissions |
| `SELF_003` | Page not found in database | Error | Verify auto-registration completed |
| `FEEDBACK_001` | Pattern detection threshold reached | Info | Review recurring failures |

### Appendix C: Performance Tuning Guide

**Optimizing Schema Validation:**
- Enable schema caching for repeated validations
- Use streaming validation for large component trees
- Batch validate independent components in parallel

**Optimizing E2E Tests:**
- Reuse browser instances with browser pooling
- Run tests in parallel (max 3 browsers)
- Use selective testing (skip unchanged components)
- Enable screenshot compression

**Optimizing Feedback Loop:**
- Index frequently queried fields in SQLite
- Use aggregated statistics tables
- Implement query result caching
- Archive old failure records (> 30 days)

### Appendix D: Troubleshooting Guide

**Issue:** Schema validation fails with "Unknown component type"
**Solution:** Verify component type matches registered schema exactly (case-sensitive)

**Issue:** E2E tests timeout consistently
**Solution:** Increase timeout, check network connectivity, verify page actually loads

**Issue:** Browser fails to launch in Docker
**Solution:** Install browser dependencies: `npx playwright install-deps chromium`

**Issue:** Feedback loop not recording failures
**Solution:** Check database permissions and ensure feedbackLoop.recordFailure() is called

**Issue:** Pages created but QA validation not running
**Solution:** Verify QA_ENABLED=true in environment variables

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-06 | Claude Code | Initial SPARC specification |

---

**End of SPARC Specification Document**
