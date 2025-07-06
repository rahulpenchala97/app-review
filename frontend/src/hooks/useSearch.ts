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

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simple search function
  const performSearch = useCallback(async (searchQuery: string, searchCategory: string = '') => {
    setIsLoading(true);
    
    try {
      let apps: App[] = [];

      if (searchQuery.trim() || searchCategory.trim()) {
        console.log('Calling searchApps with:', { searchQuery, searchCategory });
        apps = await appService.searchApps(
          searchQuery.trim(), 
          searchCategory.trim() || undefined
        );
        console.log('Search results:', apps.length, 'apps');
      }

      setResults(apps);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    // Clear any pending timeouts first
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setQuery(initialQuery);
    setCategory(initialCategory);

    // Perform search immediately without debouncing for initialization
    if (initialQuery.trim() || initialCategory.trim()) {
      performSearch(initialQuery, initialCategory);
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
    updateQuery,
    updateCategory,
    search,
    clear,
    initialize
  };
};
