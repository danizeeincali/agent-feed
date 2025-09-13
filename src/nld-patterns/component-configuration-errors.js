/**
 * NLD Pattern Detection: Component Configuration Errors
 * 
 * Captures and eliminates "Invalid component configuration" error patterns
 * through automated detection, prevention, and auto-fixing mechanisms.
 */

export const componentConfigurationErrors = {
  pattern: 'INVALID_COMPONENT_CONFIGURATION',
  version: '1.0.0',
  
  // Error Detection Patterns
  detection: {
    errorMessage: /Invalid component configuration/i,
    consoleErrors: /Failed prop type|Warning: Failed/i,
    reactErrors: /validateDOMNesting|Each child in a list/i,
    propErrors: /Cannot read propert(y|ies) of undefined|null/i,
    typeErrors: /Expected.*but received/i,
    structureErrors: /Objects are not valid as a React child/i
  },

  // Root Cause Classification
  rootCauses: {
    PROPS_SCHEMA_MISMATCH: {
      pattern: /prop.*type.*expected/i,
      severity: 'high',
      autoFixable: true
    },
    MISSING_REQUIRED_PROPS: {
      pattern: /required prop.*not specified/i,
      severity: 'critical',
      autoFixable: true
    },
    INVALID_PROP_TYPES: {
      pattern: /Invalid prop.*of type/i,
      severity: 'medium',
      autoFixable: true
    },
    MALFORMED_STRUCTURE: {
      pattern: /Objects are not valid as a React child/i,
      severity: 'high',
      autoFixable: false
    }
  },

  // Prevention Mechanisms
  prevention: {
    /**
     * Validate component props against schema
     * @param {string} componentType - Component name
     * @param {object} props - Props to validate
     * @returns {object} Validation result
     */
    validateProps: (componentType, props) => {
      const schema = componentConfigurationErrors.schemas[componentType];
      if (!schema) {
        return { valid: true, warnings: [`No schema found for ${componentType}`] };
      }

      const errors = [];
      const warnings = [];

      // Check required props
      schema.required?.forEach(propName => {
        if (!(propName in props)) {
          errors.push(`Missing required prop: ${propName}`);
        }
      });

      // Validate prop types
      Object.entries(props).forEach(([propName, value]) => {
        const expectedType = schema.properties?.[propName]?.type;
        if (expectedType && !componentConfigurationErrors.isValidType(value, expectedType)) {
          errors.push(`Invalid type for ${propName}: expected ${expectedType}, got ${typeof value}`);
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    },

    /**
     * Add default values for missing props
     * @param {string} componentType - Component name
     * @param {object} props - Current props
     * @returns {object} Props with defaults added
     */
    addDefaults: (componentType, props) => {
      const schema = componentConfigurationErrors.schemas[componentType];
      if (!schema?.defaults) return props;

      const propsWithDefaults = { ...props };
      
      Object.entries(schema.defaults).forEach(([propName, defaultValue]) => {
        if (!(propName in propsWithDefaults)) {
          propsWithDefaults[propName] = defaultValue;
        }
      });

      return propsWithDefaults;
    },

    /**
     * Sanitize and clean invalid prop values
     * @param {object} props - Props to sanitize
     * @returns {object} Sanitized props
     */
    sanitizeProps: (props) => {
      const sanitized = {};
      
      Object.entries(props).forEach(([key, value]) => {
        // Remove null/undefined values that might cause issues
        if (value !== null && value !== undefined) {
          // Handle arrays
          if (Array.isArray(value)) {
            sanitized[key] = value.filter(item => item !== null && item !== undefined);
          }
          // Handle objects
          else if (typeof value === 'object' && value.constructor === Object) {
            sanitized[key] = componentConfigurationErrors.prevention.sanitizeProps(value);
          }
          // Handle primitives
          else {
            sanitized[key] = value;
          }
        }
      });

      return sanitized;
    }
  },

  // Auto-Fix Capabilities
  autoFix: {
    addMissingProps: true,
    convertPropTypes: true,
    validateStructure: true,
    
    /**
     * Attempt to auto-fix component configuration
     * @param {string} componentType - Component name
     * @param {object} props - Original props
     * @param {object} error - Error details
     * @returns {object} Fixed props or null if can't fix
     */
    attemptFix: (componentType, props, error) => {
      const fixes = [];
      let fixedProps = { ...props };

      // Fix missing required props
      if (error.type === 'MISSING_REQUIRED_PROPS') {
        fixedProps = componentConfigurationErrors.prevention.addDefaults(componentType, fixedProps);
        fixes.push('Added default values for missing props');
      }

      // Fix prop type mismatches
      if (error.type === 'INVALID_PROP_TYPES') {
        fixedProps = componentConfigurationErrors.autoFix.convertTypes(fixedProps, componentType);
        fixes.push('Converted prop types');
      }

      // Sanitize props
      fixedProps = componentConfigurationErrors.prevention.sanitizeProps(fixedProps);
      fixes.push('Sanitized props');

      return {
        success: fixes.length > 0,
        fixedProps,
        appliedFixes: fixes
      };
    },

    /**
     * Convert prop types to expected format
     * @param {object} props - Props to convert
     * @param {string} componentType - Component name
     * @returns {object} Converted props
     */
    convertTypes: (props, componentType) => {
      const schema = componentConfigurationErrors.schemas[componentType];
      if (!schema?.properties) return props;

      const converted = { ...props };

      Object.entries(converted).forEach(([propName, value]) => {
        const expectedType = schema.properties[propName]?.type;
        if (expectedType && !componentConfigurationErrors.isValidType(value, expectedType)) {
          converted[propName] = componentConfigurationErrors.typeConverters[expectedType]?.(value) || value;
        }
      });

      return converted;
    }
  },

  // Type Validation Utilities
  isValidType: (value, expectedType) => {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'function': return typeof value === 'function';
      default: return true;
    }
  },

  // Type Converters
  typeConverters: {
    string: (value) => String(value),
    number: (value) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    },
    boolean: (value) => Boolean(value),
    array: (value) => Array.isArray(value) ? value : [value],
    object: (value) => typeof value === 'object' ? value : {},
    function: (value) => typeof value === 'function' ? value : () => {}
  },

  // Component Schemas Registry
  schemas: {
    // Common React components
    Button: {
      required: [],
      properties: {
        onClick: { type: 'function' },
        disabled: { type: 'boolean' },
        children: { type: 'string' },
        className: { type: 'string' },
        type: { type: 'string' }
      },
      defaults: {
        disabled: false,
        type: 'button'
      }
    },
    Input: {
      required: [],
      properties: {
        value: { type: 'string' },
        onChange: { type: 'function' },
        placeholder: { type: 'string' },
        disabled: { type: 'boolean' },
        type: { type: 'string' }
      },
      defaults: {
        disabled: false,
        type: 'text',
        value: ''
      }
    },
    Select: {
      required: ['options'],
      properties: {
        options: { type: 'array' },
        value: { type: 'string' },
        onChange: { type: 'function' },
        disabled: { type: 'boolean' }
      },
      defaults: {
        disabled: false,
        options: []
      }
    }
  },

  // Monitoring Configuration
  monitoring: {
    trackComponentUsage: true,
    logValidationErrors: true,
    reportToSystem: true,
    
    /**
     * Track component usage patterns
     * @param {string} componentType - Component name
     * @param {object} props - Props used
     * @param {boolean} hasError - Whether error occurred
     */
    track: (componentType, props, hasError = false) => {
      const timestamp = new Date().toISOString();
      const usageData = {
        timestamp,
        componentType,
        propsCount: Object.keys(props).length,
        hasError,
        propTypes: Object.entries(props).reduce((types, [key, value]) => {
          types[key] = typeof value;
          return types;
        }, {})
      };

      // Store in memory for analysis
      if (!componentConfigurationErrors.usageHistory) {
        componentConfigurationErrors.usageHistory = [];
      }
      componentConfigurationErrors.usageHistory.push(usageData);

      // Keep only last 1000 entries
      if (componentConfigurationErrors.usageHistory.length > 1000) {
        componentConfigurationErrors.usageHistory.shift();
      }

      return usageData;
    },

    /**
     * Get error patterns from usage history
     * @returns {object} Error pattern analysis
     */
    analyzePatterns: () => {
      if (!componentConfigurationErrors.usageHistory) {
        return { patterns: [], recommendations: [] };
      }

      const errors = componentConfigurationErrors.usageHistory.filter(usage => usage.hasError);
      const patterns = {};
      
      errors.forEach(error => {
        const key = `${error.componentType}:${Object.keys(error.propTypes).sort().join(',')}`;
        patterns[key] = (patterns[key] || 0) + 1;
      });

      const sortedPatterns = Object.entries(patterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      const recommendations = sortedPatterns.map(([pattern, count]) => {
        const [componentType, propTypes] = pattern.split(':');
        return {
          componentType,
          frequency: count,
          recommendation: `Consider updating schema for ${componentType} with props: ${propTypes}`
        };
      });

      return {
        patterns: sortedPatterns,
        recommendations,
        totalErrors: errors.length,
        totalUsage: componentConfigurationErrors.usageHistory.length
      };
    }
  },

  // Neural Learning Integration
  neuralPatterns: {
    /**
     * Extract features for neural network training
     * @param {object} errorContext - Error context data
     * @returns {object} Feature vector
     */
    extractFeatures: (errorContext) => {
      return {
        componentComplexity: Object.keys(errorContext.props || {}).length,
        errorType: errorContext.errorType,
        propsTypes: Object.values(errorContext.props || {}).map(v => typeof v),
        hasChildren: 'children' in (errorContext.props || {}),
        hasHandlers: Object.keys(errorContext.props || {}).some(key => typeof errorContext.props[key] === 'function'),
        timestamp: Date.now()
      };
    },

    /**
     * Train pattern recognition
     * @param {Array} trainingData - Historical error data
     * @returns {object} Trained model metadata
     */
    train: (trainingData) => {
      // Simplified training simulation
      const patterns = trainingData.reduce((acc, data) => {
        const key = `${data.componentType}:${data.errorType}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return {
        trainedAt: new Date().toISOString(),
        patternCount: Object.keys(patterns).length,
        totalSamples: trainingData.length,
        topPatterns: Object.entries(patterns)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
      };
    }
  }
};

// Initialize usage history
componentConfigurationErrors.usageHistory = [];

// Export utility functions for easy access
export const validateComponentProps = componentConfigurationErrors.prevention.validateProps;
export const addDefaultProps = componentConfigurationErrors.prevention.addDefaults;
export const sanitizeComponentProps = componentConfigurationErrors.prevention.sanitizeProps;
export const autoFixComponentConfig = componentConfigurationErrors.autoFix.attemptFix;
export const trackComponentUsage = componentConfigurationErrors.monitoring.track;
export const analyzeErrorPatterns = componentConfigurationErrors.monitoring.analyzePatterns;

export default componentConfigurationErrors;