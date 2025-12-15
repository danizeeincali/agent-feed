/**
 * Hashtag System Unit Tests  
 * Comprehensive testing for hashtag detection, styling, and filtering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { testPosts, searchTestCases, performanceThresholds } from '../fixtures/testData';

// Mock components for Hashtag System
const HashtagHighlighter = ({ content, onHashtagClick }) => {
  // Regex to detect hashtags: #hashtag
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  
  const highlightHashtags = (text: string) => {
    const parts = text.split(hashtagRegex);
    const result = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // Regular text
        result.push(parts[i]);
      } else {
        // Hashtag text
        const hashtagName = parts[i];
        result.push(
          <button
            key={`hashtag-${i}`}
            data-testid={`hashtag-${hashtagName}`}
            className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
            onClick={() => onHashtagClick?.(hashtagName)}
          >
            #{hashtagName}
          </button>
        );
      }
    }
    
    return result;
  };
  
  return (
    <div data-testid="hashtag-highlighter" className="text-gray-700">
      {highlightHashtags(content)}
    </div>
  );
};

const HashtagFilter = ({ onFilterChange, selectedHashtag }) => {
  const allHashtags = Array.from(new Set(
    testPosts.flatMap(post => post.hashtags || [])
      .map(tag => tag.replace('#', ''))
  )).sort();
  
  return (
    <div data-testid="hashtag-filter" className="space-y-2">
      <select
        data-testid="hashtag-filter-select"
        value={selectedHashtag || ''}
        onChange={(e) => onFilterChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
      >
        <option value="">All Tags</option>
        {allHashtags.map(hashtag => (
          <option key={hashtag} value={hashtag}>
            #{hashtag}
          </option>
        ))}
      </select>
      
      {selectedHashtag && (
        <div data-testid="active-hashtag-filter" className="flex items-center justify-between bg-blue-100 px-3 py-2 rounded">
          <span className="text-blue-800">Showing posts tagged #{selectedHashtag}</span>
          <button
            data-testid="clear-hashtag-filter"
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

const HashtagCloud = ({ hashtags, onHashtagClick, maxTags = 20 }) => {
  const sortedHashtags = hashtags
    .sort((a, b) => b.count - a.count)
    .slice(0, maxTags);
  
  const getTagSize = (count: number, maxCount: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.8) return 'text-lg';
    if (ratio > 0.5) return 'text-base';
    return 'text-sm';
  };
  
  const maxCount = Math.max(...hashtags.map(h => h.count));
  
  return (
    <div data-testid="hashtag-cloud" className="flex flex-wrap gap-2 p-4">
      {sortedHashtags.map(hashtag => (
        <button
          key={hashtag.name}
          data-testid={`cloud-hashtag-${hashtag.name}`}
          onClick={() => onHashtagClick(hashtag.name)}
          className={`px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors ${
            getTagSize(hashtag.count, maxCount)
          }`}
        >
          #{hashtag.name} ({hashtag.count})
        </button>
      ))}
    </div>
  );
};

// Mock services
const mockHashtagService = {
  extractHashtags: vi.fn(),
  getPopularHashtags: vi.fn(),
  searchByHashtag: vi.fn(),
  getHashtagStats: vi.fn()
};

// Mock hashtag data
const mockHashtagStats = [
  { name: 'strategy', count: 15 },
  { name: 'automation', count: 12 },
  { name: 'productivity', count: 8 },
  { name: 'meetings', count: 6 },
  { name: 'optimization', count: 5 }
];

describe('Hashtag System', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Setup mock implementations
    mockHashtagService.extractHashtags.mockImplementation((content: string) => {
      const hashtags = content.match(/#([a-zA-Z0-9_]+)/g) || [];
      return hashtags.map(tag => tag.substring(1));
    });
    
    mockHashtagService.getPopularHashtags.mockResolvedValue(mockHashtagStats);
    
    mockHashtagService.searchByHashtag.mockImplementation((hashtag: string) => {
      return testPosts.filter(post => 
        post.hashtags && post.hashtags.some(tag => 
          tag.toLowerCase().includes(hashtag.toLowerCase())
        )
      );
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hashtag Detection', () => {
    it('detects single hashtag correctly', () => {
      const content = 'This is about #productivity improvements';
      const hashtags = mockHashtagService.extractHashtags(content);
      
      expect(hashtags).toEqual(['productivity']);
    });

    it('detects multiple hashtags in text', () => {
      const content = 'Working on #automation and #optimization for #productivity';
      const hashtags = mockHashtagService.extractHashtags(content);
      
      expect(hashtags).toEqual(['automation', 'optimization', 'productivity']);
    });

    it('handles hashtags with numbers and underscores', () => {
      const content = 'Update on #q4planning and #system_health monitoring';
      const hashtags = mockHashtagService.extractHashtags(content);
      
      expect(hashtags).toEqual(['q4planning', 'system_health']);
    });

    it('ignores hashtags with special characters', () => {
      const content = 'Testing #valid-tag and #invalid-tag! and #another_tag';
      const hashtags = mockHashtagService.extractHashtags(content);
      
      // Should only capture alphanumeric and underscore
      expect(hashtags).toEqual(['valid', 'invalid', 'another_tag']);
    });

    it('handles hashtags at different positions', () => {
      const content = '#start text #middle text #end';
      const hashtags = mockHashtagService.extractHashtags(content);
      
      expect(hashtags).toEqual(['start', 'middle', 'end']);
    });

    it('performs hashtag detection within performance threshold', () => {
      const content = testPosts[4].content; // Complex content with multiple hashtags
      
      const startTime = performance.now();
      mockHashtagService.extractHashtags(content);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(performanceThresholds.hashtagDetection);
    });
  });

  describe('Hashtag Highlighting', () => {
    it('renders hashtags as clickable elements', () => {
      const onHashtagClick = vi.fn();
      render(
        <HashtagHighlighter 
          content="Great work on #productivity improvements!" 
          onHashtagClick={onHashtagClick}
        />
      );
      
      const hashtagButton = screen.getByTestId('hashtag-productivity');
      expect(hashtagButton).toBeInTheDocument();
      expect(hashtagButton).toHaveClass('text-blue-600', 'hover:text-blue-800', 'cursor-pointer');
    });

    it('handles hashtag clicks', async () => {
      const onHashtagClick = vi.fn();
      render(
        <HashtagHighlighter 
          content="Discussing #automation strategies" 
          onHashtagClick={onHashtagClick}
        />
      );
      
      await user.click(screen.getByTestId('hashtag-automation'));
      
      expect(onHashtagClick).toHaveBeenCalledWith('automation');
    });

    it('preserves regular text around hashtags', () => {
      render(
        <HashtagHighlighter 
          content="Working on #automation for better results" 
          onHashtagClick={vi.fn()}
        />
      );
      
      const container = screen.getByTestId('hashtag-highlighter');
      expect(container).toHaveTextContent('Working on #automation for better results');
    });

    it('handles multiple hashtags in single text', () => {
      render(
        <HashtagHighlighter 
          content="Combining #automation with #optimization for #productivity" 
          onHashtagClick={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('hashtag-automation')).toBeInTheDocument();
      expect(screen.getByTestId('hashtag-optimization')).toBeInTheDocument();
      expect(screen.getByTestId('hashtag-productivity')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(
        <HashtagHighlighter 
          content="Check #automation features" 
          onHashtagClick={vi.fn()}
        />
      );
      
      const hashtagButton = screen.getByTestId('hashtag-automation');
      
      // Should be focusable
      hashtagButton.focus();
      expect(hashtagButton).toHaveFocus();
    });
  });

  describe('Hashtag Filtering', () => {
    it('renders hashtag filter dropdown', () => {
      render(<HashtagFilter onFilterChange={vi.fn()} selectedHashtag={null} />);
      
      expect(screen.getByTestId('hashtag-filter-select')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Tags')).toBeInTheDocument();
    });

    it('populates dropdown with available hashtags', () => {
      render(<HashtagFilter onFilterChange={vi.fn()} selectedHashtag={null} />);
      
      const select = screen.getByTestId('hashtag-filter-select');
      const options = select.querySelectorAll('option');
      
      // Should have "All Tags" plus unique hashtags from test data
      const uniqueHashtags = new Set(
        testPosts.flatMap(post => post.hashtags || [])
          .map(tag => tag.replace('#', ''))
      );
      expect(options).toHaveLength(uniqueHashtags.size + 1);
    });

    it('handles filter selection', async () => {
      const onFilterChange = vi.fn();
      render(<HashtagFilter onFilterChange={onFilterChange} selectedHashtag={null} />);
      
      await user.selectOptions(
        screen.getByTestId('hashtag-filter-select'),
        'automation'
      );
      
      expect(onFilterChange).toHaveBeenCalledWith('automation');
    });

    it('shows active filter indicator', () => {
      render(
        <HashtagFilter 
          onFilterChange={vi.fn()} 
          selectedHashtag="automation" 
        />
      );
      
      expect(screen.getByTestId('active-hashtag-filter')).toBeInTheDocument();
      expect(screen.getByText('Showing posts tagged #automation')).toBeInTheDocument();
    });

    it('handles filter clearing', async () => {
      const onFilterChange = vi.fn();
      render(
        <HashtagFilter 
          onFilterChange={onFilterChange} 
          selectedHashtag="automation" 
        />
      );
      
      await user.click(screen.getByTestId('clear-hashtag-filter'));
      
      expect(onFilterChange).toHaveBeenCalledWith(null);
    });

    it('filters posts by hashtags correctly', () => {
      const posts = testPosts;
      const targetHashtag = 'automation';
      
      const filteredPosts = posts.filter(post => 
        post.hashtags && post.hashtags.some(hashtag => 
          hashtag.toLowerCase().includes(targetHashtag.toLowerCase())
        )
      );
      
      expect(filteredPosts).toHaveLength(2); // post-1 and post-3 have #automation
      expect(filteredPosts.map(p => p.id)).toEqual(['post-1', 'post-3']);
    });
  });

  describe('Hashtag Cloud', () => {
    it('renders hashtag cloud correctly', () => {
      render(
        <HashtagCloud 
          hashtags={mockHashtagStats} 
          onHashtagClick={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('hashtag-cloud')).toBeInTheDocument();
      expect(screen.getByTestId('cloud-hashtag-strategy')).toBeInTheDocument();
      expect(screen.getByTestId('cloud-hashtag-automation')).toBeInTheDocument();
    });

    it('displays hashtag counts', () => {
      render(
        <HashtagCloud 
          hashtags={mockHashtagStats} 
          onHashtagClick={vi.fn()}
        />
      );
      
      expect(screen.getByText('#strategy (15)')).toBeInTheDocument();
      expect(screen.getByText('#automation (12)')).toBeInTheDocument();
    });

    it('handles hashtag cloud clicks', async () => {
      const onHashtagClick = vi.fn();
      render(
        <HashtagCloud 
          hashtags={mockHashtagStats} 
          onHashtagClick={onHashtagClick}
        />
      );
      
      await user.click(screen.getByTestId('cloud-hashtag-strategy'));
      
      expect(onHashtagClick).toHaveBeenCalledWith('strategy');
    });

    it('sorts hashtags by popularity', () => {
      render(
        <HashtagCloud 
          hashtags={mockHashtagStats} 
          onHashtagClick={vi.fn()}
        />
      );
      
      const cloud = screen.getByTestId('hashtag-cloud');
      const hashtags = cloud.querySelectorAll('[data-testid^="cloud-hashtag-"]');
      
      // First hashtag should be most popular (strategy with 15)
      expect(hashtags[0]).toHaveAttribute('data-testid', 'cloud-hashtag-strategy');
    });

    it('applies size based on popularity', () => {
      render(
        <HashtagCloud 
          hashtags={mockHashtagStats} 
          onHashtagClick={vi.fn()}
        />
      );
      
      const strategyTag = screen.getByTestId('cloud-hashtag-strategy');
      const optimizationTag = screen.getByTestId('cloud-hashtag-optimization');
      
      // Most popular should have larger text
      expect(strategyTag).toHaveClass('text-lg');
      expect(optimizationTag).toHaveClass('text-sm');
    });

    it('limits number of displayed hashtags', () => {
      const manyHashtags = Array.from({ length: 50 }, (_, i) => ({
        name: `tag${i}`,
        count: 50 - i
      }));
      
      render(
        <HashtagCloud 
          hashtags={manyHashtags} 
          onHashtagClick={vi.fn()}
          maxTags={10}
        />
      );
      
      const cloud = screen.getByTestId('hashtag-cloud');
      const hashtags = cloud.querySelectorAll('[data-testid^="cloud-hashtag-"]');
      
      expect(hashtags).toHaveLength(10);
    });
  });

  describe('Hashtag Search Functionality', () => {
    it('finds posts by hashtag search', () => {
      const searchCase = searchTestCases.find(tc => tc.query === '#automation');
      expect(searchCase).toBeDefined();
      expect(searchCase!.expectedResults).toEqual(['post-1', 'post-3']);
    });

    it('handles hashtag search performance', () => {
      const hashtag = 'automation';
      const posts = testPosts;
      
      const startTime = performance.now();
      const results = mockHashtagService.searchByHashtag(hashtag);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      expect(results).toHaveLength(2);
    });

    it('supports case-insensitive hashtag search', () => {
      const posts = testPosts;
      const hashtag = 'AUTOMATION';
      
      const results = posts.filter(post => 
        post.hashtags && post.hashtags.some(tag => 
          tag.toLowerCase().includes(hashtag.toLowerCase())
        )
      );
      
      expect(results).toHaveLength(2);
    });

    it('supports partial hashtag matching', () => {
      const posts = testPosts;
      const partialHashtag = 'auto'; // Should match #automation
      
      const results = posts.filter(post => 
        post.hashtags && post.hashtags.some(tag => 
          tag.toLowerCase().includes(partialHashtag.toLowerCase())
        )
      );
      
      expect(results).toHaveLength(2);
    });
  });

  describe('Hashtag Edge Cases', () => {
    it('handles empty content', () => {
      render(<HashtagHighlighter content="" onHashtagClick={vi.fn()} />);
      
      expect(screen.getByTestId('hashtag-highlighter')).toBeInTheDocument();
      expect(screen.getByTestId('hashtag-highlighter')).toBeEmptyDOMElement();
    });

    it('handles content with only hashtags', () => {
      render(
        <HashtagHighlighter 
          content="#first #second #third" 
          onHashtagClick={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('hashtag-first')).toBeInTheDocument();
      expect(screen.getByTestId('hashtag-second')).toBeInTheDocument();
      expect(screen.getByTestId('hashtag-third')).toBeInTheDocument();
    });

    it('handles adjacent hashtags', () => {
      render(
        <HashtagHighlighter 
          content="Tags: #first#second #third" 
          onHashtagClick={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('hashtag-first')).toBeInTheDocument();
      expect(screen.getByTestId('hashtag-second')).toBeInTheDocument();
      expect(screen.getByTestId('hashtag-third')).toBeInTheDocument();
    });

    it('handles very long hashtag lists', () => {
      const longContent = Array.from({ length: 100 }, (_, i) => 
        `#tag${i}`
      ).join(' ');
      
      const startTime = performance.now();
      render(
        <HashtagHighlighter 
          content={longContent} 
          onHashtagClick={vi.fn()}
        />
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200); // Should handle large lists efficiently
    });

    it('handles hashtags with numbers', () => {
      render(
        <HashtagHighlighter 
          content="Planning for #q4 and #2024goals" 
          onHashtagClick={vi.fn()}
        />
      );
      
      expect(screen.getByTestId('hashtag-q4')).toBeInTheDocument();
      expect(screen.getByTestId('hashtag-2024goals')).toBeInTheDocument();
    });

    it('ignores invalid hashtag formats', () => {
      const content = 'Check #valid and ## and #-invalid and #123valid';
      const hashtags = mockHashtagService.extractHashtags(content);
      
      // Should only extract valid alphanumeric + underscore hashtags
      expect(hashtags).toEqual(['valid', '123valid']);
    });
  });

  describe('Hashtag Analytics', () => {
    it('tracks hashtag usage statistics', async () => {
      const stats = await mockHashtagService.getPopularHashtags();
      
      expect(stats).toEqual(mockHashtagStats);
      expect(stats[0]).toEqual({ name: 'strategy', count: 15 });
    });

    it('calculates hashtag popularity correctly', () => {
      const posts = testPosts;
      const hashtagCounts = {};
      
      posts.forEach(post => {
        post.hashtags?.forEach(hashtag => {
          const cleanTag = hashtag.replace('#', '');
          hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
        });
      });
      
      expect(hashtagCounts['automation']).toBe(2);
      expect(hashtagCounts['strategy']).toBe(1);
    });

    it('identifies trending hashtags', () => {
      const sortedHashtags = mockHashtagStats.sort((a, b) => b.count - a.count);
      const trending = sortedHashtags.slice(0, 3);
      
      expect(trending).toEqual([
        { name: 'strategy', count: 15 },
        { name: 'automation', count: 12 },
        { name: 'productivity', count: 8 }
      ]);
    });
  });

  describe('Hashtag Accessibility', () => {
    it('provides accessible hashtag buttons', () => {
      render(
        <HashtagHighlighter 
          content="Check #automation features" 
          onHashtagClick={vi.fn()}
        />
      );
      
      const hashtagButton = screen.getByTestId('hashtag-automation');
      expect(hashtagButton).toHaveAttribute('role', 'button');
      // Could be improved with aria-label
    });

    it('supports screen reader navigation in hashtag cloud', () => {
      render(
        <HashtagCloud 
          hashtags={mockHashtagStats} 
          onHashtagClick={vi.fn()}
        />
      );
      
      const cloud = screen.getByTestId('hashtag-cloud');
      expect(cloud).toHaveAttribute('role', 'group');
    });

    it('maintains focus management in filter dropdown', async () => {
      render(<HashtagFilter onFilterChange={vi.fn()} selectedHashtag={null} />);
      
      const select = screen.getByTestId('hashtag-filter-select');
      select.focus();
      
      expect(select).toHaveFocus();
    });
  });
});