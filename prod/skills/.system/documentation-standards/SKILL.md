---
name: Documentation Standards
description: Documentation quality standards including markdown conventions, API documentation, code comments, README patterns, and changelog formats
version: "1.0.0"
category: system
_protected: true
_allowed_agents: ["meta-agent", "meta-update-agent", "docs-writer-agent"]
_last_updated: "2025-10-18"
---

# Documentation Standards Skill

## Purpose

Provides comprehensive standards for creating high-quality documentation across all formats including markdown files, API documentation, code comments, README files, and changelogs. Ensures consistent, maintainable, and useful documentation throughout the agent ecosystem.

## When to Use This Skill

- Creating or updating documentation
- Writing README files
- Documenting APIs and interfaces
- Maintaining changelogs
- Writing code comments
- Creating technical specifications
- Building user guides and tutorials

## Core Standards

### 1. Markdown Documentation Standards

**File Structure**:
```markdown
# Document Title

> Brief description or summary of the document's purpose

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Contributing](#contributing)

## Overview

Detailed explanation of what this document covers...

## Getting Started

### Prerequisites
- Requirement 1
- Requirement 2

### Installation
```bash
npm install package-name
```

## Usage

Basic usage examples...

## API Reference

Detailed API documentation...

## Examples

Real-world examples...

## Contributing

How to contribute to this project...

---

*Last updated: 2025-10-18*
*Version: 1.0.0*
```

**Markdown Formatting Rules**:
```markdown
# Headings

Use ATX-style headings with space after #:
# H1 - Document Title (one per document)
## H2 - Major Sections
### H3 - Subsections
#### H4 - Minor Subsections

Avoid H5 and H6 - indicates need for reorganization

# Lists

Unordered lists with hyphens:
- Item 1
- Item 2
  - Nested item (2 spaces indent)

Ordered lists with numbers:
1. First step
2. Second step
3. Third step

# Code

Inline code: `const variable = 'value';`

Code blocks with language:
```typescript
function example() {
  return 'with syntax highlighting';
}
```

# Links

[Link text](https://example.com)
[Internal link](#section-name)
[Reference link][ref-name]

[ref-name]: https://example.com

# Images

![Alt text](image-url.png)
![With title](image.png "Image title")

# Tables

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |

# Emphasis

*Italic* or _italic_
**Bold** or __bold__
***Bold italic***

# Blockquotes

> Single line quote

> Multi-line quote
> continues here

# Horizontal Rules

---

Three or more hyphens, asterisks, or underscores
```

**Documentation Frontmatter**:
```yaml
---
title: Document Title
description: Brief description of document
author: Agent Name
created: 2025-10-18
updated: 2025-10-18
version: 1.0.0
tags: [documentation, guide, tutorial]
status: draft|review|published
audience: developers|users|administrators
---
```

### 2. README Standards

**README.md Template**:
```markdown
# Project Name

> One-sentence description of what this project does

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

## 📋 Table of Contents

- [About](#about)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Features](#features)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 About

Detailed description of the project:
- What problem does it solve?
- Who is it for?
- Why was it created?

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
# Clone the repository
git clone https://github.com/user/repo.git

# Navigate to project directory
cd repo

# Install dependencies
npm install

# Run the project
npm start
```

### Configuration

```yaml
# config.yml
database:
  host: localhost
  port: 5432
  name: mydb
```

## 💻 Usage

### Basic Example

```typescript
import { Agent } from './agent';

const agent = new Agent({
  name: 'example-agent',
  capabilities: ['task-management']
});

await agent.initialize();
```

### Advanced Example

```typescript
// More complex usage example
const result = await agent.processTask({
  type: 'analysis',
  data: { /* ... */ }
});
```

## ✨ Features

- **Feature 1**: Description of feature 1
- **Feature 2**: Description of feature 2
- **Feature 3**: Description of feature 3

## 📚 API Documentation

### Class: Agent

#### Constructor

```typescript
new Agent(options: AgentOptions)
```

**Parameters:**
- `options.name` (string): Agent name
- `options.capabilities` (string[]): List of capabilities

