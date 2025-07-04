import React from 'react';
import { Link } from 'react-router-dom';
import { App } from '../services/apps';

interface AppCardProps {
  app: App;
  className?: string;
}

const AppCard: React.FC<AppCardProps> = ({ app, className = "" }) => {
  return (
    <div className={`border border-gray-200 rounded-lg hover:shadow-md transition-shadow p-4 ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {app.name}
          </h3>
          <p className="text-sm text-gray-600">{app.developer}</p>
          <p className="text-sm text-gray-500">{app.category}</p>
        </div>
      </div>
      
      <p className="text-gray-700 mt-3 text-sm line-clamp-3">
        {app.description}
      </p>
      
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="text-yellow-400">★</span>
            <span className="text-sm font-medium text-gray-900 ml-1">
              {app.average_rating != null ? app.average_rating.toFixed(1) : '0.0'}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {app.total_ratings} reviews
          </span>
        </div>
        
        <Link
          to={`/apps/${app.id}`}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default AppCard;
