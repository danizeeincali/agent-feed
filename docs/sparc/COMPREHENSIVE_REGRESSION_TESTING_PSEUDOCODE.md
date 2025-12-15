# SPARC Phase P: Comprehensive Regression Testing Pseudocode

## Algorithm Design for Bulletproof Testing

### 1. CORE TEST EXECUTION ALGORITHM

```pseudocode
FUNCTION executeComprehensiveRegressionSuite():
    BEGIN
        // Phase 1: Pre-execution Validation
        validateTestEnvironment()
        initializeTestDatabase()
        setupMockServices()
        
        // Phase 2: Unit Test Execution (Parallel)
        unitResults = PARALLEL_EXECUTE([
            testDirectoryResolver(),
            testAuthenticationDetection(),
            testProcessLifecycleManager(),
            testSSEConnectionHandler(),
            testInputValidation(),
            testErrorHandling()
        ])
        
        // Phase 3: Integration Test Execution (Sequential)
        IF (allTestsPassed(unitResults)) THEN
            integrationResults = SEQUENTIAL_EXECUTE([
                testInstanceCreationFlow(),
                testTerminalIOStreaming(),
                testProcessTerminationCleanup(),
                testErrorRecoveryScenarios(),
                testMultiInstanceCoordination()
            ])
        ELSE
            ABORT_WITH_DETAILED_REPORT(unitResults)
        END IF
        
        // Phase 4: E2E Test Execution (Browser Automation)
        IF (allTestsPassed(integrationResults)) THEN
            e2eResults = EXECUTE_E2E_SUITE([
                testAll4ButtonTypes(),
                testTerminalInteractionSequences(),
                testInstanceManagementWorkflows(),
                testErrorConditionHandling(),
                testBrowserCompatibility()
            ])
        ELSE
            ABORT_WITH_DETAILED_REPORT(integrationResults)
        END IF
        
        // Phase 5: Performance & Load Testing
        IF (allTestsPassed(e2eResults)) THEN
            performanceResults = EXECUTE_PERFORMANCE_SUITE([
                testResponseTimes(),
                testResourceUsage(),
                testConcurrentLoad(),
                testMemoryLeakDetection()
            ])
        END IF
        
        // Phase 6: Generate Comprehensive Report
        generateRegressionReport(unitResults, integrationResults, e2eResults, performanceResults)
        
        RETURN aggregateTestResults()
    END
END FUNCTION
```

### 2. CRITICAL COMPONENT TEST ALGORITHMS

#### 2.1 Directory Resolver Validation

```pseudocode
FUNCTION testDirectoryResolver():
    BEGIN
        resolver = NEW DirectoryResolver()
        
        // Test case matrix for all instance types
        testCases = [
            {instanceType: "prod", expected: "/workspaces/agent-feed/prod"},
            {instanceType: "skip-permissions", expected: "/workspaces/agent-feed"},
            {instanceType: "skip-permissions-c", expected: "/workspaces/agent-feed"},
            {instanceType: "skip-permissions-resume", expected: "/workspaces/agent-feed"}
        ]
        
        FOR EACH testCase IN testCases:
            BEGIN
                // Test normal resolution
                result = resolver.resolveWorkingDirectory(testCase.instanceType)
                ASSERT(result == testCase.expected)
                
                // Test security validation
                ASSERT(resolver.isWithinBaseDirectory(result))
                
                // Test permission validation
                ASSERT(resolver.validateDirectory(result) == TRUE)
                
                // Test caching behavior
                cachedResult = resolver.resolveWorkingDirectory(testCase.instanceType)
                ASSERT(result == cachedResult)
                ASSERT(getCacheHitCount() > 0)
            END
        
        // Test security edge cases
        maliciousInputs = ["../../../etc/passwd", "/root", "../../malicious"]
        FOR EACH input IN maliciousInputs:
            BEGIN
                result = resolver.resolveWorkingDirectory(input)
                ASSERT(result == "/workspaces/agent-feed") // Should fallback to base
                ASSERT(resolver.isWithinBaseDirectory(result))
            END
        
        RETURN testResultSummary()
    END
END FUNCTION
```

