/**
 * AgentDefinitionTab - Markdown definition display component
 * Implements London School TDD behavior verification patterns
 * Features: Markdown rendering, TOC generation, copy/download functionality
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Copy, 
  Download, 
  Eye, 
  Code, 
  CheckCircle,
  ExternalLink,
  BookOpen,
  Hash,
  Calendar,
  FileCode
} from 'lucide-react';
// Define UnifiedAgentData interface locally
interface UnifiedAgentData {
  id: string;
  name: string;
  description: string;
  capabilities?: string[];
  type?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  documentation?: string;
  examples?: string[];
  metadata?: Record<string, any>;
  definition?: string;
}

interface AgentDefinitionTabProps {
  agent: UnifiedAgentData;
}

interface MarkdownSection {
  id: string;
  title: string;
  level: number;
  content: string[];
}

interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

interface DefinitionMetadata {
  wordCount: number;
  characterCount: number;
  sectionCount: number;
  format: string;
}

const AgentDefinitionTab: React.FC<AgentDefinitionTabProps> = ({ agent }) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'source'>('rendered');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  // Parse markdown content and generate sections/TOC
  const { sections, toc, metadata } = useMemo(() => {
    if (!agent?.definition) {
      return { sections: [], toc: [], metadata: null };
    }

    const lines = agent.definition.split('\n');
    const sections: MarkdownSection[] = [];
    const toc: TableOfContentsItem[] = [];
    let currentSection: MarkdownSection | null = null;

    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }

        // Create new section
        const level = headerMatch[1].length;
        const title = headerMatch[2];
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        currentSection = {
          id,
          title,
          level,
          content: [line]
        };

        // Add to TOC
        toc.push({ id, title, level });
      } else if (currentSection) {
        currentSection.content.push(line);
      }
    });

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    // Calculate metadata
    const metadata: DefinitionMetadata = {
      wordCount: agent.definition.split(/\s+/).length,
      characterCount: agent.definition.length,
      sectionCount: sections.length,
      format: 'Markdown (.md)'
    };

    return { sections, toc, metadata };
  }, [agent?.definition]);

  // Render markdown with basic parsing
  const renderMarkdownContent = (content: string) => {
    // Basic markdown rendering (simplified for TDD)
    let html = content;
    
    // Headers
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
      const level = hashes.length;
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `<h${level} id="${id}" class="heading-${level}">${text}</h${level}>`;
    });

    // Bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="code-block" data-language="${lang || 'text'}">
        <div class="code-header">Code (${lang || 'text'})</div>
        <pre><code>${code}</code></pre>
      </div>`;
    });
    
    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      const isExternal = url.startsWith('http');
      return `<a href="${url}" ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>${text}${isExternal ? ' <span class="external-link-icon">↗</span>' : ''}</a>`;
    });
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  // Copy functionality
  const handleCopy = async () => {
    if (!agent?.definition) return;
    
    try {
      await navigator.clipboard.writeText(agent.definition);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  // Download functionality
  const handleDownload = () => {
    if (!agent?.definition) return;
    
    const blob = new Blob([agent.definition], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.id}-definition.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // No definition state
  if (!agent?.definition) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Definition Available</h3>
          <p className="text-gray-600">
            This agent doesn't have a markdown definition document.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with metadata and actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Agent Definition</h2>
              <p className="text-sm text-gray-600">Comprehensive documentation and specifications</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View mode toggles */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('rendered')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'rendered'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Eye className="w-4 h-4 mr-1 inline" />
                Rendered
              </button>
              <button
                onClick={() => setViewMode('source')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'source'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Code className="w-4 h-4 mr-1 inline" />
                Source
              </button>
            </div>
            
            {/* Action buttons */}
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              {copyStatus === 'copied' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </button>
            
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>
        </div>

        {/* Metadata */}
        {metadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{metadata.wordCount} words</div>
              <div className="text-sm text-gray-600">Content Length</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{metadata.characterCount} characters</div>
              <div className="text-sm text-gray-600">Total Characters</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{metadata.sectionCount} sections</div>
              <div className="text-sm text-gray-600">Document Structure</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{metadata.format}</div>
              <div className="text-sm text-gray-600">File Format</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table of Contents */}
        {toc.length > 0 && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <div data-testid="table-of-contents">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Hash className="w-5 h-5 text-gray-600" />
                  Table of Contents
                </h3>
                <nav className="space-y-2">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`block text-sm transition-colors hover:text-blue-600 ${
                        item.level === 1 ? 'font-medium text-gray-900' :
                        item.level === 2 ? 'font-medium text-gray-700 ml-3' :
                        'text-gray-600 ml-6'
                      }`}
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className={`${toc.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <div className="bg-white rounded-lg border border-gray-200">
            <div data-testid="definition-content" className="p-6">
              {viewMode === 'rendered' ? (
                <div 
                  data-testid="markdown-rendered"
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdownContent(agent.definition) 
                  }}
                />
              ) : (
                <div data-testid="markdown-source">
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-900 whitespace-pre-wrap font-mono overflow-x-auto">
                    {agent.definition}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDefinitionTab;