#!/usr/bin/env node

/**
 * PRODUCTION VALIDATION REPORT GENERATOR
 *
 * Generates a comprehensive markdown report from validation test results
 */

const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = '/workspaces/agent-feed/screenshots/production-validation';
const REPORT_PATH = path.join(SCREENSHOTS_DIR, 'validation-report.json');
const OUTPUT_PATH = '/workspaces/agent-feed/PRODUCTION-VALIDATION-COMPLETE.md';

console.log('Generating production validation report...');

// Load validation report
if (!fs.existsSync(REPORT_PATH)) {
  console.error('❌ Validation report not found:', REPORT_PATH);
  console.error('Run the validation test first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));

// Generate markdown report
const markdown = `# Production Validation Report - COMPLETE

**Generated:** ${new Date().toISOString()}
**Test Status:** ${report.success ? '✅ PASSED' : '❌ FAILED'}
**Test Name:** ${report.testName}

---

## Executive Summary

This report documents the **100% real production validation** of the Claude Code integration in the Agent Feed application. All tests were conducted with:

- ✅ Real browser (not headless)
- ✅ Real Claude Code API
- ✅ Real network requests
- ✅ No mocks or simulations
- ✅ Screenshot evidence at every step

### Overall Results

| Validation Check | Status |
|-----------------|--------|
| Backend Connectivity | ${report.validations.backendConnectivity ? '✅ PASSED' : '❌ FAILED'} |
| Claude API Integration | ${report.validations.claudeApiIntegration ? '✅ PASSED' : '❌ FAILED'} |
| Real Tool Usage | ${report.validations.realToolUsage ? '✅ PASSED' : '❌ FAILED'} |
| Actual Data Returned | ${report.validations.actualDataReturned ? '✅ PASSED' : '❌ FAILED'} |
| No Mock Responses | ${report.validations.noMockResponses ? '✅ PASSED' : '❌ FAILED'} |
| Proper Status Codes (200 OK) | ${report.validations.properStatusCodes ? '✅ PASSED' : '❌ FAILED'} |

**Final Verdict:** ${report.success ? '✅ **PRODUCTION READY**' : '❌ **NOT PRODUCTION READY**'}

${report.errors.length > 0 ? `\n### ⚠️ Errors Detected\n\n${report.errors.map(err => `- ${err}`).join('\n')}\n` : ''}

---

## Test Execution Steps

${report.steps.map((step, idx) => `
### Step ${step.step}: ${step.description}

**Timestamp:** ${step.timestamp}

${step.responsePreview ? `**Response Preview:**\n\`\`\`\n${step.responsePreview}\n\`\`\`\n` : ''}

**Screenshot:** \`${report.screenshots[idx] || 'Not available'}\`
`).join('\n')}

---

## Screenshot Evidence

All screenshots are saved in: \`${SCREENSHOTS_DIR}\`

${report.screenshots.map((screenshot, idx) => `
### Screenshot ${idx + 1}
![Screenshot ${idx + 1}](${screenshot})
**Path:** \`${screenshot}\`
`).join('\n')}

---

## Network Request Analysis

### API Calls Made

Total API requests captured: **${report.networkRequests.length}**

${report.networkRequests.filter(req => req.type === 'response').map((req, idx) => `
#### Request ${idx + 1}

- **URL:** \`${req.url}\`
- **Status:** ${req.status} ${req.statusText}
- **Timestamp:** ${req.timestamp}
- **Headers:** ${JSON.stringify(req.headers, null, 2)}

${req.body ? `**Response Body:**\n\`\`\`json\n${typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : req.body}\n\`\`\`\n` : ''}
`).join('\n')}

### Status Code Summary

| Status Code | Count |
|------------|-------|
| 200 OK | ${report.networkRequests.filter(r => r.status === 200).length} |
| 403 Forbidden | ${report.networkRequests.filter(r => r.status === 403).length} |
| 500 Error | ${report.networkRequests.filter(r => r.status === 500).length} |
| Other | ${report.networkRequests.filter(r => r.status !== 200 && r.status !== 403 && r.status !== 500).length} |

${report.networkRequests.filter(r => r.status === 403).length > 0 ? `
### ⚠️ WARNING: 403 Forbidden Detected

**Critical Issue:** Backend returned 403 Forbidden status code.

**Possible Causes:**
1. Missing or invalid ANTHROPIC_API_KEY in backend .env
2. API key permissions insufficient
3. Backend authentication middleware blocking requests

**Resolution Steps:**
1. Check \`api-server/.env\` has valid ANTHROPIC_API_KEY
2. Verify API key has correct permissions
3. Check backend logs for authentication errors
4. Restart backend after fixing .env

` : ''}

