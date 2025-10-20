---
name: AVI Code Standards
description: TypeScript, React, Node.js, and testing standards for AVI development. Use when writing new code, reviewing code, refactoring, creating agents, or building features.
_protected: true
_version: "1.0.0"
_allowed_agents: ["meta-agent", "coder", "reviewer", "tester", "page-builder-agent"]
---

# AVI Code Standards Skill

## Purpose
Enforces consistent code quality, patterns, and best practices across all AVI development work.

## When to Use This Skill
- Writing new code
- Reviewing code
- Refactoring existing code
- Creating new agents
- Building features
- Implementing API endpoints
- Creating dynamic pages

## Core Principles

### 1. TypeScript Standards

**Strict Type Safety:**
- Always use strict mode (`"strict": true` in tsconfig.json)
- No `any` type - use proper types or `unknown`
- Prefer `interface` over `type` for object shapes
- Explicit return types on all functions

**Example:**
```typescript
// ✅ CORRECT
interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  capabilities: string[];
}

async function getAgent(id: string): Promise<Agent> {
  const agent = await db.agents.findById(id);
  if (!agent) {
    throw new Error(`Agent ${id} not found`);
  }
  return agent;
}

// ❌ WRONG
function getAgent(id): any {
  return db.agents.findById(id);
}
```

**Type Organization:**
```typescript
// Define interfaces in separate .types.ts files
// ComponentName.types.ts
export interface AgentPageProps {
  agentId: string;
  title: string;
  layout: 'grid' | 'single-column';
  components: PageComponent[];
}

export interface PageComponent {
  type: string;
  props: Record<string, unknown>;
}
```

### 2. React Component Standards

**Component Structure:**
```typescript
// ComponentName.tsx
import React, { useState, useEffect } from 'react';
import { ComponentNameProps } from './ComponentName.types';
import { useAgentPages } from '@/hooks/useAgentPages';

export function ComponentName({ agentId, title }: ComponentNameProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const { pages, fetchPages } = useAgentPages(agentId);

  useEffect(() => {
    fetchPages();
  }, [agentId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="component-name">
      <h1>{title}</h1>
      {/* Component content */}
    </div>
  );
}
```

**Component Rules:**
- Functional components only (no class components)
- Use hooks for state management
- Extract complex logic to custom hooks
- Keep components under 200 lines
- One component per file

**Custom Hooks:**
```typescript
// hooks/useAgentPages.ts
export function useAgentPages(agentId: string) {
  const [pages, setPages] = useState<AgentPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agent-pages/agents/${agentId}/pages`);
      const data = await response.json();
      setPages(data.pages);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { pages, loading, error, fetchPages };
}
```

### 3. API Design Standards

**RESTful Conventions:**
```typescript
// ✅ CORRECT
GET    /api/agents              // List agents
GET    /api/agents/:id          // Get agent
POST   /api/agents              // Create agent
PUT    /api/agents/:id          // Update agent
DELETE /api/agents/:id          // Delete agent

// Agent-specific resources
GET    /api/agents/:id/pages
POST   /api/agents/:id/pages
PUT    /api/agents/:id/pages/:pageId
DELETE /api/agents/:id/pages/:pageId
```

**Response Format:**
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

// Success response
{
  "success": true,
  "data": { "id": "agent-123", "name": "Coder" },
  "meta": { "timestamp": "2025-10-18T05:31:00Z", "version": "1.0.0" }
}

// Error response
{
  "success": false,
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with id 'agent-123' not found"
  }
}
```

