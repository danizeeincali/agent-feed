# AviDM Screenshot Validation System

> **Complete screenshot validation for the AviDM port fix (5000 → 3001)**

## 🚀 Quick Start

```bash
cd /workspaces/agent-feed
./scripts/run-screenshot-validation.sh
```

That's it! The system will:
1. Check prerequisites
2. Start services (if needed)
3. Capture 8 screenshots
4. Generate visual comparison
5. Open results in browser

## 📚 Documentation Index

### Getting Started
- **[QUICK-START-EXAMPLES.md](QUICK-START-EXAMPLES.md)** - Quick usage examples and common patterns
- **[SCREENSHOT-GUIDE.md](SCREENSHOT-GUIDE.md)** - Comprehensive guide with troubleshooting
- **[VALIDATION-WORKFLOW.md](VALIDATION-WORKFLOW.md)** - Visual workflow diagrams and architecture

### Reference
- **[SCREENSHOT-VALIDATION-DELIVERABLES.md](../SCREENSHOT-VALIDATION-DELIVERABLES.md)** - Complete deliverables summary

### Scripts
- **[capture-avidm-fix-screenshots.ts](../scripts/capture-avidm-fix-screenshots.ts)** - Main screenshot capture script
- **[run-screenshot-validation.sh](../scripts/run-screenshot-validation.sh)** - Automated runner script

## 📸 What Gets Captured

### 8 Screenshots Showing Complete Flow

| # | Screenshot | Description |
|---|------------|-------------|
| 1 | `01-initial-state.png` | App loaded with main feed |
| 2 | `02-avidm-interface.png` | DM interface opened |
| 3 | `03-message-composed.png` | Test message typed |
| 4 | `04-message-sent.png` | After clicking send |
| 5 | `05-response-loading.png` | Loading indicator |
| 6 | `06-response-received.png` | Full response visible |
| 7 | `07-console-clean.png` | Console with no errors |
| 8 | `08-network-tab.png` | Network tab showing 200 OK |

### Additional Outputs

- **comparison.html** - Beautiful visual comparison page
- **metadata.json** - Technical details (network, console, timing)
- **validation.webm** - Video recording of entire session

## 🎯 What Gets Validated

### ✅ Success Criteria

- All 8 screenshots captured
- API requests return 200 OK (not 403)
- No console errors
- Full response from Claude/Avi
- HTML comparison generated
- JSON metadata exported

### ❌ Failure Indicators

- 403 Forbidden errors in network
- Console shows red errors
- Timeout on Claude response
- Missing screenshots
- Failed API calls

## 📊 Output Structure

```
screenshots/avidm-fix/
├── 01-initial-state.png         # Screenshot 1
├── 02-avidm-interface.png       # Screenshot 2
├── 03-message-composed.png      # Screenshot 3
├── 04-message-sent.png          # Screenshot 4
├── 05-response-loading.png      # Screenshot 5
├── 06-response-received.png     # Screenshot 6
├── 07-console-clean.png         # Screenshot 7
├── 08-network-tab.png           # Screenshot 8
├── comparison.html              # Visual comparison page
├── metadata.json                # Technical details
└── videos/
    └── validation.webm           # Session recording
```

## 🔧 Usage Modes

### Mode 1: Full Automated (Recommended)
```bash
./scripts/run-screenshot-validation.sh
```
- Starts services automatically
- Opens results in browser
- Most convenient for development

### Mode 2: Headless (CI/CD)
```bash
./scripts/run-screenshot-validation.sh --headless --no-open
```
- No browser UI
- Doesn't auto-open results
- Perfect for CI/CD pipelines

### Mode 3: Manual Script
```bash
# Start services first
npm run dev:api &
cd frontend && npm run dev &

# Run capture
npx tsx scripts/capture-avidm-fix-screenshots.ts

# View results
open screenshots/avidm-fix/comparison.html
```

## 📖 Documentation Guide

### For First-Time Users
1. Start with [QUICK-START-EXAMPLES.md](QUICK-START-EXAMPLES.md)
2. Run the automated script
3. Review the generated comparison.html