#### Methods

##### `initialize()`

Initializes the agent.

**Returns:** `Promise<void>`

**Example:**
```typescript
await agent.initialize();
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 👥 Authors

- **Name** - *Initial work* - [GitHub](https://github.com/username)

## 🙏 Acknowledgments

- Thanks to contributor 1
- Inspiration from project X
- Based on concept from paper Y

---

For more information, visit the [documentation](https://docs.example.com).
```

### 3. API Documentation Standards

**API Documentation Template**:
```typescript
/**
 * Processes a task with the given parameters.
 *
 * @param task - The task object to process
 * @param options - Optional processing options
 * @param options.priority - Task priority level (1-5)
 * @param options.async - Whether to process asynchronously
 * @returns Promise that resolves to the processing result
 *
 * @throws {ValidationError} If task is invalid
 * @throws {ProcessingError} If processing fails
 *
 * @example
 * ```typescript
 * const result = await processTask(
 *   { id: '123', type: 'analysis' },
 *   { priority: 3, async: true }
 * );
 * ```
 *
 * @see {@link Task} for task structure
 * @see {@link ProcessingOptions} for available options
 *
 * @since 1.0.0
 * @category Processing
 */
export async function processTask(
  task: Task,
  options?: ProcessingOptions
): Promise<ProcessingResult> {
  // Implementation
}

/**
 * Represents a task in the system.
 *
 * @interface
 */
export interface Task {
  /**
   * Unique identifier for the task
   * @example "task-123"
   */
  id: string;

  /**
   * Type of task to be processed
   * @example "analysis"
   */
  type: TaskType;

  /**
   * Optional task description
   */
  description?: string;

  /**
   * Task priority level
   * @default 3
   * @min 1
   * @max 5
   */
  priority: number;

  /**
   * Task metadata
   */
  metadata?: Record<string, unknown>;
}
```

