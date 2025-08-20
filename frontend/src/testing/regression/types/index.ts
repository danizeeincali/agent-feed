/**
 * Core types and interfaces for the regression test framework
 */

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  priority: TestPriority;
  tags: string[];
  timeout?: number;
  retries?: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
  execute: () => Promise<TestResult>;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  testCases: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

export interface TestResult {
  testId: string;
  status: TestStatus;
  duration: number;
  startTime: Date;
  endTime: Date;
  error?: Error;
  output?: string;
  screenshot?: string;
  logs?: LogEntry[];
  metrics?: TestMetrics;
  artifacts?: string[];
}

export interface TestMetrics {
  memoryUsage?: number;
  cpuUsage?: number;
  networkRequests?: number;
  renderTime?: number;
  bundleSize?: number;
  coverage?: Coverage;
}

export interface Coverage {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface TestExecution {
  id: string;
  suiteId: string;
  results: TestResult[];
  summary: ExecutionSummary;
  startTime: Date;
  endTime: Date;
  environment: TestEnvironment;
  configuration: TestConfiguration;
}

export interface ExecutionSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: Coverage;
}

export interface TestEnvironment {
  platform: string;
  browser?: string;
  version: string;
  nodeVersion: string;
  dependencies: Record<string, string>;
  variables: Record<string, string>;
}

export interface TestConfiguration {
  parallel: boolean;
  maxWorkers: number;
  timeout: number;
  retries: number;
  reporters: string[];
  coverage: boolean;
  screenshots: boolean;
  videos: boolean;
}

export interface PMReport {
  id: string;
  title: string;
  executionId: string;
  generatedAt: Date;
  status: OverallStatus;
  summary: ExecutiveSummary;
  riskAssessment: RiskAssessment;
  recommendations: Recommendation[];
  trends: TrendAnalysis[];
  nextSteps: string[];
}

export interface ExecutiveSummary {
  overallHealth: HealthStatus;
  testCoverage: number;
  criticalIssues: number;
  regressionCount: number;
  performanceImpact: string;
  deliveryRisk: RiskLevel;
}

export interface RiskAssessment {
  level: RiskLevel;
  factors: RiskFactor[];
  mitigation: string[];
  timeline: string;
}

export interface RiskFactor {
  category: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
}

export interface Recommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  action: string;
  effort: string;
  timeline: string;
}

export interface TrendAnalysis {
  metric: string;
  current: number;
  previous: number;
  change: number;
  direction: 'improving' | 'stable' | 'degrading';
  analysis: string;
}

export interface ChangeVerification {
  id: string;
  changeId: string;
  requester: string;
  description: string;
  impact: string;
  testPlan: string;
  status: VerificationStatus;
  approvals: Approval[];
  createdAt: Date;
  approvedAt?: Date;
}

export interface Approval {
  approver: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  timestamp: Date;
}

export interface NLDPattern {
  id: string;
  type: 'failure' | 'performance' | 'regression';
  pattern: string;
  confidence: number;
  occurrences: number;
  lastSeen: Date;
  prediction: string;
  remedy: string[];
}

export interface LearningOutcome {
  testId: string;
  outcome: TestStatus;
  patterns: string[];
  improvements: string[];
  confidence: number;
  appliedAt: Date;
}

// Enums
export enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  ACCESSIBILITY = 'accessibility',
  VISUAL = 'visual',
  API = 'api'
}

export enum TestPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  TIMEOUT = 'timeout',
  ERROR = 'error'
}

export enum OverallStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red'
}

export enum HealthStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum VerificationStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented'
}