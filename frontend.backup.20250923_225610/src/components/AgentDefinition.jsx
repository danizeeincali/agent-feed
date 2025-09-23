/**
 * AgentDefinition - Display agent markdown definition/documentation
 * Phase 2: Markdown content rendering with syntax highlighting and interactive elements
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  FileText,
  Copy,
  Download,
  ExternalLink,
  Code,
  BookOpen,
  Search,
  Eye,
  Edit3
} from 'lucide-react';
import { cn } from '../lib/utils';

const AgentDefinition = ({ agent }) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [viewMode, setViewMode] = useState('rendered'); // 'rendered' or 'source'

  /**
   * Parse markdown content and extract sections
   */
  const parsedContent = useMemo(() => {
    if (!agent?.definition) {
      return {
        sections: [],
        toc: [],
        metadata: {}
      };
    }

    const content = agent.definition;
    const lines = content.split('\n');
    const sections = [];
    const toc = [];
    let currentSection = null;
    
    lines.forEach((line, index) => {
      // Check for headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2];
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Create new section
        currentSection = {
          id,
          title,
          level,
          content: [line],
          lineStart: index
        };
        
        // Add to table of contents
        toc.push({ id, title, level });
      } else if (currentSection) {
        currentSection.content.push(line);
      } else {
        // Content before first header
        if (!sections[0] || sections[0].id !== 'preamble') {
          sections.unshift({
            id: 'preamble',
            title: '',
            level: 0,
            content: [],
            lineStart: 0
          });
        }
        if (sections[0]) {
          sections[0].content.push(line);
        }
      }
    });
    
    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return { sections, toc, metadata: {} };
  }, [agent?.definition]);

  /**
   * Render markdown content as HTML-like structure
   */
  const renderMarkdownContent = (content) => {
    return content.map((line, index) => {
      // Headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2];
        const HeaderTag = `h${Math.min(level + 1, 6)}`; // Offset by 1 since we have page title as h1
        
        return (
          <div key={index} className={cn(
            'font-semibold mb-3 mt-6 first:mt-0',
            level === 1 && 'text-2xl text-gray-900 border-b pb-2',
            level === 2 && 'text-xl text-gray-800',
            level === 3 && 'text-lg text-gray-700',
            level >= 4 && 'text-base text-gray-700'
          )}>
            {title}
          </div>
        );
      }

      // Code blocks
      if (line.startsWith('```')) {
        const language = line.substring(3).trim();
        return (
          <div key={index} className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
            {language ? `Code (${language})` : 'Code Block'}
          </div>
        );
      }

      // Inline code
      const codeInlineRegex = /`([^`]+)`/g;
      if (codeInlineRegex.test(line)) {
        const parts = line.split(codeInlineRegex);
        return (
          <p key={index} className="mb-2 leading-relaxed">
            {parts.map((part, i) => 
              i % 2 === 1 ? (
                <code key={i} className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                  {part}
                </code>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        );
      }

      // Links
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      if (linkRegex.test(line)) {
        const parts = line.split(linkRegex);
        return (
          <p key={index} className="mb-2 leading-relaxed">
            {parts.map((part, i) => {
              if (i % 3 === 1) {
                // Link text
                return null;
              } else if (i % 3 === 2) {
                // Link URL
                const linkText = parts[i - 1];
                return (
                  <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                  >
                    {linkText}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              } else {
                return <span key={i}>{part}</span>;
              }
            })}
          </p>
        );
      }

      // List items
      if (line.match(/^[\s]*[-*+]\s+/)) {
        const content = line.replace(/^[\s]*[-*+]\s+/, '');
        return (
          <div key={index} className="flex items-start gap-2 mb-1 ml-4">
            <span className="text-gray-400 mt-2">•</span>
            <span className="leading-relaxed">{content}</span>
          </div>
        );
      }

      // Numbered lists
      if (line.match(/^[\s]*\d+\.\s+/)) {
        const match = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
        if (match) {
          return (
            <div key={index} className="flex items-start gap-2 mb-1 ml-4">
              <span className="text-gray-600 font-medium min-w-[1.5rem]">{match[1]}.</span>
              <span className="leading-relaxed">{match[2]}</span>
            </div>
          );
        }
      }

      // Empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }

      // Regular paragraphs
      return (
        <p key={index} className="mb-3 leading-relaxed text-gray-700">
          {line}
        </p>
      );
    });
  };

  /**
   * Copy content to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(agent.definition || '');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  /**
   * Download as file
   */
  const handleDownload = () => {
    const blob = new Blob([agent.definition || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.id || 'agent'}-definition.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!agent?.definition) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Definition Available
          </h3>
          <p className="text-gray-600">
            This agent doesn't have a markdown definition document.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Markdown Definition
          </Badge>
          {parsedContent.sections.length > 0 && (
            <span className="text-sm text-gray-600">
              {parsedContent.sections.length} sections
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-lg border">
            <Button
              variant={viewMode === 'rendered' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('rendered')}
              className="rounded-r-none"
            >
              <Eye className="w-4 h-4 mr-2" />
              Rendered
            </Button>
            <Button
              variant={viewMode === 'source' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('source')}
              className="rounded-l-none"
            >
              <Code className="w-4 h-4 mr-2" />
              Source
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            {copySuccess ? 'Copied!' : 'Copy'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table of Contents */}
        {parsedContent.toc.length > 0 && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Contents
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <nav className="space-y-1" data-testid="table-of-contents">
                  {parsedContent.toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={cn(
                        'block text-sm py-1 px-2 rounded hover:bg-gray-100 transition-colors',
                        item.level === 1 && 'font-medium text-gray-900',
                        item.level === 2 && 'text-gray-700 ml-2',
                        item.level >= 3 && 'text-gray-600 ml-4'
                      )}
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className={parsedContent.toc.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <Card>
            <CardContent className="p-6" data-testid="definition-content">
              {viewMode === 'rendered' ? (
                <div className="prose max-w-none" data-testid="markdown-rendered">
                  {parsedContent.sections.map((section) => (
                    <div key={section.id} id={section.id} className="scroll-mt-4">
                      {renderMarkdownContent(section.content)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4" data-testid="markdown-source">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {agent.definition}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Definition Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Definition Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">Word Count:</span>
              <p className="text-gray-600">
                {agent.definition?.split(/\s+/).length || 0} words
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Character Count:</span>
              <p className="text-gray-600">
                {agent.definition?.length || 0} characters
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Sections:</span>
              <p className="text-gray-600">
                {parsedContent.sections.length} sections
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Format:</span>
              <p className="text-gray-600">Markdown (.md)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentDefinition;