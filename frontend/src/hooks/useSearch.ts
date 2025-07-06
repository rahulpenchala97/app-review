import { useState, useEffect, useRef, useCallback } from 'react';
import appService, { App, AppSuggestion, SearchResponse } from '../services/apps';

interface UseSearchOptions {
  minQueryLength?: number;
  debounceMs?: number;
  enableSuggestions?: boolean;
  useAdvancedSearch?: boolean;
  minRank?: number;
  minSimilarity?: number;
  fuzzySearch?: boolean;
}

export const useSearch = (options: UseSearchOptions = {}) => {
  const {
    minQueryLength = 2,
    debounceMs = 300,
    enableSuggestions = true,
    useAdvancedSearch = true,
    minRank = 0.1,
    minSimilarity = 0.3,
    fuzzySearch = true
  } = options;

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<App[]>([]);
  const [suggestions, setSuggestions] = useState<AppSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<{
    searchType?: string;
    searchEngine?: string;
    count?: number;
  }>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Advanced search function using PostgreSQL full-text search
  const performSearch = useCallback(async (searchQuery: string, searchCategory: string = '', page: number = 1) => {
    setIsLoading(true);
    
    try {
      if (useAdvancedSearch && (searchQuery.trim() || searchCategory.trim())) {
        const response: SearchResponse = await appService.searchAppsAdvanced(
          searchQuery.trim(),
          {
            category: searchCategory.trim() || undefined,
            minRank,
            minSimilarity,
            fuzzy: fuzzySearch,
            page,
            pageSize
          }
        );

        setResults(response.results);
        setSearchMetadata({
          searchType: response.search_type,
          searchEngine: response.search_engine,
          count: response.count
        });
        setTotalCount(response.total_count || response.count);
        setTotalPages(response.total_pages || Math.ceil((response.total_count || response.count) / pageSize));
        setCurrentPage(response.current_page || page);
      } else if (!useAdvancedSearch && (searchQuery.trim() || searchCategory.trim())) {
        // Fallback to basic search
        const apps = await appService.searchApps(
          searchQuery.trim(), 
          searchCategory.trim() || undefined,
          page,
          pageSize
        );

        setResults(apps);
        setSearchMetadata({
          searchType: 'basic',
          searchEngine: 'django_basic',
          count: apps.length
        });
        // For basic search, we don't have proper pagination info, so estimate
        setTotalCount(apps.length);
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        setResults([]);
        setSearchMetadata({});
        setTotalCount(0);
        setTotalPages(0);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setSearchMetadata({});
      setTotalCount(0);
      setTotalPages(0);
      setCurrentPage(1);
    } finally {
      setIsLoading(false);
    }
  }, [useAdvancedSearch, minRank, minSimilarity, fuzzySearch, pageSize]);

  // Simple suggestions fetch
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!enableSuggestions || searchQuery.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    
    try {
      const suggestions = await appService.getSearchSuggestions(searchQuery);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [enableSuggestions, minQueryLength]);

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string, searchCategory: string = category) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1); // Reset to first page for new searches
      performSearch(searchQuery, searchCategory, 1);
    }, debounceMs);
  }, [performSearch, category, debounceMs]);

  // Debounced suggestions
  const debouncedSuggestions = useCallback((searchQuery: string) => {
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    suggestionsTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, debounceMs / 2); // Faster for suggestions
  }, [fetchSuggestions, debounceMs]);

  // Update query and trigger suggestions
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    debouncedSuggestions(newQuery);
  }, [debouncedSuggestions]);
  // Update category and trigger search
  const updateCategory = useCallback((newCategory: string) => {
    setCategory(newCategory);
    debouncedSearch(query, newCategory);
  }, [debouncedSearch, query]);

  // Trigger search manually
  const search = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    performSearch(query, category);
  }, [performSearch, query, category]);

  // Pagination methods
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    performSearch(query, category, page);
  }, [performSearch, query, category]);

  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    performSearch(query, category, 1);
  }, [performSearch, query, category]);

  // Clear all
  const clear = useCallback(() => {
    setQuery('');
    setCategory('');
    setSuggestions([]);
    setCurrentPage(1);
    setTotalCount(0);
    setTotalPages(0);
    performSearch('', '');
  }, [performSearch]);
  // Initialize search with specific values
  const initialize = useCallback((initialQuery: string = '', initialCategory: string = '') => {
    // Clear any pending timeouts first
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setQuery(initialQuery);
    setCategory(initialCategory);
    setCurrentPage(1); // Reset to first page on initialization
    setTotalCount(0);
    setTotalPages(0);

    // Perform search immediately without debouncing for initialization
    if (initialQuery.trim() || initialCategory.trim()) {
      performSearch(initialQuery, initialCategory, 1);
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
    };
  }, []);

  return {
    query,
    category,
    results,
    suggestions,
    isLoading,
    isLoadingSuggestions,
    searchMetadata,
    // Pagination state
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    // Methods
    updateQuery,
    updateCategory,
    search,
    clear,
    initialize,
    // Pagination methods
    goToPage,
    changePageSize
  };
};
