# Manual UI Testing Guide
## Authentication Interface Validation

This guide provides step-by-step instructions for manually validating the authentication UI when automated testing encounters server timeout issues.

---

## Prerequisites

1. **Start Development Server:**
   ```bash
   cd /workspaces/agent-feed
   npm run dev
   ```

2. **Verify Server is Running:**
   ```bash
   lsof -i :5173
   # Should show Node.js process listening on port 5173
   ```

3. **Open Browser:**
   - Navigate to `http://localhost:5173`
   - Open DevTools (F12) to monitor console errors
   - Set responsive design mode (Ctrl+Shift+M)

---

## Test 1: Settings Page - Authentication Options

### Steps:

1. **Navigate to Settings:**
   - Click "Settings" in sidebar OR
   - Navigate to `http://localhost:5173/settings`

2. **Verify Page Load:**
   - ✅ Page loads without errors
   - ✅ "Settings" heading visible
   - ✅ Authentication section present
   - 📸 **Screenshot 1:** Initial settings page

3. **Test OAuth Option:**
   - Click the OAuth radio button
   - ✅ OAuth description appears
   - ✅ Radio button is selected
   - 📸 **Screenshot 2:** OAuth selected

4. **Test User API Key Option:**
   - Click the "User API Key" radio button
   - ✅ API key input field appears
   - ✅ Placeholder text visible (e.g., "sk-ant-...")
   - 📸 **Screenshot 3:** User API Key selected

5. **Enter API Key:**
   - Type: `sk-ant-test-key-for-validation-12345`
   - ✅ Input accepts text
   - ✅ No validation errors shown
   - 📸 **Screenshot 4:** API key entered

6. **Test Pay-as-you-go Option:**
   - Click the "Pay-as-you-go" radio button
   - ✅ Option is selectable
   - ✅ Description appears
   - 📸 **Screenshot 5:** Pay-as-you-go selected

### Expected Results:
- All radio buttons function correctly
- Input fields appear/disappear based on selection
- No console errors
- Clean, professional UI

---

## Test 2: Billing Dashboard

### Steps:

1. **Navigate to Billing:**
   - Click "Billing" in sidebar OR
   - Navigate to `http://localhost:5173/billing`

2. **Verify Dashboard Load:**
   - ✅ Page loads without errors
   - ✅ Billing metrics visible
   - ✅ Charts/graphs render (if implemented)
   - 📸 **Screenshot 6:** Billing dashboard initial view

3. **Test 7-Day Period:**
   - Click "7d" button/selector
   - ✅ Data updates for 7-day period
   - ✅ Visual feedback on selection
   - 📸 **Screenshot 7:** 7-day period selected

4. **Test 30-Day Period:**
   - Click "30d" button/selector
   - ✅ Data updates for 30-day period
   - ✅ Metrics reflect longer timeframe
   - 📸 **Screenshot 8:** 30-day period selected

5. **Test 90-Day Period:**
   - Click "90d" button/selector
   - ✅ Data updates for 90-day period
   - ✅ Historical data visible
   - 📸 **Screenshot 9:** 90-day period selected

### Expected Results:
- All period selectors work
- Data updates smoothly
- No loading errors
- Professional dashboard layout

---

## Test 3: Dark Mode Toggle

### Steps:

1. **Locate Dark Mode Toggle:**
   - Look in settings page or header
   - Should be a switch/button icon

2. **Initial State (Light Mode):**
   - ✅ Light theme active
   - ✅ Bright background colors
   - 📸 **Screenshot 10:** Light mode

3. **Toggle to Dark Mode:**
   - Click dark mode toggle
   - ✅ Theme switches to dark
   - ✅ All elements adapt to dark theme
   - ✅ Good contrast maintained
   - 📸 **Screenshot 11:** Dark mode

4. **Verify All Pages:**
   - Navigate between pages
   - ✅ Dark mode persists across navigation
   - ✅ All components respect theme

### Expected Results:
- Smooth theme transition
- All text remains readable
- No visual glitches
- Preference persists

---

## Test 4: Accessibility Validation

### Keyboard Navigation:

1. **Tab Through Elements:**
   - Press `Tab` repeatedly
   - ✅ Focus moves logically through form elements
   - ✅ Focus indicator visible on all elements
   - 📸 **Screenshot 12:** Keyboard focus indicator visible

2. **Test Radio Buttons:**
   - Tab to radio button group
   - Use arrow keys to change selection
   - ✅ Radio buttons respond to arrow keys
   - ✅ Selection changes visually

3. **Test Form Submission:**
   - Tab to "Save" button
   - Press `Enter` or `Space`
   - ✅ Button activates

### Screen Reader Labels:

1. **Inspect ARIA Labels:**
   - Right-click radio buttons → Inspect
   - ✅ Each has `aria-label` or associated `<label>`
   - ✅ Descriptive text present

2. **Form Inputs:**
   - Check API key input
   - ✅ Has `placeholder` or `aria-label`
   - ✅ Validation messages have proper ARIA

### Color Contrast:

1. **Check Text Readability:**
   - ✅ All text readable against background
   - ✅ Meets WCAG AA standards (4.5:1 ratio)
   - Use DevTools Accessibility panel

2. **Button States:**
   - ✅ Disabled buttons clearly distinguishable
   - ✅ Hover states provide feedback

---

## Test 5: Responsive Design

### Desktop (1920x1080):

1. **Set Viewport:**
   - DevTools → Responsive Design Mode
   - Set to 1920x1080

