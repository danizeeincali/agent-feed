# SPARC Coordinator Agent - Terminal CORS Fix Methodology

## SPARC Phase Implementation

### S - Specification
**Terminal CORS Requirements:**
- WebSocket connections must succeed from all localhost variations
- No "Not allowed by CORS" errors in any scenario
- Support for HTTP/HTTPS, IPv4/IPv6, standard dev ports (3000, 3001, 5173)
- Backward compatibility with existing terminal functionality
- Production-ready security with development flexibility

### P - Pseudocode
**High-Level Algorithm:**
```
function fixTerminalCORS() {
  // Comprehensive origin allowlist
  origins = [
    all_localhost_variants,
    all_protocol_variations(http, https),
    all_port_combinations(3000, 3001, 5173),
    ipv4_and_ipv6_addresses
  ]
  
  // WebSocket-specific methods
  methods = [GET, POST, OPTIONS, HEAD, PUT, DELETE]
  
  // Enhanced headers for WebSocket support
  headers = [standard_cors_headers, websocket_specific_headers]
  
  // Development mode fallback
  if (development_mode) {
    allowlist.add(unknown_origins)
  }
  
  // Apply to both Socket.IO and Express CORS
  configure_socketio_cors(origins, methods, headers)
  configure_express_cors(origins, methods, headers)
  
  // Enhanced allowRequest with logging
  implement_detailed_cors_validation()
}
```

### A - Architecture
**System Components:**
1. **Socket.IO CORS Configuration** - Primary WebSocket CORS handling
2. **Express CORS Middleware** - HTTP request CORS handling  
3. **Enhanced allowRequest Function** - Custom validation with logging
4. **Development Mode Fallback** - Flexible origin handling for dev
5. **Comprehensive Origin Allowlist** - All localhost/development variations
6. **WebSocket-Specific Headers** - Proper protocol support

### R - Refinement
**TDD Implementation:**
1. **RED Phase** - Write failing tests for current CORS issues
2. **GREEN Phase** - Implement minimal fixes to pass tests  
3. **REFACTOR Phase** - Optimize configuration for performance/security

**Refinement Areas:**
- Origin matching optimization
- Header minimization for security
- Logging level configuration
- Performance impact assessment

### C - Completion
**Integration Checklist:**
- ✅ Socket.IO CORS configuration updated
- ✅ Express CORS middleware aligned
- ✅ Enhanced allowRequest function implemented
- ✅ Comprehensive origin allowlist defined
- ✅ TDD test suite created
- ✅ Playwright E2E tests implemented
- ✅ NLD pattern analysis documented
- ✅ Regression prevention tests automated

## SPARC Success Criteria
1. **Functional**: Terminal connects without CORS errors
2. **Performance**: Connection time < 2 seconds  
3. **Reliability**: 99%+ WebSocket connection success rate
4. **Security**: No unauthorized origins allowed in production
5. **Maintainability**: Clear configuration with comprehensive logging
6. **Testability**: Full test coverage with automated regression prevention

## SPARC Validation Protocol
1. **Unit Tests**: CORS configuration validation
2. **Integration Tests**: WebSocket connection establishment
3. **E2E Tests**: Full terminal functionality workflow
4. **Performance Tests**: Connection timing and stability
5. **Security Tests**: Origin validation and authorization
6. **Regression Tests**: Prevention of future CORS issues