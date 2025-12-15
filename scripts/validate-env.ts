#!/usr/bin/env node
/**
 * Environment Variables Validation Script
 *
 * Usage:
 *   npm run validate-env
 *   node scripts/validate-env.ts
 *   ts-node scripts/validate-env.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  validateEnvironment,
  printValidationReport,
  validateEnvironmentOrThrow,
} from '../src/utils/env-validator';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const createDirs = args.includes('--create-dirs');
const throwOnError = args.includes('--throw');

console.log('Validating environment variables...\n');

try {
  if (throwOnError) {
    // Validate and throw on error
    validateEnvironmentOrThrow({ createMissingDirs: createDirs });
    console.log('✅ Environment validation successful!\n');
  } else {
    // Validate and print report
    const result = validateEnvironment({ createMissingDirs: createDirs });
    printValidationReport(result);

    // Exit with error code if validation failed
    if (!result.valid) {
      process.exit(1);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
