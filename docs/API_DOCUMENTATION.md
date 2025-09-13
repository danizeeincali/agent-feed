# Agent Dynamic Pages API Documentation

## Overview

The Agent Dynamic Pages API provides RESTful endpoints for managing agent-specific pages with real database integration, comprehensive validation, error handling, and security measures.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently no authentication is required, but rate limiting is implemented (100 requests per minute per IP).

## Error Responses

All endpoints return consistent error responses with the following structure:

```json
{
  "error": "Error Type",
  "message": "Human-readable error description",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `413` - Payload Too Large
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Endpoints

### 1. List Agent Pages

**GET** `/agents/:agentId/pages`

Retrieve all pages for a specific agent with filtering and pagination.

#### Path Parameters
- `agentId` (string, required): The ID or name of the agent

#### Query Parameters
- `page_type` (string): Filter by page type (`persistent`, `dynamic`, `template`)
- `status` (string): Filter by status (`draft`, `published`, `archived`)
- `content_type` (string): Filter by content type (`text`, `markdown`, `json`, `component`)
- `search` (string): Search in title and content
- `limit` (number): Number of results to return (1-100, default: 20)
- `offset` (number): Number of results to skip (default: 0)
- `sortBy` (string): Field to sort by (default: `created_at`)
- `sortOrder` (string): Sort order (`ASC`, `DESC`, default: `DESC`)

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/agents/ProductionValidator/pages?status=published&limit=10&offset=0" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "id": "page-12345",
        "agent_id": "ProductionValidator",
        "title": "System Validation Report",
        "page_type": "dynamic",
        "content_type": "markdown",
        "content_value": "# Validation Complete\nAll systems operational...",
        "content_metadata": {
          "validationScore": 98.5,
          "testsRun": 147
        },
        "status": "published",
        "tags": ["validation", "report", "production"],
        "created_at": "2024-01-01T10:00:00.000Z",
        "updated_at": "2024-01-01T10:00:00.000Z",
        "version": 1
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    },
    "agent": {
      "id": "ProductionValidator",
      "name": "ProductionValidator",
      "display_name": "Production Validator"
    }
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

---

### 2. Get Specific Page

**GET** `/agents/:agentId/pages/:pageId`

Retrieve a specific page by ID for an agent.

#### Path Parameters
- `agentId` (string, required): The ID or name of the agent
- `pageId` (string, required): The unique page ID

#### Example Request

```bash
curl -X GET "http://localhost:3000/api/agents/ProductionValidator/pages/page-12345" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "page": {
      "id": "page-12345",
      "agent_id": "ProductionValidator",
      "title": "System Validation Report",
      "page_type": "dynamic",
      "content_type": "markdown",
      "content_value": "# Validation Complete\nAll systems operational...",
      "content_metadata": {
        "validationScore": 98.5,
        "testsRun": 147
      },
      "status": "published",
      "tags": ["validation", "report", "production"],
      "created_at": "2024-01-01T10:00:00.000Z",
      "updated_at": "2024-01-01T10:00:00.000Z",
      "version": 1
    },
    "agent": {
      "id": "ProductionValidator",
      "name": "ProductionValidator",
      "display_name": "Production Validator"
    }
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

#### Error Response (Page Not Found)

```json
{
  "error": "Not Found",
  "message": "Page not found",
  "code": "PAGE_NOT_FOUND",
  "pageId": "nonexistent-page"
}
```

---

### 3. Create New Page

**POST** `/agents/:agentId/pages`

Create a new page for an agent.

#### Path Parameters
- `agentId` (string, required): The ID or name of the agent

#### Request Body (JSON)

##### Required Fields
- `title` (string): Page title (max 500 characters)
- `content_type` (string): Content type (`text`, `markdown`, `json`, `component`)
- `content_value` (string): Page content

