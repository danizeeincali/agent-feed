import React from 'react';
import Calendar from './Calendar';

/**
 * Calendar Component Examples
 *
 * These examples demonstrate the various modes and features
 * of the Calendar component for use in dynamic pages.
 */

export const CalendarExamples: React.FC = () => {
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
  ];

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar Component Examples</h1>
        <p className="text-gray-600">
          Production-ready calendar with multiple selection modes and event support
        </p>
      </div>

      {/* Single Date Selection */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Single Date Selection</h2>
          <p className="text-sm text-gray-600">Select a single date from the calendar</p>
        </div>
        <Calendar
          mode="single"
          selectedDate="2025-10-05"
          events={sampleEvents}
          onDateSelect="/api/calendar/select-single"
        />
      </section>

      {/* Multiple Date Selection */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Multiple Date Selection</h2>
          <p className="text-sm text-gray-600">Select multiple dates by clicking</p>
        </div>
        <Calendar
          mode="multiple"
          events={sampleEvents}
          onDateSelect="/api/calendar/select-multiple"
        />
      </section>

      {/* Date Range Selection */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Date Range Selection</h2>
          <p className="text-sm text-gray-600">Select a range by clicking start and end dates</p>
        </div>
        <Calendar
          mode="range"
          events={sampleEvents}
          onDateSelect="/api/calendar/select-range"
        />
      </section>

      {/* With Custom Styling */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Custom Styled Calendar</h2>
          <p className="text-sm text-gray-600">Calendar with custom className for additional styling</p>
        </div>
        <Calendar
          mode="single"
          events={sampleEvents}
          className="shadow-xl"
        />
      </section>

      {/* API Integration Example */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">API Integration</h2>
          <p className="text-sm text-gray-600 mb-4">
            When dates are selected, the component automatically calls the specified API endpoint
            with the selection data.
          </p>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Example API Payload (Single Mode):</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
{`{
  "mode": "single",
  "selectedDate": "2025-10-15"
}`}
            </pre>

            <h3 className="font-semibold text-gray-900 mb-2 mt-4">Example API Payload (Multiple Mode):</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
{`{
  "mode": "multiple",
  "selectedDates": [
    "2025-10-10",
    "2025-10-15",
    "2025-10-20"
  ]
}`}
            </pre>

            <h3 className="font-semibold text-gray-900 mb-2 mt-4">Example API Payload (Range Mode):</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
{`{
  "mode": "range",
  "from": "2025-10-10",
  "to": "2025-10-20"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Template Variable Example */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Template Variable Usage</h2>
          <p className="text-sm text-gray-600 mb-4">
            In dynamic pages, you can use template variables to populate the calendar:
          </p>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Example Template Configuration:</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
{`{
  "component": "Calendar",
  "props": {
    "mode": "{{calendar_mode}}",
    "selectedDate": "{{current_date}}",
    "events": "{{calendar_events}}",
    "onDateSelect": "{{api_endpoint}}"
  }
}`}
            </pre>

            <h3 className="font-semibold text-gray-900 mb-2 mt-4">Example Events Data Structure:</h3>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
{`{
  "calendar_events": [
    {
      "date": "2025-10-15",
      "title": "Event Title",
      "description": "Optional event description"
    }
  ]
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Accessibility Features */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Accessibility Features</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Full keyboard navigation support (Tab, Arrow keys, Enter, Space)</li>
            <li>ARIA labels for screen readers</li>
            <li>Event indicators with accessible descriptions</li>
            <li>High contrast mode support</li>
            <li>Focus visible indicators for keyboard users</li>
            <li>Touch-friendly targets for mobile devices (minimum 40x40px)</li>
          </ul>
        </div>
      </section>

      {/* Mobile Optimization */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Mobile Optimization</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Responsive layout adapts to screen size</li>
            <li>Touch-optimized tap targets</li>
            <li>Larger day cells on mobile (2.5rem vs 2.25rem)</li>
            <li>Smooth animations and transitions</li>
            <li>Optimal spacing for thumb navigation</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default CalendarExamples;
