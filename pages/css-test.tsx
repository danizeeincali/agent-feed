import React from 'react';

export default function CSSTest() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Test Tailwind CSS Classes */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CSS Validation Test</h1>
          <p className="text-lg text-gray-600">Testing Tailwind CSS compilation and styling</p>
        </div>

        {/* Color Palette Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-500 text-white p-4 rounded text-center">Primary Blue</div>
            <div className="bg-green-500 text-white p-4 rounded text-center">Success Green</div>
            <div className="bg-red-500 text-white p-4 rounded text-center">Error Red</div>
            <div className="bg-yellow-500 text-white p-4 rounded text-center">Warning Yellow</div>
          </div>
        </div>

        {/* Typography Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Typography</h2>
          <h1 className="text-4xl font-bold mb-2">Heading 1</h1>
          <h2 className="text-3xl font-semibold mb-2">Heading 2</h2>
          <h3 className="text-2xl font-medium mb-2">Heading 3</h3>
          <p className="text-base text-gray-700 mb-2">Regular paragraph text with normal weight.</p>
          <p className="text-sm text-gray-500">Small text for captions and details.</p>
        </div>

        {/* Spacing Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Spacing</h2>
          <div className="space-y-4">
            <div className="p-2 bg-blue-100 rounded">Padding 2</div>
            <div className="p-4 bg-green-100 rounded">Padding 4</div>
            <div className="p-6 bg-yellow-100 rounded">Padding 6</div>
            <div className="p-8 bg-red-100 rounded">Padding 8</div>
          </div>
        </div>

        {/* Responsive Grid Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Responsive Grid</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-purple-100 p-4 rounded text-center">Item 1</div>
            <div className="bg-indigo-100 p-4 rounded text-center">Item 2</div>
            <div className="bg-pink-100 p-4 rounded text-center">Item 3</div>
            <div className="bg-teal-100 p-4 rounded text-center">Item 4</div>
            <div className="bg-orange-100 p-4 rounded text-center">Item 5</div>
            <div className="bg-cyan-100 p-4 rounded text-center">Item 6</div>
          </div>
        </div>

        {/* Button Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Interactive Elements</h2>
          <div className="space-x-4 mb-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors">
              Primary Button
            </button>
            <button className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded transition-colors">
              Secondary Button
            </button>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors">
              Danger Button
            </button>
          </div>
          <input
            type="text"
            placeholder="Test input field"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dark Mode Test */}
        <div className="bg-gray-900 text-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Dark Theme Test</h2>
          <p className="text-gray-300 mb-4">This section tests dark background styling.</p>
          <button className="bg-white text-gray-900 hover:bg-gray-100 px-4 py-2 rounded transition-colors">
            Light Button on Dark
          </button>
        </div>
      </div>
    </div>
  );
}