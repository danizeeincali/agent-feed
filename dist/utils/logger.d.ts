import winston from 'winston';
declare const logger: winston.Logger;
export declare const performanceLogger: {
    start: (operation: string) => {
        end: (metadata?: any) => number;
    };
};
export declare const httpLogger: {
    request: (req: any, res: any, duration: number) => void;
    error: (req: any, error: Error) => void;
};
export declare const claudeFlowLogger: {
    sessionStart: (sessionId: string, config: any) => void;
    sessionEnd: (sessionId: string, metrics: any) => void;
    agentSpawn: (sessionId: string, agentType: string, agentId: string) => void;
    taskComplete: (sessionId: string, taskId: string, result: any) => void;
    error: (sessionId: string, error: Error, context?: any) => void;
};
export declare const feedLogger: {
    fetchStart: (feedId: string, url: string) => void;
    fetchSuccess: (feedId: string, itemsFound: number, itemsNew: number, duration: number) => void;
    fetchError: (feedId: string, error: Error) => void;
    automationTrigger: (feedId: string, itemId: string, triggerType: string) => void;
};
export declare const securityLogger: {
    authSuccess: (userId: string, method: string, ip: string) => void;
    authFailure: (email: string, method: string, ip: string, reason: string) => void;
    tokenRefresh: (userId: string, ip: string) => void;
    suspiciousActivity: (userId: string, activity: string, ip: string) => void;
};
export { logger };
export default logger;
//# sourceMappingURL=logger.d.ts.map