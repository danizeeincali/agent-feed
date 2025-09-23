console.log('minimal.tsx: Starting...');

import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('minimal.tsx: React imported');

const App = () => {
  console.log('minimal.tsx: App component rendering');
  return React.createElement('div', {
    style: { padding: '20px', background: '#10b981', color: 'white' }
  }, '✅ React is working! Minimal app loaded successfully.');
};

console.log('minimal.tsx: Looking for root element...');
const root = document.getElementById('root');

if (root) {
  console.log('minimal.tsx: Root found, creating React root...');
  try {
    const reactRoot = ReactDOM.createRoot(root);
    console.log('minimal.tsx: Rendering app...');
    reactRoot.render(React.createElement(App));
    console.log('minimal.tsx: ✅ Render complete!');
  } catch (err) {
    console.error('minimal.tsx: Error during render:', err);
    root.innerHTML = `<div style="color: red;">Error: ${err}</div>`;
  }
} else {
  console.error('minimal.tsx: Root element not found!');
  document.body.innerHTML = '<div style="color: red;">Root element not found!</div>';
}

export default App;