import React from 'react';
import dynamic from 'next/dynamic';

// Import the React Router version of agents from App.tsx
const IsolatedRealAgentManager = dynamic(
  () => import('../frontend/src/components/IsolatedRealAgentManager'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading Agents...</span>
      </div>
    )
  }
);

export default function AgentsReactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <IsolatedRealAgentManager />
    </div>
  );
}