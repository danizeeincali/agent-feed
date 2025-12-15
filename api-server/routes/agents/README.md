# Agent Data API Template and Guidelines

## Overview
This directory contains data API endpoints for agents in the agent-feed ecosystem. Each agent can expose a standardized data API that provides structured data for frontend consumption.

## Standard Data Response Format

All agent data APIs must return a consistent response structure:

```json
{
  "success": true,
  "data": {
    // Agent-specific data structure
  },
  "metadata": {
    "timestamp": "2025-10-04T12:00:00.000Z",
    "agentId": "agent-name",
    "version": "1.0.0"
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error category",
  "message": "Detailed error message",
  "metadata": {
    "timestamp": "2025-10-04T12:00:00.000Z",
    "agentId": "agent-name"
  }
}
```

## Error Handling Patterns

### 1. Missing Data Files
When data files don't exist, return empty data structure gracefully:

```javascript
if (!fs.existsSync(dataPath)) {
  return res.json({
    success: true,
    data: getEmptyDataStructure(),
    metadata: {
      timestamp: new Date().toISOString(),
      agentId: 'agent-name',
      note: 'No data file found, returning empty structure'
    }
  });
}
```

### 2. Invalid Data Format
When data parsing fails, return appropriate error:

```javascript
try {
  const data = JSON.parse(fileContent);
} catch (error) {
  return res.status(500).json({
    success: false,
    error: 'Invalid Data Format',
    message: 'Failed to parse data file',
    metadata: {
      timestamp: new Date().toISOString(),
      agentId: 'agent-name'
    }
  });
}
```

### 3. Server Errors
For unexpected errors, return 500 with details:

```javascript
catch (error) {
  console.error('Agent data API error:', error);
  return res.status(500).json({
    success: false,
    error: 'Server Error',
    message: error.message,
    metadata: {
      timestamp: new Date().toISOString(),
      agentId: 'agent-name'
    }
  });
}
```

## Authentication/Authorization Guidelines

### Current Implementation
- No authentication required for agent data APIs (Phase 1)
- APIs are accessible via localhost only
- CORS configured for local development

### Future Considerations
- Add API key authentication for production deployments
- Implement role-based access control for sensitive agent data
- Add rate limiting per agent/endpoint

## Route Structure

Each agent should follow this file structure:

```
/api-server/routes/agents/
├── README.md (this file)
├── {agent-name}.js (route implementation)
└── ...
```

## Example Implementation

See `personal-todos-agent.js` for a reference implementation.

### Basic Route Template

```javascript
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// Define data path
const AGENT_WORKSPACE = path.join(__dirname, '../../../prod/agent_workspace');
const DATA_PATH = path.join(AGENT_WORKSPACE, 'agent-name/data.json');

// GET /api/agents/agent-name/data
router.get('/data', (req, res) => {
  try {
    // Check if data file exists
    if (!fs.existsSync(DATA_PATH)) {
      return res.json({
        success: true,
        data: getEmptyData(),
        metadata: {
          timestamp: new Date().toISOString(),
          agentId: 'agent-name',
          note: 'No data file found'
        }
      });
    }

    // Read and parse data
    const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
    const rawData = JSON.parse(fileContent);

    // Process and aggregate data
    const processedData = processData(rawData);

    // Return formatted response
    res.json({
      success: true,
      data: processedData,
      metadata: {
        timestamp: new Date().toISOString(),
        agentId: 'agent-name',
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Agent data error:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message,
      metadata: {
        timestamp: new Date().toISOString(),
        agentId: 'agent-name'
      }
    });
  }
});

// Helper functions
function getEmptyData() {
  return {
    // Return appropriate empty structure
  };
}

function processData(rawData) {
  // Process and aggregate data
  return {
    // Processed data
  };
}

export default router;
```

## Data Processing Best Practices

1. **Validate Input**: Always validate data structure before processing
2. **Compute Aggregates**: Calculate totals, averages, distributions on server
3. **Filter Sensitive Data**: Remove internal fields before sending to frontend
4. **Sort Data**: Return data in a useful default sort order
5. **Limit Size**: Implement pagination for large datasets

## Testing Requirements

Each agent data API must have:

1. **Unit Tests** (minimum 8 tests):
   - Test with valid data
   - Test with empty/missing data
   - Test with invalid data format
   - Test error handling
   - Test data aggregation logic
   - Test edge cases
   - Test response format
   - Test metadata inclusion

2. **Integration Tests**:
   - Test full request/response cycle
   - Test with actual data files
   - Test error scenarios

See `/api-server/tests/agents/personal-todos-agent.test.js` for examples.

## Registering Routes

Add your agent routes to `/api-server/server.js`:

```javascript
import agentNameRoutes from './routes/agents/agent-name.js';

// Mount agent routes
app.use('/api/agents/agent-name', agentNameRoutes);
```

## Data File Standards

### Location
- All agent data files must be in `/prod/agent_workspace/{agent-name}/`
- Use consistent naming: `tasks.json`, `data.json`, etc.

### Format
- Use JSON format for data files
- Include metadata in data files (version, timestamps, etc.)
- Document data schema in agent's README

### Updates
- Data files may be updated by agents or external processes
- APIs should handle concurrent access gracefully
- Consider caching for frequently accessed data

## Performance Considerations

1. **File Reading**: Use synchronous fs for small files, async for large files
2. **Caching**: Consider caching processed data for high-traffic endpoints
3. **Computation**: Perform heavy computation once, cache results
4. **Response Size**: Keep response sizes under 100KB when possible

## Debugging

Enable detailed logging with:

```javascript
const DEBUG = process.env.DEBUG_AGENT_API === 'true';

if (DEBUG) {
  console.log('[Agent API] Processing request:', req.path);
  console.log('[Agent API] Data:', processedData);
}
```

## Version History

- v1.0.0 (2025-10-04): Initial template and guidelines
