import { EventEmitter } from 'events';
import { ClaudeFlowSession, ClaudeFlowConfig, SessionMetrics, NeuralPattern } from '@/types';
interface AgentSpawnResponse {
    agentId: string;
    type: string;
    capabilities: string[];
    status: string;
}
interface TaskOrchestrationResponse {
    taskId: string;
    status: string;
    assignedAgents: string[];
    estimatedCompletion: Date;
}
export declare class ClaudeFlowService extends EventEmitter {
    private sessions;
    private swarmConnections;
    constructor();
    private setupEventHandlers;
    initializeSwarm(userId: string, config: ClaudeFlowConfig): Promise<ClaudeFlowSession>;
    spawnAgent(sessionId: string, agentType: string, capabilities?: string[]): Promise<AgentSpawnResponse>;
    orchestrateTask(sessionId: string, task: string, options?: {
        priority?: 'low' | 'medium' | 'high' | 'critical';
        strategy?: 'parallel' | 'sequential' | 'adaptive';
        maxAgents?: number;
    }): Promise<TaskOrchestrationResponse>;
    getTaskStatus(taskId: string): Promise<any>;
    getTaskResults(taskId: string): Promise<any>;
    trainNeuralPatterns(sessionId: string, patternType: 'coordination' | 'optimization' | 'prediction', trainingData: any): Promise<void>;
    saveNeuralPattern(feedId: string, sessionId: string, patternType: 'coordination' | 'optimization' | 'prediction', patternData: any, confidenceScore: number): Promise<NeuralPattern>;
    storeMemory(key: string, value: any, namespace?: string, ttl?: number): Promise<void>;
    retrieveMemory(key: string, namespace?: string): Promise<any>;
    getSession(sessionId: string): Promise<ClaudeFlowSession | null>;
    updateSessionMetrics(sessionId: string, metrics: Partial<SessionMetrics>): Promise<void>;
    endSession(sessionId: string): Promise<void>;
    getSwarmStatus(sessionId: string): Promise<any>;
    getPerformanceMetrics(sessionId?: string): Promise<any>;
    private handleSessionStarted;
    private handleSessionEnded;
    private handleTaskCompleted;
    private handleNeuralPattern;
    private callClaudeFlowAPI;
}
export declare const claudeFlowService: ClaudeFlowService;
export default claudeFlowService;
//# sourceMappingURL=claude-flow.d.ts.map