import React, { useState } from 'react';
import Calendar from './Calendar';

/**
 * Interactive Calendar Demo
 *
 * This demo allows you to test the Calendar component
 * with different configurations and see real-time API calls
 */
const CalendarDemo: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'multiple' | 'range'>('single');
  const [apiEndpoint, setApiEndpoint] = useState('/api/calendar/select');
  const [enableApi, setEnableApi] = useState(false);

  // Sample events for demonstration
  const sampleEvents = [
    {
      date: '2025-10-10',
      title: 'Team Meeting',
      description: 'Weekly sync with development team',
    },
    {
      date: '2025-10-15',
      title: 'Product Launch',
      description: 'New feature release',
    },
    {
      date: '2025-10-15',
      title: 'Client Demo',
      description: 'Product demonstration for client',
    },
    {
      date: '2025-10-20',
      title: 'Sprint Review',
      description: 'End of sprint retrospective',
    },
    {
      date: '2025-10-25',
      title: 'All Hands Meeting',
      description: 'Company-wide meeting',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar Component Demo</h1>
          <p className="text-gray-600">
            Interactive demonstration of the production-ready Calendar component
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selection Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="single">Single Date</option>
                <option value="multiple">Multiple Dates</option>
                <option value="range">Date Range</option>
              </select>
            </div>

            {/* API Endpoint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Endpoint
              </label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="/api/calendar/select"
              />
            </div>

            {/* Enable API Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Integration
              </label>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableApi}
                    onChange={(e) => setEnableApi(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`block w-14 h-8 rounded-full transition-colors ${enableApi ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enableApi ? 'transform translate-x-6' : ''}`}></div>
                </div>
                <span className="ml-3 text-sm text-gray-700">
                  {enableApi ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          </div>

          {/* Configuration Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Current Configuration:</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
{JSON.stringify({
  mode,
  events: sampleEvents.length + ' events',
  onDateSelect: enableApi ? apiEndpoint : undefined,
}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Calendar Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Calendar */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Calendar</h2>
            <Calendar
              mode={mode}
              events={sampleEvents}
              onDateSelect={enableApi ? apiEndpoint : undefined}
            />
          </div>

          {/* Events List */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sample Events</h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-200">
                {sampleEvents.map((event, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                          <h3 className="font-medium text-gray-900">{event.title}</h3>
                        </div>
                        {event.description && (
                          <p className="mt-1 text-sm text-gray-600 ml-4">{event.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">{event.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Tips */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Usage Tips:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Dates with events show small dots below the date number</li>
                <li>• Click a date to select it (behavior varies by mode)</li>
                <li>• Selected dates are highlighted in blue</li>
                <li>• Event details appear when a date with events is selected</li>
                <li>• API calls are logged to the browser console</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Code Example</h2>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm">
{`import { Calendar } from '@/components/dynamic-page';

function MyComponent() {
  const events = [
    {
      date: '2025-10-15',
      title: 'Product Launch',
      description: 'New feature release'
    }
  ];

  return (
    <Calendar
      mode="${mode}"
      events={events}
      ${enableApi ? `onDateSelect="${apiEndpoint}"` : '// No API integration'}
    />
  );
}`}
          </pre>
        </div>

        {/* Features List */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Single, multiple, and range selection modes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Event display with visual indicators</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Automatic API callbacks on date selection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Full keyboard navigation support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>WCAG 2.1 AA accessibility compliant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Mobile-responsive with touch support</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Browser Support</h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-blue-600">🌐</span>
                <span>Chrome (last 2 versions)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-orange-600">🦊</span>
                <span>Firefox (last 2 versions)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">🧭</span>
                <span>Safari (last 2 versions)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">🪟</span>
                <span>Edge (last 2 versions)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">📱</span>
                <span>Mobile browsers (iOS & Android)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarDemo;