#### 2.2 Authentication Detection Algorithm

```pseudocode
FUNCTION testAuthenticationDetection():
    BEGIN
        // Test Case 1: Claude Code Environment Detection
        mockEnvironment({"CLAUDECODE": "1"})
        result = checkClaudeAuthentication()
        ASSERT(result.authenticated == TRUE)
        ASSERT(result.source == "claude_code_env")
        
        // Test Case 2: Credentials File Detection
        mockCredentialsFile("/home/codespace/.claude/.credentials.json")
        result = checkClaudeAuthentication()
        ASSERT(result.authenticated == TRUE)
        ASSERT(result.source == "credentials_file")
        
        // Test Case 3: CLI Availability Fallback
        mockCliCommand("claude --help", SUCCESS)
        result = checkClaudeAuthentication()
        ASSERT(result.authenticated == TRUE)
        ASSERT(result.source == "cli_available")
        
        // Test Case 4: No Authentication Available
        mockEnvironment({})  // Clear environment
        mockCredentialsFile(null)  // No file
        mockCliCommand("claude --help", FAILURE)
        result = checkClaudeAuthentication()
        ASSERT(result.authenticated == FALSE)
        ASSERT(result.reason == "Claude CLI not available")
        
        RETURN testResultSummary()
    END
END FUNCTION
```

#### 2.3 Process Lifecycle Management Algorithm

```pseudocode
FUNCTION testProcessLifecycleManager():
    BEGIN
        processManager = NEW ProcessLifecycleManager()
        
        // Test Case 1: PTY Process Creation
        instanceId = "claude-test-1001"
        processInfo = processManager.createRealClaudeInstanceWithPTY(
            "skip-permissions", instanceId, usePty=TRUE
        )
        
        ASSERT(processInfo != null)
        ASSERT(processInfo.processType == "pty")
        ASSERT(processInfo.usePty == TRUE)
        ASSERT(processInfo.pid > 0)
        ASSERT(processInfo.status == "starting")
        
        // Wait for process to become ready
        WAIT_FOR_STATUS(instanceId, "running", timeout=5000)
        ASSERT(getProcessStatus(instanceId) == "running")
        
        // Test Case 2: Input/Output Streaming
        sendInputToProcess(instanceId, "echo 'test input'\n")
        output = waitForOutput(instanceId, timeout=2000)
        ASSERT(output.contains("test input"))
        ASSERT(output.source == "pty")
        ASSERT(output.isReal == TRUE)
        
        // Test Case 3: Process Termination
        terminateProcess(instanceId)
        WAIT_FOR_STATUS(instanceId, "stopped", timeout=5000)
        ASSERT(getProcessStatus(instanceId) == "stopped")
        ASSERT(isProcessCleanedUp(instanceId) == TRUE)
        
        // Test Case 4: Pipe Process Creation (Fallback)
        instanceId2 = "claude-test-1002"
        processInfo2 = processManager.createRealClaudeInstanceWithPTY(
            "prod", instanceId2, usePty=FALSE
        )
        
        ASSERT(processInfo2.processType == "pipe")
        ASSERT(processInfo2.usePty == FALSE)
        
        RETURN testResultSummary()
    END
END FUNCTION
```

#### 2.4 SSE Connection Handling Algorithm

