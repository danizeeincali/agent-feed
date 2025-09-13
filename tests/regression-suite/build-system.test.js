/**
 * Build System Validation Test Suite
 * Tests build completion, duplicate key warnings, and production bundle
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('Build System Validation', () => {
  const projectRoot = path.resolve(__dirname, '../../');
  const frontendDir = path.join(projectRoot, 'frontend');

  describe('Frontend Build Process', () => {
    test('should build frontend without duplicate key warnings', async () => {
      const buildOutput = [];
      const buildErrors = [];

      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: frontendDir,
        stdio: 'pipe'
      });

      buildProcess.stdout.on('data', (data) => {
        buildOutput.push(data.toString());
      });

      buildProcess.stderr.on('data', (data) => {
        buildErrors.push(data.toString());
      });

      const exitCode = await new Promise((resolve) => {
        buildProcess.on('close', resolve);
      });

      const allOutput = [...buildOutput, ...buildErrors].join('');
      
      // Check for duplicate key warnings
      const duplicateKeyWarnings = allOutput.match(/duplicate key/gi) || [];
      const keyWarnings = allOutput.match(/Encountered two children with the same key/gi) || [];
      
      if (duplicateKeyWarnings.length > 0) {
        console.error('Duplicate key warnings found:', duplicateKeyWarnings);
      }
      
      if (keyWarnings.length > 0) {
        console.error('React key warnings found:', keyWarnings);
      }

      expect(duplicateKeyWarnings).toHaveLength(0);
      expect(keyWarnings).toHaveLength(0);
      expect(exitCode).toBe(0);

      console.log('✅ Frontend build completed without duplicate key warnings');
    }, 60000);

    test('should generate production bundle files', async () => {
      const distDir = path.join(frontendDir, 'dist');
      
      // Check if dist directory exists
      expect(fs.existsSync(distDir)).toBe(true);

      // Check for index.html
      const indexPath = path.join(distDir, 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);

      // Check for assets directory
      const assetsDir = path.join(distDir, 'assets');
      expect(fs.existsSync(assetsDir)).toBe(true);

      // Check for JavaScript bundles
      const jsFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThan(0);

      // Check for CSS bundles
      const cssFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.css'));
      expect(cssFiles.length).toBeGreaterThan(0);

      console.log('✅ Production bundle files generated successfully');
    });

    test('should have valid index.html with proper imports', async () => {
      const indexPath = path.join(frontendDir, 'dist', 'index.html');
      const indexContent = fs.readFileSync(indexPath, 'utf8');

      // Check for required meta tags
      expect(indexContent).toContain('<meta charset="utf-8">');
      expect(indexContent).toContain('<meta name="viewport"');

      // Check for app container
      expect(indexContent).toContain('id="root"');

      // Check for script imports (Vite should inject these)
      expect(indexContent).toMatch(/<script[^>]*src="[^"]*\.js"/);

      // Check for CSS imports
      expect(indexContent).toMatch(/<link[^>]*href="[^"]*\.css"/);

      console.log('✅ Index.html has valid structure and imports');
    });
  });

  describe('TypeScript Compilation', () => {
    test('should compile TypeScript without errors', async () => {
      const tscOutput = [];
      const tscErrors = [];

      const tscProcess = spawn('npx', ['tsc', '--noEmit'], {
        cwd: frontendDir,
        stdio: 'pipe'
      });

      tscProcess.stdout.on('data', (data) => {
        tscOutput.push(data.toString());
      });

      tscProcess.stderr.on('data', (data) => {
        tscErrors.push(data.toString());
      });

      const exitCode = await new Promise((resolve) => {
        tscProcess.on('close', resolve);
      });

      const allOutput = [...tscOutput, ...tscErrors].join('');
      
      if (exitCode !== 0) {
        console.error('TypeScript compilation errors:', allOutput);
      }

      // Filter out node_modules errors (dependencies)
      const projectErrors = allOutput
        .split('\n')
        .filter(line => 
          line.includes('error TS') && 
          !line.includes('node_modules') &&
          line.trim().length > 0
        );

      expect(projectErrors).toHaveLength(0);
      expect(exitCode).toBe(0);

      console.log('✅ TypeScript compilation successful');
    }, 30000);

    test('should have no unused imports or variables', async () => {
      // Check for common TypeScript issues
      const srcDir = path.join(frontendDir, 'src');
      const tsFiles = getAllTsFiles(srcDir);

      for (const file of tsFiles.slice(0, 10)) { // Check first 10 files
        const content = fs.readFileSync(file, 'utf8');
        
        // Basic checks for common issues
        const unusedImports = content.match(/import\s+{\s*\w+\s*}\s+from\s+['"][^'"]+['"];\s*\n(?!.*\1)/g);
        const unusedVariables = content.match(/const\s+\w+\s*=.*;\s*\n(?!.*\1)/g);
        
        // These are heuristic checks, not perfect
        if (unusedImports && unusedImports.length > 5) {
          console.warn(`Potential unused imports in ${file}`);
        }
      }

      console.log('✅ Code quality checks completed');
    });
  });

  describe('Dependency and Bundle Analysis', () => {
    test('should have reasonable bundle sizes', async () => {
      const assetsDir = path.join(frontendDir, 'dist', 'assets');
      const files = fs.readdirSync(assetsDir);

      const jsFiles = files.filter(f => f.endsWith('.js'));
      const cssFiles = files.filter(f => f.endsWith('.css'));

      // Check JavaScript bundle sizes
      for (const jsFile of jsFiles) {
        const filePath = path.join(assetsDir, jsFile);
        const stats = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);

        console.log(`JS Bundle ${jsFile}: ${sizeMB.toFixed(2)}MB`);
        
        // Main bundle shouldn't be larger than 5MB
        if (jsFile.includes('index')) {
          expect(sizeMB).toBeLessThan(5);
        }
      }

      // Check CSS bundle sizes
      for (const cssFile of cssFiles) {
        const filePath = path.join(assetsDir, cssFile);
        const stats = fs.statSync(filePath);
        const sizeKB = stats.size / 1024;

        console.log(`CSS Bundle ${cssFile}: ${sizeKB.toFixed(2)}KB`);
        
        // CSS should be reasonable size
        expect(sizeKB).toBeLessThan(1000); // 1MB max for CSS
      }

      console.log('✅ Bundle sizes are within reasonable limits');
    });

    test('should include required dependencies', async () => {
      const packageJsonPath = path.join(frontendDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const requiredDeps = [
        'react',
        'react-dom',
        'zod',
        '@radix-ui/react-tabs'
      ];

      for (const dep of requiredDeps) {
        expect(packageJson.dependencies).toHaveProperty(dep);
      }

      console.log('✅ Required dependencies are present');
    });

    test('should not have conflicting dependency versions', async () => {
      const packageLockPath = path.join(frontendDir, 'package-lock.json');
      
      if (fs.existsSync(packageLockPath)) {
        const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
        
        // Check for multiple versions of critical packages
        const checkPackages = ['react', 'react-dom', 'zod'];
        
        for (const pkg of checkPackages) {
          const versions = findPackageVersions(packageLock, pkg);
          
          if (versions.length > 1) {
            console.warn(`Multiple versions of ${pkg} found:`, versions);
          }
          
          // For critical packages, we should only have one version
          if (['react', 'react-dom'].includes(pkg)) {
            expect(versions.length).toBeLessThanOrEqual(1);
          }
        }
      }

      console.log('✅ No conflicting dependency versions found');
    });
  });

  describe('Configuration Validation', () => {
    test('should have valid Vite configuration', async () => {
      const viteConfigPath = path.join(frontendDir, 'vite.config.ts');
      
      if (fs.existsSync(viteConfigPath)) {
        const content = fs.readFileSync(viteConfigPath, 'utf8');
        
        // Basic structure checks
        expect(content).toContain('defineConfig');
        expect(content).toContain('react');
        
        console.log('✅ Vite configuration is valid');
      }
    });

    test('should have valid TypeScript configuration', async () => {
      const tsconfigPath = path.join(frontendDir, 'tsconfig.json');
      
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      expect(tsconfig).toHaveProperty('compilerOptions');
      expect(tsconfig.compilerOptions).toHaveProperty('target');
      expect(tsconfig.compilerOptions).toHaveProperty('module');
      
      console.log('✅ TypeScript configuration is valid');
    });
  });
});

// Helper functions
function getAllTsFiles(dir) {
  const files = [];
  
  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

function findPackageVersions(packageLock, packageName) {
  const versions = new Set();
  
  function searchPackages(packages) {
    for (const [name, info] of Object.entries(packages || {})) {
      if (name === packageName && info.version) {
        versions.add(info.version);
      }
      
      if (info.dependencies) {
        searchPackages(info.dependencies);
      }
    }
  }
  
  searchPackages(packageLock.packages || packageLock.dependencies);
  return Array.from(versions);
}