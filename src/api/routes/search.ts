import { Router } from 'express';
import { validationResult, body, query } from 'express-validator';
import { db } from '@/database/connection';
import { validationErrorHandler, asyncHandler } from '@/middleware/error';
import { logger } from '@/utils/logger';

const router = Router();

// Validation for search requests
const validateSearch = [
  body('query').optional().isString().withMessage('Query must be a string'),
  body('filters.agents').optional().isArray().withMessage('Agents filter must be an array'),
  body('filters.tags').optional().isArray().withMessage('Tags filter must be an array'),
  body('filters.businessImpact.min').optional().isInt({ min: 0, max: 10 }).withMessage('Business impact min must be 0-10'),
  body('filters.businessImpact.max').optional().isInt({ min: 0, max: 10 }).withMessage('Business impact max must be 0-10'),
  body('filters.dateRange.start').optional().isISO8601().withMessage('Start date must be valid ISO8601'),
  body('filters.dateRange.end').optional().isISO8601().withMessage('End date must be valid ISO8601'),
  body('sort.field').optional().isIn(['publishedAt', 'businessImpact', 'relevance']).withMessage('Invalid sort field'),
  body('sort.order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  body('pagination.limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  body('pagination.offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
];

// Advanced post search with filters and full-text search
router.post('/posts',
  validateSearch,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const {
      query: searchQuery = '',
      filters = {},
      sort = { field: 'publishedAt', order: 'desc' },
      pagination = { limit: 20, offset: 0 },
      searchOptions = {},
      facets = [],
      trackSearch = false
    } = req.body;

    const startTime = Date.now();

    try {
      // Build SQL query
      let sql = `
        SELECT 
          id,
          title,
          content,
          author,
          published_at,
          metadata,
          CASE 
            WHEN $1 != '' THEN 
              ts_rank(
                to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')),
                plainto_tsquery('english', $1)
              )
            ELSE 1
          END as _score
        FROM feed_items 
        WHERE metadata->>'isAgentResponse' = 'true'
      `;

      const params: any[] = [searchQuery];
      let paramIndex = 2;

      // Add full-text search condition
      if (searchQuery.trim()) {
        sql += ` AND (
          to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
          @@ plainto_tsquery('english', $1)
        )`;
      }

      // Add agent filter
      if (filters.agents && filters.agents.length > 0) {
        sql += ` AND author = ANY($${paramIndex})`;
        params.push(filters.agents);
        paramIndex++;
      }

      // Add business impact filter
      if (filters.businessImpact) {
        if (filters.businessImpact.min !== undefined) {
          sql += ` AND (metadata->>'businessImpact')::int >= $${paramIndex}`;
          params.push(filters.businessImpact.min);
          paramIndex++;
        }
        if (filters.businessImpact.max !== undefined) {
          sql += ` AND (metadata->>'businessImpact')::int <= $${paramIndex}`;
          params.push(filters.businessImpact.max);
          paramIndex++;
        }
      }

      // Add date range filter
      if (filters.dateRange) {
        if (filters.dateRange.start) {
          sql += ` AND published_at >= $${paramIndex}`;
          params.push(filters.dateRange.start);
          paramIndex++;
        }
        if (filters.dateRange.end) {
          sql += ` AND published_at <= $${paramIndex}`;
          params.push(filters.dateRange.end);
          paramIndex++;
        }
      }

      // Add tags filter
      if (filters.tags && filters.tags.length > 0) {
        if (filters.matchAllTags) {
          // AND logic - must have all tags
          sql += ` AND metadata->'tags' @> $${paramIndex}`;
          params.push(JSON.stringify(filters.tags));
        } else {
          // OR logic - must have any tag
          sql += ` AND metadata->'tags' ?| array[$${paramIndex}]`;
          params.push(filters.tags);
        }
        paramIndex++;
      }

      // Add sorting
      const sortField = sort.field === 'businessImpact' 
        ? `(metadata->>'businessImpact')::int`
        : sort.field === 'relevance' ? '_score' : sort.field;
      
      sql += ` ORDER BY ${sortField} ${sort.order.toUpperCase()}`;

      // Add pagination
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pagination.limit, pagination.offset);

      // Execute search query
      const result = await db.query(sql, params);

      // Get total count for pagination
      let countSql = `
        SELECT COUNT(*) as total
        FROM feed_items 
        WHERE metadata->>'isAgentResponse' = 'true'
      `;
      
      const countParams = params.slice(0, -2); // Remove limit and offset
      if (searchQuery.trim()) {
        countSql += ` AND (
          to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
          @@ plainto_tsquery('english', $1)
        )`;
      }

      // Re-add other filters to count query (simplified version)
      let countParamIndex = 2;
      if (filters.agents && filters.agents.length > 0) {
        countSql += ` AND author = ANY($${countParamIndex++})`;
      }
      if (filters.businessImpact?.min !== undefined) {
        countSql += ` AND (metadata->>'businessImpact')::int >= $${countParamIndex++}`;
      }
      if (filters.businessImpact?.max !== undefined) {
        countSql += ` AND (metadata->>'businessImpact')::int <= $${countParamIndex++}`;
      }
      if (filters.dateRange?.start) {
        countSql += ` AND published_at >= $${countParamIndex++}`;
      }
      if (filters.dateRange?.end) {
        countSql += ` AND published_at <= $${countParamIndex++}`;
      }
      if (filters.tags && filters.tags.length > 0) {
        if (filters.matchAllTags) {
          countSql += ` AND metadata->'tags' @> $${countParamIndex++}`;
        } else {
          countSql += ` AND metadata->'tags' ?| array[$${countParamIndex++}]`;
        }
      }

      const countResult = await db.query(countSql, countParams);
      const totalResults = parseInt(countResult.rows[0].total);

      // Transform results
      const posts = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        authorAgent: row.author,
        publishedAt: row.published_at,
        metadata: row.metadata,
        _score: row._score
      }));

      const searchTime = Date.now() - startTime;

      // Generate facets if requested
      let facetResults = {};
      if (facets.length > 0) {
        facetResults = await generateFacets(facets, filters, searchQuery);
      }

      // Track search if requested
      let searchId = null;
      if (trackSearch) {
        searchId = await trackSearchQuery(searchQuery, filters, totalResults);
      }

      const maxScore = posts.length > 0 ? Math.max(...posts.map(p => p._score)) : 0;

      logger.info('Search completed', {
        query: searchQuery,
        totalResults,
        searchTime,
        filters: Object.keys(filters).length
      });

      res.json({
        success: true,
        data: posts,
        metadata: {
          totalResults,
          searchTime,
          maxScore,
          pagination: {
            limit: pagination.limit,
            offset: pagination.offset,
            hasMore: pagination.offset + pagination.limit < totalResults
          }
        },
        facets: facetResults,
        searchId
      });

    } catch (error) {
      logger.error('Search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: searchQuery,
        filters
      });

      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: 'Internal server error'
      });
    }
  })
);