```pseudocode
FUNCTION testSSEConnectionHandler():
    BEGIN
        sseHandler = NEW SSEConnectionHandler()
        instanceId = "claude-test-sse-1001"
        
        // Test Case 1: Connection Establishment
        connection1 = sseHandler.createTerminalSSEStream(instanceId)
        ASSERT(connection1.isOpen == TRUE)
        ASSERT(sseHandler.getConnectionCount(instanceId) == 1)
        
        // Test Case 2: Multiple Connections
        connection2 = sseHandler.createTerminalSSEStream(instanceId)
        connection3 = sseHandler.createTerminalSSEStream(instanceId)
        ASSERT(sseHandler.getConnectionCount(instanceId) == 3)
        
        // Test Case 3: Message Broadcasting
        testMessage = {
            type: "output",
            data: "Test broadcast message",
            instanceId: instanceId,
            timestamp: NOW(),
            isReal: TRUE
        }
        
        broadcastCount = sseHandler.broadcastToAllConnections(instanceId, testMessage)
        ASSERT(broadcastCount == 3)  // All 3 connections received message
        
        // Test Case 4: Connection Cleanup on Disconnect
        connection1.close()
        ASSERT(sseHandler.getConnectionCount(instanceId) == 2)
        
        connection2.close()
        connection3.close()
        ASSERT(sseHandler.getConnectionCount(instanceId) == 0)
        
        // Test Case 5: Buffered Output Delivery
        // Simulate output before connection established
        sseHandler.bufferOutput(instanceId, testMessage)
        
        newConnection = sseHandler.createTerminalSSEStream(instanceId)
        bufferedMessages = newConnection.getBufferedMessages()
        ASSERT(bufferedMessages.length == 1)
        ASSERT(bufferedMessages[0].data == "Test broadcast message")
        
        RETURN testResultSummary()
    END
END FUNCTION
```

### 3. INTEGRATION TEST ALGORITHMS

#### 3.1 Complete Instance Creation Flow

```pseudocode
FUNCTION testInstanceCreationFlow():
    BEGIN
        // Test all 4 button types
        buttonConfigs = [
            {name: "prod/claude", command: ["claude"], type: "prod"},
            {name: "skip-permissions", command: ["claude", "--dangerously-skip-permissions"], type: "skip-permissions"},
            {name: "skip-permissions-c", command: ["claude", "--dangerously-skip-permissions", "-c"], type: "skip-permissions-c"},
            {name: "skip-permissions-resume", command: ["claude", "--dangerously-skip-permissions", "--resume"], type: "skip-permissions-resume"}
        ]
        
        createdInstances = []
        
        FOR EACH config IN buttonConfigs:
            BEGIN
                // Step 1: Send HTTP POST request
                response = sendPOST("/api/claude/instances", {
                    command: config.command,
                    instanceType: config.type,
                    usePty: TRUE
                })
                
                ASSERT(response.status == 201)
                ASSERT(response.data.success == TRUE)
                ASSERT(response.data.instance.id.matches(/^claude-\d+$/))
                
                instanceId = response.data.instance.id
                createdInstances.append(instanceId)
                
                // Step 2: Verify process spawning
                WAIT_FOR_CONDITION(() => {
                    return getProcessInfo(instanceId) != null
                }, timeout=3000)
                
                processInfo = getProcessInfo(instanceId)
                ASSERT(processInfo.pid > 0)
                ASSERT(processInfo.instanceType == config.type)
                
                // Step 3: Verify working directory resolution
                expectedDir = resolveExpectedDirectory(config.type)
                ASSERT(processInfo.workingDirectory == expectedDir)
                
                // Step 4: Verify status broadcasting
                WAIT_FOR_SSE_MESSAGE(instanceId, (message) => {
                    return message.type == "instance:status" AND message.status == "running"
                }, timeout=5000)
                
                // Step 5: Verify terminal connection
                sseConnection = establishSSEConnection(instanceId)
                ASSERT(sseConnection.isConnected == TRUE)
                
                // Step 6: Verify basic I/O
                sendInput(instanceId, "echo 'test'\n")
                output = waitForOutput(instanceId, timeout=2000)
                ASSERT(output.contains("test"))
                ASSERT(output.isReal == TRUE)
            END
        
        // Cleanup all created instances
        FOR EACH instanceId IN createdInstances:
            terminateInstance(instanceId)
        
        RETURN testResultSummary()
    END
END FUNCTION
```

#### 3.2 Error Recovery Scenario Testing

