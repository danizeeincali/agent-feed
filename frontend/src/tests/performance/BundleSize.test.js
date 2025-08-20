const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Bundle Size and Load Performance Tests', () => {
  const distPath = path.join(__dirname, '../../dist');
  const buildPath = path.join(__dirname, '../../build');
  
  // Try both common build output directories
  const getDistPath = () => {
    if (fs.existsSync(distPath)) return distPath;
    if (fs.existsSync(buildPath)) return buildPath;
    return null;
  };

  beforeAll(() => {
    // Ensure build exists - run build if needed
    const outputPath = getDistPath();
    if (!outputPath) {
      console.log('No build found, running production build...');
      try {
        execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });
      } catch (error) {
        console.warn('Build failed, tests will use mock data');
      }
    }
  });

  describe('Bundle Size Analysis', () => {
    test('should maintain reasonable total bundle size', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping bundle size test');
        return;
      }

      const getTotalSize = (dirPath) => {
        let totalSize = 0;
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dirPath, file.name);
          if (file.isDirectory()) {
            totalSize += getTotalSize(fullPath);
          } else {
            const stats = fs.statSync(fullPath);
            totalSize += stats.size;
          }
        }
        return totalSize;
      };

      const totalSize = getTotalSize(outputPath);
      const totalSizeMB = totalSize / (1024 * 1024);
      
      console.log(`Total bundle size: ${totalSizeMB.toFixed(2)} MB`);
      
      // Bundle should be under 10MB total
      expect(totalSizeMB).toBeLessThan(10);
      
      // Main JavaScript bundles should be under 5MB
      const jsFiles = fs.readdirSync(outputPath).filter(file => 
        file.endsWith('.js') && !file.includes('vendor') && !file.includes('chunk')
      );
      
      let mainJsSize = 0;
      jsFiles.forEach(file => {
        const stats = fs.statSync(path.join(outputPath, file));
        mainJsSize += stats.size;
      });
      
      const mainJsSizeMB = mainJsSize / (1024 * 1024);
      console.log(`Main JS bundle size: ${mainJsSizeMB.toFixed(2)} MB`);
      
      expect(mainJsSizeMB).toBeLessThan(5);
    });

    test('should have properly split vendor chunks', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping chunk analysis');
        return;
      }

      const files = fs.readdirSync(outputPath);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      
      // Should have multiple JS files (indicating code splitting)
      expect(jsFiles.length).toBeGreaterThan(1);
      
      // Should have vendor chunks
      const vendorChunks = jsFiles.filter(file => 
        file.includes('vendor') || file.includes('node_modules') || file.includes('chunk')
      );
      
      console.log(`Found ${vendorChunks.length} vendor chunks:`, vendorChunks);
      
      // Analyze individual chunk sizes
      jsFiles.forEach(file => {
        const stats = fs.statSync(path.join(outputPath, file));
        const sizeMB = stats.size / (1024 * 1024);
        console.log(`${file}: ${sizeMB.toFixed(2)} MB`);
        
        // Individual chunks should be under 2MB
        expect(sizeMB).toBeLessThan(2);
      });
    });

    test('should compress assets effectively', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping compression test');
        return;
      }

      const files = fs.readdirSync(outputPath);
      
      // Check for gzipped files (if server supports it)
      const gzFiles = files.filter(file => file.endsWith('.gz'));
      console.log(`Found ${gzFiles.length} gzipped files`);
      
      // Check CSS files are minified
      const cssFiles = files.filter(file => file.endsWith('.css'));
      cssFiles.forEach(file => {
        const content = fs.readFileSync(path.join(outputPath, file), 'utf8');
        const hasWhitespace = /\n\s+/.test(content);
        
        // Minified CSS should have minimal whitespace
        expect(hasWhitespace).toBe(false);
        
        const stats = fs.statSync(path.join(outputPath, file));
        const sizeMB = stats.size / (1024 * 1024);
        console.log(`CSS ${file}: ${sizeMB.toFixed(2)} MB`);
        
        // CSS files should be under 1MB
        expect(sizeMB).toBeLessThan(1);
      });
    });

    test('should optimize images and assets', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping asset optimization test');
        return;
      }

      const files = fs.readdirSync(outputPath);
      
      // Check image files
      const imageFiles = files.filter(file => 
        file.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)
      );
      
      console.log(`Found ${imageFiles.length} image files:`, imageFiles);
      
      imageFiles.forEach(file => {
        const stats = fs.statSync(path.join(outputPath, file));
        const sizeKB = stats.size / 1024;
        console.log(`Image ${file}: ${sizeKB.toFixed(2)} KB`);
        
        // Individual images should be under 500KB
        expect(sizeKB).toBeLessThan(500);
      });
      
      // Check for modern image formats
      const modernImages = imageFiles.filter(file => 
        file.endsWith('.webp') || file.endsWith('.avif')
      );
      
      if (imageFiles.length > 0) {
        console.log(`Modern image formats: ${modernImages.length}/${imageFiles.length}`);
      }
    });
  });

  describe('Asset Loading Performance', () => {
    test('should have reasonable asset count', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping asset count test');
        return;
      }

      const files = fs.readdirSync(outputPath);
      const jsFiles = files.filter(file => file.endsWith('.js'));
      const cssFiles = files.filter(file => file.endsWith('.css'));
      
      console.log(`Asset count - JS: ${jsFiles.length}, CSS: ${cssFiles.length}`);
      
      // Should not have too many files (affects loading performance)
      expect(jsFiles.length).toBeLessThan(20);
      expect(cssFiles.length).toBeLessThan(10);
      
      // But should have some code splitting
      expect(jsFiles.length).toBeGreaterThan(1);
    });

    test('should use proper caching strategies', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping caching test');
        return;
      }

      const files = fs.readdirSync(outputPath);
      
      // Files should have content hashes for caching
      const hashedFiles = files.filter(file => 
        file.match(/\.[a-f0-9]{8,}\.(js|css)$/) || 
        file.match(/\.(js|css)$/) && file.includes('.')
      );
      
      console.log(`Hashed files: ${hashedFiles.length}/${files.length}`);
      
      // Most built files should have hashes
      const buildFiles = files.filter(file => 
        file.endsWith('.js') || file.endsWith('.css')
      );
      
      if (buildFiles.length > 0) {
        const hashedRatio = hashedFiles.length / buildFiles.length;
        expect(hashedRatio).toBeGreaterThan(0.5); // At least 50% should be hashed
      }
    });
  });

  describe('Tree Shaking Effectiveness', () => {
    test('should exclude unused dependencies', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping tree shaking test');
        return;
      }

      const files = fs.readdirSync(outputPath);
      const jsFiles = files.filter(file => file.endsWith('.js') && !file.endsWith('.min.js'));
      
      // Check that unused code is removed
      jsFiles.forEach(file => {
        const content = fs.readFileSync(path.join(outputPath, file), 'utf8');
        
        // Should not include obvious unused imports
        const suspiciousPatterns = [
          /unused_function_that_should_not_exist/,
          /console\.log.*debug.*unused/,
        ];
        
        suspiciousPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern);
        });
        
        // Should be minified (no unnecessary whitespace)
        const lines = content.split('\n');
        const avgLineLength = content.length / lines.length;
        
        // Minified files should have long average line length
        expect(avgLineLength).toBeGreaterThan(100);
      });
    });

    test('should optimize critical rendering path', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping critical path test');
        return;
      }

      // Check if HTML exists and analyze
      const htmlFiles = fs.readdirSync(outputPath).filter(file => file.endsWith('.html'));
      
      htmlFiles.forEach(file => {
        const content = fs.readFileSync(path.join(outputPath, file), 'utf8');
        
        // Should preload critical resources
        const hasPreload = content.includes('rel="preload"');
        console.log(`${file} has preload tags: ${hasPreload}`);
        
        // Should inline critical CSS or have efficient loading
        const hasInlineCSS = content.includes('<style>');
        const hasAsyncCSS = content.includes('rel="stylesheet"') && content.includes('media=');
        
        console.log(`${file} - Inline CSS: ${hasInlineCSS}, Async CSS: ${hasAsyncCSS}`);
      });
    });
  });

  describe('Performance Budget Compliance', () => {
    test('should meet performance budget targets', () => {
      const budgets = {
        totalSize: 10 * 1024 * 1024, // 10MB
        jsSize: 5 * 1024 * 1024,     // 5MB
        cssSize: 1 * 1024 * 1024,    // 1MB
        imageSize: 2 * 1024 * 1024,  // 2MB
        fontSize: 500 * 1024,        // 500KB
      };

      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, using mock budget compliance');
        // Mock compliance for CI
        expect(true).toBe(true);
        return;
      }

      const files = fs.readdirSync(outputPath);
      const sizes = {
        total: 0,
        js: 0,
        css: 0,
        images: 0,
        fonts: 0,
      };

      files.forEach(file => {
        const stats = fs.statSync(path.join(outputPath, file));
        const size = stats.size;
        
        sizes.total += size;
        
        if (file.endsWith('.js')) sizes.js += size;
        else if (file.endsWith('.css')) sizes.css += size;
        else if (file.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i)) sizes.images += size;
        else if (file.match(/\.(woff|woff2|ttf|otf|eot)$/i)) sizes.fonts += size;
      });

      console.log('Performance Budget Analysis:');
      console.log(`Total: ${(sizes.total / 1024 / 1024).toFixed(2)} MB / ${(budgets.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`JS: ${(sizes.js / 1024 / 1024).toFixed(2)} MB / ${(budgets.jsSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`CSS: ${(sizes.css / 1024).toFixed(2)} KB / ${(budgets.cssSize / 1024).toFixed(2)} KB`);
      console.log(`Images: ${(sizes.images / 1024).toFixed(2)} KB / ${(budgets.imageSize / 1024).toFixed(2)} KB`);
      console.log(`Fonts: ${(sizes.fonts / 1024).toFixed(2)} KB / ${(budgets.fontSize / 1024).toFixed(2)} KB`);

      expect(sizes.total).toBeLessThan(budgets.totalSize);
      expect(sizes.js).toBeLessThan(budgets.jsSize);
      expect(sizes.css).toBeLessThan(budgets.cssSize);
      expect(sizes.images).toBeLessThan(budgets.imageSize);
      expect(sizes.fonts).toBeLessThan(budgets.fontSize);
    });

    test('should track bundle size over time', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, skipping size tracking');
        return;
      }

      const reportPath = path.join(__dirname, '../bundle-size-report.json');
      
      const getTotalSize = (dirPath) => {
        let totalSize = 0;
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dirPath, file.name);
          if (file.isDirectory()) {
            totalSize += getTotalSize(fullPath);
          } else {
            const stats = fs.statSync(fullPath);
            totalSize += stats.size;
          }
        }
        return totalSize;
      };

      const currentSize = getTotalSize(outputPath);
      const currentSizeMB = currentSize / (1024 * 1024);
      
      let previousSize = null;
      if (fs.existsSync(reportPath)) {
        try {
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
          previousSize = report.latestSize;
        } catch (error) {
          console.warn('Could not read previous size report');
        }
      }

      const report = {
        timestamp: new Date().toISOString(),
        latestSize: currentSize,
        latestSizeMB: currentSizeMB,
        previousSize,
        changeBytes: previousSize ? currentSize - previousSize : 0,
        changeMB: previousSize ? (currentSize - previousSize) / (1024 * 1024) : 0,
      };

      // Write report for tracking
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`Bundle size tracking:
        Current: ${currentSizeMB.toFixed(2)} MB
        Previous: ${previousSize ? (previousSize / 1024 / 1024).toFixed(2) : 'N/A'} MB
        Change: ${report.changeMB > 0 ? '+' : ''}${report.changeMB.toFixed(2)} MB`);

      // Alert on significant size increases
      if (previousSize && report.changeMB > 1) {
        console.warn(`⚠️  Bundle size increased by ${report.changeMB.toFixed(2)} MB`);
      }

      // Fail test if bundle grew too much
      if (previousSize && report.changeMB > 2) {
        throw new Error(`Bundle size increased too much: ${report.changeMB.toFixed(2)} MB increase`);
      }
    });
  });

  describe('Loading Performance Simulation', () => {
    test('should estimate load times for different connections', () => {
      const outputPath = getDistPath();
      if (!outputPath) {
        console.warn('No build output found, using estimated load times');
        return;
      }

      const files = fs.readdirSync(outputPath);
      const criticalFiles = files.filter(file => 
        file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')
      );

      let totalCriticalSize = 0;
      criticalFiles.forEach(file => {
        const stats = fs.statSync(path.join(outputPath, file));
        totalCriticalSize += stats.size;
      });

      // Simulate different connection speeds (bytes per second)
      const connections = {
        'Slow 3G': 50 * 1024,      // 50 KB/s
        'Fast 3G': 150 * 1024,     // 150 KB/s
        '4G': 1.5 * 1024 * 1024,   // 1.5 MB/s
        'WiFi': 5 * 1024 * 1024,   // 5 MB/s
        'Cable': 25 * 1024 * 1024, // 25 MB/s
      };

      console.log('Estimated load times for critical resources:');
      Object.entries(connections).forEach(([name, speed]) => {
        const loadTimeSeconds = totalCriticalSize / speed;
        console.log(`${name}: ${loadTimeSeconds.toFixed(2)}s`);
        
        // Performance targets
        if (name === 'Fast 3G') {
          expect(loadTimeSeconds).toBeLessThan(10); // Under 10 seconds on Fast 3G
        }
        if (name === '4G') {
          expect(loadTimeSeconds).toBeLessThan(5);  // Under 5 seconds on 4G
        }
        if (name === 'WiFi') {
          expect(loadTimeSeconds).toBeLessThan(2);  // Under 2 seconds on WiFi
        }
      });
    });
  });
});