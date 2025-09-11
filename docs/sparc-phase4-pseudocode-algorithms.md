# SPARC Phase 4: Pseudocode Algorithms for Route Cleanup

## Algorithm 1: Legacy Route Identification and Mapping

```pseudocode
FUNCTION IdentifyLegacyRoutes() -> LegacyRouteMap
    // Phase 1: Static Analysis
    legacyRoutes = []
    
    // Scan App.tsx for route definitions
    appRoutes = PARSE_FILE("src/App.tsx")
    FOR EACH route IN appRoutes.routes:
        IF route.path MATCHES "/agent/:agentId" OR route.path MATCHES "/agents-legacy":
            legacyRoutes.ADD({
                path: route.path,
                component: route.component,
                lineNumber: route.lineNumber,
                usageCount: 0,
                replacementPath: "/agents/:agentId"
            })
    
    // Phase 2: Dependency Analysis
    FOR EACH legacyRoute IN legacyRoutes:
        dependencies = FIND_IMPORT_USAGES(legacyRoute.component)
        legacyRoute.dependencies = dependencies
        legacyRoute.usageCount = COUNT_REFERENCES(legacyRoute.component)
    
    RETURN legacyRoutes
END FUNCTION

FUNCTION CreateMigrationMapping() -> MigrationMap
    mapping = {
        "/agent/:agentId": "/agents/:agentId",
        "/agents-legacy": "/agents",
        "AgentDetail": "UnifiedAgentPage", 
        "AgentHome": "UnifiedAgentPage",
        "BulletproofAgentProfile": "UnifiedAgentPage"
    }
    RETURN mapping
END FUNCTION
```

## Algorithm 2: Safe Component Removal with Rollback

```pseudocode
FUNCTION SafeComponentRemoval(componentPath, backupEnabled = true) -> RemovalResult
    result = {
        success: false,
        backupPath: null,
        dependencies: [],
        errors: []
    }
    
    TRY:
        // Phase 1: Backup Creation
        IF backupEnabled:
            backupPath = CREATE_BACKUP(componentPath)
            result.backupPath = backupPath
        
        // Phase 2: Dependency Check
        dependencies = FIND_ALL_DEPENDENCIES(componentPath)
        result.dependencies = dependencies
        
        IF dependencies.length > 0:
            result.errors.ADD("Component has active dependencies")
            RETURN result
        
        // Phase 3: Import Analysis
        importUsages = SCAN_IMPORTS(componentPath)
        IF importUsages.length > 0:
            result.errors.ADD("Component still imported in files: " + importUsages)
            RETURN result
        
        // Phase 4: Safe Removal
        DELETE_FILE(componentPath)
        
        // Phase 5: Validation
        buildResult = RUN_BUILD_CHECK()
        IF buildResult.failed:
            RESTORE_FROM_BACKUP(backupPath)
            result.errors.ADD("Build failed after removal: " + buildResult.errors)
            RETURN result
        
        result.success = true
        RETURN result
        
    CATCH error:
        IF backupPath EXISTS:
            RESTORE_FROM_BACKUP(backupPath)
        result.errors.ADD("Removal failed: " + error.message)
        RETURN result
END FUNCTION
```

## Algorithm 3: Route Configuration Update

```pseudocode
FUNCTION UpdateRouteConfiguration() -> UpdateResult
    result = {
        success: false,
        updatedFiles: [],
        errors: []
    }
    
    TRY:
        // Phase 1: App.tsx Route Cleanup
        appContent = READ_FILE("src/App.tsx")
        
        // Remove legacy route imports
        appContent = REMOVE_IMPORT_LINE(appContent, "import AgentDetail")
        appContent = REMOVE_IMPORT_LINE(appContent, "import AgentHome")
        
        // Remove legacy route definitions
        appContent = REMOVE_ROUTE_DEFINITION(appContent, "/agent/:agentId")
        appContent = REMOVE_ROUTE_DEFINITION(appContent, "/agents-legacy")
        
        // Validate route structure
        routes = PARSE_ROUTES(appContent)
        IF NOT ROUTE_EXISTS(routes, "/agents/:agentId"):
            result.errors.ADD("UnifiedAgentPage route missing")
            RETURN result
        
        WRITE_FILE("src/App.tsx", appContent)
        result.updatedFiles.ADD("src/App.tsx")
        
        // Phase 2: Navigation Link Updates
        navigationFiles = FIND_FILES_WITH_PATTERN("**/*(tsx|ts|jsx|js)", "to=\"/agent/")
        FOR EACH file IN navigationFiles:
            content = READ_FILE(file)
            content = REPLACE_ALL(content, "to=\"/agent/", "to=\"/agents/")
            WRITE_FILE(file, content)
            result.updatedFiles.ADD(file)
        
        // Phase 3: Build Validation
        buildResult = RUN_BUILD_CHECK()
        IF buildResult.failed:
            ROLLBACK_ALL_CHANGES(result.updatedFiles)
            result.errors.ADD("Build failed: " + buildResult.errors)
            RETURN result
        
        result.success = true
        RETURN result
        
    CATCH error:
        ROLLBACK_ALL_CHANGES(result.updatedFiles)
        result.errors.ADD("Update failed: " + error.message)
        RETURN result
END FUNCTION
```

## Algorithm 4: Comprehensive Validation Protocol

```pseudocode
FUNCTION ComprehensiveValidation() -> ValidationResult
    result = {
        passed: false,
        tests: [],
        errors: []
    }
    
    // Test 1: Route Accessibility
    testResult1 = TEST_ROUTE_ACCESSIBILITY("/agents")
    result.tests.ADD(testResult1)
    
    testResult2 = TEST_ROUTE_ACCESSIBILITY("/agents/test-agent")
    result.tests.ADD(testResult2)
    
    // Test 2: Navigation Flow
    testResult3 = TEST_NAVIGATION_FLOW([
        {from: "/agents", action: "click_agent", to: "/agents/:agentId"},
        {from: "/agents/:agentId", action: "back_button", to: "/agents"}
    ])
    result.tests.ADD(testResult3)
    
    // Test 3: Legacy Route Handling
    testResult4 = TEST_LEGACY_ROUTES([
        "/agent/test-agent",
        "/agents-legacy"
    ])
    result.tests.ADD(testResult4)
    
    // Test 4: Component Functionality
    testResult5 = TEST_UNIFIED_AGENT_PAGE_FEATURES([
        "profile_tab",
        "definition_tab", 
        "filesystem_tab",
        "pages_tab"
    ])
    result.tests.ADD(testResult5)
    
    // Test 5: API Integration
    testResult6 = TEST_API_INTEGRATION("/api/agents/:agentId")
    result.tests.ADD(testResult6)
    
    // Test 6: Error Handling
    testResult7 = TEST_ERROR_SCENARIOS([
        "invalid_agent_id",
        "network_failure",
        "component_error"
    ])
    result.tests.ADD(testResult7)
    
    // Evaluate Results
    failedTests = FILTER(result.tests, test => test.passed == false)
    IF failedTests.length == 0:
        result.passed = true
    ELSE:
        result.errors = MAP(failedTests, test => test.error)
    
    RETURN result
END FUNCTION
```

## Algorithm 5: Automated Cleanup Orchestration

```pseudocode
FUNCTION ExecutePhase4Cleanup() -> CleanupResult
    result = {
        success: false,
        phase: "initialization",
        completedSteps: [],
        errors: []
    }
    
    TRY:
        // Step 1: Pre-cleanup Validation
        result.phase = "pre_validation"
        preValidation = ComprehensiveValidation()
        IF NOT preValidation.passed:
            result.errors.ADD("Pre-cleanup validation failed")
            RETURN result
        result.completedSteps.ADD("pre_validation")
        
        // Step 2: Create Safety Backups
        result.phase = "backup_creation"
        backups = CREATE_FULL_BACKUP([
            "src/App.tsx",
            "src/components/AgentDetail.jsx",
            "src/components/AgentHome.tsx"
        ])
        result.completedSteps.ADD("backup_creation")
        
        // Step 3: Remove Legacy Components
        result.phase = "component_removal"
        removal1 = SafeComponentRemoval("src/components/AgentDetail.jsx")
        IF NOT removal1.success:
            RESTORE_BACKUPS(backups)
            result.errors.ADD("Failed to remove AgentDetail: " + removal1.errors)
            RETURN result
        
        removal2 = SafeComponentRemoval("src/components/AgentHome.tsx") 
        IF NOT removal2.success:
            RESTORE_BACKUPS(backups)
            result.errors.ADD("Failed to remove AgentHome: " + removal2.errors)
            RETURN result
        result.completedSteps.ADD("component_removal")
        
        // Step 4: Update Route Configuration
        result.phase = "route_update"
        routeUpdate = UpdateRouteConfiguration()
        IF NOT routeUpdate.success:
            RESTORE_BACKUPS(backups)
            result.errors.ADD("Route update failed: " + routeUpdate.errors)
            RETURN result
        result.completedSteps.ADD("route_update")
        
        // Step 5: Post-cleanup Validation
        result.phase = "post_validation"
        postValidation = ComprehensiveValidation()
        IF NOT postValidation.passed:
            RESTORE_BACKUPS(backups)
            result.errors.ADD("Post-cleanup validation failed")
            RETURN result
        result.completedSteps.ADD("post_validation")
        
        // Step 6: Performance Validation
        result.phase = "performance_validation"
        performanceCheck = RUN_PERFORMANCE_TESTS()
        IF performanceCheck.regressionDetected:
            result.errors.ADD("Performance regression detected")
            // Don't rollback for performance issues, just log
        result.completedSteps.ADD("performance_validation")
        
        // Step 7: Final Build and Test
        result.phase = "final_verification"
        buildResult = RUN_FULL_BUILD_AND_TEST()
        IF buildResult.failed:
            RESTORE_BACKUPS(backups)
            result.errors.ADD("Final build failed: " + buildResult.errors)
            RETURN result
        result.completedSteps.ADD("final_verification")
        
        // Cleanup successful
        CLEANUP_BACKUPS(backups)
        result.success = true
        result.phase = "completed"
        
        RETURN result
        
    CATCH error:
        // Emergency rollback
        IF backups EXISTS:
            RESTORE_BACKUPS(backups)
        result.errors.ADD("Cleanup failed: " + error.message)
        RETURN result
END FUNCTION
```

