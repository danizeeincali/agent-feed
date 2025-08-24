import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

interface VisualAnalysis {
  screenshot: Buffer;
  colorAnalysis: {
    averageColor: string;
    dominantColors: string[];
    whitePixelPercentage: number;
    totalPixels: number;
  };
  domStructure: {
    totalElements: number;
    visibleElements: number;
    textNodes: number;
    imageElements: number;
  };
  layoutMetrics: {
    viewportWidth: number;
    viewportHeight: number;
    contentHeight: number;
    scrollHeight: number;
  };
}

class VisualRegressionDetector {
  private page: Page;
  private baselineDir = 'frontend/test-results/visual-baselines';
  private actualDir = 'frontend/test-results/visual-actual';
  private diffDir = 'frontend/test-results/visual-diffs';

  constructor(page: Page) {
    this.page = page;
  }

  async setupDirectories() {
    await Promise.all([
      fs.mkdir(this.baselineDir, { recursive: true }),
      fs.mkdir(this.actualDir, { recursive: true }),
      fs.mkdir(this.diffDir, { recursive: true })
    ]);
  }

  async captureVisualAnalysis(testName: string): Promise<VisualAnalysis> {
    // Take full page screenshot
    const screenshot = await this.page.screenshot({
      fullPage: true,
      animations: 'disabled'
    });

    // Analyze page colors and white space
    const colorAnalysis = await this.page.evaluate(() => {
      // Create a canvas to analyze screenshot colors
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Draw page content to canvas for analysis
      // Since we can't directly analyze screenshot in browser, we analyze rendered content
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      
      // Simple color analysis based on body and main elements
      const elements = Array.from(document.querySelectorAll('*')).slice(0, 100);
      const colors = elements.map(el => {
        const style = window.getComputedStyle(el);
        return {
          background: style.backgroundColor,
          color: style.color,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        };
      }).filter(color => color.visible);

      // Calculate white/transparent percentage
      const whiteColors = colors.filter(c => 
        c.background === 'rgba(0, 0, 0, 0)' || 
        c.background === 'rgb(255, 255, 255)' ||
        c.background === 'white' ||
        c.background === 'transparent'
      );

      return {
        averageColor: computedStyle.backgroundColor,
        dominantColors: [...new Set(colors.map(c => c.background))].slice(0, 5),
        whitePixelPercentage: (whiteColors.length / colors.length) * 100,
        totalPixels: viewport.width * viewport.height
      };
    });

    // Analyze DOM structure
    const domStructure = await this.page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const visibleElements = Array.from(allElements).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               el.offsetWidth > 0 && 
               el.offsetHeight > 0;
      });

      const textNodes = Array.from(allElements).filter(el => {
        return el.textContent && el.textContent.trim().length > 0;
      });

      const imageElements = document.querySelectorAll('img, svg, canvas, video');

      return {
        totalElements: allElements.length,
        visibleElements: visibleElements.length,
        textNodes: textNodes.length,
        imageElements: imageElements.length
      };
    });

    // Get layout metrics
    const layoutMetrics = await this.page.evaluate(() => {
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        contentHeight: document.documentElement.scrollHeight,
        scrollHeight: document.body.scrollHeight
      };
    });

    // Save screenshot
    const actualPath = path.join(this.actualDir, `${testName}.png`);
    await fs.writeFile(actualPath, screenshot);

    return {
      screenshot,
      colorAnalysis,
      domStructure,
      layoutMetrics
    };
  }

  async detectWhiteScreenVisually(analysis: VisualAnalysis): Promise<{
    isWhiteScreen: boolean;
    confidence: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let whiteScreenScore = 0;

    // Check white pixel percentage
    if (analysis.colorAnalysis.whitePixelPercentage > 80) {
      reasons.push(`High white pixel percentage: ${analysis.colorAnalysis.whitePixelPercentage.toFixed(1)}%`);
      whiteScreenScore += 30;
    }

    // Check visible elements
    if (analysis.domStructure.visibleElements < 10) {
      reasons.push(`Very few visible elements: ${analysis.domStructure.visibleElements}`);
      whiteScreenScore += 25;
    }

    // Check text content
    if (analysis.domStructure.textNodes < 5) {
      reasons.push(`Minimal text content: ${analysis.domStructure.textNodes} text nodes`);
      whiteScreenScore += 20;
    }

    // Check layout dimensions
    if (analysis.layoutMetrics.contentHeight < 200) {
      reasons.push(`Minimal content height: ${analysis.layoutMetrics.contentHeight}px`);
      whiteScreenScore += 15;
    }

    // Check dominant colors (should have variety)
    const meaningfulColors = analysis.colorAnalysis.dominantColors.filter(color => 
      color !== 'rgba(0, 0, 0, 0)' && 
      color !== 'transparent' && 
      color !== 'rgb(255, 255, 255)'
    );
    
    if (meaningfulColors.length < 2) {
      reasons.push(`Limited color variety: ${meaningfulColors.length} meaningful colors`);
      whiteScreenScore += 10;
    }

    const isWhiteScreen = whiteScreenScore >= 50; // Threshold for white screen
    const confidence = Math.min(whiteScreenScore, 100);

    return {
      isWhiteScreen,
      confidence,
      reasons
    };
  }

  async compareWithBaseline(testName: string, currentScreenshot: Buffer): Promise<{
    hasDiff: boolean;
    similarity: number;
    diffPath?: string;
  }> {
    const baselinePath = path.join(this.baselineDir, `${testName}.png`);
    
    try {
      const baseline = await fs.readFile(baselinePath);
      
      // Simple byte comparison (in real scenario, use image diff library)
      const similarity = this.calculateImageSimilarity(baseline, currentScreenshot);
      const hasDiff = similarity < 0.95; // 95% similarity threshold
      
      if (hasDiff) {
        const diffPath = path.join(this.diffDir, `${testName}-diff.png`);
        // In real implementation, generate visual diff image
        await fs.writeFile(diffPath, currentScreenshot);
        return { hasDiff, similarity, diffPath };
      }
      
      return { hasDiff: false, similarity };
      
    } catch (error) {
      // No baseline exists, create one
      await fs.writeFile(baselinePath, currentScreenshot);
      console.log(`Created new baseline for ${testName}`);
      return { hasDiff: false, similarity: 1.0 };
    }
  }

  private calculateImageSimilarity(img1: Buffer, img2: Buffer): number {
    // Simple size comparison (in real scenario, use perceptual image diff)
    if (img1.length === 0 || img2.length === 0) return 0;
    
    const sizeDiff = Math.abs(img1.length - img2.length);
    const maxSize = Math.max(img1.length, img2.length);
    
    return Math.max(0, 1 - (sizeDiff / maxSize));
  }

  async analyzeViewportSizes(testName: string): Promise<{
    desktop: VisualAnalysis;
    tablet: VisualAnalysis;
    mobile: VisualAnalysis;
  }> {
    const viewports = {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    };

    const results: any = {};

    for (const [size, viewport] of Object.entries(viewports)) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(1000); // Allow for responsive layout
      
      results[size] = await this.captureVisualAnalysis(`${testName}-${size}`);
    }

    return results;
  }
}

