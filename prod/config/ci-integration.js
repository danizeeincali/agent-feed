/**
 * CI/CD Integration for Structure Protection
 * Integrates directory structure validation into continuous integration workflows
 */

const StructureProtection = require('./structure-protection');
const StructureValidator = require('../scripts/structure-validator');
const fs = require('fs');
const path = require('path');

class CIIntegration {
    constructor() {
        this.protector = new StructureProtection();
        this.validator = new StructureValidator();
        this.exitCodes = {
            SUCCESS: 0,
            STRUCTURE_FAILURE: 1,
            PROTECTION_COMPROMISED: 2,
            VALIDATION_ERROR: 3
        };
    }

    /**
     * Run pre-deployment structure validation
     */
    async preDeploymentCheck() {
        console.log('🚀 Running pre-deployment structure validation...');
        console.log('');

        try {
            const results = await this.protector.validateStructure();
            
            // Generate deployment report
            const report = await this.generateDeploymentReport(results);
            
            // Check deployment readiness
            if (results.status === 'PASS' && results.protection_status === 'ACTIVE') {
                console.log('✅ **DEPLOYMENT APPROVED**');
                console.log('   Structure validation: PASSED');
                console.log('   Protection status: ACTIVE');
                console.log('   All critical components verified');
                console.log('');
                console.log(`📊 Report: ${report.file}`);
                
                return {
                    approved: true,
                    exitCode: this.exitCodes.SUCCESS,
                    report: report.file,
                    summary: 'Deployment approved - all validations passed'
                };
            } else {
                console.log('❌ **DEPLOYMENT REJECTED**');
                console.log(`   Structure validation: ${results.status}`);
                console.log(`   Protection status: ${results.protection_status}`);
                console.log(`   Critical failures: ${results.critical_failures.length}`);
                console.log('');
                console.log('🚨 **Issues found:**');
                
                results.critical_failures.forEach(failure => {
                    console.log(`   • ${failure}`);
                });
                
                console.log('');
                console.log(`📊 Report: ${report.file}`);
                
                return {
                    approved: false,
                    exitCode: results.protection_status === 'COMPROMISED' ? 
                        this.exitCodes.PROTECTION_COMPROMISED : 
                        this.exitCodes.STRUCTURE_FAILURE,
                    report: report.file,
                    summary: 'Deployment rejected - critical issues found'
                };
            }
        } catch (error) {
            console.error('❌ **VALIDATION ERROR**');
            console.error(`   Error: ${error.message}`);
            
            return {
                approved: false,
                exitCode: this.exitCodes.VALIDATION_ERROR,
                error: error.message,
                summary: 'Deployment rejected - validation error'
            };
        }
    }

    /**
     * Run post-deployment verification
     */
    async postDeploymentVerification() {
        console.log('🔍 Running post-deployment verification...');
        console.log('');

        try {
            const results = await this.protector.validateStructure();
            
            if (results.status === 'PASS' && results.protection_status === 'ACTIVE') {
                console.log('✅ **POST-DEPLOYMENT VERIFICATION PASSED**');
                console.log('   Structure integrity: MAINTAINED');
                console.log('   Protection mechanisms: ACTIVE');
                console.log('   All systems operational');
                
                // Log successful deployment
                await this.logDeploymentStatus('SUCCESS', results);
                
                return {
                    verified: true,
                    exitCode: this.exitCodes.SUCCESS,
                    summary: 'Post-deployment verification successful'
                };
            } else {
                console.log('⚠️ **POST-DEPLOYMENT VERIFICATION FAILED**');
                console.log('   Structure may have been compromised during deployment');
                console.log(`   Current status: ${results.status}`);
                console.log(`   Protection status: ${results.protection_status}`);
                
                // Log deployment issues
                await this.logDeploymentStatus('FAILED', results);
                
                return {
                    verified: false,
                    exitCode: this.exitCodes.STRUCTURE_FAILURE,
                    summary: 'Post-deployment verification failed'
                };
            }
        } catch (error) {
            console.error('❌ **VERIFICATION ERROR**');
            console.error(`   Error: ${error.message}`);
            
            await this.logDeploymentStatus('ERROR', null, error);
            
            return {
                verified: false,
                exitCode: this.exitCodes.VALIDATION_ERROR,
                error: error.message,
                summary: 'Post-deployment verification error'
            };
        }
    }

