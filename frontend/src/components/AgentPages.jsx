/**
 * AgentPages - Display dynamic pages and documentation links
 * Phase 2: Interactive page listing with preview and navigation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Globe,
  FileText,
  ExternalLink,
  Book,
  Download,
  Search,
  Eye,
  ArrowRight,
  Calendar,
  Clock,
  Bookmark
} from 'lucide-react';
import { cn } from '../lib/utils';

const AgentPages = ({ agent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!agent || !agent.pages || agent.pages.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Pages Available
          </h3>
          <p className="text-gray-600">
            This agent doesn't have any associated pages or documentation.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter pages based on search and category
  const filteredPages = agent.pages.filter(page => {
    const matchesSearch = !searchTerm || 
      page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Get page categories
  const categories = [...new Set(agent.pages.map(page => page.category || 'Documentation'))];

  /**
   * Get page icon based on type or title
   */
  const getPageIcon = (page) => {
    const title = page.title.toLowerCase();
    if (title.includes('getting started') || title.includes('quickstart')) {
      return <ArrowRight className="w-4 h-4 text-green-600" />;
    } else if (title.includes('api') || title.includes('reference')) {
      return <Book className="w-4 h-4 text-blue-600" />;
    } else if (title.includes('example') || title.includes('tutorial')) {
      return <Eye className="w-4 h-4 text-purple-600" />;
    } else if (title.includes('changelog') || title.includes('release')) {
      return <Calendar className="w-4 h-4 text-orange-600" />;
    } else {
      return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  /**
   * Get page type badge
   */
  const getPageTypeBadge = (page) => {
    const title = page.title.toLowerCase();
    if (title.includes('getting started')) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Getting Started</Badge>;
    } else if (title.includes('api')) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800">API Reference</Badge>;
    } else if (title.includes('example')) {
      return <Badge variant="default" className="bg-purple-100 text-purple-800">Examples</Badge>;
    } else if (title.includes('tutorial')) {
      return <Badge variant="default" className="bg-indigo-100 text-indigo-800">Tutorial</Badge>;
    } else if (title.includes('changelog')) {
      return <Badge variant="default" className="bg-orange-100 text-orange-800">Changelog</Badge>;
    } else {
      return <Badge variant="outline">Documentation</Badge>;
    }
  };

  /**
   * Handle page click
   */
  const handlePageClick = (page) => {
    if (page.path) {
      if (page.path.startsWith('http')) {
        window.open(page.path, '_blank', 'noopener,noreferrer');
      } else {
        // Internal navigation
        window.open(page.path, '_blank');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Agent Pages & Documentation
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredPages.length} of {agent.pages.length} pages available
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="quick-access-cards">
        {['Getting Started', 'API Reference', 'Examples', 'Changelog'].map((quickType) => {
          const quickPage = agent.pages.find(page => 
            page.title.toLowerCase().includes(quickType.toLowerCase())
          );
          
          return (
            <Card key={quickType} className={cn(
              'cursor-pointer transition-all duration-200',
              quickPage 
                ? 'hover:shadow-md hover:-translate-y-1 border-blue-200' 
                : 'opacity-50 cursor-not-allowed'
            )} onClick={() => quickPage && handlePageClick(quickPage)}>
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
                  {quickPage ? getPageIcon(quickPage) : <FileText className="w-4 h-4 text-gray-400" />}
                </div>
                <h3 className="font-medium text-sm">{quickType}</h3>
                {quickPage ? (
                  <p className="text-xs text-green-600 mt-1">Available</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Not available</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pages Grid */}
      {filteredPages.length === 0 ? (
        <div className="text-center py-8">
          <Search className="w-8 h-8 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No pages found</h3>
          <p className="text-gray-600 mt-2">
            Try adjusting your search terms to find more pages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="pages-grid">
          {filteredPages.map((page) => (
            <Card 
              key={page.id} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => handlePageClick(page)}
              data-testid="page-card"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getPageIcon(page)}
                    <div>
                      <CardTitle className="text-base">{page.title}</CardTitle>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  {getPageTypeBadge(page)}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {page.description && (
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    {page.description}
                  </p>
                )}
                
                {/* Page Metadata */}
                <div className="space-y-2 text-xs text-gray-500">
                  {page.path && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span className="truncate">{page.path}</span>
                    </div>
                  )}
                  
                  {page.lastModified && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Updated {new Date(page.lastModified).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {page.readTime && (
                    <div className="flex items-center gap-1">
                      <Book className="w-3 h-3" />
                      <span>{page.readTime} min read</span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 mt-4 border-t">
                  <Button size="sm" className="flex-1">
                    <Eye className="w-3 h-3 mr-2" />
                    View Page
                  </Button>
                  
                  {page.downloadable && (
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <Bookmark className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Additional Resources
          </CardTitle>
          <CardDescription>
            External links and resources related to this agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agent.metadata?.repository && (
              <a
                href={agent.metadata.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                  <Globe className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Source Repository</h4>
                  <p className="text-xs text-gray-600">View source code</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
              </a>
            )}
            
            {agent.metadata?.documentation && (
              <a
                href={agent.metadata.documentation}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <Book className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">Documentation</h4>
                  <p className="text-xs text-gray-600">Full documentation</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
              </a>
            )}
            
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <FileText className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Agent Definition</h4>
                <p className="text-xs text-gray-600">View agent markdown</p>
              </div>
              <span className="text-xs text-purple-600 ml-auto">Built-in</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentPages;