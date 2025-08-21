/**
 * Structure Protection Regression Tests
 * Validates production directory structure integrity
 */

const StructureProtection = require('../../prod/config/structure-protection');
const StructureValidator = require('../../prod/scripts/structure-validator');
const fs = require('fs');
const path = require('path');

describe('Production Directory Structure Protection', () => {
    let protector;
    let validator;

    beforeEach(() => {
        protector = new StructureProtection();
        validator = new StructureValidator();
    });

    describe('Structure Validation', () => {
        test('should validate all critical directories exist', async () => {
            const results = await protector.validateStructure();
            
            expect(results.status).toBe('PASS');
            expect(results.protection_status).toBe('ACTIVE');
            expect(results.critical_failures).toHaveLength(0);
        });

        test('should detect missing critical paths', async () => {
            // Temporarily remove a critical directory for testing
            const testPath = '/tmp/test-prod-structure';
            const testProtector = new class extends StructureProtection {
                constructor() {
                    super();
                    this.requiredStructure = {
                        [`${testPath}/critical-test`]: {
                            type: 'directory',
                            critical: true,
                            description: 'Test critical directory'
                        }
                    };
                }
            }();

            const results = await testProtector.validateStructure();
            
            expect(results.status).toBe('FAIL');
            expect(results.critical_failures.length).toBeGreaterThan(0);
            expect(results.missing_paths.length).toBeGreaterThan(0);
        });

        test('should validate file content requirements', async () => {
            const protectedFile = '/workspaces/agent-feed/prod/agent_workspace/.protected';
            
            if (fs.existsSync(protectedFile)) {
                const content = fs.readFileSync(protectedFile, 'utf8');
                
                expect(content).toContain('PROTECTED_WORKSPACE=true');
                expect(content).toContain('MANUAL_EDIT_FORBIDDEN=true');
                expect(content).toContain('AGENT_MANAGED=true');
            }
        });

        test('should validate executable permissions', async () => {
            const initScript = '/workspaces/agent-feed/prod/init.sh';
            
            if (fs.existsSync(initScript)) {
                const stats = fs.statSync(initScript);
                const isExecutable = (stats.mode & parseInt('0001', 8)) !== 0;
                
                expect(isExecutable).toBe(true);
            }
        });
    });

    describe('Protection Mechanisms', () => {
        test('should verify agent workspace protection is active', async () => {
            const results = await protector.validateStructure();
            
            // Check protection status
            expect(results.protection_status).toBe('ACTIVE');
            
            // Verify .protected file exists and has correct content
            const protectedFile = '/workspaces/agent-feed/prod/agent_workspace/.protected';
            expect(fs.existsSync(protectedFile)).toBe(true);
            
            if (fs.existsSync(protectedFile)) {
                const content = fs.readFileSync(protectedFile, 'utf8');
                expect(content).toContain('PROTECTED_WORKSPACE=true');
                expect(content).toContain('MANUAL_EDIT_FORBIDDEN=true');
            }
        });

        test('should verify git ignore protection is working', async () => {
            const gitignoreFile = '/workspaces/agent-feed/prod/agent_workspace/.gitignore';
            
            if (fs.existsSync(gitignoreFile)) {
                const content = fs.readFileSync(gitignoreFile, 'utf8');
                
                expect(content).toContain('# Protected Agent Workspace');
                expect(content).toContain('# DO NOT MODIFY');
                expect(content).toContain('*'); // Should ignore all files
                expect(content).toContain('!.gitignore'); // But allow .gitignore
                expect(content).toContain('!.protected'); // But allow .protected
            }
        });

        test('should ensure production directory is separate from .claude/prod', () => {
            const prodExists = fs.existsSync('/workspaces/agent-feed/prod');
            const oldClaudeExists = fs.existsSync('/workspaces/agent-feed/.claude/prod');
            
            expect(prodExists).toBe(true);
            expect(oldClaudeExists).toBe(false);
        });
    });

    describe('Monitoring and Reporting', () => {
        test('should generate structure monitoring data', async () => {
            const results = await protector.monitorStructure();
            
            expect(results).toHaveProperty('timestamp');
            expect(results).toHaveProperty('status');
            expect(results).toHaveProperty('protection_status');
            expect(results).toHaveProperty('validated_paths');
            expect(results).toHaveProperty('missing_paths');
            expect(results).toHaveProperty('critical_failures');
        });

        test('should generate validation report', () => {
            const mockResults = {
                timestamp: '2025-08-21T10:00:00.000Z',
                status: 'PASS',
                protection_status: 'ACTIVE',
                validated_paths: [
                    { path: '/test/path', type: 'directory', description: 'Test directory' }
                ],
                missing_paths: [],
                warnings: [],
                critical_failures: []
            };

            const report = protector.generateReport(mockResults);
            
            expect(report).toContain('# Directory Structure Validation Report');
            expect(report).toContain('✅ PASS');
            expect(report).toContain('🔒 ACTIVE');
            expect(report).toContain('## Validated Paths');
        });

        test('should log monitoring results', async () => {
            // Ensure logs directory exists
            const logsDir = '/workspaces/agent-feed/prod/logs';
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }

            const results = await protector.monitorStructure();
            
            const logPath = '/workspaces/agent-feed/prod/logs/structure-validation.log';
            if (fs.existsSync(logPath)) {
                const logContent = fs.readFileSync(logPath, 'utf8');
                const lastLine = logContent.trim().split('\\n').pop();
                const logEntry = JSON.parse(lastLine);
                
                expect(logEntry).toHaveProperty('timestamp');
                expect(logEntry).toHaveProperty('status');
                expect(logEntry).toHaveProperty('protection_status');
            }
        });
    });

    describe('CLI Validator Integration', () => {
        test('should validate structure via CLI', async () => {
            const results = await validator.validate();
            
            expect(results).toHaveProperty('status');
            expect(results).toHaveProperty('protection_status');
        });

        test('should generate reports via CLI', async () => {
            const reportPath = `/tmp/test-structure-report-${Date.now()}.md`;
            
            // Mock args for report generation
            const mockArgs = ['node', 'structure-validator.js', 'report', reportPath];
            
            const outputFile = await validator.generateReport(mockArgs);
            
            expect(outputFile).toBe(reportPath);
            
            if (fs.existsSync(reportPath)) {
                const content = fs.readFileSync(reportPath, 'utf8');
                expect(content).toContain('# Directory Structure Validation Report');
                
                // Cleanup
                fs.unlinkSync(reportPath);
            }
        });
    });

    describe('Regression Detection', () => {
        test('should detect structure regressions', async () => {
            // Simulate a structure regression by checking for non-existent critical path
            const testProtector = new class extends StructureProtection {
                constructor() {
                    super();
                    // Add a non-existent critical requirement
                    this.requiredStructure['/non-existent/critical/path'] = {
                        type: 'directory',
                        critical: true,
                        description: 'Non-existent test directory'
                    };
                }
            }();

            const results = await testProtector.validateStructure();
            
            expect(results.status).toBe('FAIL');
            expect(results.critical_failures.length).toBeGreaterThan(0);
            expect(results.critical_failures).toEqual(
                expect.arrayContaining([
                    expect.stringMatching(/Missing critical directory.*non-existent/)
                ])
            );
        });

        test('should validate protection mechanism integrity', async () => {
            const results = await protector.validateStructure();
            
            // Ensure all protection mechanisms are working
            expect(results.protection_status).toBe('ACTIVE');
            
            // Verify no critical protection failures
            const protectionFailures = results.critical_failures.filter(
                failure => failure.includes('Protection mechanism failed')
            );
            expect(protectionFailures).toHaveLength(0);
        });

        test('should maintain structure consistency across sessions', async () => {
            // First validation
            const results1 = await protector.validateStructure();
            
            // Wait a moment and validate again
            await new Promise(resolve => setTimeout(resolve, 100));
            const results2 = await protector.validateStructure();
            
            // Structure should be consistent
            expect(results1.status).toBe(results2.status);
            expect(results1.protection_status).toBe(results2.protection_status);
            expect(results1.validated_paths.length).toBe(results2.validated_paths.length);
        });
    });

    describe('Performance and Reliability', () => {
        test('should validate structure within reasonable time', async () => {
            const startTime = Date.now();
            
            await protector.validateStructure();
            
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should handle concurrent validation requests', async () => {
            // Run multiple validations concurrently
            const validationPromises = Array.from({ length: 5 }, () => 
                protector.validateStructure()
            );
            
            const results = await Promise.all(validationPromises);
            
            // All should complete successfully
            results.forEach(result => {
                expect(result).toHaveProperty('status');
                expect(result).toHaveProperty('protection_status');
            });
        });

        test('should gracefully handle filesystem errors', async () => {
            // Mock a filesystem error
            const originalExistsSync = fs.existsSync;
            fs.existsSync = jest.fn().mockImplementation((path) => {
                if (path.includes('error-test')) {
                    throw new Error('Mock filesystem error');
                }
                return originalExistsSync(path);
            });

            const testProtector = new class extends StructureProtection {
                constructor() {
                    super();
                    this.requiredStructure = {
                        '/error-test/path': {
                            type: 'directory',
                            critical: false,
                            description: 'Error test path'
                        }
                    };
                }
            }();

            const results = await testProtector.validateStructure();
            
            // Should handle the error gracefully
            expect(results).toHaveProperty('status');
            expect(results.critical_failures.length).toBeGreaterThan(0);
            
            // Restore original function
            fs.existsSync = originalExistsSync;
        });
    });
});

describe('Structure Protection Integration Tests', () => {
    test('should integrate with production workflow', async () => {
        const protector = new StructureProtection();
        
        // Validate current production structure
        const results = await protector.validateStructure();
        
        // Should pass all critical validations for production readiness
        expect(results.status).toBe('PASS');
        expect(results.protection_status).toBe('ACTIVE');
        expect(results.critical_failures).toHaveLength(0);
        
        // Should have all required production paths
        const criticalPaths = Object.entries(protector.requiredStructure)
            .filter(([, config]) => config.critical)
            .map(([path]) => path);
        
        const validatedCriticalPaths = results.validated_paths
            .filter(path => criticalPaths.includes(path.path));
        
        expect(validatedCriticalPaths.length).toBe(criticalPaths.length);
    });

    test('should maintain protection during CI/CD workflows', async () => {
        const protector = new StructureProtection();
        
        // Simulate CI/CD environment check
        const results = await protector.validateStructure();
        
        // Critical for deployment readiness
        expect(results.status).toBe('PASS');
        
        // Protection mechanisms must be active
        expect(results.protection_status).toBe('ACTIVE');
        
        // No critical failures allowed in CI/CD
        expect(results.critical_failures).toHaveLength(0);
    });
});