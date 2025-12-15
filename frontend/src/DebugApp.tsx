import React from 'react';

console.log('DebugApp: Starting to load...');

const DebugApp: React.FC = () => {
  console.log('DebugApp: Component function called');

  // Test 1: Can we render anything at all?
  try {
    return (
      <div style={{ padding: '20px', background: '#22c55e', color: 'white' }}>
        <h1>✅ Basic React Works!</h1>
        <p>If you see this GREEN box, React is rendering.</p>
        <hr />
        <div id="debug-info">
          <h2>Debug Information:</h2>
          <ul>
            <li>Time: {new Date().toLocaleTimeString()}</li>
            <li>React Version: {React.version}</li>
            <li>Window Location: {window.location.href}</li>
          </ul>
        </div>
      </div>
    );
  } catch (error) {
    console.error('DebugApp: Error in render:', error);
    return (
      <div style={{ padding: '20px', background: 'red', color: 'white' }}>
        Error: {String(error)}
      </div>
    );
  }
};

console.log('DebugApp: Component defined');

export default DebugApp;