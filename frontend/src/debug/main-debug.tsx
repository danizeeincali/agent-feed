import React from 'react'
import ReactDOM from 'react-dom/client'
import SimpleTest from './SimpleTest'

console.log('Debug main starting...');

try {
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  console.log('Root created successfully');
  
  root.render(
    <React.StrictMode>
      <SimpleTest />
    </React.StrictMode>,
  );
  console.log('Component rendered');
} catch (error) {
  console.error('Error in debug main:', error);
}