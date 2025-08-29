"use strict";
/**
 * Output Buffer Manager - Advanced SSE Streaming Architecture
 * Prevents message accumulation storm through intelligent buffering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputBufferManager = void 0;
class CircularBuffer {
    buffer = [];
    head = 0;
    tail = 0;
    maxSize;
    totalMemory = 0;
    maxRetentionTime;
    constructor(maxSize, maxRetentionTimeMs = 300000) {
        this.maxSize = maxSize;
        this.maxRetentionTime = maxRetentionTimeMs;
    }
    push(item) {
        // Time-based eviction first
        this.evictExpiredItems();
        // Memory-based eviction
        while (this.totalMemory + item.size > this.maxSize && this.buffer.length > 0) {
            this.evictOldest();
        }
        // Expand buffer if needed
        if (this.buffer.length === 0) {
            this.buffer = new Array(1024); // Start with reasonable size
        }
        if (this.tail >= this.buffer.length) {
            this.expandBuffer();
        }
        this.buffer[this.tail] = item;
        this.totalMemory += item.size;
        this.tail = (this.tail + 1) % this.buffer.length;
        // Adjust head if we're overwriting
        if (this.tail === this.head && this.getItemCount() > 0) {
            this.head = (this.head + 1) % this.buffer.length;
        }
    }
    getChunksAfterPosition(position) {
        const result = [];
        const bufferLength = this.buffer.length;
        for (let i = this.head; i !== this.tail; i = (i + 1) % bufferLength) {
            const item = this.buffer[i];
            if (item && item.position > position) {
                result.push(item);
            }
        }
        return result.sort((a, b) => a.position - b.position);
    }
    getItemCount() {
        if (this.tail >= this.head) {
            return this.tail - this.head;
        }
        else {
            return this.buffer.length - this.head + this.tail;
        }
    }
    getTotalMemory() {
        return this.totalMemory;
    }
    evictExpiredItems() {
        const now = Date.now();
        const bufferLength = this.buffer.length;
        while (this.head !== this.tail) {
            const item = this.buffer[this.head];
            if (!item || (now - item.timestamp > this.maxRetentionTime)) {
                this.evictOldest();
            }
            else {
                break; // Items are in chronological order
            }
        }
    }
    evictOldest() {
        const oldest = this.buffer[this.head];
        if (oldest) {
            this.totalMemory -= oldest.size;
            delete this.buffer[this.head];
            this.head = (this.head + 1) % this.buffer.length;
        }
    }
    expandBuffer() {
        const newSize = Math.min(this.buffer.length * 2, 16384); // Max 16K items
        const newBuffer = new Array(newSize);
        // Copy existing items to new buffer
        let newIndex = 0;
        const oldLength = this.buffer.length;
        for (let i = this.head; i !== this.tail; i = (i + 1) % oldLength) {
            newBuffer[newIndex++] = this.buffer[i];
        }
        this.buffer = newBuffer;
        this.head = 0;
        this.tail = newIndex;
    }
}
class OutputBufferManager {
    buffers = new Map();
    static instance;
    // Configuration
    DEFAULT_MAX_BUFFER_SIZE = 1024 * 1024; // 1MB per instance
    DEFAULT_CHUNK_SIZE = 4096; // 4KB chunks
    CLEANUP_INTERVAL = 30000; // 30 seconds
    MAX_TOTAL_MEMORY = 50 * 1024 * 1024; // 50MB total
    cleanupInterval;
    settings = new Map();
    constructor() {
        this.cleanupInterval = setInterval(() => {
            this.performMaintenance();
        }, this.CLEANUP_INTERVAL);
    }
    static getInstance() {
        if (!OutputBufferManager.instance) {
            OutputBufferManager.instance = new OutputBufferManager();
        }
        return OutputBufferManager.instance;
    }
    /**
     * Process incremental output with intelligent chunking
     */
    processOutput(instanceId, rawOutput) {
        if (!rawOutput || rawOutput.length === 0) {
            return [];
        }
        const bufferState = this.getOrCreateBuffer(instanceId);
        const settings = this.settings.get(instanceId) || {};
        const chunkSize = settings.chunkSize || this.DEFAULT_CHUNK_SIZE;
        // Update access time
        bufferState.lastAccessTime = Date.now();
        const newChunks = [];
        // Split output into manageable chunks
        const chunks = this.chunkOutput(rawOutput, chunkSize);
        for (const chunk of chunks) {
            const outputChunk = {
                id: `${instanceId}-${bufferState.currentPosition}`,
                instanceId,
                content: chunk,
                position: bufferState.currentPosition,
                timestamp: Date.now(),
                size: Buffer.byteLength(chunk, 'utf8'),
                processed: false,
                checksum: this.calculateChecksum(chunk)
            };
            // Check memory limits before adding
            if (this.canAddChunk(outputChunk)) {
                bufferState.circularBuffer.push(outputChunk);
                bufferState.currentPosition += outputChunk.size;
                newChunks.push(outputChunk);
            }
            else {
                console.warn(`Buffer full for ${instanceId}, dropping chunk of size ${outputChunk.size}`);
                // In production, you might want to implement overflow handling
            }
        }
        return newChunks;
    }
    /**
     * Get incremental chunks since last position
     */
    getIncrementalChunks(instanceId, fromPosition) {
        const bufferState = this.buffers.get(instanceId);
        if (!bufferState) {
            return [];
        }
        bufferState.lastAccessTime = Date.now();
        const chunks = bufferState.circularBuffer.getChunksAfterPosition(fromPosition);
        // Update last sent position
        if (chunks.length > 0) {
            const lastChunk = chunks[chunks.length - 1];
            bufferState.lastSentPosition = lastChunk.position + lastChunk.size;
        }
        return chunks;
    }
    /**
     * Get buffer status for monitoring
     */
    getBufferStatus(instanceId) {
        const bufferState = this.buffers.get(instanceId);
        if (!bufferState) {
            return null;
        }
        return {
            instanceId,
            currentPosition: bufferState.currentPosition,
            lastSentPosition: bufferState.lastSentPosition,
            itemCount: bufferState.circularBuffer.getItemCount(),
            memoryUsage: bufferState.circularBuffer.getTotalMemory(),
            memoryThreshold: bufferState.memoryThreshold,
            lastAccessTime: bufferState.lastAccessTime,
            age: Date.now() - bufferState.createdAt
        };
    }
    /**
     * Update buffer settings dynamically
     */
    updateSettings(instanceId, settings) {
        this.settings.set(instanceId, { ...this.settings.get(instanceId), ...settings });
        console.log(`Updated buffer settings for ${instanceId}:`, settings);
    }
    /**
     * Perform emergency cleanup for specific instance
     */
    performEmergencyCleanup(instanceId) {
        const bufferState = this.buffers.get(instanceId);
        if (!bufferState)
            return;
        console.warn(`Performing emergency cleanup for ${instanceId}`);
        // Create new, smaller buffer
        const newBuffer = new CircularBuffer(bufferState.memoryThreshold * 0.5, // Reduce to 50% of threshold
        60000 // 1 minute retention
        );
        // Keep only the most recent chunks
        const recentChunks = bufferState.circularBuffer
            .getChunksAfterPosition(bufferState.currentPosition - 10000) // Last 10KB
            .slice(-50); // Last 50 chunks
        recentChunks.forEach(chunk => newBuffer.push(chunk));
        bufferState.circularBuffer = newBuffer;
        console.log(`Emergency cleanup completed for ${instanceId}, retained ${recentChunks.length} chunks`);
    }
    /**
     * Remove buffer for instance (cleanup)
     */
    removeBuffer(instanceId) {
        const removed = this.buffers.delete(instanceId);
        this.settings.delete(instanceId);
        if (removed) {
            console.log(`Buffer removed for instance: ${instanceId}`);
        }
    }
    /**
     * Get total memory usage across all buffers
     */
    getTotalMemoryUsage() {
        let total = 0;
        for (const buffer of this.buffers.values()) {
            total += buffer.circularBuffer.getTotalMemory();
        }
        return total;
    }
    getOrCreateBuffer(instanceId) {
        if (!this.buffers.has(instanceId)) {
            const settings = this.settings.get(instanceId) || {};
            const bufferSize = settings.bufferSize || this.DEFAULT_MAX_BUFFER_SIZE;
            const bufferState = {
                instanceId,
                currentPosition: 0,
                lastSentPosition: 0,
                circularBuffer: new CircularBuffer(bufferSize),
                memoryThreshold: bufferSize,
                compressionEnabled: settings.compressionEnabled || false,
                createdAt: Date.now(),
                lastAccessTime: Date.now()
            };
            this.buffers.set(instanceId, bufferState);
            console.log(`Created new buffer for instance: ${instanceId} (size: ${bufferSize} bytes)`);
        }
        return this.buffers.get(instanceId);
    }
    chunkOutput(output, chunkSize) {
        const chunks = [];
        // Try to split on natural boundaries (newlines) when possible
        const lines = output.split('\n');
        let currentChunk = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] + (i < lines.length - 1 ? '\n' : '');
            if (currentChunk.length + line.length <= chunkSize) {
                currentChunk += line;
            }
            else {
                // Current chunk is getting too big
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk);
                    currentChunk = '';
                }
                // If single line is bigger than chunk size, split it
                if (line.length > chunkSize) {
                    for (let j = 0; j < line.length; j += chunkSize) {
                        chunks.push(line.substring(j, j + chunkSize));
                    }
                }
                else {
                    currentChunk = line;
                }
            }
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }
        return chunks;
    }
    calculateChecksum(content) {
        // Simple hash for content verification
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    canAddChunk(chunk) {
        const totalMemory = this.getTotalMemoryUsage();
        return totalMemory + chunk.size <= this.MAX_TOTAL_MEMORY;
    }
    performMaintenance() {
        const now = Date.now();
        const staleThreshold = 300000; // 5 minutes
        const staleInstances = [];
        // Find stale buffers
        for (const [instanceId, buffer] of this.buffers.entries()) {
            if (now - buffer.lastAccessTime > staleThreshold) {
                staleInstances.push(instanceId);
            }
        }
        // Remove stale buffers
        staleInstances.forEach(instanceId => {
            console.log(`Removing stale buffer for instance: ${instanceId}`);
            this.removeBuffer(instanceId);
        });
        // Log memory usage
        const totalMemory = this.getTotalMemoryUsage();
        const bufferCount = this.buffers.size;
        console.log(`Buffer maintenance: ${bufferCount} active buffers, ${Math.round(totalMemory / 1024)} KB total memory`);
        // Emergency cleanup if memory is too high
        if (totalMemory > this.MAX_TOTAL_MEMORY * 0.9) {
            console.warn('High memory usage detected, performing emergency cleanup');
            this.performGlobalEmergencyCleanup();
        }
    }
    performGlobalEmergencyCleanup() {
        // Find largest memory consumers
        const bufferSizes = Array.from(this.buffers.entries())
            .map(([instanceId, buffer]) => ({
            instanceId,
            memoryUsage: buffer.circularBuffer.getTotalMemory()
        }))
            .sort((a, b) => b.memoryUsage - a.memoryUsage);
        // Clean up top 25% of memory consumers
        const cleanupCount = Math.ceil(bufferSizes.length * 0.25);
        for (let i = 0; i < cleanupCount; i++) {
            this.performEmergencyCleanup(bufferSizes[i].instanceId);
        }
        console.log(`Global emergency cleanup completed for ${cleanupCount} instances`);
    }
    /**
     * Cleanup when shutting down
     */
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.buffers.clear();
        this.settings.clear();
        console.log('OutputBufferManager shutdown completed');
    }
}
exports.OutputBufferManager = OutputBufferManager;
exports.default = OutputBufferManager;
//# sourceMappingURL=OutputBufferManager.js.map