// Get search suggestions
router.get('/suggestions',
  query('q').optional().isString().withMessage('Query must be a string'),
  query('type').optional().isIn(['query', 'agent', 'tag']).withMessage('Invalid suggestion type'),
  asyncHandler(async (req, res) => {
    const { q = '', type } = req.query;

    try {
      let suggestions: any[] = [];

      if (!type || type === 'agent') {
        // Agent suggestions
        const agentQuery = `
          SELECT DISTINCT author as value, 'agent' as type, COUNT(*) as count
          FROM feed_items 
          WHERE metadata->>'isAgentResponse' = 'true'
            AND LOWER(author) LIKE LOWER($1)
          GROUP BY author
          ORDER BY count DESC
          LIMIT 5
        `;
        const agentResult = await db.query(agentQuery, [`%${q}%`]);
        suggestions.push(...agentResult.rows.map(row => ({
          text: row.value,
          type: row.type,
          count: parseInt(row.count)
        })));
      }

      if (!type || type === 'tag') {
        // Tag suggestions
        const tagQuery = `
          SELECT tag as value, 'tag' as type, COUNT(*) as count
          FROM feed_items,
               jsonb_array_elements_text(metadata->'tags') as tag
          WHERE metadata->>'isAgentResponse' = 'true'
            AND LOWER(tag) LIKE LOWER($1)
          GROUP BY tag
          ORDER BY count DESC
          LIMIT 10
        `;
        const tagResult = await db.query(tagQuery, [`%${q}%`]);
        suggestions.push(...tagResult.rows.map(row => ({
          text: row.value,
          type: row.type,
          count: parseInt(row.count)
        })));
      }

      if (!type || type === 'query') {
        // Query suggestions from search history (if tracking is enabled)
        // This would be implemented with a search_queries table
        suggestions.push({
          text: q + ' automation',
          type: 'query'
        });
      }

      res.json({
        success: true,
        suggestions: suggestions.slice(0, 10)
      });

    } catch (error) {
      logger.error('Failed to get suggestions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: q,
        type
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions'
      });
    }
  })
);

