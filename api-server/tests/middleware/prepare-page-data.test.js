/**
 * Unit tests for preparePageData function
 * Tests format preservation without database dependency
 */

import { describe, it, expect } from 'vitest';
import { preparePageData } from '../../middleware/auto-register-pages.js';

describe('preparePageData', () => {
  describe('specification format (page-builder)', () => {
    it('should preserve specification as JSON in content_value', () => {
      const specification = {
        components: [
          { type: 'Header', props: { title: 'Test' } }
        ],
        layout: 'single'
      };

      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        specification: JSON.stringify(specification),
        version: 1
      };

      const result = preparePageData(pageData);

      expect(result.id).toBe('test-page');
      expect(result.agent_id).toBe('test-agent');
      expect(result.title).toBe('Test Page');
      expect(result.content_type).toBe('json');
      expect(result.content_value).toBe(JSON.stringify(specification));

      // Verify it can be parsed back
      const parsed = JSON.parse(result.content_value);
      expect(parsed.components).toBeDefined();
      expect(parsed.components[0].type).toBe('Header');
    });

    it('should handle specification as object (auto-stringify)', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        specification: { type: 'test' },
        version: 1
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('json');
      expect(result.content_value).toBe(JSON.stringify({ type: 'test' }));
    });

    it('should preserve metadata from specification format', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        specification: JSON.stringify({ type: 'test' }),
        metadata: { author: 'agent', version: '1.0' }
      };

      const result = preparePageData(pageData);

      expect(result.content_metadata).toBe(JSON.stringify({ author: 'agent', version: '1.0' }));
    });
  });

  describe('content_value format (database)', () => {
    it('should preserve content_value format as-is', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_type: 'markdown',
        content_value: '# Markdown Content\n\nParagraph text.',
        version: 1
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('markdown');
      expect(result.content_value).toBe('# Markdown Content\n\nParagraph text.');
    });

    it('should handle text content type', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_type: 'text',
        content_value: 'Plain text content',
        version: 1
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('text');
      expect(result.content_value).toBe('Plain text content');
    });

    it('should handle component content type', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_type: 'component',
        content_value: '<CustomComponent />',
        version: 1
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('component');
      expect(result.content_value).toBe('<CustomComponent />');
    });

    it('should preserve content_metadata', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_type: 'markdown',
        content_value: '# Test',
        content_metadata: JSON.stringify({ tags: ['test'], category: 'docs' })
      };

      const result = preparePageData(pageData);

      expect(result.content_metadata).toBe(JSON.stringify({ tags: ['test'], category: 'docs' }));
    });
  });

  describe('format validation', () => {
    it('should default invalid content_type to text', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_type: 'invalid-type',
        content_value: 'Content'
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('text');
    });

    it('should use default status if not provided', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_value: 'Content'
      };

      const result = preparePageData(pageData);

      expect(result.status).toBe('published');
    });

    it('should preserve provided status', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_value: 'Content',
        status: 'draft'
      };

      const result = preparePageData(pageData);

      expect(result.status).toBe('draft');
    });

    it('should use default version if not provided', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_value: 'Content'
      };

      const result = preparePageData(pageData);

      expect(result.version).toBe(1);
    });

    it('should preserve provided version', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_value: 'Content',
        version: 5
      };

      const result = preparePageData(pageData);

      expect(result.version).toBe(5);
    });

    it('should add timestamps if not provided', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_value: 'Content'
      };

      const result = preparePageData(pageData);

      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
      expect(new Date(result.created_at)).toBeInstanceOf(Date);
      expect(new Date(result.updated_at)).toBeInstanceOf(Date);
    });

    it('should preserve provided timestamps', () => {
      const created = '2025-01-01T00:00:00.000Z';
      const updated = '2025-01-02T00:00:00.000Z';

      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_value: 'Content',
        created_at: created,
        updated_at: updated
      };

      const result = preparePageData(pageData);

      expect(result.created_at).toBe(created);
      expect(result.updated_at).toBe(updated);
    });
  });

  describe('fallback handling', () => {
    it('should serialize entire object as JSON if no specification or content_value', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        customField: 'custom value'
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('json');

      // Should contain the page data as JSON
      const parsed = JSON.parse(result.content_value);
      expect(parsed.id).toBe('test-page');
      expect(parsed.customField).toBe('custom value');
    });
  });

  describe('edge cases', () => {
    it('should handle empty specification', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        specification: ''
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('json');
      expect(result.content_value).toBe('');
    });

    it('should handle empty content_value', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_type: 'text',
        content_value: ''
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('text');
      expect(result.content_value).toBe('');
    });

    it('should handle null metadata gracefully', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        specification: 'spec',
        metadata: null
      };

      const result = preparePageData(pageData);

      expect(result.content_metadata).toBeNull();
    });

    it('should default content_type to text when missing from content_value format', () => {
      const pageData = {
        id: 'test-page',
        agent_id: 'test-agent',
        title: 'Test Page',
        content_value: 'Content without type'
      };

      const result = preparePageData(pageData);

      expect(result.content_type).toBe('text');
    });
  });
});
