# API Reference: Dynamic UI System

Complete documentation for all Dynamic UI System API endpoints.

---

## Base URL

```
http://localhost:3001
```

---

## Templates API

### GET /api/dynamic-ui/templates

List all available Dynamic UI templates.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by template category |
| `tags` | string | No | Comma-separated tags to filter by |

**Response:**

```json
{
  "success": true,
  "templates": [
    {
      "id": "dashboard-v1",
      "name": "Dashboard",
      "description": "Professional dashboard with metrics and data table",
      "category": "dashboard",
      "tags": ["metrics", "analytics", "overview"],
      "version": "1.0.0",
      "createdAt": "2025-10-04T00:00:00.000Z",
      "updatedAt": "2025-10-04T00:00:00.000Z"
    }
  ],
  "total": 5
}
```

**Example:**

```bash
# Get all templates
curl http://localhost:3001/api/dynamic-ui/templates

# Filter by category
curl http://localhost:3001/api/dynamic-ui/templates?category=dashboard

# Filter by tags
curl http://localhost:3001/api/dynamic-ui/templates?tags=analytics,metrics
```

---

### GET /api/dynamic-ui/templates/:templateId

Get detailed information about a specific template.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | string | Yes | Template identifier (e.g., `dashboard`, `todoManager`) |

**Response:**

```json
{
  "success": true,
  "template": {
    "metadata": {
      "id": "dashboard-v1",
      "name": "Dashboard",
      "description": "Professional dashboard with metrics and data table",
      "category": "dashboard",
      "tags": ["metrics", "analytics", "overview"],
      "version": "1.0.0",
      "createdAt": "2025-10-04T00:00:00.000Z",
      "updatedAt": "2025-10-04T00:00:00.000Z"
    },
    "layout": [
      {
        "id": "header",
        "type": "header",
        "config": {
          "title": "{{title}}",
          "level": 1,
          "subtitle": "{{subtitle}}"
        }
      },
      {
        "id": "metrics",
        "type": "Grid",
        "config": {
          "cols": 3,
          "gap": 6
        }
      }
    ],
    "components": ["header", "Grid", "stat", "dataTable"],
    "variables": {
      "title": "Dashboard",
      "subtitle": "Overview of key metrics",
      "metric1_label": "Total Users",
      "metric1_value": 0
    }
  }
}
```

**Example:**

```bash
curl http://localhost:3001/api/dynamic-ui/templates/dashboard
```

**Error Responses:**

```json
{
  "success": false,
  "error": "Template not found",
  "message": "No template found with id: invalidTemplate"
}
```

---

### POST /api/dynamic-ui/templates/:templateId/instantiate

Instantiate a template with specific variable values.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | string | Yes | Template identifier |

**Request Body:**

```json
{
  "variables": {
    "title": "Sales Dashboard",
    "subtitle": "Q4 2025 Performance",
    "metric1_label": "Revenue",
    "metric1_value": "$125,000",
    "metric1_change": "+15%",
    "metric1_icon": "💰"
  }
}
```

**Response:**

```json
{
  "success": true,
  "page": {
    "metadata": { /* template metadata */ },
    "layout": [
      {
        "id": "header",
        "type": "header",
        "config": {
          "title": "Sales Dashboard",
          "level": 1,
          "subtitle": "Q4 2025 Performance"
        }
      },
      {
        "id": "metric-1",
        "type": "stat",
        "config": {
          "label": "Revenue",
          "value": "$125,000",
          "change": "+15%",
          "icon": "💰"
        }
      }
    ],
    "components": ["header", "Grid", "stat", "dataTable"]
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/dynamic-ui/templates/dashboard/instantiate \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "title": "Sales Dashboard",
      "subtitle": "Q4 Performance"
    }
  }'
```

**Notes:**

- Variables not provided will use template defaults
- Template variables use `{{variableName}}` syntax
- Nested objects and arrays are supported in variables

---

## Component Catalog API

### GET /api/components/catalog

Get the complete component catalog.

**Response:**

