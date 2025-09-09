/**
 * URL Detection Service - London School TDD Tests
 * 
 * Tests the core URL detection and validation functionality using mock-driven
 * development. Focuses on behavior verification and object collaborations.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';

// Mock Dependencies (London School - Define contracts through mocks)
interface URLValidator {
  isValidURL(url: string): boolean;
  isAllowedProtocol(url: string): boolean;
  isSafeURL(url: string): boolean;
  validateLength(url: string): boolean;
}

interface URLNormalizer {
  normalizeURL(url: string): string;
  extractDomain(url: string): string;
  cleanQueryParams(url: string, keepParams?: string[]): string;
}

interface SecurityFilter {
  checkForSSRF(url: string): boolean;
  validateHostname(hostname: string): boolean;
  isAllowedDomain(domain: string): boolean;
}

// System Under Test
class URLDetectionService {
  constructor(
    private validator: URLValidator,
    private normalizer: URLNormalizer,
    private securityFilter: SecurityFilter
  ) {}

  detectURLs(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    const matches = content.match(urlRegex) || [];
    
    return matches.filter(url => {
      // Contract: Validate each URL through validator
      if (!this.validator.isValidURL(url)) return false;
      if (!this.validator.isAllowedProtocol(url)) return false;
      if (!this.validator.validateLength(url)) return false;
      if (!this.validator.isSafeURL(url)) return false;
      
      // Contract: Check security through security filter
      if (!this.securityFilter.checkForSSRF(url)) return false;
      
      return true;
    }).map(url => {
      // Contract: Normalize valid URLs
      return this.normalizer.normalizeURL(url);
    });
  }

  extractYouTubeVideoID(url: string): string | null {
    if (!this.validator.isValidURL(url)) return null;
    
    const normalizedURL = this.normalizer.normalizeURL(url);
    const domain = this.normalizer.extractDomain(normalizedURL);
    
    if (!['youtube.com', 'youtu.be', 'm.youtube.com'].includes(domain)) {
      return null;
    }
    
    // Extract video ID based on URL pattern
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = normalizedURL.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }
}

// Test Suite
describe('URLDetectionService - London School TDD', () => {
  let urlDetectionService: URLDetectionService;
  let mockValidator: URLValidator;
  let mockNormalizer: URLNormalizer;
  let mockSecurityFilter: SecurityFilter;

  beforeEach(() => {
    // Create mocks for all collaborators
    mockValidator = {
      isValidURL: vi.fn(),
      isAllowedProtocol: vi.fn(),
      isSafeURL: vi.fn(),
      validateLength: vi.fn()
    };

    mockNormalizer = {
      normalizeURL: vi.fn(),
      extractDomain: vi.fn(),
      cleanQueryParams: vi.fn()
    };

    mockSecurityFilter = {
      checkForSSRF: vi.fn(),
      validateHostname: vi.fn(),
      isAllowedDomain: vi.fn()
    };

    urlDetectionService = new URLDetectionService(
      mockValidator,
      mockNormalizer,
      mockSecurityFilter
    );
  });

  describe('URL Detection Workflow', () => {
    // Contract Test: Service should validate each detected URL
    it('should validate all detected URLs through URLValidator', () => {
      const content = 'Visit https://example.com and https://test.org for info';
      
      // Setup mock expectations
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isAllowedProtocol as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.validateLength as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isSafeURL as MockedFunction<any>).mockReturnValue(true);
      (mockSecurityFilter.checkForSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockNormalizer.normalizeURL as MockedFunction<any>).mockImplementation(url => url.toLowerCase());

      urlDetectionService.detectURLs(content);

      // Verify interactions with validator
      expect(mockValidator.isValidURL).toHaveBeenCalledWith('https://example.com');
      expect(mockValidator.isValidURL).toHaveBeenCalledWith('https://test.org');
      expect(mockValidator.isAllowedProtocol).toHaveBeenCalledTimes(2);
      expect(mockValidator.validateLength).toHaveBeenCalledTimes(2);
      expect(mockValidator.isSafeURL).toHaveBeenCalledTimes(2);
    });

    // Contract Test: Security filter should be consulted for each valid URL
    it('should check security for valid URLs through SecurityFilter', () => {
      const content = 'Check https://example.com';
      
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isAllowedProtocol as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.validateLength as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isSafeURL as MockedFunction<any>).mockReturnValue(true);
      (mockSecurityFilter.checkForSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockNormalizer.normalizeURL as MockedFunction<any>).mockImplementation(url => url);

      urlDetectionService.detectURLs(content);

      expect(mockSecurityFilter.checkForSSRF).toHaveBeenCalledWith('https://example.com');
    });

    // Contract Test: Only valid URLs should be normalized
    it('should normalize only valid and secure URLs', () => {
      const content = 'Visit https://good.com and https://bad.com';
      
      (mockValidator.isValidURL as MockedFunction<any>)
        .mockReturnValueOnce(true)   // good.com
        .mockReturnValueOnce(false); // bad.com
      (mockValidator.isAllowedProtocol as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.validateLength as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isSafeURL as MockedFunction<any>).mockReturnValue(true);
      (mockSecurityFilter.checkForSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockNormalizer.normalizeURL as MockedFunction<any>).mockImplementation(url => url.toLowerCase());

      urlDetectionService.detectURLs(content);

      // Should only normalize the valid URL
      expect(mockNormalizer.normalizeURL).toHaveBeenCalledTimes(1);
      expect(mockNormalizer.normalizeURL).toHaveBeenCalledWith('https://good.com');
    });

    // Behavior Test: Invalid URLs should be rejected without normalization
    it('should skip normalization for invalid URLs', () => {
      const content = 'Invalid: javascript:alert("xss")';
      
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(false);

      const result = urlDetectionService.detectURLs(content);

      expect(mockNormalizer.normalizeURL).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    // Behavior Test: Security-flagged URLs should be rejected
    it('should reject URLs flagged by security filter', () => {
      const content = 'Visit https://suspicious.com';
      
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isAllowedProtocol as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.validateLength as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isSafeURL as MockedFunction<any>).mockReturnValue(true);
      (mockSecurityFilter.checkForSSRF as MockedFunction<any>).mockReturnValue(false); // Security concern

      const result = urlDetectionService.detectURLs(content);

      expect(mockNormalizer.normalizeURL).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('YouTube URL Processing', () => {
    // Contract Test: YouTube URLs should be validated and normalized
    it('should validate and normalize YouTube URLs before processing', () => {
      const youtubeURL = 'https://youtube.com/watch?v=abc123def45';
      
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(true);
      (mockNormalizer.normalizeURL as MockedFunction<any>).mockReturnValue(youtubeURL);
      (mockNormalizer.extractDomain as MockedFunction<any>).mockReturnValue('youtube.com');

      urlDetectionService.extractYouTubeVideoID(youtubeURL);

      expect(mockValidator.isValidURL).toHaveBeenCalledWith(youtubeURL);
      expect(mockNormalizer.normalizeURL).toHaveBeenCalledWith(youtubeURL);
      expect(mockNormalizer.extractDomain).toHaveBeenCalledWith(youtubeURL);
    });

    // Behavior Test: Should extract video ID from various YouTube URL formats
    it('should extract video ID from different YouTube URL patterns', () => {
      const testCases = [
        { url: 'https://youtube.com/watch?v=abc123def45', expected: 'abc123def45' },
        { url: 'https://youtu.be/xyz789uvw12', expected: 'xyz789uvw12' },
        { url: 'https://youtube.com/embed/def456ghi78', expected: 'def456ghi78' }
      ];

      testCases.forEach(({ url, expected }) => {
        (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(true);
        (mockNormalizer.normalizeURL as MockedFunction<any>).mockReturnValue(url);
        (mockNormalizer.extractDomain as MockedFunction<any>)
          .mockReturnValue(url.includes('youtu.be') ? 'youtu.be' : 'youtube.com');

        const result = urlDetectionService.extractYouTubeVideoID(url);

        expect(result).toBe(expected);
      });
    });

    // Behavior Test: Non-YouTube URLs should return null
    it('should return null for non-YouTube URLs', () => {
      const nonYouTubeURL = 'https://vimeo.com/123456789';
      
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(true);
      (mockNormalizer.normalizeURL as MockedFunction<any>).mockReturnValue(nonYouTubeURL);
      (mockNormalizer.extractDomain as MockedFunction<any>).mockReturnValue('vimeo.com');

      const result = urlDetectionService.extractYouTubeVideoID(nonYouTubeURL);

      expect(result).toBeNull();
    });

    // Contract Test: Invalid URLs should not be processed
    it('should not process invalid YouTube URLs', () => {
      const invalidURL = 'not-a-valid-url';
      
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(false);

      const result = urlDetectionService.extractYouTubeVideoID(invalidURL);

      expect(mockNormalizer.normalizeURL).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    // Behavior Test: Empty content should return empty array
    it('should handle empty content gracefully', () => {
      const result = urlDetectionService.detectURLs('');

      expect(result).toEqual([]);
      expect(mockValidator.isValidURL).not.toHaveBeenCalled();
    });

    // Behavior Test: Content with no URLs should return empty array
    it('should handle content without URLs', () => {
      const content = 'This is just regular text with no links';

      const result = urlDetectionService.detectURLs(content);

      expect(result).toEqual([]);
      expect(mockValidator.isValidURL).not.toHaveBeenCalled();
    });

    // Contract Test: Should handle validator exceptions gracefully
    it('should handle validator exceptions without crashing', () => {
      const content = 'Visit https://example.com';
      
      (mockValidator.isValidURL as MockedFunction<any>).mockImplementation(() => {
        throw new Error('Validator error');
      });

      expect(() => urlDetectionService.detectURLs(content)).not.toThrow();
    });

    // Performance Test: Should handle large content efficiently
    it('should process large content within reasonable time', () => {
      const largeContent = 'Visit https://example.com '.repeat(1000);
      
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isAllowedProtocol as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.validateLength as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isSafeURL as MockedFunction<any>).mockReturnValue(true);
      (mockSecurityFilter.checkForSSRF as MockedFunction<any>).mockReturnValue(true);
      (mockNormalizer.normalizeURL as MockedFunction<any>).mockImplementation(url => url);

      const startTime = performance.now();
      urlDetectionService.detectURLs(largeContent);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Security and Validation Workflow', () => {
    // Contract Test: All security checks should be performed in order
    it('should perform security checks in proper sequence', () => {
      const content = 'Visit https://example.com';
      
      // Mock call tracking
      let callOrder: string[] = [];
      
      (mockValidator.isValidURL as MockedFunction<any>).mockImplementation(() => {
        callOrder.push('isValidURL');
        return true;
      });
      (mockValidator.isAllowedProtocol as MockedFunction<any>).mockImplementation(() => {
        callOrder.push('isAllowedProtocol');
        return true;
      });
      (mockValidator.validateLength as MockedFunction<any>).mockImplementation(() => {
        callOrder.push('validateLength');
        return true;
      });
      (mockValidator.isSafeURL as MockedFunction<any>).mockImplementation(() => {
        callOrder.push('isSafeURL');
        return true;
      });
      (mockSecurityFilter.checkForSSRF as MockedFunction<any>).mockImplementation(() => {
        callOrder.push('checkForSSRF');
        return true;
      });
      (mockNormalizer.normalizeURL as MockedFunction<any>).mockImplementation(() => {
        callOrder.push('normalizeURL');
        return 'https://example.com';
      });

      urlDetectionService.detectURLs(content);

      // Verify the correct sequence of security checks
      expect(callOrder).toEqual([
        'isValidURL',
        'isAllowedProtocol', 
        'validateLength',
        'isSafeURL',
        'checkForSSRF',
        'normalizeURL'
      ]);
    });

    // Contract Test: Should stop processing on first security failure
    it('should short-circuit on security validation failure', () => {
      const content = 'Visit https://malicious.com';
      
      (mockValidator.isValidURL as MockedFunction<any>).mockReturnValue(true);
      (mockValidator.isAllowedProtocol as MockedFunction<any>).mockReturnValue(false); // Fail here

      urlDetectionService.detectURLs(content);

      // Later security checks should not be called
      expect(mockValidator.validateLength).not.toHaveBeenCalled();
      expect(mockValidator.isSafeURL).not.toHaveBeenCalled();
      expect(mockSecurityFilter.checkForSSRF).not.toHaveBeenCalled();
      expect(mockNormalizer.normalizeURL).not.toHaveBeenCalled();
    });
  });
});