    /**
     * Generate deployment readiness report
     */
    async generateDeploymentReport(results) {
        const timestamp = new Date().toISOString();
        const reportDir = '/workspaces/agent-feed/prod/reports/deployment';
        
        // Ensure report directory exists
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const reportFile = path.join(reportDir, `deployment-readiness-${timestamp.replace(/[:.]/g, '-')}.md`);
        
        const report = [
            '# Deployment Readiness Report',
            '',
            `**Generated:** ${timestamp}`,
            `**Status:** ${results.status === 'PASS' ? '✅ APPROVED' : '❌ REJECTED'}`,
            `**Protection:** ${results.protection_status === 'ACTIVE' ? '🔒 ACTIVE' : '⚠️ COMPROMISED'}`,
            '',
            '## Validation Summary',
            '',
            `- **Validated Paths:** ${results.validated_paths.length}`,
            `- **Missing Paths:** ${results.missing_paths.length}`,
            `- **Critical Failures:** ${results.critical_failures.length}`,
            `- **Warnings:** ${results.warnings.length}`,
            '',
            '## Deployment Recommendation',
            ''
        ];
        
        if (results.status === 'PASS' && results.protection_status === 'ACTIVE') {
            report.push(
                '### ✅ **APPROVED FOR DEPLOYMENT**',
                '',
                '**Rationale:**',
                '- All critical directory structures are validated',
                '- Protection mechanisms are fully operational', 
                '- No security vulnerabilities detected',
                '- System is ready for production deployment',
                ''
            );
        } else {
            report.push(
                '### ❌ **DEPLOYMENT BLOCKED**',
                '',
                '**Critical Issues:**',
                ''
            );
            
            results.critical_failures.forEach(failure => {
                report.push(`- 🚨 ${failure}`);
            });
            
            report.push(
                '',
                '**Required Actions:**',
                '1. Resolve all critical failures listed above',
                '2. Ensure protection mechanisms are active',
                '3. Re-run validation before attempting deployment',
                ''
            );
        }
        
        // Add detailed validation results
        report.push(
            '## Detailed Validation Results',
            '',
            '### Validated Paths ✅',
            ''
        );
        
        results.validated_paths.forEach(item => {
            report.push(`- **${item.type}**: \`${item.path}\` - ${item.description}`);
        });
        
        if (results.missing_paths.length > 0) {
            report.push('', '### Missing Paths ❌', '');
            results.missing_paths.forEach(item => {
                const priority = item.critical ? '🔴 CRITICAL' : '🟡 OPTIONAL';
                report.push(`- ${priority} **${item.type}**: \`${item.path}\` - ${item.description}`);
            });
        }
        
        if (results.warnings.length > 0) {
            report.push('', '### Warnings ⚠️', '');
            results.warnings.forEach(warning => {
                report.push(`- ${warning}`);
            });
        }
        
        report.push(
            '',
            '---',
            '',
            `**Report Generated by:** Production Structure Protection System`,
            `**Environment:** ${process.env.NODE_ENV || 'production'}`,
            `**Host:** ${require('os').hostname()}`,
            ''
        );
        
        fs.writeFileSync(reportFile, report.join('\n'));
        
        return {
            file: reportFile,
            content: report.join('\n'),
            summary: {
                status: results.status,
                protection_status: results.protection_status,
                approved: results.status === 'PASS' && results.protection_status === 'ACTIVE'
            }
        };
    }

    /**
     * Log deployment status for monitoring
     */
    async logDeploymentStatus(status, results, error = null) {
        const logDir = '/workspaces/agent-feed/prod/logs';
        const logFile = path.join(logDir, 'deployment.log');
        
        // Ensure log directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            status: status,
            validation_status: results?.status || 'UNKNOWN',
            protection_status: results?.protection_status || 'UNKNOWN',
            critical_failures: results?.critical_failures?.length || 0,
            warnings: results?.warnings?.length || 0,
            error: error?.message || null,
            environment: process.env.NODE_ENV || 'production'
        };
        
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }

    /**
     * GitHub Actions integration
     */
    generateGitHubActionsOutput(result) {
        // Set GitHub Actions outputs
        if (process.env.GITHUB_ACTIONS) {
            console.log(`::set-output name=deployment-approved::${result.approved || false}`);
            console.log(`::set-output name=exit-code::${result.exitCode}`);
            console.log(`::set-output name=report-file::${result.report || ''}`);
            console.log(`::set-output name=summary::${result.summary}`);
            
            // Set step summary
            if (result.approved) {
                console.log('::notice title=Deployment Approved::Structure validation passed - ready for deployment');
            } else {
                console.log('::error title=Deployment Blocked::Structure validation failed - deployment blocked');
            }
        }
    }

    /**
     * Run complete CI validation workflow
     */
    async runCIWorkflow(stage = 'pre-deployment') {
        console.log(`🔄 Running CI/CD structure validation (${stage})...`);
        console.log('');
        
        let result;
        
        switch (stage) {
            case 'pre-deployment':
                result = await this.preDeploymentCheck();
                break;
            case 'post-deployment':
                result = await this.postDeploymentVerification();
                break;
            default:
                throw new Error(`Unknown CI stage: ${stage}`);
        }
        
        // Generate GitHub Actions output if running in CI
        this.generateGitHubActionsOutput(result);
        
        // Exit with appropriate code
        process.exit(result.exitCode);
    }
}

module.exports = CIIntegration;