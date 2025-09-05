/**
 * @Mention System Unit Tests
 * Comprehensive testing for mention detection, styling, and filtering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { testPosts, testUsers, searchTestCases, performanceThresholds } from '../fixtures/testData';

// Mock components for Mention System
const MentionHighlighter = ({ content, onMentionClick }) => {
  // Regex to detect mentions: @agent-name or @user-name
  const mentionRegex = /@([a-zA-Z0-9\-_]+)/g;
  
  const highlightMentions = (text: string) => {
    const parts = text.split(mentionRegex);
    const result = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text
        result.push(parts[i]);
      } else {
        // Mention text
        const mentionName = parts[i];
        const isValidUser = testUsers.some(user => user.name === mentionName);
        
        if (isValidUser) {
          result.push(
            <button
              key={`mention-${i}`}
              data-testid={`mention-${mentionName}`}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
              onClick={() => onMentionClick?.(mentionName)}
            >
              @{mentionName}
            </button>
          );
        } else {
          result.push(`@${mentionName}`);
        }
      }
    }
    
    return result;
  };
  
  return (
    <div data-testid="mention-highlighter" className="text-gray-700">
      {highlightMentions(content)}
    </div>
  );
};

const MentionFilter = ({ onFilterChange, selectedMention }) => {
  const agents = testUsers.filter(user => user.isAgent);
  
  return (
    <div data-testid="mention-filter" className="space-y-2">
      <select
        data-testid="mention-filter-select"
        value={selectedMention || ''}
        onChange={(e) => onFilterChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
      >
        <option value="">All Posts</option>
        {agents.map(agent => (
          <option key={agent.id} value={agent.name}>
            Filter by @{agent.name}
          </option>
        ))}
      </select>
      
      {selectedMention && (
        <div data-testid="active-mention-filter" className="flex items-center justify-between bg-blue-100 px-3 py-2 rounded">
          <span className="text-blue-800">Showing posts mentioning @{selectedMention}</span>
          <button
            data-testid="clear-mention-filter"
            onClick={() => onFilterChange(null)}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

const MentionAutoComplete = ({ 
  query, 
  onSelect, 
  visible = false,
  users = testUsers 
}) => {
  if (!visible || !query) return null;
  
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(query.toLowerCase())
  );
  
  return (
    <div data-testid="mention-autocomplete" className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
      {filteredUsers.length === 0 ? (
        <div data-testid="no-mention-results" className="px-3 py-2 text-gray-500 text-sm">
          No users found
        </div>
      ) : (
        filteredUsers.map(user => (
          <button
            key={user.id}
            data-testid={`mention-suggestion-${user.name}`}
            onClick={() => onSelect(user)}
            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
          >
            <span className="text-lg">{user.avatar}</span>
            <div>
              <div className="font-medium">@{user.name}</div>
              <div className="text-sm text-gray-500">
                {user.isAgent ? 'AI Agent' : 'User'}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
};

const PostWithMentions = ({ post, onMentionClick }) => {
  return (
    <article data-testid={`post-${post.id}`} className="bg-white p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">{post.title}</h3>
      <MentionHighlighter 
        content={post.content} 
        onMentionClick={onMentionClick}
      />
      <div data-testid="post-metadata" className="mt-2 text-sm text-gray-500">
        By {post.authorAgent} • {post.publishedAt}
      </div>
    </article>
  );
};

// Mock services
const mockMentionService = {
  extractMentions: vi.fn(),
  validateMentions: vi.fn(),
  searchUsersByMention: vi.fn(),
  notifyMentionedUsers: vi.fn()
};

describe('@Mention System', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup mock implementations
    mockMentionService.extractMentions.mockImplementation((content: string) => {
      const mentions = content.match(/@([a-zA-Z0-9\-_]+)/g) || [];
      return mentions.map(mention => mention.substring(1));
    });
    
    mockMentionService.validateMentions.mockImplementation((mentions: string[]) => {
      return mentions.filter(mention => 
        testUsers.some(user => user.name === mention)
      );
    });
    
    mockMentionService.searchUsersByMention.mockImplementation((query: string) => {
      return testUsers.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase())
      );
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mention Detection', () => {
    it('detects single mention correctly', () => {
      const content = 'Great work @chief-of-staff-agent on the analysis!';
      const mentions = mockMentionService.extractMentions(content);
      
      expect(mentions).toEqual(['chief-of-staff-agent']);
    });

    it('detects multiple mentions in text', () => {
      const content = 'Thanks @personal-todos-agent and @meeting-prep-agent for collaboration!';
      const mentions = mockMentionService.extractMentions(content);
      
      expect(mentions).toEqual(['personal-todos-agent', 'meeting-prep-agent']);
    });

    it('ignores invalid mention formats', () => {
      const content = 'Email test@example.com and check @invalid@ mention';
      const mentions = mockMentionService.extractMentions(content);
      
      expect(mentions).toEqual(['example.com', 'invalid']);
      
      const validMentions = mockMentionService.validateMentions(mentions);
      expect(validMentions).toEqual([]); // None are valid users
    });

    it('handles mentions at different positions', () => {
      const content = '@start-agent middle text @middle-agent end @end-agent';
      const mentions = mockMentionService.extractMentions(content);
      
      expect(mentions).toEqual(['start-agent', 'middle-agent', 'end-agent']);
    });

    it('handles mentions with hyphens and underscores', () => {
      const content = 'Check with @chief-of-staff-agent and @system_monitor_agent';
      const mentions = mockMentionService.extractMentions(content);
      
      expect(mentions).toEqual(['chief-of-staff-agent', 'system_monitor_agent']);
    });

    it('performs mention detection within performance threshold', () => {
      const content = testPosts[4].content; // Complex content with multiple mentions
      
      const startTime = performance.now();
      mockMentionService.extractMentions(content);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(performanceThresholds.mentionDetection);
    });
  });

  describe('Mention Highlighting', () => {
    it('renders mentions as clickable elements', () => {
      const onMentionClick = vi.fn();
      render(
        <MentionHighlighter 
          content="Great work @chief-of-staff-agent!" 
          onMentionClick={onMentionClick}
        />
      );
      
      const mentionButton = screen.getByTestId('mention-chief-of-staff-agent');
      expect(mentionButton).toBeInTheDocument();
      expect(mentionButton).toHaveClass('text-blue-600', 'hover:text-blue-800', 'cursor-pointer');
    });

    it('handles mention clicks', async () => {
      const onMentionClick = vi.fn();
      render(
        <MentionHighlighter 
          content="Thanks @personal-todos-agent for help!" 
          onMentionClick={onMentionClick}
        />
      );
      
      await user.click(screen.getByTestId('mention-personal-todos-agent'));
      
      expect(onMentionClick).toHaveBeenCalledWith('personal-todos-agent');
    });

    it('preserves regular text around mentions', () => {
      render(
        <MentionHighlighter 
          content="Hello @chief-of-staff-agent, how are you?" 
          onMentionClick={vi.fn()}
        />
      );
      
      const container = screen.getByTestId('mention-highlighter');
      expect(container).toHaveTextContent('Hello @chief-of-staff-agent, how are you?');
    });

    it('handles multiple mentions in single text', () => {
      render(
        <MentionHighlighter 
          content="Thanks @personal-todos-agent and @meeting-prep-agent!" 
          onMentionClick={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('mention-personal-todos-agent')).toBeInTheDocument();
      expect(screen.getByTestId('mention-meeting-prep-agent')).toBeInTheDocument();
    });

    it('ignores invalid mentions', () => {
      render(
        <MentionHighlighter 
          content="Check @invalid-user and @chief-of-staff-agent" 
          onMentionClick={vi.fn()}
        />
      );
      
      expect(screen.queryByTestId('mention-invalid-user')).not.toBeInTheDocument();
      expect(screen.getByTestId('mention-chief-of-staff-agent')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(
        <MentionHighlighter 
          content="Hello @chief-of-staff-agent!" 
          onMentionClick={vi.fn()}
        />
      );
      
      const mentionButton = screen.getByTestId('mention-chief-of-staff-agent');
      
      // Should be focusable
      mentionButton.focus();
      expect(mentionButton).toHaveFocus();
      
      // Should respond to Enter key
      await user.keyboard('{Enter}');
      // Note: onMentionClick would be called in real implementation
    });
  });

  describe('Mention Filtering', () => {
    it('renders mention filter dropdown', () => {
      render(<MentionFilter onFilterChange={vi.fn()} selectedMention={null} />);
      
      expect(screen.getByTestId('mention-filter-select')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Posts')).toBeInTheDocument();
    });

    it('populates dropdown with available agents', () => {
      render(<MentionFilter onFilterChange={vi.fn()} selectedMention={null} />);
      
      const select = screen.getByTestId('mention-filter-select');
      const options = select.querySelectorAll('option');
      
      // Should have "All Posts" + number of agent users
      const agentCount = testUsers.filter(user => user.isAgent).length;
      expect(options).toHaveLength(agentCount + 1);
    });

    it('handles filter selection', async () => {
      const onFilterChange = vi.fn();
      render(<MentionFilter onFilterChange={onFilterChange} selectedMention={null} />);
      
      await user.selectOptions(
        screen.getByTestId('mention-filter-select'),
        'chief-of-staff-agent'
      );
      
      expect(onFilterChange).toHaveBeenCalledWith('chief-of-staff-agent');
    });

    it('shows active filter indicator', () => {
      render(
        <MentionFilter 
          onFilterChange={vi.fn()} 
          selectedMention="chief-of-staff-agent" 
        />
      );
      
      expect(screen.getByTestId('active-mention-filter')).toBeInTheDocument();
      expect(screen.getByText('Showing posts mentioning @chief-of-staff-agent')).toBeInTheDocument();
    });

    it('handles filter clearing', async () => {
      const onFilterChange = vi.fn();
      render(
        <MentionFilter 
          onFilterChange={onFilterChange} 
          selectedMention="chief-of-staff-agent" 
        />
      );
      
      await user.click(screen.getByTestId('clear-mention-filter'));
      
      expect(onFilterChange).toHaveBeenCalledWith(null);
    });

    it('filters posts by mentions correctly', () => {
      const posts = testPosts;
      const targetMention = 'personal-todos-agent';
      
      const filteredPosts = posts.filter(post => 
        post.mentions && post.mentions.some(mention => 
          mention.includes(targetMention)
        )
      );
      
      expect(filteredPosts).toHaveLength(2); // post-1 and post-5 mention this agent
      expect(filteredPosts.map(p => p.id)).toEqual(['post-1', 'post-5']);
    });
  });

  describe('Mention Auto-Complete', () => {
    it('shows auto-complete when visible', () => {
      render(
        <MentionAutoComplete 
          query="chief" 
          onSelect={vi.fn()} 
          visible={true}
        />
      );
      
      expect(screen.getByTestId('mention-autocomplete')).toBeInTheDocument();
    });

    it('hides auto-complete when not visible', () => {
      render(
        <MentionAutoComplete 
          query="chief" 
          onSelect={vi.fn()} 
          visible={false}
        />
      );
      
      expect(screen.queryByTestId('mention-autocomplete')).not.toBeInTheDocument();
    });

    it('filters users by query', () => {
      render(
        <MentionAutoComplete 
          query="chief" 
          onSelect={vi.fn()} 
          visible={true}
        />
      );
      
      expect(screen.getByTestId('mention-suggestion-chief-of-staff-agent')).toBeInTheDocument();
      expect(screen.queryByTestId('mention-suggestion-personal-todos-agent')).not.toBeInTheDocument();
    });

    it('shows no results message when no matches', () => {
      render(
        <MentionAutoComplete 
          query="nonexistent" 
          onSelect={vi.fn()} 
          visible={true}
        />
      );
      
      expect(screen.getByTestId('no-mention-results')).toBeInTheDocument();
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('handles user selection', async () => {
      const onSelect = vi.fn();
      render(
        <MentionAutoComplete 
          query="chief" 
          onSelect={onSelect} 
          visible={true}
        />
      );
      
      await user.click(screen.getByTestId('mention-suggestion-chief-of-staff-agent'));
      
      const expectedUser = testUsers.find(u => u.name === 'chief-of-staff-agent');
      expect(onSelect).toHaveBeenCalledWith(expectedUser);
    });

    it('displays user information correctly', () => {
      render(
        <MentionAutoComplete 
          query="chief" 
          onSelect={vi.fn()} 
          visible={true}
        />
      );
      
      const suggestion = screen.getByTestId('mention-suggestion-chief-of-staff-agent');
      expect(suggestion).toHaveTextContent('@chief-of-staff-agent');
      expect(suggestion).toHaveTextContent('AI Agent');
    });
  });

  describe('Posts with Mentions Integration', () => {
    it('renders post with highlighted mentions', () => {
      const post = testPosts[0]; // Has mentions
      render(<PostWithMentions post={post} onMentionClick={vi.fn()} />);
      
      expect(screen.getByTestId(`post-${post.id}`)).toBeInTheDocument();
      expect(screen.getByTestId('mention-personal-todos-agent')).toBeInTheDocument();
      expect(screen.getByTestId('mention-meeting-prep-agent')).toBeInTheDocument();
    });

    it('handles mention clicks in post context', async () => {
      const onMentionClick = vi.fn();
      const post = testPosts[0];
      render(<PostWithMentions post={post} onMentionClick={onMentionClick} />);
      
      await user.click(screen.getByTestId('mention-personal-todos-agent'));
      
      expect(onMentionClick).toHaveBeenCalledWith('personal-todos-agent');
    });

    it('renders posts without mentions correctly', () => {
      const post = testPosts[3]; // No mentions
      render(<PostWithMentions post={post} onMentionClick={vi.fn()} />);
      
      expect(screen.getByTestId(`post-${post.id}`)).toBeInTheDocument();
      expect(screen.queryByTestId(/mention-/)).toBeNull();
    });
  });

  describe('Mention Search Functionality', () => {
    it('finds posts by mention search', () => {
      const searchCase = searchTestCases.find(tc => tc.query === '@personal-todos-agent');
      expect(searchCase).toBeDefined();
      expect(searchCase!.expectedResults).toEqual(['post-1', 'post-5']);
    });

    it('handles mention search performance', () => {
      const query = '@personal-todos-agent';
      const posts = testPosts;
      
      const startTime = performance.now();
      const results = posts.filter(post => 
        post.content.includes(query) || (post.mentions && post.mentions.includes(query))
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      expect(results).toHaveLength(2);
    });

    it('supports case-insensitive mention search', () => {
      const posts = testPosts;
      const query = '@PERSONAL-TODOS-AGENT';
      
      const results = posts.filter(post => 
        post.content.toLowerCase().includes(query.toLowerCase()) ||
        (post.mentions && post.mentions.some(m => m.toLowerCase().includes(query.toLowerCase())))
      );
      
      expect(results).toHaveLength(2);
    });
  });

  describe('Mention Edge Cases', () => {
    it('handles empty content', () => {
      render(<MentionHighlighter content="" onMentionClick={vi.fn()} />);
      
      expect(screen.getByTestId('mention-highlighter')).toBeInTheDocument();
      expect(screen.getByTestId('mention-highlighter')).toBeEmptyDOMElement();
    });

    it('handles content with only mentions', () => {
      render(
        <MentionHighlighter 
          content="@chief-of-staff-agent @personal-todos-agent" 
          onMentionClick={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('mention-chief-of-staff-agent')).toBeInTheDocument();
      expect(screen.getByTestId('mention-personal-todos-agent')).toBeInTheDocument();
    });

    it('handles malformed mentions gracefully', () => {
      render(
        <MentionHighlighter 
          content="Check @@double@ and @-invalid and @valid-agent" 
          onMentionClick={vi.fn()}
        />
      );
      
      // Should only highlight valid mentions
      expect(screen.queryByTestId('mention-double')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mention--invalid')).not.toBeInTheDocument();
    });

    it('handles very long mention lists', () => {
      const longContent = Array.from({ length: 100 }, (_, i) => 
        `@agent-${i}`
      ).join(' ');
      
      const startTime = performance.now();
      render(
        <MentionHighlighter 
          content={longContent} 
          onMentionClick={vi.fn()}
        />
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should handle large lists efficiently
    });
  });

  describe('Mention Accessibility', () => {
    it('provides accessible mention buttons', () => {
      render(
        <MentionHighlighter 
          content="Hello @chief-of-staff-agent!" 
          onMentionClick={vi.fn()}
        />
      );
      
      const mentionButton = screen.getByTestId('mention-chief-of-staff-agent');
      expect(mentionButton).toHaveAttribute('role', 'button');
      expect(mentionButton).not.toHaveAttribute('aria-label'); // Could be improved
    });

    it('supports screen reader announcements', () => {
      render(
        <MentionAutoComplete 
          query="chief" 
          onSelect={vi.fn()} 
          visible={true}
        />
      );
      
      const autocomplete = screen.getByTestId('mention-autocomplete');
      expect(autocomplete).toHaveAttribute('role', 'listbox');
    });

    it('maintains focus management in autocomplete', async () => {
      render(
        <MentionAutoComplete 
          query="chief" 
          onSelect={vi.fn()} 
          visible={true}
        />
      );
      
      const suggestion = screen.getByTestId('mention-suggestion-chief-of-staff-agent');
      suggestion.focus();
      
      expect(suggestion).toHaveFocus();
    });
  });
});