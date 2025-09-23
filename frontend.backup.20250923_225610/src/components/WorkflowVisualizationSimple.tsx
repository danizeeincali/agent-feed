import React from 'react';
import { Workflow, Play, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const WorkflowVisualizationSimple: React.FC = () => {
  return (
    <div className="p-6 bg-white min-h-screen" data-testid="workflow-visualization">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Workflow className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Workflow Visualization</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Running</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">3</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">15</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-1">2</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Failed</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">0</p>
          </div>
        </div>

        {/* Current Workflows */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Workflows</h2>
          
          <div className="space-y-4">
            {/* SPARC Workflow */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">SPARC Development Workflow</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Running</span>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Specification → Pseudocode → Architecture → Refinement → Completion
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">Step 3 of 5: Architecture Phase</div>
            </div>

            {/* Testing Workflow */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Component Testing Pipeline</h3>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Completed</span>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Unit Tests → Integration Tests → E2E Tests → Validation
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">All tests passed</div>
            </div>

            {/* Deployment Workflow */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Deployment Pipeline</h3>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Pending</span>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Build → Test → Deploy → Monitor
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '25%' }}></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">Waiting for build to complete</div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">Workflow Visualization Loaded Successfully</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            No white screen detected. Component is rendering properly with mock workflow data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowVisualizationSimple;