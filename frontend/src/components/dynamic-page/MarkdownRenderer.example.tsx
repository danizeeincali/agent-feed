import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

/**
 * MarkdownRenderer Example Usage
 *
 * This file demonstrates how to use the MarkdownRenderer component
 * with various markdown features and configurations.
 */

// Example markdown content
const exampleMarkdown = `
# MarkdownRenderer Examples

This component renders GitHub-flavored markdown with XSS protection.

## Features

### Basic Formatting

You can use **bold text**, *italic text*, and ***bold italic*** formatting.

Add ~~strikethrough~~ using double tildes.

### Code Examples

Inline code: \`const hello = "world";\`

Code blocks with syntax highlighting:

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const createUser = (data: User): Promise<User> => {
  return fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }).then(res => res.json());
};
\`\`\`

\`\`\`python
def fibonacci(n):
    """Calculate fibonacci number recursively"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Example usage
print(fibonacci(10))
\`\`\`

### Lists

Unordered lists:
- First item
- Second item
  - Nested item 1
  - Nested item 2
- Third item

Ordered lists:
1. First step
2. Second step
3. Third step

Task lists:
- [x] Completed task
- [ ] Pending task
- [x] Another completed task

### Links and Images

[Internal link](/dashboard)

[External link](https://example.com) (opens in new tab)

![Sample Image](https://via.placeholder.com/400x200?text=Sample+Image)

### Tables

| Feature | Supported | Notes |
|---------|-----------|-------|
| Tables | ✅ | GitHub-flavored |
| Code Highlighting | ✅ | Multiple languages |
| XSS Protection | ✅ | Enabled by default |
| Task Lists | ✅ | Interactive checkboxes |

### Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> And include multiple paragraphs.

### Horizontal Rule

---

## Advanced Features

### Nested Elements

You can combine **bold with *italic*** and \`code\` in the same paragraph.

### Complex Code

\`\`\`javascript
// Async/await with error handling
const fetchUserData = async (userId) => {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
};
\`\`\`

## Security

This component sanitizes HTML by default to prevent XSS attacks.

Dangerous content is automatically removed:
- Script tags are blocked
- Dangerous protocols (javascript:, data:) are blocked
- Null bytes are removed
`;

/**
 * Basic usage example
 */
export const BasicExample: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Basic Markdown Example</h1>
      <MarkdownRenderer content={exampleMarkdown} />
    </div>
  );
};

/**
 * Custom styling example
 */
export const CustomStyledExample: React.FC = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Custom Styled Markdown
      </h1>
      <MarkdownRenderer
        content={exampleMarkdown}
        className="custom-markdown bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
      />
    </div>
  );
};

/**
 * Without sanitization (use with caution!)
 */
export const UnsanitizedExample: React.FC = () => {
  const htmlContent = `
# HTML in Markdown

<div class="custom-html">
  <p>This is raw HTML in markdown.</p>
  <button class="bg-blue-500 text-white px-4 py-2 rounded">
    Custom Button
  </button>
</div>
  `;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Unsanitized Example</h1>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <p className="font-semibold text-yellow-800">Warning:</p>
        <p className="text-yellow-700">
          Only disable sanitization if you trust the content source!
        </p>
      </div>
      <MarkdownRenderer content={htmlContent} sanitize={false} />
    </div>
  );
};

/**
 * Code-focused example
 */
export const CodeExample: React.FC = () => {
  const codeMarkdown = `
# Code Examples

## TypeScript

\`\`\`typescript
type Status = 'pending' | 'success' | 'error';

interface ApiResponse<T> {
  data: T;
  status: Status;
  message?: string;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  const data = await response.json();
  return {
    data,
    status: 'success',
  };
}
\`\`\`

## Python

\`\`\`python
from typing import List, Dict, Optional
import asyncio

class DataProcessor:
    def __init__(self, config: Dict[str, any]):
        self.config = config

    async def process(self, data: List[str]) -> Optional[Dict]:
        results = []
        for item in data:
            result = await self._process_item(item)
            results.append(result)
        return {"results": results}
\`\`\`

## Shell

\`\`\`bash
#!/bin/bash
# Deploy script
set -e

echo "Building application..."
npm run build

echo "Running tests..."
npm test

echo "Deploying..."
./deploy.sh --production
\`\`\`
  `;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Code Examples</h1>
      <MarkdownRenderer content={codeMarkdown} />
    </div>
  );
};

/**
 * Documentation example
 */
export const DocumentationExample: React.FC = () => {
  const docMarkdown = `
# API Documentation

## Overview

This API provides access to user management functionality.

## Authentication

All requests must include an API key:

\`\`\`http
GET /api/users
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Endpoints

### Get Users

\`GET /api/users\`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10) |
| search | string | No | Search query |

**Response:**

\`\`\`json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ],
  "meta": {
    "page": 1,
    "total": 100
  }
}
\`\`\`

### Create User

\`POST /api/users\`

**Request Body:**

\`\`\`json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "user"
}
\`\`\`

**Response Codes:**

- \`201\` - User created successfully
- \`400\` - Invalid request data
- \`401\` - Unauthorized
- \`409\` - User already exists

## Error Handling

All errors return a consistent format:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email"
  }
}
\`\`\`

## Rate Limiting

> **Note:** API requests are limited to 100 requests per minute per API key.

If you exceed the rate limit, you'll receive a \`429 Too Many Requests\` response.
  `;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Documentation Example</h1>
      <MarkdownRenderer content={docMarkdown} />
    </div>
  );
};

/**
 * All examples combined
 */
export const AllExamples: React.FC = () => {
  return (
    <div className="space-y-12">
      <BasicExample />
      <hr className="border-gray-300" />
      <CustomStyledExample />
      <hr className="border-gray-300" />
      <CodeExample />
      <hr className="border-gray-300" />
      <DocumentationExample />
    </div>
  );
};

export default AllExamples;
