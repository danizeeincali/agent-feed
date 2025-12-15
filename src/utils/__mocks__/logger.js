const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  logError: jest.fn(),
  logRequest: jest.fn(),
  logDatabaseQuery: jest.fn(),
  logAgentAction: jest.fn(),
  logBusinessEvent: jest.fn(),
  logSecurityEvent: jest.fn(),
  logPerformanceMetric: jest.fn(),
};

module.exports = logger;
module.exports.logger = logger;
module.exports.default = logger;
