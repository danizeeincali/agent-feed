/**
 * Production Directory Structure Protection System
 * Validates and monitors critical directory structure for regression testing
 */

const fs = require('fs');
const path = require('path');

class StructureProtection {
    constructor() {
        this.basePath = '/workspaces/agent-feed';
        this.prodPath = '/workspaces/agent-feed/prod';
        
        // Critical structure definition
        this.requiredStructure = {
            '/workspaces/agent-feed/prod': {
                type: 'directory',
                critical: true,
                description: 'Production root directory'
            },
            '/workspaces/agent-feed/prod/agent_workspace': {
                type: 'directory',
                critical: true,
                protected: true,
                description: 'Protected agent workspace'
            },
            '/workspaces/agent-feed/prod/agent_workspace/.protected': {
                type: 'file',
                critical: true,
                content_check: 'PROTECTED_WORKSPACE=true',
                description: 'Workspace protection marker'
            },
            '/workspaces/agent-feed/prod/agent_workspace/.gitignore': {
                type: 'file',
                critical: true,
                content_check: '# Protected Agent Workspace',
                description: 'Workspace git protection'
            },
            '/workspaces/agent-feed/prod/config': {
                type: 'directory',
                critical: true,
                description: 'Production configuration directory'
            },
            '/workspaces/agent-feed/prod/terminal': {
                type: 'directory',
                critical: true,
                description: 'Terminal interface directory'
            },
            '/workspaces/agent-feed/prod/logs': {
                type: 'directory',
                critical: false,
                description: 'System logs directory'
            },
            '/workspaces/agent-feed/prod/monitoring': {
                type: 'directory',
                critical: false,
                description: 'Monitoring data directory'
            },
            '/workspaces/agent-feed/prod/security': {
                type: 'directory',
                critical: false,
                description: 'Security configuration directory'
            },
            '/workspaces/agent-feed/prod/backups': {
                type: 'directory',
                critical: false,
                description: 'Backup storage directory'
            },
            '/workspaces/agent-feed/prod/CLAUDE.md': {
                type: 'file',
                critical: true,
                content_check: '# Production Claude Instance Configuration',
                description: 'Production documentation'
            },
            '/workspaces/agent-feed/prod/init.sh': {
                type: 'file',
                critical: true,
                executable: true,
                description: 'Initialization script'
            }
        };
    }

    /**
     * Validate complete directory structure
     */
    async validateStructure() {
        const results = {
            timestamp: new Date().toISOString(),
            status: 'PASS',
            critical_failures: [],
            warnings: [],
            validated_paths: [],
            missing_paths: [],
            protection_status: 'ACTIVE'
        };

        for (const [filepath, config] of Object.entries(this.requiredStructure)) {
            try {
                const validation = await this.validatePath(filepath, config);
                
                if (validation.exists) {
                    results.validated_paths.push({
                        path: filepath,
                        type: config.type,
                        status: validation.status,
                        description: config.description
                    });
                } else {
                    results.missing_paths.push({
                        path: filepath,
                        type: config.type,
                        critical: config.critical,
                        description: config.description
                    });
                    
                    if (config.critical) {
                        results.critical_failures.push(`Missing critical ${config.type}: ${filepath}`);
                        results.status = 'FAIL';
                    } else {
                        results.warnings.push(`Missing optional ${config.type}: ${filepath}`);
                    }
                }
            } catch (error) {
                results.critical_failures.push(`Validation error for ${filepath}: ${error.message}`);
                results.status = 'FAIL';
            }
        }

        // Special protection checks
        await this.validateProtectionMechanisms(results);
        
        return results;
    }

    /**
     * Validate individual path
     */
    async validatePath(filepath, config) {
        const exists = fs.existsSync(filepath);
        
        if (!exists) {
            return { exists: false, status: 'MISSING' };
        }

        const stats = fs.statSync(filepath);
        const isCorrectType = config.type === 'directory' ? stats.isDirectory() : stats.isFile();
        
        if (!isCorrectType) {
            return { exists: true, status: 'WRONG_TYPE' };
        }

        // Content validation for files
        if (config.type === 'file' && config.content_check) {
            const content = fs.readFileSync(filepath, 'utf8');
            if (!content.includes(config.content_check)) {
                return { exists: true, status: 'CONTENT_INVALID' };
            }
        }

        // Executable check
        if (config.executable) {
            const mode = stats.mode;
            const isExecutable = (mode & parseInt('0001', 8)) !== 0;
            if (!isExecutable) {
                return { exists: true, status: 'NOT_EXECUTABLE' };
            }
        }

        return { exists: true, status: 'VALID' };
    }

