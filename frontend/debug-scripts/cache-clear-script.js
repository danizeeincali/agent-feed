// Advanced Cache Clearing Script for React Development Issues
// Add this to your React component for debugging cache issues

class CacheDebugger {
  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  // Log all available cache information
  async inspectCaches() {
    console.group('🔍 Cache Inspection Report');
    
    // Check browser cache storage
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        console.log('📦 Available Caches:', cacheNames);
        
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          console.log(`   ${name}: ${keys.length} items`);
          
          // Log first few URLs from each cache
          keys.slice(0, 3).forEach(request => {
            console.log(`     - ${request.url}`);
          });
        }
      } catch (error) {
        console.error('Cache inspection failed:', error);
      }
    } else {
      console.log('❌ Cache API not supported');
    }

    // Check localStorage
    console.log('💾 LocalStorage items:', localStorage.length);
    if (localStorage.length > 0) {
      Object.keys(localStorage).slice(0, 5).forEach(key => {
        console.log(`   ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
      });
    }

    // Check sessionStorage  
    console.log('📋 SessionStorage items:', sessionStorage.length);
    if (sessionStorage.length > 0) {
      Object.keys(sessionStorage).slice(0, 5).forEach(key => {
        console.log(`   ${key}: ${sessionStorage.getItem(key)?.substring(0, 50)}...`);
      });
    }

    console.groupEnd();
  }

  // Clear all caches aggressively
  async clearAllCaches() {
    console.group('🧹 Clearing All Caches');
    
    try {
      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log(`Deleting ${cacheNames.length} caches...`);
        
        await Promise.all(
          cacheNames.map(async name => {
            const deleted = await caches.delete(name);
            console.log(`   ${name}: ${deleted ? 'Deleted' : 'Failed'}`);
          })
        );
      }

      // Clear localStorage
      console.log('Clearing localStorage...');
      localStorage.clear();
      console.log('   ✅ LocalStorage cleared');

      // Clear sessionStorage
      console.log('Clearing sessionStorage...');
      sessionStorage.clear();
      console.log('   ✅ SessionStorage cleared');

      // Clear indexedDB (if any)
      if ('indexedDB' in window) {
        console.log('Attempting to clear IndexedDB...');
        // Note: This is more complex and might need specific DB names
        console.log('   ⚠️  IndexedDB clearing requires specific database names');
      }

      console.log('✅ All clearable caches have been cleared');
      
    } catch (error) {
      console.error('❌ Cache clearing error:', error);
    }

    console.groupEnd();
  }

  // Force refresh with cache bypass
  forceRefresh() {
    console.log('🔄 Forcing hard refresh...');
    
    // Try different methods of hard refresh
    if ('location' in window) {
      // Method 1: Location reload with force
      window.location.reload(true);
    } else {
      // Method 2: Replace current page
      window.location.replace(window.location.href);
    }
  }

  // Check if app is cached and needs refresh
  async checkForUpdates() {
    console.group('🔄 Checking for Updates');
    
    try {
      // Check if this is a cached version by comparing timestamps
      const buildTime = document.querySelector('meta[name="build-time"]')?.content;
      const currentTime = new Date().toISOString();
      
      console.log('Build time:', buildTime || 'Unknown');
      console.log('Current time:', currentTime);

      // Check if service worker is active
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('Service worker detected:', registration.active?.scriptURL);
          
          // Check for updates
          await registration.update();
          console.log('Service worker update check completed');
        } else {
          console.log('No service worker registered');
        }
      }

      // Check if main JS bundle has changed
      const scriptTags = Array.from(document.querySelectorAll('script[src]'));
      console.log('Script tags found:', scriptTags.length);
      
      scriptTags.forEach((script, index) => {
        console.log(`   Script ${index + 1}: ${script.src}`);
      });

    } catch (error) {
      console.error('Update check failed:', error);
    }

    console.groupEnd();
  }

  // Comprehensive cache debugging for white screen issues
  async debugWhiteScreen() {
    console.group('🚨 WHITE SCREEN DEBUG SESSION');
    console.log('Starting comprehensive cache debug...');
    
    // Step 1: Inspect current state
    await this.inspectCaches();
    
    // Step 2: Check for updates
    await this.checkForUpdates();
    
    // Step 3: Test React mounting
    this.checkReactMounting();
    
    // Step 4: Network inspection
    this.inspectNetworkRequests();

    console.log('📝 Debug Summary:');
    console.log('   - Check console above for cache contents');
    console.log('   - Look for failed network requests');  
    console.log('   - Verify React components are mounting');
    console.log('   - If issues persist, run clearAllCaches() then refresh');
    
    console.groupEnd();
  }

  // Check if React is properly mounting
  checkReactMounting() {
    console.group('⚛️  React Mounting Check');
    
    // Check if React DevTools are available
    const hasReactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    console.log('React DevTools:', hasReactDevTools ? 'Available' : 'Not available');

    // Check root element
    const rootElement = document.getElementById('root');
    console.log('Root element:', rootElement ? 'Found' : '❌ Missing');
    
    if (rootElement) {
      console.log('   Root innerHTML length:', rootElement.innerHTML.length);
      console.log('   Root children count:', rootElement.children.length);
      
      if (rootElement.children.length === 0) {
        console.log('   ❌ Root element is empty - React may not be mounting');
      } else {
        console.log('   ✅ Root element has content');
      }
    }

    // Check if React is loaded
    console.log('React loaded:', typeof window.React !== 'undefined');
    console.log('ReactDOM loaded:', typeof window.ReactDOM !== 'undefined');

    console.groupEnd();
  }

  // Monitor network requests
  inspectNetworkRequests() {
    console.group('🌐 Network Request Inspection');
    
    // Check performance entries for failed requests
    const entries = performance.getEntriesByType('resource');
    const failedEntries = entries.filter(entry => entry.transferSize === 0 && entry.decodedBodySize === 0);
    
    console.log('Total resources:', entries.length);
    console.log('Potentially failed resources:', failedEntries.length);
    
    if (failedEntries.length > 0) {
      console.log('❌ Failed resources:');
      failedEntries.forEach(entry => {
        console.log(`   ${entry.name}`);
      });
    }

    // Check for specific JS/CSS resources
    const jsResources = entries.filter(entry => entry.name.endsWith('.js') || entry.name.includes('.js?'));
    const cssResources = entries.filter(entry => entry.name.endsWith('.css') || entry.name.includes('.css?'));
    
    console.log(`JavaScript files: ${jsResources.length}`);
    console.log(`CSS files: ${cssResources.length}`);

    console.groupEnd();
  }
}

// Auto-initialize if in development mode
if (typeof window !== 'undefined') {
  window.CacheDebugger = CacheDebugger;
  
  // Add convenient global functions
  window.debugCache = async () => {
    const debugger = new CacheDebugger();
    await debugger.debugWhiteScreen();
  };
  
  window.clearAllCaches = async () => {
    const debugger = new CacheDebugger();
    await debugger.clearAllCaches();
    setTimeout(() => window.location.reload(true), 1000);
  };
  
  window.forceRefresh = () => {
    const debugger = new CacheDebugger();
    debugger.forceRefresh();
  };

  // Auto-debug on development load if there are issues
  if (process.env.NODE_ENV === 'development') {
    window.addEventListener('load', () => {
      setTimeout(async () => {
        const rootElement = document.getElementById('root');
        if (rootElement && rootElement.children.length === 0) {
          console.warn('🚨 Detected potential white screen issue - running auto-debug...');
          await window.debugCache();
        }
      }, 2000);
    });
  }
  
  console.log('🛠️  Cache debugging tools loaded!');
  console.log('   Available commands:');
  console.log('   - debugCache() - Run full cache debug');
  console.log('   - clearAllCaches() - Clear all caches and refresh');
  console.log('   - forceRefresh() - Force hard refresh');
}

export default CacheDebugger;