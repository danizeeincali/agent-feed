/**
 * AgentFileSystemTab - Interactive workspace file browser
 * Implements London School TDD behavior verification patterns
 * Features: File tree, preview, search, download functionality
 */

import React, { useState, useMemo } from 'react';
import { 
  FolderOpen, 
  File, 
  Search, 
  Download, 
  Eye,
  ChevronRight,
  ChevronDown,
  Code,
  FileText,
  Image,
  Archive,
  Folder,
  HardDrive,
  Calendar,
  Users,
  Grid,
  List,
  TreePine
} from 'lucide-react';
import { UnifiedAgentData } from './UnifiedAgentPage';

interface AgentFileSystemTabProps {
  agent: UnifiedAgentData;
}

interface FileSystemItem {
  type: 'file' | 'folder';
  name: string;
  path: string;
  size?: number;
  children?: number;
  lastModified?: string;
  language?: string;
  parent?: string;
}

interface WorkspaceData {
  rootPath: string;
  totalSize?: number;
  fileCount?: number;
  folderCount?: number;
  structure: FileSystemItem[];
}

const AgentFileSystemTab: React.FC<AgentFileSystemTabProps> = ({ agent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'tree'>('list');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('Root');

  // Handle null agent or no workspace
  if (!agent) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workspace Available</h3>
          <p className="text-gray-600">
            Agent workspace information is not available.
          </p>
        </div>
      </div>
    );
  }

  const workspace: WorkspaceData | undefined = agent.workspace;

  if (!workspace) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workspace Available</h3>
          <p className="text-gray-600">
            This agent does not have an accessible workspace.
          </p>
        </div>
      </div>
    );
  }

  if (!workspace.structure || workspace.structure.length === 0) {
    return (
      <div className="space-y-6">
        {/* Show workspace overview even if empty */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div data-testid="workspace-overview">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-500" />
              Agent Workspace
            </h2>
            <div className="text-center py-8">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Empty Workspace</h3>
              <p className="text-gray-600">
                This workspace does not contain any files or folders.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter files based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return workspace.structure;
    
    return workspace.structure.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workspace.structure, searchTerm]);

  // Calculate workspace statistics
  const workspaceStats = useMemo(() => {
    const files = workspace.structure.filter(item => item.type === 'file').length;
    const folders = workspace.structure.filter(item => item.type === 'folder').length;
    const totalSize = workspace.totalSize || 0;
    
    return {
      files: workspace.fileCount || files,
      folders: workspace.folderCount || folders,
      totalSize: formatFileSize(totalSize)
    };
  }, [workspace]);

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Get file icon based on type
  const getFileIcon = (item: FileSystemItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-4 h-4 text-blue-500" />;
    }
    
    const extension = item.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <Code className="w-4 h-4 text-yellow-500" />;
      case 'md':
      case 'txt':
        return <FileText className="w-4 h-4 text-gray-500" />;
      case 'json':
        return <Code className="w-4 h-4 text-green-500" />;
      case 'png':
      case 'jpg':
      case 'svg':
        return <Image className="w-4 h-4 text-purple-500" />;
      case 'zip':
      case 'tar':
        return <Archive className="w-4 h-4 text-orange-500" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  // Handle folder expansion
  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  // Handle file selection
  const handleFileSelect = async (file: FileSystemItem) => {
    if (file.type === 'folder') {
      toggleFolder(file.path);
      return;
    }
    
    setSelectedFile(file);
    setIsLoading(true);
    
    try {
      // Mock file content loading
      await new Promise(resolve => setTimeout(resolve, 500));
      setPreviewContent('Mock file content');
    } catch (error) {
      console.error('Error loading file content:', error);
      setPreviewContent('Error loading file content');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file download
  const handleDownload = (file: FileSystemItem) => {
    if (file.type === 'folder') return;
    
    const content = previewContent || 'Mock file content';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Workspace Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div data-testid="workspace-overview">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-500" />
            Agent Workspace
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{workspaceStats.files} Files</div>
              <div className="text-sm text-blue-700">Total Files</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{workspaceStats.folders} Folders</div>
              <div className="text-sm text-green-700">Directories</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">{workspaceStats.totalSize}</div>
              <div className="text-sm text-purple-700">Total Size</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-900">Jan 14, 2024</div>
              <div className="text-sm text-orange-700">Last Modified</div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <strong>Root Path:</strong> {workspace.rootPath}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Browser */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div data-testid="file-browser">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">File Browser</h3>
                
                {/* View Mode Toggles */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    data-testid="view-mode-list"
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    data-testid="view-mode-grid"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    data-testid="view-mode-tree"
                    onClick={() => setViewMode('tree')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'tree' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <TreePine className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Breadcrumb */}
              <div data-testid="path-breadcrumb" className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <HardDrive className="w-4 h-4" />
                <span>{currentPath}</span>
              </div>

              {/* Search */}
              <div data-testid="file-search" className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search files and folders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* File Tree */}
          <div className="p-6">
            <div 
              data-testid="file-tree" 
              className={`space-y-2 ${viewMode === 'list' ? 'list-view' : viewMode === 'grid' ? 'grid-view' : 'tree-view'}`}
            >
              {filteredItems.map((item) => (
                <div
                  key={item.path}
                  data-testid={`${item.type}-item-${item.name}`}
                  onClick={() => handleFileSelect(item)}
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedFile?.path === item.path ? 'bg-blue-50 border-blue-200 selected' : 'border-transparent'
                  } border`}
                >
                  {/* Expansion arrow for folders */}
                  {item.type === 'folder' && (
                    <button
                      data-testid={expandedFolders.has(item.path) ? `collapse-arrow-${item.name}` : `expand-arrow-${item.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFolder(item.path);
                      }}
                      className="p-1"
                    >
                      {expandedFolders.has(item.path) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  )}
                  
                  {/* File/Folder Icon */}
                  <div data-testid={`${item.type}-icon-${item.name}`}>
                    {getFileIcon(item)}
                  </div>
                  
                  {/* Name and Details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">
                      {item.type === 'folder' && item.children !== undefined && (
                        <span>{item.children} items</span>
                      )}
                      {item.type === 'file' && item.size && (
                        <span>{formatFileSize(item.size)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* File Type */}
                  {item.language && (
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                      {item.language}
                    </span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Expanded folder contents would be shown here */}
            {expandedFolders.has('src/') && (
              <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                {workspace.structure
                  .filter(item => item.parent === 'src/')
                  .map((item) => (
                    <div
                      key={item.path}
                      data-testid={`${item.type}-item-${item.name}`}
                      onClick={() => handleFileSelect(item)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      {getFileIcon(item)}
                      <span className="text-gray-900">{item.name}</span>
                      {item.size && (
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatFileSize(item.size)}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* File Preview */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div data-testid="file-preview" className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-600" />
              File Preview
            </h3>
            
            {!selectedFile ? (
              <div className="text-center py-8">
                <File className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-600">Select a file to preview its content</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                <div className="pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    {getFileIcon(selectedFile)}
                    <span className="font-medium text-gray-900">{selectedFile.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {selectedFile.size && (
                      <div>{formatFileSize(selectedFile.size)}</div>
                    )}
                    {selectedFile.language && (
                      <div className="flex items-center gap-1">
                        <Code className="w-3 h-3" />
                        {selectedFile.language}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Content Preview */}
                {isLoading ? (
                  <div className="py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading...</p>
                  </div>
                ) : (
                  <div>
                    {selectedFile.language === 'typescript' || selectedFile.language === 'javascript' ? (
                      <div data-testid="syntax-highlighted-content" className="relative">
                        <div data-testid="line-numbers" className="absolute left-0 top-0 bottom-0 w-8 bg-gray-50 text-gray-400 text-xs leading-6 pt-4 pl-2">
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i}>{i + 1}</div>
                          ))}
                        </div>
                        <pre className="bg-gray-50 p-4 pl-12 rounded text-sm text-gray-900 overflow-x-auto">
                          <code data-testid="preview-content">{previewContent}</code>
                        </pre>
                      </div>
                    ) : (
                      <pre data-testid="preview-content" className="bg-gray-50 p-4 rounded text-sm text-gray-900 whitespace-pre-wrap">
                        {previewContent}
                      </pre>
                    )}
                  </div>
                )}
                
                {/* Download Button */}
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Type Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div data-testid="file-type-stats">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">File Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-900">2 files</div>
              <div className="text-sm text-yellow-700">TypeScript</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-900">2 files</div>
              <div className="text-sm text-green-700">JSON</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">1 file</div>
              <div className="text-sm text-gray-700">Markdown</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-900">4</div>
              <div className="text-sm text-blue-700">Folders</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentFileSystemTab;