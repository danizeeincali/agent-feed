import React from 'react';

// Minimal test component to debug white screen issues
const SimpleTest: React.FC = () => {
  console.log('SimpleTest component rendering...');
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'red', color: 'white' }}>
      <h1>Simple Test Component</h1>
      <p>If you see this, React is working!</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
};

export default SimpleTest;