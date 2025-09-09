/**
 * TDD London School - Test Data Builders
 * 
 * Provides comprehensive test data builders for all domain entities:
 * - Fluent Builder Pattern for complex objects
 * - Realistic test data generation
 * - Relationship and dependency management
 * - Data variation and edge case generation
 * - Builder chain validation
 */

import { faker } from '@faker-js/faker';

// ==================== BUILDER INTERFACES ====================

export interface Builder<T> {
  build(): T;
  reset(): this;
}

export interface FluentBuilder<T> extends Builder<T> {
  with(updates: Partial<T>): this;
}

// ==================== BASE BUILDER CLASS ====================

export abstract class BaseBuilder<T> implements FluentBuilder<T> {
  protected data: Partial<T> = {};
  protected validations: ((data: T) => boolean)[] = [];

  /**
   * Updates builder with partial data
   */
  public with(updates: Partial<T>): this {
    this.data = { ...this.data, ...updates };
    return this;
  }

  /**
   * Adds validation rule
   */
  public addValidation(validation: (data: T) => boolean): this {
    this.validations.push(validation);
    return this;
  }

  /**
   * Builds the object
   */
  public build(): T {
    const result = this.createDefault();
    const finalResult = { ...result, ...this.data };
    
    // Run validations
    this.validate(finalResult);
    
    return finalResult;
  }

  /**
   * Resets builder to initial state
   */
  public reset(): this {
    this.data = {};
    return this;
  }

  /**
   * Creates default object structure
   */
  protected abstract createDefault(): T;

  /**
   * Validates the built object
   */
  protected validate(data: T): void {
    for (const validation of this.validations) {
      if (!validation(data)) {
        throw new Error('Builder validation failed');
      }
    }
  }
}

// ==================== MENTION SUGGESTION BUILDER ====================

