# Architecture Decision Record: Claude Code Integration

## Status
**Proposed** - Architecture design phase

## Context

The Avi Direct Message system requires integration with Claude Code instances to provide real AI assistance capabilities instead of mock responses. The current implementation uses HTTP-only communication with placeholder responses, but users need actual Claude Code functionality.

### Current State Analysis
- **AviDirectChatReal.tsx**: Frontend component making HTTP requests to `/api/claude-instances`
- **Missing Backend**: No actual Claude Process Manager implementation found
- **WebSocket Infrastructure**: Partial WebSocket setup but not integrated with Claude
- **Security Configuration**: Basic dangerous permissions setup in `claude.config.js`

### Requirements
1. **Real Claude Integration**: Connect to actual Claude Code binary instances
2. **Real-time Communication**: Stream responses as they generate
3. **Instance Management**: Create, monitor, and cleanup Claude instances
4. **Error Handling**: Robust error recovery and user feedback
5. **Performance**: Handle multiple concurrent conversations
6. **Security**: Proper sandboxing and permission management

## Decision

### Architecture Choice: Hybrid HTTP + WebSocket Architecture

We will implement a hybrid architecture combining HTTP for control operations and WebSocket for real-time data streaming:

#### Core Components
1. **ClaudeProcessManager**: Core service managing Claude binary lifecycle
2. **WebSocketManager**: Real-time communication layer
3. **API Gateway**: RESTful interface for instance management
4. **PTY Integration**: Interactive terminal session management

#### Communication Flow
1. **Instance Creation**: HTTP POST to create Claude instances
2. **Message Communication**: HTTP POST for message sending + WebSocket for response streaming
3. **Status Monitoring**: WebSocket for real-time status updates
4. **Error Handling**: Both HTTP and WebSocket error channels

### Technical Decisions

#### 1. Process Management Strategy
**Decision**: Use Node.js `child_process.spawn()` with PTY integration
**Rationale**:
- Direct control over Claude binary lifecycle
- Interactive session support
- Stream-based I/O for real-time responses
- Process isolation and resource control

#### 2. Communication Protocol
**Decision**: Hybrid HTTP + WebSocket
**Rationale**:
- HTTP for reliable control operations (create, configure, status)
- WebSocket for real-time streaming and status updates
- Fallback to HTTP-only when WebSocket unavailable
- Clear separation of concerns

#### 3. State Management
**Decision**: In-memory state with optional persistence
**Rationale**:
- Fast access to instance status and metadata
- Optional Redis/Database integration for session persistence
- Stateless design for horizontal scaling

#### 4. Error Recovery Strategy
**Decision**: Multi-layered recovery with circuit breaker pattern
**Rationale**:
- Process-level: Automatic restart on crash
- Communication-level: Reconnection logic
- Application-level: Graceful degradation
- Circuit breaker prevents cascade failures

#### 5. Security Model
**Decision**: Configurable sandbox with permission escalation
**Rationale**:
- Default: Restricted permissions with file system sandboxing
- Option: Dangerous permissions for development/debugging
- User context isolation
- Resource limits enforcement

## Consequences

### Benefits
1. **Real Claude Integration**: Actual AI responses instead of mocks
2. **Real-time UX**: Streaming responses improve user experience
3. **Scalability**: Instance-based architecture scales with demand
4. **Maintainability**: Clear separation between communication layers
5. **Reliability**: Multiple error recovery mechanisms

### Trade-offs
1. **Complexity**: More complex than HTTP-only approach
2. **Resource Usage**: Each instance consumes system resources
3. **Operational Overhead**: Process monitoring and management required
4. **Security Concerns**: Binary execution requires careful sandboxing

### Risks and Mitigations

#### High Risk: Resource Exhaustion
- **Risk**: Uncontrolled instance creation consuming system resources
- **Mitigation**: Instance limits, resource monitoring, automatic cleanup

#### High Risk: Process Instability
- **Risk**: Claude binary crashes affecting user sessions
- **Mitigation**: Process monitoring, automatic restart, session recovery

#### Medium Risk: WebSocket Connection Issues
- **Risk**: Network issues disrupting real-time communication
- **Mitigation**: Reconnection logic, HTTP fallback, connection pooling

#### Medium Risk: Security Vulnerabilities
- **Risk**: Unsafe execution of Claude with elevated permissions
- **Mitigation**: Sandboxing, input validation, audit logging

## Implementation Plan

### Phase 1: Core Infrastructure
1. Implement ClaudeProcessManager service
2. Create basic instance lifecycle management
3. Establish HTTP API endpoints
4. Basic error handling and logging

### Phase 2: WebSocket Integration
1. Implement WebSocketManager
2. Real-time message streaming
3. Status broadcasting
4. Connection management

### Phase 3: Production Hardening
1. Enhanced error recovery
2. Resource monitoring and limits
3. Security hardening
4. Performance optimization

### Phase 4: Advanced Features
1. Session persistence
2. Multi-user support
3. Advanced monitoring
4. Operational tooling

## Alternative Approaches Considered

### Alternative 1: WebSocket-Only Architecture
**Rejected**: Less reliable for control operations, more complex error handling

### Alternative 2: HTTP-Only with Polling
**Rejected**: Poor user experience, inefficient resource usage

### Alternative 3: Server-Sent Events (SSE)
**Rejected**: Limited bidirectional communication, WebSocket provides more flexibility

### Alternative 4: Message Queue Integration
**Considered for Future**: Could enhance scalability but adds complexity

## Success Metrics

### Technical Metrics
- Instance creation time: < 5 seconds
- Message response time: < 2 seconds
- WebSocket latency: < 100ms
- Error recovery time: < 10 seconds
- Concurrent instance capacity: 50+

### User Experience Metrics
- Real-time response streaming
- Connection reliability: 99%+
- Error rate: < 1%
- User satisfaction with AI responses

### Operational Metrics
- System resource usage within limits
- Instance cleanup effectiveness
- Monitoring and alerting coverage
- Deployment success rate: 100%

## Next Steps

1. **Technical Review**: Architecture review with development team
2. **Prototype Development**: Build proof-of-concept implementation
3. **Security Review**: Security assessment of binary execution model
4. **Performance Testing**: Load testing with multiple concurrent instances
5. **Implementation**: Full system implementation following phased approach

## References

- [Claude Code Documentation](https://docs.anthropic.com/claude/reference)
- [WebSocket API Standards](https://tools.ietf.org/html/rfc6455)
- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

---

**Decision Date**: 2024-01-15
**Stakeholders**: System Architecture Team, Development Team, Security Team
**Review Date**: 2024-02-15