```json
{
  "success": true,
  "version": "1.0.0",
  "totalComponents": 15,
  "components": [
    {
      "type": "Button",
      "name": "Button",
      "category": "Interactive",
      "description": "Clickable button with multiple variants",
      "schema": {
        "$ref": "#/definitions/Button",
        "definitions": {
          "Button": {
            "type": "object",
            "properties": {
              "variant": {
                "type": "string",
                "enum": ["default", "destructive", "outline", "secondary"]
              },
              "children": {
                "type": "string"
              }
            },
            "required": ["children"],
            "additionalProperties": false
          }
        },
        "$schema": "http://json-schema.org/draft-07/schema#"
      },
      "examples": [
        {
          "variant": "default",
          "children": "Submit"
        }
      ],
      "required": [],
      "optional": []
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3001/api/components/catalog
```

---

### GET /api/components/catalog/:componentType

Get detailed schema and examples for a specific component.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `componentType` | string | Yes | Component type (e.g., `Button`, `Card`, `Grid`) |

**Response:**

```json
{
  "success": true,
  "component": {
    "type": "Button",
    "name": "Button",
    "category": "Interactive",
    "description": "Clickable button with multiple variants",
    "schema": {
      "$ref": "#/definitions/Button",
      "definitions": {
        "Button": {
          "type": "object",
          "properties": {
            "variant": {
              "type": "string",
              "enum": ["default", "destructive", "outline", "secondary"]
            },
            "children": {
              "type": "string"
            },
            "className": {
              "type": "string"
            }
          },
          "required": ["children"],
          "additionalProperties": false
        }
      },
      "$schema": "http://json-schema.org/draft-07/schema#"
    },
    "examples": [
      {
        "variant": "default",
        "children": "Submit"
      },
      {
        "variant": "destructive",
        "children": "Delete"
      },
      {
        "variant": "outline",
        "children": "Cancel",
        "className": "ml-2"
      }
    ],
    "required": [],
    "optional": []
  }
}
```

**Example:**

```bash
curl http://localhost:3001/api/components/catalog/Button
```

**Error Responses:**

```json
{
  "success": false,
  "error": "Component not found",
  "message": "Component type \"InvalidComponent\" does not exist",
  "availableComponents": ["Button", "Card", "Grid", "Badge", "header", "stat"]
}
```

---

### GET /api/components/categories

Get components grouped by category.

**Response:**

```json
{
  "success": true,
  "categories": [
    {
      "name": "Interactive",
      "components": [
        {
          "type": "Button",
          "name": "Button",
          "description": "Clickable button with multiple variants"
        }
      ]
    },
    {
      "name": "Layout",
      "components": [
        {
          "type": "Grid",
          "name": "Grid",
          "description": "Responsive grid layout"
        },
        {
          "type": "Card",
          "name": "Card",
          "description": "Container with title and content"
        }
      ]
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3001/api/components/categories
```

---

## Component Schema Format

All component schemas use **JSON Schema Draft 07** format with the following structure:

