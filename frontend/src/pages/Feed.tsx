import React from 'react';
import RealSocialMediaFeed from '../components/RealSocialMediaFeed';
import RouteErrorBoundary from '../components/RouteErrorBoundary';

const FeedPage: React.FC = () => {
  return (
    <RouteErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <RealSocialMediaFeed />
        </div>
      </div>
    </RouteErrorBoundary>
  );
};

export default FeedPage;