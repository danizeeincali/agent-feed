#!/usr/bin/env node

/**
 * Claude Code Configuration Validator
 * Validates .claude configuration for production isolation
 */

const fs = require('fs');
const path = require('path');

class ClaudeConfigValidator {
  constructor(configDir = '.claude') {
    this.configDir = configDir;
    this.errors = [];
    this.warnings = [];
    this.results = {
      valid: true,
      configFiles: {},
      directories: {},
      agents: {},
      security: {},
      isolation: {}
    };
  }

  validate() {
    console.log('🔍 Validating Claude Code Production Configuration...');
    console.log('=' .repeat(60));

    this.validateDirectoryStructure();
    this.validateConfigurationFiles();
    this.validateAgentConfiguration();
    this.validateSecuritySettings();
    this.validateIsolationBoundaries();
    this.validateIntegrationPoints();

    this.displayResults();
    return this.results;
  }

  validateDirectoryStructure() {
    console.log('\n📁 Directory Structure Validation');
    
    const requiredDirs = [
      '.claude',
      '.claude/agents',
      'agent_workspace',
      'system_instructions', 
      'logs',
      'temp'
    ];

    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        console.log(`  ✅ ${dir}`);
        this.results.directories[dir] = 'exists';
      } else {
        console.log(`  ❌ ${dir} - Missing`);
        this.errors.push(`Required directory missing: ${dir}`);
        this.results.directories[dir] = 'missing';
      }
    });

    // Check permissions
    const writableDirs = ['agent_workspace', 'logs', 'temp'];
    writableDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        try {
          fs.accessSync(dir, fs.constants.W_OK);
          console.log(`  ✅ ${dir} - Writable`);
        } catch (error) {
          console.log(`  ⚠️  ${dir} - Not writable`);
          this.warnings.push(`Directory not writable: ${dir}`);
        }
      }
    });
  }

  validateConfigurationFiles() {
    console.log('\n⚙️  Configuration File Validation');
    
    const configFiles = [
      { name: 'config.json', required: true },
      { name: 'settings.json', required: true },
      { name: 'tools.json', required: true },
      { name: 'README.md', required: true }
    ];

    configFiles.forEach(file => {
      const filePath = path.join(this.configDir, file.name);
      
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file.name}`);
        
        if (file.name.endsWith('.json')) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);
            console.log(`  ✅ ${file.name} - Valid JSON`);
            this.results.configFiles[file.name] = 'valid';
            
            // Specific validation for each config type
            this.validateSpecificConfig(file.name, parsed);
            
          } catch (error) {
            console.log(`  ❌ ${file.name} - Invalid JSON: ${error.message}`);
            this.errors.push(`Invalid JSON in ${file.name}: ${error.message}`);
            this.results.configFiles[file.name] = 'invalid';
          }
        } else {
          this.results.configFiles[file.name] = 'exists';
        }
      } else {
        console.log(`  ❌ ${file.name} - Missing`);
        if (file.required) {
          this.errors.push(`Required config file missing: ${file.name}`);
        }
        this.results.configFiles[file.name] = 'missing';
      }
    });
  }

  validateSpecificConfig(fileName, config) {
    switch (fileName) {
      case 'config.json':
        this.validateMainConfig(config);
        break;
      case 'settings.json':
        this.validateSettingsConfig(config);
        break;
      case 'tools.json':
        this.validateToolsConfig(config);
        break;
    }
  }

  validateMainConfig(config) {
    console.log('    🔧 config.json validation:');
    
    const requiredFields = [
      'workingDirectory',
      'agents',
      'security',
      'environment'
    ];

    requiredFields.forEach(field => {
      if (config[field]) {
        console.log(`      ✅ ${field}`);
      } else {
        console.log(`      ❌ ${field} - Missing`);
        this.errors.push(`Missing required field in config.json: ${field}`);
      }
    });

    // Validate working directory
    if (config.workingDirectory && config.workingDirectory !== process.cwd()) {
      console.log(`      ⚠️  workingDirectory mismatch:`);
      console.log(`         Config: ${config.workingDirectory}`);
      console.log(`         Current: ${process.cwd()}`);
      this.warnings.push('Working directory mismatch');
    }

    // Validate agent isolation
    if (config.agents?.isolation?.enforceWorkspaceBoundaries) {
      console.log('      ✅ Workspace boundaries enforced');
    } else {
      console.log('      ❌ Workspace boundaries not enforced');
      this.errors.push('Workspace boundary enforcement not enabled');
    }
  }

  validateSettingsConfig(config) {
    console.log('    ⚙️  settings.json validation:');
    
    if (config.environment?.type === 'isolated-production') {
      console.log('      ✅ Production environment type');
    } else {
      console.log('      ❌ Not configured for production');
      this.errors.push('Environment not configured for production');
    }

    if (config.restrictions?.enforceWorkspaceBoundaries) {
      console.log('      ✅ Workspace restrictions enabled');
    } else {
      console.log('      ❌ Workspace restrictions not enabled');
      this.errors.push('Workspace restrictions not enabled');
    }
  }

  validateToolsConfig(config) {
    console.log('    🛠️  tools.json validation:');
    
    if (config.toolConfiguration?.restrictedAccess) {
      console.log('      ✅ Restricted access enabled');
    } else {
      console.log('      ❌ Restricted access not enabled');
      this.errors.push('Tool access not restricted');
    }

    if (config.toolPolicies?.globalPolicies?.auditAllOperations) {
      console.log('      ✅ Audit trail enabled');
    } else {
      console.log('      ❌ Audit trail not enabled');
      this.errors.push('Audit trail not enabled');
    }
  }

  validateAgentConfiguration() {
    console.log('\n🤖 Agent Configuration Validation');
    
    const agentsDir = path.join(this.configDir, 'agents');
    if (!fs.existsSync(agentsDir)) {
      console.log('  ❌ Agents directory missing');
      this.errors.push('Agents directory missing');
      return;
    }

    const agentFiles = fs.readdirSync(agentsDir).filter(file => 
      file.endsWith('.md')
    );

    if (agentFiles.length === 0) {
      console.log('  ⚠️  No agent files found');
      this.warnings.push('No agent files found');
    } else {
      console.log(`  ✅ Found ${agentFiles.length} agent file(s)`);
    }

    agentFiles.forEach(file => {
      const filePath = path.join(agentsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.startsWith('---') && content.includes('name:')) {
        console.log(`    ✅ ${file} - Valid agent format`);
        this.results.agents[file] = 'valid';
      } else {
        console.log(`    ❌ ${file} - Invalid agent format`);
        this.errors.push(`Invalid agent format: ${file}`);
        this.results.agents[file] = 'invalid';
      }
    });
  }

  validateSecuritySettings() {
    console.log('\n🔒 Security Validation');
    
    const configPath = path.join(this.configDir, 'config.json');
    if (!fs.existsSync(configPath)) return;
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const securityChecks = [
      { key: 'enforceIsolation', label: 'Isolation enforcement' },
      { key: 'validateOperations', label: 'Operation validation' },
      { key: 'auditEnabled', label: 'Audit logging' }
    ];

    securityChecks.forEach(check => {
      if (config.security?.[check.key]) {
        console.log(`  ✅ ${check.label}`);
        this.results.security[check.key] = true;
      } else {
        console.log(`  ❌ ${check.label} - Disabled`);
        this.errors.push(`Security feature disabled: ${check.label}`);
        this.results.security[check.key] = false;
      }
    });
  }

  validateIsolationBoundaries() {
    console.log('\n🔐 Isolation Boundary Validation');
    
    const restrictedPaths = [
      '/workspaces/agent-feed/src',
      '/workspaces/agent-feed/frontend',
      '/workspaces/agent-feed/business',
      '/workspaces/agent-feed/docs',
      '/workspaces/agent-feed/tests'
    ];

    // Note: These paths exist but should be blocked by Claude
    restrictedPaths.forEach(testPath => {
      if (fs.existsSync(testPath)) {
        console.log(`  ⚠️  ${testPath} - Exists (should be blocked by Claude)`);
        this.results.isolation[testPath] = 'exists-blocked';
      } else {
        console.log(`  ✅ ${testPath} - Not accessible`);
        this.results.isolation[testPath] = 'not-accessible';
      }
    });

    const allowedPaths = [
      '/workspaces/agent-feed/prod/agent_workspace',
      '/workspaces/agent-feed/prod/system_instructions',
      '/workspaces/agent-feed/prod/logs'
    ];

    allowedPaths.forEach(testPath => {
      if (fs.existsSync(testPath)) {
        console.log(`  ✅ ${testPath} - Accessible`);
        this.results.isolation[testPath] = 'accessible';
      } else {
        console.log(`  ❌ ${testPath} - Missing`);
        this.errors.push(`Required path missing: ${testPath}`);
        this.results.isolation[testPath] = 'missing';
      }
    });
  }

  validateIntegrationPoints() {
    console.log('\n🔗 Integration Point Validation');
    
    // Check if CLAUDE.md exists
    const claudeMdPath = 'PRODUCTION_CLAUDE.md';
    if (fs.existsSync(claudeMdPath)) {
      console.log(`  ✅ ${claudeMdPath} - Present`);
    } else {
      console.log(`  ⚠️  ${claudeMdPath} - Missing`);
      this.warnings.push(`Integration file missing: ${claudeMdPath}`);
    }

    // Check agent workspace structure
    const agentWorkspace = 'agent_workspace';
    if (fs.existsSync(agentWorkspace)) {
      const subdirs = ['outputs', 'temp', 'logs'];
      subdirs.forEach(subdir => {
        const dirPath = path.join(agentWorkspace, subdir);
        if (fs.existsSync(dirPath)) {
          console.log(`  ✅ ${dirPath} - Present`);
        } else {
          console.log(`  ⚠️  ${dirPath} - Missing`);
          this.warnings.push(`Agent workspace directory missing: ${dirPath}`);
        }
      });
    }
  }

  displayResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All validations passed! Configuration is ready for production.');
      this.results.valid = true;
    } else {
      if (this.errors.length > 0) {
        console.log(`\n❌ ERRORS (${this.errors.length}):`);
        this.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
        this.results.valid = false;
      }
      
      if (this.warnings.length > 0) {
        console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
        this.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      }
    }
    
    console.log('\n📊 CONFIGURATION STATUS:');
    console.log(`  🗂️  Configuration Files: ${Object.keys(this.results.configFiles).length}`);
    console.log(`  📁 Directories: ${Object.keys(this.results.directories).length}`);
    console.log(`  🤖 Agents: ${Object.keys(this.results.agents).length}`);
    console.log(`  🔒 Security Features: ${Object.values(this.results.security).filter(v => v).length}`);
    console.log(`  🔐 Isolation Boundaries: ${Object.keys(this.results.isolation).length}`);
    
    console.log('\n' + '=' .repeat(60));
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ClaudeConfigValidator();
  const results = validator.validate();
  
  // Exit with appropriate code
  process.exit(results.valid ? 0 : 1);
}

module.exports = ClaudeConfigValidator;