```pseudocode
FUNCTION testErrorRecoveryScenarios():
    BEGIN
        // Scenario 1: Authentication Failure Recovery
        mockAuthenticationFailure()
        response = sendPOST("/api/claude/instances", {command: ["claude"], instanceType: "prod"})
        ASSERT(response.status == 500)
        ASSERT(response.data.success == FALSE)
        ASSERT(response.data.error.contains("authentication"))
        
        restoreAuthentication()
        response = sendPOST("/api/claude/instances", {command: ["claude"], instanceType: "prod"})
        ASSERT(response.status == 201)
        
        // Scenario 2: Directory Permission Recovery
        mockDirectoryPermissionError("/workspaces/agent-feed/prod")
        response = sendPOST("/api/claude/instances", {command: ["claude"], instanceType: "prod"})
        ASSERT(response.status == 201)  // Should fallback to base directory
        
        instanceId = response.data.instance.id
        processInfo = getProcessInfo(instanceId)
        ASSERT(processInfo.workingDirectory == "/workspaces/agent-feed")  // Fallback directory
        
        // Scenario 3: SSE Connection Reset Recovery
        sseConnection = establishSSEConnection(instanceId)
        ASSERT(sseConnection.isConnected == TRUE)
        
        // Simulate connection reset
        simulateConnectionReset(sseConnection)
        ASSERT(sseConnection.isConnected == FALSE)
        
        // Verify automatic reconnection
        WAIT_FOR_CONDITION(() => {
            return sseConnection.isConnected == TRUE
        }, timeout=5000)
        
        // Scenario 4: Process Spawn Failure Recovery
        mockProcessSpawnFailure()
        response = sendPOST("/api/claude/instances", {command: ["invalid-command"], instanceType: "test"})
        ASSERT(response.status == 500)
        ASSERT(response.data.success == FALSE)
        
        // Verify no orphaned processes or connections
        ASSERT(getOrphanedProcessCount() == 0)
        ASSERT(getOrphanedConnectionCount() == 0)
        
        terminateInstance(instanceId)
        RETURN testResultSummary()
    END
END FUNCTION
```

### 4. E2E TEST EXECUTION ALGORITHM

```pseudocode
FUNCTION executeE2ETestSuite():
    BEGIN
        browser = initializeHeadlessBrowser()
        
        // Navigate to application
        browser.navigateTo("http://localhost:5173")
        WAIT_FOR_ELEMENT(".claude-instance-manager", timeout=10000)
        
        // Test all 4 launch buttons
        buttons = [
            {selector: ".btn-prod", expectedType: "prod"},
            {selector: ".btn-skip-perms", expectedType: "skip-permissions"},
            {selector: ".btn-skip-perms-c", expectedType: "skip-permissions-c"},
            {selector: ".btn-skip-perms-resume", expectedType: "skip-permissions-resume"}
        ]
        
        FOR EACH button IN buttons:
            BEGIN
                // Click launch button
                browser.click(button.selector)
                
                // Wait for instance to appear in list
                WAIT_FOR_ELEMENT(".instance-item", timeout=10000)
                
                // Verify instance status progression
                WAIT_FOR_ELEMENT_TEXT(".status-text", "starting", timeout=2000)
                WAIT_FOR_ELEMENT_TEXT(".status-text", "running", timeout=8000)
                
                // Select instance
                browser.click(".instance-item")
                
                // Wait for terminal connection
                WAIT_FOR_ELEMENT(".output-area pre", timeout=5000)
                
                // Test terminal input
                browser.type(".input-field", "echo 'E2E test'")
                browser.press("Enter")
                
                // Wait for real output
                WAIT_FOR_ELEMENT_TEXT_CONTAINS(".output-area pre", "E2E test", timeout=5000)
                
                // Verify no mock responses
                outputText = browser.getText(".output-area pre")
                ASSERT(NOT outputText.contains("[MOCK]"))
                ASSERT(NOT outputText.contains("Simulated"))
                
                // Terminate instance
                browser.click(".btn-terminate")
                WAIT_FOR_ELEMENT_NOT_EXISTS(".instance-item", timeout=5000)
            END
        
        // Test concurrent instances
        browser.click(".btn-prod")
        browser.click(".btn-skip-perms")
        
        WAIT_FOR_CONDITION(() => {
            return browser.getElements(".instance-item").length == 2
        }, timeout=10000)
        
        // Verify both instances are running
        instanceElements = browser.getElements(".instance-item")
        FOR EACH element IN instanceElements:
            statusText = element.getText(".status-text")
            ASSERT(statusText == "running")
        
        // Cleanup
        browser.clickAll(".btn-terminate")
        browser.close()
        
        RETURN testResultSummary()
    END
END FUNCTION
```

