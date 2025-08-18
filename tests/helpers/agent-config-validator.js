/**
 * Agent Config Validator - London School TDD Agent Configuration Validation
 * Validates MD configuration files for 21+ agents
 */

export class AgentConfigValidator {
  constructor() {
    this.validationRules = new Map();
    this.setupValidationRules();
  }

  /**
   * Setup validation rules for different agent types
   */
  setupValidationRules() {
    // Core agent validation rules
    this.validationRules.set('core-agent', {
      required: ['name', 'capabilities', 'tools'],
      optional: ['coordination', 'constraints', 'metadata'],
      capabilities: {
        minCount: 1,
        validTypes: ['file-editing', 'code-review', 'test-writing', 'project-planning', 'information-gathering']
      },
      tools: {
        required: ['Read', 'Write'],
        optional: ['Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep', 'LS']
      }
    });

    // Coordination agent validation rules
    this.validationRules.set('coordination-agent', {
      required: ['name', 'capabilities', 'coordination'],
      optional: ['tools', 'constraints', 'metrics'],
      capabilities: {
        minCount: 2,
        validTypes: ['agent-coordination', 'workflow-orchestration', 'conflict-resolution', 'load-balancing']
      },
      coordination: {
        required: ['topology'],
        optional: ['consensus', 'loadBalancing', 'faultTolerance'],
        validTopologies: ['hierarchical', 'mesh', 'adaptive', 'collective', 'distributed']
      }
    });

    // Consensus agent validation rules
    this.validationRules.set('consensus-agent', {
      required: ['name', 'capabilities', 'consensus'],
      optional: ['coordination', 'security', 'constraints'],
      capabilities: {
        minCount: 2,
        validTypes: ['consensus-building', 'distributed-coordination', 'conflict-resolution', 'byzantine-tolerance']
      },
      consensus: {
        required: ['algorithm', 'quorumSize'],
        optional: ['timeoutMs', 'retryAttempts'],
        validAlgorithms: ['raft', 'pbft', 'byzantine_fault_tolerant', 'gossip_protocol', 'crdt']
      }
    });

    // Performance agent validation rules
    this.validationRules.set('performance-agent', {
      required: ['name', 'capabilities', 'optimization'],
      optional: ['monitoring', 'constraints', 'coordination'],
      capabilities: {
        minCount: 2,
        validTypes: ['performance-analysis', 'optimization', 'resource-management', 'benchmarking']
      },
      optimization: {
        required: ['targets'],
        optional: ['algorithms', 'constraints'],
        validTargets: ['latency', 'throughput', 'memory', 'cpu', 'network']
      }
    });

    // GitHub agent validation rules
    this.validationRules.set('github-agent', {
      required: ['name', 'capabilities', 'github'],
      optional: ['automation', 'tools', 'constraints'],
      capabilities: {
        minCount: 2,
        validTypes: ['github-api', 'repository-management', 'automation', 'code-review', 'issue-management']
      },
      github: {
        required: ['authentication', 'permissions'],
        optional: ['webhooks', 'actions'],
        validAuth: ['token', 'oauth', 'app'],
        validPermissions: ['read', 'write', 'admin']
      }
    });

    // SPARC agent validation rules
    this.validationRules.set('sparc-agent', {
      required: ['name', 'capabilities', 'sparc'],
      optional: ['workflow', 'tools', 'constraints'],
      capabilities: {
        minCount: 2,
        validTypes: ['sparc-methodology', 'systematic-development', 'documentation', 'validation']
      },
      sparc: {
        required: ['phase'],
        optional: ['methodology', 'documentation', 'validation'],
        validPhases: ['specification', 'pseudocode', 'architecture', 'refinement', 'completion', 'coordination']
      }
    });
  }

