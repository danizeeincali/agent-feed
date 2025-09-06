/**
 * NLD URL Analysis Engine
 * Specialized component for analyzing URL parsing and display patterns
 * Focuses on detecting www prefix issues and URL formatting problems
 */

export interface URLAnalysisResult {
  originalUrl: string;
  parsedUrl: ParsedURL;
  displayIssues: URLDisplayIssue[];
  recommendations: URLOptimization[];
  confidence: number;
}

export interface ParsedURL {
  protocol: string;
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
  port?: string;
  hasWWW: boolean;
  cleanHostname: string;
  displayText: string;
}

export interface URLDisplayIssue {
  type: 'www-prefix' | 'truncation' | 'encoding' | 'protocol' | 'formatting';
  severity: 'low' | 'medium' | 'high';
  description: string;
  expectedResult: string;
  actualResult: string;
  fix: string;
}

export interface URLOptimization {
  issue: string;
  solution: string;
  implementation: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'minimal' | 'moderate' | 'significant';
}

export class URLAnalyzer {
  private wwwPatterns = {
    // Common www issues
    incorrectWWWAddition: /^(?!https?:\/\/www\.)https?:\/\/(.+)/,
    wwwInDisplayOnly: /^www\.(.+)/,
    mixedWWWUsage: /https?:\/\/(www\.)?(.+)/,
    
    // URL cleaning patterns
    cleanHostname: /^(?:https?:\/\/)?(?:www\.)?(.+?)(?:\/|$)/,
    protocolOptional: /^(?:https?:\/\/)?(.+)/
  };

  /**
   * Analyze URL for display and parsing issues
   */
  public analyzeURL(url: string, context?: { displayMode?: string; maxLength?: number }): URLAnalysisResult {
    const parsedUrl = this.parseURL(url);
    const displayIssues = this.detectDisplayIssues(url, parsedUrl, context);
    const recommendations = this.generateOptimizations(displayIssues, parsedUrl);
    const confidence = this.calculateConfidence(displayIssues, parsedUrl);

    return {
      originalUrl: url,
      parsedUrl,
      displayIssues,
      recommendations,
      confidence
    };
  }

