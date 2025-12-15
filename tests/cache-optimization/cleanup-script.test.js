const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Cache Cleanup Script', () => {
  const testDir = path.join(os.tmpdir(), 'claude-cache-test-' + Date.now());
  const scriptPath = path.join(__dirname, '../../scripts/cleanup-claude-cache.sh');

  beforeAll(() => {
    // Create test directory structure
    fs.mkdirSync(path.join(testDir, '.claude/config/projects'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.claude/config/todos'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.claude/config/shell-snapshots'), { recursive: true });
  });

  afterAll(() => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should delete files older than 7 days', () => {
    // Create test file with old timestamp
    const testFile = path.join(testDir, '.claude/config/projects/test-old-file.jsonl');
    const sevenDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago

    fs.writeFileSync(testFile, 'test content');
    fs.utimesSync(testFile, new Date(sevenDaysAgo), new Date(sevenDaysAgo));

    expect(fs.existsSync(testFile)).toBe(true);

    // Run cleanup (not dry-run)
    const result = spawnSync('bash', [scriptPath, '--days', '7'], {
      cwd: testDir,
      encoding: 'utf8'
    });

    // Verify file was deleted
    expect(fs.existsSync(testFile)).toBe(false);
  });

  test('should keep files younger than 7 days', () => {
    // Create recent file
    const recentFile = path.join(testDir, '.claude/config/projects/test-recent-file.jsonl');
    fs.writeFileSync(recentFile, 'recent content');

    expect(fs.existsSync(recentFile)).toBe(true);

    // Run cleanup
    spawnSync('bash', [scriptPath, '--days', '7'], {
      cwd: testDir,
      encoding: 'utf8'
    });

    // Verify file still exists
    expect(fs.existsSync(recentFile)).toBe(true);

    // Cleanup
    fs.unlinkSync(recentFile);
  });

  test('should report space saved', () => {
    // Create test files
    const testFile1 = path.join(testDir, '.claude/config/projects/space-test-1.jsonl');
    const testFile2 = path.join(testDir, '.claude/config/todos/space-test-2.jsonl');
    const oldTimestamp = Date.now() - (10 * 24 * 60 * 60 * 1000);

    fs.writeFileSync(testFile1, 'x'.repeat(1000)); // 1KB
    fs.writeFileSync(testFile2, 'y'.repeat(2000)); // 2KB
    fs.utimesSync(testFile1, new Date(oldTimestamp), new Date(oldTimestamp));
    fs.utimesSync(testFile2, new Date(oldTimestamp), new Date(oldTimestamp));

    // Run cleanup
    const result = spawnSync('bash', [scriptPath, '--days', '7'], {
      cwd: testDir,
      encoding: 'utf8'
    });

    // Verify output contains space information
    expect(result.stdout).toMatch(/Current size:|Space reclaimed:/);
  });

  test('should handle empty directories gracefully', () => {
    const emptyTestDir = path.join(os.tmpdir(), 'claude-empty-test-' + Date.now());
    fs.mkdirSync(path.join(emptyTestDir, '.claude/config/projects'), { recursive: true });
    fs.mkdirSync(path.join(emptyTestDir, '.claude/config/todos'), { recursive: true });
    fs.mkdirSync(path.join(emptyTestDir, '.claude/config/shell-snapshots'), { recursive: true });

    // Run cleanup on empty directories
    const result = spawnSync('bash', [scriptPath, '--days', '7'], {
      cwd: emptyTestDir,
      encoding: 'utf8'
    });

    // Should complete without errors
    expect(result.status).toBe(0);

    // Cleanup
    fs.rmSync(emptyTestDir, { recursive: true, force: true });
  });

  test('should work with --dry-run flag', () => {
    // Create old test file
    const testFile = path.join(testDir, '.claude/config/projects/dry-run-test.jsonl');
    const oldTimestamp = Date.now() - (10 * 24 * 60 * 60 * 1000);

    fs.writeFileSync(testFile, 'dry run test');
    fs.utimesSync(testFile, new Date(oldTimestamp), new Date(oldTimestamp));

    // Run with dry-run flag
    const result = spawnSync('bash', [scriptPath, '--dry-run', '--days', '7'], {
      cwd: testDir,
      encoding: 'utf8'
    });

    // Verify dry-run message in output
    expect(result.stdout).toMatch(/DRY RUN MODE/i);

    // Verify file still exists (not deleted in dry-run)
    expect(fs.existsSync(testFile)).toBe(true);

    // Cleanup
    fs.unlinkSync(testFile);
  });

  test('should integrate with npm script', () => {
    // Test if script is executable via npm
    const packageJsonPath = path.join(__dirname, '../../package.json');

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Verify npm scripts are defined
      expect(packageJson.scripts).toHaveProperty('cache:cleanup');
      expect(packageJson.scripts).toHaveProperty('cache:cleanup:dry-run');
    }
  });

  test('should accept custom retention days parameter', () => {
    // Create file that's 5 days old
    const testFile = path.join(testDir, '.claude/config/projects/custom-days-test.jsonl');
    const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);

    fs.writeFileSync(testFile, 'custom days test');
    fs.utimesSync(testFile, new Date(fiveDaysAgo), new Date(fiveDaysAgo));

    // Run with --days 3 (should delete files older than 3 days)
    spawnSync('bash', [scriptPath, '--days', '3'], {
      cwd: testDir,
      encoding: 'utf8'
    });

    // File should be deleted since it's 5 days old and threshold is 3
    expect(fs.existsSync(testFile)).toBe(false);
  });

  test('should handle multiple file types in different directories', () => {
    // Create old files in all three directories
    const projectFile = path.join(testDir, '.claude/config/projects/multi-1.jsonl');
    const todoFile = path.join(testDir, '.claude/config/todos/multi-2.json');
    const shellFile = path.join(testDir, '.claude/config/shell-snapshots/multi-3.sh');
    const oldTimestamp = Date.now() - (10 * 24 * 60 * 60 * 1000);

    fs.writeFileSync(projectFile, 'project data');
    fs.writeFileSync(todoFile, 'todo data');
    fs.writeFileSync(shellFile, 'shell data');

    fs.utimesSync(projectFile, new Date(oldTimestamp), new Date(oldTimestamp));
    fs.utimesSync(todoFile, new Date(oldTimestamp), new Date(oldTimestamp));
    fs.utimesSync(shellFile, new Date(oldTimestamp), new Date(oldTimestamp));

    // Run cleanup
    spawnSync('bash', [scriptPath, '--days', '7'], {
      cwd: testDir,
      encoding: 'utf8'
    });

    // All files should be deleted
    expect(fs.existsSync(projectFile)).toBe(false);
    expect(fs.existsSync(todoFile)).toBe(false);
    expect(fs.existsSync(shellFile)).toBe(false);
  });
});
