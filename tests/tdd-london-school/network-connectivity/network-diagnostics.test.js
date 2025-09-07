/**
 * TDD London School Tests for Network Diagnostics Tool
 * Testing outside-in behavior and mock-driven contracts
 */

const { jest } = require('@jest/globals');
const NetworkDiagnostics = require('../../../scripts/network-diagnostics');

describe('NetworkDiagnostics - London School TDD', () => {
  let mockOs, mockNet, mockDns, mockChildProcess, mockFs;
  let networkDiagnostics;

  beforeEach(() => {
    // Mock collaborators following London School approach
    mockOs = {
      networkInterfaces: jest.fn(),
      hostname: jest.fn(),
      platform: jest.fn()
    };

    mockNet = {
      isIPv4: jest.fn(),
      isIPv6: jest.fn()
    };

    mockDns = {
      resolve4: jest.fn(),
      resolve6: jest.fn(),
      lookup: jest.fn()
    };

    mockChildProcess = {
      exec: jest.fn(),
      spawn: jest.fn()
    };

    mockFs = {
      readFileSync: jest.fn(),
      existsSync: jest.fn()
    };

    // Mock HTTP client for connectivity tests
    const mockHttp = {
      get: jest.fn(),
      request: jest.fn()
    };

    networkDiagnostics = new NetworkDiagnostics({
      os: mockOs,
      net: mockNet,
      dns: mockDns,
      childProcess: mockChildProcess,
      fs: mockFs,
      http: mockHttp
    });
  });

  describe('Network Interface Detection', () => {
    it('should discover all available network interfaces', async () => {
      // Arrange
      const mockInterfaces = {
        lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
        eth0: [{ address: '172.16.0.1', family: 'IPv4', internal: false }]
      };
      mockOs.networkInterfaces.mockReturnValue(mockInterfaces);

      // Act
      const interfaces = await networkDiagnostics.discoverNetworkInterfaces();

      // Assert - verify collaboration
      expect(mockOs.networkInterfaces).toHaveBeenCalledTimes(1);
      expect(interfaces).toEqual(expect.objectContaining({
        loopback: expect.arrayContaining([
          expect.objectContaining({ address: '127.0.0.1', internal: true })
        ]),
        external: expect.arrayContaining([
          expect.objectContaining({ address: '172.16.0.1', internal: false })
        ])
      }));
    });

    it('should classify interfaces as internal vs external', async () => {
      // Arrange
      const mockInterfaces = {
        lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
        eth0: [{ address: '10.0.0.1', family: 'IPv4', internal: false }],
        docker0: [{ address: '172.17.0.1', family: 'IPv4', internal: false }]
      };
      mockOs.networkInterfaces.mockReturnValue(mockInterfaces);

      // Act
      const result = await networkDiagnostics.classifyInterfaces();

      // Assert - verify interface classification behavior
      expect(result.internal).toHaveLength(1);
      expect(result.external).toHaveLength(2);
      expect(result.codespaces).toBeDefined();
    });
  });

  describe('Port Binding Analysis', () => {
    it('should verify port binding on all interfaces', async () => {
      // Arrange
      const ports = [3000, 5173];
      mockChildProcess.exec
        .mockResolvedValueOnce({ stdout: 'tcp 0.0.0.0:3000 LISTEN' })
        .mockResolvedValueOnce({ stdout: 'tcp 0.0.0.0:5173 LISTEN' });

      // Act
      const bindingStatus = await networkDiagnostics.analyzePortBinding(ports);

      // Assert - verify system interaction
      expect(mockChildProcess.exec).toHaveBeenCalledWith(
        expect.stringContaining('netstat -tlnp')
      );
      expect(bindingStatus).toEqual(expect.objectContaining({
        3000: expect.objectContaining({ 
          bound: true, 
          interfaces: expect.arrayContaining(['0.0.0.0']) 
        }),
        5173: expect.objectContaining({ 
          bound: true, 
          interfaces: expect.arrayContaining(['0.0.0.0']) 
        })
      }));
    });

    it('should detect localhost-only binding issues', async () => {
      // Arrange
      mockChildProcess.exec.mockResolvedValue({ 
        stdout: 'tcp 127.0.0.1:3000 LISTEN' 
      });

      // Act
      const bindingStatus = await networkDiagnostics.analyzePortBinding([3000]);

      // Assert - verify binding issue detection
      expect(bindingStatus[3000]).toEqual(expect.objectContaining({
        bound: true,
        interfaces: ['127.0.0.1'],
        codespacesSafe: false,
        recommendation: expect.stringContaining('bind to 0.0.0.0')
      }));
    });
  });

  describe('Codespaces Environment Detection', () => {
    it('should detect Codespaces environment variables', async () => {
      // Arrange
      process.env.CODESPACES = 'true';
      process.env.CODESPACE_NAME = 'test-codespace';
      mockFs.existsSync.mockReturnValue(true);

      // Act
      const envDetection = await networkDiagnostics.detectCodespacesEnvironment();

      // Assert - verify environment detection
      expect(envDetection).toEqual(expect.objectContaining({
        isCodespaces: true,
        codespaceName: 'test-codespace',
        hasDevcontainer: true
      }));
    });

    it('should analyze port forwarding configuration', async () => {
      // Arrange
      const mockDevcontainerConfig = JSON.stringify({
        forwardPorts: [3000, 5173],
        portsAttributes: {
          "3000": { "visibility": "public" },
          "5173": { "visibility": "private" }
        }
      });
      mockFs.readFileSync.mockReturnValue(mockDevcontainerConfig);
      mockFs.existsSync.mockReturnValue(true);

      // Act
      const portConfig = await networkDiagnostics.analyzePortForwarding();

      // Assert - verify port forwarding analysis
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.devcontainer/devcontainer.json')
      );
      expect(portConfig).toEqual(expect.objectContaining({
        configured: true,
        ports: expect.arrayContaining([3000, 5173]),
        visibility: expect.objectContaining({
          3000: 'public',
          5173: 'private'
        })
      }));
    });
  });

  describe('DNS Resolution Testing', () => {
    it('should test various hostname resolution formats', async () => {
      // Arrange
      const hostnames = ['localhost', '127.0.0.1', '0.0.0.0'];
      mockDns.lookup
        .mockResolvedValueOnce({ address: '127.0.0.1', family: 4 })
        .mockResolvedValueOnce({ address: '127.0.0.1', family: 4 })
        .mockRejectedValueOnce(new Error('Invalid hostname'));

      // Act
      const resolutionResults = await networkDiagnostics.testDnsResolution(hostnames);

      // Assert - verify DNS interaction pattern
      expect(mockDns.lookup).toHaveBeenCalledTimes(3);
      expect(resolutionResults).toEqual(expect.objectContaining({
        'localhost': expect.objectContaining({ resolved: true }),
        '127.0.0.1': expect.objectContaining({ resolved: true }),
        '0.0.0.0': expect.objectContaining({ resolved: false, error: expect.any(String) })
      }));
    });
  });

  describe('Connectivity Testing', () => {
    it('should test HTTP connectivity to various URL formats', async () => {
      // Arrange
      const urls = ['http://localhost:3000', 'http://127.0.0.1:3000'];
      const mockResponse = { statusCode: 200, headers: {} };
      networkDiagnostics.httpClient.get
        .mockImplementation((url, callback) => {
          callback(mockResponse);
          return { on: jest.fn() };
        });

      // Act
      const connectivityResults = await networkDiagnostics.testConnectivity(urls);

      // Assert - verify HTTP client interaction
      expect(networkDiagnostics.httpClient.get).toHaveBeenCalledTimes(2);
      urls.forEach(url => {
        expect(connectivityResults[url]).toEqual(expect.objectContaining({
          accessible: true,
          statusCode: 200
        }));
      });
    });

    it('should handle connection failures gracefully', async () => {
      // Arrange
      const urls = ['http://localhost:3000'];
      networkDiagnostics.httpClient.get.mockImplementation((url, callback) => {
        const mockRequest = { 
          on: jest.fn((event, handler) => {
            if (event === 'error') {
              handler(new Error('ECONNREFUSED'));
            }
          })
        };
        return mockRequest;
      });

      // Act
      const results = await networkDiagnostics.testConnectivity(urls);

      // Assert - verify error handling
      expect(results['http://localhost:3000']).toEqual(expect.objectContaining({
        accessible: false,
        error: expect.stringContaining('ECONNREFUSED')
      }));
    });
  });

  describe('Comprehensive Diagnostics Report', () => {
    it('should orchestrate all diagnostic tests and generate report', async () => {
      // Arrange
      const mockResults = {
        interfaces: { external: [], internal: [] },
        portBinding: { 3000: { bound: true } },
        codespaces: { isCodespaces: true },
        dns: { 'localhost': { resolved: true } },
        connectivity: { 'http://localhost:3000': { accessible: true } }
      };

      // Mock all diagnostic methods
      networkDiagnostics.discoverNetworkInterfaces = jest.fn().mockResolvedValue(mockResults.interfaces);
      networkDiagnostics.analyzePortBinding = jest.fn().mockResolvedValue(mockResults.portBinding);
      networkDiagnostics.detectCodespacesEnvironment = jest.fn().mockResolvedValue(mockResults.codespaces);
      networkDiagnostics.testDnsResolution = jest.fn().mockResolvedValue(mockResults.dns);
      networkDiagnostics.testConnectivity = jest.fn().mockResolvedValue(mockResults.connectivity);

      // Act
      const report = await networkDiagnostics.runComprehensiveDiagnostics([3000, 5173]);

      // Assert - verify orchestration behavior
      expect(networkDiagnostics.discoverNetworkInterfaces).toHaveBeenCalledTimes(1);
      expect(networkDiagnostics.analyzePortBinding).toHaveBeenCalledWith([3000, 5173]);
      expect(networkDiagnostics.detectCodespacesEnvironment).toHaveBeenCalledTimes(1);
      expect(networkDiagnostics.testDnsResolution).toHaveBeenCalledTimes(1);
      expect(networkDiagnostics.testConnectivity).toHaveBeenCalledTimes(1);

      expect(report).toEqual(expect.objectContaining({
        timestamp: expect.any(String),
        environment: mockResults.codespaces,
        interfaces: mockResults.interfaces,
        portBinding: mockResults.portBinding,
        dns: mockResults.dns,
        connectivity: mockResults.connectivity,
        recommendations: expect.any(Array)
      }));
    });

    it('should provide actionable recommendations based on findings', async () => {
      // Arrange
      const problematicResults = {
        interfaces: { external: [], internal: [{ address: '127.0.0.1' }] },
        portBinding: { 3000: { bound: true, interfaces: ['127.0.0.1'], codespacesSafe: false } },
        codespaces: { isCodespaces: true },
        connectivity: { 'http://localhost:3000': { accessible: false } }
      };

      networkDiagnostics.discoverNetworkInterfaces = jest.fn().mockResolvedValue(problematicResults.interfaces);
      networkDiagnostics.analyzePortBinding = jest.fn().mockResolvedValue(problematicResults.portBinding);
      networkDiagnostics.detectCodespacesEnvironment = jest.fn().mockResolvedValue(problematicResults.codespaces);

      // Act
      const report = await networkDiagnostics.runComprehensiveDiagnostics([3000]);

      // Assert - verify recommendation generation
      expect(report.recommendations).toEqual(expect.arrayContaining([
        expect.stringContaining('bind to 0.0.0.0'),
        expect.stringContaining('Codespaces port forwarding')
      ]));
    });
  });
});