export interface MentionSuggestion {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  avatar?: string;
  type: 'ai' | 'bot' | 'user' | 'system';
  isActive: boolean;
  lastSeen?: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export class MentionSuggestionBuilder extends BaseBuilder<MentionSuggestion> {
  protected createDefault(): MentionSuggestion {
    const name = faker.internet.userName().toLowerCase();
    return {
      id: `agent-${faker.string.uuid()}`,
      name: name,
      displayName: faker.person.fullName(),
      description: faker.lorem.sentence(),
      avatar: faker.image.avatar(),
      type: faker.helpers.arrayElement(['ai', 'bot', 'user', 'system']),
      isActive: faker.datatype.boolean(),
      lastSeen: faker.date.recent().toISOString(),
      capabilities: faker.helpers.arrayElements(['chat', 'analysis', 'search', 'coding'], 2),
      metadata: {
        createdAt: faker.date.past().toISOString(),
        version: faker.system.semver()
      }
    };
  }

  /**
   * Creates AI agent mention
   */
  public asAIAgent(): this {
    return this.with({
      type: 'ai',
      capabilities: ['chat', 'analysis', 'reasoning', 'search'],
      isActive: true
    });
  }

  /**
   * Creates bot mention
   */
  public asBot(): this {
    return this.with({
      type: 'bot',
      capabilities: ['automation', 'integration'],
      isActive: true
    });
  }

  /**
   * Creates inactive mention
   */
  public asInactive(): this {
    return this.with({
      isActive: false,
      lastSeen: faker.date.past({ years: 1 }).toISOString()
    });
  }

  /**
   * Creates mention with specific name
   */
  public withName(name: string): this {
    return this.with({
      name: name,
      displayName: `${name.charAt(0).toUpperCase()}${name.slice(1)} Agent`
    });
  }

  /**
   * Creates mention with capabilities
   */
  public withCapabilities(capabilities: string[]): this {
    return this.with({ capabilities });
  }
}

// ==================== POST BUILDER ====================

export interface Post {
  id: string;
  content: string;
  title?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  mentions: string[];
  isDraft: boolean;
  visibility: 'public' | 'private' | 'unlisted';
  attachments?: Attachment[];
  reactions?: Reaction[];
  comments?: Comment[];
  metadata?: Record<string, any>;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'link';
  url: string;
  filename?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface Reaction {
  id: string;
  type: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export class PostBuilder extends BaseBuilder<Post> {
  protected createDefault(): Post {
    const createdAt = faker.date.past();
    const updatedAt = faker.date.between({ from: createdAt, to: new Date() });
    
    return {
      id: `post-${faker.string.uuid()}`,
      content: faker.lorem.paragraphs(2),
      title: faker.lorem.sentence(),
      authorId: `user-${faker.string.uuid()}`,
      authorName: faker.person.fullName(),
      authorAvatar: faker.image.avatar(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      tags: faker.helpers.arrayElements(['tech', 'ai', 'coding', 'discussion', 'help'], 2),
      mentions: [],
      isDraft: false,
      visibility: 'public',
      attachments: [],
      reactions: [],
      comments: [],
      metadata: {
        wordCount: faker.number.int({ min: 10, max: 500 }),
        readTime: faker.number.int({ min: 1, max: 5 })
      }
    };
  }

  /**
   * Creates draft post
   */
  public asDraft(): this {
    return this.with({
      isDraft: true,
      visibility: 'private'
    });
  }

  /**
   * Creates published post
   */
  public asPublished(): this {
    return this.with({
      isDraft: false,
      visibility: 'public'
    });
  }

  /**
   * Adds mentions to post
   */
  public withMentions(mentions: string[]): this {
    const mentionTags = mentions.map(m => m.startsWith('@') ? m : `@${m}`);
    const contentWithMentions = `${this.data.content || 'Post content'} ${mentionTags.join(' ')}`;
    
    return this.with({
      mentions: mentionTags,
      content: contentWithMentions
    });
  }

  /**
   * Adds tags to post
   */
  public withTags(tags: string[]): this {
    return this.with({ tags });
  }

  /**
   * Adds attachments to post
   */
  public withAttachments(attachments: Attachment[]): this {
    return this.with({ attachments });
  }

  /**
   * Creates long-form post
   */
  public asLongForm(): this {
    return this.with({
      content: faker.lorem.paragraphs(5),
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      metadata: {
        ...this.data.metadata,
        wordCount: faker.number.int({ min: 500, max: 2000 }),
        readTime: faker.number.int({ min: 3, max: 10 })
      }
    });
  }

  /**
   * Creates short post/status update
   */
  public asShortStatus(): this {
    return this.with({
      content: faker.lorem.sentence(),
      title: undefined,
      metadata: {
        ...this.data.metadata,
        wordCount: faker.number.int({ min: 1, max: 50 }),
        readTime: 1
      }
    });
  }
}

// ==================== COMMENT BUILDER ====================

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  replies: Comment[];
  mentions: string[];
  reactions?: Reaction[];
  isEdited: boolean;
  isDeleted: boolean;
  metadata?: Record<string, any>;
}

export class CommentBuilder extends BaseBuilder<Comment> {
  protected createDefault(): Comment {
    const createdAt = faker.date.past();
    const updatedAt = faker.date.between({ from: createdAt, to: new Date() });
    
    return {
      id: `comment-${faker.string.uuid()}`,
      content: faker.lorem.sentences(2),
      postId: `post-${faker.string.uuid()}`,
      authorId: `user-${faker.string.uuid()}`,
      authorName: faker.person.fullName(),
      authorAvatar: faker.image.avatar(),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      parentId: undefined,
      replies: [],
      mentions: [],
      reactions: [],
      isEdited: false,
      isDeleted: false,
      metadata: {
        depth: 0
      }
    };
  }

  /**
   * Creates reply comment
   */
  public asReplyTo(parentId: string, depth: number = 1): this {
    return this.with({
      parentId,
      metadata: {
        ...this.data.metadata,
        depth
      }
    });
  }

  /**
   * Creates deleted comment
   */
  public asDeleted(): this {
    return this.with({
      isDeleted: true,
      content: '[This comment has been deleted]'
    });
  }

  /**
   * Creates edited comment
   */
  public asEdited(): this {
    return this.with({
      isEdited: true,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Adds mentions to comment
   */
  public withMentions(mentions: string[]): this {
    const mentionTags = mentions.map(m => m.startsWith('@') ? m : `@${m}`);
    const contentWithMentions = `${this.data.content || 'Comment content'} ${mentionTags.join(' ')}`;
    
    return this.with({
      mentions: mentionTags,
      content: contentWithMentions
    });
  }

  /**
   * Creates comment thread with replies
   */
  public withReplies(count: number): this {
    const replies = Array.from({ length: count }, (_, index) => 
      new CommentBuilder()
        .asReplyTo(this.data.id || `comment-${faker.string.uuid()}`, 1)
        .build()
    );
    
    return this.with({ replies });
  }
}

// ==================== API RESPONSE BUILDER ====================

export interface APIResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export class APIResponseBuilder<T = any> extends BaseBuilder<APIResponse<T>> {
  protected createDefault(): APIResponse<T> {
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      data: undefined as T,
      timestamp: new Date().toISOString(),
      requestId: faker.string.uuid()
    };
  }

  /**
   * Creates successful response
   */
  public asSuccess(data: T): this {
    return this.with({
      ok: true,
      status: 200,
      statusText: 'OK',
      data
    });
  }

  /**
   * Creates error response
   */
  public asError(status: number, error: string): this {
    return this.with({
      ok: false,
      status,
      statusText: this.getStatusText(status),
      error,
      data: undefined
    });
  }

  /**
   * Creates not found response
   */
  public asNotFound(message = 'Resource not found'): this {
    return this.asError(404, message);
  }

  /**
   * Creates server error response
   */
  public asServerError(message = 'Internal server error'): this {
    return this.asError(500, message);
  }

  /**
   * Creates unauthorized response
   */
  public asUnauthorized(message = 'Unauthorized'): this {
    return this.asError(401, message);
  }

  /**
   * Creates bad request response
   */
  public asBadRequest(message = 'Bad request'): this {
    return this.asError(400, message);
  }

  /**
   * Gets status text for status code
   */
  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    };
    
    return statusTexts[status] || 'Unknown';
  }
}

// ==================== USER BUILDER ====================

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  isActive: boolean;
  role: 'user' | 'admin' | 'moderator';
  createdAt: string;
  lastLoginAt?: string;
  preferences: UserPreferences;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  emailNotifications: boolean;
  mentionNotifications: boolean;
  language: string;
}

export class UserBuilder extends BaseBuilder<User> {
  protected createDefault(): User {
    const username = faker.internet.userName();
    return {
      id: `user-${faker.string.uuid()}`,
      username,
      email: faker.internet.email(),
      displayName: faker.person.fullName(),
      avatar: faker.image.avatar(),
      bio: faker.lorem.sentence(),
      isActive: true,
      role: 'user',
      createdAt: faker.date.past().toISOString(),
      lastLoginAt: faker.date.recent().toISOString(),
      preferences: {
        theme: 'light',
        notifications: true,
        emailNotifications: true,
        mentionNotifications: true,
        language: 'en'
      },
      metadata: {
        profileCompleted: true,
        emailVerified: true
      }
    };
  }