### 5. PERFORMANCE TESTING ALGORITHM

```pseudocode
FUNCTION executePerformanceTestSuite():
    BEGIN
        performanceMetrics = NEW PerformanceMetrics()
        
        // Test 1: Instance Creation Performance
        startTime = NOW()
        FOR i = 1 TO 5:
            instanceId = createInstance("skip-permissions")
            WAIT_FOR_STATUS(instanceId, "running")
        endTime = NOW()
        
        avgCreationTime = (endTime - startTime) / 5
        ASSERT(avgCreationTime < 3000)  // < 3 seconds per instance
        performanceMetrics.recordCreationTime(avgCreationTime)
        
        // Test 2: Terminal Input Response Time
        instanceId = createInstance("skip-permissions")
        
        FOR i = 1 TO 20:
            startTime = NOW()
            sendInput(instanceId, "echo 'response test'\n")
            waitForOutput(instanceId, "response test")
            endTime = NOW()
            
            responseTime = endTime - startTime
            ASSERT(responseTime < 100)  // < 100ms
            performanceMetrics.recordResponseTime(responseTime)
        
        // Test 3: Concurrent Load Testing
        concurrentInstances = []
        
        startTime = NOW()
        FOR i = 1 TO 10:
            instanceId = createInstance("skip-permissions")
            concurrentInstances.append(instanceId)
        
        // Wait for all instances to be running
        FOR EACH instanceId IN concurrentInstances:
            WAIT_FOR_STATUS(instanceId, "running", timeout=10000)
        endTime = NOW()
        
        concurrentLoadTime = endTime - startTime
        ASSERT(concurrentLoadTime < 30000)  // < 30 seconds for 10 instances
        performanceMetrics.recordConcurrentLoadTime(concurrentLoadTime)
        
        // Test 4: Memory Usage Validation
        initialMemory = getMemoryUsage()
        
        // Create and destroy instances repeatedly
        FOR i = 1 TO 50:
            instanceId = createInstance("skip-permissions")
            WAIT_FOR_STATUS(instanceId, "running")
            terminateInstance(instanceId)
            WAIT_FOR_CLEANUP(instanceId)
        
        finalMemory = getMemoryUsage()
        memoryLeak = finalMemory - initialMemory
        ASSERT(memoryLeak < 50MB)  // < 50MB memory leak tolerance
        
        // Cleanup remaining instances
        FOR EACH instanceId IN concurrentInstances:
            terminateInstance(instanceId)
        
        RETURN performanceMetrics.generateReport()
    END
END FUNCTION
```

### 6. TEST DATA STRUCTURES

```pseudocode
STRUCTURE TestResult:
    testName: STRING
    status: ENUM(PASS, FAIL, SKIP)
    duration: INTEGER
    errorMessage: STRING
    assertionCount: INTEGER
    coverage: FLOAT
END STRUCTURE

STRUCTURE RegressionReport:
    totalTests: INTEGER
    passedTests: INTEGER
    failedTests: INTEGER
    skippedTests: INTEGER
    overallCoverage: FLOAT
    criticalFailures: LIST<TestResult>
    performanceMetrics: PerformanceMetrics
    regressionDetected: BOOLEAN
END STRUCTURE

STRUCTURE PerformanceMetrics:
    avgInstanceCreationTime: FLOAT
    avgTerminalResponseTime: FLOAT
    maxConcurrentInstances: INTEGER
    memoryUsageProfile: LIST<MemorySnapshot>
    sseConnectionStability: FLOAT
END STRUCTURE
```

---

**PSEUDOCODE COMPLETION STATUS:** ✅ APPROVED
**NEXT PHASE:** Architecture Design (Phase A)
**KEY INSIGHT:** Comprehensive test algorithms ensure zero regression tolerance