  /**
   * Parse URL into components with www analysis
   */
  private parseURL(url: string): ParsedURL {
    try {
      // Handle URLs without protocol
      let normalizedUrl = url;
      if (!url.match(/^https?:\/\//)) {
        normalizedUrl = 'https://' + url;
      }

      const urlObj = new URL(normalizedUrl);
      const hasWWW = urlObj.hostname.startsWith('www.');
      const cleanHostname = urlObj.hostname.replace(/^www\./, '');

      return {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        port: urlObj.port || undefined,
        hasWWW,
        cleanHostname,
        displayText: this.generateDisplayText(urlObj, hasWWW)
      };
    } catch (error) {
      // Fallback parsing for malformed URLs
      return this.fallbackParse(url);
    }
  }

  /**
   * Generate optimal display text for URL
   */
  private generateDisplayText(urlObj: URL, hasWWW: boolean): string {
    // Prefer clean hostname without www for display
    let displayText = urlObj.hostname.replace(/^www\./, '');
    
    // Add path if it's meaningful
    if (urlObj.pathname && urlObj.pathname !== '/') {
      displayText += urlObj.pathname;
    }

    // Add query params if short and meaningful
    if (urlObj.search && urlObj.search.length < 20) {
      displayText += urlObj.search;
    }

    return displayText;
  }

  /**
   * Fallback parsing for malformed URLs
   */
  private fallbackParse(url: string): ParsedURL {
    const cleanMatch = url.match(this.wwwPatterns.cleanHostname);
    const hostname = cleanMatch ? cleanMatch[1] : url;
    const hasWWW = url.includes('www.');

    return {
      protocol: url.startsWith('https') ? 'https:' : 'http:',
      hostname: hostname.split('/')[0],
      pathname: '/',
      search: '',
      hash: '',
      hasWWW,
      cleanHostname: hostname.split('/')[0].replace(/^www\./, ''),
      displayText: hostname.split('/')[0].replace(/^www\./, '')
    };
  }

  /**
   * Detect display issues in URL handling
   */
  private detectDisplayIssues(
    originalUrl: string, 
    parsed: ParsedURL, 
    context?: { displayMode?: string; maxLength?: number }
  ): URLDisplayIssue[] {
    const issues: URLDisplayIssue[] = [];

    // Check for www prefix display issues
    if (this.detectWWWIssues(originalUrl, parsed)) {
      issues.push({
        type: 'www-prefix',
        severity: 'medium',
        description: 'URL display incorrectly shows www prefix',
        expectedResult: `Display clean hostname: ${parsed.cleanHostname}`,
        actualResult: `Showing www prefix when not needed`,
        fix: 'Use cleanHostname property instead of raw hostname for display'
      });
    }

    // Check for truncation issues
    if (context?.maxLength && parsed.displayText.length > context.maxLength) {
      const truncationIssue = this.analyzeTruncation(parsed, context.maxLength);
      if (truncationIssue) {
        issues.push(truncationIssue);
      }
    }

    // Check for encoding issues
    const encodingIssue = this.detectEncodingIssues(originalUrl, parsed);
    if (encodingIssue) {
      issues.push(encodingIssue);
    }

    // Check for protocol display issues
    const protocolIssue = this.detectProtocolIssues(originalUrl, parsed, context?.displayMode);
    if (protocolIssue) {
      issues.push(protocolIssue);
    }

    return issues;
  }

  /**
   * Detect www prefix display issues
   */
  private detectWWWIssues(originalUrl: string, parsed: ParsedURL): boolean {
    // Issue 1: Adding www when original doesn't have it
    if (!originalUrl.includes('www.') && parsed.hasWWW) {
      return true;
    }

    // Issue 2: Showing www in display when it should be clean
    if (parsed.displayText.includes('www.')) {
      return true;
    }

    // Issue 3: Inconsistent www handling
    const wwwInOriginal = originalUrl.match(/(?:https?:\/\/)?www\./);
    const wwwInParsed = parsed.hasWWW;
    
    return Boolean(wwwInOriginal) !== wwwInParsed;
  }

  /**
   * Analyze URL truncation patterns
   */
  private analyzeTruncation(parsed: ParsedURL, maxLength: number): URLDisplayIssue | null {
    if (parsed.displayText.length <= maxLength) {
      return null;
    }

    // Analyze if truncation is smart or dumb
    const idealTruncated = this.smartTruncate(parsed.displayText, maxLength);
    const dumbTruncated = parsed.displayText.substring(0, maxLength) + '...';

    return {
      type: 'truncation',
      severity: 'low',
      description: 'URL truncation could be improved',
      expectedResult: `Smart truncation: ${idealTruncated}`,
      actualResult: `Dumb truncation: ${dumbTruncated}`,
      fix: 'Implement smart truncation that preserves important URL parts'
    };
  }

  /**
   * Smart URL truncation
   */
  private smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Priority: hostname > important path segments > query params
    const parts = text.split('/');
    const hostname = parts[0];
    
    if (hostname.length >= maxLength - 3) {
      return hostname.substring(0, maxLength - 3) + '...';
    }

    let result = hostname;
    for (let i = 1; i < parts.length && result.length < maxLength - 3; i++) {
      const addition = '/' + parts[i];
      if (result.length + addition.length <= maxLength - 3) {
        result += addition;
      } else {
        result += '/...';
        break;
      }
    }

    return result;
  }

