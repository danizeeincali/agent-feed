#!/usr/bin/env node

/**
 * Component Import/Export Validation Script
 * Prevents component import errors that cause White Screen of Death
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ImportExportValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.patterns = this.loadNLDPatterns();
  }

  loadNLDPatterns() {
    try {
      const patternsPath = path.join(__dirname, '../nld-agent/patterns/import-export-patterns.json');
      if (fs.existsSync(patternsPath)) {
        return JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Warning: Could not load NLD patterns:', error.message);
    }
    return {
      knownFailures: [],
      preventionRules: [
        'Missing default export',
        'Circular dependencies',
        'Invalid import paths',
        'TypeScript interface conflicts'
      ]
    };
  }

  async validateProject() {
    console.log('🔍 Validating component imports and exports...');

    // 1. Check for missing exports
    await this.checkMissingExports();
    
    // 2. Check for circular dependencies
    await this.checkCircularDependencies();
    
    // 3. Check for invalid import paths
    await this.checkInvalidImportPaths();
    
    // 4. Check for TypeScript interface conflicts
    await this.checkTypeScriptConflicts();
    
    // 5. Check against known failure patterns
    await this.checkKnownFailurePatterns();

    return this.generateReport();
  }

  async checkMissingExports() {
    console.log('📤 Checking for missing exports...');
    
    const frontendSrc = path.join(__dirname, '../frontend/src');
    const componentFiles = this.findFiles(frontendSrc, /\.(tsx?|jsx?)$/);
    
    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check if file has imports but no exports
      const hasImports = /^import\s+.*from/m.test(content);
      const hasExports = /^export\s+/m.test(content) || /export\s*{[^}]+}/m.test(content) || /export\s+default/m.test(content);
      
      if (hasImports && !hasExports && !file.includes('.test.') && !file.includes('.spec.')) {
        this.warnings.push({
          type: 'missing-export',
          file,
          message: 'File has imports but no exports - potential dead code'
        });
      }
      
      // Check for common problematic patterns
      if (content.includes('export { default }') && !content.includes('export default')) {
        this.errors.push({
          type: 'invalid-default-export',
          file,
          message: 'Invalid default export pattern detected'
        });
      }
    }
  }

  async checkCircularDependencies() {
    console.log('🔄 Checking for circular dependencies...');
    
    try {
      // Use TypeScript compiler to detect circular dependencies
      execSync('npx tsc --noEmit --skipLibCheck', { 
        cwd: path.join(__dirname, '../frontend'),
        stdio: 'pipe'
      });
    } catch (error) {
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      
      if (output.includes('Circular dependency')) {
        this.errors.push({
          type: 'circular-dependency',
          message: 'Circular dependencies detected',
          details: output
        });
      }
    }
  }

  async checkInvalidImportPaths() {
    console.log('📁 Checking for invalid import paths...');
    
    const frontendSrc = path.join(__dirname, '../frontend/src');
    const files = this.findFiles(frontendSrc, /\.(tsx?|jsx?)$/);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
      
      for (const importLine of importLines) {
        const match = importLine.match(/from\s+['"]([^'"]+)['"]/); 
        if (match) {
          const importPath = match[1];
          
          // Check for relative imports that might not exist
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const resolvedPath = path.resolve(path.dirname(file), importPath);
            const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
            const indexExtensions = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
            
            let exists = false;
            for (const ext of extensions) {
              if (fs.existsSync(resolvedPath + ext)) {
                exists = true;
                break;
              }
            }
            
            if (!exists) {
              for (const indexExt of indexExtensions) {
                if (fs.existsSync(resolvedPath + indexExt)) {
                  exists = true;
                  break;
                }
              }
            }
            
            if (!exists) {
              this.errors.push({
                type: 'invalid-import-path',
                file,
                importPath,
                message: `Import path does not exist: ${importPath}`
              });
            }
          }
        }
      }
    }
  }

  async checkTypeScriptConflicts() {
    console.log('🔧 Checking for TypeScript interface conflicts...');
    
    // This will be caught by the TypeScript compiler check, but we can add specific checks
    const typesDir = path.join(__dirname, '../frontend/src/types');
    if (fs.existsSync(typesDir)) {
      const typeFiles = this.findFiles(typesDir, /\.ts$/);
      
      const interfaces = new Map();
      for (const file of typeFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const interfaceMatches = content.match(/export\s+interface\s+(\w+)/g);
        
        if (interfaceMatches) {
          for (const match of interfaceMatches) {
            const interfaceName = match.replace(/export\s+interface\s+/, '');
            if (interfaces.has(interfaceName)) {
              this.errors.push({
                type: 'duplicate-interface',
                interfaceName,
                files: [interfaces.get(interfaceName), file],
                message: `Duplicate interface definition: ${interfaceName}`
              });
            } else {
              interfaces.set(interfaceName, file);
            }
          }
        }
      }
    }
  }

  async checkKnownFailurePatterns() {
    console.log('📊 Checking against known failure patterns...');
    
    for (const pattern of this.patterns.knownFailures) {
      if (pattern.type === 'import-export') {
        // Check for specific patterns that have caused issues before
        const files = this.findFiles(path.join(__dirname, '../frontend/src'), /\.(tsx?|jsx?)$/);
        
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf8');
          
          if (pattern.pattern && content.includes(pattern.pattern)) {
            this.errors.push({
              type: 'known-failure-pattern',
              file,
              pattern: pattern.pattern,
              message: `Known failure pattern detected: ${pattern.description}`
            });
          }
        }
      }
    }
  }

  findFiles(dir, regex) {
    const files = [];
    
    function traverse(currentDir) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          traverse(fullPath);
        } else if (entry.isFile() && regex.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    if (fs.existsSync(dir)) {
      traverse(dir);
    }
    
    return files;
  }

  generateReport() {
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;
    
    console.log('\n📋 Import/Export Validation Report');
    console.log('='.repeat(50));
    
    if (hasErrors) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach((error, i) => {
        console.log(`\n${i + 1}. ${error.type.toUpperCase()}`);
        console.log(`   File: ${error.file || 'N/A'}`);
        console.log(`   Message: ${error.message}`);
        if (error.details) console.log(`   Details: ${error.details}`);
      });
    }
    
    if (hasWarnings) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach((warning, i) => {
        console.log(`\n${i + 1}. ${warning.type.toUpperCase()}`);
        console.log(`   File: ${warning.file}`);
        console.log(`   Message: ${warning.message}`);
      });
    }
    
    if (!hasErrors && !hasWarnings) {
      console.log('\n✅ No import/export issues detected!');
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Log to NLD system
    this.logToNLD({
      type: 'import-export-validation',
      timestamp: new Date().toISOString(),
      errors: this.errors.length,
      warnings: this.warnings.length,
      success: !hasErrors
    });
    
    return !hasErrors;
  }

  logToNLD(data) {
    try {
      const nldDir = path.join(__dirname, '../nld-agent/records');
      if (!fs.existsSync(nldDir)) {
        fs.mkdirSync(nldDir, { recursive: true });
      }
      
      const filename = `import-export-validation-${Date.now()}.json`;
      const filepath = path.join(nldDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify({
        ...data,
        errors: this.errors,
        warnings: this.warnings
      }, null, 2));
    } catch (error) {
      console.warn('Warning: Could not log to NLD system:', error.message);
    }
  }
}

// Run validation
async function main() {
  const validator = new ImportExportValidator();
  const success = await validator.validateProject();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = ImportExportValidator;
