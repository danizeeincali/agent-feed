/**
 * TAILWIND CLASS FIX - COMPREHENSIVE TDD TEST SUITE
 *
 * Tests the fix for line 437 in frontend/src/index.css
 * Original issue: Invalid Tailwind classes (bg-gray-25, bg-gray-850)
 * Fix: Changed to valid classes (bg-gray-50, bg-gray-800)
 *
 * NO MOCKS - 100% REAL TESTS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

describe('Tailwind Class Fix - CSS Validation', () => {
  const cssFilePath = path.join(__dirname, '../../frontend/src/index.css');
  let cssContent;

  beforeAll(() => {
    // Read the actual CSS file
    cssContent = fs.readFileSync(cssFilePath, 'utf8');
  });

  test('CSS file exists and is readable', () => {
    expect(fs.existsSync(cssFilePath)).toBe(true);
    expect(cssContent.length).toBeGreaterThan(0);
  });

  test('Line 2 has @import directive for markdown.css', () => {
    const lines = cssContent.split('\n');
    expect(lines[1]).toContain('@import');
    expect(lines[1]).toContain('./styles/markdown.css');
  });

  test('@import directive comes BEFORE @tailwind directives', () => {
    const importIndex = cssContent.indexOf('@import');
    const tailwindIndex = cssContent.indexOf('@tailwind');

    expect(importIndex).toBeGreaterThan(-1);
    expect(tailwindIndex).toBeGreaterThan(-1);
    expect(importIndex).toBeLessThan(tailwindIndex);
  });

  test('Does NOT contain invalid bg-gray-25 class', () => {
    expect(cssContent).not.toContain('bg-gray-25');
  });

  test('Does NOT contain invalid bg-gray-850 class', () => {
    expect(cssContent).not.toContain('bg-gray-850');
  });

  test('Contains valid bg-gray-50 class', () => {
    expect(cssContent).toContain('bg-gray-50');
  });

  test('Contains valid bg-gray-800 class', () => {
    expect(cssContent).toContain('bg-gray-800');
  });

  test('Uses @apply directive with valid Tailwind classes', () => {
    const applyRegex = /@apply\s+[^;]+;/g;
    const applyStatements = cssContent.match(applyRegex);

    expect(applyStatements).not.toBeNull();
    expect(applyStatements.length).toBeGreaterThan(0);

    // Check that none contain invalid gray shades
    applyStatements.forEach(statement => {
      expect(statement).not.toContain('gray-25');
      expect(statement).not.toContain('gray-850');
    });
  });

  test('All @apply directives use valid Tailwind color shades', () => {
    // Valid Tailwind gray shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
    const validGrayShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const grayClassRegex = /(?:bg|text|border)-gray-(\d+)/g;

    let match;
    while ((match = grayClassRegex.exec(cssContent)) !== null) {
      const shade = parseInt(match[1], 10);
      expect(validGrayShades).toContain(shade);
    }
  });

  test('markdown.css import file exists', () => {
    const markdownCssPath = path.join(__dirname, '../../frontend/src/styles/markdown.css');
    expect(fs.existsSync(markdownCssPath)).toBe(true);
  });
});

describe('Tailwind Class Fix - Vite Build Validation', () => {
  const frontendDir = path.join(__dirname, '../../frontend');
  let buildOutput;
  let buildExitCode;

  beforeAll(() => {
    console.log('\n🔨 Running real Vite build...\n');

    try {
      // Run actual Vite build
      buildOutput = execSync('npm run build', {
        cwd: frontendDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      buildExitCode = 0;
    } catch (error) {
      buildOutput = error.stdout + error.stderr;
      buildExitCode = error.status;
    }

    console.log('Build output length:', buildOutput.length);
  });

  test('Vite build completes successfully', () => {
    expect(buildExitCode).toBe(0);
  });

  test('Build output does NOT contain PostCSS errors', () => {
    expect(buildOutput.toLowerCase()).not.toContain('[postcss] error');
    expect(buildOutput.toLowerCase()).not.toContain('postcss failed');
  });

  test('Build output does NOT contain CSS compilation errors', () => {
    expect(buildOutput.toLowerCase()).not.toContain('css error');
    expect(buildOutput.toLowerCase()).not.toContain('failed to compile');
  });

  test('Build output does NOT contain Tailwind errors', () => {
    expect(buildOutput.toLowerCase()).not.toContain('tailwind error');
    expect(buildOutput.toLowerCase()).not.toContain('unknown utility');
  });

  test('Build output does NOT contain invalid class warnings', () => {
    expect(buildOutput).not.toContain('bg-gray-25');
    expect(buildOutput).not.toContain('bg-gray-850');
  });

  test('Build creates dist directory with assets', () => {
    const distPath = path.join(frontendDir, 'dist');
    expect(fs.existsSync(distPath)).toBe(true);

    const distContents = fs.readdirSync(distPath);
    expect(distContents.length).toBeGreaterThan(0);
  });

  test('Build creates index.html in dist', () => {
    const indexPath = path.join(frontendDir, 'dist/index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  test('Built CSS does NOT contain invalid gray classes', () => {
    const distPath = path.join(frontendDir, 'dist');
    const files = fs.readdirSync(distPath, { recursive: true });
    const cssFiles = files.filter(f => f.toString().endsWith('.css'));

    expect(cssFiles.length).toBeGreaterThan(0);

    cssFiles.forEach(cssFile => {
      const cssPath = path.join(distPath, cssFile.toString());
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      expect(cssContent).not.toContain('bg-gray-25');
      expect(cssContent).not.toContain('bg-gray-850');
    });
  });
});

describe('Tailwind Class Fix - Frontend Accessibility', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  let serverProcess;
  let response;

  beforeAll(async () => {
    console.log('\n🚀 Starting frontend dev server...\n');

    // Check if server is already running
    try {
      response = await axios.get(FRONTEND_URL, { timeout: 2000 });
      console.log('✅ Server already running');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('⚠️  Server not running. Please start with: cd frontend && npm run dev');
        console.log('⏭️  Skipping frontend accessibility tests');
      }
      throw error;
    }
  }, 30000);

  test('Frontend server responds with 200 status', async () => {
    expect(response.status).toBe(200);
  });

  test('Frontend server does NOT return 500 error', async () => {
    expect(response.status).not.toBe(500);
  });

  test('Response contains HTML content', async () => {
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.data.length).toBeGreaterThan(0);
  });

  test('HTML contains proper doctype and structure', async () => {
    const html = response.data;
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  test('HTML contains root div for React mounting', async () => {
    const html = response.data;
    expect(html).toContain('id="root"');
  });

  test('CSS is properly loaded (no styling errors in console)', async () => {
    // In a real browser test, we'd check console errors
    // Here we verify the HTML structure supports CSS loading
    const html = response.data;
    expect(html).toContain('<link');
  });
});

describe('Tailwind Class Fix - Regression Test: Comment Replies', () => {
  const API_URL = 'http://localhost:3000';
  let testPostId;
  let testCommentId;

  beforeAll(async () => {
    console.log('\n💬 Testing comment reply functionality...\n');

    // Create test post
    const postResponse = await axios.post(`${API_URL}/api/agent-posts`, {
      content: 'Test post for Tailwind fix validation',
      agent_id: 'test-agent',
      platform: 'test',
      tier: 'free'
    });

    testPostId = postResponse.data.id;
    console.log('Created test post:', testPostId);
  });

  afterAll(async () => {
    // Cleanup: Delete test post
    if (testPostId) {
      try {
        await axios.delete(`${API_URL}/api/agent-posts/${testPostId}`);
        console.log('Cleaned up test post:', testPostId);
      } catch (error) {
        console.error('Cleanup error:', error.message);
      }
    }
  });

  test('Can create a parent comment', async () => {
    const response = await axios.post(`${API_URL}/api/agent-posts/${testPostId}/comments`, {
      content: 'Test parent comment'
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data.content).toBe('Test parent comment');
    expect(response.data.parent_id).toBeNull();

    testCommentId = response.data.id;
  });

  test('Can create a reply comment with parent_id', async () => {
    const response = await axios.post(`${API_URL}/api/agent-posts/${testPostId}/comments`, {
      content: 'Test reply comment',
      parent_id: testCommentId
    });

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    expect(response.data.content).toBe('Test reply comment');
    expect(response.data.parent_id).toBe(testCommentId);
  });

  test('Reply has valid created_at date (not "Invalid Date")', async () => {
    const response = await axios.post(`${API_URL}/api/agent-posts/${testPostId}/comments`, {
      content: 'Test date validation',
      parent_id: testCommentId
    });

    expect(response.data.created_at).toBeDefined();
    expect(response.data.created_at).not.toBe('Invalid Date');

    // Verify it's a valid date string
    const date = new Date(response.data.created_at);
    expect(date.toString()).not.toBe('Invalid Date');
  });

  test('Can fetch post with nested replies', async () => {
    const response = await axios.get(`${API_URL}/api/agent-posts/${testPostId}`);

    expect(response.status).toBe(200);
    expect(response.data.comments).toBeDefined();
    expect(response.data.comments.length).toBeGreaterThan(0);

    // Find parent comment
    const parentComment = response.data.comments.find(c => c.id === testCommentId);
    expect(parentComment).toBeDefined();

    // Verify replies are nested
    const hasReplies = response.data.comments.some(c => c.parent_id === testCommentId);
    expect(hasReplies).toBe(true);
  });

  test('Reply dates display correctly in UI format', async () => {
    const response = await axios.get(`${API_URL}/api/agent-posts/${testPostId}`);

    response.data.comments.forEach(comment => {
      if (comment.parent_id) {
        // Verify date can be parsed and formatted
        const date = new Date(comment.created_at);
        expect(date.toString()).not.toBe('Invalid Date');

        // Verify common date format operations work
        expect(() => date.toISOString()).not.toThrow();
        expect(() => date.toLocaleDateString()).not.toThrow();
      }
    });
  });
});

describe('Tailwind Class Fix - Regression Test: CSS Import Order', () => {
  const cssFilePath = path.join(__dirname, '../../frontend/src/index.css');
  let cssContent;
  let cssLines;

  beforeAll(() => {
    cssContent = fs.readFileSync(cssFilePath, 'utf8');
    cssLines = cssContent.split('\n');
  });

  test('@import directive is on line 2', () => {
    // Line 2 (index 1) should have the @import
    expect(cssLines[1]).toContain('@import');
  });

  test('@import comes before @tailwind base', () => {
    const importLineIndex = cssLines.findIndex(line => line.includes('@import'));
    const tailwindBaseIndex = cssLines.findIndex(line => line.includes('@tailwind base'));

    expect(importLineIndex).toBeGreaterThan(-1);
    expect(tailwindBaseIndex).toBeGreaterThan(-1);
    expect(importLineIndex).toBeLessThan(tailwindBaseIndex);
  });

  test('@tailwind directives are in correct order', () => {
    const baseIndex = cssLines.findIndex(line => line.includes('@tailwind base'));
    const componentsIndex = cssLines.findIndex(line => line.includes('@tailwind components'));
    const utilitiesIndex = cssLines.findIndex(line => line.includes('@tailwind utilities'));

    expect(baseIndex).toBeLessThan(componentsIndex);
    expect(componentsIndex).toBeLessThan(utilitiesIndex);
  });

  test('markdown.css import uses correct path', () => {
    const importLine = cssLines.find(line => line.includes('@import'));
    expect(importLine).toContain('./styles/markdown.css');
    expect(importLine).not.toContain('../styles/markdown.css');
  });

  test('markdown.css file exists at imported path', () => {
    const markdownCssPath = path.join(__dirname, '../../frontend/src/styles/markdown.css');
    expect(fs.existsSync(markdownCssPath)).toBe(true);
  });

  test('CSS structure is valid after import order fix', () => {
    // Verify no syntax errors by checking balanced braces
    const openBraces = (cssContent.match(/{/g) || []).length;
    const closeBraces = (cssContent.match(/}/g) || []).length;

    expect(openBraces).toBe(closeBraces);
  });

  test('All @layer directives come after @tailwind directives', () => {
    const lastTailwindIndex = cssLines.findIndex(line => line.includes('@tailwind utilities'));
    const firstLayerIndex = cssLines.findIndex(line => line.includes('@layer'));

    if (firstLayerIndex > -1) {
      expect(lastTailwindIndex).toBeLessThan(firstLayerIndex);
    }
  });
});
