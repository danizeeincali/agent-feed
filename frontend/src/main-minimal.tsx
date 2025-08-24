import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// SPARC:Debug - Minimal main.tsx for white screen debugging
function MinimalApp() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🔍 SPARC:Debug - Application Loading
        </h1>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-700 mb-4">
            This is a minimal React application to test basic rendering.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">✅ React is working</p>
            <p className="text-sm text-gray-600">✅ CSS is loading</p>
            <p className="text-sm text-gray-600">✅ JavaScript is executing</p>
            <p className="text-sm text-gray-600">✅ No white screen detected</p>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-700">
              If you can see this, the white screen issue is likely caused by 
              TypeScript compilation errors in the main application components.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MinimalApp />
  </React.StrictMode>,
)