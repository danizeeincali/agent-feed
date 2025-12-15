# Agent Dynamic Pages API Documentation

## Overview

The Agent Dynamic Pages API provides a comprehensive backend system for AI agents to create and manage persistent dynamic pages with user data separation, versioning, and security features.

## Authentication

All endpoints require agent authorization via Bearer token in the Authorization header:

```
Authorization: Bearer <agent-id>
```

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Page Management

#### Create Page
```
POST /agents/:agentId/pages
```

**Description**: Creates a new dynamic page specification for an agent.

**Request Body**:
```json
{
  "title": "string (required, 1-200 chars)",
  "description": "string (optional, max 500 chars)",
  "componentSpec": {
    "type": "page",
    "components": [
      {
        "type": "header",
        "props": {
          "title": "Page Title",
          "level": 1
        }
      }
    ]
  },
  "status": "active|deprecated|archived (optional, default: active)",
  "tags": ["string"] (optional, max 20 tags)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "spec-id",
    "agentId": "agent-123",
    "pageId": "page-456",
    "title": "My Page",
    "description": "Page description",
    "componentSpec": {...},
    "schemaVersion": 1,
    "version": 1,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "createdBy": "agent-123"
  },
  "message": "Page created successfully"
}
```

#### List Pages
```
GET /agents/:agentId/pages?limit=20&offset=0&status=active&sortBy=updated_at&sortOrder=DESC
```

**Description**: Retrieves all pages for an agent with pagination and filtering.

**Query Parameters**:
- `limit`: Number of pages to return (1-100, default: 20)
- `offset`: Number of pages to skip (default: 0)
- `status`: Filter by status (active|deprecated|archived)
- `sortBy`: Sort field (created_at|updated_at|title|version)
- `sortOrder`: Sort direction (ASC|DESC)

#### Get Page
```
GET /agents/:agentId/pages/:pageId?version=1
```

**Description**: Retrieves a specific page specification, optionally at a specific version.

#### Update Page
```
PUT /agents/:agentId/pages/:pageId
```

**Description**: Updates a page specification (creates new version).

**Request Body**: Same as Create Page

#### Delete Page
```
DELETE /agents/:agentId/pages/:pageId
```

**Description**: Archives a page (soft delete).

### User Data Management

#### Get Page Data
```
GET /agents/:agentId/pages/:pageId/data?userId=anonymous
```

**Description**: Retrieves all user data for a page.

**Response**:
```json
{
  "success": true,
  "data": {
    "key1": "value1",
    "key2": {"nested": "object"},
    "key3": [1, 2, 3]
  },
  "userId": "anonymous"
}
```

#### Set Multiple Data Entries
```
POST /agents/:agentId/pages/:pageId/data
```

**Request Body**:
```json
{
  "userId": "user-123",
  "data": {
    "userName": "John Doe",
    "preferences": {
      "theme": "dark",
      "notifications": true
    },
    "scores": [10, 20, 30]
  }
}
```

#### Set Single Data Entry
```
PUT /agents/:agentId/pages/:pageId/data/:key
```

**Request Body**:
```json
{
  "userId": "user-123",
  "dataValue": "Any JSON value",
  "dataType": "string|number|boolean|json|array",
  "encrypted": false
}
```

#### Delete Data Entry
```
DELETE /agents/:agentId/pages/:pageId/data/:key?userId=user-123
```

### Version Management

#### Get Version History
```
GET /agents/:agentId/pages/:pageId/versions
```

