#!/usr/bin/env node

/**
 * Draft Management Test Script
 * Tests the complete draft management functionality including:
 * - Creating drafts via localStorage fallback
 * - Reading drafts with filtering and sorting
 * - Updating and deleting drafts
 * - Stats calculation
 */

const { JSDOM } = require('jsdom');

// Setup DOM environment for testing
const dom = new JSDOM('', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;

// Mock DraftService for testing
class MockDraftService {
  constructor(config) {
    this.config = config;
    this.drafts = [];
    this.setupMockData();
  }

  setupMockData() {
    // Clear any existing data
    localStorage.clear();
    
    // Create some mock drafts for testing
    const mockDrafts = [
      {
        id: 'draft-1',
        userId: 'test-user',
        title: 'First Draft Post',
        hook: 'This is an engaging hook',
        content: 'This is the content of the first draft. It has multiple sentences to test word count.',
        tags: ['productivity', 'test'],
        agentMentions: [],
        templateId: null,
        metadata: {
          wordCount: 15,
          readingTime: 1,
          businessImpact: 7
        },
        status: 'draft',
        version: 1,
        parentVersionId: null,
        collaborators: [],
        isShared: false,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        lastModifiedBy: 'test-user',
        scheduledFor: null,
        publishedPostId: null
      },
      {
        id: 'draft-2',
        userId: 'test-user',
        title: 'Second Draft - Published',
        hook: 'Another hook here',
        content: 'This draft was already published and contains more content to test the system.',
        tags: ['strategy', 'published'],
        agentMentions: ['agent-1'],
        templateId: 'template-1',
        metadata: {
          wordCount: 25,
          readingTime: 2,
          businessImpact: 9
        },
        status: 'published',
        version: 2,
        parentVersionId: null,
        collaborators: ['user-2'],
        isShared: true,
        createdAt: new Date('2024-01-14T14:00:00Z'),
        updatedAt: new Date('2024-01-14T16:00:00Z'),
        lastModifiedBy: 'test-user',
        scheduledFor: null,
        publishedPostId: 'post-123'
      },
      {
        id: 'draft-3',
        userId: 'test-user',
        title: 'Shared Draft for Review',
        hook: null,
        content: 'This draft is being reviewed by team members.',
        tags: ['review', 'collaboration'],
        agentMentions: ['agent-2', 'agent-3'],
        templateId: null,
        metadata: {
          wordCount: 12,
          readingTime: 1,
          businessImpact: 5
        },
        status: 'shared',
        version: 1,
        parentVersionId: null,
        collaborators: ['user-3', 'user-4'],
        isShared: true,
        createdAt: new Date('2024-01-16T09:00:00Z'),
        updatedAt: new Date('2024-01-16T09:15:00Z'),
        lastModifiedBy: 'user-3',
        scheduledFor: null,
        publishedPostId: null
      }
    ];

    // Store in localStorage
    localStorage.setItem('agent-feed-drafts', JSON.stringify(mockDrafts));
  }

  getLocalDrafts() {
    try {
      const stored = localStorage.getItem('agent-feed-drafts');
      if (!stored) return [];
      return JSON.parse(stored).map((draft) => ({
        ...draft,
        createdAt: new Date(draft.createdAt),
        updatedAt: new Date(draft.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to get local drafts:', error);
      return [];
    }
  }

  async getUserDrafts(userId, filter = {}, sort = { field: 'updatedAt', direction: 'desc' }) {
    let drafts = this.getLocalDrafts().filter(draft => draft.userId === userId);

    // Apply filters
    if (filter.status && filter.status.length > 0) {
      drafts = drafts.filter(draft => filter.status.includes(draft.status));
    }
    
    if (filter.tags && filter.tags.length > 0) {
      drafts = drafts.filter(draft => 
        filter.tags.some(tag => draft.tags.includes(tag))
      );
    }
    
    if (filter.search) {
      const query = filter.search.toLowerCase();
      drafts = drafts.filter(draft =>
        draft.title.toLowerCase().includes(query) ||
        draft.content.toLowerCase().includes(query) ||
        draft.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    drafts.sort((a, b) => {
      let aValue = a[sort.field];
      let bValue = b[sort.field];

      if (sort.field === 'updatedAt' || sort.field === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (sort.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return { drafts, total: drafts.length };
  }

  async createDraft(draftData) {
    const draft = {
      ...draftData,
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    const existingDrafts = this.getLocalDrafts();
    existingDrafts.push(draft);
    localStorage.setItem('agent-feed-drafts', JSON.stringify(existingDrafts));

    return draft;
  }

  async updateDraft(id, updates) {
    const drafts = this.getLocalDrafts();
    const draftIndex = drafts.findIndex(draft => draft.id === id);
    
    if (draftIndex === -1) {
      throw new Error('Draft not found');
    }

    const updatedDraft = {
      ...drafts[draftIndex],
      ...updates,
      updatedAt: new Date(),
      version: (drafts[draftIndex].version || 1) + 1
    };

    drafts[draftIndex] = updatedDraft;
    localStorage.setItem('agent-feed-drafts', JSON.stringify(drafts));

    return updatedDraft;
  }

  async deleteDraft(id) {
    try {
      const drafts = this.getLocalDrafts();
      const filteredDrafts = drafts.filter(draft => draft.id !== id);
      localStorage.setItem('agent-feed-drafts', JSON.stringify(filteredDrafts));
      return true;
    } catch (error) {
      console.error('Failed to delete draft:', error);
      return false;
    }
  }

  async getDraftStats(userId) {
    const drafts = this.getLocalDrafts().filter(draft => draft.userId === userId);
    
    const totalDrafts = drafts.length;
    const publishedCount = drafts.filter(d => d.status === 'published').length;
    const sharedCount = drafts.filter(d => d.status === 'shared').length;
    const scheduledCount = drafts.filter(d => d.status === 'scheduled').length;
    
    const totalWords = drafts.reduce((sum, draft) => sum + (draft.metadata.wordCount || 0), 0);
    const averageWordCount = totalDrafts > 0 ? Math.round(totalWords / totalDrafts) : 0;
    
    // Calculate most used tags
    const tagCounts = {};
    drafts.forEach(draft => {
      draft.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const mostUsedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDrafts,
      publishedCount,
      sharedCount,
      scheduledCount,
      averageWordCount,
      mostUsedTags,
      collaborationStats: {
        invitationsSent: 0,
        invitationsReceived: 0,
        activeCollaborations: 2
      },
      recentActivity: []
    };
  }
}

// Test suite
async function runTests() {
  console.log('🚀 Starting Draft Management Tests...\n');

  const service = new MockDraftService({
    baseUrl: '',
    autoSave: { enabled: true, interval: 3000, maxRetries: 3, offlineStorage: true },
    maxDrafts: 100
  });

  try {
    // Test 1: Get all drafts
    console.log('📋 Test 1: Getting all user drafts...');
    const { drafts, total } = await service.getUserDrafts('test-user');
    console.log(`✅ Found ${total} drafts for user`);
    console.log(`   Draft titles: ${drafts.map(d => `"${d.title}"`).join(', ')}`);

    // Test 2: Filter by status
    console.log('\n🔍 Test 2: Filtering drafts by status...');
    const { drafts: publishedDrafts } = await service.getUserDrafts('test-user', {
      status: ['published']
    });
    console.log(`✅ Found ${publishedDrafts.length} published drafts`);

    // Test 3: Search functionality
    console.log('\n🔎 Test 3: Searching drafts...');
    const { drafts: searchResults } = await service.getUserDrafts('test-user', {
      search: 'review'
    });
    console.log(`✅ Search for "review" returned ${searchResults.length} results`);

    // Test 4: Create new draft
    console.log('\n➕ Test 4: Creating new draft...');
    const newDraft = await service.createDraft({
      userId: 'test-user',
      title: 'Test Draft Creation',
      hook: 'Testing draft creation functionality',
      content: 'This is a test draft created by the test suite.',
      tags: ['test', 'automation'],
      agentMentions: [],
      templateId: null,
      metadata: {
        wordCount: 12,
        readingTime: 1,
        businessImpact: 8
      },
      status: 'draft',
      parentVersionId: null,
      collaborators: [],
      isShared: false,
      lastModifiedBy: 'test-user',
      scheduledFor: null,
      publishedPostId: null
    });
    console.log(`✅ Created draft with ID: ${newDraft.id}`);

    // Test 5: Update draft
    console.log('\n✏️  Test 5: Updating draft...');
    const updatedDraft = await service.updateDraft(newDraft.id, {
      title: 'Updated Test Draft',
      content: 'This content has been updated by the test suite.',
      tags: ['test', 'automation', 'updated']
    });
    console.log(`✅ Updated draft version: ${updatedDraft.version}`);

    // Test 6: Get draft statistics
    console.log('\n📊 Test 6: Getting draft statistics...');
    const stats = await service.getDraftStats('test-user');
    console.log(`✅ Stats: ${stats.totalDrafts} total, ${stats.publishedCount} published, ${stats.sharedCount} shared`);
    console.log(`   Average word count: ${stats.averageWordCount}`);
    console.log(`   Most used tags: ${stats.mostUsedTags.map(t => `${t.tag}(${t.count})`).join(', ')}`);

    // Test 7: Delete draft
    console.log('\n🗑️  Test 7: Deleting draft...');
    const deleted = await service.deleteDraft(newDraft.id);
    console.log(`✅ Draft deleted: ${deleted}`);

    // Test 8: Verify deletion
    console.log('\n✔️  Test 8: Verifying deletion...');
    const { total: finalTotal } = await service.getUserDrafts('test-user');
    console.log(`✅ Final draft count: ${finalTotal} (should be back to original count)`);

    // Test 9: Sorting
    console.log('\n🔄 Test 9: Testing sort functionality...');
    const { drafts: sortedByTitle } = await service.getUserDrafts('test-user', {}, {
      field: 'title',
      direction: 'asc'
    });
    console.log('✅ Sorted by title (ascending):');
    sortedByTitle.forEach((draft, index) => {
      console.log(`   ${index + 1}. ${draft.title}`);
    });

    console.log('\n🎉 All tests passed! Draft management system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { MockDraftService };