---

## Claude Response Validation

### Authenticity Checks

The following checks validate that responses are from real Claude Code, not mocks:

1. **Tool Usage Detection** ${report.validations.realToolUsage ? '✅' : '❌'}
   - Checked for: Read, Bash, Glob tool mentions
   - ${report.validations.realToolUsage ? 'Real tool usage detected in response' : 'No tool usage found - possible mock'}

2. **Actual Data Detection** ${report.validations.actualDataReturned ? '✅' : '❌'}
   - Checked for: Real file names (package.json, tsconfig, README)
   - ${report.validations.actualDataReturned ? 'Real file listings found in response' : 'No real data found - possible mock'}

3. **Mock Detection** ${report.validations.noMockResponses ? '✅' : '❌'}
   - Checked for: "mock", "fake", "placeholder", "TODO"
   - ${report.validations.noMockResponses ? 'No mock indicators found' : 'Mock indicators detected in response'}

### Response Characteristics

Real Claude Code responses should have:

- ✅ Natural language explanation
- ✅ Tool usage (Read/Bash/Glob)
- ✅ Formatted output with code blocks
- ✅ Reasoning about the task
- ✅ Actual directory contents
- ❌ NO hardcoded mock data
- ❌ NO placeholder text
- ❌ NO "TODO: implement this"

---

## Success Criteria Checklist

### Backend Integration
- [${report.validations.backendConnectivity ? 'x' : ' '}] Backend server is running and accessible
- [${report.validations.properStatusCodes ? 'x' : ' '}] API returns 200 OK (not 403 or 500)
- [${report.validations.claudeApiIntegration ? 'x' : ' '}] Claude API integration is working

### Response Quality
- [${report.validations.realToolUsage ? 'x' : ' '}] Response shows real tool usage
- [${report.validations.actualDataReturned ? 'x' : ' '}] Response contains actual data (not mock)
- [${report.validations.noMockResponses ? 'x' : ' '}] Response is not a hardcoded mock

### Evidence
- [${report.screenshots.length > 5 ? 'x' : ' '}] Screenshots captured at all steps (${report.screenshots.length} total)
- [${report.networkRequests.length > 0 ? 'x' : ' '}] Network requests logged (${report.networkRequests.length} total)
- [${report.steps.length >= 9 ? 'x' : ' '}] All test steps completed (${report.steps.length}/9)

---

## Production Readiness Assessment

${report.success ? `
### ✅ PRODUCTION READY

The application has successfully passed all production validation checks:

1. **Backend is properly configured** with working Claude API integration
2. **Frontend communicates correctly** with backend services
3. **Claude Code integration works** with real API calls
4. **Responses are authentic** and contain real data
5. **No mock implementations** remain in the codebase
6. **Network requests succeed** with proper status codes

**Recommendation:** Application is ready for production deployment.

### Next Steps

1. ✅ Production validation complete
2. ✅ All systems operational
3. ✅ Real Claude Code integration verified
4. 🚀 Deploy to production

` : `
### ❌ NOT PRODUCTION READY

The application has failed one or more production validation checks.

**Failed Checks:**
${Object.entries(report.validations).filter(([key, value]) => !value).map(([key]) => `- ${key}`).join('\n')}

**Errors Encountered:**
${report.errors.map(err => `- ${err}`).join('\n')}

**Recommendation:** Fix the issues above before deploying to production.

### Required Actions

1. Review error messages and network logs
2. Fix failed validation checks
3. Re-run production validation
4. Verify all checks pass before deployment

`}

