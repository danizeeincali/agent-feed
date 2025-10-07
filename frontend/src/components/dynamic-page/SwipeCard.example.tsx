import React from 'react';
import SwipeCard, { SwipeCardData } from './SwipeCard';

/**
 * SwipeCard Component Example
 *
 * This example demonstrates various use cases of the SwipeCard component
 * including basic usage, API integration, and template variables.
 */

// Sample data with images
const sampleCards: SwipeCardData[] = [
  {
    id: 'card-1',
    image: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800',
    title: 'MacBook Pro 16"',
    description: 'Powerful laptop for development and creative work. Features M2 Max chip and stunning Retina display.',
    metadata: {
      category: 'Electronics',
      price: '$2,499',
      rating: '4.8/5',
    },
  },
  {
    id: 'card-2',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    title: 'Classic Wristwatch',
    description: 'Timeless design meets modern craftsmanship. Swiss movement with sapphire crystal.',
    metadata: {
      category: 'Accessories',
      price: '$899',
      brand: 'Luxury Brand',
    },
  },
  {
    id: 'card-3',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    title: 'Premium Headphones',
    description: 'Immersive audio experience with active noise cancellation. 30-hour battery life.',
    metadata: {
      category: 'Audio',
      price: '$349',
      wireless: 'Yes',
    },
  },
  {
    id: 'card-4',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    title: 'Running Shoes',
    description: 'High-performance running shoes with responsive cushioning and breathable mesh upper.',
    metadata: {
      category: 'Footwear',
      price: '$159',
      sizes: '7-13',
    },
  },
  {
    id: 'card-5',
    title: 'Smart Home Hub',
    description: 'Control all your smart devices from one central hub. Voice-activated with AI assistant.',
    metadata: {
      category: 'Smart Home',
      price: '$129',
      compatible: 'All major brands',
    },
  },
];

// Example 1: Basic usage with controls
export const BasicExample: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Basic SwipeCard Example</h1>
        <p className="text-gray-600 mb-8">
          Swipe left to dislike, right to like. Use arrow keys or click the buttons.
        </p>

        <SwipeCard
          cards={sampleCards}
          showControls={true}
        />
      </div>
    </div>
  );
};

// Example 2: With API integration
export const APIIntegrationExample: React.FC = () => {
  const handleSwipeLeftLog = () => {
    console.log('Card swiped left - API call would be made');
  };

  const handleSwipeRightLog = () => {
    console.log('Card swiped right - API call would be made');
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Integration Example</h1>
        <p className="text-gray-600 mb-8">
          Each swipe triggers an API call. Check the browser console for logs.
        </p>

        <SwipeCard
          cards={sampleCards}
          onSwipeLeft="/api/cards/dislike"
          onSwipeRight="/api/cards/like"
          showControls={true}
        />

        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">API Configuration</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Swipe Left:</strong> POST /api/cards/dislike
            </div>
            <div>
              <strong>Swipe Right:</strong> POST /api/cards/like
            </div>
            <div className="text-gray-600">
              Payload includes: cardId, title, description, metadata, timestamp
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example 3: Template variables in API endpoints
export const TemplateVariablesExample: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Template Variables Example</h1>
        <p className="text-gray-600 mb-8">
          API endpoints can use template variables like {'{{id}}'} and {'{{title}}'}
        </p>

        <SwipeCard
          cards={sampleCards}
          onSwipeLeft="/api/cards/{{id}}/reject"
          onSwipeRight="/api/cards/{{id}}/approve"
          showControls={true}
        />

        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Available Template Variables</h3>
          <div className="space-y-2 text-sm font-mono">
            <div>{'{{id}}'} - Card ID</div>
            <div>{'{{title}}'} - Card title</div>
            <div>{'{{description}}'} - Card description</div>
            <div>{'{{metadata}}'} - JSON stringified metadata</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Example 4: Without controls (gesture-only)
export const GestureOnlyExample: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gesture-Only Example</h1>
        <p className="text-gray-600 mb-8">
          No manual controls - swipe or use keyboard only
        </p>

        <SwipeCard
          cards={sampleCards}
          showControls={false}
        />
      </div>
    </div>
  );
};

// Example 5: Custom styling
export const CustomStyledExample: React.FC = () => {
  return (
    <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Custom Styled Example</h1>
        <p className="text-gray-600 mb-8">
          SwipeCard with custom background and styling
        </p>

        <SwipeCard
          cards={sampleCards}
          showControls={true}
          className="drop-shadow-2xl"
        />
      </div>
    </div>
  );
};

// Example 6: Empty state
export const EmptyStateExample: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Empty State Example</h1>
        <p className="text-gray-600 mb-8">
          Shows what happens when there are no cards
        </p>

        <SwipeCard
          cards={[]}
          showControls={true}
        />
      </div>
    </div>
  );
};

// Main demo component with tabs
export const SwipeCardDemo: React.FC = () => {
  const [activeExample, setActiveExample] = React.useState<
    'basic' | 'api' | 'template' | 'gesture' | 'styled' | 'empty'
  >('basic');

  const examples = {
    basic: <BasicExample />,
    api: <APIIntegrationExample />,
    template: <TemplateVariablesExample />,
    gesture: <GestureOnlyExample />,
    styled: <CustomStyledExample />,
    empty: <EmptyStateExample />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4 overflow-x-auto">
            {[
              { key: 'basic', label: 'Basic' },
              { key: 'api', label: 'API Integration' },
              { key: 'template', label: 'Template Vars' },
              { key: 'gesture', label: 'Gesture Only' },
              { key: 'styled', label: 'Custom Style' },
              { key: 'empty', label: 'Empty State' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveExample(key as any)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeExample === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Example */}
      <div>{examples[activeExample]}</div>
    </div>
  );
};

export default SwipeCardDemo;
