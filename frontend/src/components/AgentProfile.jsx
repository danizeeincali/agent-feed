/**
 * AgentProfile - Display human-oriented agent descriptions and profiles
 * Phase 2: User-friendly agent information with capabilities and use cases
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Target,
  Zap,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Users,
  TrendingUp,
  Star,
  Book,
  Globe,
  Github
} from 'lucide-react';

const AgentProfile = ({ agent }) => {
  if (!agent) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Profile Available
          </h3>
          <p className="text-gray-600">
            Agent profile information is not available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const profile = agent.profile || {};
  const metadata = agent.metadata || {};

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purpose & Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Purpose & Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile.purpose ? (
                <p className="text-gray-700 leading-relaxed" data-testid="agent-purpose">
                  {profile.purpose}
                </p>
              ) : (
                <p className="text-gray-700 leading-relaxed" data-testid="agent-purpose">
                  {agent.description}
                </p>
              )}
              
              {agent.category && (
                <div className="flex items-center gap-2 pt-3 border-t">
                  <span className="text-sm font-medium text-gray-600">Category:</span>
                  <Badge variant="outline">{agent.category}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Agent Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4" data-testid="agent-statistics">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {agent.capabilities?.length || 0}
                </div>
                <div className="text-sm text-blue-700">Capabilities</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  v{agent.version || '1.0.0'}
                </div>
                <div className="text-sm text-green-700">Version</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {metadata.fileCount || 0}
                </div>
                <div className="text-sm text-purple-700">Files</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {metadata.languages?.length || 0}
                </div>
                <div className="text-sm text-orange-700">Languages</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Core Capabilities */}
      {profile.strengths && profile.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              Core Strengths
            </CardTitle>
            <CardDescription>
              Key areas where this agent excels and delivers exceptional performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="agent-strengths">
              {profile.strengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-green-800 font-medium">{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Use Cases */}
      {profile.useCases && profile.useCases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              Common Use Cases
            </CardTitle>
            <CardDescription>
              Practical scenarios where this agent can be effectively utilized
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="agent-use-cases">
              {profile.useCases.map((useCase, index) => (
                <div key={index} className="flex items-start gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <Star className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">{useCase}</h4>
                    <p className="text-sm text-blue-700">
                      Optimized workflow for {useCase.toLowerCase()} scenarios
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5 text-purple-600" />
              Technical Capabilities
            </CardTitle>
            <CardDescription>
              Specific technical skills and functionalities available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((capability, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {capability}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Programming Languages */}
      {metadata.languages && metadata.languages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5 text-gray-600" />
              Programming Languages
            </CardTitle>
            <CardDescription>
              Languages and technologies this agent can work with
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metadata.languages.map((language, index) => (
                <Badge key={index} variant="outline" className="px-3 py-1">
                  {language}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limitations & Considerations */}
      {profile.limitations && profile.limitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Limitations & Considerations
            </CardTitle>
            <CardDescription>
              Important considerations and current limitations to be aware of
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.limitations.map((limitation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="text-amber-800">{limitation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* External Links & Documentation */}
      {(metadata.repository || metadata.documentation) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              External Resources
            </CardTitle>
            <CardDescription>
              Additional documentation and resources for this agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {metadata.repository && (
                <Button variant="outline" asChild>
                  <a 
                    href={metadata.repository} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Github className="w-4 h-4" />
                    Repository
                  </a>
                </Button>
              )}
              
              {metadata.documentation && (
                <Button variant="outline" asChild>
                  <a 
                    href={metadata.documentation} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Book className="w-4 h-4" />
                    Documentation
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {metadata.author && (
              <div>
                <span className="font-medium text-gray-900">Author:</span>
                <p className="text-gray-600">{metadata.author}</p>
              </div>
            )}
            
            {metadata.license && (
              <div>
                <span className="font-medium text-gray-900">License:</span>
                <p className="text-gray-600">{metadata.license}</p>
              </div>
            )}
            
            {agent.createdAt && (
              <div>
                <span className="font-medium text-gray-900">Created:</span>
                <p className="text-gray-600">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </p>
              </div>
            )}
            
            {agent.updatedAt && (
              <div>
                <span className="font-medium text-gray-900">Last Updated:</span>
                <p className="text-gray-600">
                  {new Date(agent.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
            
            {metadata.lastActive && (
              <div>
                <span className="font-medium text-gray-900">Last Active:</span>
                <p className="text-gray-600">
                  {new Date(metadata.lastActive).toLocaleDateString()}
                </p>
              </div>
            )}
            
            {agent.size && (
              <div>
                <span className="font-medium text-gray-900">Total Size:</span>
                <p className="text-gray-600">
                  {(agent.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentProfile;