import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import appService, { App, AppSuggestion } from '../services/apps';
import toast from 'react-hot-toast';


const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [apps, setApps] = useState<App[]>([]);
  const [suggestions, setSuggestions] = useState<AppSuggestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const loadAllApps = useCallback(async () => {
    setIsLoading(true);
    try {
      const appsData = await appService.getApps();
      setApps(appsData);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
      toast.error('Failed to load apps');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (searchQuery: string = query, searchCategory: string = category) => {
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      let appsData: App[] = [];
      
      if (searchQuery.trim()) {
        appsData = await appService.searchApps(searchQuery.trim());
      } else {
        appsData = await appService.getApps();
      }
      
      // Filter by category if selected
      if (searchCategory) {
        appsData = appsData.filter(app => 
          app.category.toLowerCase() === searchCategory.toLowerCase()
        );
      }
      
      setApps(appsData);
      
      // Update URL params
      const newParams = new URLSearchParams();
      if (searchQuery) newParams.set('q', searchQuery);
      if (searchCategory) newParams.set('category', searchCategory);
      setSearchParams(newParams);
      
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [query, category, setSearchParams]);

  // Debounced search function for suggestions
  const getSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length >= 2) {
      try {
        const suggestionsData = await appService.getSearchSuggestions(searchQuery);
        setSuggestions(suggestionsData);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    } else {
      setSuggestions([]);
    }
  }, []);

  const debouncedGetSuggestions = useCallback(
    (searchQuery: string) => {
      const handler = setTimeout(() => {
        getSuggestions(searchQuery);
      }, 300);
      return () => clearTimeout(handler);
    },
    [getSuggestions]
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await appService.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const initialQuery = searchParams.get('q') || '';
    const initialCategory = searchParams.get('category') || '';
    
    if (initialQuery || initialCategory) {
      handleSearch(initialQuery, initialCategory);
    } else {
      // Load all apps if no search params
      loadAllApps();
    }
  }, [searchParams, handleSearch, loadAllApps]);

  useEffect(() => {
    if (query) {
      debouncedGetSuggestions(query);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, debouncedGetSuggestions]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    handleSearch(query, newCategory);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setSearchParams({});
    loadAllApps();
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Apps</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <input
                type="text"
                placeholder="Search for apps..."
                value={query}
                onChange={handleQueryChange}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <Link
                      key={suggestion.id}
                      to={`/apps/${suggestion.id}`}
                      onClick={() => setShowSuggestions(false)}
                      className="block w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <div className="font-medium text-gray-900">{suggestion.name}</div>
                      <div className="text-sm text-gray-500">{suggestion.category}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            {/* Category Filter */}
            <select
              value={category}
              onChange={handleCategoryChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
            
            {(query || category) && (
              <button
                type="button"
                onClick={clearFilters}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLoading ? 'Searching...' : `Found ${apps.length} apps`}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No apps found matching your criteria</p>
            <p className="text-gray-400 mt-2">Try adjusting your search terms or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <div
                key={app.id}
                className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow p-4"
              >
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
