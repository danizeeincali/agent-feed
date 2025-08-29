/**
 * Output Buffer Manager - Advanced SSE Streaming Architecture
 * Prevents message accumulation storm through intelligent buffering
 */
interface OutputChunk {
    id: string;
    instanceId: string;
    content: string;
    position: number;
    timestamp: number;
    size: number;
    processed: boolean;
    checksum?: string;
}
interface BufferSettings {
    bufferSize?: number;
    chunkSize?: number;
    compressionEnabled?: boolean;
    maxRetentionTime?: number;
}
export declare class OutputBufferManager {
    private buffers;
    private static instance;
    private readonly DEFAULT_MAX_BUFFER_SIZE;
    private readonly DEFAULT_CHUNK_SIZE;
    private readonly CLEANUP_INTERVAL;
    private readonly MAX_TOTAL_MEMORY;
    private cleanupInterval;
    private settings;
    constructor();
    static getInstance(): OutputBufferManager;
    /**
     * Process incremental output with intelligent chunking
     */
    processOutput(instanceId: string, rawOutput: string): OutputChunk[];
    /**
     * Get incremental chunks since last position
     */
    getIncrementalChunks(instanceId: string, fromPosition: number): OutputChunk[];
    /**
     * Get buffer status for monitoring
     */
    getBufferStatus(instanceId: string): any;
    /**
     * Update buffer settings dynamically
     */
    updateSettings(instanceId: string, settings: BufferSettings): void;
    /**
     * Perform emergency cleanup for specific instance
     */
    performEmergencyCleanup(instanceId: string): void;
    /**
     * Remove buffer for instance (cleanup)
     */
    removeBuffer(instanceId: string): void;
    /**
     * Get total memory usage across all buffers
     */
    getTotalMemoryUsage(): number;
    private getOrCreateBuffer;
    private chunkOutput;
    private calculateChecksum;
    private canAddChunk;
    private performMaintenance;
    private performGlobalEmergencyCleanup;
    /**
     * Cleanup when shutting down
     */
    shutdown(): void;
}
export default OutputBufferManager;
//# sourceMappingURL=OutputBufferManager.d.ts.map