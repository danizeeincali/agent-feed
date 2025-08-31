/**
 * WebSocket Instance ID Normalization Utility
 * SPARC Architecture Component - Fixes connection establishment issues
 * 
 * Problem Solved: Frontend uses formatted instance names like "claude-6038 (PID: 1234)"
 * while backend expects base instance IDs like "claude-6038"
 */

export interface InstanceMetadata {
  baseId: string;
  displayName: string;
  pid?: number;
  processType?: string;
  workingDirectory?: string;
  formattedId?: string;
}

/**
 * Normalizes instance IDs to ensure consistent mapping between frontend and backend
 * @param instanceId - Raw instance ID from frontend (may include formatting)
 * @returns Normalized base instance ID for backend operations
 */
export function normalizeInstanceId(instanceId: string): string {
  if (!instanceId || typeof instanceId !== 'string') {
    throw new Error(`Invalid instance ID: ${instanceId}`);
  }
  
  // Remove formatting like " (PID: 1234)" or " (running)"
  const baseId = instanceId.includes('(') 
    ? instanceId.split(' (')[0].trim()
    : instanceId.trim();
    
  // Validate format (should be claude-XXXX)
  if (!baseId.match(/^claude-\d+$/)) {
    console.warn(`Unusual instance ID format: ${baseId}`);
  }
  
  return baseId;
}

/**
 * Extracts metadata from formatted instance IDs
 * @param instanceId - Formatted instance ID from frontend
 * @returns Parsed metadata object
 */
export function parseInstanceMetadata(instanceId: string): InstanceMetadata {
  const baseId = normalizeInstanceId(instanceId);
  const displayName = instanceId;
  
  // Extract PID if present
  const pidMatch = instanceId.match(/\(PID:\s*(\d+)\)/);
  const pid = pidMatch ? parseInt(pidMatch[1], 10) : undefined;
  
  // Extract process type if present
  const typeMatch = instanceId.match(/\(([^)]+)\)$/);
  const processType = typeMatch && !pidMatch ? typeMatch[1] : undefined;
  
  return {
    baseId,
    displayName,
    pid,
    processType,
    formattedId: instanceId !== baseId ? instanceId : undefined
  };
}

/**
 * Creates a formatted display name for an instance
 * @param baseId - Base instance ID (e.g., "claude-6038")
 * @param metadata - Optional metadata to include in display
 * @returns Formatted display string
 */
export function formatInstanceDisplay(
  baseId: string, 
  metadata?: { pid?: number; processType?: string; status?: string }
): string {
  let display = baseId;
  
  if (metadata) {
    const parts: string[] = [];
    
    if (metadata.status) {
      parts.push(metadata.status);
    }
    
    if (metadata.pid) {
      parts.push(`PID: ${metadata.pid}`);
    }
    
    if (metadata.processType) {
      parts.push(metadata.processType);
    }
    
    if (parts.length > 0) {
      display += ` (${parts.join(', ')})`;
    }
  }
  
  return display;
}

/**
 * Validates if an instance ID is properly formatted
 * @param instanceId - Instance ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidInstanceId(instanceId: string): boolean {
  try {
    const normalized = normalizeInstanceId(instanceId);
    return normalized.match(/^claude-\d+$/) !== null;
  } catch {
    return false;
  }
}

/**
 * Creates a consistent hash for instance-to-server mapping
 * @param instanceId - Instance ID to hash
 * @returns Hash value for server assignment
 */
export function hashInstanceForServer(instanceId: string): number {
  const normalized = normalizeInstanceId(instanceId);
  const numericPart = normalized.replace('claude-', '');
  return parseInt(numericPart, 10);
}

/**
 * Determines which server should handle a specific instance
 * @param instanceId - Instance ID
 * @param serversPerInstance - Number of instances per server (default: 50)
 * @returns Server assignment information
 */
export function getServerAssignment(
  instanceId: string, 
  serversPerInstance: number = 50
): {
  serverId: number;
  serverPort: number;
  serverUrl: string;
  instanceRange: { min: number; max: number };
} {
  const hash = hashInstanceForServer(instanceId);
  const serverId = Math.floor(hash / serversPerInstance);
  const serverPort = 3000 + serverId;
  
  return {
    serverId,
    serverPort,
    serverUrl: `ws://localhost:${serverPort}/terminal`,
    instanceRange: {
      min: serverId * serversPerInstance,
      max: (serverId + 1) * serversPerInstance - 1
    }
  };
}

/**
 * Connection registry key generator for consistent mapping
 * @param instanceId - Instance ID (will be normalized)
 * @returns Registry key for connection mapping
 */
export function getConnectionRegistryKey(instanceId: string): string {
  return normalizeInstanceId(instanceId);
}

/**
 * Validates connection compatibility between frontend and backend
 * @param frontendId - Instance ID from frontend
 * @param backendId - Instance ID from backend
 * @returns True if they refer to the same instance
 */
export function areInstanceIdsCompatible(frontendId: string, backendId: string): boolean {
  try {
    return normalizeInstanceId(frontendId) === normalizeInstanceId(backendId);
  } catch {
    return false;
  }
}