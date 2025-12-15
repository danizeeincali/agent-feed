/**
 * TDD London School Tests: Anchor Link Validation in Sidebar Components
 *
 * These tests ensure that anchor links (#section) in sidebar navigation
 * validate against actual IDs present in the page content.
 *
 * Test Philosophy (London School):
 * - Mock external dependencies (database)
 * - Verify interactions and contracts
 * - Focus on behavior, not state
 *
 * RED-GREEN-REFACTOR cycle:
 * 1. Write tests that FAIL (RED)
 * 2. Implement validation to make them PASS (GREEN)
 * 3. Refactor as needed
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { initializeAgentPagesRoutes } from '../routes/agent-pages.js';
import feedbackLoop from '../services/feedback-loop.js';

describe('Anchor Link Validation - TDD', () => {
  let app;
  let db;

  beforeEach(() => {
    // Create test database in memory
    db = new Database(':memory:');

    // Mock feedback loop
    vi.spyOn(feedbackLoop, 'recordFailure').mockResolvedValue(null);
    vi.spyOn(feedbackLoop, 'recordSuccess').mockResolvedValue(null);

    // Create required schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS agent_pages (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT DEFAULT 'json',
        content_value TEXT,
        content_metadata TEXT,
        status TEXT DEFAULT 'published',
        tags TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        version INTEGER DEFAULT 1,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      );
    `);

    // Create test agent
    db.prepare(`
      INSERT INTO agents (id, name, description)
      VALUES ('test-agent', 'Test Agent', 'Agent for testing')
    `).run();

    // Setup Express app
    app = express();
    app.use(express.json());

    const agentPagesRouter = initializeAgentPagesRoutes(db);
    app.use('/api/agent-pages', agentPagesRouter);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    vi.restoreAllMocks();
  });

  describe('Test 1: Anchor links WITH matching IDs → PASS', () => {
    it('should accept anchor link when target ID exists in page content', async () => {
      const validPage = {
        title: 'Valid Anchor Link Page',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-overview',
                    label: 'Overview',
                    href: '#overview'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'overview',
                title: 'Overview Section'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.page).toBeDefined();
    });

    it('should accept multiple anchor links when all targets exist', async () => {
      const validPage = {
        title: 'Multiple Valid Anchors',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-intro',
                    label: 'Introduction',
                    href: '#intro'
                  },
                  {
                    id: 'nav-features',
                    label: 'Features',
                    href: '#features'
                  },
                  {
                    id: 'nav-pricing',
                    label: 'Pricing',
                    href: '#pricing'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'intro',
                title: 'Introduction'
              }
            },
            {
              type: 'Card',
              props: {
                id: 'features',
                title: 'Features'
              }
            },
            {
              type: 'Grid',
              props: {
                id: 'pricing',
                cols: 3
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should accept nested anchor links when targets exist', async () => {
      const validPage = {
        title: 'Nested Valid Anchors',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'documentation',
                    label: 'Documentation',
                    children: [
                      {
                        id: 'nav-getting-started',
                        label: 'Getting Started',
                        href: '#getting-started'
                      },
                      {
                        id: 'nav-api-reference',
                        label: 'API Reference',
                        href: '#api-reference'
                      }
                    ]
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'getting-started',
                title: 'Getting Started'
              }
            },
            {
              type: 'header',
              props: {
                id: 'api-reference',
                title: 'API Reference'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should accept anchor with case-sensitive matching', async () => {
      const validPage = {
        title: 'Case Sensitive Anchors',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-item',
                    label: 'My Section',
                    href: '#MySection'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'MySection',
                title: 'My Section'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should accept anchor link to deeply nested component ID', async () => {
      const validPage = {
        title: 'Deeply Nested Target',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-nested',
                    label: 'Nested Content',
                    href: '#nested-target'
                  }
                ]
              }
            },
            {
              type: 'Grid',
              props: {
                cols: 2
              },
              children: [
                {
                  type: 'Card',
                  props: {
                    title: 'Parent Card'
                  },
                  children: [
                    {
                      type: 'header',
                      props: {
                        id: 'nested-target',
                        title: 'Deeply Nested Header'
                      }
                    }
                  ]
                }
              ]
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Test 2: Anchor links WITHOUT matching IDs → FAIL', () => {
    it('should reject anchor link when target ID does not exist', async () => {
      const invalidPage = {
        title: 'Missing Anchor Target',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-missing',
                    label: 'Missing Section',
                    href: '#nonexistent-section'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'different-section',
                title: 'Different Section'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should provide clear error message with item ID and missing target', async () => {
      const invalidPage = {
        title: 'Clear Error Message Test',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-contact',
                    label: 'Contact',
                    href: '#contact-form'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      // Error should contain both the nav item ID and the missing target ID
      const anchorError = response.body.errors.find(err =>
        err.message && err.message.includes('contact-form')
      );

      expect(anchorError).toBeDefined();
      expect(anchorError.message).toContain('contact-form');
      expect(anchorError.code).toBe('MISSING_ANCHOR_TARGET');
    });

    it('should reject when one of multiple anchors has missing target', async () => {
      const invalidPage = {
        title: 'One Missing Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-about',
                    label: 'About',
                    href: '#about'
                  },
                  {
                    id: 'nav-missing',
                    label: 'Missing',
                    href: '#missing-section'
                  },
                  {
                    id: 'nav-contact',
                    label: 'Contact',
                    href: '#contact'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'about',
                title: 'About Us'
              }
            },
            {
              type: 'header',
              props: {
                id: 'contact',
                title: 'Contact Us'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && err.message.includes('missing-section')
      )).toBe(true);
    });

    it('should reject case-mismatched anchor link', async () => {
      const invalidPage = {
        title: 'Case Mismatch',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-faq',
                    label: 'FAQ',
                    href: '#FAQ'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'faq',
                title: 'Frequently Asked Questions'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && err.message.includes('FAQ')
      )).toBe(true);
    });

    it('should report all missing anchor targets', async () => {
      const invalidPage = {
        title: 'Multiple Missing Targets',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-missing1',
                    label: 'Missing 1',
                    href: '#target1'
                  },
                  {
                    id: 'nav-missing2',
                    label: 'Missing 2',
                    href: '#target2'
                  },
                  {
                    id: 'nav-missing3',
                    label: 'Missing 3',
                    href: '#target3'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'different',
                title: 'Different ID'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.errors.length).toBeGreaterThanOrEqual(3);
      expect(response.body.errors.some(err => err.message && err.message.includes('target1'))).toBe(true);
      expect(response.body.errors.some(err => err.message && err.message.includes('target2'))).toBe(true);
      expect(response.body.errors.some(err => err.message && err.message.includes('target3'))).toBe(true);
    });

    it('should reject nested child anchor with missing target', async () => {
      const invalidPage = {
        title: 'Nested Missing Target',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'products',
                    label: 'Products',
                    children: [
                      {
                        id: 'nav-pricing',
                        label: 'Pricing',
                        href: '#pricing-table'
                      }
                    ]
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'products',
                title: 'Our Products'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && err.message.includes('pricing-table')
      )).toBe(true);
    });
  });

  describe('Test 3: Full route paths with anchors → PASS', () => {
    it('should accept full path with anchor when target exists', async () => {
      const validPage = {
        title: 'Full Path with Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-features',
                    label: 'Features',
                    href: '/products/features#overview'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'overview',
                title: 'Features Overview'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should accept relative path with anchor when target exists', async () => {
      const validPage = {
        title: 'Relative Path Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-docs',
                    label: 'Documentation',
                    href: './docs#introduction'
                  }
                ]
              }
            },
            {
              type: 'Markdown',
              props: {
                id: 'introduction',
                content: '# Introduction'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject full path with anchor when target is missing', async () => {
      const invalidPage = {
        title: 'Full Path Missing Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-guide',
                    label: 'Guide',
                    href: '/help/guide#advanced-topics'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'basic-topics',
                title: 'Basic Topics'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && err.message.includes('advanced-topics')
      )).toBe(true);
    });

    it('should accept external URL with anchor (skip validation)', async () => {
      const validPage = {
        title: 'External URL with Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-external',
                    label: 'External Docs',
                    href: 'https://example.com/docs#section'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Test 4: Items with onClick handlers → PASS (skip anchor validation)', () => {
    it('should skip anchor validation for items with onClick', async () => {
      const validPage = {
        title: 'OnClick Items',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-action',
                    label: 'Action Item',
                    onClick: 'handleClick'
                    // No anchor validation needed
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should skip anchor validation for onClick even with anchor in href', async () => {
      const validPage = {
        title: 'OnClick with Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-dual',
                    label: 'Dual Action',
                    href: '#nonexistent',
                    onClick: 'handleClick'
                    // onClick takes precedence, skip anchor validation
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Test 5: Items with children → Validate child anchors', () => {
    it('should validate anchor links in nested children', async () => {
      const validPage = {
        title: 'Valid Children Anchors',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'menu',
                    label: 'Menu',
                    children: [
                      {
                        id: 'nav-child1',
                        label: 'Child 1',
                        href: '#section1'
                      },
                      {
                        id: 'nav-child2',
                        label: 'Child 2',
                        href: '#section2'
                      }
                    ]
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'section1',
                title: 'Section 1'
              }
            },
            {
              type: 'header',
              props: {
                id: 'section2',
                title: 'Section 2'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject when child anchor has missing target', async () => {
      const invalidPage = {
        title: 'Invalid Child Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'parent',
                    label: 'Parent',
                    children: [
                      {
                        id: 'nav-child',
                        label: 'Child',
                        href: '#missing-child-target'
                      }
                    ]
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && err.message.includes('missing-child-target')
      )).toBe(true);
    });
  });

  describe('Test 6: Mixed navigation types → Validate each correctly', () => {
    it('should validate mixed href types (absolute, relative, anchor) correctly', async () => {
      const validPage = {
        title: 'Mixed Navigation Types',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-home',
                    label: 'Home',
                    href: '/'
                  },
                  {
                    id: 'nav-anchor',
                    label: 'Anchor',
                    href: '#features'
                  },
                  {
                    id: 'nav-external',
                    label: 'External',
                    href: 'https://example.com'
                  },
                  {
                    id: 'nav-action',
                    label: 'Action',
                    onClick: 'handleAction'
                  }
                ]
              }
            },
            {
              type: 'Card',
              props: {
                id: 'features',
                title: 'Features'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should fail only on invalid anchor, not on valid mixed types', async () => {
      const invalidPage = {
        title: 'Mixed with Invalid Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-valid-path',
                    label: 'Valid Path',
                    href: '/about'
                  },
                  {
                    id: 'nav-invalid-anchor',
                    label: 'Invalid Anchor',
                    href: '#missing'
                  },
                  {
                    id: 'nav-valid-external',
                    label: 'Valid External',
                    href: 'https://example.com'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      // Should only error on the missing anchor
      const anchorErrors = response.body.errors.filter(err =>
        err.message && err.message.includes('missing')
      );
      expect(anchorErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Test 7: Empty href validation', () => {
    it('should fail on empty href string', async () => {
      const invalidPage = {
        title: 'Empty Href',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-empty',
                    label: 'Empty Href',
                    href: ''
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && err.message.includes('navigation')
      )).toBe(true);
    });

    it('should fail on null href', async () => {
      const invalidPage = {
        title: 'Null Href',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-null',
                    label: 'Null Href',
                    href: null
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Test 8: Malformed anchor validation', () => {
    it('should reject anchor without hash symbol', async () => {
      const invalidPage = {
        title: 'Malformed Anchor - No Hash',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-malformed',
                    label: 'Malformed',
                    href: 'section-name'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && (err.message.includes('Invalid href format') || err.message.includes('navigation'))
      )).toBe(true);
    });

    it('should reject bare hash with no ID', async () => {
      const invalidPage = {
        title: 'Bare Hash',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-bare-hash',
                    label: 'Bare Hash',
                    href: '#'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && err.message.includes('empty')
      )).toBe(true);
    });

    it('should reject anchor with special characters that need encoding', async () => {
      const invalidPage = {
        title: 'Special Chars in Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-special',
                    label: 'Special Chars',
                    href: '#section with spaces!'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      // Should fail either due to missing target or invalid format
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should accept properly encoded anchor ID', async () => {
      const validPage = {
        title: 'Encoded Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-encoded',
                    label: 'Encoded',
                    href: '#section-with-dashes'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'section-with-dashes',
                title: 'Section With Dashes'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should not save page to database when anchor validation fails', async () => {
      const initialCount = db.prepare('SELECT COUNT(*) as count FROM agent_pages').get().count;

      const invalidPage = {
        title: 'Should Not Be Saved - Anchor Error',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-fail',
                    label: 'Fail',
                    href: '#missing-target'
                  }
                ]
              }
            }
          ]
        })
      };

      await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      const finalCount = db.prepare('SELECT COUNT(*) as count FROM agent_pages').get().count;
      expect(finalCount).toBe(initialCount);
    });

    it('should validate multiple sidebars on same page', async () => {
      const invalidPage = {
        title: 'Multiple Sidebars with Invalid Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-valid',
                    label: 'Valid',
                    href: '#valid-target'
                  }
                ]
              }
            },
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-invalid',
                    label: 'Invalid',
                    href: '#invalid-target'
                  }
                ]
              }
            },
            {
              type: 'header',
              props: {
                id: 'valid-target',
                title: 'Valid Target'
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.some(err =>
        err.message && err.message.includes('invalid-target')
      )).toBe(true);
    });

    it('should include feedback recording for anchor validation failures', async () => {
      const invalidPage = {
        title: 'Feedback Test',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-test',
                    label: 'Test',
                    href: '#missing'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      expect(response.body.feedbackRecorded).toBe(true);
      expect(response.body.pageId).toBeDefined();
    });

    it('should accept template variables in anchor links', async () => {
      const validPage = {
        title: 'Template Variable Anchor',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-template',
                    label: 'Template',
                    href: '{{dynamicSection}}'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should validate anchors in complex nested structures', async () => {
      const validPage = {
        title: 'Complex Nested Structure',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'level1',
                    label: 'Level 1',
                    children: [
                      {
                        id: 'level2',
                        label: 'Level 2',
                        children: [
                          {
                            id: 'level3-nav',
                            label: 'Level 3',
                            href: '#deep-section'
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            },
            {
              type: 'Grid',
              props: {
                cols: 2
              },
              children: [
                {
                  type: 'Card',
                  props: {
                    title: 'Card'
                  },
                  children: [
                    {
                      type: 'header',
                      props: {
                        id: 'deep-section',
                        title: 'Deep Section'
                      }
                    }
                  ]
                }
              ]
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(validPage)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should verify error response contract for anchor errors', async () => {
      const invalidPage = {
        title: 'Error Contract Test',
        content_type: 'json',
        content_value: JSON.stringify({
          components: [
            {
              type: 'Sidebar',
              props: {
                items: [
                  {
                    id: 'nav-contract',
                    label: 'Contract',
                    href: '#missing-contract'
                  }
                ]
              }
            }
          ]
        })
      };

      const response = await request(app)
        .post('/api/agent-pages/agents/test-agent/pages')
        .send(invalidPage)
        .expect(400);

      // Verify error response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('pageId');
      expect(response.body).toHaveProperty('feedbackRecorded');

      expect(response.body.success).toBe(false);
      expect(Array.isArray(response.body.errors)).toBe(true);

      // Verify anchor-specific error structure
      const anchorError = response.body.errors.find(err => err.code === 'MISSING_ANCHOR_TARGET');
      expect(anchorError).toBeDefined();
      expect(anchorError).toHaveProperty('message');
      expect(anchorError).toHaveProperty('path');
      expect(anchorError).toHaveProperty('code');
    });
  });
});
