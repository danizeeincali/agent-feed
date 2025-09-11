/**
 * TDD London School: Source Code Synthetic Data Detection
 * 
 * MISSION: Deep static analysis to detect ALL forms of synthetic data generation
 * APPROACH: AST parsing, pattern matching, and code flow analysis
 * TOLERANCE: Zero synthetic data patterns allowed in production code
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';

describe('Source Code Synthetic Data Detection - COMPREHENSIVE ANALYSIS', () => {

  const COMPONENT_PATH = resolve(__dirname, '../../frontend/src/components/UnifiedAgentPage.tsx');
  const UTILS_PATHS = [
    resolve(__dirname, '../../frontend/src/utils/unified-agent-data-transformer.ts'),
    resolve(__dirname, '../../frontend/src/utils/real-data-transformers.ts'),
    resolve(__dirname, '../../frontend/src/utils/validation.ts')
  ];

  describe('Comprehensive Static Code Analysis', () => {
    test('should detect ALL random number generation patterns', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Comprehensive random detection patterns
      const randomPatterns = [
        // Direct Math.random usage
        /Math\.random\(\)/g,
        /random\(\)/g,
        
        // Random with operations
        /Math\.floor\(Math\.random\(/g,
        /Math\.ceil\(Math\.random\(/g,
        /Math\.round\(Math\.random\(/g,
        
        // Random range generators
        /Math\.random\(\) \* \d+/g,
        /\(Math\.random\(\) \* \d+\)/g,
        
        // Indirect random calls
        /\.random\(/g,
        /randomFloat/g,
        /randomInt/g,
        /getRandomValue/g,
        /generateRandomId/g,
        
        // Crypto random (acceptable but should be flagged for review)
        /crypto\.getRandomValues/g,
        /window\.crypto\.getRandomValues/g,
        
        // Third-party random libraries
        /faker\./g,
        /chance\./g,
        /lodash\.random/g,
        /underscore\.random/g,
        
        // UUID generation (often uses random)
        /uuid\.v4/g,
        /uuidv4/g,
        /generateUUID/g
      ];

      randomPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        if (matches) {
          console.error(`CONTAMINATION DETECTED - Random pattern ${index + 1}: ${pattern}`);
          console.error(`Found matches: ${matches.join(', ')}`);
        }
        expect(matches).toBeNull(`Random generation pattern detected: ${pattern}`);
      });
    });

    test('should detect synthetic timestamp generation patterns', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Synthetic timestamp patterns
      const timestampPatterns = [
        // Current time usage for fake timestamps
        /new Date\(\)\.toISOString\(\)/g,
        /Date\.now\(\)/g,
        /new Date\(Date\.now\(\)/g,
        
        // Time arithmetic for fake data
        /- \d+ \* 60 \* 1000/g,  // Minutes ago
        /- \d+ \* 3600 \* 1000/g, // Hours ago
        /- \d+ \* 86400 \* 1000/g, // Days ago
        
        // Common fake timestamp patterns
        /new Date\(Date\.now\(\) - /g,
        /Date\.now\(\) - \d+/g,
        /timestamp.*=.*new Date/g,
        /getTime\(\) - \d+/g,
        
        // Hardcoded fake timestamps
        /"2024-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,
        /"2025-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,
        
        // Date manipulation for fake data
        /setHours\(\d+/g,
        /setMinutes\(\d+/g,
        /setDate\(.*\d+/g
      ];

      timestampPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        if (matches) {
          console.error(`SYNTHETIC TIMESTAMP DETECTED - Pattern ${index + 1}: ${pattern}`);
          console.error(`Found matches: ${matches.join(', ')}`);
        }
        expect(matches).toBeNull(`Synthetic timestamp pattern detected: ${pattern}`);
      });
    });

    test('should detect hardcoded data arrays and objects', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Hardcoded data patterns
      const hardcodedPatterns = [
        // Activity arrays
        /const.*activities.*=.*\[.*{/s,
        /activities.*=.*\[.*{.*id.*:/s,
        /\[.*{.*type.*:.*['"]task_/s,
        
        // Post arrays
        /const.*posts.*=.*\[.*{/s,
        /posts.*=.*\[.*{.*id.*:/s,
        /\[.*{.*type.*:.*['"]insight/s,
        
        // Capability arrays with hardcoded values
        /capabilities.*:.*\[.*['"][^']*['"].*\]/s,
        
        // Interaction objects with hardcoded numbers
        /interactions.*:.*{.*likes.*:.*\d+/s,
        /interactions.*:.*{.*comments.*:.*\d+/s,
        
        // Sample/mock data indicators
        /['"]sample.*['"]:/gi,
        /['"]mock.*['"]:/gi,
        /['"]test.*data['"]:/gi,
        /['"]generated.*['"]:/gi,
        /['"]placeholder.*['"]:/gi
      ];

      hardcodedPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        if (matches) {
          console.error(`HARDCODED DATA DETECTED - Pattern ${index + 1}: ${pattern}`);
          console.error(`Found matches: ${matches.join(', ')}`);
        }
        expect(matches).toBeNull(`Hardcoded data pattern detected: ${pattern}`);
      });
    });

    test('should detect data generation function calls', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Data generation function patterns
      const generationPatterns = [
        // Generation function calls
        /generate\w*Data/gi,
        /create\w*Mock/gi,
        /build\w*Sample/gi,
        /make\w*Fake/gi,
        
        // Mock factory patterns
        /\w*Factory\./gi,
        /\w*Builder\./gi,
        /\w*Generator\./gi,
        
        // Lorem ipsum generators
        /lorem\w*/gi,
        /ipsum\w*/gi,
        
        // Fake data libraries
        /faker\./gi,
        /chance\./gi,
        /casual\./gi,
        
        // AI/ML synthetic data
        /generateSynthetic/gi,
        /artificialData/gi,
        /syntheticDataset/gi
      ];

      generationPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        if (matches) {
          console.error(`DATA GENERATION DETECTED - Pattern ${index + 1}: ${pattern}`);
          console.error(`Found matches: ${matches.join(', ')}`);
        }
        expect(matches).toBeNull(`Data generation pattern detected: ${pattern}`);
      });
    });

    test('should verify all data comes from API responses', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Required API data source patterns (should be present)
      const requiredApiPatterns = [
        /fetch\(`\/api\/agents\/\${.*}\`\)/g,
        /fetchRealActivities/g,
        /fetchRealPosts/g,
        /response\.json\(\)/g,
        /apiData\./g,
        /result\.data/g
      ];

      requiredApiPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        expect(matches).not.toBeNull(`Required API pattern ${index + 1} not found: ${pattern}`);
        expect(matches!.length).toBeGreaterThan(0);
      });

      // Verify data flows from API
      expect(sourceCode).toMatch(/transformApiDataToUnified/);
      expect(sourceCode).toMatch(/const.*response.*=.*await fetch/);
    });
  });

  describe('TypeScript AST Analysis', () => {
    test('should analyze AST for synthetic data patterns', () => {
      if (!existsSync(COMPONENT_PATH)) {
        console.warn('Component file not found, skipping AST analysis');
        return;
      }

      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      const sourceFile = ts.createSourceFile(
        'UnifiedAgentPage.tsx',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      let syntheticPatternsFound: string[] = [];

      function visit(node: ts.Node) {
        // Check for Math.random calls
        if (ts.isCallExpression(node)) {
          if (ts.isPropertyAccessExpression(node.expression)) {
            if (node.expression.expression.getText() === 'Math' && 
                node.expression.name.getText() === 'random') {
              syntheticPatternsFound.push('Math.random() call found');
            }
          }
        }

        // Check for Date.now calls
        if (ts.isCallExpression(node)) {
          if (ts.isPropertyAccessExpression(node.expression)) {
            if (node.expression.expression.getText() === 'Date' && 
                node.expression.name.getText() === 'now') {
              syntheticPatternsFound.push('Date.now() call found');
            }
          }
        }

        // Check for array literals with hardcoded data
        if (ts.isArrayLiteralExpression(node)) {
          if (node.elements.length > 0 && 
              node.elements.some(el => ts.isObjectLiteralExpression(el))) {
            // Check if this looks like hardcoded activity/post data
            const text = node.getText();
            if (text.includes('id:') && text.includes('type:') && 
                (text.includes('task_') || text.includes('insight'))) {
              syntheticPatternsFound.push('Hardcoded data array found');
            }
          }
        }

        // Check for object literals with synthetic data indicators
        if (ts.isObjectLiteralExpression(node)) {
          const text = node.getText();
          const syntheticIndicators = ['sample', 'mock', 'fake', 'generated', 'test'];
          if (syntheticIndicators.some(indicator => text.toLowerCase().includes(indicator))) {
            syntheticPatternsFound.push(`Synthetic data object found: ${text.substring(0, 100)}...`);
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);

      if (syntheticPatternsFound.length > 0) {
        console.error('SYNTHETIC PATTERNS DETECTED IN AST:');
        syntheticPatternsFound.forEach(pattern => console.error(`  - ${pattern}`));
      }

      expect(syntheticPatternsFound).toHaveLength(0);
    });

    test('should verify function declarations contain no data generation', () => {
      if (!existsSync(COMPONENT_PATH)) {
        console.warn('Component file not found, skipping function analysis');
        return;
      }

      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      const sourceFile = ts.createSourceFile(
        'UnifiedAgentPage.tsx',
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      let functionViolations: string[] = [];

      function visit(node: ts.Node) {
        // Analyze function declarations and expressions
        if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
          const functionText = node.getText();
          const functionName = ts.isFunctionDeclaration(node) && node.name 
            ? node.name.getText() 
            : 'anonymous function';

          // Check for synthetic data generation in functions
          const violations = [
            { pattern: /Math\.random/g, name: 'Random generation' },
            { pattern: /Date\.now/g, name: 'Current timestamp usage' },
            { pattern: /new Date\(\)/g, name: 'Current date creation' },
            { pattern: /\[.*{.*id.*:.*"(sample|mock|test)/gi, name: 'Hardcoded sample data' },
            { pattern: /generate\w*Data/gi, name: 'Data generation call' },
            { pattern: /create\w*Mock/gi, name: 'Mock creation call' }
          ];

          violations.forEach(violation => {
            if (violation.pattern.test(functionText)) {
              functionViolations.push(`${violation.name} found in function: ${functionName}`);
            }
          });
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);

      if (functionViolations.length > 0) {
        console.error('FUNCTION VIOLATIONS DETECTED:');
        functionViolations.forEach(violation => console.error(`  - ${violation}`));
      }

      expect(functionViolations).toHaveLength(0);
    });
  });

  describe('Utility Files Analysis', () => {
    test('should analyze utility files for synthetic data patterns', () => {
      UTILS_PATHS.forEach(utilPath => {
        if (!existsSync(utilPath)) {
          console.log(`Utility file not found: ${utilPath} - skipping`);
          return;
        }

        const sourceCode = readFileSync(utilPath, 'utf-8');
        const fileName = utilPath.split('/').pop();

        // Utility files should only transform, not generate
        const prohibitedPatterns = [
          { pattern: /Math\.random/g, name: 'Random generation' },
          { pattern: /Date\.now/g, name: 'Current timestamp' },
          { pattern: /generate\w*/gi, name: 'Generation functions' },
          { pattern: /create\w*Mock/gi, name: 'Mock creation' },
          { pattern: /faker\./gi, name: 'Faker library usage' },
          { pattern: /chance\./gi, name: 'Chance library usage' },
          { pattern: /lorem/gi, name: 'Lorem ipsum' }
        ];

        prohibitedPatterns.forEach(({ pattern, name }) => {
          const matches = sourceCode.match(pattern);
          if (matches) {
            console.error(`UTILITY VIOLATION in ${fileName}: ${name}`);
            console.error(`Matches: ${matches.join(', ')}`);
          }
          expect(matches).toBeNull(`${name} found in utility file: ${fileName}`);
        });

        // Utility files should focus on transformation
        const requiredTransformPatterns = [
          /transform/i,
          /convert/i,
          /map/i,
          /parse/i
        ];

        const hasTransformLogic = requiredTransformPatterns.some(pattern => 
          pattern.test(sourceCode)
        );

        if (sourceCode.length > 100) { // Only check non-trivial files
          expect(hasTransformLogic).toBe(true);
        }
      });
    });
  });

  describe('Import and Dependency Analysis', () => {
    test('should verify no synthetic data library imports', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Prohibited import patterns
      const prohibitedImports = [
        /import.*faker/gi,
        /import.*chance/gi,
        /import.*casual/gi,
        /import.*lorem/gi,
        /from ['"]faker/gi,
        /from ['"]chance/gi,
        /from ['"]casual/gi,
        /require\(['"]faker/gi,
        /require\(['"]chance/gi
      ];

      prohibitedImports.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        if (matches) {
          console.error(`PROHIBITED IMPORT DETECTED - Pattern ${index + 1}: ${pattern}`);
          console.error(`Found matches: ${matches.join(', ')}`);
        }
        expect(matches).toBeNull(`Prohibited import pattern detected: ${pattern}`);
      });
    });

    test('should verify all imports are legitimate', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Extract all import statements
      const importMatches = sourceCode.match(/import.*from ['"][^'"]+['"]/g) || [];
      
      importMatches.forEach(importStatement => {
        // Check for suspicious import names
        const suspiciousPatterns = [
          /mock/gi,
          /fake/gi,
          /sample/gi,
          /test.*data/gi,
          /dummy/gi,
          /placeholder/gi
        ];

        suspiciousPatterns.forEach(pattern => {
          expect(importStatement).not.toMatch(pattern);
        });
      });
    });
  });

  describe('Configuration and Constants Analysis', () => {
    test('should detect hardcoded configuration with synthetic values', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Hardcoded configuration patterns
      const configPatterns = [
        // Default colors that might be synthetic
        /#[0-9A-Fa-f]{6}.*=.*['"].*Blue['"]|['"].*Default['"]/g,
        
        // Hardcoded avatar patterns
        /avatar.*:.*['"]🤖['"].*['"]Sample/gi,
        
        // Default capability arrays
        /capabilities.*:.*\[.*['"]general['"].*['"]assistant['"]/gi,
        
        // Hardcoded interaction counts
        /likes.*:.*[1-9]\d{0,2}(?!.*api|.*response)/g,
        /comments.*:.*[1-9]\d{0,2}(?!.*api|.*response)/g,
        
        // Default performance metrics
        /success_rate.*:.*9[0-9](?!.*api|.*metrics)/g,
        /response_time.*:.*[0-9]\.[0-9](?!.*api|.*metrics)/g
      ];

      configPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        if (matches) {
          console.error(`HARDCODED CONFIG DETECTED - Pattern ${index + 1}: ${pattern}`);
          console.error(`Found matches: ${matches.join(', ')}`);
        }
        expect(matches).toBeNull(`Hardcoded configuration pattern detected: ${pattern}`);
      });
    });
  });

  describe('Runtime Behavior Analysis', () => {
    test('should verify calculation functions use only API data', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Find calculation functions
      const calculationFunctionMatches = sourceCode.match(/const calculate\w+ = [^}]+}/gs) || [];
      
      calculationFunctionMatches.forEach(func => {
        // These functions should only use input parameters, not generate data
        expect(func).not.toMatch(/Math\.random/);
        expect(func).not.toMatch(/Date\.now/);
        expect(func).not.toMatch(/new Date\(\)/);
        
        // Should use input parameters
        expect(func).toMatch(/\w+\?/); // Optional chaining indicating API data
      });
    });

    test('should verify all data transformations are deterministic', () => {
      const sourceCode = readFileSync(COMPONENT_PATH, 'utf-8');
      
      // Find transformation logic
      const transformMatches = sourceCode.match(/transform\w+|convert\w+|map\w+/gi) || [];
      
      transformMatches.forEach(transformCall => {
        // Context around transformation should not include random elements
        const context = sourceCode.substring(
          Math.max(0, sourceCode.indexOf(transformCall) - 200),
          sourceCode.indexOf(transformCall) + 200
        );
        
        expect(context).not.toMatch(/Math\.random/);
        expect(context).not.toMatch(/Date\.now/);
        expect(context).not.toMatch(/generate/);
      });
    });
  });
});