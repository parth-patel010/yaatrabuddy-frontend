import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocations } from '@/hooks/useLocations';

interface DualLocationInputProps {
  label: string;
  dropdownValue: string;
  manualValue: string;
  onDropdownChange: (value: string) => void;
  onManualChange: (value: string) => void;
  type?: 'from' | 'to';
  excludeLocation?: string;
  error?: string;
}

export function DualLocationInput({
  label,
  dropdownValue,
  manualValue,
  onDropdownChange,
  onManualChange,
  type = 'from',
  excludeLocation,
  error,
}: DualLocationInputProps) {
  const { locations, groupedLocations, loading, CATEGORY_ORDER } = useLocations();

  // Filter out excluded location
  const filteredLocations = useMemo(() => {
    if (!excludeLocation) return locations;
    return locations.filter(loc => loc.name !== excludeLocation);
  }, [locations, excludeLocation]);

  // Group filtered locations
  const filteredGrouped = useMemo(() => {
    const grouped: Record<string, typeof locations> = {};
    CATEGORY_ORDER.forEach(cat => {
      grouped[cat] = [];
    });
    filteredLocations.forEach(loc => {
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
    return grouped;
  }, [filteredLocations, CATEGORY_ORDER]);

  // Determine if there's a conflict (both filled)
  const hasBothFilled = dropdownValue && manualValue.trim().length >= 3;
  const hasNeitherFilled = !dropdownValue && manualValue.trim().length < 3;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MapPin className={cn("h-4 w-4", type === 'from' ? 'text-primary' : 'text-secondary')} />
        {label} <span className="text-red-500">*</span>
      </Label>

      {/* Dropdown for predefined locations */}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Select a location</span>
        <Select 
          value={dropdownValue} 
          onValueChange={(val) => {
            onDropdownChange(val);
            // Clear manual when dropdown is selected
            if (val) {
              onManualChange('');
            }
          }}
          disabled={loading}
        >
          <SelectTrigger className={cn("w-full", manualValue.trim().length >= 3 && "opacity-50")}>
            <SelectValue placeholder={loading ? "Loading locations..." : "Choose from Vadodara locations"} />
          </SelectTrigger>
          <SelectContent className="bg-card z-50 max-h-[300px]">
            {/* Clear option */}
            <SelectItem value="__clear__" className="text-muted-foreground">
              -- Clear selection --
            </SelectItem>
            {Object.entries(filteredGrouped).map(([category, locs]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                  {category}
                </div>
                {locs.map((loc) => (
                  <SelectItem key={loc.id} value={loc.name}>
                    {loc.name}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Manual text input */}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Enter a location manually</span>
        <Input
          value={manualValue}
          onChange={(e) => {
            onManualChange(e.target.value);
            // Clear dropdown when typing
            if (e.target.value.trim()) {
              onDropdownChange('');
            }
          }}
          placeholder="e.g., My Society, Near XYZ landmark"
          className={cn(dropdownValue && "opacity-50")}
        />
        <p className="text-xs text-muted-foreground">
          Type any address, society name, or landmark (min 3 characters)
        </p>
      </div>

      {/* Validation messages */}
      {hasBothFilled && (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Please fill only one field. Clear one option.</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Helper to get final value
export function getFinalLocationValue(dropdown: string, manual: string): string | null {
  // Handle clear selection
  if (dropdown === '__clear__') {
    dropdown = '';
  }
  
  if (dropdown && dropdown !== '__clear__') {
    return dropdown;
  }
  if (manual.trim().length >= 3) {
    return manual.trim();
  }
  return null;
}