  /**
   * Detect encoding issues
   */
  private detectEncodingIssues(originalUrl: string, parsed: ParsedURL): URLDisplayIssue | null {
    // Check for unencoded special characters
    const hasSpecialChars = /[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/.test(originalUrl);
    const isProperlyEncoded = originalUrl === encodeURI(decodeURI(originalUrl));

    if (hasSpecialChars && !isProperlyEncoded) {
      return {
        type: 'encoding',
        severity: 'medium',
        description: 'URL contains unencoded special characters',
        expectedResult: 'Properly encoded URL',
        actualResult: 'URL with unencoded special characters',
        fix: 'Apply proper URL encoding to special characters'
      };
    }

    return null;
  }

  /**
   * Detect protocol display issues
   */
  private detectProtocolIssues(
    originalUrl: string, 
    parsed: ParsedURL, 
    displayMode?: string
  ): URLDisplayIssue | null {
    // In most display modes, protocol should be hidden
    if (displayMode !== 'full' && parsed.displayText.includes('://')) {
      return {
        type: 'protocol',
        severity: 'low',
        description: 'Protocol showing in display when it should be hidden',
        expectedResult: 'Clean display without protocol',
        actualResult: 'Display includes protocol',
        fix: 'Remove protocol from display text in non-full display modes'
      };
    }

    // Check for mixed protocol handling
    if (originalUrl.startsWith('http://') && parsed.protocol === 'https:') {
      return {
        type: 'protocol',
        severity: 'low',
        description: 'Protocol auto-correction may confuse users',
        expectedResult: 'Preserve original protocol',
        actualResult: 'Protocol changed during parsing',
        fix: 'Preserve original protocol unless explicitly upgrading'
      };
    }

    return null;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizations(issues: URLDisplayIssue[], parsed: ParsedURL): URLOptimization[] {
    const optimizations: URLOptimization[] = [];

    // WWW prefix optimization
    const wwwIssues = issues.filter(i => i.type === 'www-prefix');
    if (wwwIssues.length > 0) {
      optimizations.push({
        issue: 'www prefix display inconsistency',
        solution: 'Use cleanHostname for all display purposes',
        implementation: `
          // Instead of: hostname
          // Use: hostname.replace(/^www\\./, '')
          
          function getDisplayHostname(url) {
            const parsed = new URL(url);
            return parsed.hostname.replace(/^www\\./, '');
          }
        `,
        priority: 'high',
        effort: 'minimal'
      });
    }

    // Truncation optimization
    const truncationIssues = issues.filter(i => i.type === 'truncation');
    if (truncationIssues.length > 0) {
      optimizations.push({
        issue: 'poor URL truncation strategy',
        solution: 'Implement smart truncation algorithm',
        implementation: `
          function smartTruncate(url, maxLength) {
            const parts = url.split('/');
            const hostname = parts[0];
            
            if (hostname.length >= maxLength - 3) {
              return hostname.substring(0, maxLength - 3) + '...';
            }
            
            let result = hostname;
            for (let i = 1; i < parts.length; i++) {
              const addition = '/' + parts[i];
              if (result.length + addition.length <= maxLength - 3) {
                result += addition;
              } else {
                result += '/...';
                break;
              }
            }
            return result;
          }
        `,
        priority: 'medium',
        effort: 'moderate'
      });
    }

    // Encoding optimization
    const encodingIssues = issues.filter(i => i.type === 'encoding');
    if (encodingIssues.length > 0) {
      optimizations.push({
        issue: 'URL encoding problems',
        solution: 'Add proper URL encoding/decoding',
        implementation: `
          function safeDecodeURL(url) {
            try {
              return decodeURIComponent(url);
            } catch (e) {
              return url; // Return original if decoding fails
            }
          }
          
          function displayURL(url) {
            return safeDecodeURL(url).replace(/^www\\./, '');
          }
        `,
        priority: 'medium',
        effort: 'minimal'
      });
    }

    return optimizations;
  }

  /**
   * Calculate confidence in analysis
   */
  private calculateConfidence(issues: URLDisplayIssue[], parsed: ParsedURL): number {
    let confidence = 100;

    // Reduce confidence for each issue
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          confidence -= 20;
          break;
        case 'medium':
          confidence -= 10;
          break;
        case 'low':
          confidence -= 5;
          break;
      }
    });

    // Reduce confidence for parsing issues
    if (!parsed.hostname) {
      confidence -= 30;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Batch analyze multiple URLs
   */
  public batchAnalyze(urls: string[], context?: { displayMode?: string; maxLength?: number }): URLAnalysisResult[] {
    return urls.map(url => this.analyzeURL(url, context));
  }

  /**
   * Get www patterns for testing
   */
  public getPatterns() {
    return this.wwwPatterns;
  }

  /**
   * Test URL against known problematic patterns
   */
  public testProblematicPatterns(url: string): { pattern: string; matches: boolean; description: string }[] {
    const tests = [
      {
        pattern: 'www-auto-add',
        test: !url.includes('www.') && this.parseURL(url).hasWWW,
        description: 'Automatically adding www prefix where not present'
      },
      {
        pattern: 'www-display-leak',
        test: this.parseURL(url).displayText.includes('www.'),
        description: 'www prefix leaking into display text'
      },
      {
        pattern: 'protocol-inconsistency',
        test: url.startsWith('http://') && this.parseURL(url).protocol === 'https:',
        description: 'Protocol being auto-corrected inconsistently'
      },
      {
        pattern: 'encoding-issue',
        test: /[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/.test(url) && url === encodeURI(decodeURI(url)),
        description: 'Special characters not properly handled'
      }
    ];

    return tests.map(test => ({
      pattern: test.pattern,
      matches: test.test,
      description: test.description
    }));
  }
}

// Export singleton instance
export const urlAnalyzer = new URLAnalyzer();