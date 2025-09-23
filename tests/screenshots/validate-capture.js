#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const BASELINE_DIR = '/workspaces/agent-feed/tests/screenshots/baseline';

async function validateScreenshots() {
  console.log('🔍 Validating screenshot capture...\n');

  const expectedScreenshots = {
    desktop: {
      pages: ['home-desktop.png', 'home-viewport-desktop.png', 'agents-desktop.png', 'agents-viewport-desktop.png', 'feed-desktop.png', 'feed-viewport-desktop.png'],
      components: ['navigation-nav-desktop.png', 'main-content-desktop.png']
    },
    mobile: {
      pages: ['home-mobile.png', 'home-viewport-mobile.png', 'agents-mobile.png', 'agents-viewport-mobile.png', 'feed-mobile.png', 'feed-viewport-mobile.png'],
      components: ['main-content-mobile.png']
    }
  };

  let totalExpected = 0;
  let totalFound = 0;
  const missing = [];
  const found = [];

  for (const [viewport, categories] of Object.entries(expectedScreenshots)) {
    for (const [category, files] of Object.entries(categories)) {
      const dirPath = path.join(BASELINE_DIR, viewport, category);

      for (const file of files) {
        totalExpected++;
        const filePath = path.join(dirPath, file);

        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && stats.size > 0) {
            totalFound++;
            found.push({
              file: `${viewport}/${category}/${file}`,
              size: Math.round(stats.size / 1024),
              modified: stats.mtime
            });
          } else {
            missing.push(`${viewport}/${category}/${file} (empty file)`);
          }
        } catch (error) {
          missing.push(`${viewport}/${category}/${file} (not found)`);
        }
      }
    }
  }

  // Check for extra files
  const extraFiles = [];

  async function scanForExtras(dir, relativePath = '') {
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relPath = path.join(relativePath, item.name);

        if (item.isDirectory()) {
          await scanForExtras(fullPath, relPath);
        } else if (item.name.endsWith('.png')) {
          const isExpected = found.some(f => f.file === relPath);
          if (!isExpected) {
            const stats = await fs.stat(fullPath);
            extraFiles.push({
              file: relPath,
              size: Math.round(stats.size / 1024),
              modified: stats.mtime
            });
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist, skip
    }
  }

  await scanForExtras(BASELINE_DIR);

  // Generate report
  console.log('📊 SCREENSHOT VALIDATION RESULTS');
  console.log('================================\n');

  console.log(`✅ Expected screenshots: ${totalExpected}`);
  console.log(`✅ Found screenshots: ${totalFound}`);
  console.log(`❌ Missing screenshots: ${missing.length}`);
  console.log(`➕ Extra screenshots: ${extraFiles.length}\n`);

  if (missing.length > 0) {
    console.log('❌ MISSING SCREENSHOTS:');
    missing.forEach(file => console.log(`   - ${file}`));
    console.log();
  }

  if (extraFiles.length > 0) {
    console.log('➕ EXTRA SCREENSHOTS:');
    extraFiles.forEach(file => console.log(`   - ${file.file} (${file.size}KB)`));
    console.log();
  }

  console.log('✅ CAPTURED SCREENSHOTS:');
  const groupedFiles = {};
  found.forEach(file => {
    const [viewport, category] = file.file.split('/');
    const key = `${viewport} ${category}`;
    if (!groupedFiles[key]) groupedFiles[key] = [];
    groupedFiles[key].push(file);
  });

  Object.entries(groupedFiles).forEach(([category, files]) => {
    console.log(`   ${category}:`);
    files.forEach(file => {
      const fileName = file.file.split('/').pop();
      console.log(`     - ${fileName} (${file.size}KB)`);
    });
  });

  // Check for layout issues
  console.log('\n🔍 LAYOUT ISSUE ANALYSIS:');
  try {
    const issueFiles = await fs.readdir(BASELINE_DIR, { recursive: true });
    const layoutIssues = issueFiles.filter(f => f.endsWith('-issues.txt'));

    if (layoutIssues.length > 0) {
      console.log('⚠️  Layout issues detected:');
      for (const issueFile of layoutIssues) {
        try {
          const content = await fs.readFile(path.join(BASELINE_DIR, issueFile), 'utf8');
          const pageName = issueFile.replace('-issues.txt', '');
          console.log(`   ${pageName}: ${content.split('\n').join(', ')}`);
        } catch (error) {
          console.log(`   ${issueFile}: Could not read issue file`);
        }
      }
    } else {
      console.log('✅ No specific layout issue files found');
    }
  } catch (error) {
    console.log('ℹ️  Could not scan for layout issue files');
  }

  // Overall status
  console.log('\n🎯 OVERALL STATUS:');
  const completionRate = Math.round((totalFound / totalExpected) * 100);

  if (completionRate === 100 && missing.length === 0) {
    console.log('🎉 SUCCESS: All expected screenshots captured successfully!');
  } else if (completionRate >= 80) {
    console.log(`⚠️  PARTIAL SUCCESS: ${completionRate}% of screenshots captured`);
  } else {
    console.log(`❌ INCOMPLETE: Only ${completionRate}% of screenshots captured`);
  }

  console.log(`\n📁 Screenshots location: ${BASELINE_DIR}`);
  console.log(`📊 Total size: ${found.reduce((sum, f) => sum + f.size, 0)}KB`);

  return {
    expected: totalExpected,
    found: totalFound,
    missing: missing.length,
    extra: extraFiles.length,
    completionRate
  };
}

// Run validation
validateScreenshots()
  .then(results => {
    if (results.completionRate >= 80) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });