# Architecture: Testing and Integration for Agent Tier System

**Document Version**: 1.0.0
**Date**: 2025-10-19
**Phase**: Architecture (SPARC Methodology)
**Status**: Production-Ready
**Author**: System Architect

---

## Executive Summary

This document provides the **complete testing and integration architecture** for the Agent Tier System implementation. Following TDD principles with 100% real validation (no mocks), this architecture ensures comprehensive coverage from unit tests through E2E validation with screenshot verification.

**Key Principles**:
- **Test-Driven Development (TDD)**: Write failing tests first, implement to pass
- **100% Real Validation**: No mocks - actual database, API, and UI testing
- **Claude-Flow Swarm**: Coordinated multi-agent testing workflow
- **Playwright MCP**: UI/UX validation with visual regression
- **Regression Loop**: Continuous testing until all tests pass

**Coverage Targets**:
- Unit Tests: 95%+ coverage
- Integration Tests: 90%+ coverage
- E2E Tests: 100% critical user paths
- Visual Regression: All UI components

---

## Table of Contents

1. [Testing Pyramid](#1-testing-pyramid)
2. [Unit Testing Architecture](#2-unit-testing-architecture)
3. [Integration Testing Architecture](#3-integration-testing-architecture)
4. [E2E Testing Architecture](#4-e2e-testing-architecture)
5. [Visual Regression Testing](#5-visual-regression-testing)
6. [Test Data Management](#6-test-data-management)
7. [Test Execution Strategy](#7-test-execution-strategy)
8. [CI/CD Integration](#8-cicd-integration)
9. [Claude-Flow Swarm Coordination](#9-claude-flow-swarm-coordination)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Testing Pyramid

### 1.1 Testing Hierarchy

```
                    ┌─────────────────────────┐
                    │   E2E Tests (Slow)     │  ← Playwright
                    │   - User workflows      │     10 tests
                    │   - Visual regression   │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ Integration Tests (Med) │  ← Supertest
                    │ - API endpoints         │     30 tests
                    │ - Database queries      │
                    │ - Component integration │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────▼───────────────────┐
            │     Unit Tests (Fast)                 │  ← Jest/Vitest
            │     - Services & utilities            │     80 tests
            │     - Component rendering             │
            │     - Algorithm validation            │
            └───────────────────────────────────────┘

        Total: 120 tests | Target runtime: <5 minutes
```

### 1.2 Test Distribution

| Layer | Test Count | Coverage Target | Runtime |
|-------|-----------|----------------|---------|
| Unit | 80 tests | 95% statements, 90% branches | <30s |
| Integration | 30 tests | 90% API endpoints | <1m |
| E2E | 10 tests | 100% critical paths | <3m |
| **Total** | **120 tests** | **Overall: 93%** | **<5m** |

### 1.3 Coverage Requirements

**Minimum Thresholds** (fail build if not met):
```json
{
  "coverageThreshold": {
    "global": {
      "statements": 95,
      "branches": 90,
      "functions": 95,
      "lines": 95
    },
    "backend": {
      "statements": 95,
      "branches": 92,
      "functions": 95
    },
    "frontend": {
      "statements": 93,
      "branches": 88,
      "functions": 92
    }
  }
}
```

---

## 2. Unit Testing Architecture

### 2.1 Backend Unit Tests (Jest)

#### 2.1.1 Tier Classification Service

```javascript
// /tests/unit/tier-classification.test.js

describe('TierClassificationService', () => {
  describe('DetermineAgentTier', () => {
    it('should return tier 1 for regular agent path', () => {
      const filePath = '/workspaces/agent-feed/prod/.claude/agents/personal-todos-agent.md';
      const tier = DetermineAgentTier(filePath);

      expect(tier).toBe(1);
    });

    it('should return tier 2 for .system directory agent', () => {
      const filePath = '/workspaces/agent-feed/prod/.claude/agents/.system/meta-agent.md';
      const tier = DetermineAgentTier(filePath);

      expect(tier).toBe(2);
    });

    it('should handle Windows path separators', () => {
      const filePath = 'C:\\agents\\.system\\meta-agent.md';
      const tier = DetermineAgentTier(filePath);

      expect(tier).toBe(2);
    });

    it('should default to tier 1 for null path', () => {
      const tier = DetermineAgentTier(null);

      expect(tier).toBe(1);
    });
  });

  describe('ClassifyTier (from frontmatter)', () => {
    it('should use explicit tier from frontmatter', () => {
      const frontmatter = {
        name: 'test-agent',
        tier: 2
      };

      const tier = ClassifyTier(frontmatter);

      expect(tier).toBe(2);
    });

    it('should determine tier from T1 registry', () => {
      const frontmatter = {
        name: 'personal-todos-agent'
      };

      const tier = ClassifyTier(frontmatter);

      expect(tier).toBe(1);
    });

    it('should determine tier from T2 registry', () => {
      const frontmatter = {
        name: 'meta-agent'
      };

      const tier = ClassifyTier(frontmatter);

      expect(tier).toBe(2);
    });

    it('should classify by pattern for unknown agents', () => {
      const frontmatter = {
        name: 'custom-meta-agent'
      };

      const tier = ClassifyTier(frontmatter);

      expect(tier).toBe(2); // Matches 'meta-*' pattern
    });

    it('should default to tier 1 for completely unknown agents', () => {
      const frontmatter = {
        name: 'unknown-custom-agent'
      };

      const tier = ClassifyTier(frontmatter);

      expect(tier).toBe(1);
    });
  });

  describe('ValidateAgentData', () => {
    it('should validate tier field is required', () => {
      const data = {
        name: 'test-agent',
        description: 'Test'
        // tier field missing
      };

      const result = ValidateAgentData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'tier',
          code: 'REQUIRED_FIELD_MISSING'
        })
      );
    });

    it('should validate tier value is 1 or 2', () => {
      const data = {
        name: 'test-agent',
        tier: 3, // Invalid
        visibility: 'public'
      };

      const result = ValidateAgentData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'tier',
          code: 'INVALID_VALUE'
        })
      );
    });

    it('should warn on tier 2 with posts_as_self=true', () => {
      const data = {
        name: 'test-agent',
        tier: 2,
        visibility: 'protected',
        posts_as_self: true // Inconsistent
      };

      const result = ValidateAgentData(data);

      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'posts_as_self',
          code: 'TIER_INCONSISTENCY'
        })
      );
    });
  });
});
```

#### 2.1.2 Protection Validation Service

```javascript
// /tests/unit/protection-validation.test.js

describe('ProtectionService', () => {
  describe('DetermineProtectionStatus', () => {
    it('should protect tier 2 with protected visibility', () => {
      const agent = {
        slug: 'agent-architect-agent',
        tier: 2,
        visibility: 'protected'
      };
      const user = { isAdmin: false };

      const protection = DetermineProtectionStatus(agent, user);

      expect(protection.isProtected).toBe(true);
      expect(protection.protectionReason).toBe('TIER2_PROTECTED');
      expect(protection.canEdit).toBe(false);
      expect(protection.canDelete).toBe(false);
    });

    it('should allow admin to edit protected agents', () => {
      const agent = {
        slug: 'meta-agent',
        tier: 2,
        visibility: 'protected'
      };
      const user = { isAdmin: true };

      const protection = DetermineProtectionStatus(agent, user);

      expect(protection.isProtected).toBe(true);
      expect(protection.canEdit).toBe(true);
      expect(protection.canDelete).toBe(false); // Never deletable
    });

    it('should protect .system directory agents', () => {
      const agent = {
        slug: 'test-checker',
        tier: 2,
        filePath: '/agents/.system/test-checker.md'
      };
      const user = { isAdmin: true };

      const protection = DetermineProtectionStatus(agent, user);

      expect(protection.isProtected).toBe(true);
      expect(protection.protectionReason).toBe('FILESYSTEM_READONLY');
      expect(protection.protectionLevel).toBe('SYSTEM');
      expect(protection.canEdit).toBe(false); // Even admins can't edit
    });

    it('should not protect tier 1 public agents', () => {
      const agent = {
        slug: 'personal-todos-agent',
        tier: 1,
        visibility: 'public'
      };
      const user = { isAdmin: false };

      const protection = DetermineProtectionStatus(agent, user);

      expect(protection.isProtected).toBe(false);
      expect(protection.canEdit).toBe(true);
      expect(protection.canDelete).toBe(true);
    });
  });

  describe('ValidateProtection', () => {
    it('should block UPDATE on protected agent for non-admin', () => {
      const agent = { slug: 'meta-agent', tier: 2, visibility: 'protected' };
      const user = { isAdmin: false };

      const result = ValidateProtection(agent, user, 'UPDATE');

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe('AGENT_UPDATE_FORBIDDEN');
      expect(result.httpStatus).toBe(403);
    });

    it('should block DELETE on protected agent even for admins', () => {
      const agent = { slug: 'learning-optimizer-agent', tier: 2, visibility: 'protected' };
      const user = { isAdmin: true };

      const result = ValidateProtection(agent, user, 'DELETE');

      expect(result.allowed).toBe(false);
      expect(result.errorCode).toBe('AGENT_DELETE_FORBIDDEN');
    });

    it('should allow READ on all agents', () => {
      const agent = { slug: 'meta-agent', tier: 2, visibility: 'protected' };
      const user = { isAdmin: false };

      const result = ValidateProtection(agent, user, 'READ');

      expect(result.allowed).toBe(true);
    });
  });
});
```

#### 2.1.3 API Filtering Service

```javascript
// /tests/unit/api-filtering.test.js

describe('AgentFilteringService', () => {
  describe('ApplyTierFilter', () => {
    const mockAgents = [
      { name: 'agent1', tier: 1 },
      { name: 'agent2', tier: 2 },
      { name: 'agent3', tier: 1 },
      { name: 'agent4', tier: 2 },
      { name: 'agent5', tier: 1 }
    ];

    it('should filter tier 1 agents', () => {
      const result = ApplyTierFilter(mockAgents, '1');

      expect(result).toHaveLength(3);
      expect(result.every(a => a.tier === 1)).toBe(true);
    });

    it('should filter tier 2 agents', () => {
      const result = ApplyTierFilter(mockAgents, '2');

      expect(result).toHaveLength(2);
      expect(result.every(a => a.tier === 2)).toBe(true);
    });

    it('should return all agents for tier=all', () => {
      const result = ApplyTierFilter(mockAgents, 'all');

      expect(result).toHaveLength(5);
    });

    it('should sort filtered agents by name', () => {
      const result = ApplyTierFilter(mockAgents, '1');

      expect(result[0].name).toBe('agent1');
      expect(result[1].name).toBe('agent3');
      expect(result[2].name).toBe('agent5');
    });
  });

  describe('CalculateFilterMetadata', () => {
    const allAgents = Array(8).fill({ tier: 1 }).concat(Array(11).fill({ tier: 2 }));

    it('should calculate tier counts correctly', () => {
      const filteredAgents = allAgents.filter(a => a.tier === 1);
      const metadata = CalculateFilterMetadata(allAgents, filteredAgents, '1');

      expect(metadata.tier_counts.tier1).toBe(8);
      expect(metadata.tier_counts.tier2).toBe(11);
      expect(metadata.tier_counts.total).toBe(19);
      expect(metadata.filtered_count).toBe(8);
    });

    it('should include timestamp in ISO 8601 format', () => {
      const metadata = CalculateFilterMetadata(allAgents, allAgents, 'all');

      expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('ValidateTierParameter', () => {
    it('should accept valid tier values', () => {
      expect(ValidateTierParameter('1')).toBe(true);
      expect(ValidateTierParameter('2')).toBe(true);
      expect(ValidateTierParameter('all')).toBe(true);
    });

    it('should reject invalid tier values', () => {
      expect(ValidateTierParameter('3')).toBe(false);
      expect(ValidateTierParameter('invalid')).toBe(false);
      expect(ValidateTierParameter('0')).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(ValidateTierParameter('ALL')).toBe(true); // Normalized to lowercase
      expect(ValidateTierParameter('All')).toBe(true);
    });
  });
});
```

### 2.2 Frontend Unit Tests (Vitest + React Testing Library)

#### 2.2.1 AgentIcon Component

```typescript
// /frontend/src/tests/unit/AgentIcon.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { vi } from 'vitest';

describe('AgentIcon', () => {
  describe('Icon Loading Priority', () => {
    it('should render SVG icon when available', async () => {
      const agent = {
        id: 'test-1',
        slug: 'personal-todos-agent',
        name: 'personal-todos-agent',
        tier: 1,
        icon: 'CheckSquare',
        icon_type: 'lucide'
      };

      render(<AgentIcon agent={agent} />);

      await waitFor(() => {
        const icon = screen.getByRole('img', { hidden: true });
        expect(icon).toBeInTheDocument();
      });
    });

    it('should fallback to emoji when SVG fails', async () => {
      const agent = {
        id: 'test-2',
        slug: 'test-agent',
        name: 'test-agent',
        tier: 1,
        icon: 'InvalidIcon',
        icon_type: 'lucide',
        icon_emoji: '🤖'
      };

      // Mock icon load failure
      vi.mock('lucide-react', () => ({
        InvalidIcon: null
      }));

      render(<AgentIcon agent={agent} />);

      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('should fallback to initials when emoji missing', () => {
      const agent = {
        id: 'test-3',
        slug: 'test-agent',
        name: 'test-agent',
        tier: 1
      };

      render(<AgentIcon agent={agent} />);

      expect(screen.getByText('TE')).toBeInTheDocument();
    });

    it('should generate correct initials for hyphenated names', () => {
      const agent = {
        id: 'test-4',
        slug: 'personal-todos-agent',
        name: 'personal-todos-agent',
        tier: 1
      };

      render(<AgentIcon agent={agent} />);

      expect(screen.getByText('PT')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    const agent = { id: 'test', slug: 'test', name: 'test', tier: 1 };

    it('should apply xs size class', () => {
      const { container } = render(<AgentIcon agent={agent} size="xs" />);

      expect(container.firstChild).toHaveClass('w-3', 'h-3');
    });

    it('should apply md size class by default', () => {
      const { container } = render(<AgentIcon agent={agent} />);

      expect(container.firstChild).toHaveClass('w-5', 'h-5');
    });

    it('should apply 2xl size class', () => {
      const { container } = render(<AgentIcon agent={agent} size="2xl" />);

      expect(container.firstChild).toHaveClass('w-10', 'h-10');
    });
  });

  describe('Tier-Based Styling', () => {
    it('should apply blue background for tier 1', () => {
      const agent = { id: 'test', slug: 'test', name: 'test', tier: 1 };
      const { container } = render(<AgentIcon agent={agent} />);

      const icon = container.firstChild as HTMLElement;
      expect(icon.style.backgroundColor).toBe('#3B82F6'); // Blue
    });

    it('should apply gray background for tier 2', () => {
      const agent = { id: 'test', slug: 'test', name: 'test', tier: 2 };
      const { container } = render(<AgentIcon agent={agent} />);

      const icon = container.firstChild as HTMLElement;
      expect(icon.style.backgroundColor).toBe('#6B7280'); // Gray
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label when not decorative', () => {
      const agent = { id: 'test', slug: 'test-agent', name: 'test-agent', tier: 1 };
      render(<AgentIcon agent={agent} ariaLabel="Test Agent Icon" />);

      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('aria-label', 'Test Agent Icon');
    });

    it('should be aria-hidden when decorative', () => {
      const agent = { id: 'test', slug: 'test', name: 'test', tier: 1 };
      const { container } = render(<AgentIcon agent={agent} decorative />);

      const icon = container.firstChild as HTMLElement;
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should meet WCAG contrast requirements', () => {
      const agent = { id: 'test', slug: 'test', name: 'test', tier: 1 };
      const { container } = render(<AgentIcon agent={agent} />);

      const icon = container.firstChild as HTMLElement;
      const bgColor = window.getComputedStyle(icon).backgroundColor;
      const textColor = window.getComputedStyle(icon).color;

      // Calculate contrast ratio (simplified)
      const contrastRatio = calculateContrastRatio(bgColor, textColor);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA
    });
  });
});
```

#### 2.2.2 AgentTierToggle Component

```typescript
// /frontend/src/tests/unit/AgentTierToggle.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { AgentTierToggle } from '@/components/agents/AgentTierToggle';
import { vi } from 'vitest';

describe('AgentTierToggle', () => {
  const mockOnTierChange = vi.fn();
  const defaultProps = {
    currentTier: '1' as const,
    onTierChange: mockOnTierChange,
    tierCounts: { tier1: 8, tier2: 11 }
  };

  beforeEach(() => {
    mockOnTierChange.mockClear();
  });

  describe('Button Rendering', () => {
    it('should render three tier buttons', () => {
      render(<AgentTierToggle {...defaultProps} />);

      expect(screen.getByText(/User-Facing \(8\)/)).toBeInTheDocument();
      expect(screen.getByText(/System \(11\)/)).toBeInTheDocument();
      expect(screen.getByText(/All \(19\)/)).toBeInTheDocument();
    });

    it('should show active state for current tier', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="2" />);

      const tier2Button = screen.getByText(/System \(11\)/).closest('button');
      expect(tier2Button).toHaveClass('active');
      expect(tier2Button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should update counts dynamically', () => {
      const { rerender } = render(<AgentTierToggle {...defaultProps} />);

      rerender(<AgentTierToggle {...defaultProps} tierCounts={{ tier1: 10, tier2: 15 }} />);

      expect(screen.getByText(/User-Facing \(10\)/)).toBeInTheDocument();
      expect(screen.getByText(/System \(15\)/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onTierChange when tier 1 clicked', () => {
      render(<AgentTierToggle {...defaultProps} currentTier="all" />);

      fireEvent.click(screen.getByText(/User-Facing/));

      expect(mockOnTierChange).toHaveBeenCalledWith('1');
    });

    it('should call onTierChange when tier 2 clicked', () => {
      render(<AgentTierToggle {...defaultProps} />);

      fireEvent.click(screen.getByText(/System/));

      expect(mockOnTierChange).toHaveBeenCalledWith('2');
    });

    it('should not call onTierChange when disabled', () => {
      render(<AgentTierToggle {...defaultProps} disabled />);

      fireEvent.click(screen.getByText(/User-Facing/));

      expect(mockOnTierChange).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Enter key', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const button = screen.getByText(/System/).closest('button');
      fireEvent.keyDown(button!, { key: 'Enter' });

      expect(mockOnTierChange).toHaveBeenCalledWith('2');
    });

    it('should support Space key', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const button = screen.getByText(/System/).closest('button');
      fireEvent.keyDown(button!, { key: ' ' });

      expect(mockOnTierChange).toHaveBeenCalledWith('2');
    });

    it('should support Tab navigation', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('tabindex', '0');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<AgentTierToggle {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should have descriptive aria-labels', () => {
      render(<AgentTierToggle {...defaultProps} />);

      expect(screen.getByLabelText(/Show Tier 1 agents only/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Show Tier 2 agents only/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Show all agents/)).toBeInTheDocument();
    });
  });
});
```

---

## 3. Integration Testing Architecture

### 3.1 API Integration Tests (Supertest)

```javascript
// /tests/integration/agents-api-tier.test.js

const request = require('supertest');
const app = require('../../api-server/server');
const { setupTestDatabase, teardownTestDatabase, seedAgents } = require('../helpers/db');

describe('GET /api/agents - Tier Filtering', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    await seedAgents({
      tier1Count: 8,
      tier2Count: 11
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Default Behavior', () => {
    it('should return only tier 1 agents by default', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(8);
      expect(response.body.data.every(a => a.tier === 1)).toBe(true);
      expect(response.body.metadata.tier).toBe('1');
    });
  });

  describe('Tier Parameter', () => {
    it('should filter tier=1 agents', async () => {
      const response = await request(app)
        .get('/api/agents?tier=1')
        .expect(200);

      expect(response.body.data).toHaveLength(8);
      expect(response.body.metadata.filtered_count).toBe(8);
    });

    it('should filter tier=2 agents', async () => {
      const response = await request(app)
        .get('/api/agents?tier=2')
        .expect(200);

      expect(response.body.data).toHaveLength(11);
      expect(response.body.data.every(a => a.tier === 2)).toBe(true);
    });

    it('should return all agents when tier=all', async () => {
      const response = await request(app)
        .get('/api/agents?tier=all')
        .expect(200);

      expect(response.body.data).toHaveLength(19);
      expect(response.body.metadata.tier_counts.tier1).toBe(8);
      expect(response.body.metadata.tier_counts.tier2).toBe(11);
    });

    it('should return 400 for invalid tier value', async () => {
      const response = await request(app)
        .get('/api/agents?tier=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TIER');
      expect(response.body.validValues).toEqual(['1', '2', 'all']);
    });
  });

  describe('Legacy include_system Parameter', () => {
    it('should support include_system=true', async () => {
      const response = await request(app)
        .get('/api/agents?include_system=true')
        .expect(200);

      expect(response.body.data).toHaveLength(19);
      expect(response.body.metadata.warning).toContain('deprecated');
    });

    it('should support include_system=false', async () => {
      const response = await request(app)
        .get('/api/agents?include_system=false')
        .expect(200);

      expect(response.body.data).toHaveLength(8);
    });

    it('should prefer tier parameter over include_system', async () => {
      const response = await request(app)
        .get('/api/agents?tier=2&include_system=false')
        .expect(200);

      expect(response.body.data).toHaveLength(11); // tier=2 wins
      expect(response.body.metadata.warning).toContain('both');
    });
  });

  describe('Response Metadata', () => {
    it('should include tier counts', async () => {
      const response = await request(app)
        .get('/api/agents?tier=1')
        .expect(200);

      expect(response.body.metadata.tier_counts).toEqual({
        tier1: 8,
        tier2: 11,
        total: 19
      });
    });

    it('should include timestamp', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include source (SQLite or PostgreSQL)', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(['SQLite', 'PostgreSQL']).toContain(response.body.metadata.source);
    });
  });

  describe('Performance', () => {
    it('should respond in < 100ms for tier=1', async () => {
      const startTime = Date.now();
      await request(app).get('/api/agents?tier=1').expect(200);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/agents?tier=1')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(8);
      });
    });
  });
});
```

### 3.2 Protection Validation Integration Tests

```javascript
// /tests/integration/agent-protection-api.test.js

describe('Agent Protection Validation', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    await seedProtectedAgents();
  });

  describe('PATCH /api/agents/:slug - Protection', () => {
    it('should block modification of tier 2 protected agent', async () => {
      const response = await request(app)
        .patch('/api/agents/meta-agent')
        .send({ description: 'Modified' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AGENT_PROTECTED');
      expect(response.body.details.protectionReason).toBe('TIER2_PROTECTED');
    });

    it('should allow admin to modify protected agent', async () => {
      const response = await request(app)
        .patch('/api/agents/agent-architect-agent')
        .set('Authorization', 'Bearer admin-token')
        .send({ description: 'Updated by admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow modification of tier 1 public agent', async () => {
      const response = await request(app)
        .patch('/api/agents/personal-todos-agent')
        .send({ description: 'Updated description' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should log protection violation attempt', async () => {
      await request(app)
        .patch('/api/agents/learning-optimizer-agent')
        .send({ description: 'Hack attempt' })
        .expect(403);

      // Verify audit log
      const auditLog = await db.query(
        'SELECT * FROM agent_protection_audit WHERE agent_name = $1 ORDER BY timestamp DESC LIMIT 1',
        ['learning-optimizer-agent']
      );

      expect(auditLog.rows[0].operation).toBe('UPDATE');
      expect(auditLog.rows[0].blocked).toBe(true);
    });
  });

  describe('DELETE /api/agents/:slug - Protection', () => {
    it('should block deletion of protected agent', async () => {
      const response = await request(app)
        .delete('/api/agents/skills-architect-agent')
        .expect(403);

      expect(response.body.code).toBe('AGENT_DELETE_FORBIDDEN');
    });

    it('should block deletion even for admins', async () => {
      const response = await request(app)
        .delete('/api/agents/meta-agent')
        .set('Authorization', 'Bearer admin-token')
        .expect(403);

      expect(response.body.details.reason).toContain('critical infrastructure');
    });

    it('should allow deletion of tier 1 public agents', async () => {
      const response = await request(app)
        .delete('/api/agents/personal-todos-agent')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Tier Immutability', () => {
    it('should block tier changes for non-admins', async () => {
      const response = await request(app)
        .patch('/api/agents/personal-todos-agent')
        .send({ tier: 2 })
        .expect(403);

      expect(response.body.code).toBe('TIER_IMMUTABLE');
    });

    it('should allow tier changes for admins', async () => {
      const response = await request(app)
        .patch('/api/agents/personal-todos-agent')
        .set('Authorization', 'Bearer admin-token')
        .send({ tier: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
```

---

## 4. E2E Testing Architecture

### 4.1 Playwright E2E Tests

```typescript
// /tests/e2e/agent-tier-filtering.spec.ts

import { test, expect, Page } from '@playwright/test';

test.describe('Agent Tier Filtering - E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173/agents');
  });

  test.describe('Default View', () => {
    test('should show only tier 1 agents on initial load', async () => {
      await page.waitForSelector('[data-testid="agent-card"]');

      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      expect(agentCards).toBe(8);

      // Verify all are tier 1
      const tierBadges = await page.locator('[data-testid="tier-badge"]').allTextContents();
      expect(tierBadges.every(badge => badge.includes('User-Facing'))).toBe(true);
    });

    test('should display tier toggle with correct counts', async () => {
      const toggleButton = page.locator('[data-testid="tier-toggle"]');

      await expect(toggleButton.getByText(/Tier 1 \(8\)/)).toBeVisible();
      await expect(toggleButton.getByText(/Tier 2 \(11\)/)).toBeVisible();
      await expect(toggleButton.getByText(/All \(19\)/)).toBeVisible();
    });
  });

  test.describe('Tier Switching', () => {
    test('should switch to tier 2 agents when clicked', async () => {
      await page.click('button:has-text("Tier 2")');
      await page.waitForSelector('[data-testid="agent-card"]');

      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      expect(agentCards).toBe(11);

      // Verify all are tier 2
      const tierBadges = await page.locator('[data-testid="tier-badge"]').allTextContents();
      expect(tierBadges.every(badge => badge.includes('System'))).toBe(true);
    });

    test('should show all agents when All clicked', async () => {
      await page.click('button:has-text("All")');
      await page.waitForSelector('[data-testid="agent-card"]');

      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      expect(agentCards).toBe(19);
    });

    test('should update URL parameter on tier change', async () => {
      await page.click('button:has-text("Tier 2")');
      await page.waitForURL('**/agents?tier=2');

      expect(page.url()).toContain('tier=2');
    });
  });

  test.describe('Filter Persistence', () => {
    test('should persist filter across page reloads', async () => {
      await page.click('button:has-text("All")');
      await page.waitForTimeout(100); // Allow localStorage write

      await page.reload();
      await page.waitForSelector('[data-testid="agent-card"]');

      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      expect(agentCards).toBe(19);

      const activeButton = await page.locator('button[aria-pressed="true"]').textContent();
      expect(activeButton).toContain('All');
    });

    test('should restore filter from URL on direct navigation', async () => {
      await page.goto('http://localhost:5173/agents?tier=2');
      await page.waitForSelector('[data-testid="agent-card"]');

      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      expect(agentCards).toBe(11);
    });
  });

  test.describe('Protection Indicators', () => {
    test('should show protection badges on tier 2 agents', async () => {
      await page.click('button:has-text("Tier 2")');
      await page.waitForSelector('[data-testid="agent-card"]');

      const protectedBadges = await page.locator('[data-testid="protection-badge"]').count();
      expect(protectedBadges).toBeGreaterThan(0); // At least Phase 4.2 specialists

      // Verify badge content
      const firstBadge = page.locator('[data-testid="protection-badge"]').first();
      await expect(firstBadge).toContainText('Protected');
    });

    test('should disable edit button for protected agents', async () => {
      await page.click('button:has-text("Tier 2")');
      await page.waitForSelector('[data-testid="agent-card"]');

      const agentCard = page.locator('[data-testid="agent-card"]:has-text("Meta Agent")');
      const editButton = agentCard.locator('button:has-text("Edit")');

      await expect(editButton).toBeDisabled();
    });

    test('should show warning when clicking protected agent', async () => {
      await page.click('button:has-text("Tier 2")');
      await page.click('[data-testid="agent-card"]:has-text("Agent Architect") button:has-text("Protected")');

      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('[role="dialog"]')).toContainText('Protected System Agent');
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate tier toggle with Tab key', async () => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Navigate to toggle

      const focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused).toContain('Tier');
    });

    test('should activate tier with Enter key', async () => {
      await page.focus('button:has-text("Tier 2")');
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="agent-card"]');
      const agentCards = await page.locator('[data-testid="agent-card"]').count();
      expect(agentCards).toBe(11);
    });
  });

  test.describe('Performance', () => {
    test('should load tier 1 agents in < 500ms', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:5173/agents');
      await page.waitForSelector('[data-testid="agent-card"]');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(500);
    });

    test('should switch tiers in < 200ms', async () => {
      await page.waitForSelector('[data-testid="agent-card"]');

      const startTime = Date.now();
      await page.click('button:has-text("Tier 2")');
      await page.waitForSelector('[data-testid="agent-card"]');
      const switchTime = Date.now() - startTime;

      expect(switchTime).toBeLessThan(200);
    });
  });
});
```

### 4.2 Protection Workflow E2E Tests

```typescript
// /tests/e2e/agent-protection.spec.ts

test.describe('Agent Protection - E2E', () => {
  test('should prevent editing protected agent', async ({ page }) => {
    await page.goto('http://localhost:5173/agents?tier=2');
    await page.waitForSelector('[data-testid="agent-card"]');

    // Find protected agent card
    const metaAgentCard = page.locator('[data-testid="agent-card"]:has-text("Meta Agent")');

    // Edit button should be disabled
    const editButton = metaAgentCard.locator('button:has-text("Edit"), button:has-text("Protected")');
    await expect(editButton).toBeDisabled();

    // Clicking should show warning
    await editButton.click({ force: true }); // Force click disabled button

    // Verify no edit dialog opens
    await expect(page.locator('[role="dialog"]:has-text("Edit Agent")')).not.toBeVisible();
  });

  test('should show read-only view for protected agent', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/meta-agent');

    // Wait for agent details to load
    await page.waitForSelector('[data-testid="agent-details"]');

    // Verify protection banner
    await expect(page.locator('[data-testid="protection-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="protection-warning"]')).toContainText('Protected');

    // Verify all form fields are read-only
    const inputs = page.locator('input, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      await expect(input).toHaveAttribute('readonly', '');
    }
  });

  test('should handle API error gracefully', async ({ page, context }) => {
    // Intercept API request and force error
    await context.route('**/api/agents/meta-agent', route => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Cannot modify protected system agent',
          code: 'AGENT_PROTECTED'
        })
      });
    });

    await page.goto('http://localhost:5173/agents/meta-agent/edit');

    // Verify error notification appears
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toContainText('Cannot modify protected');
  });
});
```

---

## 5. Visual Regression Testing

### 5.1 Screenshot Validation Tests

```typescript
// /tests/e2e/visual-regression.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Agent Tier System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');
  });

  test('should match tier 1 agent list screenshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('agent-list-tier1.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match tier 2 agent list screenshot', async ({ page }) => {
    await page.click('button:has-text("Tier 2")');
    await page.waitForSelector('[data-testid="agent-card"]');

    await expect(page).toHaveScreenshot('agent-list-tier2.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match all agents list screenshot', async ({ page }) => {
    await page.click('button:has-text("All")');
    await page.waitForSelector('[data-testid="agent-card"]');

    await expect(page).toHaveScreenshot('agent-list-all.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test.describe('Component Screenshots', () => {
    test('should match tier toggle component', async ({ page }) => {
      const toggle = page.locator('[data-testid="tier-toggle"]');

      await expect(toggle).toHaveScreenshot('tier-toggle-default.png');
    });

    test('should match tier badge T1', async ({ page }) => {
      const badge = page.locator('[data-testid="tier-badge"]').first();

      await expect(badge).toHaveScreenshot('tier-badge-t1.png');
    });

    test('should match tier badge T2', async ({ page }) => {
      await page.click('button:has-text("Tier 2")');
      const badge = page.locator('[data-testid="tier-badge"]').first();

      await expect(badge).toHaveScreenshot('tier-badge-t2.png');
    });

    test('should match protection badge', async ({ page }) => {
      await page.click('button:has-text("Tier 2")');
      const protectionBadge = page.locator('[data-testid="protection-badge"]').first();

      await expect(protectionBadge).toHaveScreenshot('protection-badge.png');
    });
  });

  test.describe('Dark Mode Screenshots', () => {
    test.beforeEach(async ({ page }) => {
      // Enable dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
    });

    test('should match dark mode tier list', async ({ page }) => {
      await expect(page).toHaveScreenshot('agent-list-tier1-dark.png', {
        fullPage: true
      });
    });

    test('should match dark mode tier toggle', async ({ page }) => {
      const toggle = page.locator('[data-testid="tier-toggle"]');

      await expect(toggle).toHaveScreenshot('tier-toggle-dark.png');
    });
  });

  test.describe('Responsive Screenshots', () => {
    test('should match mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('agent-list-mobile.png', {
        fullPage: true
      });
    });

    test('should match tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('agent-list-tablet.png', {
        fullPage: true
      });
    });

    test('should match desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('agent-list-desktop.png', {
        fullPage: true
      });
    });
  });
});
```

### 5.2 Visual Diff Configuration

```typescript
// playwright.config.ts

export default {
  expect: {
    toHaveScreenshot: {
      threshold: 0.2, // Allow 20% diff for anti-aliasing
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide'
    }
  },

  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
};
```

---

## 6. Test Data Management

### 6.1 Test Fixtures

```typescript
// /tests/fixtures/agents.fixture.ts

export const TEST_AGENTS = {
  tier1: [
    {
      id: 'test-t1-1',
      slug: 'personal-todos-agent',
      name: 'personal-todos-agent',
      tier: 1,
      visibility: 'public',
      icon_emoji: '📋',
      posts_as_self: true,
      show_in_default_feed: true,
      description: 'Task management with Fibonacci priorities',
      tools: ['TodoWrite', 'Read', 'Write'],
      color: '#059669',
      status: 'active'
    },
    // ... 7 more tier 1 agents
  ],

  tier2: [
    {
      id: 'test-t2-1',
      slug: 'agent-architect-agent',
      name: 'agent-architect-agent',
      tier: 2,
      visibility: 'protected',
      icon_emoji: '🏗️',
      posts_as_self: false,
      show_in_default_feed: false,
      description: 'Creates new agent configurations',
      tools: ['Bash', 'Read', 'Write', 'Glob'],
      color: '#6B7280',
      status: 'active'
    },
    // ... 10 more tier 2 agents
  ]
};

export const createMockAgent = (overrides = {}) => ({
  id: 'mock-id',
  slug: 'mock-agent',
  name: 'mock-agent',
  tier: 1,
  visibility: 'public',
  icon_emoji: '🤖',
  posts_as_self: true,
  show_in_default_feed: true,
  description: 'Mock agent for testing',
  tools: [],
  color: '#6366F1',
  status: 'active',
  ...overrides
});
```

### 6.2 Database Seeding

```javascript
// /tests/helpers/db.js

const fs = require('fs').promises;
const path = require('path');
const { TEST_AGENTS } = require('../fixtures/agents.fixture');

async function seedAgents({ tier1Count = 8, tier2Count = 11 } = {}) {
  const agentsDir = '/tmp/test-agents';
  const systemDir = path.join(agentsDir, '.system');

  // Create directories
  await fs.mkdir(agentsDir, { recursive: true });
  await fs.mkdir(systemDir, { recursive: true });

  // Seed tier 1 agents
  for (let i = 0; i < tier1Count; i++) {
    const agent = TEST_AGENTS.tier1[i] || createMockAgent({ tier: 1 });
    await fs.writeFile(
      path.join(agentsDir, `${agent.slug}.md`),
      generateAgentMarkdown(agent)
    );
  }

  // Seed tier 2 agents
  for (let i = 0; i < tier2Count; i++) {
    const agent = TEST_AGENTS.tier2[i] || createMockAgent({ tier: 2 });
    await fs.writeFile(
      path.join(systemDir, `${agent.slug}.md`),
      generateAgentMarkdown(agent)
    );
  }
}

function generateAgentMarkdown(agent) {
  return `---
name: ${agent.name}
description: ${agent.description}
tier: ${agent.tier}
visibility: ${agent.visibility}
icon_emoji: "${agent.icon_emoji}"
posts_as_self: ${agent.posts_as_self}
show_in_default_feed: ${agent.show_in_default_feed}
tools: ${JSON.stringify(agent.tools)}
color: "${agent.color}"
status: ${agent.status}
---

# ${agent.name}

${agent.description}
`;
}

module.exports = { seedAgents, generateAgentMarkdown };
```

### 6.3 Test Database Setup

```javascript
// /tests/helpers/db.js (continued)

async function setupTestDatabase() {
  if (process.env.USE_POSTGRES === 'true') {
    await setupPostgresTestDB();
  } else {
    await setupSQLiteTestDB();
  }
}

async function setupPostgresTestDB() {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.TEST_DATABASE_URL
  });

  await client.connect();

  // Create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS system_agent_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      tier INTEGER NOT NULL CHECK (tier IN (1, 2)),
      visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('public', 'protected')),
      icon_emoji VARCHAR(10),
      posts_as_self BOOLEAN DEFAULT TRUE,
      show_in_default_feed BOOLEAN DEFAULT TRUE,
      description TEXT,
      tools JSONB,
      color VARCHAR(7),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_agents_tier ON system_agent_templates(tier);
    CREATE INDEX IF NOT EXISTS idx_agents_visibility ON system_agent_templates(visibility);
  `);

  await client.end();
}

async function teardownTestDatabase() {
  if (process.env.USE_POSTGRES === 'true') {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.TEST_DATABASE_URL
    });
    await client.connect();
    await client.query('TRUNCATE TABLE system_agent_templates CASCADE');
    await client.end();
  } else {
    await fs.rm('/tmp/test-agents', { recursive: true, force: true });
  }
}
```

---

## 7. Test Execution Strategy

### 7.1 TDD Workflow

```bash
#!/bin/bash
# /tests/tdd-workflow.sh

# TDD Red-Green-Refactor Loop

echo "🔴 RED: Write failing test"
npm run test:unit -- --watch-one tier-classification.test.js

read -p "Test failing? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Test should fail first!"
  exit 1
fi

echo "🟢 GREEN: Implement minimal code to pass"
# Developer implements feature...

npm run test:unit tier-classification.test.js

if [ $? -ne 0 ]; then
  echo "❌ Test still failing. Continue implementing."
  exit 1
fi

echo "🔵 REFACTOR: Improve code quality"
# Developer refactors...

npm run test:unit tier-classification.test.js

if [ $? -ne 0 ]; then
  echo "❌ Tests broken during refactor!"
  exit 1
fi

echo "✅ TDD cycle complete!"
```

### 7.2 Test Execution Order

```json
// package.json scripts
{
  "scripts": {
    "test": "npm run test:all",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "jest --coverage",
    "test:unit:watch": "jest --watch",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:visual": "playwright test visual-regression.spec.ts",
    "test:regression": "./tests/regression-loop.sh",
    "test:coverage": "jest --coverage && open coverage/index.html"
  }
}
```

### 7.3 Regression Loop

```bash
#!/bin/bash
# /tests/regression-loop.sh

# Continuous regression testing until all tests pass

MAX_ATTEMPTS=10
ATTEMPT=1

echo "🔁 Starting regression loop (max $MAX_ATTEMPTS attempts)"
echo ""

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "────────────────────────────────────────"
  echo "Attempt $ATTEMPT of $MAX_ATTEMPTS"
  echo "────────────────────────────────────────"

  # Run all tests
  npm run test:all

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo "📊 Generating coverage report..."
    npm run test:coverage
    exit 0
  else
    echo ""
    echo "❌ Tests failed on attempt $ATTEMPT"

    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
      echo ""
      read -p "Fix and retry? (y/n) " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting regression loop"
        exit 1
      fi
    fi
  fi

  ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "❌ Max attempts ($MAX_ATTEMPTS) reached. Tests still failing."
exit 1
```

### 7.4 Parallel Test Execution

```javascript
// jest.config.js

module.exports = {
  maxWorkers: '50%', // Use half of CPU cores
  testTimeout: 10000,
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/unit/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'api-server/**/*.{js,ts}',
    'frontend/src/**/*.{js,ts,tsx}',
    '!**/*.test.{js,ts,tsx}',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    }
  }
};
```

---

## 8. CI/CD Integration

### 8.1 GitHub Actions Workflow

```yaml
# /.github/workflows/test-agent-tier-system.yml

name: Agent Tier System Tests

on:
  push:
    branches: [main, develop, v1]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unit-tests

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Seed test data
        run: npm run db:seed:test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: test-results/

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Start application
        run: |
          npm run build
          npm run start:test &
          npx wait-on http://localhost:5173

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-screenshots
          path: test-results/

      - name: Upload videos
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-videos
          path: test-results/**/*.webm

  visual-regression:
    name: Visual Regression Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Need full history for baseline comparison

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Start application
        run: |
          npm run build
          npm run start:test &
          npx wait-on http://localhost:5173

      - name: Run visual regression tests
        run: npm run test:visual

      - name: Upload visual diff report
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: visual-diff-report
          path: test-results/visual-diff/

  coverage-report:
    name: Coverage Report
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Download coverage
        uses: actions/download-artifact@v3

      - name: Generate combined report
        run: |
          npm run coverage:merge
          npm run coverage:report

      - name: Comment PR with coverage
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}

  all-tests-complete:
    name: All Tests Complete
    needs: [unit-tests, integration-tests, e2e-tests, visual-regression]
    runs-on: ubuntu-latest

    steps:
      - name: Check all tests passed
        run: echo "✅ All test suites passed successfully!"
```

### 8.2 Pre-commit Hooks

```yaml
# /.husky/pre-commit

#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Lint staged files
npx lint-staged

# Run unit tests for changed files
npm run test:unit -- --findRelatedTests --bail

# Type check
npm run type-check

echo "✅ Pre-commit checks passed!"
```

### 8.3 Quality Gates

```javascript
// sonar-project.properties

sonar.projectKey=agent-feed-tier-system
sonar.projectName=Agent Feed - Tier System
sonar.sources=api-server,frontend/src
sonar.tests=tests,frontend/src/tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.testExecutionReportPaths=test-results/sonar-report.xml

# Quality Gates
sonar.qualitygate.wait=true
sonar.coverage.exclusions=**/*.test.js,**/*.test.ts,**/*.spec.ts
sonar.cpd.exclusions=**/*.test.js,**/*.test.ts

# Thresholds
sonar.coverage.overall=95.0
sonar.coverage.line=95.0
sonar.coverage.branch=90.0
sonar.duplications=3.0
sonar.debt=60min
```

---

## 9. Claude-Flow Swarm Coordination

### 9.1 Swarm Architecture

```
┌───────────────────────────────────────────────────────────┐
│               SPARC Orchestrator (Coordinator)            │
│                                                           │
│  Delegates tasks to specialized testing agents            │
└───────┬──────────────┬─────────────────┬─────────────────┘
        │              │                 │
        ▼              ▼                 ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────────┐
│   TDD Agent  │ │  Test Agent │ │ Playwright MCP  │
│              │ │              │ │                 │
│ - Write      │ │ - Execute    │ │ - UI testing    │
│   tests      │ │   tests      │ │ - Screenshots   │
│ - Validate   │ │ - Coverage   │ │ - Regression    │
│   specs      │ │ - Reports    │ │                 │
└──────────────┘ └─────────────┘ └─────────────────┘
```

### 9.2 Task Distribution

```yaml
# /tests/swarm-config.yaml

swarm:
  coordinator: sparc-orchestrator

  agents:
    - name: tdd-agent
      role: Test-Driven Development
      responsibilities:
        - Write failing unit tests from specifications
        - Validate test completeness
        - Ensure red-green-refactor workflow
        - Generate test fixtures

    - name: test-execution-agent
      role: Test Execution & Coverage
      responsibilities:
        - Run test suites
        - Collect coverage reports
        - Identify gaps in coverage
        - Generate test reports

    - name: playwright-mcp-agent
      role: E2E & Visual Testing
      responsibilities:
        - Execute Playwright tests
        - Capture screenshots
        - Compare visual diffs
        - Validate accessibility

    - name: integration-agent
      role: Integration Testing
      responsibilities:
        - Test API endpoints
        - Validate database operations
        - Test component integration
        - Performance testing

    - name: regression-agent
      role: Regression Testing
      responsibilities:
        - Run regression loop
        - Identify breaking changes
        - Coordinate fixes
        - Validate all tests pass

  workflow:
    - phase: Specification Review
      agent: sparc-orchestrator
      tasks:
        - Parse SPARC specification
        - Extract test requirements
        - Create task distribution plan

    - phase: Unit Test Creation
      agent: tdd-agent
      tasks:
        - Write backend unit tests
        - Write frontend unit tests
        - Create test fixtures
        - Validate against pseudocode

    - phase: Integration Test Creation
      agent: integration-agent
      tasks:
        - Write API integration tests
        - Write database tests
        - Write component integration tests

    - phase: E2E Test Creation
      agent: playwright-mcp-agent
      tasks:
        - Write user workflow tests
        - Create screenshot baselines
        - Configure visual regression

    - phase: Test Execution
      agent: test-execution-agent
      tasks:
        - Run all test suites
        - Collect coverage data
        - Generate reports

    - phase: Regression Loop
      agent: regression-agent
      tasks:
        - Execute regression loop
        - Coordinate fixes
        - Validate all tests pass

    - phase: Final Validation
      agent: sparc-orchestrator
      tasks:
        - Review coverage reports
        - Validate quality gates
        - Generate final deliverable
```

### 9.3 Agent Communication Protocol

```typescript
// /tests/swarm/protocol.ts

interface TaskMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  task: string;
  payload: any;
  timestamp: string;
}

interface TestResult {
  agent: string;
  phase: string;
  status: 'pass' | 'fail' | 'pending';
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  duration: number;
  errors?: string[];
}

// Example message flow
const coordinatorRequest: TaskMessage = {
  from: 'sparc-orchestrator',
  to: 'tdd-agent',
  type: 'request',
  task: 'create_unit_tests',
  payload: {
    spec: '/docs/PSEUDOCODE-TIER-CLASSIFICATION.md',
    target: 'tier-classification.test.js',
    requirements: [
      'Test DetermineAgentTier function',
      'Test ClassifyTier function',
      'Test ValidateAgentData function'
    ]
  },
  timestamp: new Date().toISOString()
};

const agentResponse: TaskMessage = {
  from: 'tdd-agent',
  to: 'sparc-orchestrator',
  type: 'response',
  task: 'create_unit_tests',
  payload: {
    status: 'complete',
    testsCreated: 15,
    files: ['/tests/unit/tier-classification.test.js'],
    coverage: 'ready for execution'
  },
  timestamp: new Date().toISOString()
};
```

---

## 10. Implementation Checklist

### 10.1 Test Infrastructure Setup

- [ ] Configure Jest for backend unit tests
- [ ] Configure Vitest for frontend unit tests
- [ ] Configure Playwright for E2E tests
- [ ] Set up test database (PostgreSQL/SQLite)
- [ ] Create test fixtures and mock data
- [ ] Configure coverage reporting
- [ ] Set up CI/CD pipelines
- [ ] Install Playwright MCP integration

### 10.2 Unit Tests (80 tests)

**Backend (40 tests)**:
- [ ] Tier classification service (15 tests)
- [ ] Protection validation service (10 tests)
- [ ] API filtering service (8 tests)
- [ ] Frontmatter parser (7 tests)

**Frontend (40 tests)**:
- [ ] AgentIcon component (12 tests)
- [ ] AgentTierToggle component (8 tests)
- [ ] ProtectionBadge component (6 tests)
- [ ] AgentCard component (8 tests)
- [ ] Custom hooks (6 tests)

### 10.3 Integration Tests (30 tests)

- [ ] GET /api/agents filtering (10 tests)
- [ ] PATCH /api/agents protection (8 tests)
- [ ] DELETE /api/agents protection (5 tests)
- [ ] Database tier queries (4 tests)
- [ ] Component integration (3 tests)

### 10.4 E2E Tests (10 tests)

- [ ] Default tier 1 view (1 test)
- [ ] Tier switching (3 tests)
- [ ] Filter persistence (2 tests)
- [ ] Protection indicators (2 tests)
- [ ] Keyboard navigation (2 tests)

### 10.5 Visual Regression (10 tests)

- [ ] Tier 1 list screenshot (1 test)
- [ ] Tier 2 list screenshot (1 test)
- [ ] Component screenshots (4 tests)
- [ ] Dark mode screenshots (2 tests)
- [ ] Responsive screenshots (2 tests)

### 10.6 Documentation

- [ ] Test suite README
- [ ] Test execution guide
- [ ] TDD workflow documentation
- [ ] CI/CD pipeline documentation
- [ ] Coverage report interpretation guide

---

## Deliverables Summary

### Test Artifacts

1. **Test Suites** (120 tests total)
   - `/tests/unit/` - 80 unit tests
   - `/tests/integration/` - 30 integration tests
   - `/tests/e2e/` - 10 E2E tests

2. **Test Configuration**
   - `jest.config.js` - Unit test configuration
   - `playwright.config.ts` - E2E test configuration
   - `jest.integration.config.js` - Integration test configuration

3. **Test Infrastructure**
   - `/tests/fixtures/` - Test data fixtures
   - `/tests/helpers/` - Test utilities
   - `/tests/swarm/` - Claude-Flow swarm configuration

4. **CI/CD Pipelines**
   - `.github/workflows/test-agent-tier-system.yml`
   - `.husky/pre-commit` - Pre-commit hooks
   - `sonar-project.properties` - Quality gates

5. **Documentation**
   - This architecture document
   - Test execution guide
   - Coverage report templates

### Success Criteria

- ✅ 95%+ unit test coverage
- ✅ 90%+ integration test coverage
- ✅ 100% critical path E2E coverage
- ✅ All visual regression tests pass
- ✅ <5 minute total test execution time
- ✅ Zero test flakiness (100% deterministic)
- ✅ CI/CD pipeline green on all commits

---

**Document Control**:
- **Version**: 1.0.0
- **Status**: Production-Ready
- **Next Phase**: Implementation (Test Creation)
- **Review Required**: Tech Lead, QA Lead, DevOps

**Approvals**:
- [ ] Technical Lead (Architecture)
- [ ] QA Lead (Test Strategy)
- [ ] DevOps (CI/CD Integration)
- [ ] Security (Protection Testing)

---

**END OF ARCHITECTURE DOCUMENT**
