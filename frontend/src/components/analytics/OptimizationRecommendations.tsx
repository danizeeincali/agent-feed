import React, { useState } from 'react';
import { 
  Lightbulb, 
  TrendingDown, 
  Clock, 
  Zap, 
  Database,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CostOptimization } from '../types/analytics';

interface OptimizationRecommendationsProps {
  className?: string;
  onImplement?: (optimization: CostOptimization) => void;
}

const OptimizationRecommendations: React.FC<OptimizationRecommendationsProps> = ({
  className,
  onImplement
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Mock recommendations data
  const recommendations: CostOptimization[] = [
    {
      id: '1',
      title: 'Implement Token Caching',
      description: 'Cache frequently used prompts and responses to reduce redundant API calls by up to 40%.',
      potentialSavings: 62.34,
      implementation: 'medium',
      priority: 'high',
      category: 'caching'
    },
    {
      id: '2',
      title: 'Optimize Prompt Length',
      description: 'Review and shorten prompts without losing functionality. Current avg: 1,247 tokens.',
      potentialSavings: 28.90,
      implementation: 'easy',
      priority: 'medium',
      category: 'tokens'
    },
    {
      id: '3',
      title: 'Batch Similar Requests',
      description: 'Group similar requests together to reduce overhead and improve efficiency.',
      potentialSavings: 45.12,
      implementation: 'hard',
      priority: 'high',
      category: 'requests'
    },
    {
      id: '4',
      title: 'Implement Request Throttling',
      description: 'Add intelligent rate limiting to prevent unnecessary rapid-fire requests.',
      potentialSavings: 34.78,
      implementation: 'medium',
      priority: 'medium',
      category: 'timing'
    },
    {
      id: '5',
      title: 'Use Lower-Cost Models',
      description: 'Switch to more cost-effective models for simple tasks that don\'t require premium features.',
      potentialSavings: 89.45,
      implementation: 'easy',
      priority: 'high',
      category: 'requests'
    },
    {
      id: '6',
      title: 'Optimize Response Parsing',
      description: 'Reduce token usage by requesting more structured, concise responses.',
      potentialSavings: 23.67,
      implementation: 'easy',
      priority: 'low',
      category: 'tokens'
    }
  ];

  const categories = [
    { value: 'all', label: 'All Categories', icon: BarChart3 },
    { value: 'tokens', label: 'Token Optimization', icon: Zap },
    { value: 'requests', label: 'Request Efficiency', icon: ArrowRight },
    { value: 'timing', label: 'Timing & Rate Limiting', icon: Clock },
    { value: 'caching', label: 'Caching & Storage', icon: Database }
  ];

  const filteredRecommendations = selectedCategory === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.category === selectedCategory);

  const totalPotentialSavings = filteredRecommendations.reduce(
    (sum, rec) => sum + rec.potentialSavings, 
    0
  );

  const getImplementationColor = (implementation: string) => {
    switch (implementation) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(cat => cat.value === category);
    return categoryData ? categoryData.icon : BarChart3;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Lightbulb className="w-7 h-7 mr-3 text-yellow-500" />
            Cost Optimization Recommendations
          </h2>
          <p className="text-gray-600 mt-1">
            AI-powered suggestions to reduce costs and improve efficiency
          </p>
        </div>
        
        <div className="mt-4 lg:mt-0 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${totalPotentialSavings.toFixed(2)}
            </div>
            <div className="text-sm text-blue-600">Potential Monthly Savings</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.value;
          
          return (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors',
                isSelected 
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.label}</span>
              {category.value !== 'all' && (
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {recommendations.filter(rec => rec.category === category.value).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRecommendations.map(recommendation => {
          const CategoryIcon = getCategoryIcon(recommendation.category);
          
          return (
            <div 
              key={recommendation.id} 
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CategoryIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {recommendation.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getPriorityColor(recommendation.priority)
                      )}>
                        {recommendation.priority} priority
                      </span>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getImplementationColor(recommendation.implementation)
                      )}>
                        {recommendation.implementation} to implement
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${recommendation.potentialSavings.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">monthly savings</div>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-gray-600 mb-4">
                {recommendation.description}
              </p>
              
              {/* Implementation Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-900">Expected Benefits</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Reduce monthly costs by ${recommendation.potentialSavings.toFixed(2)}</li>
                  <li>• Improve system efficiency and response times</li>
                  <li>• Better resource utilization</li>
                </ul>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  <span>Implementation: {recommendation.implementation}</span>
                </div>
                
                <Button
                  onClick={() => onImplement?.(recommendation)}
                  className="flex items-center space-x-2"
                  size="sm"
                >
                  <span>Implement</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Card */}
      {filteredRecommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {filteredRecommendations.length}
              </div>
              <div className="text-sm text-gray-600">Active Recommendations</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                ${totalPotentialSavings.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Total Potential Savings</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {Math.round(totalPotentialSavings / 156.78 * 100)}%
              </div>
              <div className="text-sm text-gray-600">Cost Reduction Potential</div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Button 
              onClick={() => filteredRecommendations.forEach(onImplement)}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Implement All High Priority
            </Button>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {filteredRecommendations.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations available</h3>
          <p className="text-gray-600">
            No optimization opportunities found for the selected category.
          </p>
        </div>
      )}
    </div>
  );
};

export default OptimizationRecommendations;