### For Troubleshooting
1. Check [SCREENSHOT-GUIDE.md](SCREENSHOT-GUIDE.md) → Troubleshooting section
2. Review metadata.json for technical details
3. Check console output from the script

### For Understanding Architecture
1. Read [VALIDATION-WORKFLOW.md](VALIDATION-WORKFLOW.md)
2. Review the visual diagrams
3. Understand the data flow

### For Integration
1. Review CI/CD examples in [QUICK-START-EXAMPLES.md](QUICK-START-EXAMPLES.md)
2. Adapt the scripts to your pipeline
3. Use headless mode for automation

## 🔍 Viewing Results

### Option 1: HTML Comparison (Best)
```bash
open screenshots/avidm-fix/comparison.html
```

Beautiful visual page with:
- Executive summary
- Before/After comparison
- Screenshot gallery
- Network activity
- Console messages
- Technical metadata

### Option 2: Individual Screenshots
```bash
open screenshots/avidm-fix/06-response-received.png
```

View specific screenshots directly.

### Option 3: JSON Metadata
```bash
cat screenshots/avidm-fix/metadata.json | jq .
```

Technical details for automation:
```json
{
  "summary": {
    "totalScreenshots": 8,
    "successfulRequests": 1,
    "failedRequests": 0,
    "totalErrors": 0
  }
}
```

### Option 4: Video Recording
```bash
open screenshots/avidm-fix/videos/validation.webm
```

Watch full session replay.

## 🛠️ Prerequisites

### Required
- Node.js 16+
- npm 8+
- Running API server (port 3001)
- Running frontend (port 5173)

### Auto-Installed
- Playwright (installed by script)
- Chrome/Chromium browser

### Optional
- Anthropic API key (for Claude responses)
- `.env` file with configuration

## 📝 Common Commands

```bash
# Full validation
./scripts/run-screenshot-validation.sh

# Headless mode
./scripts/run-screenshot-validation.sh --headless

# View results
open screenshots/avidm-fix/comparison.html

# Check metadata
jq . screenshots/avidm-fix/metadata.json

# Count screenshots
ls screenshots/avidm-fix/*.png | wc -l

# View network summary
jq '.summary' screenshots/avidm-fix/metadata.json

# Check for errors
jq '.consoleMessages[] | select(.type=="error")' screenshots/avidm-fix/metadata.json
```

## 🐛 Troubleshooting Quick Reference

### Problem: Port Already in Use
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Problem: Playwright Not Found
```bash
npx playwright install chromium
```

### Problem: 403 Errors Still Showing
```bash
# Verify fix was applied
grep baseURL frontend/src/services/AviDMService.ts
# Should show port 3001, not 5000
```

### Problem: Services Won't Start
```bash
# Check logs
npm run dev:api 2>&1 | tee api.log
cd frontend && npm run dev 2>&1 | tee frontend.log
```

## 📈 Success Metrics

After running validation, check:

| Metric | Expected | Check |
|--------|----------|-------|
| Screenshots | 8 | `ls *.png \| wc -l` |
| API Success | 100% | `jq '.summary.successfulRequests' metadata.json` |
| Console Errors | 0 | `jq '.summary.totalErrors' metadata.json` |
| Status Code | 200 | Review network-tab.png |

## 🎬 What Happens During Validation

1. **Pre-flight** (5s)
   - Check Node.js, npm, Playwright
   - Verify services running
   - Install dependencies if needed

2. **Browser Launch** (5s)
   - Open Chrome at 1920x1080
   - Enable DevTools
   - Start video recording

3. **User Flow Simulation** (30-60s)
   - Load app
   - Open AviDM interface
   - Type test message
   - Send to Avi
   - Wait for Claude response
   - Capture all states

4. **Data Collection** (5s)
   - Network requests/responses
   - Console messages
   - Screenshot metadata
   - Timestamps

5. **Report Generation** (5s)
   - Build HTML comparison
   - Export JSON metadata
   - Save video recording

6. **Validation** (2s)
   - Verify all files created
   - Check API status codes
   - Count console errors
   - Open results in browser

**Total Time: ~60 seconds**

## 🌟 Key Features

### Automation
- One-command execution
- Automatic service startup
- Self-installing dependencies
- Browser auto-open

### Monitoring
- Real-time network tracking
- Console message capture
- Error detection
- Performance timing

### Reporting
- Beautiful HTML comparison
- JSON metadata export
- Screenshot gallery
- Video recording

### Validation
- API status verification
- Console error checking
- Screenshot completeness
- Response validation

## 🔗 Related Documentation

### AviDM Fix Documentation
- [AVI-DM-FIX-COMPLETE.md](../AVI-DM-FIX-COMPLETE.md) - Fix implementation
- [AVIDM-PORT-FIX-TDD-REPORT.md](../AVIDM-PORT-FIX-TDD-REPORT.md) - TDD testing
- [AVIDM-PORT-FIX-VALIDATION-SUMMARY.md](../AVIDM-PORT-FIX-VALIDATION-SUMMARY.md) - Validation summary
- [AVIDM-PORT-FIX-QUICK-REFERENCE.md](../AVIDM-PORT-FIX-QUICK-REFERENCE.md) - Quick reference

### Project Documentation
- [README.md](../README.md) - Project overview
- [docs/](../docs/) - Architecture documentation
- [tests/](../tests/) - Test suite

## 💡 Best Practices

1. **Run after every AviDM change**
   - Ensures fix remains working
   - Catches regressions early

2. **Archive successful validations**
   - Keep historical record
   - Compare before/after deployments

3. **Review all outputs**
   - Don't just check if script passes
   - Manually verify screenshots look correct

4. **Use headless in CI/CD**
   - Faster execution
   - Lower resource usage

5. **Keep services running during development**
   - Faster validation cycles
   - Easier debugging

## 🚨 Important Notes

- **Requires both services running**: API (3001) and Frontend (5173)
- **Needs Anthropic API key**: For Claude responses (optional but recommended)
- **Takes ~60 seconds**: Full validation is not instant
- **Generates ~60MB**: Screenshots + video take disk space
- **Clean old results**: Automatically removed on each run

## 📞 Support

If you encounter issues:

1. Check [SCREENSHOT-GUIDE.md](SCREENSHOT-GUIDE.md) troubleshooting section
2. Review script console output for errors
3. Examine metadata.json for technical details
4. Check API server logs in `logs/combined.log`
5. Verify both services are running and accessible

## 🎓 Learning Path

### Beginner
1. Read this README
2. Run the automated script
3. View comparison.html
4. Understand what each screenshot shows

### Intermediate
1. Review [QUICK-START-EXAMPLES.md](QUICK-START-EXAMPLES.md)
2. Try different usage modes
3. Examine metadata.json structure
4. Customize test messages

### Advanced
1. Study [VALIDATION-WORKFLOW.md](VALIDATION-WORKFLOW.md)
2. Modify capture script for custom scenarios
3. Integrate into CI/CD pipeline
4. Create custom validation checks

## ✅ Checklist for Successful Validation

- [ ] Both services running (API + Frontend)
- [ ] Anthropic API key configured (optional)
- [ ] Playwright installed
- [ ] Ports 3001 and 5173 available
- [ ] Script executes without errors
- [ ] All 8 screenshots captured
- [ ] comparison.html generated
- [ ] metadata.json shows 0 failures
- [ ] Network tab shows 200 OK
- [ ] Console shows no errors
- [ ] Full response received from Avi

## 📅 Maintenance

### Regular Tasks
- Run validation before each deployment
- Archive successful results
- Clean old screenshots monthly
- Update selectors if UI changes

### Updates
- Keep Playwright updated
- Update Node.js as needed
- Review and update test messages
- Maintain documentation

---

## 🎉 Ready to Validate!

```bash
cd /workspaces/agent-feed
./scripts/run-screenshot-validation.sh
```

**The system will handle the rest!**

---

**Documentation Version**: 1.0.0
**Last Updated**: 2025-10-20
**Status**: Production Ready ✅
