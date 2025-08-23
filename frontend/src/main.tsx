import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import WebSocket debug helper for development
if (import.meta.env.DEV) {
  import('./websocket-debug.js').then(() => {
    console.log('🔧 WebSocket Debug Helper loaded in development mode');
  }).catch(err => console.log('WebSocket debug helper not available'));
  
  // Also load the new connection debug utility
  import('./debug/connection-debug');
}
import { setupMockApi } from './services/mockApiService'

// Initialize mock API service for development
if (import.meta.env.DEV) {
  setupMockApi();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)