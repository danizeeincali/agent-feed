# SPARC PSEUDOCODE PHASE - Test Algorithm Design

## Core Test Algorithm Architecture

### 1. Button Click → Instance Creation Algorithm

```pseudocode
ALGORITHM: ValidateButtonClickToInstanceCreation
INPUT: buttonType (prod|interactive|skip-permissions|skip-permissions-c)
OUTPUT: ValidationResult

BEGIN
    // Phase 1: UI Interaction
    CLICK button[data-instance-type=buttonType]
    EXPECT loading_animation.isActive = TRUE
    EXPECT button.disabled = TRUE
    
    // Phase 2: Backend API Call
    MONITOR API_CALL POST /api/claude/instances
    REQUEST_BODY = { 
        type: buttonType,
        command: CLAUDE_COMMANDS[buttonType],
        workingDirectory: DirectoryResolver.resolve(buttonType)
    }
    
    // Phase 3: Process Creation Verification
    WAIT_FOR response = API_RESPONSE
    EXPECT response.status = 200
    EXPECT response.body.instanceId EXISTS
    EXPECT response.body.pid > 0
    
    // Phase 4: Instance State Validation
    VERIFY activeProcesses.has(response.body.instanceId) = TRUE
    VERIFY process.pid = response.body.pid
    VERIFY process.status = 'running'
    
    // Phase 5: UI State Update
    EXPECT loading_animation.isActive = FALSE
    EXPECT button.disabled = FALSE
    EXPECT instanceList.includes(response.body.instanceId) = TRUE
    
    RETURN ValidationResult(SUCCESS, instanceId)
END
```

### 2. Command Input → Processing Algorithm

```pseudocode
ALGORITHM: ValidateCommandProcessingFlow
INPUT: instanceId, command_string
OUTPUT: ProcessingResult

BEGIN
    // Phase 1: WebSocket Connection Verification
    VERIFY webSocket.readyState = OPEN
    VERIFY webSocket.url = `ws://localhost:3000/terminal/${instanceId}`
    
    // Phase 2: Command Input Simulation
    SIMULATE_USER_INPUT command_string + '\r'
    MESSAGE = { type: 'input', data: command_string + '\r', timestamp: NOW() }
    webSocket.send(JSON.stringify(MESSAGE))
    
    // Phase 3: Loading Animation Trigger
    EXPECT loading_animation.isActive = TRUE
    EXPECT loading_animation.message = "Processing command..."
    
    // Phase 4: Real Claude Processing
    MONITOR backend_process = activeProcesses.get(instanceId)
    VERIFY backend_process.stdin.write(command_string + '\r')
    
    // Phase 5: Output Capture and Parsing
    LISTEN_FOR webSocket.onmessage
    WHILE message.type !== 'complete' AND timeout < 30000ms:
        IF message.type = 'data':
            parsed_output = ToolCallFormatter.parseOutput(message.data)
            EXPECT parsed_output.isValid = TRUE
            ACCUMULATE total_output += message.data
        ELIF message.type = 'tool_call':
            EXPECT message.data.name EXISTS
            EXPECT message.data.parameters EXISTS
            VERIFY ToolCallVisualization.format(message.data)
        END_IF
    END_WHILE
    
    // Phase 6: Completion Verification
    EXPECT loading_animation.isActive = FALSE
    EXPECT total_output.length > 0
    EXPECT no_error_messages_present = TRUE
    
    RETURN ProcessingResult(SUCCESS, total_output, parsed_output)
END
```

### 3. Permission Request Handling Algorithm

```pseudocode
ALGORITHM: ValidatePermissionRequestFlow
INPUT: instanceId, permission_trigger_command
OUTPUT: PermissionFlowResult

BEGIN
    // Phase 1: Trigger Permission Request
    SEND_COMMAND instanceId, permission_trigger_command
    
    // Phase 2: Permission Dialog Detection
    WAIT_FOR webSocket.message WHERE message.type = 'permission_request'
    EXPECT permission_request.isActive = TRUE
    EXPECT permission_dialog.visible = TRUE
    EXPECT permission_dialog.message.length > 0
    
    // Phase 3: UI Overlay Validation
    VERIFY overlay_element = document.querySelector('.permission-dialog')
    EXPECT overlay_element.style.display !== 'none'
    EXPECT overlay_element.textContent.includes(message.text)
    
    // Phase 4: User Response Options Test
    FOR EACH response IN ['Y', 'N', 'D']:
        // Test keyboard input
        SIMULATE_KEY_PRESS response
        EXPECT response_captured = TRUE
        
        // Test UI button click
        button = document.querySelector(`[data-response="${response}"]`)
        CLICK button
        EXPECT click_handled = TRUE
    END_FOR
    
    // Phase 5: Response Processing
    SEND_PERMISSION_RESPONSE 'Y'  // Test positive case
    MESSAGE = { type: 'permission_response', action: 'yes', requestId: request.id }
    webSocket.send(JSON.stringify(MESSAGE))
    
    // Phase 6: Dialog Cleanup
    EXPECT permission_request.isActive = FALSE
    EXPECT permission_dialog.visible = FALSE
    EXPECT command_processing_resumes = TRUE
    
    RETURN PermissionFlowResult(SUCCESS, response_handled)
