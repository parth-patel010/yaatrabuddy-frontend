import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Clock, TrendingUp, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocations, type Location } from '@/hooks/useLocations';
import { useLocationSuggestions } from '@/hooks/useLocationSuggestions';

export interface LocationValue {
  id: string | null;
  text: string;
}

interface LocationInputProps {
  value: LocationValue;
  onValueChange: (value: LocationValue) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: 'from' | 'to';
  excludeLocationId?: string | null;
}

// Category icons for visual clarity
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Universities & Colleges': return '🎓';
    case 'Student Hostel & PG Zones': return '🏠';
    case 'Transport Hubs': return '🚉';
    case 'Residential & Society Zones': return '🏘️';
    case 'Malls & Commercial Areas': return '🛍️';
    case 'Major Landmarks & Offices': return '🏛️';
    default: return '📍';
  }
};

export function LocationInput({
  value,
  onValueChange,
  placeholder = 'Enter or select location',
  disabled = false,
  className,
  type = 'from',
  excludeLocationId,
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value.text);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Get predefined locations from database
  const { locations: predefinedLocations, loading: locationsLoading } = useLocations();
  
  // Get user-created location suggestions from rides
  const { getFilteredSuggestions } = useLocationSuggestions();

  // Sync external value changes
  useEffect(() => {
    setInputValue(value.text);
  }, [value.text]);

  // Filter predefined locations based on input
  const filteredPredefined = useMemo(() => {
    if (!inputValue || inputValue.length < 1) {
      return predefinedLocations
        .filter(loc => loc.id !== excludeLocationId)
        .slice(0, 10);
    }
    
    const lower = inputValue.toLowerCase().trim();
    return predefinedLocations
      .filter(loc => 
        loc.id !== excludeLocationId && 
        loc.name.toLowerCase().includes(lower)
      )
      .slice(0, 10);
  }, [predefinedLocations, inputValue, excludeLocationId]);

  // Get user-created suggestions (exclude predefined names)
  const userCreatedSuggestions = useMemo(() => {
    const suggestions = getFilteredSuggestions(inputValue, 5);
    const predefinedNames = new Set(
      predefinedLocations.map(l => l.name.toLowerCase())
    );
    return suggestions.filter(s => !predefinedNames.has(s.name.toLowerCase()));
  }, [inputValue, getFilteredSuggestions, predefinedLocations]);

  // Check if current input matches a predefined location exactly
  const matchingPredefined = useMemo(() => {
    const lower = inputValue.toLowerCase().trim();
    return predefinedLocations.find(
      loc => loc.name.toLowerCase() === lower
    );
  }, [inputValue, predefinedLocations]);

  // Combined suggestions list
  const allSuggestions = useMemo(() => {
    const items: Array<{
      type: 'predefined' | 'user-created' | 'custom';
      id: string | null;
      name: string;
      category?: string;
      count?: number;
    }> = [];

    // Add predefined locations first
    filteredPredefined.forEach(loc => {
      items.push({
        type: 'predefined',
        id: loc.id,
        name: loc.name,
        category: loc.category,
      });
    });

    // Add user-created locations
    userCreatedSuggestions.forEach(sug => {
      items.push({
        type: 'user-created',
        id: null,
        name: sug.name,
        count: sug.count,
      });
    });

    return items;
  }, [filteredPredefined, userCreatedSuggestions]);

  // Show "Add custom" option if input doesn't match any suggestion
  const showCustomOption = useMemo(() => {
    if (!inputValue.trim() || inputValue.trim().length < 3) return false;
    const lower = inputValue.toLowerCase().trim();
    const existsInSuggestions = allSuggestions.some(
      s => s.name.toLowerCase() === lower
    );
    return !existsInSuggestions;
  }, [inputValue, allSuggestions]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setFocusedIndex(-1);
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      const trimmed = inputValue.trim();
      if (trimmed !== value.text) {
        // Check if it matches a predefined location
        const match = predefinedLocations.find(
          loc => loc.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (match) {
          onValueChange({ id: match.id, text: match.name });
        } else if (trimmed) {
          onValueChange({ id: null, text: trimmed });
        }
      }
      setShowSuggestions(false);
    }, 150);
  };

  const handleSuggestionClick = (suggestion: { id: string | null; name: string }) => {
    setInputValue(suggestion.name);
    onValueChange({ id: suggestion.id, text: suggestion.name });
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleCustomClick = () => {
    const trimmed = inputValue.trim();
    onValueChange({ id: null, text: trimmed });
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = allSuggestions.length + (showCustomOption ? 1 : 0);
    
    if (!showSuggestions || totalItems === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = inputValue.trim();
        const match = predefinedLocations.find(
          loc => loc.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (match) {
          onValueChange({ id: match.id, text: match.name });
        } else if (trimmed) {
          onValueChange({ id: null, text: trimmed });
        }
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allSuggestions.length) {
          handleSuggestionClick(allSuggestions[focusedIndex]);
        } else if (showCustomOption && focusedIndex === allSuggestions.length) {
          handleCustomClick();
        } else {
          const trimmed = inputValue.trim();
          const match = predefinedLocations.find(
            loc => loc.name.toLowerCase() === trimmed.toLowerCase()
          );
          if (match) {
            onValueChange({ id: match.id, text: match.name });
          } else if (trimmed) {
            onValueChange({ id: null, text: trimmed });
          }
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin 
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            type === 'from' ? 'text-primary' : 'text-secondary'
          )} 
        />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-10", className)}
          autoComplete="off"
        />
        {value.id && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (allSuggestions.length > 0 || showCustomOption) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
        >
          {/* Predefined locations section */}
          {filteredPredefined.length > 0 && (
            <>
              <div className="p-1.5 border-b border-border bg-muted/30">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-2">
                  <MapPin className="h-3 w-3" />
                  Vadodara Locations
                </span>
              </div>
              <div className="max-h-[160px] overflow-y-auto">
                {filteredPredefined.map((loc, index) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSuggestionClick({ id: loc.id, name: loc.name })}
                    className={cn(
                      "w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors",
                      "hover:bg-accent focus:bg-accent focus:outline-none",
                      focusedIndex === index && "bg-accent"
                    )}
                  >
                    <span className="text-base shrink-0">{getCategoryIcon(loc.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{loc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{loc.category}</p>
                    </div>
                    {value.id === loc.id && (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* User-created locations section */}
          {userCreatedSuggestions.length > 0 && (
            <>
              <div className="p-1.5 border-b border-border bg-muted/30">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-2">
                  <TrendingUp className="h-3 w-3" />
                  Popular Custom Locations
                </span>
              </div>
              <div className="max-h-[120px] overflow-y-auto">
                {userCreatedSuggestions.map((sug, index) => {
                  const itemIndex = filteredPredefined.length + index;
                  return (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => handleSuggestionClick({ id: null, name: sug.name })}
                      className={cn(
                        "w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors",
                        "hover:bg-accent focus:bg-accent focus:outline-none",
                        focusedIndex === itemIndex && "bg-accent"
                      )}
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sug.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {sug.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Add custom location option */}
          {showCustomOption && (
            <>
              <div className="border-t border-border" />
              <button
                type="button"
                onClick={handleCustomClick}
                className={cn(
                  "w-full px-3 py-3 text-left flex items-center gap-3 transition-colors",
                  "hover:bg-accent focus:bg-accent focus:outline-none",
                  "text-primary",
                  focusedIndex === allSuggestions.length && "bg-accent"
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Use "{inputValue.trim()}"</p>
                  <p className="text-xs text-muted-foreground">Add as custom location</p>
                </div>
              </button>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {showSuggestions && 
       inputValue.length >= 2 && 
       allSuggestions.length === 0 && 
       !showCustomOption && 
       !locationsLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg p-3">
          <p className="text-sm text-muted-foreground text-center">
            Type at least 3 characters to add a custom location
          </p>
        </div>
      )}
    </div>
  );
}

// Simple text-only version for backward compatibility in search
export function LocationSearchInput({
  value,
  onValueChange,
  placeholder = 'Search location',
  disabled = false,
  className,
  type = 'from',
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: 'from' | 'to';
}) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const { locations: predefinedLocations } = useLocations();
  const { getFilteredSuggestions } = useLocationSuggestions();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter predefined locations
  const filteredPredefined = useMemo(() => {
    if (!inputValue || inputValue.length < 1) {
      return predefinedLocations.slice(0, 6);
    }
    const lower = inputValue.toLowerCase().trim();
    return predefinedLocations
      .filter(loc => loc.name.toLowerCase().includes(lower))
      .slice(0, 6);
  }, [predefinedLocations, inputValue]);

  // Get user-created suggestions
  const userCreatedSuggestions = useMemo(() => {
    const suggestions = getFilteredSuggestions(inputValue, 4);
    const predefinedNames = new Set(
      predefinedLocations.map(l => l.name.toLowerCase())
    );
    return suggestions.filter(s => !predefinedNames.has(s.name.toLowerCase()));
  }, [inputValue, getFilteredSuggestions, predefinedLocations]);

  const allSuggestions = useMemo(() => {
    return [
      ...filteredPredefined.map(l => ({ name: l.name, category: l.category })),
      ...userCreatedSuggestions.map(s => ({ name: s.name, category: undefined })),
    ];
  }, [filteredPredefined, userCreatedSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
    setFocusedIndex(-1);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (inputValue.trim() !== value) {
        onValueChange(inputValue.trim());
      }
      setShowSuggestions(false);
    }, 150);
  };

  const handleSuggestionClick = (name: string) => {
    setInputValue(name);
    onValueChange(name);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === 'Enter') {
        onValueChange(inputValue.trim());
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < allSuggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSuggestionClick(allSuggestions[focusedIndex].name);
        } else {
          onValueChange(inputValue.trim());
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin 
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
            type === 'from' ? 'text-primary' : 'text-secondary'
          )} 
        />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pl-10", className)}
          autoComplete="off"
        />
      </div>

      {showSuggestions && allSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
        >
          <div className="max-h-[240px] overflow-y-auto">
            {allSuggestions.map((sug, index) => (
              <button
                key={sug.name}
                type="button"
                onClick={() => handleSuggestionClick(sug.name)}
                className={cn(
                  "w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors",
                  "hover:bg-accent focus:bg-accent focus:outline-none",
                  focusedIndex === index && "bg-accent"
                )}
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{sug.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
