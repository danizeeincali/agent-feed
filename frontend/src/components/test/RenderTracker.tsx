import React, { useEffect, useRef } from 'react';

interface RenderTrackerProps {
  componentName: string;
  data?: any;
}

const RenderTracker: React.FC<RenderTrackerProps> = ({ componentName, data }) => {
  const renderCount = useRef(0);
  const lastDataRef = useRef(data);
  
  renderCount.current += 1;
  
  useEffect(() => {
    const dataChanged = JSON.stringify(data) !== JSON.stringify(lastDataRef.current);
    console.log(`🔄 SPARC RENDER: ${componentName} rendered ${renderCount.current} times`, {
      dataChanged,
      dataSize: typeof data === 'string' ? data.length : JSON.stringify(data || {}).length,
      timestamp: new Date().toISOString()
    });
    lastDataRef.current = data;
  });
  
  return (
    <div className="text-xs text-gray-400 opacity-50 fixed bottom-2 left-2 bg-black/50 text-white p-1 rounded">
      {componentName}: {renderCount.current} renders
    </div>
  );
};

export default RenderTracker;