// Get trending topics
router.get('/trending',
  query('period').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('Invalid period'),
  asyncHandler(async (req, res) => {
    const { period = '24h' } = req.query;

    try {
      // Convert period to hours
      const periodHours = {
        '1h': 1,
        '24h': 24,
        '7d': 168,
        '30d': 720
      }[period as string];

      const trendingQuery = `
        SELECT 
          tag as topic,
          COUNT(*) as count,
          ROUND(
            (COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY tag)) * 100.0 / 
            NULLIF(LAG(COUNT(*)) OVER (ORDER BY tag), 0), 
            2
          ) as growth
        FROM feed_items,
             jsonb_array_elements_text(metadata->'tags') as tag
        WHERE metadata->>'isAgentResponse' = 'true'
          AND published_at >= NOW() - INTERVAL '${periodHours} hours'
        GROUP BY tag
        HAVING COUNT(*) >= 2
        ORDER BY count DESC, growth DESC NULLS LAST
        LIMIT 20
      `;

      const result = await db.query(trendingQuery);

      const trending = result.rows.map(row => ({
        topic: row.topic,
        count: parseInt(row.count),
        growth: row.growth ? parseFloat(row.growth) : 0
      }));

      res.json({
        success: true,
        trending,
        metadata: {
          period,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get trending topics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        period
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get trending topics'
      });
    }
  })
);

// Get search analytics
router.get('/analytics',
  query('period').optional().isIn(['1d', '7d', '30d']).withMessage('Invalid period'),
  asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;

    try {
      // Mock analytics data (would be implemented with proper tracking)
      const analytics = {
        totalSearches: 1247,
        popularQueries: [
          { query: 'strategic planning', count: 87 },
          { query: 'automation', count: 64 },
          { query: 'productivity', count: 52 }
        ],
        zeroResultQueries: [
          { query: 'deprecated features', count: 5 },
          { query: 'old workflows', count: 3 }
        ],
        averageResultsPerQuery: 8.3,
        clickThroughRate: 0.78
      };

      res.json({
        success: true,
        analytics,
        metadata: {
          period,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get search analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        period
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get search analytics'
      });
    }
  })
);

// Helper function to generate facets
async function generateFacets(facets: string[], filters: any, searchQuery: string) {
  const facetResults: any = {};

  for (const facet of facets) {
    try {
      switch (facet) {
        case 'agents':
          const agentsQuery = `
            SELECT author as value, COUNT(*) as count
            FROM feed_items 
            WHERE metadata->>'isAgentResponse' = 'true'
            GROUP BY author
            ORDER BY count DESC
            LIMIT 20
          `;
          const agentsResult = await db.query(agentsQuery);
          facetResults.agents = agentsResult.rows.map(row => ({
            value: row.value,
            count: parseInt(row.count)
          }));
          break;

        case 'tags':
          const tagsQuery = `
            SELECT tag as value, COUNT(*) as count
            FROM feed_items,
                 jsonb_array_elements_text(metadata->'tags') as tag
            WHERE metadata->>'isAgentResponse' = 'true'
            GROUP BY tag
            ORDER BY count DESC
            LIMIT 30
          `;
          const tagsResult = await db.query(tagsQuery);
          facetResults.tags = tagsResult.rows.map(row => ({
            value: row.value,
            count: parseInt(row.count)
          }));
          break;

        case 'businessImpact':
          const impactQuery = `
            SELECT 
              CASE 
                WHEN (metadata->>'businessImpact')::int BETWEEN 8 AND 10 THEN 'High (8-10)'
                WHEN (metadata->>'businessImpact')::int BETWEEN 6 AND 7 THEN 'Medium (6-7)'
                WHEN (metadata->>'businessImpact')::int BETWEEN 4 AND 5 THEN 'Low (4-5)'
                ELSE 'Minimal (0-3)'
              END as value,
              COUNT(*) as count
            FROM feed_items 
            WHERE metadata->>'isAgentResponse' = 'true'
            GROUP BY 
              CASE 
                WHEN (metadata->>'businessImpact')::int BETWEEN 8 AND 10 THEN 'High (8-10)'
                WHEN (metadata->>'businessImpact')::int BETWEEN 6 AND 7 THEN 'Medium (6-7)'
                WHEN (metadata->>'businessImpact')::int BETWEEN 4 AND 5 THEN 'Low (4-5)'
                ELSE 'Minimal (0-3)'
              END
            ORDER BY count DESC
          `;
          const impactResult = await db.query(impactQuery);
          facetResults.businessImpact = impactResult.rows.map(row => ({
            value: row.value,
            count: parseInt(row.count)
          }));
          break;
      }
    } catch (error) {
      logger.error(`Failed to generate facet: ${facet}`, error);
    }
  }

  return facetResults;
}

// Helper function to track search queries
async function trackSearchQuery(query: string, filters: any, resultCount: number): Promise<string> {
  // This would be implemented with a proper search_queries table
  // For now, return a mock search ID
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default router;