END
```

### 4. Tool Call Visualization Algorithm

```pseudocode
ALGORITHM: ValidateToolCallVisualization
INPUT: claude_output_with_tool_calls
OUTPUT: VisualizationResult

BEGIN
    // Phase 1: Tool Call Detection
    tool_calls = ToolCallDetector.extract(claude_output)
    EXPECT tool_calls.length > 0
    
    FOR EACH tool_call IN tool_calls:
        // Phase 2: Tool Call Parsing
        VERIFY tool_call.name EXISTS
        VERIFY tool_call.parameters IS_VALID_JSON
        VERIFY tool_call.timestamp EXISTS
        
        // Phase 3: Bullet Point Formatting
        formatted_call = ToolCallFormatter.formatAsBulletPoint(tool_call)
        EXPECT formatted_call.startsWith('•')
        EXPECT formatted_call.includes(tool_call.name)
        EXPECT formatted_call.includes('parameters')
        
        // Phase 4: Terminal Integration
        terminal_output = terminal.getLatestOutput()
        EXPECT terminal_output.includes(formatted_call)
        EXPECT terminal_output.hasProperColorCoding()
        
        // Phase 5: Status Tracking
        status = ToolCallStatusManager.getStatus(tool_call.id)
        EXPECT status IN ['pending', 'executing', 'completed', 'failed']
        
        // Phase 6: Real-time Updates
        MONITOR status_changes = ToolCallStatusManager.subscribe(tool_call.id)
        EXPECT status_updates.length > 0
        EXPECT final_status IN ['completed', 'failed']
    END_FOR
    
    RETURN VisualizationResult(SUCCESS, formatted_calls)
END
```

### 5. Error Handling and Edge Cases Algorithm

```pseudocode
ALGORITHM: ValidateErrorHandlingEdgeCases
OUTPUT: ErrorHandlingResult

BEGIN
    edge_cases = [
        // Network interruption
        { scenario: 'websocket_disconnect', test: DisconnectWebSocket },
        // Invalid commands  
        { scenario: 'malformed_command', test: SendMalformedCommand },
        // Process crashes
        { scenario: 'claude_process_crash', test: KillClaudeProcess },
        // Concurrent requests
        { scenario: 'concurrent_commands', test: SendMultipleCommands },
        // Memory exhaustion
        { scenario: 'large_output', test: GenerateLargeOutput },
        // Permission timeouts
        { scenario: 'permission_timeout', test: IgnorePermissionRequest }
    ]
    
    results = []
    
    FOR EACH edge_case IN edge_cases:
        // Setup clean state
        RESET_SYSTEM_STATE()
        instance_id = CREATE_TEST_INSTANCE()
        
        TRY:
            // Execute edge case
            result = edge_case.test(instance_id)
            
            // Verify graceful handling
            EXPECT system_remains_stable = TRUE
            EXPECT error_messages_displayed = TRUE  
            EXPECT recovery_possible = TRUE
            EXPECT no_memory_leaks = TRUE
            
            results.append(EdgeCaseResult(edge_case.scenario, SUCCESS))
            
        CATCH error:
            results.append(EdgeCaseResult(edge_case.scenario, FAILED, error))
            
        FINALLY:
            CLEANUP_TEST_INSTANCE(instance_id)
        END_TRY
    END_FOR
    
    RETURN ErrorHandlingResult(results)
END
```

## Algorithm Optimization Considerations

### Performance Complexity Analysis

1. **Button Click Flow**: O(1) - Single instance creation
2. **Command Processing**: O(n) where n = output length  
3. **Permission Handling**: O(1) - Single request/response
4. **Tool Call Visualization**: O(m) where m = number of tool calls
5. **Error Handling**: O(k) where k = number of edge cases

### Memory Requirements

- WebSocket connection buffers: ~1MB per instance
- Tool call status tracking: ~10KB per call
- Output parsing: ~500KB for large responses
- Animation state: ~1KB per component

### Timeout Specifications

- Instance creation: 10 seconds max
- Command processing: 60 seconds max (for complex Claude operations)
- Permission requests: 30 seconds max
- WebSocket reconnection: 5 seconds max
- Tool call completion: 120 seconds max

### Concurrency Constraints

- Maximum concurrent instances: 10
- Maximum concurrent commands per instance: 1
- Maximum WebSocket connections: 50
- Maximum tool calls in progress: 100

## Integration Points

1. **Frontend ↔ Backend**: HTTP API + WebSocket protocol
2. **Backend ↔ Claude CLI**: Process spawning + PTY I/O
3. **Terminal ↔ WebSocket**: Real-time bidirectional messaging  
4. **Parser ↔ Formatter**: Tool call detection + visualization
5. **State ↔ UI**: React state management + DOM updates

Next phase: SPARC ARCHITECTURE for comprehensive system mapping.