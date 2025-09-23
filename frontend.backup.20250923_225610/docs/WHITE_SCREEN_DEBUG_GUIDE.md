# React White Screen Debugging Guide
## Browser Console Debugging for Vite + React Issues

### URGENT: White Screen Analysis for http://localhost:5173/

## 🔍 **CRITICAL FINDINGS**

### Current Project Status
- **Server Status**: ✅ Responding (HTTP 200 OK)
- **TypeScript Compilation**: ❌ **FAILING** (Multiple errors preventing build)
- **Vite Dev Server**: ✅ Running (Port 5173)
- **HTML Delivery**: ✅ Working (React scripts loading)

### **PRIMARY CAUSE: TypeScript Compilation Errors**

The white screen is caused by **TypeScript compilation failures** preventing React from rendering. Key errors:

```typescript
// Critical Type Errors Found:
1. src/components/RobustWebSocketProvider.tsx(294,19): Spread argument type error
2. src/components/TerminalDebug.tsx(157-160): Function signature mismatches  
3. src/components/TerminalDiagnostic.tsx(175,9): Invalid property 'screenKeys'
4. src/components/TerminalLauncher.tsx(217,13): Missing 'wsUrl' property
5. src/hooks/useOptimizedQuery.ts(21,48): Query function type mismatch
```

## 🛠️ **Browser Console Debugging Techniques**

### Step 1: Open Browser DevTools
```bash
# Open DevTools in Chrome/Firefox
F12 or Right-click → Inspect Element

# Navigate to Console tab
Look for red error messages
```

### Step 2: Essential Console Commands
```javascript
// Check if React is loading
console.log('React Version:', React.version);

// Check if root element exists
console.log('Root element:', document.getElementById('root'));

// Monitor module loading errors
window.addEventListener('vite:preloadError', (event) => {
    console.error('Module load error:', event.payload);
    // Optional: reload page on error
    // window.location.reload();
});

// Check for hydration errors (React 18+)
window.addEventListener('error', (event) => {
    if (event.message.includes('hydration')) {
        console.error('Hydration Error:', event.error);
    }
});

// Monitor uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
});
```

### Step 3: Network Tab Analysis
```bash
# Check for failed resource loading:
1. Open Network tab in DevTools
2. Refresh page (F5)
3. Look for RED entries (failed requests)
4. Common issues:
   - 404 errors for JavaScript modules
   - CORS errors
   - Syntax errors in loaded files
```

### Step 4: Sources Tab Debugging
```javascript
// Set breakpoints in main.tsx:
1. Go to Sources tab
2. Find src/main.tsx
3. Set breakpoint on line 10: ReactDOM.createRoot(...)
4. Refresh page
5. Step through execution to see where it fails
```

## 🚨 **Common White Screen Patterns (2024-2025)**

### 1. **TypeScript Compilation Errors** (Current Issue)
```bash
# Symptoms:
- Server responds with 200
- HTML loads correctly
- JavaScript fails to execute
- Console shows compilation errors

# Debug Commands:
npm run build              # Check build errors
npx tsc --noEmit          # Type checking only
npm run dev               # Development with error overlay
```

### 2. **Module Loading Failures**
```javascript
// Check for ES module issues
// Console Error Examples:
"Failed to load module script: Expected a JavaScript module script"
"Uncaught SyntaxError: Cannot use import statement outside a module"

// Debug Commands:
console.log('Vite Client:', import.meta.hot);
console.log('Module Meta:', import.meta.env);
```

### 3. **React 18+ Hydration Issues**
```javascript
// Hydration error patterns:
"Hydration failed because the initial UI does not match"
"Text content does not match server-rendered HTML"

// Debug Commands:
// Enable React's development mode for better errors
localStorage.setItem('debug', 'react*');

// Suppress hydration warnings (temporarily)
suppressHydrationWarning={true}
```

### 4. **Router Configuration Issues**
```javascript
// Check if React Router is working
console.log('Current Location:', window.location.pathname);
console.log('Router History:', history);

// Test routing manually
window.history.pushState({}, '', '/test-route');
```

## 🔧 **Immediate Fix Commands**

### For Current Project:
```bash
# 1. Fix TypeScript errors first
npm run typecheck

# 2. Run in development mode with overlay
npm run dev

# 3. Check specific component loading
# Add to main.tsx temporarily:
console.log('App component:', App);
console.log('Root element:', document.getElementById('root'));

# 4. Enable verbose Vite logging
npx vite --debug --logLevel verbose
```

### Browser Console Diagnostic Script:
```javascript
// Paste this into browser console for instant diagnosis:
(function() {
    console.group('🔍 React White Screen Diagnostic');
    
    // Check React
    try {
        console.log('✅ React loaded:', typeof React !== 'undefined');
        console.log('✅ ReactDOM loaded:', typeof ReactDOM !== 'undefined');
    } catch(e) {
        console.error('❌ React/ReactDOM not loaded:', e);
    }
    
    // Check root element
    const root = document.getElementById('root');
    console.log('✅ Root element exists:', !!root);
    console.log('✅ Root content:', root ? root.innerHTML.substring(0, 100) : 'N/A');
    
    // Check for errors
    const errors = document.querySelectorAll('[data-vite-dev-id]');
    console.log('✅ Vite dev elements:', errors.length);
    
    // Check network failures
    console.log('✅ Check Network tab for failed JS/CSS requests');
    
    console.groupEnd();
})();
```

## 🎯 **Next Steps for Current Issue**

### Immediate Actions:
1. **Fix TypeScript errors** in the failing components
2. **Rebuild** the project: `npm run build`
3. **Check browser console** for remaining errors
4. **Test component loading** individually

### Development Debugging:
```bash
# Enable detailed error reporting
export NODE_ENV=development
npm run dev

# Run with type checking disabled (temporary)
npx vite --force

# Check specific component issues
npm run test src/components/TerminalDebug.tsx
```

## 📊 **Error Patterns Analysis**

Based on current codebase analysis:
- **11 TypeScript compilation errors** blocking execution
- **Terminal-related components** have type mismatches
- **WebSocket provider** has spread operator issues
- **Query hooks** have type compatibility problems

## ✅ **Success Indicators**

After fixes, you should see:
- ✅ `npm run build` completes without errors
- ✅ Browser console shows React app mounting
- ✅ UI elements render in browser
- ✅ No red errors in DevTools console

## 🚀 **Advanced Debugging**

### React DevTools:
```bash
# Install React DevTools browser extension
# Check Components tab for:
- Component tree structure
- Props and state values
- Error boundaries status
```

### Vite-Specific Debugging:
```javascript
// Check Vite module graph
console.log('Vite Module Graph:', await import('/@vite/client'));

// Monitor HMR updates
if (import.meta.hot) {
    import.meta.hot.on('vite:error', (err) => {
        console.error('Vite HMR Error:', err);
    });
}
```

---

**RECOMMENDATION**: Fix the TypeScript compilation errors first - this is the root cause of the white screen issue. The server is working correctly, but JavaScript execution is failing due to type errors.