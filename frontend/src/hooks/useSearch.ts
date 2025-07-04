import { useState, useEffect, useRef, useCallback } from 'react';
import appService, { App, AppSuggestion } from '../services/apps';

interface UseSearchOptions {
  minQueryLength?: number;
  debounceMs?: number;
  enableSuggestions?: boolean;
}

export const useSearch = (options: UseSearchOptions = {}) => {
  const {
    minQueryLength = 2,
    debounceMs = 300,
    enableSuggestions = true
  } = options;

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<App[]>([]);
  const [suggestions, setSuggestions] = useState<AppSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Optimized search function
  const performSearch = useCallback(async (searchQuery: string, searchCategory: string = '') => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    
    try {
      let apps: App[] = [];

      // Use the unified search endpoint that handles both query and category
      if (searchQuery.trim() || searchCategory.trim()) {
        apps = await appService.searchApps(
          searchQuery.trim(), 
          searchCategory.trim() || undefined
        );
      }
      // If no query and no category, don't load anything (empty results)

      if (!controller.signal.aborted) {
        setResults(apps);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search failed:', error);
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Optimized suggestions fetch
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
      performSearch(searchQuery, searchCategory);
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

  // Clear all
  const clear = useCallback(() => {
    setQuery('');
    setCategory('');
    setSuggestions([]);
    performSearch('', '');
  }, [performSearch]);

  // Initialize search with specific values
  const initialize = useCallback((initialQuery: string = '', initialCategory: string = '') => {
    setQuery(initialQuery);
    setCategory(initialCategory);
    // Only perform search if there are actual search parameters
    if (initialQuery.trim() || initialCategory.trim()) {
      performSearch(initialQuery, initialCategory);
    } else {
      // Clear results and stop loading for empty search
      setResults([]);
      setIsLoading(false);
    }
  }, [performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
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
  };
};
