/**
 * MemoryUpdater - Extracts and stores learnings from agent interactions
 * Phase 3C: Memory Management Implementation
 */

import type { DatabaseManager } from '../types/database-manager';
import type { FeedItem } from '../types/feed';

export interface Memory {
  content: string;
  importance: number; // 0.0 to 1.0
  tags: string[];
  metadata: Record<string, any>;
  createdAt?: Date;
}

export interface MemoryData {
  content: string;
  importance: number;
  tags: string[];
  metadata: Record<string, any>;
}

export class MemoryUpdater {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Extract memory from feed item and response
   */
  async extractMemory(
    feedItem: FeedItem,
    responseContent: string,
    agentName: string,
    userId: string
  ): Promise<MemoryData> {
    // Combine feed item and response for context
    const fullContext = `${feedItem.title}\n${feedItem.content || ''}\n${responseContent}`;

    // Extract key topics and keywords
    const tags = this.extractTags(fullContext);

    // Calculate importance based on content
    const importance = this.calculateImportance(feedItem, responseContent);

    // Create memory summary
    const memorySummary = this.createMemorySummary(feedItem, responseContent);

    // Truncate if too long
    const content = memorySummary.length > 5000
      ? memorySummary.substring(0, 4997) + '...'
      : memorySummary;

    return {
      content,
      importance,
      tags,
      metadata: {
        feedItemId: feedItem.id,
        feedItemTitle: feedItem.title,
        feedItemLink: feedItem.link,
        responsePreview: responseContent.substring(0, 200),
      },
    };
  }

  /**
   * Store memory in database
   */
  async storeMemory(
    agentName: string,
    userId: string,
    memoryData: MemoryData
  ): Promise<string> {
    const result = await this.db.query<any>(`
      INSERT INTO agent_memories (
        agent_name, user_id, memory_content, importance,
        tags, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
      agentName,
      userId,
      memoryData.content,
      memoryData.importance,
      JSON.stringify(memoryData.tags),
      JSON.stringify(memoryData.metadata),
    ]);

    return result.rows[0].id;
  }

  /**
   * Extract and store memory from interaction (convenience method)
   */
  async updateMemory(
    feedItem: FeedItem,
    responseContent: string,
    agentName: string,
    userId: string
  ): Promise<string> {
    const memoryData = await this.extractMemory(
      feedItem,
      responseContent,
      agentName,
      userId
    );

    return this.storeMemory(agentName, userId, memoryData);
  }

  /**
   * Get recent memories for agent
   */
  async getRecentMemories(
    agentName: string,
    userId: string,
    limit: number = 10
  ): Promise<Memory[]> {
    const result = await this.db.query<any>(`
      SELECT id, memory_content as content, importance, tags, metadata, created_at
      FROM agent_memories
      WHERE agent_name = $1 AND user_id = $2
      ORDER BY importance DESC, created_at DESC
      LIMIT $3
    `, [agentName, userId, limit]);

    const memories = result.rows.map(row => ({
      content: row.content,
      importance: row.importance,
      tags: JSON.parse(row.tags || '[]'),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
    }));

    // Ensure we don't return more than limit (defensive programming)
    return memories.slice(0, limit);
  }

  /**
   * Extract tags from content
   */
  private extractTags(content: string): string[] {
    const tags: string[] = [];

    // Technical keywords to look for
    const technicalKeywords = [
      'typescript', 'javascript', 'react', 'node', 'python', 'rust',
      'go', 'java', 'c++', 'sql', 'database', 'api', 'cloud',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp',
      'machine learning', 'ai', 'artificial intelligence',
      'web development', 'frontend', 'backend', 'fullstack',
      'security', 'performance', 'optimization', 'testing',
      'devops', 'ci/cd', 'git', 'agile', 'scrum',
    ];

    const lowerContent = content.toLowerCase();

    for (const keyword of technicalKeywords) {
      if (lowerContent.includes(keyword)) {
        tags.push(keyword);
      }
    }

    // Extract capitalized words (likely important topics)
    const capitalizedWords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const uniqueCapitalized = [...new Set(capitalizedWords)]
      .filter(word => word.length > 3)
      .slice(0, 5);

    tags.push(...uniqueCapitalized.map(w => w.toLowerCase()));

    // Deduplicate and limit
    return [...new Set(tags)].slice(0, 10);
  }

  /**
   * Calculate importance score (0.0 to 1.0)
   */
  private calculateImportance(feedItem: FeedItem, responseContent: string): number {
    let importance = 0.5; // Base importance

    // Empty response = low importance
    if (!responseContent || responseContent.trim().length === 0) {
      return 0.3;
    }

    // Longer responses suggest more engagement = higher importance
    if (responseContent.length > 200) {
      importance += 0.1;
    }
    if (responseContent.length > 400) {
      importance += 0.1;
    }

    // Technical content = higher importance
    const technicalTerms = [
      'architecture', 'implementation', 'algorithm', 'optimization',
      'performance', 'security', 'scalability', 'design pattern',
      'rust', 'memory', 'ownership', 'borrowing', 'lifetimes',
    ];

    const lowerContent = (feedItem.title + (feedItem.content || '') + responseContent).toLowerCase();
    const technicalMatches = technicalTerms.filter(term =>
      lowerContent.includes(term)
    ).length;

    importance += Math.min(technicalMatches * 0.08, 0.3); // Increased from 0.05 to 0.08, max from 0.2 to 0.3

    // Questions or detailed explanations = higher importance
    if (responseContent.includes('?') || responseContent.includes('because')) {
      importance += 0.05;
    }

    // Ensure within bounds
    return Math.min(Math.max(importance, 0.0), 1.0);
  }

  /**
   * Create memory summary
   */
  private createMemorySummary(feedItem: FeedItem, responseContent: string): string {
    const topic = feedItem.title;
    const responsePreview = responseContent.substring(0, 300);

    return `Discussed: ${topic}\n\nResponse: ${responsePreview}${responseContent.length > 300 ? '...' : ''}`;
  }
}
