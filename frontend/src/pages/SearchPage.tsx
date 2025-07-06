import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from '../hooks/useSearch';
import SearchBox from '../components/SearchBox';
import AppCard from '../components/AppCard';
import Pagination from '../components/Pagination';
import appService from '../services/apps';
import toast from 'react-hot-toast';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<string[]>([]);
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(true);
  const initializedRef = useRef(false);
  
  const {
    query,
    category,
    results,
    suggestions,
    isLoading,
    isLoadingSuggestions,
    searchMetadata,
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    updateQuery,
    updateCategory,
    search,
    clear,
    initialize,
    goToPage,
    changePageSize
  } = useSearch({
    minQueryLength: 2,
    debounceMs: 300,
    enableSuggestions: true,
    useAdvancedSearch: useAdvancedSearch,
    minRank: 0.1,
    minSimilarity: 0.3,
    fuzzySearch: true
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Search Apps</h1>

          {/* Advanced Search Toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Search Mode:</span>
            <label className="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={useAdvancedSearch}
                onChange={(e) => setUseAdvancedSearch(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {useAdvancedSearch ? '⚡ Advanced Search' : '📝 Basic Search'}
              </span>
              <div className="hidden group-hover:block absolute bg-gray-800 text-white text-xs rounded px-2 py-1 mt-8 z-10 max-w-xs">
                {useAdvancedSearch
                  ? 'Smart search with typo tolerance, relevance ranking, and intelligent matching'
                  : 'Simple keyword-based search'
                }
              </div>
            </label>
          </div>
        </div>
        
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLoading ? 'Searching...' : totalCount > 0 ? `${totalCount} apps found` : results.length > 0 ? `${results.length} apps found` : 'No apps found'}
          </h2>
        </div>

        {/* Search Results Info */}
        {searchMetadata.searchEngine && (query || category) && (
          <div className="mb-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-blue-700 font-medium">
                {useAdvancedSearch ? 'Advanced Search' : 'Basic Search'}
              </span>
              {searchMetadata.searchType && searchMetadata.searchType !== 'basic' && (
                <>
                  <span className="text-blue-500">•</span>
                  <span className="text-blue-600">
                    {searchMetadata.searchType === 'fulltext' ? 'Smart matching' :
                      searchMetadata.searchType === 'fuzzy' ? 'Typo-tolerant' :
                        searchMetadata.searchType === 'category_filter' ? 'Category filtered' :
                          'Standard search'}
                  </span>
                </>
              )}
            </div>
            {searchMetadata.searchType === 'fuzzy' && (
              <div className="mt-1 text-xs text-blue-600">
                Found results despite typos or variations in your search
              </div>
            )}
            {searchMetadata.searchType === 'fulltext' && (
              <div className="mt-1 text-xs text-blue-600">
                Results ranked by relevance and quality
              </div>
            )}
          </div>
        )}

        {/* Top Pagination */}
        {totalPages > 1 && !isLoading && (
          <div className="mb-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </div>
        )}

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

        {/* Bottom Pagination */}
        {totalPages > 1 && !isLoading && results.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
