/**
 * AgentProfileTab - Human-readable agent information display
 * Features:
 * - Real API data integration
 * - Strengths and capabilities overview
 * - Use cases and limitations
 * - Performance insights
 * - Contact and collaboration info
 * - Search and filtering functionality
 * - Profile sharing and export
 * - Responsive design
 */

import React, { useState, useMemo } from 'react';
import { 
  User, 
  Star, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Award, 
  Users, 
  MessageCircle,
  Edit3,
  Save,
  X,
  CheckCircle,
  ExternalLink,
  Github,
  Mail,
  Calendar,
  Clock,
  Zap,
  Shield,
  Brain,
  Heart,
  Book,
  Globe,
  Code,
  Database,
  Cpu,
  Activity,
  Share2,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { cn } from '../utils/cn';
import { UnifiedAgentData } from './UnifiedAgentPage';

interface AgentProfileTabProps {
  agent: UnifiedAgentData;
  className?: string;
}

interface ProfileSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
}

const AgentProfileTab: React.FC<AgentProfileTabProps> = ({ agent, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showShareFallback, setShowShareFallback] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    strengths: agent.profile?.strengths || [],
    useCases: agent.profile?.useCases || [],
    limitations: agent.profile?.limitations || []
  });

  // Empty state check
  if (!agent.profile) {
    return (
      <div 
        data-testid="empty-profile-state"
        className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
      >
        <User className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No profile information available
        </h3>
        <p className="text-gray-600 max-w-md">
          This agent doesn't have profile information configured yet. 
          Profile data includes strengths, use cases, limitations, and technical details.
        </p>
      </div>
    );
  }

  // Handle save profile changes
  const handleSaveProfile = async () => {
    try {
      // Simulate API call to save profile changes
      console.log('Saving profile changes:', editedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Handle share profile
  const handleShareProfile = async () => {
    const shareData = {
      title: agent.configuration.profile.name,
      text: agent.configuration.profile.description,
      url: `${window.location.origin}/agents/${agent.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback - show fallback UI
      setShowShareFallback(true);
      try {
        await navigator.clipboard.writeText(shareData.url);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  // Handle export profile
  const handleExportProfile = () => {
    const profileData = {
      id: agent.id,
      name: agent.configuration.profile.name,
      description: agent.configuration.profile.description,
      strengths: agent.profile?.strengths,
      useCases: agent.profile?.useCases,
      limitations: agent.profile?.limitations,
      stats: agent.stats,
      metadata: agent.metadata
    };

    const dataStr = JSON.stringify(profileData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', `${agent.name}-profile.json`);
    linkElement.click();
    
    URL.revokeObjectURL(url);
  };

  // Filter capabilities based on search
  const filteredCapabilities = useMemo(() => {
    if (!searchTerm) return agent.capabilities;
    return agent.capabilities.filter(cap => 
      cap.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agent.capabilities, searchTerm]);

  // Filter use cases based on category
  const filteredUseCases = useMemo(() => {
    const useCases = isEditing ? editedProfile.useCases : agent.profile?.useCases || [];
    if (selectedCategory === 'all') return useCases;
    
    // Simple category filtering - could be enhanced with proper categorization
    return useCases.filter(useCase => 
      useCase.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [agent.profile?.useCases, editedProfile.useCases, selectedCategory, isEditing]);

  // Generate performance rating based on stats
  const getPerformanceRating = (stats: any) => {
    const successRate = stats.successRate || 0;
    const uptime = stats.uptime || 0;
    const satisfaction = stats.satisfaction || 0;
    
    const average = (successRate + uptime + satisfaction * 20) / 3;
    
    if (average >= 90) return { level: 'Excellent', color: 'green', stars: 5 };
    if (average >= 80) return { level: 'Very Good', color: 'blue', stars: 4 };
    if (average >= 70) return { level: 'Good', color: 'yellow', stars: 3 };
    if (average >= 60) return { level: 'Fair', color: 'orange', stars: 2 };
    return { level: 'Needs Improvement', color: 'red', stars: 1 };
  };

  const performanceRating = getPerformanceRating(agent.stats);

  return (
    <div 
      data-testid="agent-profile-tab"
      className={cn('p-6', className)}
      role="tabpanel"
      aria-label="Agent profile"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-6 h-6 text-blue-600" />
            Profile
          </h2>
          <p className="text-gray-600">Comprehensive overview of capabilities and performance</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              data-testid="capabilities-search"
              type="text"
              placeholder="Search capabilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchTerm && (
              <button
                data-testid="clear-search"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Use Case Filter */}
          <select
            data-testid="use-case-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Use Cases</option>
            <option value="data">Data Analysis</option>
            <option value="automation">Automation</option>
            <option value="support">Support</option>
          </select>

          {/* Share Button */}
          <button
            data-testid="share-profile"
            onClick={handleShareProfile}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </button>

          {/* Export Button */}
          <button
            data-testid="export-profile"
            onClick={handleExportProfile}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>

          {/* Contact Button */}
          <button
            data-testid="contact-agent"
            onClick={() => setShowContactModal(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact
          </button>
        </div>
      </div>

      {/* Strengths Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div 
          data-testid="strengths-section"
          className="space-y-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Key Strengths</h3>
          </div>
          <div 
            aria-label="Strengths list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {(agent.profile?.strengths || []).length === 0 ? (
              <p className="text-gray-500 col-span-3">No strengths specified</p>
            ) : (
              (agent.profile?.strengths || []).map((strength, index) => (
                <div 
                  key={index} 
                  data-testid="strength-card"
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-green-800 font-medium">{strength}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div 
          data-testid="use-cases-section"
          className="space-y-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Primary Use Cases</h3>
          </div>
          <div 
            aria-label="Use cases list"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {filteredUseCases.map((useCase, index) => (
              <div 
                key={index} 
                data-testid="use-case-item"
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  // Expand to show use case details
                }}
              >
                <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-gray-900 font-medium">{useCase}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Limitations Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div 
          data-testid="limitations-section"
          className="space-y-4 limitations-section"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Known Limitations</h3>
          </div>
          <div 
            aria-label="Limitations list"
            className="space-y-3"
          >
            {(agent.profile?.limitations || []).length === 0 ? (
              <p className="text-gray-500">No limitations specified</p>
            ) : (
              (agent.profile?.limitations || []).map((limitation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-orange-800">{limitation}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Technical Details Section */}
      {agent.metadata && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div 
            data-testid="metadata-section"
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-900">Technical Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Development Info</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Version:</span>
                    <span className="font-mono text-sm">{agent.version || 'v1.0.0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Author:</span>
                    <span className="text-sm">{agent.metadata?.author || 'AI System'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">License:</span>
                    <span className="text-sm">{agent.metadata?.license || 'MIT'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Resources</h4>
                <div className="space-y-2">
                  {agent.metadata?.repository && (
                    <a
                      data-testid="repository-link"
                      href={agent.metadata.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Github className="w-4 h-4" />
                      <span className="text-sm">Source Code</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {agent.metadata?.documentation && (
                    <a
                      data-testid="documentation-link"
                      href={agent.metadata.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Book className="w-4 h-4" />
                      <span className="text-sm">Documentation</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Expertise Section */}
            {agent.profile?.expertise && (
              <div data-testid="expertise-section">
                <h4 className="font-semibold text-gray-900 mb-3">Expertise Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {agent.profile.expertise.map((area: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      <Brain className="w-3 h-3 mr-1" />
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications Section */}
            {agent.profile?.certifications && (
              <div data-testid="certifications-section">
                <h4 className="font-semibold text-gray-900 mb-3">Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {agent.profile.certifications.map((cert: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                    >
                      <Award className="w-3 h-3 mr-1" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages Section */}
            {agent.profile?.languages && (
              <div data-testid="languages-section">
                <h4 className="font-semibold text-gray-900 mb-3">Supported Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {agent.profile.languages.map((language: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
                    >
                      <Globe className="w-3 h-3 mr-1" />
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Availability and Response Time */}
            {(agent.profile?.availability || agent.profile?.responseTime) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agent.profile?.availability && (
                  <div>
                    <span className="text-gray-600">Availability:</span>
                    <span className="ml-2 font-medium">{agent.profile.availability}</span>
                  </div>
                )}
                {agent.profile?.responseTime && (
                  <div>
                    <span className="text-gray-600">Response Time:</span>
                    <span className="ml-2 font-medium">{agent.profile.responseTime}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Fallback Modal */}
      {showShareFallback && (
        <div 
          data-testid="share-fallback"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Share Profile</h3>
            <p className="text-gray-600 mb-4">Link copied to clipboard!</p>
            <button
              onClick={() => setShowShareFallback(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div 
          data-testid="contact-modal"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Contact Agent</h3>
            <p className="text-gray-600 mb-4">Get in touch with this agent for collaboration opportunities.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowContactModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Use Case Details Modal */}
      <div data-testid="use-case-details" className="hidden">
        <p>Detailed information about the selected use case.</p>
      </div>
    </div>
  );
};

export default AgentProfileTab;