2. **Verify Layout:**
   - ✅ Full sidebar visible
   - ✅ Content uses available space
   - ✅ No horizontal scrolling
   - 📸 **Screenshot 13:** Desktop view

### Tablet (768x1024):

1. **Set Viewport:**
   - Change to 768x1024

2. **Verify Layout:**
   - ✅ Layout adapts appropriately
   - ✅ Sidebar may collapse or shrink
   - ✅ Touch-friendly spacing
   - 📸 **Screenshot 14:** Tablet view

### Mobile (375x667):

1. **Set Viewport:**
   - Change to 375x667 (iPhone SE)

2. **Verify Layout:**
   - ✅ Single-column layout
   - ✅ Hamburger menu for navigation
   - ✅ All content accessible
   - ✅ No text cutoff
   - 📸 **Screenshot 15:** Mobile view

---

## Test 6: Form Validation

### Empty Field Validation:

1. **Select User API Key:**
   - Click "User API Key" radio button

2. **Leave Field Empty:**
   - Click in API key input
   - Click outside (blur event)
   - ✅ Validation error appears
   - 📸 **Screenshot 16:** Validation error

### Invalid Input:

1. **Enter Invalid Key:**
   - Type: `invalid-key`
   - ✅ Format validation triggers (if implemented)

### Valid Input:

1. **Enter Valid Key:**
   - Type: `sk-ant-valid-key-test-12345`
   - ✅ Validation success indication
   - 📸 **Screenshot 17:** Validation success

---

## Test 7: Button Interactions

### Hover States:

1. **Hover Over Save Button:**
   - Move mouse over "Save" button
   - ✅ Background color changes
   - ✅ Cursor becomes pointer
   - 📸 **Screenshot 18:** Button hover state

### Click States:

1. **Click Button:**
   - ✅ Press state visual feedback
   - ✅ Action executes or shows loading

---

## Checklist Summary

### Settings Page (8 items):
- [ ] Page loads without errors
- [ ] OAuth option selectable and displays correctly
- [ ] User API Key option shows input field
- [ ] API key input accepts text
- [ ] Pay-as-you-go option selectable
- [ ] Save button visible and functional
- [ ] No console errors
- [ ] Professional appearance

### Billing Page (6 items):
- [ ] Dashboard loads with metrics
- [ ] 7-day period selector works
- [ ] 30-day period selector works
- [ ] 90-day period selector works
- [ ] Charts/graphs render correctly
- [ ] No loading errors

### Dark Mode (4 items):
- [ ] Toggle control exists and functions
- [ ] Theme switches smoothly
- [ ] All elements adapt to theme
- [ ] Preference persists

### Accessibility (8 items):
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Button states clear
- [ ] Form validation accessible
- [ ] Logical tab order

### Responsive Design (3 items):
- [ ] Desktop layout (1920x1080)
- [ ] Tablet layout (768x1024)
- [ ] Mobile layout (375x667)

### Form Validation (3 items):
- [ ] Empty field validation
- [ ] Invalid input handling
- [ ] Valid input acceptance

### Interactions (2 items):
- [ ] Button hover states
- [ ] Click feedback

---

## Screenshot Naming Convention

Save screenshots with the following names:
1. `01-settings-page-initial.png`
2. `02-oauth-selected.png`
3. `03-user-api-key-selected.png`
4. `04-api-key-entered.png`
5. `05-pay-as-you-go-selected.png`
6. `06-billing-dashboard.png` ✅ (Already captured)
7. `07-billing-7d-period.png`
8. `08-billing-30d-period.png`
9. `09-billing-90d-period.png`
10. `10-light-mode.png`
11. `11-dark-mode.png`
12. `12-keyboard-focus.png`
13. `13-desktop-1920x1080.png` ✅ (Already captured)
14. `14-tablet-768x1024.png` ✅ (Already captured)
15. `15-mobile-375x667.png` ✅ (Already captured)
16. `16-validation-error.png`
17. `17-validation-success.png`
18. `18-button-hover.png`

**Current Status:** 4/18 screenshots captured (22%)

---

## Reporting Issues

If you encounter issues during manual testing:

1. **Note the Issue:**
   - What were you trying to do?
   - What happened instead?
   - What did you expect?

2. **Capture Evidence:**
   - Screenshot of the issue
   - Browser console errors
   - Network tab errors (if API-related)

3. **Reproduce:**
   - Try to reproduce the issue
   - Note any specific conditions

4. **Document:**
   - Add to issue tracker
   - Tag with appropriate labels
   - Include screenshots

---

## Tips for Success

1. **Use Incognito Mode:**
   - Prevents cache/extension interference
   - Clean slate for testing

2. **Clear Browser Cache:**
   - Between test runs
   - Ensures fresh assets

3. **Monitor Network Tab:**
   - Watch for API errors
   - Check response times

4. **Check Console Regularly:**
   - React errors appear here
   - Warning messages indicate issues

5. **Test Multiple Browsers:**
   - Chrome (primary)
   - Firefox
   - Safari (if available)

---

## Success Criteria

### Minimum Requirements:
✅ All 18 screenshots captured
✅ No critical errors in console
✅ All forms functional
✅ Responsive design works across viewports
✅ Keyboard navigation functional
✅ Good color contrast

### Ideal Results:
✅ All minimum requirements met
✅ Smooth animations/transitions
✅ Fast page load times (<2s)
✅ Professional appearance
✅ Excellent accessibility scores
✅ Cross-browser compatibility

---

**Last Updated:** November 9, 2025
**Document Owner:** QA/Testing Team
**Related:** `playwright-ui-validation-report.md`
