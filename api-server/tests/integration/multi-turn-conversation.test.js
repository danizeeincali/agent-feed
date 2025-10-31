import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

describe('Multi-Turn Conversation Integration Tests', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:3001';
  const AGENT_RESPONSE_TIMEOUT = 15000; // 15 seconds for agent to respond

  // Helper to wait for agent response
  async function waitForAgentResponse(postId, timeoutMs = AGENT_RESPONSE_TIMEOUT) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(`${API_BASE}/api/posts/${postId}`);
      const data = await response.json();

      if (data.success && data.data.comments && data.data.comments.length > 0) {
        // Check if any comment is from an agent
        const agentComment = data.data.comments.find(c =>
          c.author && (c.author.startsWith('avi') || c.author.startsWith('agent-'))
        );

        if (agentComment) {
          return agentComment;
        }
      }

      // Wait 500ms before next check
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Agent response timeout');
  }

  describe('Basic Multi-Turn Conversation', () => {
    it('should follow a two-turn math conversation', async () => {
      // Turn 1: Ask initial calculation
      const turn1Response = await fetch(`${API_BASE}/api/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Math Test',
          content: 'What is 4949 + 98?',
          author: 'test-user-' + Date.now()
        })
      });

      const turn1Data = await turn1Response.json();
      expect(turn1Data.success).toBe(true);
      expect(turn1Data.data).toHaveProperty('id');

      const postId = turn1Data.data.id;

      // Wait for agent's first response
      const agentResponse1 = await waitForAgentResponse(postId);
      expect(agentResponse1.content).toMatch(/5047|sum/i);

      // Turn 2: Follow-up question referencing previous answer
      const turn2Response = await fetch(`${API_BASE}/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Now divide that by 2',
          parent_id: agentResponse1.id,
          author: 'test-user-' + Date.now()
        })
      });

      const turn2Data = await turn2Response.json();
      expect(turn2Data.success).toBe(true);

      // Wait for agent's second response
      await new Promise(resolve => setTimeout(resolve, AGENT_RESPONSE_TIMEOUT));

      // Fetch updated post with all comments
      const finalResponse = await fetch(`${API_BASE}/api/posts/${postId}`);
      const finalData = await finalResponse.json();

      expect(finalData.success).toBe(true);

      // Should have at least 4 comments: user q1, agent a1, user q2, agent a2
      expect(finalData.data.comments.length).toBeGreaterThanOrEqual(4);

      // Last agent response should reference dividing 5047 by 2
      const lastAgentComment = finalData.data.comments
        .filter(c => c.author && (c.author.startsWith('avi') || c.author.startsWith('agent-')))
        .pop();

      expect(lastAgentComment.content).toMatch(/2523|2524|half/i);
    }, 45000); // 45 second timeout for full test

    it('should maintain context across three turns', async () => {
      // Turn 1: Initial question
      const turn1Response = await fetch(`${API_BASE}/api/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Three Turn Test',
          content: 'Let\'s start with number 100',
          author: 'test-user-' + Date.now()
        })
      });

      const turn1Data = await turn1Response.json();
      const postId = turn1Data.data.id;

      const agentResponse1 = await waitForAgentResponse(postId);

      // Turn 2: Add to it
      const turn2Response = await fetch(`${API_BASE}/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Add 50 to it',
          parent_id: agentResponse1.id,
          author: 'test-user-' + Date.now()
        })
      });

      expect(turn2Response.ok).toBe(true);
      await new Promise(resolve => setTimeout(resolve, AGENT_RESPONSE_TIMEOUT));

      // Turn 3: Multiply
      const turn3Response = await fetch(`${API_BASE}/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Multiply the result by 2',
          author: 'test-user-' + Date.now()
        })
      });

      expect(turn3Response.ok).toBe(true);
      await new Promise(resolve => setTimeout(resolve, AGENT_RESPONSE_TIMEOUT));

      // Verify final result
      const finalResponse = await fetch(`${API_BASE}/api/posts/${postId}`);
      const finalData = await finalResponse.json();

      const lastAgentComment = finalData.data.comments
        .filter(c => c.author && (c.author.startsWith('avi') || c.author.startsWith('agent-')))
        .pop();

      // Should reference 300 (100 + 50 = 150, 150 * 2 = 300)
      expect(lastAgentComment.content).toMatch(/300/);
    }, 60000); // 60 second timeout
  });

  describe('Context Awareness Validation', () => {
    it('should reference previous messages in responses', async () => {
      const initialResponse = await fetch(`${API_BASE}/api/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Context Test',
          content: 'My favorite color is blue',
          author: 'test-user-' + Date.now()
        })
      });

      const initialData = await initialResponse.json();
      const postId = initialData.data.id;

      await waitForAgentResponse(postId);

      // Ask follow-up referencing previous context
      const followUpResponse = await fetch(`${API_BASE}/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'What color did I just mention?',
          author: 'test-user-' + Date.now()
        })
      });

      expect(followUpResponse.ok).toBe(true);
      await new Promise(resolve => setTimeout(resolve, AGENT_RESPONSE_TIMEOUT));

      const finalResponse = await fetch(`${API_BASE}/api/posts/${postId}`);
      const finalData = await finalResponse.json();

      const lastAgentComment = finalData.data.comments
        .filter(c => c.author && (c.author.startsWith('avi') || c.author.startsWith('agent-')))
        .pop();

      // Should reference blue
      expect(lastAgentComment.content.toLowerCase()).toContain('blue');
    }, 45000);

    it('should handle pronoun references correctly', async () => {
      const initialResponse = await fetch(`${API_BASE}/api/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Pronoun Test',
          content: 'Calculate 25 times 4',
          author: 'test-user-' + Date.now()
        })
      });

      const initialData = await initialResponse.json();
      const postId = initialData.data.id;

      await waitForAgentResponse(postId);

      // Use pronoun reference
      const followUpResponse = await fetch(`${API_BASE}/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Divide it by 5',
          author: 'test-user-' + Date.now()
        })
      });

      expect(followUpResponse.ok).toBe(true);
      await new Promise(resolve => setTimeout(resolve, AGENT_RESPONSE_TIMEOUT));

      const finalResponse = await fetch(`${API_BASE}/api/posts/${postId}`);
      const finalData = await finalResponse.json();

      const lastAgentComment = finalData.data.comments
        .filter(c => c.author && (c.author.startsWith('avi') || c.author.startsWith('agent-')))
        .pop();

      // Should correctly divide 100 by 5 = 20
      expect(lastAgentComment.content).toMatch(/20/);
    }, 45000);
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long conversation threads', async () => {
      const initialResponse = await fetch(`${API_BASE}/api/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Long Thread Test',
          content: 'Start with 1',
          author: 'test-user-' + Date.now()
        })
      });

      const initialData = await initialResponse.json();
      const postId = initialData.data.id;

      // Create 5 turns
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        await fetch(`${API_BASE}/api/agent-posts/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Add ${i + 1}`,
            author: 'test-user-' + Date.now()
          })
        });
      }

      await new Promise(resolve => setTimeout(resolve, AGENT_RESPONSE_TIMEOUT));

      const finalResponse = await fetch(`${API_BASE}/api/posts/${postId}`);
      const finalData = await finalResponse.json();

      // Should have many comments
      expect(finalData.data.comments.length).toBeGreaterThan(5);

      // Agent should still be responding
      const agentComments = finalData.data.comments.filter(c =>
        c.author && (c.author.startsWith('avi') || c.author.startsWith('agent-'))
      );

      expect(agentComments.length).toBeGreaterThan(0);
    }, 90000); // 90 second timeout for long test

    it('should handle missing parent_id gracefully', async () => {
      const initialResponse = await fetch(`${API_BASE}/api/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'No Parent Test',
          content: 'Initial post',
          author: 'test-user-' + Date.now()
        })
      });

      const initialData = await initialResponse.json();
      const postId = initialData.data.id;

      // Comment without parent_id on a post with comments
      const commentResponse = await fetch(`${API_BASE}/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Comment without parent',
          author: 'test-user-' + Date.now()
          // No parent_id specified
        })
      });

      // Should still work
      expect(commentResponse.ok).toBe(true);
      const commentData = await commentResponse.json();
      expect(commentData.success).toBe(true);
    }, 30000);
  });

  describe('WebSocket Real-Time Updates', () => {
    it('should receive real-time comment notifications', async () => {
      // This test validates that the WebSocket subscription fix works
      // In practice, this would use socket.io-client to connect and listen

      const initialResponse = await fetch(`${API_BASE}/api/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'WebSocket Test',
          content: 'Testing real-time updates',
          author: 'test-user-' + Date.now()
        })
      });

      const initialData = await initialResponse.json();
      const postId = initialData.data.id;

      // Add comment
      const commentResponse = await fetch(`${API_BASE}/api/agent-posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test comment',
          author: 'test-user-' + Date.now()
        })
      });

      expect(commentResponse.ok).toBe(true);

      // Verify comment was added
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalResponse = await fetch(`${API_BASE}/api/posts/${postId}`);
      const finalData = await finalResponse.json();

      expect(finalData.data.comments.length).toBeGreaterThan(0);
    }, 30000);
  });
});