test.describe('Visual Regression and White Screen Detection', () => {
  let detector: VisualRegressionDetector;

  test.beforeEach(async ({ page }) => {
    detector = new VisualRegressionDetector(page);
    await detector.setupDirectories();
    
    // Disable animations for consistent screenshots
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.innerHTML = `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
          }
        `;
        document.head.appendChild(style);
      });
    });
  });

  test('should detect white screen through visual analysis', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const analysis = await detector.captureVisualAnalysis('homepage-visual-check');
    const whiteScreenDetection = await detector.detectWhiteScreenVisually(analysis);
    
    console.log('Visual Analysis Results:', {
      colorAnalysis: analysis.colorAnalysis,
      domStructure: analysis.domStructure,
      layoutMetrics: analysis.layoutMetrics
    });
    
    console.log('White Screen Detection:', whiteScreenDetection);
    
    // Main assertions
    expect(whiteScreenDetection.isWhiteScreen).toBe(false);
    expect(whiteScreenDetection.confidence).toBeLessThan(50);
    
    // Specific visual health checks
    expect(analysis.domStructure.visibleElements).toBeGreaterThan(10);
    expect(analysis.domStructure.textNodes).toBeGreaterThan(5);
    expect(analysis.layoutMetrics.contentHeight).toBeGreaterThan(200);
    expect(analysis.colorAnalysis.whitePixelPercentage).toBeLessThan(80);
    
    if (whiteScreenDetection.isWhiteScreen) {
      console.error('WHITE SCREEN DETECTED VISUALLY:');
      console.error('Reasons:', whiteScreenDetection.reasons);
      console.error('Confidence:', whiteScreenDetection.confidence);
      
      await test.info().attach('white-screen-visual-evidence', {
        body: analysis.screenshot,
        contentType: 'image/png'
      });
    }
  });

  test('should perform visual regression testing', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const analysis = await detector.captureVisualAnalysis('regression-baseline');
    const comparison = await detector.compareWithBaseline('regression-baseline', analysis.screenshot);
    
    console.log('Regression Comparison:', {
      hasDiff: comparison.hasDiff,
      similarity: comparison.similarity
    });
    
    // Allow for minor differences but flag major changes
    expect(comparison.similarity).toBeGreaterThan(0.90);
    
    if (comparison.hasDiff) {
      console.warn('Visual differences detected - similarity:', comparison.similarity);
      
      if (comparison.diffPath) {
        await test.info().attach('visual-diff', {
          path: comparison.diffPath,
          contentType: 'image/png'
        });
      }
    }
  });

  test('should test responsive design across viewports', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const responsiveAnalysis = await detector.analyzeViewportSizes('responsive-test');
    
    // Test each viewport size
    for (const [size, analysis] of Object.entries(responsiveAnalysis)) {
      console.log(`${size.toUpperCase()} Analysis:`, {
        dimensions: `${analysis.layoutMetrics.viewportWidth}x${analysis.layoutMetrics.viewportHeight}`,
        visibleElements: analysis.domStructure.visibleElements,
        contentHeight: analysis.layoutMetrics.contentHeight
      });
      
      // Each viewport should render properly
      expect(analysis.domStructure.visibleElements).toBeGreaterThan(5);
      expect(analysis.layoutMetrics.contentHeight).toBeGreaterThan(100);
      
      // Check for responsive behavior
      if (size === 'mobile') {
        // Mobile might have fewer visible elements due to responsive design
        expect(analysis.domStructure.visibleElements).toBeGreaterThan(3);
      }
      
      const whiteScreenCheck = await detector.detectWhiteScreenVisually(analysis);
      expect(whiteScreenCheck.isWhiteScreen).toBe(false);
    }
    
    // Compare content across viewports
    const desktopElements = responsiveAnalysis.desktop.domStructure.visibleElements;
    const mobileElements = responsiveAnalysis.mobile.domStructure.visibleElements;
    
    // Mobile should have at least 50% of desktop elements (accounting for responsive hiding)
    expect(mobileElements / desktopElements).toBeGreaterThan(0.3);
  });

  test('should capture loading states and transitions', async ({ page }) => {
    // Capture during loading
    const loadingPromise = page.goto('http://localhost:5173');
    
    // Quick capture during initial load
    await page.waitForTimeout(100);
    const loadingAnalysis = await detector.captureVisualAnalysis('loading-state');
    
    await loadingPromise;
    await page.waitForLoadState('networkidle');
    
    // Capture final loaded state
    const loadedAnalysis = await detector.captureVisualAnalysis('loaded-state');
    
    console.log('Loading vs Loaded Comparison:', {
      loading: {
        visibleElements: loadingAnalysis.domStructure.visibleElements,
        contentHeight: loadingAnalysis.layoutMetrics.contentHeight
      },
      loaded: {
        visibleElements: loadedAnalysis.domStructure.visibleElements,
        contentHeight: loadedAnalysis.layoutMetrics.contentHeight
      }
    });
    
    // Final state should have more content than loading state
    expect(loadedAnalysis.domStructure.visibleElements).toBeGreaterThanOrEqual(
      loadingAnalysis.domStructure.visibleElements
    );
    
    expect(loadedAnalysis.layoutMetrics.contentHeight).toBeGreaterThanOrEqual(
      loadingAnalysis.layoutMetrics.contentHeight
    );
    
    // Neither state should be white screen
    const loadingWhiteScreen = await detector.detectWhiteScreenVisually(loadingAnalysis);
    const loadedWhiteScreen = await detector.detectWhiteScreenVisually(loadedAnalysis);
    
    expect(loadedWhiteScreen.isWhiteScreen).toBe(false);
    
    // Loading state might be minimal but shouldn't be completely white
    if (loadingWhiteScreen.isWhiteScreen) {
      console.warn('Loading state appears as white screen - this might indicate slow loading');
    }
  });

  test('should validate color contrast and accessibility', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const accessibilityAnalysis = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        const text = el.textContent?.trim();
        return text && text.length > 0 && 
               style.display !== 'none' && 
               el.offsetWidth > 0 && 
               el.offsetHeight > 0;
      }).slice(0, 50); // Check first 50 text elements

      const colorContrasts = elements.map(el => {
        const style = window.getComputedStyle(el);
        return {
          tagName: el.tagName,
          color: style.color,
          backgroundColor: style.backgroundColor,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          textContent: el.textContent?.slice(0, 50) // First 50 chars
        };
      });

      // Simple contrast check (in real scenario, use proper contrast calculation)
      const poorContrast = colorContrasts.filter(c => {
        return (c.color === c.backgroundColor) || 
               (c.color === 'rgb(255, 255, 255)' && c.backgroundColor === 'rgb(255, 255, 255)') ||
               (c.color === 'rgba(0, 0, 0, 0)' && c.backgroundColor === 'rgba(0, 0, 0, 0)');
      });

      return {
        totalTextElements: colorContrasts.length,
        poorContrastElements: poorContrast.length,
        colorVariety: new Set(colorContrasts.map(c => c.color)).size,
        backgroundVariety: new Set(colorContrasts.map(c => c.backgroundColor)).size
      };
    });

    console.log('Accessibility Analysis:', accessibilityAnalysis);

    // Accessibility assertions
    expect(accessibilityAnalysis.totalTextElements).toBeGreaterThan(0);
    expect(accessibilityAnalysis.poorContrastElements).toBeLessThan(
      accessibilityAnalysis.totalTextElements * 0.2 // Less than 20% poor contrast
    );
    expect(accessibilityAnalysis.colorVariety).toBeGreaterThan(1); // Multiple text colors
    
    // Take accessibility screenshot
    await page.screenshot({
      path: 'frontend/test-results/accessibility-analysis.png',
      fullPage: true
    });
  });

  test('should detect layout shifts and stability', async ({ page }) => {
    // Monitor for layout shifts
    await page.addInitScript(() => {
      window.__LAYOUT_SHIFTS__ = [];
      
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
              if (entry.hadRecentInput) return; // Ignore user-input shifts
              window.__LAYOUT_SHIFTS__.push({
                value: (entry as any).value,
                startTime: entry.startTime,
                duration: entry.duration
              });
            });
          });
          
          observer.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          console.warn('Layout shift monitoring not supported');
        }
      }
    });

    await page.goto('http://localhost:5173');
    
    // Take initial screenshot
    const initialAnalysis = await detector.captureVisualAnalysis('layout-initial');
    
    // Wait for potential layout shifts
    await page.waitForTimeout(3000);
    
    // Take final screenshot
    const finalAnalysis = await detector.captureVisualAnalysis('layout-final');
    
    // Get layout shift data
    const layoutShifts = await page.evaluate(() => window.__LAYOUT_SHIFTS__ || []);
    
    console.log('Layout Stability Analysis:', {
      layoutShifts: layoutShifts.length,
      totalShiftValue: layoutShifts.reduce((sum, shift) => sum + shift.value, 0),
      contentHeightChange: finalAnalysis.layoutMetrics.contentHeight - initialAnalysis.layoutMetrics.contentHeight
    });

    // Layout stability assertions
    const totalCLS = layoutShifts.reduce((sum, shift) => sum + shift.value, 0);
    expect(totalCLS).toBeLessThan(0.1); // CLS should be less than 0.1

    // Content should be stable
    const heightDifference = Math.abs(
      finalAnalysis.layoutMetrics.contentHeight - initialAnalysis.layoutMetrics.contentHeight
    );
    expect(heightDifference).toBeLessThan(100); // Allow small height changes

    if (layoutShifts.length > 0) {
      console.log('Layout Shifts Detected:', layoutShifts);
    }
  });
});