/**
 * SPARC REFINEMENT PHASE: Process Utilities
 * Utility functions for process management and health checking
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Check if a process is alive by PID
 */
export function isProcessAlive(pid: number): boolean {
  try {
    // On Unix-like systems, sending signal 0 checks if process exists
    // without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    // ESRCH means no such process
    return error.code !== 'ESRCH';
  }
}

/**
 * Kill a process by PID with specified signal
 */
export async function killProcess(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<boolean> {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error: any) {
    if (error.code === 'ESRCH') {
      // Process doesn't exist
      return false;
    }
    throw error;
  }
}

/**
 * Get process resource usage (CPU, memory)
 */
export async function getProcessResourceUsage(pid: number): Promise<{
  cpuUsage: number;
  memoryUsage: number;
  memoryUsageMB: number;
}> {
  try {
    if (os.platform() === 'win32') {
      return getWindowsProcessUsage(pid);
    } else {
      return getUnixProcessUsage(pid);
    }
  } catch (error) {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryUsageMB: 0
    };
  }
}

/**
 * Get Unix process usage via ps command
 */
async function getUnixProcessUsage(pid: number): Promise<{
  cpuUsage: number;
  memoryUsage: number;
  memoryUsageMB: number;
}> {
  try {
    // Use ps to get CPU and memory usage
    const { stdout } = await execAsync(`ps -p ${pid} -o %cpu,%mem,rss --no-headers`);
    
    if (!stdout.trim()) {
      throw new Error('Process not found');
    }

    const [cpuStr, memStr, rssStr] = stdout.trim().split(/\s+/);
    const cpuUsage = parseFloat(cpuStr) || 0;
    const memoryUsage = parseFloat(memStr) || 0;
    const rssKB = parseInt(rssStr) || 0;
    const memoryUsageMB = rssKB / 1024;

    return {
      cpuUsage,
      memoryUsage,
      memoryUsageMB
    };
  } catch (error) {
    throw new Error(`Failed to get process usage: ${error}`);
  }
}

/**
 * Get Windows process usage via wmic command
 */
async function getWindowsProcessUsage(pid: number): Promise<{
  cpuUsage: number;
  memoryUsage: number;
  memoryUsageMB: number;
}> {
  try {
    // Use wmic to get process information
    const { stdout } = await execAsync(`wmic process where "ProcessId=${pid}" get PageFileUsage,WorkingSetSize /format:csv`);
    
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Process not found');
    }

    // Parse CSV output (skip header)
    const dataLine = lines[lines.length - 1];
    const parts = dataLine.split(',');
    
    if (parts.length < 3) {
      throw new Error('Invalid wmic output');
    }

    const workingSetSize = parseInt(parts[2]) || 0; // in bytes
    const pageFileUsage = parseInt(parts[1]) || 0; // in bytes
    
    const memoryUsageMB = workingSetSize / (1024 * 1024);
    
    // Note: Getting CPU usage on Windows is more complex and requires sampling
    // For now, we'll return 0 for CPU usage
    return {
      cpuUsage: 0,
      memoryUsage: 0, // We don't have total system memory easily available
      memoryUsageMB
    };
  } catch (error) {
    throw new Error(`Failed to get process usage: ${error}`);
  }
}

/**
 * Get all child processes of a parent PID
 */
export async function getChildProcesses(parentPid: number): Promise<number[]> {
  try {
    if (os.platform() === 'win32') {
      return getWindowsChildProcesses(parentPid);
    } else {
      return getUnixChildProcesses(parentPid);
    }
  } catch (error) {
    return [];
  }
}

/**
 * Get Unix child processes via pgrep
 */
async function getUnixChildProcesses(parentPid: number): Promise<number[]> {
  try {
    const { stdout } = await execAsync(`pgrep -P ${parentPid}`);
    return stdout
      .trim()
      .split('\n')
      .map(pid => parseInt(pid))
      .filter(pid => !isNaN(pid));
  } catch (error) {
    // pgrep returns non-zero exit code when no processes found
    return [];
  }
}

/**
 * Get Windows child processes via wmic
 */
async function getWindowsChildProcesses(parentPid: number): Promise<number[]> {
  try {
    const { stdout } = await execAsync(`wmic process where "ParentProcessId=${parentPid}" get ProcessId /format:csv`);
    
    const lines = stdout.trim().split('\n');
    const pids: number[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const pid = parseInt(parts[1]);
        if (!isNaN(pid)) {
          pids.push(pid);
        }
      }
    }
    
    return pids;
  } catch (error) {
    return [];
  }
}

/**
 * Kill process tree (process and all children)
 */
export async function killProcessTree(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
  try {
    // Get all child processes first
    const childPids = await getChildProcesses(pid);
    
    // Kill children first (depth-first)
    for (const childPid of childPids) {
      await killProcessTree(childPid, signal);
    }
    
    // Kill parent process
    await killProcess(pid, signal);
  } catch (error) {
    // Continue even if some processes fail to kill
    console.warn(`Failed to kill process ${pid}:`, error);
  }
}

/**
 * Wait for process to exit
 */
export async function waitForProcessExit(pid: number, timeoutMs: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkProcess = () => {
      if (!isProcessAlive(pid)) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
        return;
      }
      
      setTimeout(checkProcess, 100);
    };
    
    checkProcess();
  });
}

/**
 * Get process command line
 */
export async function getProcessCommandLine(pid: number): Promise<string> {
  try {
    if (os.platform() === 'win32') {
      const { stdout } = await execAsync(`wmic process where "ProcessId=${pid}" get CommandLine /format:csv`);
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[lines.length - 1].split(',');
        return parts[1] || '';
      }
    } else {
      const { stdout } = await execAsync(`ps -p ${pid} -o args --no-headers`);
      return stdout.trim();
    }
    
    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Check if a process is responsive by sending a test signal
 */
export function isProcessResponsive(pid: number): boolean {
  try {
    // Send signal 0 to check if process is responsive
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    // If we get EPERM, process exists but we can't signal it
    // If we get ESRCH, process doesn't exist
    return error.code === 'EPERM';
  }
}

/**
 * Calculate process uptime
 */
export function getProcessUptime(startTime: Date): number {
  return Date.now() - startTime.getTime();
}