## Algorithm 6: Real-time Monitoring and Rollback

```pseudocode
FUNCTION MonitorCleanupExecution(cleanupProcess) -> MonitoringResult
    monitoring = {
        status: "monitoring",
        metrics: {},
        alerts: [],
        rollbackTriggered: false
    }
    
    WHILE cleanupProcess.isRunning():
        // Monitor Build Status
        buildStatus = CHECK_BUILD_STATUS()
        IF buildStatus.failed:
            TRIGGER_ROLLBACK(cleanupProcess)
            monitoring.rollbackTriggered = true
            monitoring.alerts.ADD("Build failure detected")
            BREAK
        
        // Monitor Error Rates
        errorRate = GET_APPLICATION_ERROR_RATE()
        IF errorRate > THRESHOLD.ERROR_RATE:
            TRIGGER_ROLLBACK(cleanupProcess)
            monitoring.rollbackTriggered = true
            monitoring.alerts.ADD("Error rate spike detected")
            BREAK
        
        // Monitor Navigation Health
        navigationHealth = CHECK_NAVIGATION_HEALTH()
        IF navigationHealth.score < THRESHOLD.NAVIGATION_HEALTH:
            TRIGGER_ROLLBACK(cleanupProcess)
            monitoring.rollbackTriggered = true
            monitoring.alerts.ADD("Navigation health degraded")
            BREAK
        
        // Update Metrics
        monitoring.metrics.UPDATE({
            buildStatus: buildStatus,
            errorRate: errorRate,
            navigationHealth: navigationHealth,
            timestamp: NOW()
        })
        
        SLEEP(MONITORING_INTERVAL)
    
    RETURN monitoring
END FUNCTION
```

## Integration Testing Algorithms

```pseudocode
FUNCTION ExecuteIntegrationTests() -> TestResult
    tests = []
    
    // Test 1: Agent List to Detail Navigation
    test1 = EXECUTE_E2E_TEST("agent_list_to_detail_navigation", {
        steps: [
            "visit('/agents')",
            "click('[data-testid=\"agent-card\"]:first')",
            "wait_for_url_pattern('/agents/*')",
            "verify_element_exists('[data-testid=\"unified-agent-page\"]')"
        ]
    })
    tests.ADD(test1)
    
    // Test 2: Legacy URL Redirection
    test2 = EXECUTE_E2E_TEST("legacy_url_redirection", {
        steps: [
            "visit('/agent/test-agent')",
            "wait_for_redirect()",
            "verify_url_pattern('/agents/test-agent')"
        ]
    })
    tests.ADD(test2)
    
    // Test 3: Component Feature Parity
    test3 = EXECUTE_E2E_TEST("component_feature_parity", {
        steps: [
            "visit('/agents/test-agent')",
            "verify_all_tabs_present(['profile', 'definition', 'filesystem', 'pages'])",
            "test_tab_functionality()",
            "verify_data_consistency()"
        ]
    })
    tests.ADD(test3)
    
    RETURN {
        passed: ALL(tests, test => test.passed),
        results: tests,
        summary: GENERATE_TEST_SUMMARY(tests)
    }
END FUNCTION
```

These algorithms provide comprehensive, step-by-step procedures for safely executing Phase 4 cleanup while maintaining system integrity and enabling immediate rollback if issues are detected.