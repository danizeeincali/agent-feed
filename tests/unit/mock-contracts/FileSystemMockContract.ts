/**
 * TDD London School Mock Contract for File System External Dependency
 * Defines all interactions with file operations and directory management
 */

export interface FileSystemMockContract {
  // File operations
  readFile: jest.MockedFunction<(path: string, encoding?: string) => Promise<string | Buffer>>;
  writeFile: jest.MockedFunction<(path: string, data: string | Buffer, options?: any) => Promise<void>>;
  appendFile: jest.MockedFunction<(path: string, data: string | Buffer, options?: any) => Promise<void>>;
  deleteFile: jest.MockedFunction<(path: string) => Promise<void>>;
  
  // File status
  exists: jest.MockedFunction<(path: string) => Promise<boolean>>;
  stat: jest.MockedFunction<(path: string) => Promise<{
    isFile: () => boolean;
    isDirectory: () => boolean;
    size: number;
    mtime: Date;
    ctime: Date;
  }>>;
  
  // Directory operations
  mkdir: jest.MockedFunction<(path: string, options?: { recursive?: boolean }) => Promise<void>>;
  rmdir: jest.MockedFunction<(path: string, options?: { recursive?: boolean }) => Promise<void>>;
  readdir: jest.MockedFunction<(path: string) => Promise<string[]>>;
  
  // Path operations
  resolve: jest.MockedFunction<(...paths: string[]) => string>;
  join: jest.MockedFunction<(...paths: string[]) => string>;
  dirname: jest.MockedFunction<(path: string) => string>;
  basename: jest.MockedFunction<(path: string, ext?: string) => string>;
  extname: jest.MockedFunction<(path: string) => string>;
  
  // File watching
  watch: jest.MockedFunction<(path: string, callback: (eventType: string, filename: string) => void) => any>;
  
  // Permissions
  access: jest.MockedFunction<(path: string, mode?: number) => Promise<void>>;
  chmod: jest.MockedFunction<(path: string, mode: string | number) => Promise<void>>;
}

export interface LoggerMockContract {
  // Logging levels
  info: jest.MockedFunction<(message: string, meta?: any) => void>;
  warn: jest.MockedFunction<(message: string, meta?: any) => void>;
  error: jest.MockedFunction<(message: string, meta?: any) => void>;
  debug: jest.MockedFunction<(message: string, meta?: any) => void>;
  trace: jest.MockedFunction<(message: string, meta?: any) => void>;
  
  // Log file management
  createLogFile: jest.MockedFunction<(filePath: string) => Promise<void>>;
  rotateLog: jest.MockedFunction<(filePath: string) => Promise<void>>;
  clearLogs: jest.MockedFunction<() => Promise<void>>;
  
  // Configuration
  setLevel: jest.MockedFunction<(level: string) => void>;
  getLevel: jest.MockedFunction<() => string>;
  
  // Structured logging
  logWithContext: jest.MockedFunction<(level: string, message: string, context: any) => void>;
}

export interface ConfigManagerMockContract {
  // Configuration loading
  loadConfig: jest.MockedFunction<(configPath: string) => Promise<any>>;
  saveConfig: jest.MockedFunction<(configPath: string, config: any) => Promise<void>>;
  
  // Configuration access
  get: jest.MockedFunction<(key: string, defaultValue?: any) => any>;
  set: jest.MockedFunction<(key: string, value: any) => void>;
  has: jest.MockedFunction<(key: string) => boolean>;
  delete: jest.MockedFunction<(key: string) => boolean>;
  
  // Configuration validation
  validate: jest.MockedFunction<(config: any, schema: any) => { valid: boolean; errors: string[] }>;
  
  // Environment handling
  getEnvironment: jest.MockedFunction<() => string>;
  setEnvironment: jest.MockedFunction<(env: string) => void>;
  
  // Configuration watching
  watchConfig: jest.MockedFunction<(callback: (changes: any) => void) => void>;
  unwatchConfig: jest.MockedFunction<() => void>;
}

