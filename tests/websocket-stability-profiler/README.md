# WebSocket Connection Stability Profiler

A comprehensive profiling and analysis tool for diagnosing WebSocket connection stability issues, with specialized detection for the common 30-second timeout pattern.

## 🎯 Key Features

- **Connection Lifetime Tracking**: Monitor individual connection lifecycles
- **30-Second Pattern Detection**: Specialized analysis for timeout patterns
- **Resource Usage Monitoring**: Track memory, CPU, and connection cleanup
- **API Call Correlation**: Identify connections between API calls and drops
- **Real-time Dashboard**: Live monitoring with console and web interfaces
- **Root Cause Analysis**: Automated diagnosis with actionable recommendations
- **Mock Server**: Built-in WebSocket server for controlled testing

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run quick profiling session (1 minute)
npm run profile-quick

# Run extended profiling session (5 minutes)
npm run profile-extended

# Start with real-time dashboard
npm run dashboard

# Run mock server only
npm run mock-server
```

## 📊 Usage Examples

### Basic Profiling

```javascript
const WebSocketStabilityProfiler = require('./src/index.js');

const profiler = new WebSocketStabilityProfiler({
    testDuration: 120000,           // 2 minutes
    maxConnections: 10,             // Test 10 concurrent connections
    enableThirtySecondTimeout: true, // Simulate 30s timeout issue
    enableDashboard: true           // Show real-time dashboard
});

const analysis = await profiler.run();
console.log('Analysis completed:', analysis.summary);
```

### Test Against Existing Server

```javascript
const profiler = new WebSocketStabilityProfiler({
    serverUrl: 'wss://your-websocket-server.com',
    testDuration: 300000,  // 5 minutes
    maxConnections: 15,
    enableDashboard: true,
    enableWebInterface: true
});

await profiler.run();
```

### Mock Server Configuration

```javascript
const MockWebSocketServer = require('./src/MockWebSocketServer');

const mockServer = new MockWebSocketServer({
    port: 8080,
    enableThirtySecondTimeout: true,
    thirtySecondTimeoutRate: 0.4,    // 40% of connections
    enableRandomDrops: true,
    randomDropRate: 0.1,             // 10% random drops
    enableMemoryLeak: true,
    enableSlowResponses: true
});

await mockServer.start();
```

## 📈 What It Detects

### Connection Patterns
- **30-Second Timeouts**: Detects the common keepalive timeout pattern
- **Early Failures**: Connections that fail within first 10 seconds
- **Random Drops**: Unexpected disconnections at various times
- **Long-lived Success**: Connections that maintain stability

### Resource Issues
- **Memory Leaks**: Tracks memory growth during connection handling
- **Resource Cleanup**: Monitors proper disposal of connection objects
- **CPU Usage**: Measures processing overhead
- **File Descriptor Leaks**: Detects unclosed connections

### API Correlations
- **Call Timing**: Correlates API calls with connection drops
- **Payload Impact**: Analyzes effect of message size on stability
- **Response Delays**: Measures impact of slow server responses

## 📋 Analysis Reports

The profiler generates comprehensive reports:

### 1. Executive Summary (`executive-summary-*.txt`)
- Key findings and metrics
- Priority action items
- Impact assessment

### 2. Detailed Analysis (`stability-analysis-*.json`)
- Complete raw data
- Statistical analysis
- Pattern detection results

### 3. Markdown Report (`stability-report-*.md`)
- Human-readable technical report
- Root cause analysis
- Implementation recommendations

### 4. CSV Data (`connection-stats-*.csv`)
- Individual connection data
- For spreadsheet analysis

## 🔍 Real-Time Dashboard

The dashboard provides live monitoring:

```
╔══════════════════════════════════════════════════════════════════════╗
║                    WebSocket Stability Profiler                     ║
╠══════════════════════════════════════════════════════════════════════╣
║ Uptime: 2m 34s           │ Performance Score: ● 85                  ║
╠══════════════════════════════════════════════════════════════════════╣
║ CONNECTION STATUS                                                    ║
║ Active: 8   │ Total: 23   │ Failure Rate: 12.5%                    ║
║ Avg Lifetime: 45.2s      │ 30s Failures: 3                        ║
╠══════════════════════════════════════════════════════════════════════╣
║ PATTERN DETECTION                                                    ║
║ 🚨 3 connections dropped at ~30s                                    ║
║ ⏱️  Short avg lifetime: 45s                                         ║
╠══════════════════════════════════════════════════════════════════════╣
║ ALERTS                                                               ║
║ ⏰ 30s timeout pattern: 3 failures                                  ║
╚══════════════════════════════════════════════════════════════════════╝
```

## 🛠️ Common Issues & Solutions

### 30-Second Timeout Pattern

**Problem**: Connections consistently drop at ~30 seconds
**Cause**: WebSocket keepalive timeout or load balancer timeout
**Solution**: Implement client-side ping/pong keepalive

```javascript
// Recommended keepalive implementation
class WebSocketWithKeepalive {
    constructor(url) {
        this.ws = new WebSocket(url);
        this.pingInterval = null;
        
        this.ws.onopen = () => {
            this.startKeepalive();
        };
    }
    