**Description**: Retrieves version history for a page.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "version-id",
      "agentId": "agent-123",
      "pageId": "page-456",
      "version": 2,
      "specId": "spec-id",
      "title": "Updated Title",
      "status": "active",
      "changeLog": "Updated component layout",
      "isBreaking": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "createdBy": "agent-123",
      "hasMigrationScript": false,
      "hasRollbackScript": false
    }
  ],
  "total": 2
}
```

#### Migrate Page Data
```
POST /agents/:agentId/pages/:pageId/migrate
```

**Description**: Migrates page data to a specific version.

**Request Body**:
```json
{
  "targetVersion": 2
}
```

#### Get Page Schema
```
GET /agents/:agentId/pages/:pageId/schema
```

**Description**: Retrieves page schema information including component spec and data schema.

**Response**:
```json
{
  "success": true,
  "data": {
    "pageId": "page-456",
    "agentId": "agent-123",
    "version": 1,
    "schemaVersion": 1,
    "title": "My Page",
    "description": "Page description",
    "componentSpec": {...},
    "dataSchema": {
      "userName": {
        "type": "string",
        "required": false
      },
      "preferences": {
        "type": "json",
        "required": false
      }
    },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Health Check

#### Service Health
```
GET /agents/pages/health
```

**Description**: Returns health status of the pages service.

**Response**:
```json
{
  "service": "agent-dynamic-pages",
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "database": "healthy",
  "features": {
    "pageSpecifications": true,
    "userData": true,
    "versioning": true,
    "migration": true,
    "audit": true
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "type": "ERROR_TYPE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req-123",
  "details": [
    {
      "field": "title",
      "message": "Title is required",
      "value": ""
    }
  ]
}
```

### Error Types

- `VALIDATION_ERROR` (400): Input validation failed
- `AUTHORIZATION_ERROR` (401): Authentication required or invalid
- `NOT_FOUND_ERROR` (404): Resource not found
- `CONFLICT_ERROR` (409): Resource conflict (duplicate)
- `RATE_LIMIT_ERROR` (429): Too many requests
- `DATABASE_ERROR` (500): Database operation failed
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

## Rate Limits

- **Standard operations**: 100 requests per 15 minutes
- **Write operations**: 30 requests per 5 minutes
- **Bulk operations**: 10 requests per 15 minutes

## Security Features

### Input Validation
- All inputs are validated using Joi schemas
- SQL injection prevention
- XSS protection with content sanitization
- File size limits (5MB for page specs, 10MB for data)

### Authorization
- Bearer token authentication
- Agent-based access control
- Audit logging for all operations

### Data Protection
- User data separation by user ID
- Optional data encryption
- Secure data serialization

## Data Types

### Page Status
- `active`: Page is live and accessible
- `deprecated`: Page exists but is outdated
- `archived`: Page is soft-deleted

### Data Types
- `string`: Text values
- `number`: Numeric values
- `boolean`: True/false values
- `json`: Complex objects
- `array`: Lists of values

## Best Practices

### Page Design
1. Keep component specifications under 5MB
2. Use semantic component types
3. Include version change logs
4. Test migrations before applying

### Data Management
1. Use descriptive data keys
2. Keep data values reasonable in size
3. Consider data encryption for sensitive information
4. Implement proper error handling

### Security
1. Always validate agent authorization
2. Sanitize user inputs
3. Use HTTPS in production
4. Monitor API usage and logs

## Examples

### Creating a Simple Form Page

```javascript
const pageSpec = {
  title: "User Registration Form",
  description: "A form to collect user registration data",
  componentSpec: {
    type: "page",
    components: [
      {
        type: "header",
        props: { title: "Register", level: 1 }
      },
      {
        type: "form",
        props: {
          fields: [
            {
              type: "input",
              name: "firstName",
              label: "First Name",
              required: true
            },
            {
              type: "input",
              name: "email",
              label: "Email",
              type: "email",
              required: true
            },
            {
              type: "select",
              name: "country",
              label: "Country",
              options: ["US", "CA", "UK"]
            }
          ],
          submitButton: { text: "Register" }
        }
      }
    ]
  }
};

// Create the page
const response = await fetch('/api/agents/my-agent/pages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer my-agent',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(pageSpec)
});
```

### Storing Form Data

```javascript
// Store user's form submission
const formData = {
  firstName: "John",
  email: "john@example.com",
  country: "US"
};

const response = await fetch('/api/agents/my-agent/pages/registration-form/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user-123',
    data: formData
  })
});
```

## Support

For issues and feature requests, please check the system health endpoint and review error logs in the `/logs` directory.