export interface TempFileManagerMockContract {
  // Temporary file creation
  createTempFile: jest.MockedFunction<(prefix?: string, suffix?: string) => Promise<{
    path: string;
    fd: number;
    cleanup: () => Promise<void>;
  }>>;
  
  createTempDir: jest.MockedFunction<(prefix?: string) => Promise<{
    path: string;
    cleanup: () => Promise<void>;
  }>>;
  
  // Cleanup operations
  cleanupTempFiles: jest.MockedFunction<() => Promise<void>>;
  cleanupTempDir: jest.MockedFunction<(dirPath: string) => Promise<void>>;
  
  // Temp file management
  listTempFiles: jest.MockedFunction<() => string[]>;
  getTempDir: jest.MockedFunction<() => string>;
}

/**
 * Factory function to create File System mock
 */
export const createFileSystemMock = (overrides: Partial<FileSystemMockContract> = {}): FileSystemMockContract => {
  const defaultMock: FileSystemMockContract = {
    readFile: jest.fn().mockResolvedValue('mock file content'),
    writeFile: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
    stat: jest.fn().mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date(),
      ctime: new Date()
    }),
    mkdir: jest.fn().mockResolvedValue(undefined),
    rmdir: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue(['file1.txt', 'file2.js']),
    resolve: jest.fn().mockImplementation((...paths) => paths.join('/')),
    join: jest.fn().mockImplementation((...paths) => paths.join('/')),
    dirname: jest.fn().mockImplementation((path) => path.substring(0, path.lastIndexOf('/'))),
    basename: jest.fn().mockImplementation((path) => path.substring(path.lastIndexOf('/') + 1)),
    extname: jest.fn().mockImplementation((path) => {
      const lastDot = path.lastIndexOf('.');
      return lastDot > 0 ? path.substring(lastDot) : '';
    }),
    watch: jest.fn().mockReturnValue({ close: jest.fn() }),
    access: jest.fn().mockResolvedValue(undefined),
    chmod: jest.fn().mockResolvedValue(undefined)
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Factory function to create Logger mock
 */
