import request from 'supertest';
import { app } from '@/api/server';

describe('Enhanced Search and Filtering API', () => {
  describe('POST /api/v1/search/posts', () => {
    it('should search posts by content', async () => {
      const searchQuery = {
        query: 'strategic planning',
        filters: {
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-12-31T23:59:59Z'
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.metadata).toHaveProperty('totalResults');
      expect(response.body.metadata).toHaveProperty('searchTime');
    });

    it('should filter by agent type', async () => {
      const searchQuery = {
        filters: {
          agents: ['chief-of-staff-agent', 'personal-todos-agent'],
          businessImpact: {
            min: 7,
            max: 10
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((post: any) => {
        expect(searchQuery.filters.agents).toContain(post.authorAgent);
        expect(post.metadata.businessImpact).toBeGreaterThanOrEqual(7);
        expect(post.metadata.businessImpact).toBeLessThanOrEqual(10);
      });
    });

    it('should filter by tags', async () => {
      const searchQuery = {
        filters: {
          tags: ['Strategic', 'HighImpact'],
          matchAllTags: false // OR logic
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((post: any) => {
        const postTags = post.metadata.tags || [];
        const hasAnyTag = searchQuery.filters.tags.some(tag => 
          postTags.includes(tag)
        );
        expect(hasAnyTag).toBe(true);
      });
    });

    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const searchQuery = {
        filters: {
          dateRange: {
            start: yesterday.toISOString(),
            end: new Date().toISOString()
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((post: any) => {
        const postDate = new Date(post.publishedAt);
        expect(postDate).toBeInstanceOf(Date);
        expect(postDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
      });
    });

    it('should support sorting options', async () => {
      const searchQuery = {
        sort: {
          field: 'businessImpact',
          order: 'desc'
        },
        pagination: {
          limit: 10,
          offset: 0
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check if results are sorted by business impact descending
      const businessImpacts = response.body.data.map((post: any) => 
        post.metadata.businessImpact
      );
      
      for (let i = 0; i < businessImpacts.length - 1; i++) {
        expect(businessImpacts[i]).toBeGreaterThanOrEqual(businessImpacts[i + 1]);
      }
    });

    it('should support full-text search with relevance scoring', async () => {
      const searchQuery = {
        query: 'strategic planning workflow automation',
        searchOptions: {
          fuzzy: true,
          boost: {
            title: 2.0,
            content: 1.0,
            tags: 1.5
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata).toHaveProperty('maxScore');
      
      // Results should include relevance scores
      response.body.data.forEach((post: any) => {
        expect(post).toHaveProperty('_score');
        expect(typeof post._score).toBe('number');
      });
    });

    it('should validate search parameters', async () => {
      const invalidQuery = {
        filters: {
          businessImpact: {
            min: 15, // Invalid - max is 10
            max: 20
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(invalidQuery)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Business impact must be between 0 and 10');
    });

    it('should return faceted search results', async () => {
      const searchQuery = {
        query: 'agent',
        facets: ['agents', 'tags', 'businessImpact']
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.facets).toHaveProperty('agents');
      expect(response.body.facets).toHaveProperty('tags');
      expect(response.body.facets).toHaveProperty('businessImpact');
      
      // Each facet should have counts
      expect(response.body.facets.agents).toBeInstanceOf(Array);
      response.body.facets.agents.forEach((facet: any) => {
        expect(facet).toHaveProperty('value');
        expect(facet).toHaveProperty('count');
      });
    });
  });

  describe('GET /api/v1/search/suggestions', () => {
    it('should provide search suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/search/suggestions')
        .query({ q: 'strat' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toBeInstanceOf(Array);
      
      response.body.suggestions.forEach((suggestion: any) => {
        expect(suggestion).toHaveProperty('text');
        expect(suggestion).toHaveProperty('type'); // 'query', 'agent', 'tag'
        expect(suggestion.text.toLowerCase()).toContain('strat');
      });
    });

    it('should suggest agent names', async () => {
      const response = await request(app)
        .get('/api/v1/search/suggestions')
        .query({ q: 'chief', type: 'agent' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toBeInstanceOf(Array);
      
      response.body.suggestions.forEach((suggestion: any) => {
        expect(suggestion.type).toBe('agent');
        expect(suggestion.text.toLowerCase()).toContain('chief');
      });
    });

    it('should suggest popular tags', async () => {
      const response = await request(app)
        .get('/api/v1/search/suggestions')
        .query({ type: 'tag' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toBeInstanceOf(Array);
      
      response.body.suggestions.forEach((suggestion: any) => {
        expect(suggestion.type).toBe('tag');
        expect(suggestion).toHaveProperty('count'); // Usage frequency
      });
    });
  });

  describe('GET /api/v1/search/trending', () => {
    it('should return trending topics', async () => {
      const response = await request(app)
        .get('/api/v1/search/trending')
        .query({ period: '24h' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.trending).toBeInstanceOf(Array);
      
      response.body.trending.forEach((trend: any) => {
        expect(trend).toHaveProperty('topic');
        expect(trend).toHaveProperty('count');
        expect(trend).toHaveProperty('growth'); // Percentage growth
      });
    });

    it('should support different time periods', async () => {
      const periods = ['1h', '24h', '7d', '30d'];
      
      for (const period of periods) {
        const response = await request(app)
          .get('/api/v1/search/trending')
          .query({ period })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.metadata.period).toBe(period);
      }
    });
  });

  describe('Advanced Search Features', () => {
    it('should support complex boolean queries', async () => {
      const searchQuery = {
        query: '(strategic OR planning) AND automation NOT deprecated',
        searchOptions: {
          queryType: 'boolean'
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Results should match the boolean logic
    });

    it('should support field-specific searches', async () => {
      const searchQuery = {
        query: 'title:"Strategic Planning" AND tags:HighImpact',
        searchOptions: {
          queryType: 'structured'
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support proximity searches', async () => {
      const searchQuery = {
        query: '"strategic planning" NEAR/5 "workflow automation"',
        searchOptions: {
          queryType: 'proximity'
        }
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Search Analytics', () => {
    it('should track search queries', async () => {
      const searchQuery = {
        query: 'test analytics query',
        trackSearch: true
      };

      const response = await request(app)
        .post('/api/v1/search/posts')
        .send(searchQuery)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata).toHaveProperty('searchId');
    });

    it('should provide search analytics', async () => {
      const response = await request(app)
        .get('/api/v1/search/analytics')
        .query({ period: '7d' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toHaveProperty('totalSearches');
      expect(response.body.analytics).toHaveProperty('popularQueries');
      expect(response.body.analytics).toHaveProperty('zeroResultQueries');
    });
  });
});