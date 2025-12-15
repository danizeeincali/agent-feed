#!/usr/bin/env node
/**
 * Structure Validation CLI Tool
 * Command-line interface for production directory structure validation
 */

const StructureProtection = require('../config/structure-protection');
const fs = require('fs');
const path = require('path');

class StructureValidator {
    constructor() {
        this.protector = new StructureProtection();
        this.commands = {
            'validate': this.validate.bind(this),
            'monitor': this.monitor.bind(this),
            'report': this.generateReport.bind(this),
            'fix': this.fixStructure.bind(this),
            'help': this.showHelp.bind(this)
        };
    }

    async run(args) {
        const command = args[2] || 'validate';
        
        if (this.commands[command]) {
            try {
                await this.commands[command](args);
            } catch (error) {
                console.error(`❌ Error executing ${command}:`, error.message);
                process.exit(1);
            }
        } else {
            console.error(`❌ Unknown command: ${command}`);
            this.showHelp();
            process.exit(1);
        }
    }

    async validate() {
        console.log('🔍 Validating production directory structure...');
        console.log('');
        
        const results = await this.protector.validateStructure();
        
        console.log('📊 **Validation Results**');
        console.log(`   Status: ${results.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Protection: ${results.protection_status === 'ACTIVE' ? '🔒 ACTIVE' : '⚠️ COMPROMISED'}`);
        console.log(`   Validated: ${results.validated_paths.length} paths`);
        console.log(`   Missing: ${results.missing_paths.length} paths`);
        console.log(`   Critical Failures: ${results.critical_failures.length}`);
        console.log(`   Warnings: ${results.warnings.length}`);
        console.log('');

        if (results.status === 'FAIL') {
            console.log('❌ **Critical Failures:**');
            results.critical_failures.forEach(failure => {
                console.log(`   • ${failure}`);
            });
            console.log('');
        }

        if (results.warnings.length > 0) {
            console.log('⚠️ **Warnings:**');
            results.warnings.forEach(warning => {
                console.log(`   • ${warning}`);
            });
            console.log('');
        }

        if (results.status === 'PASS') {
            console.log('🎉 **Structure validation passed!** All critical components are in place.');
        } else {
            console.log('🚨 **Structure validation failed!** Critical issues found.');
            process.exit(1);
        }

        return results;
    }

    async monitor() {
        console.log('📊 Starting structure monitoring...');
        
        const results = await this.protector.monitorStructure();
        
        console.log(`Monitor Results: ${results.status} (${results.timestamp})`);
        console.log(`Protection Status: ${results.protection_status}`);
        console.log('Log saved to: /workspaces/agent-feed/prod/logs/structure-validation.log');
        
        return results;
    }

    async generateReport(args) {
        console.log('📋 Generating detailed structure report...');
        
        const results = await this.protector.validateStructure();
        const report = this.protector.generateReport(results);
        
        const outputFile = args[3] || `/workspaces/agent-feed/prod/reports/structure-report-${Date.now()}.md`;
        
        // Ensure reports directory exists
        const reportsDir = path.dirname(outputFile);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(outputFile, report);
        
        console.log(`✅ Report generated: ${outputFile}`);
        console.log('');
        console.log('📄 **Report Summary:**');
        console.log(report.split('\n').slice(0, 10).join('\n'));
        console.log('...');
        
        return outputFile;
    }

    async fixStructure() {
        console.log('🔧 Attempting to fix structure issues...');
        
        const results = await this.protector.validateStructure();
        
        if (results.status === 'PASS') {
            console.log('✅ No fixes needed - structure is already valid!');
            return;
        }

        console.log('🔧 Creating missing directories and files...');
        
        for (const missing of results.missing_paths) {
            try {
                if (missing.type === 'directory') {
                    if (!fs.existsSync(missing.path)) {
                        fs.mkdirSync(missing.path, { recursive: true });
                        console.log(`✅ Created directory: ${missing.path}`);
                    }
                } else if (missing.type === 'file') {
                    await this.createMissingFile(missing.path);
                    console.log(`✅ Created file: ${missing.path}`);
                }
            } catch (error) {
                console.error(`❌ Failed to create ${missing.path}:`, error.message);
            }
        }

        // Re-validate after fixes
        const newResults = await this.protector.validateStructure();
        console.log(`🔍 Post-fix validation: ${newResults.status}`);
        
        if (newResults.status === 'PASS') {
            console.log('🎉 Structure has been successfully fixed!');
        } else {
            console.log('⚠️ Some issues remain after fix attempt.');
        }
    }

    async createMissingFile(filepath) {
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Create appropriate content based on file type
        if (filepath.endsWith('.protected')) {
            const content = `PROTECTED_WORKSPACE=true
MANUAL_EDIT_FORBIDDEN=true
AGENT_MANAGED=true
CREATED_AT=${new Date().toISOString()}
PURPOSE=Production agent isolated workspace
WARNING=Do not modify or delete this file
`;
            fs.writeFileSync(filepath, content);
        } else if (filepath.endsWith('.gitignore')) {
            const content = `# Protected Agent Workspace - DO NOT MODIFY
# This directory is managed by automated agents

# Protect all contents
*

# Allow control files
!.gitignore
!.protected
!README.md

# System files
.DS_Store
Thumbs.db
*.tmp
*.log
`;
            fs.writeFileSync(filepath, content);
        } else if (filepath.endsWith('init.sh')) {
            const content = `#!/bin/bash
# Production Claude Instance Initialization
echo "🚀 Initializing Production Claude Instance..."
echo "📁 Production Root: /workspaces/agent-feed/prod"
`;
            fs.writeFileSync(filepath, content);
            fs.chmodSync(filepath, '755');
        } else {
            fs.writeFileSync(filepath, '# Auto-generated file\n');
        }
    }

    showHelp() {
        console.log('\n🛡️ **Structure Validator CLI**\n');
        console.log('**Commands:**');
        console.log('  validate  - Validate directory structure (default)');
        console.log('  monitor   - Monitor structure and log results');
        console.log('  report    - Generate detailed validation report');
        console.log('  fix       - Attempt to fix missing structure');
        console.log('  help      - Show this help message');
        console.log('');
        console.log('**Examples:**');
        console.log('  node structure-validator.js validate');
        console.log('  node structure-validator.js report /path/to/report.md');
        console.log('  node structure-validator.js fix');
        console.log('');
    }
}

// CLI entry point
if (require.main === module) {
    const validator = new StructureValidator();
    validator.run(process.argv);
}

module.exports = StructureValidator;