export const createLoggerMock = (overrides: Partial<LoggerMockContract> = {}): LoggerMockContract => {
  const defaultMock: LoggerMockContract = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    createLogFile: jest.fn().mockResolvedValue(undefined),
    rotateLog: jest.fn().mockResolvedValue(undefined),
    clearLogs: jest.fn().mockResolvedValue(undefined),
    setLevel: jest.fn(),
    getLevel: jest.fn().mockReturnValue('info'),
    logWithContext: jest.fn()
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Factory function to create Config Manager mock
 */
export const createConfigManagerMock = (overrides: Partial<ConfigManagerMockContract> = {}): ConfigManagerMockContract => {
  const mockConfig = {
    server: { port: 3000, host: 'localhost' },
    claude: { timeout: 30000, maxRetries: 3 },
    logging: { level: 'info', file: 'app.log' }
  };
  
  const defaultMock: ConfigManagerMockContract = {
    loadConfig: jest.fn().mockResolvedValue(mockConfig),
    saveConfig: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockImplementation((key, defaultValue) => {
      const keys = key.split('.');
      let value = mockConfig as any;
      for (const k of keys) {
        value = value?.[k];
      }
      return value !== undefined ? value : defaultValue;
    }),
    set: jest.fn(),
    has: jest.fn().mockImplementation((key) => {
      const keys = key.split('.');
      let value = mockConfig as any;
      for (const k of keys) {
        value = value?.[k];
      }
      return value !== undefined;
    }),
    delete: jest.fn().mockReturnValue(true),
    validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
    getEnvironment: jest.fn().mockReturnValue('development'),
    setEnvironment: jest.fn(),
    watchConfig: jest.fn(),
    unwatchConfig: jest.fn()
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Factory function to create Temp File Manager mock
 */
export const createTempFileManagerMock = (overrides: Partial<TempFileManagerMockContract> = {}): TempFileManagerMockContract => {
  const defaultMock: TempFileManagerMockContract = {
    createTempFile: jest.fn().mockResolvedValue({
      path: '/tmp/temp-file-12345.tmp',
      fd: 3,
      cleanup: jest.fn().mockResolvedValue(undefined)
    }),
    createTempDir: jest.fn().mockResolvedValue({
      path: '/tmp/temp-dir-12345',
      cleanup: jest.fn().mockResolvedValue(undefined)
    }),
    cleanupTempFiles: jest.fn().mockResolvedValue(undefined),
    cleanupTempDir: jest.fn().mockResolvedValue(undefined),
    listTempFiles: jest.fn().mockReturnValue(['/tmp/temp-file-1.tmp', '/tmp/temp-file-2.tmp']),
    getTempDir: jest.fn().mockReturnValue('/tmp')
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * File System operation simulator for testing file-based workflows
 */
export class FileSystemSimulator {
  private files: Map<string, { content: string; stats: any }> = new Map();
  private directories: Set<string> = new Set();
  private watchers: Map<string, (event: string, filename: string) => void> = new Map();
  
  constructor() {
    // Initialize with some default structure
    this.directories.add('/workspaces');
    this.directories.add('/workspaces/agent-feed');
    this.directories.add('/tmp');
    
    this.files.set('/workspaces/agent-feed/package.json', {
      content: JSON.stringify({ name: 'agent-feed', version: '1.0.0' }),
      stats: {
        isFile: () => true,
        isDirectory: () => false,
        size: 42,
        mtime: new Date(),
        ctime: new Date()
      }
    });
  }
  
  createFile(path: string, content: string = '') {
    this.files.set(path, {
      content,
      stats: {
        isFile: () => true,
        isDirectory: () => false,
        size: content.length,
        mtime: new Date(),
        ctime: new Date()
      }
    });
    
    // Notify watchers
    const dirname = path.substring(0, path.lastIndexOf('/'));
    const watcher = this.watchers.get(dirname);
    if (watcher) {
      watcher('change', path.substring(path.lastIndexOf('/') + 1));
    }
  }
  
  createDirectory(path: string) {
    this.directories.add(path);
  }
  
  deleteFile(path: string) {
    this.files.delete(path);
    
    // Notify watchers
    const dirname = path.substring(0, path.lastIndexOf('/'));
    const watcher = this.watchers.get(dirname);
    if (watcher) {
      watcher('unlink', path.substring(path.lastIndexOf('/') + 1));
    }
  }
  
  deleteDirectory(path: string) {
    this.directories.delete(path);
    
    // Remove all files in directory
    for (const [filePath] of this.files) {
      if (filePath.startsWith(path + '/')) {
        this.files.delete(filePath);
      }
    }
  }
  
  fileExists(path: string): boolean {
    return this.files.has(path);
  }
  
  directoryExists(path: string): boolean {
    return this.directories.has(path);
  }
  
  getFileContent(path: string): string {
    return this.files.get(path)?.content || '';
  }
  
  listFiles(dirPath: string): string[] {
    const files: string[] = [];
    
    for (const [filePath] of this.files) {
      if (filePath.startsWith(dirPath + '/') && 
          !filePath.substring(dirPath.length + 1).includes('/')) {
        files.push(filePath.substring(filePath.lastIndexOf('/') + 1));
      }
    }
    
    return files.sort();
  }
  
  addWatcher(path: string, callback: (event: string, filename: string) => void) {
    this.watchers.set(path, callback);
  }
  
  removeWatcher(path: string) {
    this.watchers.delete(path);
  }
  
  simulateFileChange(path: string) {
    const dirname = path.substring(0, path.lastIndexOf('/'));
    const filename = path.substring(path.lastIndexOf('/') + 1);
    const watcher = this.watchers.get(dirname);
    if (watcher) {
      watcher('change', filename);
    }
  }
  
  reset() {
    this.files.clear();
    this.directories.clear();
    this.watchers.clear();
    
    // Restore defaults
    this.directories.add('/workspaces');
    this.directories.add('/workspaces/agent-feed');
    this.directories.add('/tmp');
  }
}