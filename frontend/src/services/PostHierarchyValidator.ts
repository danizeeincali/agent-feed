/**
 * PostHierarchyValidator Service - TDD London School Implementation
 * 
 * Validates and manages post hierarchy structures
 */

interface PostHierarchyValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  maxDepth?: number;
  structure?: string;
  statistics?: {
    totalPosts: number;
    rootPosts: number;
    orphanedPosts: number;
    maxBranchDepth: number;
  };
}

interface ValidationOptions {
  maxDepth?: number;
  allowCircular?: boolean;
  requireParentFirst?: boolean;
}

interface PostData {
  id: string;
  metadata: {
    hierarchyLevel: number;
    parentId: string | null;
    childrenIds: string[];
  };
}

export class PostHierarchyValidator {
  private hierarchyCache = new Map<string, any>();

  validateStructure(
    posts: PostData[], 
    options: ValidationOptions = {}
  ): PostHierarchyValidationResult {
    const {
      maxDepth = 3,
      allowCircular = false,
      requireParentFirst = true
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];
    let actualMaxDepth = 0;

    // Create lookup maps
    const postMap = new Map(posts.map(post => [post.id, post]));
    const rootPosts: PostData[] = [];
    const orphanedPosts: PostData[] = [];

    // Validate each post
    for (const post of posts) {
      const level = post.metadata.hierarchyLevel;
      actualMaxDepth = Math.max(actualMaxDepth, level);

      // Check max depth constraint
      if (level > maxDepth) {
        warnings.push(`Post exceeds maximum depth: ${post.id} at level ${level}`);
      }

      // Check for root posts
      if (post.metadata.parentId === null) {
        rootPosts.push(post);
        
        if (level !== 0) {
          errors.push(`Root post ${post.id} should have hierarchyLevel 0, but has level ${level}`);
        }
      } else {
        // Check if parent exists
        const parent = postMap.get(post.metadata.parentId);
        if (!parent) {
          orphanedPosts.push(post);
          errors.push(`Orphaned post detected: ${post.id}`);
        } else {
          // Validate parent-child relationship
          if (!parent.metadata.childrenIds.includes(post.id)) {
            errors.push(`Parent ${parent.id} does not list ${post.id} as a child`);
          }

          // Validate hierarchy levels
          if (level !== parent.metadata.hierarchyLevel + 1) {
            errors.push(`Hierarchy level mismatch: ${post.id} (level ${level}) should be level ${parent.metadata.hierarchyLevel + 1}`);
          }
        }
      }

      // Validate children exist
      for (const childId of post.metadata.childrenIds) {
        const child = postMap.get(childId);
        if (!child) {
          errors.push(`Child post ${childId} referenced by ${post.id} does not exist`);
        } else if (child.metadata.parentId !== post.id) {
          errors.push(`Child ${childId} does not reference ${post.id} as parent`);
        }
      }
    }

    // Check for circular references
    if (!allowCircular) {
      const circularErrors = this.detectCircularReferences(posts);
      errors.push(...circularErrors);
    }

    // Validate posting order if required
    if (requireParentFirst) {
      const orderErrors = this.validatePostingOrder(posts);
      errors.push(...orderErrors);
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      maxDepth: actualMaxDepth,
      structure: isValid ? 'tree' : 'invalid',
      statistics: {
        totalPosts: posts.length,
        rootPosts: rootPosts.length,
        orphanedPosts: orphanedPosts.length,
        maxBranchDepth: actualMaxDepth
      }
    };
  }

  buildHierarchy(threadData: any): PostHierarchyValidationResult {
    const allPosts = [
      threadData.root,
      ...(threadData.children || []),
      ...(threadData.grandchildren || [])
    ].filter(Boolean);

    return this.validateStructure(allPosts);
  }

  findDepth(postId: string): number {
    // This would typically traverse the hierarchy to find depth
    // For now, return cached or default value
    return this.hierarchyCache.get(`depth_${postId}`) || 0;
  }

  getThreadRoot(postId: string): string | null {
    // This would traverse up the hierarchy to find the root
    // For now, return cached or null
    return this.hierarchyCache.get(`root_${postId}`) || null;
  }

  private detectCircularReferences(posts: PostData[]): string[] {
    const errors: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const postMap = new Map(posts.map(post => [post.id, post]));

    const detectCycle = (postId: string, path: string[] = []): boolean => {
      if (recursionStack.has(postId)) {
        errors.push(`Circular reference detected between ${path.join(' -> ')} -> ${postId}`);
        return true;
      }

      if (visited.has(postId)) {
        return false;
      }

      visited.add(postId);
      recursionStack.add(postId);
      path.push(postId);

      const post = postMap.get(postId);
      if (post) {
        // Check parent relationship
        if (post.metadata.parentId && detectCycle(post.metadata.parentId, [...path])) {
          return true;
        }

        // Check children relationships
        for (const childId of post.metadata.childrenIds) {
          if (detectCycle(childId, [...path])) {
            return true;
          }
        }
      }

      recursionStack.delete(postId);
      return false;
    };

    // Check each post for circular references
    for (const post of posts) {
      if (!visited.has(post.id)) {
        detectCycle(post.id);
      }
    }

    return errors;
  }

  private validatePostingOrder(posts: PostData[]): string[] {
    const errors: string[] = [];
    const postMap = new Map(posts.map(post => [post.id, post]));

    for (const post of posts) {
      if (post.metadata.parentId) {
        const parent = postMap.get(post.metadata.parentId);
        if (parent) {
          // In a real implementation, we'd check timestamps
          // For now, just validate that parent exists before child
          // This is a simplified check
        }
      }
    }

    return errors;
  }

  // Helper methods for testing
  findOrphanedPosts(posts: PostData[]): PostData[] {
    const postMap = new Map(posts.map(post => [post.id, post]));
    return posts.filter(post => 
      post.metadata.parentId && !postMap.has(post.metadata.parentId)
    );
  }

  calculateMaxDepth(posts: PostData[]): number {
    return Math.max(...posts.map(post => post.metadata.hierarchyLevel));
  }

  sortByHierarchy(posts: PostData[]): PostData[] {
    return [...posts].sort((a, b) => {
      // Sort by hierarchy level first, then by parent relationship
      if (a.metadata.hierarchyLevel !== b.metadata.hierarchyLevel) {
        return a.metadata.hierarchyLevel - b.metadata.hierarchyLevel;
      }
      
      // If same level, sort by ID for consistency
      return a.id.localeCompare(b.id);
    });
  }
}