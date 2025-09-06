import React from 'react';
import { Comment, CommentSort, CommentFilter, ThreadState } from '../components/CommentThread';

/**
 * Thread navigation and state management utilities
 */

export interface CommentTreeNode {
  comment: Comment;
  children: CommentTreeNode[];
  parent?: CommentTreeNode;
  level: number;
  isVisible?: boolean;
  isExpanded?: boolean;
}

/**
 * Build a tree structure from flat comment list
 */
export function buildCommentTree(comments: Comment[]): CommentTreeNode[] {
  const commentMap = new Map<string, CommentTreeNode>();
  const rootNodes: CommentTreeNode[] = [];

  // First pass: create all nodes
  comments.forEach(comment => {
    commentMap.set(comment.id, {
      comment,
      children: [],
      level: 0
    });
  });

  // Second pass: establish parent-child relationships
  comments.forEach(comment => {
    const node = commentMap.get(comment.id)!;
    
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.children.push(node);
        node.parent = parent;
        node.level = parent.level + 1;
      }
    } else {
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

/**
 * Flatten tree structure back to list with proper ordering
 */
export function flattenCommentTree(nodes: CommentTreeNode[], sort?: CommentSort): Comment[] {
  const result: Comment[] = [];

  function traverse(nodes: CommentTreeNode[]) {
    // Sort nodes if specified
    let sortedNodes = [...nodes];
    if (sort) {
      sortedNodes = sortComments(sortedNodes.map(n => n.comment), sort)
        .map(comment => nodes.find(n => n.comment.id === comment.id)!);
    }

    sortedNodes.forEach(node => {
      result.push(node.comment);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  }

  traverse(nodes);
  return result;
}

/**
 * Sort comments by various criteria
 */
export function sortComments(comments: Comment[], sort: CommentSort): Comment[] {
  return [...comments].sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'likes':
        comparison = a.likesCount - b.likesCount;
        break;
      case 'replies':
        comparison = a.repliesCount - b.repliesCount;
        break;
      case 'controversial':
        // Calculate controversy score (high engagement with mixed reactions)
        const aControversy = Math.min(a.likesCount, a.repliesCount) * 2;
        const bControversy = Math.min(b.likesCount, b.repliesCount) * 2;
        comparison = aControversy - bControversy;
        break;
    }

    return sort.direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * Filter comments based on criteria
 */
export function filterComments(comments: Comment[], filter: CommentFilter): Comment[] {
  return comments.filter(comment => {
    if (filter.author && !comment.author.toLowerCase().includes(filter.author.toLowerCase())) {
      return false;
    }

    if (filter.hasReplies !== undefined) {
      const hasReplies = comment.repliesCount > 0;
      if (filter.hasReplies !== hasReplies) {
        return false;
      }
    }

    if (filter.isEdited !== undefined && filter.isEdited !== comment.isEdited) {
      return false;
    }

    if (filter.isPinned !== undefined && filter.isPinned !== comment.isPinned) {
      return false;
    }

    if (filter.minLikes !== undefined && comment.likesCount < filter.minLikes) {
      return false;
    }

    return true;
  });
}

/**
 * Search comments for text content
 */
export function searchComments(comments: Comment[], query: string): Comment[] {
  if (!query.trim()) return comments;

  const searchTerm = query.toLowerCase();
  return comments.filter(comment => 
    comment.content.toLowerCase().includes(searchTerm) ||
    comment.author.toLowerCase().includes(searchTerm)
  );
}

/**
 * Navigate to parent comment
 */
export function findParentComment(commentId: string, comments: Comment[]): Comment | null {
  const comment = comments.find(c => c.id === commentId);
  if (!comment?.parentId) return null;
  
  return comments.find(c => c.id === comment.parentId) || null;
}

/**
 * Navigate to next sibling comment
 */
export function findNextSibling(commentId: string, comments: Comment[]): Comment | null {
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;

  // Find all siblings (same parent)
  const siblings = comments.filter(c => c.parentId === comment.parentId);
  const currentIndex = siblings.findIndex(c => c.id === commentId);
  
  return currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
}

/**
 * Navigate to previous sibling comment
 */
export function findPrevSibling(commentId: string, comments: Comment[]): Comment | null {
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return null;

  // Find all siblings (same parent)
  const siblings = comments.filter(c => c.parentId === comment.parentId);
  const currentIndex = siblings.findIndex(c => c.id === commentId);
  
  return currentIndex > 0 ? siblings[currentIndex - 1] : null;
}

/**
 * Get comment thread path for breadcrumbs
 */
export function getThreadPath(commentId: string, comments: Comment[]): Comment[] {
  const path: Comment[] = [];
  let currentComment = comments.find(c => c.id === commentId);
  
  while (currentComment) {
    path.unshift(currentComment);
    currentComment = currentComment.parentId 
      ? comments.find(c => c.id === currentComment?.parentId) 
      : undefined;
  }
  
  return path;
}

/**
 * Calculate thread statistics
 */
export function getThreadStats(comments: Comment[]) {
  const stats = {
    totalComments: comments.length,
    totalReplies: comments.filter(c => c.parentId).length,
    totalLikes: comments.reduce((sum, c) => sum + c.likesCount, 0),
    maxDepth: Math.max(...comments.map(c => c.threadDepth), 0),
    topContributors: [] as Array<{ author: string; count: number; likes: number }>
  };

  // Calculate top contributors
  const contributorMap = new Map<string, { count: number; likes: number }>();
  
  comments.forEach(comment => {
    const existing = contributorMap.get(comment.author) || { count: 0, likes: 0 };
    contributorMap.set(comment.author, {
      count: existing.count + 1,
      likes: existing.likes + comment.likesCount
    });
  });

  stats.topContributors = Array.from(contributorMap.entries())
    .map(([author, data]) => ({ author, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return stats;
}

/**
 * Generate permalink for comment
 */
export function getCommentPermalink(postId: string, commentId: string): string {
  return `${window.location.origin}/posts/${postId}#comment-${commentId}`;
}

/**
 * Parse mentions from comment content
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Format comment content with mentions highlighted
 */
export function formatCommentContent(content: string, onMentionClick?: (username: string) => void): React.ReactNode {
  if (!content) return null;

  const parts = content.split(/(@\w+)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <span
          key={index}
          className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
          onClick={() => onMentionClick?.(username)}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * Check if comment thread should be paginated
 */
export function shouldPaginateThread(repliesCount: number, maxVisible = 5): boolean {
  return repliesCount > maxVisible;
}

/**
 * Get visible replies with pagination
 */
export function getVisibleReplies(replies: Comment[], page = 1, pageSize = 5) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    items: replies.slice(start, end),
    hasMore: end < replies.length,
    totalPages: Math.ceil(replies.length / pageSize),
    currentPage: page
  };
}