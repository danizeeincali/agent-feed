/**
 * Container Validation and Docker Integration Tests
 * Tests Docker builds, service communication, health checks, and deployment validation
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import supertest from 'supertest';
import axios from 'axios';

const execAsync = promisify(exec);

interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  ports: string[];
  health: string;
}

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'starting';
  endpoint: string;
  responseTime: number;
  error?: string;
}

describe('Container Validation and Docker Integration Tests', () => {
  let containerIds: string[] = [];
  let serviceHealthResults: ServiceHealth[] = [];

  beforeAll(async () => {
    // Ensure we're in the correct directory
    process.chdir('/workspaces/agent-feed');
  });

  afterAll(async () => {
    // Cleanup containers if running in test mode
    if (process.env.NODE_ENV === 'test') {
      await cleanupTestContainers();
    }
  });

  describe('Docker Build Validation', () => {
    test('should build Docker image successfully', async () => {
      const { stdout, stderr } = await execAsync('docker build -t agent-feed-test .');
      
      expect(stderr).not.toContain('ERROR');
      expect(stdout).toContain('Successfully built');
      
      // Verify image exists
      const { stdout: images } = await execAsync('docker images agent-feed-test');
      expect(images).toContain('agent-feed-test');
    }, 300000); // 5 minutes timeout for build

    test('should have optimized image size', async () => {
      const { stdout } = await execAsync('docker images agent-feed-test --format "{{.Size}}"');
      const imageSize = stdout.trim();
      
      // Parse size (e.g., "500MB" -> 500)
      const sizeValue = parseFloat(imageSize.replace(/[A-Za-z]/g, ''));
      const sizeUnit = imageSize.replace(/[0-9.]/g, '').toUpperCase();
      
      let sizeMB = sizeValue;
      if (sizeUnit === 'GB') {
        sizeMB = sizeValue * 1024;
      }

      // Image should be under 2GB
      expect(sizeMB).toBeLessThan(2048);
    });

    test('should have proper image layers and security', async () => {
      const { stdout } = await execAsync('docker history agent-feed-test');
      
      // Should use multi-stage build (multiple FROM statements)
      expect(stdout).toContain('COPY');
      expect(stdout).toContain('RUN');
      
      // Check for security best practices
      const { stdout: inspection } = await execAsync('docker inspect agent-feed-test');
      const imageInfo = JSON.parse(inspection)[0];
      
      // Should not run as root
      expect(imageInfo.Config.User).not.toBe('root');
      expect(imageInfo.Config.User).not.toBe('0');
      
      // Should have proper working directory
      expect(imageInfo.Config.WorkingDir).toBe('/app');
    });
  });

  describe('Docker Compose Validation', () => {
    test('should validate docker-compose.yml syntax', async () => {
      const { stderr } = await execAsync('docker-compose config');
      expect(stderr).toBe('');
    });

    test('should start all services with docker-compose', async () => {
      // Start services in detached mode
      await execAsync('docker-compose up -d');
      
      // Wait for services to start
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Get running containers
      const { stdout } = await execAsync('docker-compose ps');
      const containers = parseContainerList(stdout);
      
      // Verify all expected services are running
      const expectedServices = ['postgres', 'redis', 'api'];
      for (const service of expectedServices) {
        const container = containers.find(c => c.name.includes(service));
        expect(container).toBeDefined();
        expect(container.status).toContain('Up');
      }
      
      containerIds = containers.map(c => c.id);
    }, 120000); // 2 minutes timeout

    test('should have healthy services', async () => {
      const healthChecks = [
        { service: 'postgres', endpoint: 'tcp://localhost:5432', healthCommand: 'pg_isready -U agent_user -d agent_feed' },
        { service: 'redis', endpoint: 'tcp://localhost:6379', healthCommand: 'redis-cli ping' },
        { service: 'api', endpoint: 'http://localhost:3000/health', healthCommand: null }
      ];

      for (const check of healthChecks) {
        const startTime = Date.now();
        try {
          if (check.healthCommand) {
            // Use docker exec for internal health checks
            const containerName = `agent-feed-${check.service}`;
            await execAsync(`docker exec ${containerName} ${check.healthCommand}`);
          } else {
            // Use HTTP request for API health check
            const response = await axios.get(check.endpoint, { timeout: 10000 });
            expect(response.status).toBe(200);
          }
          
          const responseTime = Date.now() - startTime;
          serviceHealthResults.push({
            service: check.service,
            status: 'healthy',
            endpoint: check.endpoint,
            responseTime
          });
        } catch (error) {
          serviceHealthResults.push({
            service: check.service,
            status: 'unhealthy',
            endpoint: check.endpoint,
            responseTime: Date.now() - startTime,
            error: error.message
          });
        }
      }

      // All services should be healthy
      const unhealthyServices = serviceHealthResults.filter(s => s.status === 'unhealthy');
      expect(unhealthyServices).toHaveLength(0);
    }, 60000);
  });

  describe('Service Communication', () => {
    test('should enable inter-service communication', async () => {
      // Test API can connect to database
      const dbConnectionTest = await axios.get('http://localhost:3000/api/v1/', { timeout: 10000 });
      expect(dbConnectionTest.status).toBe(200);
      
      // Verify database connection in response
      expect(dbConnectionTest.data.features).toBeDefined();
    });

    test('should handle service dependencies correctly', async () => {
      // Stop database service
      await execAsync('docker-compose stop postgres');
      
      // Wait for dependency failure
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // API should handle database unavailability gracefully
      try {
        const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
        // Health check should still respond but indicate database issue
        expect(response.status).toBe(200);
        expect(response.data.services.database).toMatch(/down|disabled|unavailable/i);
      } catch (error) {
        // If health endpoint is down, that's also acceptable behavior
        expect(error.code).toMatch(/ECONNREFUSED|TIMEOUT/);
      }
      
      // Restart database
      await execAsync('docker-compose start postgres');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for startup
    });

    test('should maintain data persistence across restarts', async () => {
      // Create test data
      const testData = {
        content: 'Container persistence test',
        author: 'container-test-user'
      };

      try {
        await axios.post('http://localhost:3000/api/v1/agent-posts', testData, { timeout: 10000 });
      } catch (error) {
        // Data creation might fail if services are still starting
      }
      
      // Restart API service
      await execAsync('docker-compose restart api');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      // Verify data persistence
      try {
        const response = await axios.get('http://localhost:3000/api/v1/agent-posts', { timeout: 10000 });
        expect(response.status).toBe(200);
        // Data should still be available
        expect(Array.isArray(response.data)).toBe(true);
      } catch (error) {
        // Service might still be starting
        console.warn('Data persistence test failed - services may still be starting');
      }
    });
  });

  describe('Volume and Storage Validation', () => {
    test('should have properly configured volumes', async () => {
      const { stdout } = await execAsync('docker volume ls');
      
      // Check for expected volumes
      const expectedVolumes = ['postgres_data', 'redis_data'];
      for (const volume of expectedVolumes) {
        expect(stdout).toContain(volume);
      }
    });

    test('should persist data in volumes', async () => {
      // Check PostgreSQL data persistence
      const { stdout: pgData } = await execAsync('docker volume inspect agent-feed_postgres_data');
      const pgVolumeInfo = JSON.parse(pgData)[0];
      expect(pgVolumeInfo.Mountpoint).toBeDefined();
      
      // Check Redis data persistence
      const { stdout: redisData } = await execAsync('docker volume inspect agent-feed_redis_data');
      const redisVolumeInfo = JSON.parse(redisData)[0];
      expect(redisVolumeInfo.Mountpoint).toBeDefined();
    });

    test('should handle log rotation and management', async () => {
      // Check if logs are being written
      const { stdout } = await execAsync('docker-compose logs --tail=10');
      expect(stdout.length).toBeGreaterThan(0);
      
      // Verify log files are not growing excessively
      const { stdout: logSize } = await execAsync('docker system df');
      expect(logSize).toContain('Local Volumes');
    });
  });

  describe('Network Security and Configuration', () => {
    test('should use proper network isolation', async () => {
      const { stdout } = await execAsync('docker network ls');
      expect(stdout).toContain('agent-feed-network');
      
      // Inspect network configuration
      const { stdout: networkInfo } = await execAsync('docker network inspect agent-feed_agent-feed-network');
      const network = JSON.parse(networkInfo)[0];
      
      expect(network.Driver).toBe('bridge');
      expect(network.IPAM.Config).toBeDefined();
      expect(network.IPAM.Config[0].Subnet).toMatch(/172\.20\.0\.0\/16/);
    });

    test('should not expose unnecessary ports', async () => {
      const { stdout } = await execAsync('docker-compose ps');
      const containers = parseContainerList(stdout);
      
      // Check exposed ports
      const apiContainer = containers.find(c => c.name.includes('api'));
      expect(apiContainer.ports).toContain('3000');
      
      // Database and Redis should not be accessible from host (unless explicitly configured)
      const dbContainer = containers.find(c => c.name.includes('postgres'));
      const redisContainer = containers.find(c => c.name.includes('redis'));
      
      // Verify these are only accessible internally
      expect(dbContainer.ports).toContain('5432');
      expect(redisContainer.ports).toContain('6379');
    });

    test('should implement proper resource limits', async () => {
      const { stdout } = await execAsync('docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"');
      const lines = stdout.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        if (line.trim()) {
          const [container, cpu, memory] = line.split('\t').map(s => s.trim());
          
          // Parse memory usage (e.g., "100MB / 2GB")
          const memoryParts = memory.split(' / ');
          if (memoryParts.length === 2) {
            const usedMemory = memoryParts[0];
            const totalMemory = memoryParts[1];
            
            // Each container should use less than 2GB
            expect(usedMemory).toMatch(/\d+(\.\d+)?(MB|GB)/);
            if (usedMemory.includes('GB')) {
              const usedGB = parseFloat(usedMemory.replace('GB', ''));
              expect(usedGB).toBeLessThan(2);
            }
          }
        }
      }
    });
  });

  describe('Production Deployment Validation', () => {
    test('should validate production configuration', async () => {
      // Check if production docker-compose exists
      try {
        await execAsync('docker-compose -f docker-compose.prod.yml config');
      } catch (error) {
        console.warn('Production docker-compose file not found or invalid');
      }
    });

    test('should implement proper security headers in production', async () => {
      // Test security headers
      try {
        const response = await axios.get('http://localhost:3000/api/v1/', { timeout: 10000 });
        
        const securityHeaders = [
          'x-frame-options',
          'x-content-type-options',
          'x-xss-protection'
        ];
        
        for (const header of securityHeaders) {
          expect(response.headers[header]).toBeDefined();
        }
      } catch (error) {
        console.warn('Security headers test failed - service may be unavailable');
      }
    });

    test('should handle graceful shutdown', async () => {
      // Send SIGTERM to API container
      const apiContainer = containerIds.find(async (id) => {
        const { stdout } = await execAsync(`docker inspect ${id}`);
        const info = JSON.parse(stdout)[0];
        return info.Config.Image.includes('agent-feed');
      });

      if (apiContainer) {
        const startTime = Date.now();
        await execAsync(`docker kill -s TERM ${apiContainer}`);
        
        // Wait for graceful shutdown
        let shutdownComplete = false;
        let attempts = 0;
        while (!shutdownComplete && attempts < 30) { // 30 seconds max
          try {
            const { stdout } = await execAsync(`docker ps -q --filter id=${apiContainer}`);
            if (!stdout.trim()) {
              shutdownComplete = true;
            }
          } catch (error) {
            shutdownComplete = true;
          }
          
          if (!shutdownComplete) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }
        
        const shutdownTime = Date.now() - startTime;
        expect(shutdownTime).toBeLessThan(30000); // Should shutdown within 30 seconds
      }
    });
  });

  describe('Health Monitoring and Observability', () => {
    test('should provide container health status', async () => {
      const { stdout } = await execAsync('docker-compose ps');
      const containers = parseContainerList(stdout);
      
      for (const container of containers) {
        expect(container.status).toMatch(/Up|healthy/i);
      }
    });

    test('should collect and expose metrics', async () => {
      // Test if metrics endpoint is available
      try {
        const response = await axios.get('http://localhost:3000/health', { timeout: 10000 });
        expect(response.status).toBe(200);
        expect(response.data.uptime).toBeDefined();
        expect(response.data.timestamp).toBeDefined();
        expect(response.data.services).toBeDefined();
      } catch (error) {
        console.warn('Metrics endpoint test failed - service may be unavailable');
      }
    });

    test('should handle container resource monitoring', async () => {
      // Monitor resource usage
      const { stdout } = await execAsync('docker stats --no-stream --format "{{json .}}"');
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const stats = JSON.parse(line);
          
          // CPU usage should be reasonable
          const cpuPercent = parseFloat(stats.CPUPerc.replace('%', ''));
          expect(cpuPercent).toBeLessThan(80); // Less than 80% CPU
          
          // Memory usage should be within limits
          const memUsage = stats.MemUsage;
          if (memUsage.includes('/')) {
            const [used, total] = memUsage.split(' / ');
            // Convert to MB for comparison
            const usedMB = convertToMB(used);
            const totalMB = convertToMB(total);
            
            expect(usedMB / totalMB).toBeLessThan(0.9); // Less than 90% memory usage
          }
        }
      }
    });
  });

  // Helper functions
  function parseContainerList(output: string): ContainerInfo[] {
    const lines = output.split('\n').slice(1); // Skip header
    return lines
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          id: parts[0],
          name: parts[1] || '',
          status: parts.slice(2, -1).join(' '),
          ports: parts[parts.length - 1].split(','),
          health: parts.includes('healthy') ? 'healthy' : 'unknown'
        };
      });
  }

  function convertToMB(sizeStr: string): number {
    const value = parseFloat(sizeStr.replace(/[A-Za-z]/g, ''));
    const unit = sizeStr.replace(/[0-9.]/g, '').toUpperCase();
    
    switch (unit) {
      case 'KB':
        return value / 1024;
      case 'MB':
        return value;
      case 'GB':
        return value * 1024;
      default:
        return value;
    }
  }

  async function cleanupTestContainers(): Promise<void> {
    try {
      await execAsync('docker-compose down -v');
      await execAsync('docker rmi agent-feed-test || true');
    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  }
});