  /**
   * Validate agent configuration
   */
  async validateAgentConfig(config) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      agentType: this.determineAgentType(config)
    };

    try {
      // Basic structure validation
      this.validateBasicStructure(config, validation);

      // Type-specific validation
      if (validation.agentType) {
        this.validateAgentType(config, validation);
      }

      // Cross-field validation
      this.validateCrossFields(config, validation);

      // Performance constraints validation
      this.validateConstraints(config, validation);

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate basic configuration structure
   */
  validateBasicStructure(config, validation) {
    // Check required top-level fields
    const requiredFields = ['name', 'capabilities'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        validation.valid = false;
        validation.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate name format
    if (config.name && typeof config.name !== 'string') {
      validation.valid = false;
      validation.errors.push('Agent name must be a string');
    }

    if (config.name && !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(config.name)) {
      validation.valid = false;
      validation.errors.push('Agent name must start with letter and contain only alphanumeric, hyphens, and underscores');
    }

    // Validate capabilities structure
    if (config.capabilities) {
      if (!Array.isArray(config.capabilities)) {
        validation.valid = false;
        validation.errors.push('Capabilities must be an array');
      } else if (config.capabilities.length === 0) {
        validation.valid = false;
        validation.errors.push('Agent must have at least one capability');
      }
    }

    // Validate tools if present
    if (config.tools) {
      if (!Array.isArray(config.tools)) {
        validation.valid = false;
        validation.errors.push('Tools must be an array');
      } else {
        const validTools = ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep', 'LS'];
        const invalidTools = config.tools.filter(tool => !validTools.includes(tool));
        
        if (invalidTools.length > 0) {
          validation.valid = false;
          validation.errors.push(`Invalid tools: ${invalidTools.join(', ')}`);
        }
      }
    }
  }

  /**
   * Determine agent type based on configuration
   */
  determineAgentType(config) {
    if (!config.capabilities || !Array.isArray(config.capabilities)) {
      return 'unknown';
    }

    const capabilities = config.capabilities;

    // Check for coordination agent
    if (capabilities.some(cap => cap.includes('coordination') || cap.includes('orchestration'))) {
      return 'coordination-agent';
    }

    // Check for consensus agent
    if (capabilities.some(cap => cap.includes('consensus') || cap.includes('byzantine'))) {
      return 'consensus-agent';
    }

    // Check for performance agent
    if (capabilities.some(cap => cap.includes('performance') || cap.includes('optimization'))) {
      return 'performance-agent';
    }

    // Check for GitHub agent
    if (capabilities.some(cap => cap.includes('github') || cap.includes('repository'))) {
      return 'github-agent';
    }

    // Check for SPARC agent
    if (capabilities.some(cap => cap.includes('sparc') || cap.includes('methodology'))) {
      return 'sparc-agent';
    }

    // Default to core agent
    return 'core-agent';
  }

  /**
   * Validate agent-type specific configuration
   */
  validateAgentType(config, validation) {
    const rules = this.validationRules.get(validation.agentType);
    if (!rules) return;

    // Validate required fields
    for (const field of rules.required) {
      if (!config[field]) {
        validation.valid = false;
        validation.errors.push(`Missing required field for ${validation.agentType}: ${field}`);
      }
    }

    // Validate capabilities
    if (rules.capabilities && config.capabilities) {
      this.validateCapabilities(config.capabilities, rules.capabilities, validation);
    }

    // Validate tools
    if (rules.tools && config.tools) {
      this.validateTools(config.tools, rules.tools, validation);
    }

    // Validate coordination settings
    if (rules.coordination && config.coordination) {
      this.validateCoordination(config.coordination, rules.coordination, validation);
    }

    // Validate consensus settings
    if (rules.consensus && config.consensus) {
      this.validateConsensus(config.consensus, rules.consensus, validation);
    }

    // Validate optimization settings
    if (rules.optimization && config.optimization) {
      this.validateOptimization(config.optimization, rules.optimization, validation);
    }

    // Validate GitHub settings
    if (rules.github && config.github) {
      this.validateGitHub(config.github, rules.github, validation);
    }

    // Validate SPARC settings
    if (rules.sparc && config.sparc) {
      this.validateSPARC(config.sparc, rules.sparc, validation);
    }
  }

  /**
   * Validate capabilities
   */
  validateCapabilities(capabilities, rules, validation) {
    if (capabilities.length < rules.minCount) {
      validation.valid = false;
      validation.errors.push(`Agent must have at least ${rules.minCount} capabilities`);
    }

    if (rules.validTypes) {
      const invalidCapabilities = capabilities.filter(cap => 
        !rules.validTypes.some(validType => cap.includes(validType))
      );

      if (invalidCapabilities.length > 0) {
        validation.warnings.push(`Unusual capabilities: ${invalidCapabilities.join(', ')}`);
      }
    }
  }

  /**
   * Validate tools configuration
   */
  validateTools(tools, rules, validation) {
    // Check required tools
    if (rules.required) {
      const missingTools = rules.required.filter(tool => !tools.includes(tool));
      if (missingTools.length > 0) {
        validation.valid = false;
        validation.errors.push(`Missing required tools: ${missingTools.join(', ')}`);
      }
    }

    // Warn about unusual tool combinations
    if (tools.includes('Bash') && !tools.includes('Write')) {
      validation.warnings.push('Agent has Bash capability but not Write - unusual combination');
    }
  }

  /**
   * Validate coordination configuration
   */
  validateCoordination(coordination, rules, validation) {
    // Check required coordination fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!coordination[field]) {
          validation.valid = false;
          validation.errors.push(`Missing required coordination field: ${field}`);
        }
      }
    }

    // Validate topology
    if (rules.validTopologies && coordination.topology) {
      if (!rules.validTopologies.includes(coordination.topology)) {
        validation.valid = false;
        validation.errors.push(`Invalid topology: ${coordination.topology}. Valid options: ${rules.validTopologies.join(', ')}`);
      }
    }

    // Validate consensus requirement
    if (coordination.consensus && typeof coordination.consensus !== 'boolean') {
      validation.warnings.push('Coordination consensus should be a boolean value');
    }
  }

  /**
   * Validate consensus configuration
   */
  validateConsensus(consensus, rules, validation) {
    // Check required consensus fields
    if (rules.required) {
      for (const field of rules.required) {
        if (consensus[field] === undefined) {
          validation.valid = false;
          validation.errors.push(`Missing required consensus field: ${field}`);
        }
      }
    }

    // Validate algorithm
    if (rules.validAlgorithms && consensus.algorithm) {
      if (!rules.validAlgorithms.includes(consensus.algorithm)) {
        validation.valid = false;
        validation.errors.push(`Invalid consensus algorithm: ${consensus.algorithm}. Valid options: ${rules.validAlgorithms.join(', ')}`);
      }
    }

    // Validate quorum size
    if (consensus.quorumSize !== undefined) {
      if (!Number.isInteger(consensus.quorumSize) || consensus.quorumSize < 1) {
        validation.valid = false;
        validation.errors.push('Quorum size must be a positive integer');
      }

      if (consensus.quorumSize < 3) {
        validation.warnings.push('Quorum size less than 3 may not provide adequate fault tolerance');
      }
    }

    // Validate timeout
    if (consensus.timeoutMs !== undefined) {
      if (!Number.isInteger(consensus.timeoutMs) || consensus.timeoutMs < 100) {
        validation.valid = false;
        validation.errors.push('Consensus timeout must be at least 100ms');
      }
    }
  }

  /**
   * Validate optimization configuration
   */
  validateOptimization(optimization, rules, validation) {
    // Check required optimization fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!optimization[field]) {
          validation.valid = false;
          validation.errors.push(`Missing required optimization field: ${field}`);
        }
      }
    }

    // Validate targets
    if (rules.validTargets && optimization.targets) {
      if (!Array.isArray(optimization.targets)) {
        validation.valid = false;
        validation.errors.push('Optimization targets must be an array');
      } else {
        const invalidTargets = optimization.targets.filter(target => 
          !rules.validTargets.includes(target)
        );

        if (invalidTargets.length > 0) {
          validation.valid = false;
          validation.errors.push(`Invalid optimization targets: ${invalidTargets.join(', ')}`);
        }
      }
    }

    // Validate constraints
    if (optimization.constraints) {
      this.validateOptimizationConstraints(optimization.constraints, validation);
    }
  }

  /**
   * Validate optimization constraints
   */
  validateOptimizationConstraints(constraints, validation) {
    if (constraints.maxLatency !== undefined) {
      if (!Number.isInteger(constraints.maxLatency) || constraints.maxLatency <= 0) {
        validation.valid = false;
        validation.errors.push('Max latency must be a positive integer (milliseconds)');
      }
    }

    if (constraints.minThroughput !== undefined) {
      if (!Number.isInteger(constraints.minThroughput) || constraints.minThroughput <= 0) {
        validation.valid = false;
        validation.errors.push('Min throughput must be a positive integer (operations/second)');
      }
    }

    if (constraints.maxMemory !== undefined) {
      if (!Number.isInteger(constraints.maxMemory) || constraints.maxMemory <= 0) {
        validation.valid = false;
        validation.errors.push('Max memory must be a positive integer (bytes)');
      }
    }
  }

  /**
   * Validate GitHub configuration
   */
  validateGitHub(github, rules, validation) {
    // Check required GitHub fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!github[field]) {
          validation.valid = false;
          validation.errors.push(`Missing required GitHub field: ${field}`);
        }
      }
    }

    // Validate authentication
    if (rules.validAuth && github.authentication) {
      if (!rules.validAuth.includes(github.authentication)) {
        validation.valid = false;
        validation.errors.push(`Invalid GitHub authentication: ${github.authentication}. Valid options: ${rules.validAuth.join(', ')}`);
      }
    }

    // Validate permissions
    if (rules.validPermissions && github.permissions) {
      if (!Array.isArray(github.permissions)) {
        validation.valid = false;
        validation.errors.push('GitHub permissions must be an array');
      } else {
        const invalidPermissions = github.permissions.filter(perm => 
          !rules.validPermissions.includes(perm)
        );

        if (invalidPermissions.length > 0) {
          validation.valid = false;
          validation.errors.push(`Invalid GitHub permissions: ${invalidPermissions.join(', ')}`);
        }
      }
    }
  }

  /**
   * Validate SPARC configuration
   */
  validateSPARC(sparc, rules, validation) {
    // Check required SPARC fields
    if (rules.required) {
      for (const field of rules.required) {
        if (!sparc[field]) {
          validation.valid = false;
          validation.errors.push(`Missing required SPARC field: ${field}`);
        }
      }
    }

    // Validate phase
    if (rules.validPhases && sparc.phase) {
      if (!rules.validPhases.includes(sparc.phase)) {
        validation.valid = false;
        validation.errors.push(`Invalid SPARC phase: ${sparc.phase}. Valid options: ${rules.validPhases.join(', ')}`);
      }
    }

    // Validate methodology
    if (sparc.methodology && typeof sparc.methodology !== 'string') {
      validation.warnings.push('SPARC methodology should be a string');
    }
  }

  /**
   * Validate cross-field dependencies
   */
  validateCrossFields(config, validation) {
    // Coordination agents should have coordination config
    if (validation.agentType === 'coordination-agent' && !config.coordination) {
      validation.valid = false;
      validation.errors.push('Coordination agents must have coordination configuration');
    }

    // Consensus agents should have consensus config
    if (validation.agentType === 'consensus-agent' && !config.consensus) {
      validation.valid = false;
      validation.errors.push('Consensus agents must have consensus configuration');
    }

    // Performance agents should have optimization config
    if (validation.agentType === 'performance-agent' && !config.optimization) {
      validation.valid = false;
      validation.errors.push('Performance agents must have optimization configuration');
    }

    // GitHub agents should have github config
    if (validation.agentType === 'github-agent' && !config.github) {
      validation.valid = false;
      validation.errors.push('GitHub agents must have GitHub configuration');
    }

    // SPARC agents should have sparc config
    if (validation.agentType === 'sparc-agent' && !config.sparc) {
      validation.valid = false;
      validation.errors.push('SPARC agents must have SPARC configuration');
    }

    // Agents with handoff should have messaging
    if (config.coordination?.handoff && !config.coordination?.messaging) {
      validation.warnings.push('Agents with handoff capability should also have messaging capability');
    }
  }

  /**
   * Validate performance constraints
   */
  validateConstraints(config, validation) {
    if (!config.constraints) return;

    const constraints = config.constraints;

    // Validate execution time constraint
    if (constraints.maxExecutionTime !== undefined) {
      if (!Number.isInteger(constraints.maxExecutionTime) || constraints.maxExecutionTime <= 0) {
        validation.valid = false;
        validation.errors.push('Max execution time must be a positive integer (milliseconds)');
      }

      if (constraints.maxExecutionTime > 600000) { // 10 minutes
        validation.warnings.push('Max execution time over 10 minutes may cause timeout issues');
      }
    }

    // Validate memory constraint
    if (constraints.maxMemoryUsage !== undefined) {
      if (!Number.isInteger(constraints.maxMemoryUsage) || constraints.maxMemoryUsage <= 0) {
        validation.valid = false;
        validation.errors.push('Max memory usage must be a positive integer (bytes)');
      }

      if (constraints.maxMemoryUsage > 1024 * 1024 * 1024) { // 1GB
        validation.warnings.push('Max memory usage over 1GB may cause resource issues');
      }
    }

    // Validate file size constraint
    if (constraints.maxFileSize !== undefined) {
      if (!Number.isInteger(constraints.maxFileSize) || constraints.maxFileSize <= 0) {
        validation.valid = false;
        validation.errors.push('Max file size must be a positive integer (bytes)');
      }
    }
  }

  /**
   * Validate multiple agent configurations
   */
  async validateMultipleConfigs(configs) {
    const results = [];
    
    for (const config of configs) {
      const validation = await this.validateAgentConfig(config);
      results.push({
        agentName: config.name,
        ...validation
      });
    }

    return {
      totalConfigs: configs.length,
      validConfigs: results.filter(r => r.valid).length,
      invalidConfigs: results.filter(r => !r.valid).length,
      results
    };
  }

  /**
   * Generate validation report
   */
  generateValidationReport(validationResults) {
    const report = {
      summary: {
        total: validationResults.length,
        valid: validationResults.filter(r => r.valid).length,
        invalid: validationResults.filter(r => !r.valid).length,
        withWarnings: validationResults.filter(r => r.warnings.length > 0).length
      },
      agentTypes: {},
      commonErrors: {},
      commonWarnings: {},
      recommendations: []
    };

    // Analyze by agent type
    for (const result of validationResults) {
      if (!report.agentTypes[result.agentType]) {
        report.agentTypes[result.agentType] = {
          total: 0,
          valid: 0,
          invalid: 0
        };
      }

      report.agentTypes[result.agentType].total++;
      if (result.valid) {
        report.agentTypes[result.agentType].valid++;
      } else {
        report.agentTypes[result.agentType].invalid++;
      }
    }

    // Analyze common errors
    for (const result of validationResults) {
      for (const error of result.errors) {
        report.commonErrors[error] = (report.commonErrors[error] || 0) + 1;
      }
      for (const warning of result.warnings) {
        report.commonWarnings[warning] = (report.commonWarnings[warning] || 0) + 1;
      }
    }

    // Generate recommendations
    if (report.summary.invalid > 0) {
      report.recommendations.push('Fix validation errors before deploying agents');
    }

    if (report.summary.withWarnings > report.summary.total * 0.5) {
      report.recommendations.push('Review and address configuration warnings');
    }

    const mostCommonError = Object.entries(report.commonErrors)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonError) {
      report.recommendations.push(`Address most common error: ${mostCommonError[0]}`);
    }

    return report;
  }
}

export default AgentConfigValidator;