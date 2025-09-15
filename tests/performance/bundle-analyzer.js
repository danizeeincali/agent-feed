/**
 * Bundle Size Regression Detection
 *
 * Analyzes webpack bundle sizes and detects regressions
 * Automatically fails builds if bundle size exceeds thresholds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const BUNDLE_SIZE_THRESHOLDS = {
  main: 300 * 1024,      // 300KB
  vendor: 200 * 1024,    // 200KB
  total: 512 * 1024,     // 512KB total
  chunk: 100 * 1024,     // 100KB per chunk
  asset: 50 * 1024       // 50KB per asset
};

const REGRESSION_THRESHOLD = 0.05; // 5% increase triggers failure

class BundleAnalyzer {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(process.cwd(), 'dist');
    this.reportDir = options.reportDir || path.join(process.cwd(), 'tests/performance/reports');
    this.baselineFile = path.join(this.reportDir, 'bundle-baseline.json');
    this.thresholds = { ...BUNDLE_SIZE_THRESHOLDS, ...options.thresholds };

    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Analyze current bundle sizes
   */
  async analyzeBundles() {
    const stats = await this.getWebpackStats();
    const analysis = this.processBundleStats(stats);

    // Save current analysis
    const reportFile = path.join(this.reportDir, `bundle-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(analysis, null, 2));

    return analysis;
  }

  /**
   * Get webpack bundle statistics
   */
  getWebpackStats() {
    try {
      // Build the project and get stats
      const statsJson = execSync('npm run build -- --json', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      return JSON.parse(statsJson);
    } catch (error) {
      throw new Error(`Failed to get webpack stats: ${error.message}`);
    }
  }

  /**
   * Process webpack stats into analysis data
   */
  processBundleStats(stats) {
    const assets = stats.assets || [];
    const chunks = stats.chunks || [];

    const analysis = {
      timestamp: new Date().toISOString(),
      total: {
        size: assets.reduce((sum, asset) => sum + asset.size, 0),
        count: assets.length
      },
      chunks: {},
      assets: [],
      modules: this.analyzeModules(stats.modules || []),
      treemap: this.generateTreemap(stats)
    };

    // Analyze individual chunks
    chunks.forEach(chunk => {
      const chunkAssets = assets.filter(asset =>
        chunk.files && chunk.files.includes(asset.name)
      );

      analysis.chunks[chunk.names[0] || chunk.id] = {
        size: chunkAssets.reduce((sum, asset) => sum + asset.size, 0),
        assets: chunkAssets.map(asset => ({
          name: asset.name,
          size: asset.size
        }))
      };
    });

    // Analyze individual assets
    analysis.assets = assets.map(asset => ({
      name: asset.name,
      size: asset.size,
      type: this.getAssetType(asset.name),
      chunks: asset.chunks || []
    }));

    return analysis;
  }

  /**
   * Analyze module sizes and dependencies
   */
  analyzeModules(modules) {
    const moduleAnalysis = {
      total: modules.length,
      bySize: modules
        .sort((a, b) => b.size - a.size)
        .slice(0, 20)
        .map(module => ({
          name: module.name,
          size: module.size,
          reasons: module.reasons ? module.reasons.length : 0
        })),
      duplicates: this.findDuplicateModules(modules),
      unused: this.findUnusedModules(modules)
    };

    return moduleAnalysis;
  }

  /**
   * Find duplicate modules that could be deduplicated
   */
  findDuplicateModules(modules) {
    const moduleMap = new Map();

    modules.forEach(module => {
      const normalizedName = module.name
        .replace(/\?.*$/, '') // Remove query params
        .replace(/\/index\.js$/, '') // Normalize index files
        .replace(/node_modules\/([^/]+)\/.*/, 'node_modules/$1'); // Group by package

      if (!moduleMap.has(normalizedName)) {
        moduleMap.set(normalizedName, []);
      }
      moduleMap.get(normalizedName).push(module);
    });

    return Array.from(moduleMap.entries())
      .filter(([, instances]) => instances.length > 1)
      .map(([name, instances]) => ({
        name,
        instances: instances.length,
        totalSize: instances.reduce((sum, instance) => sum + instance.size, 0),
        wastedSize: instances.slice(1).reduce((sum, instance) => sum + instance.size, 0)
      }))
      .sort((a, b) => b.wastedSize - a.wastedSize);
  }

  /**
   * Find potentially unused modules
   */
  findUnusedModules(modules) {
    return modules
      .filter(module =>
        !module.reasons ||
        module.reasons.length === 0 ||
        module.reasons.every(reason => reason.type === 'accepted')
      )
      .map(module => ({
        name: module.name,
        size: module.size
      }))
      .sort((a, b) => b.size - a.size);
  }

  /**
   * Generate treemap data for visualization
   */
  generateTreemap(stats) {
    const modules = stats.modules || [];
    const treemap = { name: 'root', children: [] };

    modules.forEach(module => {
      if (module.name.includes('node_modules')) {
        const packageMatch = module.name.match(/node_modules\/([^/]+)/);
        if (packageMatch) {
          const packageName = packageMatch[1];
          let packageNode = treemap.children.find(child => child.name === packageName);

          if (!packageNode) {
            packageNode = { name: packageName, size: 0, children: [] };
            treemap.children.push(packageNode);
          }

          packageNode.size += module.size;
        }
      } else {
        treemap.children.push({
          name: module.name,
          size: module.size
        });
      }
    });

    return treemap;
  }

  /**
   * Get asset type from filename
   */
  getAssetType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const typeMap = {
      '.js': 'javascript',
      '.css': 'stylesheet',
      '.png': 'image',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.gif': 'image',
      '.svg': 'image',
      '.woff': 'font',
      '.woff2': 'font',
      '.ttf': 'font',
      '.eot': 'font'
    };

    return typeMap[ext] || 'other';
  }

  /**
   * Compare current analysis with baseline
   */
  async detectRegression(currentAnalysis) {
    if (!fs.existsSync(this.baselineFile)) {
      // No baseline exists, save current as baseline
      fs.writeFileSync(this.baselineFile, JSON.stringify(currentAnalysis, null, 2));
      console.log('No baseline found. Current analysis saved as baseline.');
      return { hasRegression: false, baseline: null, current: currentAnalysis };
    }

    const baseline = JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));
    const comparison = this.compareAnalysis(baseline, currentAnalysis);

    return {
      hasRegression: comparison.hasRegression,
      baseline,
      current: currentAnalysis,
      comparison
    };
  }

  /**
   * Compare two bundle analyses
   */
  compareAnalysis(baseline, current) {
    const comparison = {
      hasRegression: false,
      regressions: [],
      improvements: [],
      totalSizeChange: current.total.size - baseline.total.size,
      totalSizeChangePercent: ((current.total.size - baseline.total.size) / baseline.total.size) * 100
    };

    // Check overall size regression
    if (comparison.totalSizeChangePercent > REGRESSION_THRESHOLD * 100) {
      comparison.hasRegression = true;
      comparison.regressions.push({
        type: 'total_size',
        baseline: baseline.total.size,
        current: current.total.size,
        change: comparison.totalSizeChange,
        changePercent: comparison.totalSizeChangePercent
      });
    }

    // Check individual chunk regressions
    Object.keys(current.chunks).forEach(chunkName => {
      const currentChunk = current.chunks[chunkName];
      const baselineChunk = baseline.chunks[chunkName];

      if (baselineChunk) {
        const chunkChange = currentChunk.size - baselineChunk.size;
        const chunkChangePercent = (chunkChange / baselineChunk.size) * 100;

        if (chunkChangePercent > REGRESSION_THRESHOLD * 100) {
          comparison.hasRegression = true;
          comparison.regressions.push({
            type: 'chunk_size',
            name: chunkName,
            baseline: baselineChunk.size,
            current: currentChunk.size,
            change: chunkChange,
            changePercent: chunkChangePercent
          });
        }
      } else {
        // New chunk
        comparison.regressions.push({
          type: 'new_chunk',
          name: chunkName,
          size: currentChunk.size
        });
      }
    });

    // Check threshold violations
    if (current.total.size > this.thresholds.total) {
      comparison.hasRegression = true;
      comparison.regressions.push({
        type: 'threshold_violation',
        metric: 'total_size',
        threshold: this.thresholds.total,
        actual: current.total.size
      });
    }

    return comparison;
  }

  /**
   * Generate human-readable report
   */
  generateReport(analysis, regression = null) {
    const formatSize = (bytes) => {
      const kb = bytes / 1024;
      return kb > 1024 ? `${(kb / 1024).toFixed(2)}MB` : `${kb.toFixed(2)}KB`;
    };

    let report = `
Bundle Size Analysis Report
==========================

Generated: ${new Date().toISOString()}

Total Bundle Size: ${formatSize(analysis.total.size)}
Total Assets: ${analysis.total.count}

Chunk Breakdown:
`;

    Object.entries(analysis.chunks).forEach(([name, chunk]) => {
      report += `  ${name}: ${formatSize(chunk.size)} (${chunk.assets.length} assets)\n`;
    });

    report += `\nLargest Modules:\n`;
    analysis.modules.bySize.slice(0, 10).forEach(module => {
      report += `  ${module.name}: ${formatSize(module.size)}\n`;
    });

    if (analysis.modules.duplicates.length > 0) {
      report += `\nDuplicate Modules (Potential Savings):\n`;
      analysis.modules.duplicates.slice(0, 5).forEach(duplicate => {
        report += `  ${duplicate.name}: ${duplicate.instances} instances, ${formatSize(duplicate.wastedSize)} wasted\n`;
      });
    }

    if (regression) {
      report += `\nRegression Analysis:\n`;
      if (regression.hasRegression) {
        report += `❌ REGRESSION DETECTED\n`;
        regression.comparison.regressions.forEach(reg => {
          switch (reg.type) {
            case 'total_size':
              report += `  Total size increased by ${formatSize(reg.change)} (${reg.changePercent.toFixed(2)}%)\n`;
              break;
            case 'chunk_size':
              report += `  Chunk '${reg.name}' increased by ${formatSize(reg.change)} (${reg.changePercent.toFixed(2)}%)\n`;
              break;
            case 'threshold_violation':
              report += `  ${reg.metric} (${formatSize(reg.actual)}) exceeds threshold (${formatSize(reg.threshold)})\n`;
              break;
          }
        });
      } else {
        report += `✅ No regressions detected\n`;
        report += `  Size change: ${formatSize(regression.comparison.totalSizeChange)} (${regression.comparison.totalSizeChangePercent.toFixed(2)}%)\n`;
      }
    }

    return report;
  }

  /**
   * Update baseline with current analysis
   */
  updateBaseline(analysis) {
    fs.writeFileSync(this.baselineFile, JSON.stringify(analysis, null, 2));
    console.log('Baseline updated with current analysis.');
  }
}

// CLI interface
async function main() {
  const analyzer = new BundleAnalyzer();

  try {
    console.log('Analyzing bundle sizes...');
    const analysis = await analyzer.analyzeBundles();

    console.log('Detecting regressions...');
    const regression = await analyzer.detectRegression(analysis);

    const report = analyzer.generateReport(analysis, regression);
    console.log(report);

    // Save report
    const reportFile = path.join(analyzer.reportDir, 'bundle-report.txt');
    fs.writeFileSync(reportFile, report);

    if (regression.hasRegression) {
      console.error('❌ Bundle size regression detected!');
      process.exit(1);
    } else {
      console.log('✅ No bundle size regressions detected.');

      // Update baseline if this is main branch
      if (process.env.GITHUB_REF === 'refs/heads/main' || process.env.UPDATE_BASELINE) {
        analyzer.updateBaseline(analysis);
      }
    }
  } catch (error) {
    console.error('Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BundleAnalyzer;