**Error Handling:**
```typescript
// api/agents/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const agent = await getAgent(params.id);

    if (!agent) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent with id '${params.id}' not found`
          }
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: agent,
      meta: { timestamp: new Date().toISOString(), version: '1.0.0' }
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return Response.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}
```

### 4. Testing Standards (TDD - London School)

**Test Structure:**
```typescript
// ComponentName.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  describe('when rendering', () => {
    it('should display the title', () => {
      render(<ComponentName title="Test Title" agentId="agent-123" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  describe('when loading data', () => {
    it('should show loading state initially', () => {
      render(<ComponentName title="Test" agentId="agent-123" />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should display pages after loading', async () => {
      render(<ComponentName title="Test" agentId="agent-123" />);
      await waitFor(() => {
        expect(screen.getByText('Page 1')).toBeInTheDocument();
      });
    });
  });

  describe('when user interacts', () => {
    it('should create page when clicking add button', async () => {
      const user = userEvent.setup();
      render(<ComponentName title="Test" agentId="agent-123" />);

      await user.click(screen.getByRole('button', { name: /add page/i }));

      await waitFor(() => {
        expect(screen.getByText('New Page')).toBeInTheDocument();
      });
    });
  });
});
```

**Test Coverage Requirements:**
- Unit tests: 80% minimum coverage
- Integration tests: All critical paths
- E2E tests: User workflows
- No tests for trivial getters/setters

### 5. File Organization

**Standard Structure:**
```
/component-name/
├── ComponentName.tsx          # Main component
├── ComponentName.test.tsx     # Unit tests
├── ComponentName.types.ts     # TypeScript interfaces
├── ComponentName.styles.ts    # Styled components (if needed)
└── index.ts                   # Public exports
```

**Import Order:**
```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party imports
import { motion } from 'framer-motion';

// 3. Internal imports (absolute paths)
import { useAgentPages } from '@/hooks/useAgentPages';
import { AgentPage } from '@/types/agent';

// 4. Relative imports
import { ComponentNameProps } from './ComponentName.types';
```

### 6. Security Standards

**Input Validation:**
```typescript
// Validate all user input
function createPage(input: unknown): AgentPage {
  const schema = z.object({
    title: z.string().min(1).max(100),
    layout: z.enum(['grid', 'single-column', 'two-column']),
    components: z.array(z.object({
      type: z.string(),
      props: z.record(z.unknown())
    }))
  });

  const validated = schema.parse(input);
  return validated as AgentPage;
}
```

**XSS Prevention:**
```typescript
// ✅ CORRECT - Sanitize HTML
import DOMPurify from 'dompurify';

function renderUserContent(html: string) {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ❌ WRONG - Direct HTML injection
function renderUserContent(html: string) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

**Environment Variables:**
```typescript
// ✅ CORRECT - Never hardcode secrets
const apiKey = process.env.ANTHROPIC_API_KEY;

// ❌ WRONG - Hardcoded secrets
const apiKey = 'sk-ant-api03-...';
```

### 7. Performance Standards

**Code Splitting:**
```typescript
// Lazy load heavy components
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**Memoization:**
```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
export const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  const processedData = useMemo(() => {
    return data.map(item => expensiveOperation(item));
  }, [data]);

  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  return <div onClick={handleClick}>{processedData}</div>;
});
```

### 8. Documentation Standards

**Function Documentation:**
```typescript
/**
 * Fetches agent pages from the API
 *
 * @param agentId - Unique identifier for the agent
 * @param options - Optional fetch configuration
 * @returns Promise resolving to array of agent pages
 * @throws {AgentNotFoundError} When agent does not exist
 *
 * @example
 * ```typescript
 * const pages = await fetchAgentPages('agent-123');
 * console.log(pages.length);
 * ```
 */
export async function fetchAgentPages(
  agentId: string,
  options?: FetchOptions
): Promise<AgentPage[]> {
  // Implementation
}
```

## Code Quality Checklist

Before committing:
- [ ] TypeScript strict mode passing
- [ ] All tests passing
- [ ] ESLint errors resolved
- [ ] Prettier formatting applied
- [ ] No console.logs in production code
- [ ] Environment variables not hardcoded
- [ ] Error handling implemented
- [ ] Types properly defined
- [ ] Documentation updated
- [ ] Security vulnerabilities checked

## References
- [typescript-config.md](typescript-config.md) - TypeScript configuration (future)
- [eslint-rules.md](eslint-rules.md) - ESLint configuration (future)
- [prettier-config.md](prettier-config.md) - Prettier configuration (future)
- [testing-guide.md](testing-guide.md) - Comprehensive testing guide (future)
