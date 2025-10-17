/**
 * Protected Configs API Client
 *
 * Client functions for interacting with protected agent configuration endpoints.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Get authentication headers
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'An error occurred'
    }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data;
}

/**
 * Fetch all protected configs
 */
export async function getAllProtectedConfigs(): Promise<
  Array<{ agentName: string; hasProtection: boolean }>
> {
  const response = await fetch(`${API_BASE}/api/v1/protected-configs`, {
    headers: getAuthHeaders()
  });

  return handleResponse(response);
}

/**
 * Fetch specific protected config
 */
export async function getProtectedConfig(agentName: string): Promise<any> {
  const response = await fetch(
    `${API_BASE}/api/v1/protected-configs/${agentName}`,
    {
      headers: getAuthHeaders()
    }
  );

  return handleResponse(response);
}

/**
 * Update protected config (admin only)
 */
export async function updateProtectedConfig(
  agentName: string,
  updates: any
): Promise<any> {
  const response = await fetch(
    `${API_BASE}/api/v1/protected-configs/${agentName}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    }
  );

  return handleResponse(response);
}

/**
 * Fetch audit log for protected config
 */
export async function getAuditLog(
  agentName: string,
  limit: number = 50
): Promise<any[]> {
  const response = await fetch(
    `${API_BASE}/api/v1/protected-configs/${agentName}/audit-log?limit=${limit}`,
    {
      headers: getAuthHeaders()
    }
  );

  const data = await handleResponse<{ entries: any[] }>(response);
  return data.entries || [];
}

/**
 * Rollback protected config to previous version
 */
export async function rollbackConfig(
  agentName: string,
  version?: string
): Promise<any> {
  const response = await fetch(
    `${API_BASE}/api/v1/protected-configs/${agentName}/rollback`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ version })
    }
  );

  return handleResponse(response);
}

/**
 * Fetch available backups for protected config
 */
export async function getBackups(agentName: string): Promise<any[]> {
  const response = await fetch(
    `${API_BASE}/api/v1/protected-configs/${agentName}/backups`,
    {
      headers: getAuthHeaders()
    }
  );

  const data = await handleResponse<{ backups: any[] }>(response);
  return data.backups || [];
}

/**
 * Protected Configs API object for easier imports
 */
export const protectedConfigsApi = {
  getAllProtectedConfigs,
  getProtectedConfig,
  updateProtectedConfig,
  getAuditLog,
  rollbackConfig,
  getBackups
};

export default protectedConfigsApi;