  /**
   * Creates admin user
   */
  public asAdmin(): this {
    return this.with({
      role: 'admin',
      metadata: {
        ...this.data.metadata,
        adminSince: faker.date.past().toISOString()
      }
    });
  }

  /**
   * Creates moderator user
   */
  public asModerator(): this {
    return this.with({
      role: 'moderator',
      metadata: {
        ...this.data.metadata,
        moderatorSince: faker.date.past().toISOString()
      }
    });
  }

  /**
   * Creates inactive user
   */
  public asInactive(): this {
    return this.with({
      isActive: false,
      lastLoginAt: faker.date.past({ years: 1 }).toISOString()
    });
  }

  /**
   * Sets user preferences
   */
  public withPreferences(preferences: Partial<UserPreferences>): this {
    return this.with({
      preferences: {
        ...this.data.preferences,
        ...preferences
      }
    });
  }
}

// ==================== BUILDER FACTORY ====================

export class BuilderFactory {
  /**
   * Creates mention suggestion builder
   */
  public static mentionSuggestion(): MentionSuggestionBuilder {
    return new MentionSuggestionBuilder();
  }

  /**
   * Creates post builder
   */
  public static post(): PostBuilder {
    return new PostBuilder();
  }

  /**
   * Creates comment builder
   */
  public static comment(): CommentBuilder {
    return new CommentBuilder();
  }

  /**
   * Creates API response builder
   */
  public static apiResponse<T = any>(): APIResponseBuilder<T> {
    return new APIResponseBuilder<T>();
  }

  /**
   * Creates user builder
   */
  public static user(): UserBuilder {
    return new UserBuilder();
  }

  /**
   * Creates multiple instances using builder
   */
  public static multiple<T>(builder: Builder<T>, count: number): T[] {
    return Array.from({ length: count }, () => builder.build());
  }

  /**
   * Creates test dataset with relationships
   */
  public static createTestDataset(): {
    users: User[];
    posts: Post[];
    comments: Comment[];
    mentions: MentionSuggestion[];
  } {
    const users = this.multiple(this.user(), 5);
    const mentions = this.multiple(this.mentionSuggestion().asAIAgent(), 10);
    
    const posts = users.map(user => 
      this.post()
        .with({
          authorId: user.id,
          authorName: user.displayName,
          authorAvatar: user.avatar
        })
        .withMentions(['@' + faker.helpers.arrayElement(mentions).name])
        .build()
    );

    const comments = posts.flatMap(post => 
      Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => {
        const user = faker.helpers.arrayElement(users);
        return this.comment()
          .with({
            postId: post.id,
            authorId: user.id,
            authorName: user.displayName,
            authorAvatar: user.avatar
          })
          .build();
      })
    );

    return { users, posts, comments, mentions };
  }
}

// ==================== EXPORT BUILDERS ====================

export {
  BaseBuilder,
  MentionSuggestionBuilder,
  PostBuilder,
  CommentBuilder,
  APIResponseBuilder,
  UserBuilder,
  BuilderFactory
};

export default BuilderFactory;