```json
{
  "$ref": "#/definitions/ComponentName",
  "definitions": {
    "ComponentName": {
      "type": "object",
      "properties": {
        "propName": {
          "type": "string|number|boolean|array|object",
          "enum": ["value1", "value2"],    // For enum types
          "minLength": 1,                   // For strings
          "minimum": 0,                     // For numbers
          "items": { "type": "string" }     // For arrays
        }
      },
      "required": ["requiredProp1", "requiredProp2"],
      "additionalProperties": false
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### Common Property Types

| Type | Example | Description |
|------|---------|-------------|
| `string` | `{ "type": "string" }` | Text value |
| `number` | `{ "type": "number" }` | Numeric value |
| `boolean` | `{ "type": "boolean" }` | true/false |
| `enum` | `{ "enum": ["a", "b"] }` | One of specific values |
| `array` | `{ "type": "array", "items": {...} }` | List of items |
| `object` | `{ "type": "object", "properties": {...} }` | Nested object |

---

## Error Handling

All API endpoints follow a consistent error format:

### Error Response Structure

```json
{
  "success": false,
  "error": "Error category",
  "message": "Detailed error message",
  "details": {
    /* Additional context */
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| `200` | Success | Template retrieved |
| `201` | Created | Template instantiated |
| `400` | Bad Request | Invalid variables |
| `404` | Not Found | Template/component doesn't exist |
| `500` | Server Error | Internal server error |

### Example Error Responses

**404 - Template Not Found:**
```json
{
  "success": false,
  "error": "Template not found",
  "message": "No template found with id: invalidId"
}
```

**404 - Component Not Found:**
```json
{
  "success": false,
  "error": "Component not found",
  "message": "Component type \"InvalidType\" does not exist",
  "availableComponents": ["Button", "Card", "Grid"]
}
```

**400 - Validation Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Invalid props for component",
  "details": {
    "field": "props.variant",
    "message": "Invalid enum value. Expected 'default' | 'destructive', received 'invalid'"
  }
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to process request"
}
```

---

## Rate Limiting

Currently, no rate limiting is enforced. For production use, consider:

- **10 requests/second** per IP for read operations
- **5 requests/second** per IP for write operations
- **Burst allowance** of 20 requests

---

## Authentication

Currently, no authentication is required for API endpoints.

For production deployment:
- Implement API key authentication
- Use JWT tokens for agent identification
- Add role-based access control (RBAC)

---

## Versioning

The API uses URL versioning. Current version: `v1` (implicit in `/api/` prefix)

Future versions will use: `/api/v2/dynamic-ui/templates`

---

## WebSocket/SSE Support

The system includes Server-Sent Events (SSE) for real-time updates:

```
GET /api/streaming-ticker/stream
```

For template-related events, subscribe to the `template-service` source.

---

## Examples by Use Case

### Building a Dashboard

```bash
# 1. List available templates
curl http://localhost:3001/api/dynamic-ui/templates

# 2. Get dashboard template
curl http://localhost:3001/api/dynamic-ui/templates/dashboard

# 3. Instantiate with your data
curl -X POST http://localhost:3001/api/dynamic-ui/templates/dashboard/instantiate \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "title": "My Dashboard",
      "metric1_label": "Users",
      "metric1_value": "1,234"
    }
  }'
```

### Validating Component Props

```bash
# 1. Get component schema
curl http://localhost:3001/api/components/catalog/Button

# 2. Review required fields and valid values
# 3. Test with valid props
{
  "variant": "default",
  "children": "Click me"
}
```

### Discovering Components

```bash
# 1. List all components
curl http://localhost:3001/api/components/catalog

# 2. Filter by category
curl http://localhost:3001/api/components/catalog | jq '.components[] | select(.category == "Layout")'

# 3. Get specific component details
curl http://localhost:3001/api/components/catalog/Grid
```

---

## SDK Support

For TypeScript/JavaScript projects, consider these helper functions:

```typescript
// Template client
class TemplateClient {
  baseUrl = 'http://localhost:3001';

  async listTemplates(filters?: { category?: string; tags?: string }) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${this.baseUrl}/api/dynamic-ui/templates?${params}`);
    return res.json();
  }

  async getTemplate(templateId: string) {
    const res = await fetch(`${this.baseUrl}/api/dynamic-ui/templates/${templateId}`);
    return res.json();
  }

  async instantiate(templateId: string, variables: Record<string, any>) {
    const res = await fetch(`${this.baseUrl}/api/dynamic-ui/templates/${templateId}/instantiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables })
    });
    return res.json();
  }
}

// Component catalog client
class ComponentClient {
  baseUrl = 'http://localhost:3001';

  async listComponents() {
    const res = await fetch(`${this.baseUrl}/api/components/catalog`);
    return res.json();
  }

  async getComponent(componentType: string) {
    const res = await fetch(`${this.baseUrl}/api/components/catalog/${componentType}`);
    return res.json();
  }

  async getCategories() {
    const res = await fetch(`${this.baseUrl}/api/components/categories`);
    return res.json();
  }
}
```

---

## Additional Resources

- [Agent Integration Guide](./AGENT_INTEGRATION_GUIDE.md) - Complete workflow examples
- [Component Library Documentation](./COMPONENT_LIBRARY_DOCUMENTATION.md) - Detailed component reference
- [Validation Schema Reference](./frontend/src/services/ValidationSecurityService.ts) - TypeScript validation service

---

## Support & Feedback

For issues, questions, or feature requests, contact the development team or file an issue in the project repository.
