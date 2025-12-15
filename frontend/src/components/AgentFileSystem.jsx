/**
 * AgentFileSystem - Browse agent workspace files and structure
 * Phase 2: Interactive file browser with preview and navigation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  FolderOpen,
  File,
  FileText,
  Code,
  Image,
  Settings,
  Download,
  Eye,
  Search,
  ChevronRight,
  ChevronDown,
  Home,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';

const AgentFileSystem = ({ agent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['']));
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!agent || !agent.workspace) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Workspace Available
          </h3>
          <p className="text-gray-600">
            This agent doesn't have an accessible workspace or file system.
          </p>
        </CardContent>
      </Card>
    );
  }

  const workspace = agent.workspace;
  const rootPath = workspace.rootPath || `/agents/${agent.slug}`;

  /**
   * Get file icon based on extension or type
   */
  const getFileIcon = (file) => {
    if (file.type === 'folder') {
      return expandedFolders.has(file.path) 
        ? <ChevronDown className="w-4 h-4 text-blue-600" />
        : <ChevronRight className="w-4 h-4 text-blue-600" />;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'go':
      case 'rust':
        return <Code className="w-4 h-4 text-green-600" />;
      case 'md':
      case 'txt':
      case 'doc':
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image className="w-4 h-4 text-purple-600" />;
      case 'json':
      case 'yaml':
      case 'yml':
      case 'toml':
      case 'ini':
      case 'config':
        return <Settings className="w-4 h-4 text-orange-600" />;
      default:
        return <File className="w-4 h-4 text-gray-600" />;
    }
  };

  /**
   * Get file type badge
   */
  const getFileTypeBadge = (file) => {
    if (file.type === 'folder') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          {file.children} items
        </Badge>
      );
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const fileSize = file.size ? formatFileSize(file.size) : '';
    
    return (
      <Badge variant="outline" className="text-xs">
        {extension?.toUpperCase()} {fileSize && `• ${fileSize}`}
      </Badge>
    );
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Toggle folder expansion
   */
  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  /**
   * Handle file/folder click
   */
  const handleItemClick = (item) => {
    if (item.type === 'folder') {
      toggleFolder(item.path);
    } else {
      setSelectedPath(item.path);
      loadFileContent(item);
    }
  };

  /**
   * Load file content for preview
   */
  const loadFileContent = async (file) => {
    setLoading(true);
    try {
      // Simulate API call to get file content
      const response = await fetch(`/api/agents/${agent.slug}/files?path=${encodeURIComponent(file.path)}`);
      if (response.ok) {
        const content = await response.text();
        setFileContent({ file, content });
      } else {
        // Fallback to mock content based on file type
        const extension = file.name.split('.').pop()?.toLowerCase();
        let mockContent = '';
        
        switch (extension) {
          case 'md':
            mockContent = `# ${file.name}\n\nThis is a markdown file for the ${agent.name} agent.\n\n## Overview\n\nContent details here...`;
            break;
          case 'json':
            mockContent = JSON.stringify({
              name: agent.name,
              version: agent.version,
              description: agent.description,
              configuration: {}
            }, null, 2);
            break;
          case 'js':
          case 'ts':
            mockContent = `/**\n * ${file.name} - ${agent.name}\n * Generated agent file\n */\n\nconst config = {\n  name: '${agent.name}',\n  version: '${agent.version}'\n};\n\nexport default config;`;
            break;
          default:
            mockContent = `File: ${file.name}\nSize: ${formatFileSize(file.size)}\n\nContent preview not available for this file type.`;
        }
        
        setFileContent({ file, content: mockContent, isMock: true });
      }
    } catch (error) {
      console.error('Failed to load file content:', error);
      setFileContent({ 
        file, 
        content: `Error loading file content: ${error.message}`, 
        isError: true 
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter files based on search
   */
  const filteredStructure = workspace.structure?.filter(item => {
    if (!searchTerm) return true;
    return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.path.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  /**
   * Download file
   */
  const handleDownload = (file) => {
    if (fileContent && fileContent.file.path === file.path) {
      const blob = new Blob([fileContent.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Agent Workspace
          </h2>
          <p className="text-gray-600 mt-1">
            Browse and explore {agent.name} workspace files
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Home className="w-4 h-4" />
            <span>{rootPath}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
          
          <Button variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Tree */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                File Structure
              </CardTitle>
              <CardDescription>
                {filteredStructure.length} items
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredStructure.length === 0 ? (
                  <div className="p-6 text-center">
                    <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">No files found</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredStructure.map((item, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-50',
                          selectedPath === item.path && 'bg-blue-50 border-r-2 border-blue-500'
                        )}
                        onClick={() => handleItemClick(item)}
                        data-testid="file-item"
                      >
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {getFileIcon(item)}
                          <span className="truncate font-medium">{item.name}</span>
                        </div>
                        <div className="flex-shrink-0">
                          {getFileTypeBadge(item)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Content Preview */}
        <div className="lg:col-span-2">
          {!fileContent ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a File to Preview
                </h3>
                <p className="text-gray-600">
                  Click on a file in the file structure to view its content here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(fileContent.file)}
                    <div>
                      <CardTitle className="text-base">{fileContent.file.name}</CardTitle>
                      <CardDescription>{fileContent.file.path}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {fileContent.isMock && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        Mock Content
                      </Badge>
                    )}
                    {fileContent.isError && (
                      <Badge variant="destructive">
                        Error
                      </Badge>
                    )}
                    
                    <Button variant="outline" size="sm" onClick={() => handleDownload(fileContent.file)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {fileContent.content}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Workspace Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {workspace.structure?.length || 0}
              </div>
              <div className="text-sm text-blue-700">Total Items</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {workspace.structure?.filter(item => item.type === 'folder').length || 0}
              </div>
              <div className="text-sm text-green-700">Folders</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {workspace.structure?.filter(item => item.type === 'file').length || 0}
              </div>
              <div className="text-sm text-purple-700">Files</div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatFileSize(
                  workspace.structure?.reduce((total, item) => total + (item.size || 0), 0) || 0
                )}
              </div>
              <div className="text-sm text-orange-700">Total Size</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentFileSystem;