import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';

interface LocationSuggestion {
  name: string;
  count: number;
  type: 'from' | 'to' | 'both';
}

// Cache for suggestions to avoid repeated queries
let suggestionsCache: LocationSuggestion[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export function useLocationSuggestions() {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>(suggestionsCache);
  const [loading, setLoading] = useState(!suggestionsCache.length);

  const fetchSuggestions = useCallback(async () => {
    // Use cache if valid
    if (suggestionsCache.length && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setSuggestions(suggestionsCache);
      setLoading(false);
      return;
    }

    try {
      // Fetch all unique locations from rides
      const rides = await api.get<{ from_location: string; to_location: string }[]>('/data/rides');
      const ridesList = Array.isArray(rides) ? rides : [];

      const locationCounts = new Map<string, { from: number; to: number }>();

      ridesList.forEach((ride) => {
        // Count from locations
        const fromLower = ride.from_location.toLowerCase().trim();
        if (!locationCounts.has(fromLower)) {
          locationCounts.set(fromLower, { from: 0, to: 0 });
        }
        locationCounts.get(fromLower)!.from++;

        // Count to locations
        const toLower = ride.to_location.toLowerCase().trim();
        if (!locationCounts.has(toLower)) {
          locationCounts.set(toLower, { from: 0, to: 0 });
        }
        locationCounts.get(toLower)!.to++;
      });

      // Convert to array and sort by total count
      const suggestionList: LocationSuggestion[] = [];
      
      // Create a map to store original case versions
      const originalCaseMap = new Map<string, string>();
      ridesList.forEach((ride) => {
        const fromLower = ride.from_location.toLowerCase().trim();
        const toLower = ride.to_location.toLowerCase().trim();
        
        // Keep the first encountered version (or the most common one)
        if (!originalCaseMap.has(fromLower)) {
          originalCaseMap.set(fromLower, ride.from_location.trim());
        }
        if (!originalCaseMap.has(toLower)) {
          originalCaseMap.set(toLower, ride.to_location.trim());
        }
      });

      locationCounts.forEach((counts, lowerName) => {
        const originalName = originalCaseMap.get(lowerName) || lowerName;
        const totalCount = counts.from + counts.to;
        let type: 'from' | 'to' | 'both' = 'both';
        
        if (counts.from > 0 && counts.to === 0) type = 'from';
        else if (counts.to > 0 && counts.from === 0) type = 'to';

        suggestionList.push({
          name: originalName,
          count: totalCount,
          type,
        });
      });

      // Sort by count (most used first)
      suggestionList.sort((a, b) => b.count - a.count);

      // Update cache
      suggestionsCache = suggestionList;
      cacheTimestamp = Date.now();

      setSuggestions(suggestionList);
    } catch (err) {
      console.error('Error fetching location suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const getFilteredSuggestions = useCallback((query: string, limit = 8): LocationSuggestion[] => {
    if (!query || query.length < 2) return suggestions.slice(0, limit);
    
    const lowerQuery = query.toLowerCase().trim();
    
    return suggestions
      .filter((s) => s.name.toLowerCase().includes(lowerQuery))
      .slice(0, limit);
  }, [suggestions]);

  const refreshSuggestions = useCallback(() => {
    suggestionsCache = [];
    cacheTimestamp = 0;
    setLoading(true);
    fetchSuggestions();
  }, [fetchSuggestions]);

  return {
    suggestions,
    loading,
    getFilteredSuggestions,
    refreshSuggestions,
  };
}

// Export for admin analytics
export async function getLocationAnalytics(): Promise<{
  topFromLocations: { name: string; count: number }[];
  topToLocations: { name: string; count: number }[];
}> {
  try {
    const rides = await api.get<{ from_location: string; to_location: string }[]>('/data/rides');
    const ridesList = Array.isArray(rides) ? rides : [];

    const fromCounts = new Map<string, { name: string; count: number }>();
    const toCounts = new Map<string, { name: string; count: number }>();

    ridesList.forEach((ride) => {
      const fromKey = ride.from_location.toLowerCase().trim();
      const toKey = ride.to_location.toLowerCase().trim();

      if (!fromCounts.has(fromKey)) {
        fromCounts.set(fromKey, { name: ride.from_location.trim(), count: 0 });
      }
      fromCounts.get(fromKey)!.count++;

      if (!toCounts.has(toKey)) {
        toCounts.set(toKey, { name: ride.to_location.trim(), count: 0 });
      }
      toCounts.get(toKey)!.count++;
    });

    return {
      topFromLocations: Array.from(fromCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      topToLocations: Array.from(toCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
    };
  } catch (err) {
    console.error('Error fetching location analytics:', err);
    return { topFromLocations: [], topToLocations: [] };
  }
}
