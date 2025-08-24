import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Simplified main.tsx - Remove problematic imports that cause white screen
// Removed: websocket-debug.js, connection-debug, mockApiService
// These were causing module resolution errors leading to white screen

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)