    /**
     * Validate protection mechanisms
     */
    async validateProtectionMechanisms(results) {
        const protectionChecks = [
            {
                name: 'Agent Workspace Protection',
                check: () => {
                    const protectedFile = '/workspaces/agent-feed/prod/agent_workspace/.protected';
                    if (!fs.existsSync(protectedFile)) return false;
                    
                    const content = fs.readFileSync(protectedFile, 'utf8');
                    return content.includes('PROTECTED_WORKSPACE=true') && 
                           content.includes('MANUAL_EDIT_FORBIDDEN=true');
                }
            },
            {
                name: 'Git Ignore Protection',
                check: () => {
                    const gitignoreFile = '/workspaces/agent-feed/prod/agent_workspace/.gitignore';
                    if (!fs.existsSync(gitignoreFile)) return false;
                    
                    const content = fs.readFileSync(gitignoreFile, 'utf8');
                    return content.includes('# Protected Agent Workspace - DO NOT MODIFY');
                }
            },
            {
                name: 'Directory Structure Integrity',
                check: () => {
                    // Ensure prod directory exists (old .claude/prod is allowed to coexist)
                    const prodExists = fs.existsSync('/workspaces/agent-feed/prod');
                    
                    return prodExists;
                }
            }
        ];

        for (const protection of protectionChecks) {
            try {
                if (!protection.check()) {
                    results.critical_failures.push(`Protection mechanism failed: ${protection.name}`);
                    results.protection_status = 'COMPROMISED';
                    results.status = 'FAIL';
                }
            } catch (error) {
                results.critical_failures.push(`Protection check error (${protection.name}): ${error.message}`);
                results.protection_status = 'ERROR';
                results.status = 'FAIL';
            }
        }
    }

    /**
     * Generate structure validation report
     */
    generateReport(results) {
        const report = [
            '# Directory Structure Validation Report',
            '',
            `**Timestamp:** ${results.timestamp}`,
            `**Status:** ${results.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`,
            `**Protection Status:** ${results.protection_status === 'ACTIVE' ? '🔒 ACTIVE' : '⚠️ COMPROMISED'}`,
            '',
            '## Validated Paths',
            ''
        ];

        for (const path of results.validated_paths) {
            report.push(`- ✅ **${path.type}**: \`${path.path}\` - ${path.description}`);
        }

        if (results.missing_paths.length > 0) {
            report.push('', '## Missing Paths', '');
            for (const path of results.missing_paths) {
                const icon = path.critical ? '❌' : '⚠️';
                report.push(`- ${icon} **${path.type}**: \`${path.path}\` - ${path.description}`);
            }
        }

        if (results.warnings.length > 0) {
            report.push('', '## Warnings', '');
            for (const warning of results.warnings) {
                report.push(`- ⚠️ ${warning}`);
            }
        }

        if (results.critical_failures.length > 0) {
            report.push('', '## Critical Failures', '');
            for (const failure of results.critical_failures) {
                report.push(`- ❌ ${failure}`);
            }
        }

        return report.join('\n');
    }

    /**
     * Monitor structure changes
     */
    async monitorStructure() {
        const results = await this.validateStructure();
        
        // Log to monitoring system
        const logPath = '/workspaces/agent-feed/prod/logs/structure-validation.log';
        const logEntry = {
            timestamp: results.timestamp,
            status: results.status,
            protection_status: results.protection_status,
            critical_failures: results.critical_failures.length,
            warnings: results.warnings.length,
            validated_paths: results.validated_paths.length
        };
        
        if (fs.existsSync(path.dirname(logPath))) {
            fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        }
        
        return results;
    }
}

module.exports = StructureProtection;