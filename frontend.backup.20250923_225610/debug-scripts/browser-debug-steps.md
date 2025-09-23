# React White Screen Debugging Guide - 2024/2025

Based on comprehensive research, here are the specific debugging steps to diagnose React white screen issues where HTML loads but JavaScript fails to mount.

## 1. Browser Console Investigation Commands

### Open Developer Tools and Run These Commands:

```javascript
// Check if React is loaded
console.log('React:', typeof React !== 'undefined' ? 'Loaded' : 'Not loaded');

// Check if ReactDOM is loaded
console.log('ReactDOM:', typeof ReactDOM !== 'undefined' ? 'Loaded' : 'Not loaded');

// Check if root element exists
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement ? 'Found' : 'Missing');

// Check if React app is mounted
console.log('React root children:', rootElement?.children.length || 0);

// Check for JavaScript errors
console.log('Console errors so far:', performance.getEntriesByType('navigation'));
```

### Network Tab Analysis:
1. Open Network tab before page refresh
2. Refresh page (Ctrl+F5 / Cmd+Shift+R)
3. Look for:
   - 404 errors on JS/CSS files
   - CORS errors
   - Failed module imports
   - MIME type errors

## 2. Vite-Specific Debug Commands

### Terminal Commands:
```bash
# Debug HMR issues
npm run dev -- --debug hmr

# Run with verbose logging
npm run dev -- --debug

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev

# Check Vite config
npx vite --help
npx vite inspect
```

### Environment Verification:
```bash
# Check Node version (should be 16+)
node --version

# Check npm version
npm --version

# Verify package.json scripts
npm run build
npm run preview
```

## 3. Cache Clearing Strategy

### Complete Cache Clear (Modern Browsers):

#### Chrome/Edge:
```
F12 → Application Tab → Storage → Clear Site Data
OR
Settings → Privacy and Security → Clear Browsing Data → Advanced → All Time
```

#### Firefox:
```
F12 → Storage Tab → Clear All
OR  
Options → Privacy & Security → Clear Data
```

#### Programmatic Cache Clear:
```javascript
// Add to your React app for debugging
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
    });
  });
}

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();
```

## 4. React 18 + Vite Specific Issues

### Check for React 18 Mounting Issues:
```javascript
// In src/main.tsx or src/main.jsx
import { createRoot } from 'react-dom/client';

// Verify this pattern (React 18 style)
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);

// NOT the old way:
// ReactDOM.render(<App />, document.getElementById('root'));
```

### Vite Config Debugging:
```javascript
// vite.config.js/ts - Add debugging options
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  base: './' // Important for deployment issues
});
```

## 5. Common Fix Commands

### Package Issues:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Update React/Vite
npm update react react-dom @vitejs/plugin-react

# Check for peer dependency issues
npm ls
```

### Build Issues:
```bash
# Test production build locally
npm run build
npm run preview

# Compare dev vs build
npm run dev    # Should work
npm run build && npm run preview  # Should also work
```

## 6. Error Pattern Detection

### Look for these common errors:

1. **Module Import Failures:**
   - `Failed to resolve module specifier`
   - `Unexpected token '<'` (HTML served instead of JS)

2. **React Mounting Issues:**
   - `Cannot read property 'render' of undefined`
   - `createRoot is not a function`

3. **Vite-specific:**
   - `The requested module does not provide an export named 'default'`
   - `Failed to fetch dynamically imported module`

4. **CORS/Security:**
   - `blocked by CORS policy`
   - `Failed to load module script: Expected a JavaScript module script`

## 7. File System Debugging

### Check Critical Files:
```bash
# Verify these files exist and are correct:
ls -la src/main.tsx src/main.jsx  # Entry point
ls -la index.html                 # Should have <div id="root">
ls -la vite.config.*             # Vite configuration
cat package.json | grep -E "(react|vite|type)"  # Dependencies
```

### Content Verification:
```bash
# Check if main.tsx/jsx has correct imports
head -10 src/main.tsx

# Check if index.html has root element
grep -n "root" index.html

# Check if App component exists
ls -la src/App.*
```

This systematic approach should reveal the root cause of the white screen issue by checking each potential failure point in the React + Vite stack.