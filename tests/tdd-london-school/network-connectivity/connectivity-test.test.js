/**
 * TDD London School Tests for Quick Connectivity Test Script
 * Mock-driven testing of shell script behavior
 */

const { jest } = require('@jest/globals');
const ConnectivityTester = require('../../../scripts/test-connectivity');

describe('ConnectivityTester - London School TDD', () => {
  let mockChildProcess, mockFs;
  let connectivityTester;

  beforeEach(() => {
    mockChildProcess = {
      execSync: jest.fn(),
      spawn: jest.fn()
    };

    mockFs = {
      writeFileSync: jest.fn(),
      readFileSync: jest.fn()
    };

    connectivityTester = new ConnectivityTester({
      childProcess: mockChildProcess,
      fs: mockFs
    });
  });

  describe('Quick Health Check', () => {
    it('should test basic server responsiveness', async () => {
      // Arrange
      mockChildProcess.execSync
        .mockReturnValueOnce('HTTP/1.1 200 OK') // frontend test
        .mockReturnValueOnce('{"status":"ok"}'); // backend test

      // Act
      const healthCheck = await connectivityTester.quickHealthCheck([
        'http://localhost:5173',
        'http://localhost:3000'
      ]);

      // Assert - verify curl interactions
      expect(mockChildProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining('curl -I -s --max-time 5 http://localhost:5173')
      );
      expect(mockChildProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining('curl -s --max-time 5 http://localhost:3000')
      );

      expect(healthCheck).toEqual(expect.objectContaining({
        'http://localhost:5173': expect.objectContaining({ accessible: true }),
        'http://localhost:3000': expect.objectContaining({ accessible: true })
      }));
    });

    it('should handle connection timeouts and failures', async () => {
      // Arrange
      mockChildProcess.execSync.mockImplementation(() => {
        throw new Error('curl: (7) Failed to connect to localhost port 5173');
      });

      // Act
      const healthCheck = await connectivityTester.quickHealthCheck(['http://localhost:5173']);

      // Assert - verify error handling
      expect(healthCheck['http://localhost:5173']).toEqual(expect.objectContaining({
        accessible: false,
        error: expect.stringContaining('Failed to connect')
      }));
    });
  });

  describe('Port Availability Testing', () => {
    it('should test if ports are open and listening', async () => {
      // Arrange
      mockChildProcess.execSync.mockReturnValue(
        'tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN\n' +
        'tcp        0      0 0.0.0.0:5173            0.0.0.0:*               LISTEN'
      );

      // Act
      const portStatus = await connectivityTester.testPortAvailability([3000, 5173]);

      // Assert - verify netstat interaction
      expect(mockChildProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining('netstat -tlnp')
      );

      expect(portStatus).toEqual(expect.objectContaining({
        3000: expect.objectContaining({ listening: true, binding: '0.0.0.0' }),
        5173: expect.objectContaining({ listening: true, binding: '0.0.0.0' })
      }));
    });

    it('should detect localhost-only binding issues', async () => {
      // Arrange
      mockChildProcess.execSync.mockReturnValue(
        'tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN'
      );

      // Act
      const portStatus = await connectivityTester.testPortAvailability([3000]);

      // Assert - verify binding detection
      expect(portStatus[3000]).toEqual(expect.objectContaining({
        listening: true,
        binding: '127.0.0.1',
        codespacesSafe: false,
        warning: expect.stringContaining('bound to localhost only')
      }));
    });
  });

  describe('Network Interface Testing', () => {
    it('should test connectivity via different network interfaces', async () => {
      // Arrange
      const mockIfconfig = `
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.16.0.1  netmask 255.255.255.0  broadcast 172.16.0.255

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
      `;
      mockChildProcess.execSync
        .mockReturnValueOnce(mockIfconfig)
        .mockReturnValueOnce('HTTP/1.1 200 OK') // localhost test
        .mockReturnValueOnce('HTTP/1.1 200 OK'); // external IP test

      // Act
      const interfaceTests = await connectivityTester.testNetworkInterfaces(3000);

      // Assert - verify interface discovery and testing
      expect(mockChildProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining('ifconfig')
      );
      expect(mockChildProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining('curl -I -s --max-time 3 http://127.0.0.1:3000')
      );
      expect(mockChildProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining('curl -I -s --max-time 3 http://172.16.0.1:3000')
      );

      expect(interfaceTests).toEqual(expect.objectContaining({
        '127.0.0.1': expect.objectContaining({ accessible: true }),
        '172.16.0.1': expect.objectContaining({ accessible: true })
      }));
    });
  });

  describe('Codespaces Environment Testing', () => {
    it('should test Codespaces-specific URLs and port forwarding', async () => {
      // Arrange
      process.env.CODESPACES = 'true';
      process.env.CODESPACE_NAME = 'test-workspace';
      const mockCodespacesUrl = 'https://test-workspace-3000.githubpreview.dev';
      
      mockChildProcess.execSync.mockReturnValue('HTTP/1.1 200 OK');

      // Act
      const codespacesTest = await connectivityTester.testCodespacesAccess(3000);

      // Assert - verify Codespaces URL generation and testing
      expect(mockChildProcess.execSync).toHaveBeenCalledWith(
        expect.stringContaining(`curl -I -s --max-time 10 ${mockCodespacesUrl}`)
      );

      expect(codespacesTest).toEqual(expect.objectContaining({
        url: mockCodespacesUrl,
        accessible: true,
        recommendation: expect.stringContaining('publicly accessible')
      }));
    });

    it('should handle private port forwarding configuration', async () => {
      // Arrange
      process.env.CODESPACES = 'true';
      process.env.CODESPACE_NAME = 'test-workspace';
      mockChildProcess.execSync.mockImplementation(() => {
        throw new Error('curl: (22) The requested URL returned error: 403');
      });

      // Act
      const codespacesTest = await connectivityTester.testCodespacesAccess(3000);

      // Assert - verify private port handling
      expect(codespacesTest).toEqual(expect.objectContaining({
        accessible: false,
        isPrivate: true,
        recommendation: expect.stringContaining('set port visibility to public')
      }));
    });
  });

  describe('Comprehensive Test Report', () => {
    it('should orchestrate all connectivity tests and generate summary', async () => {
      // Arrange
      const ports = [3000, 5173];
      
      // Mock all test methods
      connectivityTester.quickHealthCheck = jest.fn().mockResolvedValue({
        'http://localhost:3000': { accessible: true },
        'http://localhost:5173': { accessible: true }
      });
      connectivityTester.testPortAvailability = jest.fn().mockResolvedValue({
        3000: { listening: true, binding: '0.0.0.0' },
        5173: { listening: true, binding: '0.0.0.0' }
      });
      connectivityTester.testNetworkInterfaces = jest.fn().mockResolvedValue({
        '127.0.0.1': { accessible: true }
      });
      connectivityTester.testCodespacesAccess = jest.fn().mockResolvedValue({
        accessible: true
      });

      // Act
      const report = await connectivityTester.runComprehensiveTest(ports);

      // Assert - verify test orchestration
      expect(connectivityTester.quickHealthCheck).toHaveBeenCalledWith([
        'http://localhost:3000',
        'http://localhost:5173'
      ]);
      expect(connectivityTester.testPortAvailability).toHaveBeenCalledWith(ports);
      
      expect(report).toEqual(expect.objectContaining({
        timestamp: expect.any(String),
        ports: ports,
        healthCheck: expect.any(Object),
        portAvailability: expect.any(Object),
        networkInterfaces: expect.any(Object),
        codespaces: expect.any(Object),
        summary: expect.objectContaining({
          allPortsListening: expect.any(Boolean),
          allHealthy: expect.any(Boolean),
          codespacesReady: expect.any(Boolean)
        }),
        recommendations: expect.any(Array)
      }));
    });

    it('should provide specific recommendations for identified issues', async () => {
      // Arrange
      const problematicResults = {
        healthCheck: { 'http://localhost:3000': { accessible: false } },
        portAvailability: { 3000: { listening: true, binding: '127.0.0.1', codespacesSafe: false } },
        codespaces: { accessible: false, isPrivate: true }
      };

      connectivityTester.quickHealthCheck = jest.fn().mockResolvedValue(problematicResults.healthCheck);
      connectivityTester.testPortAvailability = jest.fn().mockResolvedValue(problematicResults.portAvailability);
      connectivityTester.testCodespacesAccess = jest.fn().mockResolvedValue(problematicResults.codespaces);

      // Act
      const report = await connectivityTester.runComprehensiveTest([3000]);

      // Assert - verify recommendation generation
      expect(report.recommendations).toEqual(expect.arrayContaining([
        expect.stringContaining('Server binding issue'),
        expect.stringContaining('Configure port as public'),
        expect.stringContaining('Update server configuration')
      ]));
    });
  });
});