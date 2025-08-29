"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MixedAPIVersioningPreventionStrategies = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
class MixedAPIVersioningPreventionStrategies {
    strategiesPath;
    constructor() {
        this.strategiesPath = path.join(process.cwd(), 'src/nld/patterns/prevention-strategies.json');
    }
    /**
     * Generate TDD prevention strategies
     */
    generateTDDPreventionStrategies() {
        return [
            {
                strategy: 'Unified Endpoint Configuration',
                testPattern: 'config-driven-endpoints',
                implementation: [
                    'Create centralized endpoint configuration',
                    'Replace hardcoded endpoints with configuration',
                    'Add validation middleware'
                ],
                validationRules: [
                    'No hardcoded API paths in components',
                    'All API calls use centralized configuration',
                    'Tests verify endpoint consistency'
                ],
                preventionScore: 95
            },
            {
                strategy: 'Complete User Workflow Testing',
                testPattern: 'end-to-end-workflow',
                implementation: [
                    'Test complete Claude instance workflow',
                    'Verify endpoint consistency across all steps',
                    'Simulate real user interactions'
                ],
                validationRules: [
                    'Test covers complete workflow',
                    'All endpoints use consistent versioning',
                    'No undefined parameters in URLs'
                ],
                preventionScore: 88
            }
        ];
    }
    /**
     * Export prevention strategies
     */
    async exportPreventionStrategies() {
        const strategies = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            description: 'Mixed API Versioning Prevention Strategies',
            tddStrategies: this.generateTDDPreventionStrategies(),
            implementationGuide: {
                phase1: 'Create centralized endpoint configuration',
                phase2: 'Replace hardcoded API paths',
                phase3: 'Add validation tests',
                phase4: 'Deploy monitoring'
            }
        };
        await fs_1.promises.writeFile(this.strategiesPath, JSON.stringify(strategies, null, 2), 'utf-8');
        console.log(`Prevention strategies exported to: ${this.strategiesPath}`);
    }
    /**
     * Generate test templates (simplified)
     */
    async generateTestTemplates() {
        const testTemplatesPath = path.join(process.cwd(), 'src/nld/patterns/test-templates');
        await fs_1.promises.mkdir(testTemplatesPath, { recursive: true });
        const endpointTest = `
import { API_ENDPOINTS } from '../config/endpoints';

describe('Endpoint Consistency', () => {
  test('should use unified endpoints', () => {
    const endpoints = Object.values(API_ENDPOINTS);
    endpoints.forEach(endpoint => {
      expect(endpoint).not.toMatch(/\\/api\\/v\\d+\\//);
    });
  });
});`;
        await fs_1.promises.writeFile(path.join(testTemplatesPath, 'endpoint-consistency.test.ts'), endpointTest, 'utf-8');
        console.log(`Test templates generated in: ${testTemplatesPath}`);
    }
}
exports.MixedAPIVersioningPreventionStrategies = MixedAPIVersioningPreventionStrategies;
exports.default = MixedAPIVersioningPreventionStrategies;
//# sourceMappingURL=mixed-api-versioning-prevention-strategies.js.map