    startKeepalive() {
        this.pingInterval = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, 20000); // Ping every 20 seconds
    }
}
```

### Memory Leaks

**Problem**: Memory grows continuously during connection handling
**Cause**: Event listeners not removed, connection objects not cleaned up
**Solution**: Implement proper resource disposal

```javascript
// Proper cleanup implementation
class ManagedWebSocket {
    cleanup() {
        // Remove event listeners
        this.ws.removeEventListener('message', this.boundHandlers.onMessage);
        this.ws.removeEventListener('error', this.boundHandlers.onError);
        this.ws.removeEventListener('close', this.boundHandlers.onClose);
        
        // Clear timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        
        // Close connection
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }
}
```

### High Failure Rate

**Problem**: Many connections fail to establish or maintain
**Cause**: Server overload, network issues, or connection handling bugs
**Solution**: Implement exponential backoff retry logic

```javascript
// Retry logic with exponential backoff
class ReliableWebSocket {
    scheduleRetry() {
        this.retryCount++;
        const delay = Math.min(
            this.baseDelay * Math.pow(2, this.retryCount - 1),
            this.maxDelay
        );
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }
}
```

## 🧪 Testing Scenarios

### Scenario 1: Production Health Check
```bash
# Test existing production WebSocket endpoint
WEBSOCKET_URL=wss://your-prod-server.com npm run profile-extended
```

### Scenario 2: Load Testing
```javascript
const profiler = new WebSocketStabilityProfiler({
    serverUrl: 'wss://staging.example.com',
    testDuration: 600000,  // 10 minutes
    maxConnections: 50,    // Heavy load
    enableDashboard: true
});
```

### Scenario 3: Timeout Investigation
```javascript
const profiler = new WebSocketStabilityProfiler({
    // Use mock server with aggressive timeout simulation
    enableThirtySecondTimeout: true,
    thirtySecondTimeoutRate: 0.8,  // 80% timeout rate
    testDuration: 180000,          // 3 minutes
    maxConnections: 20
});
```

## 📊 Performance Metrics

The profiler tracks comprehensive metrics:

- **Connection Success Rate**: Percentage of successful connections
- **Average Lifetime**: Mean connection duration before close
- **Failure Distribution**: Histogram of failure times
- **Memory Usage**: RSS, heap usage, and growth patterns
- **API Call Impact**: Correlation between API calls and drops
- **Resource Cleanup**: Proper disposal verification
- **Network I/O**: Bytes sent/received per connection

## 🔧 Configuration Options

### Profiler Options
```javascript
{
    serverUrl: 'ws://localhost:8080',     // Target WebSocket server
    testDuration: 300000,                 // Test duration in ms
    maxConnections: 10,                   // Concurrent connections
    samplingInterval: 1000,               // Metrics sampling rate
    enableDashboard: true,                // Real-time dashboard
    enableConsoleOutput: true,            // Console logging
    enableWebInterface: false,            // Web dashboard
    outputDirectory: './reports'          // Report output directory
}
```

### Mock Server Options
```javascript
{
    port: 8080,
    enableThirtySecondTimeout: true,      // Simulate 30s timeouts
    thirtySecondTimeoutRate: 0.3,         // 30% timeout rate
    enableRandomDrops: true,              // Random disconnections
    randomDropRate: 0.1,                  // 10% random drop rate
    enableMemoryLeak: false,              // Simulate memory leaks
    enableSlowResponses: true,            // Simulate slow API responses
    maxConnections: 100                   // Connection limit
}
```

## 🎯 Expected Results

After running the profiler, you'll get:

1. **Root Cause Identification**: Specific reasons for connection drops
2. **Actionable Recommendations**: Code examples and implementation steps
3. **Performance Metrics**: Quantified stability measurements
4. **Pattern Analysis**: Detection of timing-based failure patterns
5. **Resource Impact**: Memory and CPU usage analysis

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Issue**: "EADDRINUSE" error when starting mock server
**Solution**: Change the port in configuration or kill existing process

**Issue**: High memory usage during profiling
**Solution**: Reduce `maxConnections` or `testDuration`

**Issue**: No patterns detected in short tests
**Solution**: Increase `testDuration` to at least 2-3 minutes

### Getting Help

- Check the generated reports for detailed analysis
- Review the console output for real-time insights
- Examine the CSV data for raw connection statistics
- Use the dashboard for live monitoring

---

**Built for diagnosing WebSocket stability issues with precision and actionable insights.**