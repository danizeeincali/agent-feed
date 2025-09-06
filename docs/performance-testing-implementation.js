/**
 * Performance Testing Implementation Framework
 * Comprehensive testing suite for web preview functionality benchmarks
 */

import { performance } from 'perf_hooks';
import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';

class PerformanceBenchmarkSuite {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.page = null;
    this.results = new Map();
    this.thresholds = {
      imageLoading: {
        target: 800,
        warning: 1500,
        critical: 3000
      },
      videoThumbnail: {
        target: 1500,
        warning: 3000,
        critical: 5000
      },
      linkPreview: {
        target: 1000,
        warning: 2000,
        critical: 5000
      },
      feedRendering: {
        target: 1200,
        warning: 2000,
        critical: 4000
      }
    };
  }

  async initialize() {
    console.log('🚀 Initializing Performance Benchmark Suite');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Configure page for performance testing
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent('Mozilla/5.0 (compatible; PerformanceBot/1.0)');
    
    // Enable performance timeline
    await this.page.evaluateOnNewDocument(() => {
      window.performanceMarks = [];
      window.performanceMeasures = [];
      
      // Override performance.mark to track custom metrics
      const originalMark = performance.mark;
      performance.mark = function(name) {
        window.performanceMarks.push({ name, time: performance.now() });
        return originalMark.call(performance, name);
      };
      
      // Override performance.measure to track durations  
      const originalMeasure = performance.measure;
      performance.measure = function(name, startMark, endMark) {
        const result = originalMeasure.call(performance, name, startMark, endMark);
        window.performanceMeasures.push({
          name,
          duration: result.duration,
          startTime: result.startTime
        });
        return result;
      };
    });
    
    console.log('✅ Performance testing environment initialized');
  }

  async runImageLoadingBenchmarks() {
    console.log('📊 Running Image Loading Performance Tests');
    
    await this.page.goto(`${this.baseUrl}/?test=image-performance`, {
      waitUntil: 'networkidle2'
    });
    
    // Test progressive image loading
    const imageLoadingResults = await this.page.evaluate(async () => {
      const results = [];
      const testImages = [
        { url: 'https://picsum.photos/300/300', size: '300x300' },
        { url: 'https://picsum.photos/600/600', size: '600x600' },
        { url: 'https://picsum.photos/1200/800', size: '1200x800' }
      ];
      
      for (const testImage of testImages) {
        const startTime = performance.now();
        
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = testImage.url;
        });
        
        const loadTime = performance.now() - startTime;
        results.push({
          url: testImage.url,
          size: testImage.size,
          loadTime: Math.round(loadTime),
          success: true
        });
      }
      
      return results;
    });
    
    // Analyze results
    const imageAnalysis = this.analyzeResults('image-loading', imageLoadingResults, 'loadTime');
    this.results.set('imageLoading', imageAnalysis);
    
    console.log(`📸 Image Loading Results:`, imageAnalysis.summary);
    return imageAnalysis;
  }

  async runVideoThumbnailBenchmarks() {
    console.log('🎥 Running Video Thumbnail Generation Tests');
    
    const videoThumbnailResults = await this.page.evaluate(async () => {
      const results = [];
      const testVideos = [
        'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4'
      ];
      
      for (const videoUrl of testVideos) {
        const startTime = performance.now();
        
        try {
          // Simulate server-side thumbnail generation API call
          const response = await fetch('/api/v1/generate-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl, quality: 0.7 })
          });
          
          const thumbnailData = await response.json();
          const generationTime = performance.now() - startTime;
          
          results.push({
            videoUrl,
            thumbnailUrl: thumbnailData.thumbnailUrl,
            generationTime: Math.round(generationTime),
            success: response.ok
          });
        } catch (error) {
          results.push({
            videoUrl,
            generationTime: performance.now() - startTime,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    });
    
    const videoAnalysis = this.analyzeResults('video-thumbnail', videoThumbnailResults, 'generationTime');
    this.results.set('videoThumbnail', videoAnalysis);
    
    console.log(`🎬 Video Thumbnail Results:`, videoAnalysis.summary);
    return videoAnalysis;
  }

  async runLinkPreviewBenchmarks() {
    console.log('🔗 Running Link Preview Performance Tests');
    
    const linkPreviewResults = await this.page.evaluate(async () => {
      const results = [];
      const testUrls = [
        'https://github.com/microsoft/vscode',
        'https://stackoverflow.com/questions/javascript',
        'https://developer.mozilla.org/en-US/docs/Web/API',
        'https://react.dev/learn'
      ];
      
      for (const url of testUrls) {
        const startTime = performance.now();
        
        try {
          const response = await fetch('/api/v1/link-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          
          const previewData = await response.json();
          const extractionTime = performance.now() - startTime;
          
          results.push({
            url,
            title: previewData.title,
            description: previewData.description,
            image: previewData.image,
            extractionTime: Math.round(extractionTime),
            success: response.ok
          });
        } catch (error) {
          results.push({
            url,
            extractionTime: performance.now() - startTime,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    });
    
    const linkPreviewAnalysis = this.analyzeResults('link-preview', linkPreviewResults, 'extractionTime');
    this.results.set('linkPreview', linkPreviewAnalysis);
    
    console.log(`🌐 Link Preview Results:`, linkPreviewAnalysis.summary);
    return linkPreviewAnalysis;
  }

  async runFeedRenderingBenchmarks() {
    console.log('📱 Running Feed Rendering Performance Tests');
    
    // Navigate to feed with performance monitoring
    await this.page.goto(`${this.baseUrl}`, { waitUntil: 'networkidle0' });
    
    // Measure initial render performance
    const renderingMetrics = await this.page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const navigationEntries = performance.getEntriesByType('navigation');
      const measureEntries = performance.getEntriesByType('measure');
      
      return {
        firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
        domContentLoaded: navigationEntries[0]?.domContentLoadedEventEnd || 0,
        loadComplete: navigationEntries[0]?.loadEventEnd || 0,
        customMeasures: measureEntries.map(e => ({
          name: e.name,
          duration: e.duration,
          startTime: e.startTime
        }))
      };
    });
    
    // Test scroll performance
    const scrollPerformance = await this.testScrollPerformance();
    
    const feedAnalysis = {
      renderingMetrics,
      scrollPerformance,
      summary: {
        initialRenderTime: Math.round(renderingMetrics.firstContentfulPaint),
        avgScrollFPS: scrollPerformance.averageFPS,
        status: this.getPerformanceStatus(renderingMetrics.firstContentfulPaint, this.thresholds.feedRendering)
      }
    };
    
    this.results.set('feedRendering', feedAnalysis);
    
    console.log(`📊 Feed Rendering Results:`, feedAnalysis.summary);
    return feedAnalysis;
  }

  async testScrollPerformance() {
    console.log('🔄 Testing Scroll Performance');
    
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const frameTimestamps = [];
        let frameCount = 0;
        const maxFrames = 120; // Test for 2 seconds at 60fps
        
        const measureFrameRate = () => {
          frameTimestamps.push(performance.now());
          frameCount++;
          
          if (frameCount < maxFrames) {
            requestAnimationFrame(measureFrameRate);
          } else {
            // Calculate FPS
            const totalTime = frameTimestamps[frameTimestamps.length - 1] - frameTimestamps[0];
            const averageFPS = Math.round((frameCount / totalTime) * 1000);
            
            // Calculate frame time variations
            const frameTimes = [];
            for (let i = 1; i < frameTimestamps.length; i++) {
              frameTimes.push(frameTimestamps[i] - frameTimestamps[i - 1]);
            }
            
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const frameTimeVariance = frameTimes.reduce((sum, time) => 
              sum + Math.pow(time - avgFrameTime, 2), 0) / frameTimes.length;
            
            resolve({
              averageFPS,
              avgFrameTime: Math.round(avgFrameTime * 100) / 100,
              frameTimeVariance: Math.round(frameTimeVariance * 100) / 100,
              droppedFrames: frameTimes.filter(time => time > 16.67).length // >60fps threshold
            });
          }
        };
        
        // Simulate scrolling while measuring
        let scrollPosition = 0;
        const scrollStep = 5;
        const scrollInterval = setInterval(() => {
          scrollPosition += scrollStep;
          window.scrollTo(0, scrollPosition);
          
          if (scrollPosition > 1000) { // Scroll 1000px
            clearInterval(scrollInterval);
          }
        }, 16); // 60fps scrolling
        
        requestAnimationFrame(measureFrameRate);
      });
    });
  }

  async runLighthouseAudit() {
    console.log('🔍 Running Lighthouse Performance Audit');
    
    const { report, lhr } = await lighthouse(`${this.baseUrl}`, {
      port: (new URL(this.browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'error'
    });
    
    const lighthouseResults = {
      performance: lhr.categories.performance.score * 100,
      accessibility: lhr.categories.accessibility.score * 100,
      bestPractices: lhr.categories['best-practices'].score * 100,
      seo: lhr.categories.seo.score * 100,
      pwa: lhr.categories.pwa?.score ? lhr.categories.pwa.score * 100 : 0,
      metrics: {
        firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
        largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
        firstInputDelay: lhr.audits['first-input-delay']?.numericValue || 0,
        cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
        speedIndex: lhr.audits['speed-index'].numericValue,
        totalBlockingTime: lhr.audits['total-blocking-time'].numericValue
      }
    };
    
    this.results.set('lighthouse', lighthouseResults);
    
    console.log(`🚦 Lighthouse Results:`, {
      performance: `${lighthouseResults.performance}/100`,
      accessibility: `${lighthouseResults.accessibility}/100`,
      lcp: `${Math.round(lighthouseResults.metrics.largestContentfulPaint)}ms`,
      cls: lighthouseResults.metrics.cumulativeLayoutShift.toFixed(3)
    });
    
    return lighthouseResults;
  }

  analyzeResults(testName, results, timeProperty) {
    const times = results.filter(r => r.success).map(r => r[timeProperty]);
    
    if (times.length === 0) {
      return {
        testName,
        summary: { status: 'FAILED', reason: 'No successful tests' },
        details: results
      };
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const p95 = this.percentile(times, 95);
    
    const threshold = this.thresholds[testName.replace('-', '')] || this.thresholds.feedRendering;
    const status = this.getPerformanceStatus(avg, threshold);
    
    return {
      testName,
      summary: {
        average: Math.round(avg),
        min: Math.round(min),
        max: Math.round(max),
        p95: Math.round(p95),
        status,
        successRate: `${Math.round((times.length / results.length) * 100)}%`
      },
      details: results
    };
  }

  getPerformanceStatus(value, threshold) {
    if (value <= threshold.target) return 'EXCELLENT';
    if (value <= threshold.warning) return 'GOOD';
    if (value <= threshold.critical) return 'WARNING';
    return 'CRITICAL';
  }

  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async runComprehensiveBenchmark() {
    console.log('🎯 Starting Comprehensive Performance Benchmark Suite');
    
    try {
      await this.initialize();
      
      // Run all benchmark tests
      const results = await Promise.all([
        this.runImageLoadingBenchmarks(),
        this.runVideoThumbnailBenchmarks(),
        this.runLinkPreviewBenchmarks(),
        this.runFeedRenderingBenchmarks(),
        this.runLighthouseAudit()
      ]);
      
      // Generate comprehensive report
      const report = this.generateReport();
      
      console.log('📋 Comprehensive Performance Report Generated');
      return report;
      
    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    const timestamp = new Date().toISOString();
    const testResults = Object.fromEntries(this.results);
    
    // Calculate overall performance score
    const scores = [];
    if (testResults.imageLoading) scores.push(this.getScoreFromStatus(testResults.imageLoading.summary.status));
    if (testResults.videoThumbnail) scores.push(this.getScoreFromStatus(testResults.videoThumbnail.summary.status));
    if (testResults.linkPreview) scores.push(this.getScoreFromStatus(testResults.linkPreview.summary.status));
    if (testResults.feedRendering) scores.push(this.getScoreFromStatus(testResults.feedRendering.summary.status));
    if (testResults.lighthouse) scores.push(testResults.lighthouse.performance);
    
    const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    return {
      timestamp,
      overallScore,
      status: this.getStatusFromScore(overallScore),
      results: testResults,
      summary: {
        testsRun: this.results.size,
        passedTests: [...this.results.values()].filter(r => 
          r.summary?.status && !['CRITICAL', 'FAILED'].includes(r.summary.status)).length,
        criticalIssues: [...this.results.values()].filter(r => 
          r.summary?.status === 'CRITICAL' || r.summary?.status === 'FAILED').length
      },
      recommendations: this.generateRecommendations(testResults)
    };
  }

  getScoreFromStatus(status) {
    switch (status) {
      case 'EXCELLENT': return 95;
      case 'GOOD': return 80;
      case 'WARNING': return 60;
      case 'CRITICAL': return 30;
      case 'FAILED': return 0;
      default: return 50;
    }
  }

  getStatusFromScore(score) {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 50) return 'WARNING';
    return 'CRITICAL';
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    if (results.imageLoading?.summary?.status === 'CRITICAL') {
      recommendations.push({
        priority: 'HIGH',
        category: 'Image Optimization',
        issue: `Image loading time: ${results.imageLoading.summary.average}ms`,
        solution: 'Implement WebP format, add CDN, optimize image sizes'
      });
    }
    
    if (results.lighthouse?.performance < 75) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Core Performance',
        issue: `Lighthouse performance score: ${results.lighthouse.performance}/100`,
        solution: 'Optimize bundle size, implement code splitting, improve LCP'
      });
    }
    
    if (results.feedRendering?.scrollPerformance?.averageFPS < 45) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Scroll Performance',
        issue: `Low scroll FPS: ${results.feedRendering.scrollPerformance.averageFPS}`,
        solution: 'Implement virtual scrolling, optimize animations, reduce DOM complexity'
      });
    }
    
    return recommendations;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Performance testing environment cleaned up');
  }
}

// Export for use in CI/CD pipelines
export { PerformanceBenchmarkSuite };

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const suite = new PerformanceBenchmarkSuite();
  
  suite.runComprehensiveBenchmark()
    .then(report => {
      console.log('\n📊 PERFORMANCE BENCHMARK REPORT');
      console.log('================================');
      console.log(`Overall Score: ${report.overallScore}/100 (${report.status})`);
      console.log(`Tests Run: ${report.summary.testsRun}`);
      console.log(`Passed: ${report.summary.passedTests}`);
      console.log(`Critical Issues: ${report.summary.criticalIssues}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n🎯 RECOMMENDATIONS:');
        report.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. [${rec.priority}] ${rec.category}: ${rec.issue}`);
          console.log(`   Solution: ${rec.solution}`);
        });
      }
      
      // Exit with appropriate code for CI/CD
      process.exit(report.overallScore >= 75 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}