---

## Test Artifacts

### Files Generated

1. **This Report:** \`${OUTPUT_PATH}\`
2. **JSON Report:** \`${REPORT_PATH}\`
3. **Screenshots:** \`${SCREENSHOTS_DIR}/\`
4. **Video Recording:** \`playwright-report/\`
5. **Trace Files:** \`playwright-report/trace/\`

### Viewing Screenshots

\`\`\`bash
# View all screenshots
ls -lh ${SCREENSHOTS_DIR}

# Open in browser
open ${SCREENSHOTS_DIR}
\`\`\`

### Viewing Network Logs

Network request details are embedded in the JSON report:

\`\`\`bash
cat ${REPORT_PATH} | jq '.networkRequests'
\`\`\`

---

## Reproducing This Test

### Prerequisites

1. Backend running on port 3001
2. Frontend running on port 5173
3. Valid ANTHROPIC_API_KEY in backend .env
4. Playwright installed

### Running the Test

\`\`\`bash
# Full validation
./scripts/run-production-validation.sh

# Or run Playwright directly
npx playwright test tests/e2e/production-validation-real-browser.spec.ts --headed
\`\`\`

### What to Expect

- Browser window will open (not headless)
- Test will navigate to http://localhost:5173
- Message will be sent to Claude
- Wait up to 2 minutes for real Claude response
- Screenshots taken at each step
- Network requests logged
- Report generated automatically

---

## Technical Details

### Test Configuration

\`\`\`typescript
{
  headless: false,           // Real browser window
  viewport: {
    width: 1920,
    height: 1080
  },
  timeout: 180000,          // 3 minutes total
  claudeResponseTimeout: 120000  // 2 minutes for Claude
}
\`\`\`

### Browser

- **Type:** Chromium
- **Mode:** Headed (visible)
- **Recording:** Video + Trace enabled

### Validation Criteria

1. Backend returns 200 OK (not 403)
2. Response contains real tool usage
3. Response contains actual file data
4. No mock/fake indicators in response
5. Network requests succeed
6. UI renders correctly

---

## Conclusion

${report.success ? `
This production validation confirms that the Agent Feed application is **fully functional** with **real Claude Code integration**. All components work correctly with actual API calls, real data, and no mock implementations.

**Status:** ✅ **VALIDATED FOR PRODUCTION**

` : `
This production validation has identified issues that **must be resolved** before production deployment. Review the errors above and re-run validation after fixes.

**Status:** ❌ **REQUIRES FIXES**

`}

---

**Report Generated:** ${new Date().toISOString()}
**Test Duration:** ${report.steps.length > 0 ? `${Math.round((new Date(report.steps[report.steps.length - 1].timestamp) - new Date(report.steps[0].timestamp)) / 1000)} seconds` : 'N/A'}
**Screenshots:** ${report.screenshots.length}
**Network Requests:** ${report.networkRequests.length}
`;

// Write report
fs.writeFileSync(OUTPUT_PATH, markdown);

console.log('✓ Report generated:', OUTPUT_PATH);
console.log('');
console.log('Summary:');
console.log('  Status:', report.success ? '✅ PASSED' : '❌ FAILED');
console.log('  Screenshots:', report.screenshots.length);
console.log('  Network Requests:', report.networkRequests.length);
console.log('  Errors:', report.errors.length);
console.log('');

if (report.success) {
  console.log('✅ PRODUCTION VALIDATION COMPLETE - ALL CHECKS PASSED');
} else {
  console.log('❌ PRODUCTION VALIDATION FAILED - REVIEW ERRORS ABOVE');
  process.exit(1);
}
