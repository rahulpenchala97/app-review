import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '../hooks/useSearch';
import SearchBox from '../components/SearchBox';
import AppCard from '../components/AppCard';
import appService from '../services/apps';
import toast from 'react-hot-toast';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<string[]>([]);
  const initializedRef = useRef(false);
  
  const {
    query,
    category,
    results,
    suggestions,
    isLoading,
    isLoadingSuggestions,
    updateQuery,
    updateCategory,
    search,
    clear,
    initialize
  } = useSearch({
    minQueryLength: 2,
    debounceMs: 300,
    enableSuggestions: true
  });

  // Load categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await appService.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast.error('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  // Initialize from URL params on mount ONLY
  useEffect(() => {
    if (!initializedRef.current) {
      const urlQuery = searchParams.get('q') || '';
      const urlCategory = searchParams.get('category') || '';
      
      // Only initialize if there are actual URL parameters
      if (urlQuery || urlCategory) {
        initialize(urlQuery, urlCategory);
      }
      
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only once

  // Update URL when search state changes (but not during initialization)
  useEffect(() => {
    if (!initializedRef.current) return; // Skip during initialization
    
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      
      const newParams = params.toString();
      const currentParams = searchParams.toString();
      
      if (currentParams !== newParams) {
        setSearchParams(params, { replace: true });
      }
    }, 100); // Small delay to prevent rapid updates
    
    return () => clearTimeout(timer);
  }, [query, category, searchParams, setSearchParams]); // Keep dependencies but use ref to prevent initial updates

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateCategory(e.target.value);
  };

  const handleClear = () => {
    clear();
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Apps</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Search Box */}
          <SearchBox
            query={query}
            onQueryChange={updateQuery}
            onSubmit={search}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            className="md:col-span-3"
          />
          
          {/* Category Filter */}
          <select
            value={category}
            onChange={handleCategoryChange}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        {(query || category) && (
          <div className="mt-4">
            <button
              onClick={handleClear}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLoading ? 'Searching...' : `${results.length} apps found`}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : results.length === 0 && (query || category) ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No apps found</p>
            <p className="text-gray-400 mt-2">Try different search terms or filters</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Enter a search term or select a category to find apps</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
