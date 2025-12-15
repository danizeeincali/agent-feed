# Onboarding E2E Test Commands - Quick Reference

## 🚀 Quick Start

```bash
# Run all tests (recommended)
./tests/e2e/run-onboarding-e2e.sh

# Or manually
npx playwright test --config playwright.config.onboarding.ts
```

## 🎯 Specific Test Runs

```bash
# Run only user journey test
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "complete full onboarding"

# Run only real-time update tests
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "Real-Time Updates"

# Run only visual regression tests
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "Visual Regression"

# Run only edge case tests
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "Edge Cases"
```

## 🐛 Debug Mode

```bash
# UI Mode (best for debugging)
npx playwright test --config playwright.config.onboarding.ts --ui

# Step-through debug
npx playwright test --config playwright.config.onboarding.ts --debug

# Headed mode (see browser)
npx playwright test --config playwright.config.onboarding.ts --headed

# Slow motion (500ms between actions)
npx playwright test --config playwright.config.onboarding.ts --headed --slow-mo=500
```

## 📊 Reports

```bash
# Open HTML report
npx playwright show-report tests/e2e/reports

# Generate report without running tests
npx playwright show-report

# View JSON report
cat tests/e2e/reports/onboarding-results.json | jq

# View JUnit XML
cat tests/e2e/reports/onboarding-junit.xml
```

## 📸 Screenshots

```bash
# View all screenshots
ls -lh tests/screenshots/onboarding/

# Open screenshot folder
open tests/screenshots/onboarding/  # macOS
xdg-open tests/screenshots/onboarding/  # Linux

# Count screenshots
ls tests/screenshots/onboarding/*.png | wc -l

# View specific screenshot
open tests/screenshots/onboarding/03-gtk-comment-FAILED.png
```

## 🔍 Traces

```bash
# Generate trace
npx playwright test --config playwright.config.onboarding.ts --trace on

# View trace
npx playwright show-trace tests/e2e/test-results/.../trace.zip

# View all traces
find tests/e2e/test-results -name "trace.zip" -exec npx playwright show-trace {} \;
```

## 🎥 Videos

```bash
# Videos are automatically captured on failure
ls tests/e2e/test-results/*/video.webm

# Play video (macOS)
open tests/e2e/test-results/*/video.webm

# Play video (Linux)
vlc tests/e2e/test-results/*/video.webm
```

## 🌐 Browsers

```bash
# Run in Chromium only (default)
npx playwright test --config playwright.config.onboarding.ts --project=chromium

# Run in Firefox
npx playwright test --config playwright.config.onboarding.ts --project=firefox

# Run in WebKit (Safari)
npx playwright test --config playwright.config.onboarding.ts --project=webkit

# Run in all browsers
npx playwright test --config playwright.config.onboarding.ts --project=chromium --project=firefox --project=webkit
```

## ⚙️ Test Options

```bash
# Increase timeout
npx playwright test --config playwright.config.onboarding.ts --timeout=180000

# Run with retries
npx playwright test --config playwright.config.onboarding.ts --retries=2

# Run with specific workers
npx playwright test --config playwright.config.onboarding.ts --workers=1

# Run with verbose output
npx playwright test --config playwright.config.onboarding.ts --reporter=list

# Run without starting web servers (if already running)
npx playwright test --config playwright.config.onboarding.ts --no-web-server
```

## 🧹 Cleanup

```bash
# Clean test results
rm -rf tests/e2e/test-results/

# Clean reports
rm -rf tests/e2e/reports/

# Clean screenshots
rm -rf tests/screenshots/onboarding/

# Clean all
rm -rf tests/e2e/test-results/ tests/e2e/reports/ tests/screenshots/onboarding/
```

## 🔧 Setup

```bash
# Install Playwright (first time)
npm install -D @playwright/test

# Install browsers
npx playwright install

# Install specific browser
npx playwright install chromium

# Update Playwright
npm install -D @playwright/test@latest
npx playwright install
```

## 🏃 Quick Test & View

```bash
# Run tests and open report
npx playwright test --config playwright.config.onboarding.ts && npx playwright show-report tests/e2e/reports

# Run specific test and open trace
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "complete full onboarding" --trace on && npx playwright show-trace tests/e2e/test-results/.../trace.zip
```

## 📋 Prerequisites Check

```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version

# Check Playwright version
npx playwright --version

# Check browsers installed
npx playwright list-browsers

# Test backend health
curl http://localhost:3001/api/health

# Test frontend health
curl http://localhost:5173
```

## 🎯 Common Workflows

### First Time Setup
```bash
npm install -D @playwright/test
npx playwright install
./tests/e2e/run-onboarding-e2e.sh
```

### Daily Development
```bash
# Quick run
npx playwright test --config playwright.config.onboarding.ts

# Debug failing test
npx playwright test --config playwright.config.onboarding.ts --ui
```

### Before Commit
```bash
# Run all tests
npx playwright test --config playwright.config.onboarding.ts

# Check screenshots
ls tests/screenshots/onboarding/

# Review report
npx playwright show-report tests/e2e/reports
```

### After Implementing Fix
```bash
# Run specific test that was failing
npx playwright test tests/e2e/onboarding-user-flow.spec.ts -g "complete full onboarding"

# If GREEN, run full suite
npx playwright test --config playwright.config.onboarding.ts

# Generate report
npx playwright show-report tests/e2e/reports
```

## 🆘 Help

```bash
# Playwright help
npx playwright test --help

# Show test files
npx playwright test --list

# Show test configuration
npx playwright show-config playwright.config.onboarding.ts
```
