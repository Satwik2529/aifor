import React from 'react';

export const CardSkeleton = ({ lines = 2 }) => (
  <div className="card animate-pulse">
    <div className="flex items-center">
      <div className="h-8 w-8 bg-gray-200 rounded" />
      <div className="ml-4 flex-1">
        <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`h-5 ${i === 0 ? 'w-32' : 'w-24'} bg-gray-200 rounded ${i < lines - 1 ? 'mb-2' : ''}`} />
        ))}
      </div>
    </div>
  </div>
);

export const ListItemSkeleton = () => (
  <div className="flex items-center space-x-3 animate-pulse">
    <div className="h-5 w-5 bg-gray-200 rounded" />
    <div className="flex-1 min-w-0">
      <div className="h-3 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-2 w-24 bg-gray-200 rounded" />
    </div>
  </div>
);

export default { CardSkeleton, ListItemSkeleton };
