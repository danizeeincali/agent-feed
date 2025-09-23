import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Agents component to avoid SSR issues
const Agents = dynamic(() => import('../frontend/src/pages/Agents'), {
  ssr: false
});

export default function AgentsPage() {
  return <Agents />;
}