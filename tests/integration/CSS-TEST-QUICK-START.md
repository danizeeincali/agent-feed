# CSS Import Fix Tests - Quick Start Guide

## 🚀 Run Tests (30 seconds)

```bash
# From project root
./tests/RUN-CSS-TESTS.sh
```

## 📋 What Gets Tested

### 1. CSS Syntax (5 tests)
- ✅ @import comes BEFORE @tailwind
- ✅ markdown.css file exists
- ✅ CSS syntax is valid

### 2. Vite Build (3 tests)
- ✅ Build succeeds without CSS errors
- ✅ Markdown styles in bundle
- ✅ TypeScript checks pass

### 3. Markdown Rendering (5 tests)
- ✅ Headings, code blocks, tables render
- ✅ Dark mode styles present
- ✅ Responsive styles present

### 4. Comment Formatting (3 tests)
- ✅ Comments render with markdown
- ✅ Code blocks in comments work

### 5. Regression Tests (3 tests)
- ✅ Comment replies still work
- ✅ Threading preserved
- ✅ Nested replies work

### 6. Syntax Highlighting (2 tests)
- ✅ highlight.js classes present
- ✅ Code block styling configured

### 7. Production Build (3 tests)
- ✅ Import order correct
- ✅ No violations anywhere
- ✅ Production build succeeds

### 8. Performance (3 tests)
- ✅ CSS file size < 100KB
- ✅ No duplicate styles
- ✅ Optimizations present

**Total: 27 comprehensive tests**

## ⚙️ Prerequisites

```bash
# 1. API server must be running
cd api-server && npm start

# 2. Dependencies installed
cd frontend && npm install

# 3. Database exists
ls -la database.db
```

## 🎯 Expected Output

```
╔════════════════════════════════════════════════════════════════╗
║           CSS IMPORT FIX - VALIDATION TEST SUITE               ║
╚════════════════════════════════════════════════════════════════╝

[1/7] Pre-flight Checks
✅ Frontend directory found
✅ Test file found
✅ index.css found
✅ markdown.css found

[2/7] Checking API Server
✅ API server is running on port 3001

[3/7] Quick CSS Syntax Check
✅ CSS import order correct (@import at line 1, @tailwind at line 4)

[4/7] Checking Dependencies
✅ Dependencies already installed

[5/7] Running Vitest Test Suite
 ✓ tests/integration/css-import-fix.test.js (27) 2547ms
   ✓ CSS Import Fix - Integration Tests (27)
     ✓ 1. CSS Syntax Validation (5)
       ✓ should have @import before @tailwind directives
       ✓ should import markdown.css file
       ✓ should have markdown.css file present
       ✓ should have valid markdown.css syntax
       ✓ should have no CSS syntax errors
     ✓ 2. Vite Build Tests (3)
       ✓ should build frontend without CSS errors
       ✓ should generate CSS bundle with markdown styles
       ✓ should typecheck successfully
     ✓ 3. Markdown Content Rendering (5)
       ✓ should fetch post with markdown content
       ✓ should validate markdown styles are available in CSS
       ✓ should have dark mode markdown styles
       ✓ should have responsive markdown styles
       ✓ should handle code blocks with syntax highlighting
     ✓ 4. Comment Markdown Rendering (3)
       ✓ should fetch comment with markdown content
       ✓ should verify markdown styles apply to comments
       ✓ should render code blocks in comments
     ✓ 5. Regression Tests - Comment Replies (3)
       ✓ should create reply with markdown formatting
       ✓ should maintain comment threading with styled content
       ✓ should handle nested replies with code blocks
     ✓ 6. Code Syntax Highlighting (2)
       ✓ should have syntax highlighting styles in markdown.css
       ✓ should have code block styling
     ✓ 7. Production Build Validation (3)
       ✓ should have correct CSS import order in source
       ✓ should not have @import after @tailwind anywhere
       ✓ should build with minification enabled
     ✓ 8. CSS Performance (3)
       ✓ should have reasonable CSS file size
       ✓ should not have duplicate style definitions
       ✓ should use CSS containment for performance

Test Files  1 passed (1)
     Tests  27 passed (27)
  Start at  10:23:45
  Duration  2.55s

✅ All tests passed!

[6/7] Quick Vite Build Test (Optional)
Run full Vite build? This will take 30-60 seconds (y/N):

[7/7] Test Summary
╔════════════════════════════════════════════════════════════════╗
║                    ALL TESTS PASSED! ✅                        ║
╚════════════════════════════════════════════════════════════════╝

CSS Import Fix Status: VALIDATED

✅ CSS import order correct
✅ Vite builds without errors
✅ Markdown styles load correctly
✅ Post formatting works
✅ Comment formatting works
✅ No regression in replies

Test Coverage: 27 comprehensive tests
```

## 🔧 Manual Test

```bash
# Test just the CSS syntax
cd frontend
head -20 src/index.css

# Should see:
# @import './styles/markdown.css';   <- FIRST
#
# @tailwind base;                    <- AFTER
# @tailwind components;
# @tailwind utilities;

# Test build manually
npm run build
# Should succeed with exit code 0
```

## ❌ Troubleshooting

### API Server Not Running
```bash
cd api-server
npm start
# Wait for: "Server running on port 3001"
```

### Tests Skip
```
⚠️  API server not running - some tests will be skipped
```
**Fix:** Start API server first

### Build Fails
```
❌ Vite build failed
Error: "@import must precede all other rules"
```
**Fix:** Check CSS import order:
```bash
grep -n "@import\|@tailwind" frontend/src/index.css
```

### File Not Found
```
❌ markdown.css not found
```
**Fix:** Verify file exists:
```bash
ls -la frontend/src/styles/markdown.css
```

## 📊 Coverage Report

```bash
# Run with coverage
npx vitest run tests/integration/css-import-fix.test.js --coverage

# View HTML report
open coverage/index.html
```

## 🔍 Debug Individual Test

```bash
# Run single test suite
npx vitest run tests/integration/css-import-fix.test.js -t "CSS Syntax"

# Run in watch mode
npx vitest watch tests/integration/css-import-fix.test.js

# Verbose output
npx vitest run tests/integration/css-import-fix.test.js --reporter=verbose
```

## 📁 File Locations

```
tests/
├── integration/
│   ├── css-import-fix.test.js              # Main test suite
│   ├── CSS-TEST-DOCUMENTATION.md           # Full documentation
│   └── CSS-TEST-QUICK-START.md            # This file
└── RUN-CSS-TESTS.sh                        # Test runner

frontend/
├── src/
│   ├── index.css                           # Main CSS (import order critical)
│   └── styles/
│       └── markdown.css                    # Markdown styles (imported)
└── vite.config.ts                          # Vite config
```

## ✅ Success Criteria

- All 27 tests pass
- Vite build succeeds (exit code 0)
- No CSS syntax errors
- Markdown renders correctly
- Comments render correctly
- Reply threading works
- Production build succeeds

## 🚀 Next Steps

After tests pass:
1. Commit CSS fix
2. Push to repository
3. Deploy to production
4. Monitor for CSS issues

## 📚 More Information

See: `tests/integration/CSS-TEST-DOCUMENTATION.md` for comprehensive guide
