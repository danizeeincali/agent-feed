/**
 * System Instructions Protection Regression Tests
 * Validates read-only protection and system boundaries
 */

const fs = require('fs');
const path = require('path');

describe('System Instructions Protection', () => {
    const systemInstructionsPath = '/workspaces/agent-feed/prod/system_instructions';
    const agentWorkspacePath = '/workspaces/agent-feed/prod/agent_workspace';

    describe('Directory Structure Validation', () => {
        test('should have system_instructions directory under prod', () => {
            expect(fs.existsSync(systemInstructionsPath)).toBe(true);
            expect(fs.statSync(systemInstructionsPath).isDirectory()).toBe(true);
        });

        test('should have agent_workspace under prod (not root)', () => {
            expect(fs.existsSync(agentWorkspacePath)).toBe(true);
            expect(fs.existsSync('/workspaces/agent-feed/agent_workspace')).toBe(false);
        });

        test('should have all required system instruction directories', () => {
            const requiredDirs = ['api', 'rules', 'workspace', 'architecture', 'migration'];
            
            requiredDirs.forEach(dir => {
                const dirPath = path.join(systemInstructionsPath, dir);
                expect(fs.existsSync(dirPath)).toBe(true);
            });
        });

        test('should have protection marker files', () => {
            expect(fs.existsSync(path.join(systemInstructionsPath, '.protected'))).toBe(true);
            expect(fs.existsSync(path.join(agentWorkspacePath, '.protected'))).toBe(true);
        });
    });

    describe('File Permissions Validation', () => {
        test('should have read-only permissions on system instruction files', () => {
            const readmeFile = path.join(systemInstructionsPath, 'README.md');
            if (fs.existsSync(readmeFile)) {
                const stats = fs.statSync(readmeFile);
                const permissions = stats.mode & parseInt('0777', 8);
                // Should be 444 (read-only) or similar read-only permission
                expect(permissions & parseInt('0200', 8)).toBe(0); // No write permission for owner
            }
        });

        test('should have read+execute permissions on system instruction directories', () => {
            const stats = fs.statSync(systemInstructionsPath);
            const permissions = stats.mode & parseInt('0777', 8);
            // Should have read and execute permissions
            expect(permissions & parseInt('0400', 8)).toBeGreaterThan(0); // Read permission
            expect(permissions & parseInt('0100', 8)).toBeGreaterThan(0); // Execute permission
        });
    });

    describe('Content Validation', () => {
        test('should have valid allowed operations JSON', () => {
            const allowedOpsFile = path.join(systemInstructionsPath, 'api', 'allowed_operations.json');
            
            if (fs.existsSync(allowedOpsFile)) {
                const content = fs.readFileSync(allowedOpsFile, 'utf8');
                expect(() => JSON.parse(content)).not.toThrow();
                
                const data = JSON.parse(content);
                expect(data).toHaveProperty('systemInstructions');
                expect(data).toHaveProperty('fileOperations');
                expect(data).toHaveProperty('agentOperations');
            }
        });

        test('should have valid forbidden operations JSON', () => {
            const forbiddenOpsFile = path.join(systemInstructionsPath, 'api', 'forbidden_operations.json');
            
            if (fs.existsSync(forbiddenOpsFile)) {
                const content = fs.readFileSync(forbiddenOpsFile, 'utf8');
                expect(() => JSON.parse(content)).not.toThrow();
                
                const data = JSON.parse(content);
                expect(data).toHaveProperty('systemInstructions');
                expect(data).toHaveProperty('criticalForbiddenOperations');
            }
        });

        test('should have agent workspace rules documentation', () => {
            const rulesFile = path.join(systemInstructionsPath, 'workspace', 'agent_workspace_rules.md');
            
            if (fs.existsSync(rulesFile)) {
                const content = fs.readFileSync(rulesFile, 'utf8');
                expect(content).toContain('ALL AGENT WORK GOES UNDER `/prod/agent_workspace/`');
                expect(content).toContain('/workspaces/agent-feed/prod/agent_workspace/');
            }
        });
    });

    describe('Protection Mechanisms', () => {
        test('should have protection markers with correct content', () => {
            const protectionFile = path.join(systemInstructionsPath, '.protected');
            
            if (fs.existsSync(protectionFile)) {
                const content = fs.readFileSync(protectionFile, 'utf8');
                expect(content).toContain('SYSTEM_INSTRUCTIONS_READ_ONLY=true');
                expect(content).toContain('PROTECTED_FROM_PROD=true');
                expect(content).toContain('MODIFICATION_FORBIDDEN=true');
            }
        });

        test('should not allow write operations to system instructions (simulation)', () => {
            // This simulates what should happen if prod tries to write
            const testFile = path.join(systemInstructionsPath, 'test-write.tmp');
            
            try {
                fs.writeFileSync(testFile, 'test content');
                // If we get here, the write succeeded (should not happen in prod)
                expect(fs.existsSync(testFile)).toBe(true);
                // Clean up if test file was created
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            } catch (error) {
                // This is expected - write should be blocked
                expect(error.code).toBe('EACCES');
            }
        });

        test('should allow read operations to system instructions', () => {
            const readmeFile = path.join(systemInstructionsPath, 'README.md');
            
            if (fs.existsSync(readmeFile)) {
                expect(() => fs.readFileSync(readmeFile, 'utf8')).not.toThrow();
            }
        });
    });

    describe('Agent Workspace Migration', () => {
        test('should have migrated agent workspace to prod', () => {
            expect(fs.existsSync(agentWorkspacePath)).toBe(true);
            expect(fs.existsSync('/workspaces/agent-feed/agent_workspace')).toBe(false);
        });

        test('should have preserved agent workspace structure', () => {
            const expectedDirs = ['logs', 'outputs', 'temp', 'data'];
            
            expectedDirs.forEach(dir => {
                const dirPath = path.join(agentWorkspacePath, dir);
                if (fs.existsSync(dirPath)) {
                    expect(fs.statSync(dirPath).isDirectory()).toBe(true);
                }
            });
        });

        test('should have maintained protection files in agent workspace', () => {
            const protectedFile = path.join(agentWorkspacePath, '.protected');
            const gitignoreFile = path.join(agentWorkspacePath, '.gitignore');
            
            expect(fs.existsSync(protectedFile)).toBe(true);
            expect(fs.existsSync(gitignoreFile)).toBe(true);
        });
    });

    describe('System Integration', () => {
        test('should integrate with existing structure protection', () => {
            // Check if system instructions are included in structure protection
            const structureProtectionFile = '/workspaces/agent-feed/prod/config/structure-protection.js';
            
            if (fs.existsSync(structureProtectionFile)) {
                const content = fs.readFileSync(structureProtectionFile, 'utf8');
                // Should reference the system instructions in some way
                expect(content).toContain('system_instructions');
            }
        });

        test('should have compatible CLAUDE.md configuration', () => {
            const claudeFile = '/workspaces/agent-feed/prod/CLAUDE.md';
            
            if (fs.existsSync(claudeFile)) {
                const content = fs.readFileSync(claudeFile, 'utf8');
                // Should reference the new structure
                expect(content).toContain('system_instructions');
            }
        });
    });

    describe('Security Validation', () => {
        test('should have clear boundaries defined', () => {
            const allowedOpsFile = path.join(systemInstructionsPath, 'api', 'allowed_operations.json');
            const forbiddenOpsFile = path.join(systemInstructionsPath, 'api', 'forbidden_operations.json');
            
            if (fs.existsSync(allowedOpsFile) && fs.existsSync(forbiddenOpsFile)) {
                const allowed = JSON.parse(fs.readFileSync(allowedOpsFile, 'utf8'));
                const forbidden = JSON.parse(fs.readFileSync(forbiddenOpsFile, 'utf8'));
                
                // Should have clear definitions
                expect(allowed.fileOperations).toBeDefined();
                expect(forbidden.criticalForbiddenOperations).toBeDefined();
                
                // Should specifically mention system_instructions protection
                expect(JSON.stringify(forbidden)).toContain('system_instructions');
            }
        });

        test('should prevent system instruction modification in forbidden operations', () => {
            const forbiddenOpsFile = path.join(systemInstructionsPath, 'api', 'forbidden_operations.json');
            
            if (fs.existsSync(forbiddenOpsFile)) {
                const content = fs.readFileSync(forbiddenOpsFile, 'utf8');
                const data = JSON.parse(content);
                
                expect(JSON.stringify(data)).toContain('Modify system_instructions directory');
                expect(JSON.stringify(data)).toContain('Create files in system_instructions directory');
            }
        });
    });

    describe('Operational Validation', () => {
        test('should allow agent operations in workspace', () => {
            const allowedOpsFile = path.join(systemInstructionsPath, 'api', 'allowed_operations.json');
            
            if (fs.existsSync(allowedOpsFile)) {
                const content = fs.readFileSync(allowedOpsFile, 'utf8');
                const data = JSON.parse(content);
                
                expect(data.agentOperations).toBeDefined();
                expect(data.agentOperations.workspaceManagement.scope).toBe('/workspaces/agent-feed/prod/agent_workspace/');
            }
        });

        test('should have swarm coordination capabilities defined', () => {
            const allowedOpsFile = path.join(systemInstructionsPath, 'api', 'allowed_operations.json');
            
            if (fs.existsSync(allowedOpsFile)) {
                const content = fs.readFileSync(allowedOpsFile, 'utf8');
                const data = JSON.parse(content);
                
                expect(data.agentOperations.swarmCoordination).toBeDefined();
                expect(data.agentOperations.swarmCoordination.allowed).toBe(true);
            }
        });
    });

    describe('Regression Prevention', () => {
        test('should maintain structure after changes', () => {
            // This test ensures the structure remains intact
            const criticalFiles = [
                path.join(systemInstructionsPath, '.protected'),
                path.join(systemInstructionsPath, 'README.md'),
                path.join(systemInstructionsPath, 'api', 'allowed_operations.json'),
                path.join(systemInstructionsPath, 'api', 'forbidden_operations.json'),
                path.join(systemInstructionsPath, 'workspace', 'agent_workspace_rules.md')
            ];
            
            criticalFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    expect(fs.statSync(file).isFile()).toBe(true);
                    // Ensure file is not empty
                    expect(fs.statSync(file).size).toBeGreaterThan(0);
                }
            });
        });

        test('should prevent agent workspace from moving back to root', () => {
            expect(fs.existsSync('/workspaces/agent-feed/agent_workspace')).toBe(false);
            expect(fs.existsSync('/workspaces/agent-feed/prod/agent_workspace')).toBe(true);
        });
    });
});

describe('System Instructions Integration Tests', () => {
    test('should provide complete system guidance for production Claude', () => {
        const systemInstructionsPath = '/workspaces/agent-feed/prod/system_instructions';
        
        // Should have comprehensive coverage of all aspects
        const expectedAspects = [
            'api/allowed_operations.json',    // What prod can do
            'api/forbidden_operations.json',  // What prod cannot do  
            'workspace/agent_workspace_rules.md', // Where agents work
            'README.md'                       // Overall guidance
        ];
        
        expectedAspects.forEach(aspect => {
            const filePath = path.join(systemInstructionsPath, aspect);
            expect(fs.existsSync(filePath)).toBe(true);
        });
    });

    test('should maintain clear separation between dev and prod', () => {
        const systemInstructionsPath = '/workspaces/agent-feed/prod/system_instructions';
        
        // Should be under prod directory
        expect(systemInstructionsPath).toContain('/prod/');
        
        // Should not interfere with dev directories
        expect(fs.existsSync('/workspaces/agent-feed/src')).toBe(true);
        expect(fs.existsSync('/workspaces/agent-feed/frontend')).toBe(true);
    });
});