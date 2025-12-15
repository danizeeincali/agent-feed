import React, { useState } from 'react';
import { Checklist, ChecklistItem } from './Checklist';

/**
 * Example usage of the Checklist component
 * Demonstrates various features and use cases
 */
export const ChecklistExamples: React.FC = () => {
  // Basic checklist state
  const [basicItems, setBasicItems] = useState<ChecklistItem[]>([
    { id: '1', text: 'Complete project setup', checked: true },
    { id: '2', text: 'Write component documentation', checked: true },
    { id: '3', text: 'Add unit tests', checked: false },
    { id: '4', text: 'Code review', checked: false },
    { id: '5', text: 'Deploy to production', checked: false },
  ]);

  // Checklist with template variables
  const [templateItems] = useState<ChecklistItem[]>([
    {
      id: 't1',
      text: 'Review {{taskName}} for {{projectName}}',
      checked: false,
      metadata: {
        taskName: 'Pull Request #123',
        projectName: 'Agent Feed',
        description: 'Review and approve changes'
      }
    },
    {
      id: 't2',
      text: 'Deploy {{environment}} build version {{version}}',
      checked: false,
      metadata: {
        environment: 'production',
        version: 'v1.2.3',
        description: 'Ensure all tests pass before deployment'
      }
    },
  ]);

  // Read-only checklist
  const [readOnlyItems] = useState<ChecklistItem[]>([
    { id: 'r1', text: 'System health check', checked: true },
    { id: 'r2', text: 'Database backup', checked: true },
    { id: 'r3', text: 'Security audit', checked: true },
  ]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Checklist Component Examples
      </h1>
      <p className="text-gray-600 mb-8">
        Production-ready interactive checklists with API integration
      </p>

      {/* Example 1: Basic Interactive Checklist */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          1. Basic Interactive Checklist
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Full editing enabled with local state management
        </p>
        <Checklist
          items={basicItems}
          allowEdit={true}
          className="max-w-2xl"
        />
      </section>

      {/* Example 2: Checklist with API Integration */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          2. Checklist with API Integration
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          POST requests to API endpoint on toggle with loading states
        </p>
        <Checklist
          items={basicItems}
          allowEdit={true}
          onChange="/api/checklist/update"
          className="max-w-2xl"
        />
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            API Payload Example:
          </h3>
          <pre className="text-xs text-blue-800 overflow-x-auto">
{`{
  "itemId": "1",
  "checked": true,
  "item": {
    "id": "1",
    "text": "Complete project setup",
    "checked": true,
    "metadata": {}
  },
  "timestamp": "2025-10-05T12:00:00.000Z"
}`}
          </pre>
        </div>
      </section>

      {/* Example 3: Template Variables */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          3. Template Variables Support
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Dynamic text with {'{{variable}}'} syntax from metadata
        </p>
        <Checklist
          items={templateItems}
          allowEdit={true}
          onChange="/api/checklist/template-update"
          className="max-w-2xl"
        />
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-sm font-medium text-purple-900 mb-2">
            Template Syntax:
          </h3>
          <p className="text-xs text-purple-800">
            Use {'{{variableName}}'} in the text field and provide values in metadata object.
            Variables are automatically replaced at render time.
          </p>
        </div>
      </section>

      {/* Example 4: Read-Only Mode */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          4. Read-Only Mode
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Display-only checklist (allowEdit=false)
        </p>
        <Checklist
          items={readOnlyItems}
          allowEdit={false}
          className="max-w-2xl"
        />
      </section>

      {/* Example 5: Empty State */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          5. Empty State
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Graceful handling of empty checklist
        </p>
        <Checklist
          items={[]}
          allowEdit={true}
          className="max-w-2xl"
        />
      </section>

      {/* Features Overview */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Component Features
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Core Features:</h3>
            <ul className="space-y-1 text-gray-700">
              <li>✓ Full checkbox toggle functionality</li>
              <li>✓ API integration with POST requests</li>
              <li>✓ Template variable support</li>
              <li>✓ Keyboard navigation (Arrow keys, Home, End)</li>
              <li>✓ Mobile-responsive design</li>
              <li>✓ Progress tracking with visual bar</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Advanced Features:</h3>
            <ul className="space-y-1 text-gray-700">
              <li>✓ Optimistic updates with rollback</li>
              <li>✓ Loading states during API calls</li>
              <li>✓ Error handling with retry</li>
              <li>✓ Accessible ARIA labels</li>
              <li>✓ Read-only mode support</li>
              <li>✓ Empty state handling</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="bg-gray-50 rounded-lg border border-gray-300 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Keyboard Shortcuts
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-xs">
              Enter
            </kbd>
            <span className="text-gray-700">Toggle checkbox</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-xs">
              Space
            </kbd>
            <span className="text-gray-700">Toggle checkbox</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-xs">
              ↓
            </kbd>
            <span className="text-gray-700">Next item</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-xs">
              ↑
            </kbd>
            <span className="text-gray-700">Previous item</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-xs">
              Home
            </kbd>
            <span className="text-gray-700">First item</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-xs">
              End
            </kbd>
            <span className="text-gray-700">Last item</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ChecklistExamples;
