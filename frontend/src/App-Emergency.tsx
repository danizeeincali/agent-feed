import React from 'react';

// EMERGENCY APP: Minimal React app with no external dependencies
const EmergencyApp: React.FC = () => {
  console.log('EmergencyApp component rendering...');
  
  return (
    <div>
      <h1 style={{ color: 'red', fontSize: '24px', margin: '20px' }}>
        EMERGENCY MODE: React App Working!
      </h1>
      <p style={{ margin: '20px' }}>
        Timestamp: {new Date().toISOString()}
      </p>
      <p style={{ margin: '20px' }}>
        If you see this, React is working. The issue was in App.tsx imports.
      </p>
    </div>
  );
};

export default EmergencyApp;