##### Optional Fields
- `content_metadata` (object): Additional metadata (default: `{}`)
- `status` (string): Page status (`draft`, `published`, `archived`, default: `draft`)
- `tags` (array): Array of tag strings (default: `[]`)
- `version` (number): Version number (default: `1`)

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/agents/ProductionValidator/pages" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Validation Report",
    "content_type": "markdown",
    "content_value": "# New Report\nValidation results...",
    "content_metadata": {
      "priority": "high",
      "category": "validation"
    },
    "status": "draft",
    "tags": ["validation", "draft", "new"],
    "version": 1
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "page": {
      "id": "page-67890",
      "agent_id": "ProductionValidator",
      "title": "New Validation Report",
      "page_type": "dynamic",
      "content_type": "markdown",
      "content_value": "# New Report\nValidation results...",
      "content_metadata": {
        "priority": "high",
        "category": "validation"
      },
      "status": "draft",
      "tags": ["validation", "draft", "new"],
      "created_at": "2024-01-01T11:00:00.000Z",
      "updated_at": "2024-01-01T11:00:00.000Z",
      "version": 1
    },
    "agent": {
      "id": "ProductionValidator",
      "name": "ProductionValidator",
      "display_name": "Production Validator"
    }
  },
  "message": "Page created successfully",
  "timestamp": "2024-01-01T11:00:00.000Z"
}
```

#### Validation Error Response

```json
{
  "error": "Bad Request",
  "message": "Title is required and must be a non-empty string",
  "code": "VALIDATION_ERROR",
  "field": "title"
}
```

---

### 4. Update Page

**PUT** `/agents/:agentId/pages/:pageId`

Update an existing page.

#### Path Parameters
- `agentId` (string, required): The ID or name of the agent
- `pageId` (string, required): The unique page ID

#### Request Body (JSON)

Any combination of the following fields:
- `title` (string): Page title
- `content_value` (string): Page content
- `content_metadata` (object): Additional metadata
- `status` (string): Page status (`draft`, `published`, `archived`)
- `tags` (array): Array of tag strings
- `version` (number): Version number

#### Example Request

```bash
curl -X PUT "http://localhost:3000/api/agents/ProductionValidator/pages/page-67890" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Validation Report",
    "status": "published",
    "content_metadata": {
      "priority": "high",
      "category": "validation",
      "lastUpdated": "2024-01-01T12:00:00.000Z"
    },
    "version": 2
  }'
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "page": {
      "id": "page-67890",
      "agent_id": "ProductionValidator",
      "title": "Updated Validation Report",
      "page_type": "dynamic",
      "content_type": "markdown",
      "content_value": "# New Report\nValidation results...",
      "content_metadata": {
        "priority": "high",
        "category": "validation",
        "lastUpdated": "2024-01-01T12:00:00.000Z"
      },
      "status": "published",
      "tags": ["validation", "draft", "new"],
      "created_at": "2024-01-01T11:00:00.000Z",
      "updated_at": "2024-01-01T12:00:00.000Z",
      "version": 2
    },
    "agent": {
      "id": "ProductionValidator",
      "name": "ProductionValidator",
      "display_name": "Production Validator"
    }
  },
  "message": "Page updated successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

### 5. Delete Page

**DELETE** `/agents/:agentId/pages/:pageId`

Delete a specific page.

#### Path Parameters
- `agentId` (string, required): The ID or name of the agent
- `pageId` (string, required): The unique page ID

#### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/agents/ProductionValidator/pages/page-67890" \
  -H "Content-Type: application/json"
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "deletedPageId": "page-67890",
    "agent": {
      "id": "ProductionValidator",
      "name": "ProductionValidator",
      "display_name": "Production Validator"
    }
  },
  "message": "Page deleted successfully",
  "timestamp": "2024-01-01T12:30:00.000Z"
}
```

---

## Security Features

### Rate Limiting
- 100 requests per minute per IP address
- Returns `429 Too Many Requests` when exceeded
- Includes `retryAfter` field in error response

### Input Validation
- All input data is validated and sanitized
- SQL injection protection through parameterized queries
- XSS prevention through input sanitization
- Content length limits to prevent oversized payloads

### Error Handling
- Comprehensive error responses with consistent structure
- Detailed logging for debugging (server-side only)
- No sensitive information exposed in error messages

## Performance Optimizations

### Database Integration
- Real SQLite/PostgreSQL integration with connection pooling
- Optimized queries with proper indexing
- Prepared statements for security and performance

### Caching
- Built-in query result caching
- Efficient pagination with offset/limit
- Metadata caching for frequently accessed data

### Monitoring
- Request timing and performance metrics
- Database query performance tracking
- Real-time health monitoring

## Content Type Specifications

### Text (`text`)
Plain text content, automatically escaped for HTML safety.

### Markdown (`markdown`) 
Markdown-formatted content that can be rendered as HTML.

### JSON (`json`)
Structured JSON data for complex page layouts and configurations.

### Component (`component`)
React/Vue component definitions or templates for dynamic page rendering.

## Status Workflow

1. **draft**: Page is being created/edited, not visible to end users
2. **published**: Page is live and visible to end users  
3. **archived**: Page is no longer active but preserved for reference

## Tag System

- Tags are stored as JSON arrays in the database
- Support for filtering and searching by tags
- No limit on number of tags per page
- Tags are case-sensitive strings

## Pagination

All list endpoints support pagination with:
- `limit`: Maximum number of results (1-100)
- `offset`: Number of results to skip
- Response includes `hasMore` boolean for infinite scroll UIs
- Total count provided for progress indicators

## Testing

Use the provided curl examples or tools like Postman to test the API. A comprehensive test script is available at `/tests/api/agent-dynamic-pages-test.js`.

## Support

For issues or questions, check the server logs or create an issue in the project repository.