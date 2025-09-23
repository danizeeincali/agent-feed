/**
 * Global Setup for Media Tests
 * 
 * Sets up the test environment for comprehensive video and thumbnail testing,
 * including network mocking, performance monitoring, and test data preparation.
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

async function globalSetup(config: FullConfig) {
  console.log('🎬 Setting up global media test environment...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Ensure test output directories exist
    const testDirs = [
      'test-results/video-thumbnail',
      'test-results/screenshots/media',
      'test-results/videos/media', 
      'test-results/traces/media'
    ];

    for (const dir of testDirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Pre-warm media URLs to check availability
    const mediaUrls = [
      'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      'https://via.placeholder.com/640x480.jpg',
      'https://images.unsplash.com/photo-1518906966719-1d1a2ee5f3bc?w=400&h=300'
    ];

    console.log('🔗 Pre-checking media URL availability...');
    const urlStatus = [];

    for (const url of mediaUrls) {
      try {
        const response = await page.request.get(url);
        const status = response.status();
        const contentType = response.headers()['content-type'] || 'unknown';
        
        urlStatus.push({
          url,
          status,
          contentType,
          available: status === 200
        });
        
        console.log(`  ${status === 200 ? '✅' : '❌'} ${url} - ${status} (${contentType})`);
      } catch (error) {
        console.log(`  ❌ ${url} - Error: ${error.message}`);
        urlStatus.push({
          url,
          status: 0,
          contentType: 'error',
          available: false,
          error: error.message
        });
      }
    }

    // Save URL status report
    const statusReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      mediaUrls: urlStatus,
      summary: {
        total: urlStatus.length,
        available: urlStatus.filter(u => u.available).length,
        unavailable: urlStatus.filter(u => !u.available).length
      }
    };

    await fs.writeFile(
      'test-results/video-thumbnail/media-url-status.json',
      JSON.stringify(statusReport, null, 2)
    );

    // Test YouTube API availability
    console.log('📹 Testing YouTube thumbnail API...');
    const youtubeTests = [
      { id: 'dQw4w9WgXcQ', quality: 'mqdefault' },
      { id: 'dQw4w9WgXcQ', quality: 'hqdefault' },
      { id: 'dQw4w9WgXcQ', quality: 'maxresdefault' }
    ];

    const youtubeStatus = [];
    for (const { id, quality } of youtubeTests) {
      const url = `https://img.youtube.com/vi/${id}/${quality}.jpg`;
      try {
        const response = await page.request.get(url);
        const status = response.status();
        youtubeStatus.push({
          videoId: id,
          quality,
          url,
          status,
          available: status === 200
        });
        console.log(`  ${status === 200 ? '✅' : '❌'} YouTube ${quality}: ${status}`);
      } catch (error) {
        console.log(`  ❌ YouTube ${quality}: Error`);
        youtubeStatus.push({
          videoId: id,
          quality,
          url,
          status: 0,
          available: false,
          error: error.message
        });
      }
    }

    // Test browser media capabilities
    console.log('🎭 Testing browser media capabilities...');
    const mediaCapabilities = await page.evaluate(async () => {
      const video = document.createElement('video');
      const audio = document.createElement('audio');
      
      // Test WebP support
      const webpSupport = await new Promise(resolve => {
        const webP = new Image();
        webP.onload = webP.onerror = () => resolve(webP.height === 2);
        webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
      });
      
      return {
        video: {
          element: !!video,
          canPlayType: typeof video.canPlayType === 'function',
          mp4: video.canPlayType('video/mp4'),
          webm: video.canPlayType('video/webm'),
          ogg: video.canPlayType('video/ogg')
        },
        audio: {
          element: !!audio,
          canPlayType: typeof audio.canPlayType === 'function',
          mp3: audio.canPlayType('audio/mpeg'),
          ogg: audio.canPlayType('audio/ogg'),
          wav: audio.canPlayType('audio/wav')
        },
        images: {
          webp: webpSupport,
          avif: 'createImageBitmap' in window
        },
        apis: {
          intersectionObserver: 'IntersectionObserver' in window,
          mediaDevices: 'mediaDevices' in navigator,
          getUserMedia: !!(navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices) || 'webkitGetUserMedia' in navigator,
          requestAnimationFrame: 'requestAnimationFrame' in window
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
          orientation: window.screen?.orientation?.type || 'unknown'
        }
      };
    });

    console.log('  Video support:', mediaCapabilities.video.canPlayType ? '✅' : '❌');
    console.log('  WebP support:', mediaCapabilities.images.webp ? '✅' : '❌');
    console.log('  Intersection Observer:', mediaCapabilities.apis.intersectionObserver ? '✅' : '❌');

    // Generate comprehensive test report
    const testReport = {
      setupTime: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        playwrightVersion: require('@playwright/test/package.json').version,
        os: process.platform,
        arch: process.arch
      },
      mediaUrls: statusReport,
      youtubeApi: {
        timestamp: new Date().toISOString(),
        tests: youtubeStatus,
        summary: {
          total: youtubeStatus.length,
          available: youtubeStatus.filter(t => t.available).length,
          qualities: youtubeStatus.filter(t => t.available).map(t => t.quality)
        }
      },
      browserCapabilities: mediaCapabilities,
      testConfiguration: {
        timeout: config.timeout,
        retries: config.retries,
        workers: config.workers,
        projects: config.projects.length
      }
    };

    await fs.writeFile(
      'test-results/video-thumbnail/test-environment-report.json',
      JSON.stringify(testReport, null, 2)
    );

    // Create test data files
    const testData = {
      videoUrls: {
        youtube: {
          standard: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          short: 'https://youtu.be/dQw4w9WgXcQ',
          embed: 'https://youtube.com/embed/dQw4w9WgXcQ'
        },
        thumbnails: {
          youtube: youtubeStatus.filter(t => t.available).map(t => t.url)
        }
      },
      imageUrls: {
        formats: {
          jpeg: 'https://via.placeholder.com/640x480.jpg/09f/fff',
          png: 'https://via.placeholder.com/640x480.png/f90/fff',
          webp: 'https://via.placeholder.com/640x480.webp/0f9/fff',
          gif: 'https://via.placeholder.com/640x480.gif/f09/fff'
        },
        external: mediaUrls.filter((_, i) => urlStatus[i].available)
      },
      testScenarios: {
        crossBrowser: ['chromium', 'firefox', 'webkit'],
        devices: ['desktop', 'mobile', 'tablet'],
        networkConditions: ['fast', 'slow', 'offline'],
        imageFormats: ['jpeg', 'png', 'webp', 'gif', 'svg']
      }
    };

    await fs.writeFile(
      'test-results/video-thumbnail/test-data.json',
      JSON.stringify(testData, null, 2)
    );

    console.log('✅ Global media test setup completed');
    console.log(`   📊 Environment report: test-results/video-thumbnail/test-environment-report.json`);
    console.log(`   🔗 URL status: test-results/video-thumbnail/media-url-status.json`);
    console.log(`   📋 Test data: test-results/video-thumbnail/test-data.json`);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;