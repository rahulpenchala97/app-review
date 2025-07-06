import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import appService, { App } from '../services/apps';
import toast from 'react-hot-toast';

const HomePage: React.FC = () => {
  const [featuredApps, setFeaturedApps] = useState<App[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsData, categoriesData] = await Promise.all([
          appService.getApps(),
          appService.getCategories(),
        ]);
        
        // Get top 6 apps by average_rating for featured section
        const sortedApps = appsData
          .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
          .slice(0, 6);
        
        setFeaturedApps(sortedApps);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Discover & Review Amazing Apps
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Find the perfect apps for your needs and share your experiences with our community.
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/search"
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md text-lg font-medium transition-colors"
          >
            Search Apps
          </Link>
        </div>
      </section>

      {/* Featured Apps */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Apps</h2>
          <Link
            to="/search"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View all apps →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredApps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {app.name}
                  </h3>
                  <p className="text-sm text-gray-600">{app.developer}</p>
                  <p className="text-sm text-gray-500 mt-1">{app.category}</p>
                </div>
              </div>
              
              <p className="text-gray-700 mt-3 text-sm line-clamp-2">
                {app.description}
              </p>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm font-medium text-gray-900 ml-1">
                      {app.average_rating != null ? app.average_rating.toFixed(1) : '0.0'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    ({app.total_ratings} reviews)
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
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category}
              to={`/search?category=${encodeURIComponent(category)}`}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 text-center group"
            >
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                {category}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-100 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Platform Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary-600">
              {featuredApps.length}+
            </div>
            <div className="text-gray-600 mt-2">Apps Available</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">
              {featuredApps.reduce((sum, app) => sum + app.total_ratings, 0)}+
            </div>
            <div className="text-gray-600 mt-2">User Reviews</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">
              {categories.length}+
            </div>
            <div className="text-gray-600 mt-2">Categories</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
