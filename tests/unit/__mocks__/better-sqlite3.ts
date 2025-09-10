/**
 * Mock implementation for better-sqlite3 - TDD Mock Configuration
 */

// Mock functions that can be accessed from tests
const mockPrepare = jest.fn();
const mockRun = jest.fn();
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockExec = jest.fn();
const mockClose = jest.fn();
const mockBackup = jest.fn();

class MockStatement {
  run = mockRun.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
  get = mockGet.mockReturnValue(null);
  all = mockAll.mockReturnValue([]);
  finalize = jest.fn();
}

class MockBackup {
  transfer = jest.fn().mockReturnValue(true);
}

const MockDatabase = jest.fn().mockImplementation((path: string, options?: any) => {
  const instance: any = {};
  instance.exec = mockExec.mockReturnValue(instance);
  instance.prepare = mockPrepare.mockReturnValue(new MockStatement());
  instance.close = mockClose;
  instance.backup = mockBackup.mockReturnValue(new MockBackup());
  return instance;
});

// Export the mock functions for test access
export const __mockFunctions = {
  mockPrepare,
  mockRun, 
  mockGet,
  mockAll,
  mockExec,
  mockClose,
  mockBackup
};

export default MockDatabase;
export { MockDatabase as Database };