import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the main App component to avoid SSR issues
const App = dynamic(() => import('../frontend/src/App'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2">Loading AgentLink...</span>
    </div>
  )
});

export default function HomePage() {
  return <App />;
}