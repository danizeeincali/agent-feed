/**
 * Neural Models and Types for Agent Orchestration
 * Defines core neural patterns, agent types, and coordination structures
 */

// Core Neural Pattern Types
export interface NeuralPattern {
  id: string;
  name: string;
  type: 'intent_classification' | 'agent_routing' | 'complexity_assessment' | 'performance_optimization';
  confidence: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface IntentPattern extends NeuralPattern {
  type: 'intent_classification';
  intent: UserIntent;
  keywords: string[];
  context: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentRoutingPattern extends NeuralPattern {
  type: 'agent_routing';
  agentType: AgentType;
  taskComplexity: ComplexityLevel;
  requiredCapabilities: string[];
  topology: SwarmTopology;
}

export interface ComplexityPattern extends NeuralPattern {
  type: 'complexity_assessment';
  level: ComplexityLevel;
  factors: ComplexityFactor[];
  estimatedAgents: number;
  estimatedDuration: number;
}

export interface PerformancePattern extends NeuralPattern {
  type: 'performance_optimization';
  metrics: PerformanceMetrics;
  optimizations: string[];
  learningRate: number;
}

// User Intent Classification
export interface UserIntent {
  category: 'development' | 'analysis' | 'coordination' | 'optimization' | 'research' | 'testing';
  subcategory: string;
  complexity: ComplexityLevel;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  scope: 'single_file' | 'module' | 'project' | 'system';
  requiredAgents: AgentType[];
}

// Agent Types and Capabilities
export type AgentType = 
  | 'coordinator' | 'analyst' | 'optimizer' | 'documenter' | 'monitor' 
  | 'specialist' | 'architect' | 'task-orchestrator' | 'code-analyzer'
  | 'perf-analyzer' | 'api-docs' | 'performance-benchmarker' 
  | 'system-architect' | 'researcher' | 'coder' | 'tester' | 'reviewer';

export interface AgentCapability {
  name: string;
  proficiency: number; // 0-1
  domains: string[];
  prerequisites: string[];
}

export interface AgentProfile {
  id: string;
  type: AgentType;
  capabilities: AgentCapability[];
  currentLoad: number;
  maxLoad: number;
  performance: PerformanceMetrics;
  specializations: string[];
  availability: 'available' | 'busy' | 'overloaded' | 'offline';
}

// Swarm Coordination
export type SwarmTopology = 'mesh' | 'hierarchical' | 'ring' | 'star';

export interface SwarmConfiguration {
  topology: SwarmTopology;
  maxAgents: number;
  strategy: 'balanced' | 'specialized' | 'adaptive';
  coordinationPattern: 'centralized' | 'distributed' | 'hybrid';
}

export interface SwarmState {
  id: string;
  configuration: SwarmConfiguration;
  activeAgents: AgentProfile[];
  currentTasks: TaskExecution[];
  performance: SwarmPerformance;
  neural: NeuralSwarmState;
}

// Task Execution and Orchestration
export interface TaskExecution {
  id: string;
  description: string;
  intent: UserIntent;
  assignedAgents: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startTime: Date;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  context: TaskContext;
  dependencies: string[];
  results?: TaskResult;
}

export interface TaskContext {
  userMessage: string;
  codebase: CodebaseContext;
  session: SessionContext;
  previousTasks: string[];
  environment: EnvironmentContext;
}

export interface TaskResult {
  output: any;
  success: boolean;
  metrics: PerformanceMetrics;
  learnings: NeuralPattern[];
  nextRecommendations: string[];
}

// Complexity Assessment
export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex' | 'enterprise';

export interface ComplexityFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

export interface ComplexityAssessment {
  level: ComplexityLevel;
  score: number; // 0-100
  factors: ComplexityFactor[];
  confidence: number;
  reasoning: string[];
  recommendedTopology: SwarmTopology;
  recommendedAgents: AgentType[];
}

// Performance and Metrics
export interface PerformanceMetrics {
  executionTime: number;
  tokenUsage: number;
  accuracy: number;
  efficiency: number;
  userSatisfaction?: number;
  errorRate: number;
  throughput: number;
}

export interface SwarmPerformance {
  overall: PerformanceMetrics;
  byAgent: Map<string, PerformanceMetrics>;
  byTask: Map<string, PerformanceMetrics>;
  trends: PerformanceTrend[];
}

export interface PerformanceTrend {
  metric: keyof PerformanceMetrics;
  direction: 'improving' | 'declining' | 'stable';
  rate: number;
  confidence: number;
}

// Neural Learning and Adaptation
export interface NeuralSwarmState {
  learningRate: number;
  adaptationThreshold: number;
  patterns: Map<string, NeuralPattern>;
  memory: NeuralMemory;
  predictions: NeuralPrediction[];
}

export interface NeuralMemory {
  shortTerm: MemoryEntry[];
  longTerm: MemoryEntry[];
  episodic: EpisodicMemory[];
  semantic: SemanticMemory[];
}

export interface MemoryEntry {
  id: string;
  content: any;
  timestamp: Date;
  importance: number;
  accessCount: number;
  lastAccessed: Date;
  tags: string[];
}

export interface EpisodicMemory extends MemoryEntry {
  context: TaskContext;
  outcome: TaskResult;
  lessons: string[];
}

export interface SemanticMemory extends MemoryEntry {
  concept: string;
  relationships: string[];
  confidence: number;
}

export interface NeuralPrediction {
  id: string;
  type: 'performance' | 'task_outcome' | 'resource_need' | 'user_intent';
  prediction: any;
  confidence: number;
  timestamp: Date;
  actualOutcome?: any;
  accuracy?: number;
}

// Context Structures
export interface CodebaseContext {
  language: string;
  framework?: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  complexity: ComplexityLevel;
  domain: string;
  architecture: string[];
}

export interface SessionContext {
  id: string;
  startTime: Date;
  userPreferences: UserPreferences;
  conversationHistory: ConversationEntry[];
  achievements: Achievement[];
}

export interface UserPreferences {
  preferredAgents: AgentType[];
  workingStyle: 'collaborative' | 'autonomous' | 'guided';
  communicationLevel: 'minimal' | 'standard' | 'verbose';
  qualityThreshold: number;
  speedPreference: 'fast' | 'balanced' | 'thorough';
}

export interface ConversationEntry {
  timestamp: Date;
  userMessage: string;
  intent: UserIntent;
  agentsInvolved: string[];
  outcome: string;
  satisfaction?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  value: number;
}

export interface EnvironmentContext {
  platform: string;
  capabilities: string[];
  constraints: string[];
  resources: ResourceAvailability;
}

export interface ResourceAvailability {
  cpu: number; // 0-1
  memory: number; // 0-1
  network: number; // 0-1
  storage: number; // 0-1
}

// Queen Chief of Staff Specific Types
export interface QueenDecision {
  id: string;
  type: 'strategic' | 'tactical' | 'operational' | 'emergency';
  description: string;
  reasoning: string[];
  confidence: number;
  expectedOutcome: string;
  alternatives: AlternativeDecision[];
  timestamp: Date;
  implementation: ImplementationPlan;
}

export interface AlternativeDecision {
  description: string;
  pros: string[];
  cons: string[];
  confidence: number;
}

export interface ImplementationPlan {
  steps: ImplementationStep[];
  timeline: Date;
  resources: string[];
  riskMitigation: string[];
}

export interface ImplementationStep {
  id: string;
  description: string;
  assignedAgents: string[];
  dependencies: string[];
  estimatedDuration: number;
  status: 'pending' | 'active' | 'completed' | 'blocked';
}

// Monitoring and Coordination
export interface CoordinationCycle {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'interrupted';
  decisions: QueenDecision[];
  observations: Observation[];
  interventions: Intervention[];
  metrics: CycleMetrics;
}

export interface Observation {
  id: string;
  type: 'performance' | 'bottleneck' | 'opportunity' | 'risk';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: string;
  data: any;
}

export interface Intervention {
  id: string;
  trigger: string;
  action: string;
  target: string;
  timestamp: Date;
  outcome?: string;
  effectiveness?: number;
}

export interface CycleMetrics {
  decisionsPerformed: number;
  interventionsExecuted: number;
  performanceImprovement: number;
  issuesResolved: number;
  newOpportunities: number;
}

// Export all types for easy importing
export type {
  NeuralPattern,
  IntentPattern,
  AgentRoutingPattern,
  ComplexityPattern,
  PerformancePattern,
  UserIntent,
  AgentProfile,
  SwarmState,
  TaskExecution,
  ComplexityAssessment,
  PerformanceMetrics,
  NeuralSwarmState,
  QueenDecision,
  CoordinationCycle
};