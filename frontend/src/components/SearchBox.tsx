import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppSuggestion } from '../services/apps';

interface SearchBoxProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  suggestions: AppSuggestion[];
  isLoadingSuggestions: boolean;
  placeholder?: string;
  className?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  query,
  onQueryChange,
  onSubmit,
  suggestions,
  isLoadingSuggestions,
  placeholder = "Search for apps...",
  className = ""
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (suggestions.length > 0 && query.length >= 2) {
      setShowSuggestions(true);
      setFocusedIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          // Navigate to selected suggestion
          window.location.href = `/apps/${suggestions[focusedIndex].id}`;
        } else {
          onSubmit();
        }
        setShowSuggestions(false);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
    setShowSuggestions(false);
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          
          {isLoadingSuggestions && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="px-4 py-2 text-gray-500 text-sm">No suggestions found</div>
          ) : (
            suggestions.map((suggestion, index) => (
              <Link
                key={suggestion.id}
                to={`/apps/${suggestion.id}`}
                className={`block w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                  index === focusedIndex ? 'bg-primary-50' : ''
                }`}
                onMouseEnter={() => setFocusedIndex(index)}
                onClick={() => setShowSuggestions(false)}
              >
                <div className="font-medium text-gray-900">{suggestion.name}</div>
                <div className="text-sm text-gray-500">{suggestion.category}</div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
