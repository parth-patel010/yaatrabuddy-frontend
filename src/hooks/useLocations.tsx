import { useState, useEffect } from 'react';
import { api } from '@/api/client';

export interface Location {
  id: string;
  name: string;
  category: string;
  city: string;
  active: boolean;
  display_order: number;
}

export interface GroupedLocations {
  [category: string]: Location[];
}

// Category display order for consistent UI
const CATEGORY_ORDER = [
  'Universities & Colleges',
  'Student Hostel & PG Zones',
  'Transport Hubs',
  'Residential & Society Zones',
  'Malls & Commercial Areas',
  'Major Landmarks & Offices',
];

// Cache for locations to avoid repeated API calls
let locationsCache: Location[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useLocations(city: string = 'Vadodara') {
  const [locations, setLocations] = useState<Location[]>(locationsCache || []);
  const [groupedLocations, setGroupedLocations] = useState<GroupedLocations>({});
  const [loading, setLoading] = useState(!locationsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      // Use cache if valid
      if (locationsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
        setLocations(locationsCache);
        groupLocations(locationsCache);
        setLoading(false);
        return;
      }

      try {
        const data = await api.get<any[]>('/data/locations');
        const list = Array.isArray(data) ? data : [];
        const fetchedLocations = list
          .filter((l) => l.city === city && l.active !== false)
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        
        // Update cache
        locationsCache = fetchedLocations;
        cacheTimestamp = Date.now();
        
        setLocations(fetchedLocations);
        groupLocations(fetchedLocations);
      } catch (err) {
        console.error('Error fetching locations:', err);
        setError('Failed to load locations');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [city]);

  const groupLocations = (locs: Location[]) => {
    const grouped: GroupedLocations = {};
    
    // Initialize groups in display order
    CATEGORY_ORDER.forEach(cat => {
      grouped[cat] = [];
    });

    locs.forEach(loc => {
      if (!grouped[loc.category]) {
        grouped[loc.category] = [];
      }
      grouped[loc.category].push(loc);
    });

    // Remove empty categories
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    });

    setGroupedLocations(grouped);
  };

  const getLocationByName = (name: string): Location | undefined => {
    return locations.find(loc => loc.name === name);
  };

  const refreshLocations = () => {
    locationsCache = null;
    cacheTimestamp = 0;
    setLoading(true);
  };

  return {
    locations,
    groupedLocations,
    loading,
    error,
    getLocationByName,
    refreshLocations,
    CATEGORY_ORDER,
  };
}

// Export category order for admin use
export { CATEGORY_ORDER };
