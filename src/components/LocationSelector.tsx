import { useState, useMemo } from 'react';
import { Check, ChevronDown, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useLocations, type Location } from '@/hooks/useLocations';
import { Skeleton } from '@/components/ui/skeleton';

interface LocationSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeLocation?: string;
  className?: string;
}

// Category icons
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Universities & Colleges':
      return '🎓';
    case 'Student Hostel & PG Zones':
      return '🏠';
    case 'Transport Hubs':
      return '🚉';
    case 'Residential & Society Zones':
      return '🏘️';
    case 'Malls & Commercial Areas':
      return '🛍️';
    case 'Major Landmarks & Offices':
      return '🏛️';
    default:
      return '📍';
  }
};

export function LocationSelector({
  value,
  onValueChange,
  placeholder = 'Select location',
  disabled = false,
  excludeLocation,
  className,
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const { locations, groupedLocations, loading, CATEGORY_ORDER } = useLocations();

  // Find the selected location object
  const selectedLocation = useMemo(() => {
    return locations.find(loc => loc.name === value);
  }, [locations, value]);

  // Filter out excluded location
  const filteredGroups = useMemo(() => {
    if (!excludeLocation) return groupedLocations;
    
    const filtered: typeof groupedLocations = {};
    Object.entries(groupedLocations).forEach(([category, locs]) => {
      const filteredLocs = locs.filter(loc => loc.name !== excludeLocation);
      if (filteredLocs.length > 0) {
        filtered[category] = filteredLocs;
      }
    });
    return filtered;
  }, [groupedLocations, excludeLocation]);

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedLocation ? (
              <>
                <span>{getCategoryIcon(selectedLocation.category)}</span>
                <span className="truncate">{selectedLocation.name}</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>{placeholder}</span>
              </>
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 bg-popover z-50" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search locations..." className="h-10" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No location found.</CommandEmpty>
            {CATEGORY_ORDER.map((category) => {
              const categoryLocations = filteredGroups[category];
              if (!categoryLocations || categoryLocations.length === 0) return null;
              
              return (
                <CommandGroup 
                  key={category} 
                  heading={
                    <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span>{getCategoryIcon(category)}</span>
                      {category}
                    </span>
                  }
                >
                  {categoryLocations.map((location) => (
                    <CommandItem
                      key={location.id}
                      value={location.name}
                      onSelect={() => {
                        onValueChange(location.name);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === location.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{location.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
