/**
 * EMERGENCY MINIMAL APP - Production Validation Recovery
 * Minimal working interface to replace broken App.tsx if needed
 */

import React from 'react';

const EmergencyMinimalApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {/* Header */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="text-white text-2xl font-bold">AL</div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          AgentLink Emergency Interface
        </h1>

        <p className="text-gray-600 text-lg mb-8">
          The application is starting in emergency mode. Basic functionality is available.
        </p>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
            <div className="text-sm text-green-700 font-medium">React</div>
            <div className="text-xs text-green-600">Running</div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-2 animate-pulse"></div>
            <div className="text-sm text-yellow-700 font-medium">Components</div>
            <div className="text-xs text-yellow-600">Loading</div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
            <div className="text-sm text-blue-700 font-medium">Services</div>
            <div className="text-xs text-blue-600">Initializing</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Reload Application
          </button>

          <button
            onClick={() => localStorage.clear()}
            className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Clear Local Storage
          </button>

          <div className="text-xs text-gray-500 pt-4">
            Emergency Mode Active • {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Console for debugging */}
        <details className="mt-8 text-left">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800 text-sm">
            Debug Information
          </summary>
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs font-mono">
            <div>Location: {window.location.href}</div>
            <div>User Agent: {navigator.userAgent.substring(0, 80)}...</div>
            <div>Timestamp: {new Date().toISOString()}</div>
            <div>Local Storage Items: {localStorage.length}</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default EmergencyMinimalApp;