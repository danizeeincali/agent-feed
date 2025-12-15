import { DatabaseService } from '../services/DatabaseService';
import { AgentPost } from '../types/api';

interface QueryBuilder {
  select: (fields: string[]) => QueryBuilder;
  insert: (table: string) => QueryBuilder;
  update: (table: string) => QueryBuilder;
  delete: (table: string) => QueryBuilder;
  where: (condition: string) => QueryBuilder;
  join: (table: string, on: string, type?: string) => QueryBuilder;
  orderBy: (field: string, direction?: string) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  build: () => string;
}

interface CacheManager {
  get: (key: string) => any;
  set: (key: string, value: any, ttl?: number) => void;
  del: (key: string) => void;
  invalidate: (pattern: string) => void;
  flush: () => void;
}

interface PostQueryOptions {
  limit: number;
  offset: number;
  since?: string;
  agentId?: string;
  status?: string;
}

export class PostRepository {
  private db: DatabaseService;
  private queryBuilder: QueryBuilder;
  private cache: CacheManager;

  constructor(
    database: DatabaseService,
    queryBuilder: QueryBuilder,
    cache: CacheManager
  ) {
    this.db = database;
    this.queryBuilder = queryBuilder;
    this.cache = cache;
  }

  async getPosts(options: PostQueryOptions): Promise<AgentPost[]> {
    const cacheKey = `posts:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const query = this.buildComplexPostQuery();
      const params = this.buildQueryParams(options);

      const result = await this.db.query(query, params);
      
      const posts: AgentPost[] = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        published_at: row.published_at,
        agent: {
          id: row.agent_id,
          name: row.agent_name,
          avatar_url: row.agent_avatar || null
        },
        engagement: {
          likeCount: parseInt(row.like_count) || 0,
          commentCount: parseInt(row.comment_count) || 0,
          averageEngagement: parseFloat(row.avg_engagement) || 0
        },
        status: row.status || 'published',
        metadata: {
          tags: row.tags || [],
          category: row.category || null
        }
      }));

      this.cache.set(cacheKey, posts, 10000); // 10 second cache
      return posts;
    } catch (error) {
      throw new Error(`Failed to get posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getById(id: string): Promise<AgentPost | null> {
    const cacheKey = `post:${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const query = `
        SELECT 
          p.id,
          p.content,
          p.published_at,
          p.status,
          p.agent_id,
          a.name as agent_name,
          a.avatar_url as agent_avatar,
          COUNT(DISTINCT l.id) as like_count,
          COUNT(DISTINCT c.id) as comment_count,
          AVG(e.engagement_score) as avg_engagement
        FROM agent_posts p
        INNER JOIN agents a ON p.agent_id = a.id
        LEFT JOIN post_likes l ON p.id = l.post_id
        LEFT JOIN post_comments c ON p.id = c.post_id
        LEFT JOIN post_engagement e ON p.id = e.post_id
        WHERE p.id = $1
        GROUP BY p.id, p.content, p.published_at, p.status, p.agent_id, a.name, a.avatar_url
      `;

      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const post: AgentPost = {
        id: row.id,
        content: row.content,
        published_at: row.published_at,
        agent: {
          id: row.agent_id,
          name: row.agent_name,
          avatar_url: row.agent_avatar
        },
        engagement: {
          likeCount: parseInt(row.like_count) || 0,
          commentCount: parseInt(row.comment_count) || 0,
          averageEngagement: parseFloat(row.avg_engagement) || 0
        },
        status: row.status,
        metadata: {
          tags: [],
          category: null
        }
      };

      this.cache.set(cacheKey, post, 30000);
      return post;
    } catch (error) {
      throw new Error(`Failed to get post ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(postData: Partial<AgentPost>): Promise<AgentPost> {
    try {
      const result = await this.db.transaction(async (ctx) => {
        // Insert post
        const insertQuery = `
          INSERT INTO agent_posts (id, content, agent_id, status, published_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING *
        `;
        
        const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const postResult = await this.db.query(insertQuery, [
          postId,
          postData.content,
          postData.agent?.id,
          postData.status || 'published',
          postData.published_at || new Date().toISOString()
        ], ctx);

        // Initialize engagement metrics
        const engagementQuery = `
          INSERT INTO post_engagement (post_id, engagement_score, created_at)
          VALUES ($1, 0.0, NOW())
        `;
        await this.db.query(engagementQuery, [postId], ctx);

        return postResult.rows[0];
      });

      // Invalidate cache
      this.cache.invalidate('posts:');

      // Return created post
      return await this.getById(result.id) as AgentPost;
    } catch (error) {
      throw new Error(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateEngagement(
    postId: string, 
    action: 'like' | 'unlike' | 'comment'
  ): Promise<{ success: boolean }> {
    try {
      const result = await this.db.transaction(async (ctx) => {
        if (action === 'like') {
          // Add like record
          const likeQuery = `
            INSERT INTO post_likes (post_id, user_id, created_at)
            VALUES ($1, 'system', NOW())
            ON CONFLICT (post_id, user_id) DO NOTHING
          `;
          await this.db.query(likeQuery, [postId], ctx);
        } else if (action === 'unlike') {
          // Remove like record
          const unlikeQuery = 'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2';
          await this.db.query(unlikeQuery, [postId, 'system'], ctx);
        }

        // Update engagement score
        const updateEngagementQuery = `
          UPDATE post_engagement 
          SET engagement_score = (
            SELECT 
              (COUNT(DISTINCT l.id) * 1.0) + (COUNT(DISTINCT c.id) * 2.0)
            FROM post_likes l, post_comments c
            WHERE l.post_id = $1 OR c.post_id = $1
          ),
          updated_at = NOW()
          WHERE post_id = $1
        `;
        await this.db.query(updateEngagementQuery, [postId], ctx);

        return { success: true };
      });

      // Invalidate cache
      this.cache.del(`post:${postId}`);
      this.cache.invalidate('posts:');

      return result;
    } catch (error) {
      throw new Error(`Failed to update engagement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildComplexPostQuery(): string {
    return `
      SELECT 
        p.id,
        p.content,
        p.published_at,
        p.agent_id,
        p.status,
        a.name as agent_name,
        a.avatar_url as agent_avatar,
        COUNT(DISTINCT l.id) as like_count,
        COUNT(DISTINCT c.id) as comment_count,
        AVG(e.engagement_score) as avg_engagement
      FROM agent_posts p
      INNER JOIN agents a ON p.agent_id = a.id
      LEFT JOIN post_likes l ON p.id = l.post_id
      LEFT JOIN post_comments c ON p.id = c.post_id
      LEFT JOIN post_engagement e ON p.id = e.post_id
      WHERE p.status = 'published'
        AND p.published_at >= $1
        AND a.status != 'deleted'
      GROUP BY p.id, p.content, p.published_at, p.agent_id, a.name, a.avatar_url
      ORDER BY p.published_at DESC, avg_engagement DESC
      LIMIT $2 OFFSET $3
    `;
  }

  private buildQueryParams(options: PostQueryOptions): any[] {
    return [
      options.since || '1970-01-01T00:00:00.000Z',
      options.limit,
      options.offset
    ];
  }
}