**REST API Documentation**:
```markdown
## API Endpoints

### GET /api/tasks

Retrieves a list of tasks.

**Authentication:** Required

**Parameters:**

| Name | Type | In | Description | Required |
|------|------|-----|-------------|----------|
| page | integer | query | Page number (1-indexed) | No |
| limit | integer | query | Items per page (max 100) | No |
| status | string | query | Filter by status | No |
| sort | string | query | Sort field | No |

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/tasks?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**

```json
{
  "data": [
    {
      "id": "task-123",
      "title": "Example Task",
      "status": "pending",
      "created_at": "2025-10-18T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

**Status Codes:**

- `200 OK`: Success
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error

---

### POST /api/tasks

Creates a new task.

**Authentication:** Required

**Request Body:**

```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "priority": "integer (1-5, default: 3)",
  "due_date": "ISO 8601 date string (optional)"
}
```

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Task",
    "priority": 3
  }'
```

**Example Response:**

```json
{
  "id": "task-456",
  "title": "New Task",
  "status": "pending",
  "priority": 3,
  "created_at": "2025-10-18T10:30:00Z"
}
```

**Status Codes:**

- `201 Created`: Task created successfully
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error
```

### 4. Code Comment Standards

**File Header Comments**:
```typescript
/**
 * @file task-processor.ts
 * @description Processes tasks with various priority levels and strategies
 * @author Agent Name
 * @created 2025-10-18
 * @updated 2025-10-18
 * @version 1.0.0
 */
```

**Function Comments (JSDoc)**:
```typescript
/**
 * Validates task data against schema requirements.
 *
 * Performs comprehensive validation including:
 * - Required field presence
 * - Type checking
 * - Business rule validation
 * - Reference integrity
 *
 * @param task - The task object to validate
 * @param schema - Validation schema to apply
 * @returns Validation result with errors if any
 *
 * @throws {SchemaError} If schema is invalid
 *
 * @example
 * ```typescript
 * const result = validateTask(task, taskSchema);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
function validateTask(task: Task, schema: Schema): ValidationResult {
  // Implementation
}
```

**Inline Comments**:
```typescript
// Good: Explain WHY, not WHAT
// Cache the result to avoid expensive recalculation
const cached = cache.get(key);

// Bad: Stating the obvious
// Get value from cache
const cached = cache.get(key);

// Good: Explain complex logic
// Convert Fibonacci priority to linear scale for sorting
// F(0,1,2,3,5,8) → L(0,1,2,3,4,5)
const linearPriority = fibonacciToLinear(task.priority);

// Good: Mark technical debt
// TODO: Refactor to use async/await when Node 18+ required
// FIXME: Race condition possible with concurrent updates
// HACK: Temporary workaround for API bug - remove after v2.0
// NOTE: This approach is intentional despite appearing inefficient
```

**Complex Logic Comments**:
```typescript
/**
 * Priority calculation algorithm:
 *
 * 1. Base priority from Fibonacci scale (0, 1, 2, 3, 5, 8)
 * 2. Urgency multiplier based on due date:
 *    - Overdue: 2x
 *    - Due today: 1.5x
 *    - Due this week: 1.2x
 *    - Due this month: 1.0x
 * 3. Impact factor from business value (0.5 - 2.0)
 * 4. Final score = base × urgency × impact
 *
 * Result range: 0 (lowest) to 32 (highest)
 */
function calculatePriority(task: Task): number {
  const base = task.fibonacciPriority;
  const urgency = getUrgencyMultiplier(task.dueDate);
  const impact = task.businessImpact || 1.0;

  return base * urgency * impact;
}
```

### 5. Changelog Standards (Keep a Changelog Format)

**CHANGELOG.md Template**:
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features in development

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in upcoming versions

### Removed
- Features removed in this version

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes

## [2.0.0] - 2025-10-18

### Added
- Fibonacci IMPACT priority framework for advanced task prioritization
- Priority-based automatic task sorting and organization
- Enhanced task categorization with business impact assessment
- Real-time priority recalculation based on deadlines

### Changed
- **BREAKING**: Priority levels changed from P1-P5 to Fibonacci scale (0,1,2,3,5,8)
- Task API now returns calculated priority score
- Default sort order now prioritizes by IMPACT score

### Deprecated
- Old priority level format (P1-P5) - will be removed in v3.0.0
- Simple urgency flags - use priority framework instead

### Removed
- Legacy priority calculation algorithm

### Fixed
- Race condition in concurrent task updates
- Priority calculation edge cases with missing due dates
- Task list sorting inconsistencies

### Security
- Added input validation for priority values
- Improved authentication token validation

### Migration Guide

To migrate from v1.x to v2.0.0:

1. Update priority levels:
   ```typescript
   // Old format
   { priority: 'P1' }

   // New format
   { priority: 0, impact: 'critical' }
   ```

2. Update sort logic to use priority score
3. See full migration guide: docs/MIGRATION-v2.md

## [1.2.1] - 2025-10-15

### Fixed
- Task list pagination bug affecting pages > 10
- Memory leak in task event listeners

## [1.2.0] - 2025-10-10

### Added
- Task tagging functionality
- Bulk task operations
- Task search and filtering

### Changed
- Improved task list performance for large datasets

## [1.1.0] - 2025-10-05

### Added
- Task due date reminders
- Task notes and comments

### Fixed
- Task update notification timing

## [1.0.0] - 2025-10-01

### Added
- Initial release
- Basic task CRUD operations
- Task priority levels (P1-P5)
- Task status management

[Unreleased]: https://github.com/user/repo/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/user/repo/compare/v1.2.1...v2.0.0
[1.2.1]: https://github.com/user/repo/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/user/repo/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/user/repo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/user/repo/releases/tag/v1.0.0
```

### 6. Architecture Documentation

**Architecture Decision Record (ADR) Template**:
```markdown
# ADR-001: Use Fibonacci Priority Scale

## Status

Accepted

## Context

The current P1-P5 priority system doesn't adequately capture the exponential
difference in importance between priority levels. Users struggle to distinguish
between adjacent priority levels, and tasks tend to cluster around P2-P3.

We need a priority system that:
- Reflects exponential nature of importance
- Encourages thoughtful prioritization
- Reduces priority inflation
- Aligns with natural decision-making patterns

## Decision

We will adopt a Fibonacci-based priority scale (0, 1, 2, 3, 5, 8) combined
with business impact assessment to create an IMPACT framework.

Rationale:
1. Fibonacci sequence naturally represents exponential growth
2. Larger gaps between high priorities encourage careful consideration
3. Widely understood in project management contexts
4. Provides clear differentiation between levels

## Consequences

### Positive
- More thoughtful priority assignment
- Better task organization and sorting
- Clearer communication of importance
- Natural resistance to priority inflation

### Negative
- Breaking change requiring migration
- User learning curve for new system
- Need to update all documentation
- Potential confusion during transition

### Neutral
- Requires new UI for priority selection
- Changes task API response format
- Affects sorting and filtering logic

## Implementation

1. Add new priority field alongside old format (dual-write)
2. Migrate existing tasks to new priority scale
3. Update API to include both formats during transition
4. Remove old format after 90-day migration period

## Alternatives Considered

1. **Linear scale (1-10)**: Too granular, encourages over-analysis
2. **T-shirt sizes (XS-XL)**: Too informal, lacks precision
3. **MoSCoW (Must/Should/Could/Won't)**: Good for features, not tasks

## References

- [Fibonacci sequence in agile estimation](https://example.com/fibonacci-agile)
- User research findings: docs/research/priority-user-study.md
- Original proposal: issues/123

---

**Date:** 2025-10-18
**Author:** Agent Name
**Reviewers:** Meta Agent, Product Owner
```

## Best Practices

### For All Documentation:
1. **Write for Your Audience**: Adjust complexity and detail appropriately
2. **Keep It Current**: Update docs when code changes
3. **Use Examples**: Code examples are worth 1000 words
4. **Be Consistent**: Follow established patterns and formatting
5. **Link Generously**: Connect related documentation

### For Code Comments:
1. **Explain Why, Not What**: Code shows what; comments explain why
2. **Keep Comments Close**: Comments near code stay accurate longer
3. **Update Comments**: Stale comments are worse than no comments
4. **Avoid Obvious Comments**: Don't state what code clearly shows
5. **Document Public APIs**: All public functions need documentation

### For READMEs:
1. **Start with Purpose**: Clear explanation of what and why
2. **Quick Start First**: Get users running quickly
3. **Progressive Disclosure**: Basic → advanced information flow
4. **Visual Elements**: Badges, diagrams, screenshots help
5. **Maintenance Notes**: Document how to contribute and maintain

### For Changelogs:
1. **User-Focused**: Write for users, not developers
2. **Categorize Changes**: Use standard categories consistently
3. **Version Everything**: Every release gets a changelog entry
4. **Breaking Changes**: Clearly mark and explain breaking changes
5. **Migration Guides**: Provide clear upgrade paths

## Integration with Other Skills

- **code-standards**: Enforce documentation in code reviews
- **update-protocols**: Document all updates and changes
- **avi-architecture**: Maintain architecture documentation
- **testing-patterns**: Document test strategies and coverage

## Success Metrics

- **Documentation Coverage**: 100% of public APIs documented
- **Documentation Freshness**: <7 days between code and doc updates
- **User Satisfaction**: Positive feedback on documentation helpfulness
- **Self-Service Rate**: 80%+ of questions answered by docs
- **Onboarding Time**: New contributors productive within 1 day
- **Search Effectiveness**: Users find answers within 2 minutes

## References

- [markdown-guide.md](markdown-guide.md) - Comprehensive markdown reference
- [jsdoc-guide.md](jsdoc-guide.md) - JSDoc comment standards
- [api-docs-examples.md](api-docs-examples.md) - API documentation patterns
- [changelog-template.md](changelog-template.md) - Changelog format details
- [writing-style-guide.md](writing-style-guide.md) - Writing best practices

---

**Remember**: Documentation is a love letter to your future self and others who will use your code. Write documentation you'd want to find. Clear, complete, current documentation is a sign of professional software development.
