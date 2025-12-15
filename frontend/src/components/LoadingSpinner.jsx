import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    green: 'border-green-600'
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div 
        className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
      ></div>
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;