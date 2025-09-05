/**
 * TDD London School - Import Resolution Test
 * Direct browser-based test to isolate import failures
 */

const fs = require('fs');
const path = require('path');

describe('Import Resolution Analysis', () => {
  const frontendSrc = '/workspaces/agent-feed/frontend/src';

  test('should verify all App.tsx critical imports exist', () => {
    const criticalImports = [
      'components/ErrorBoundary',
      'components/FallbackComponents', 
      'components/SocialMediaFeed',
      'utils/cn',
      'context/WebSocketSingletonContext',
      'styles/agents.css'
    ];

    const results = {
      existing: [],
      missing: [],
      alternatives: []
    };

    criticalImports.forEach(importPath => {
      // Test both .tsx and .jsx extensions
      const possibleFiles = [
        path.join(frontendSrc, `${importPath}.tsx`),
        path.join(frontendSrc, `${importPath}.jsx`),
        path.join(frontendSrc, `${importPath}.ts`),
        path.join(frontendSrc, `${importPath}.js`),
        path.join(frontendSrc, `${importPath}.css`),
      ];

      let found = false;
      possibleFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          results.existing.push(`${importPath} -> ${filePath}`);
          found = true;
        }
      });

      if (!found) {
        results.missing.push(importPath);
        // Look for similar files
        const dir = path.dirname(path.join(frontendSrc, importPath));
        const basename = path.basename(importPath);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const similar = files.filter(f => 
            f.toLowerCase().includes(basename.toLowerCase()) ||
            basename.toLowerCase().includes(f.replace(/\.[^.]+$/, '').toLowerCase())
          );
          if (similar.length > 0) {
            results.alternatives.push(`${importPath} -> similar: ${similar.join(', ')}`);
          }
        }
      }
    });

    console.log('\n=== IMPORT RESOLUTION RESULTS ===');
    console.log('\nEXISTING FILES:');
    results.existing.forEach(item => console.log('✅', item));
    
    console.log('\nMISSING FILES:');
    results.missing.forEach(item => console.log('❌', item));
    
    console.log('\nALTERNATIVES FOUND:');
    results.alternatives.forEach(item => console.log('🔄', item));

    // Fail if any critical imports are missing
    expect(results.missing.length).toBe(0);
  });

  test('should check for circular imports in ErrorBoundary chain', () => {
    const errorBoundaryPath = path.join(frontendSrc, 'components/ErrorBoundary.tsx');
    const appPath = path.join(frontendSrc, 'App.tsx');
    
    const errorBoundaryContent = fs.readFileSync(errorBoundaryPath, 'utf-8');
    const appContent = fs.readFileSync(appPath, 'utf-8');
    
    // Check if ErrorBoundary imports App or any components that import App
    const errorBoundaryImports = errorBoundaryContent.match(/import.*from\s+['"']([^'"]+)['"']/g) || [];
    const appImports = appContent.match(/import.*from\s+['"']([^'"]+)['"']/g) || [];
    
    console.log('\n=== CIRCULAR IMPORT DETECTION ===');
    console.log('ErrorBoundary imports:', errorBoundaryImports.length);
    console.log('App.tsx imports:', appImports.length);
    
    // Look for potential circular dependencies
    const suspiciousImports = errorBoundaryImports.filter(imp => 
      imp.includes('../') || imp.includes('./App') || imp.includes('@/App')
    );
    
    if (suspiciousImports.length > 0) {
      console.log('❌ Potential circular imports:', suspiciousImports);
    } else {
      console.log('✅ No obvious circular imports detected');
    }
    
    expect(suspiciousImports.length).toBe(0);
  });

  test('should verify tsconfig path mapping is correct', () => {
    const tsconfigPath = path.join('/workspaces/agent-feed/frontend', 'tsconfig.json');
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    
    console.log('\n=== TSCONFIG PATH MAPPING ===');
    console.log('Base URL:', tsconfig.compilerOptions.baseUrl);
    console.log('Paths:', JSON.stringify(tsconfig.compilerOptions.paths, null, 2));
    
    // Verify @/* mapping exists and is correct
    expect(tsconfig.compilerOptions.paths).toHaveProperty('@/*');
    expect(tsconfig.compilerOptions.paths['@/*']).toContain('./src/*');
    expect(tsconfig.compilerOptions.baseUrl).toBe('.');
  });

  test('should simulate vite path resolution', () => {
    // Mock Vite's path resolution
    function resolveAlias(importPath, aliases = { '@': '/workspaces/agent-feed/frontend/src' }) {
      for (const [alias, target] of Object.entries(aliases)) {
        if (importPath.startsWith(alias + '/')) {
          return importPath.replace(alias + '/', target + '/');
        }
      }
      return importPath;
    }

    const testImports = [
      '@/components/ErrorBoundary',
      '@/components/FallbackComponents',
      '@/utils/cn',
      '@/context/WebSocketSingletonContext'
    ];

    console.log('\n=== VITE PATH RESOLUTION SIMULATION ===');
    testImports.forEach(importPath => {
      const resolved = resolveAlias(importPath);
      const exists = fs.existsSync(resolved + '.tsx') || 
                    fs.existsSync(resolved + '.jsx') || 
                    fs.existsSync(resolved + '.ts') || 
                    fs.existsSync(resolved + '.js');
      
      console.log(exists ? '✅' : '❌', `${importPath} -> ${resolved} (exists: ${exists})`);
      
      if (!exists) {
        // Check for alternative extensions
        const alternatives = ['.tsx', '.jsx', '.ts', '.js'].map(ext => resolved + ext)
          .filter(p => fs.existsSync(p));
        if (alternatives.length > 0) {
          console.log('   📁 Found alternatives:', alternatives);
        }
      }
    });
  });
});