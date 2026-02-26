import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronDown, Check, ChevronRight, ArrowLeft, Edit3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocations } from '@/hooks/useLocations';

interface LocationDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  type?: 'from' | 'to';
  excludeLocation?: string;
  disabled?: boolean;
  /** Optional class for the trigger button (e.g. for Find page white box style) */
  triggerClassName?: string;
  /** Hide the built-in left MapPin icon when using an external icon (e.g. in Find page) */
  hideLeftIcon?: boolean;
}

type DropdownStep = 'closed' | 'main' | 'select-list' | 'manual-input';

export function LocationDropdown({
  value,
  onValueChange,
  placeholder = 'Select or enter location',
  type = 'from',
  excludeLocation,
  disabled = false,
  triggerClassName,
  hideLeftIcon = false,
}: LocationDropdownProps) {
  const [step, setStep] = useState<DropdownStep>('closed');
  const [manualInput, setManualInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { locations, groupedLocations, loading, CATEGORY_ORDER } = useLocations();

  // Focus input when manual step opens
  useEffect(() => {
    if (step === 'manual-input' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStep('closed');
        setManualInput('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out excluded location
  const filteredGrouped = (() => {
    const result: Record<string, typeof locations> = {};
    CATEGORY_ORDER.forEach(cat => {
      const locs = (groupedLocations[cat] || []).filter(
        loc => loc.name !== excludeLocation
      );
      if (locs.length > 0) {
        result[cat] = locs;
      }
    });
    return result;
  })();

  const handleSelectLocation = (locationName: string) => {
    onValueChange(locationName);
    setManualInput('');
    setStep('closed');
  };

  const handleManualSubmit = () => {
    const trimmed = manualInput.trim();
    if (trimmed.length >= 3) {
      onValueChange(trimmed);
      setManualInput('');
      setStep('closed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualSubmit();
    }
    if (e.key === 'Escape') {
      setStep('closed');
      setManualInput('');
    }
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    setStep(step === 'closed' ? 'main' : 'closed');
    setManualInput('');
  };

  const isManualValid = manualInput.trim().length >= 3;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          triggerClassName
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {!hideLeftIcon && (
            <MapPin className={cn("h-4 w-4 shrink-0", type === 'from' ? 'text-primary' : 'text-secondary')} />
          )}
          {value || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", step !== 'closed' && "rotate-180")} />
      </button>

      {/* Step 1: Main Menu - Two Options */}
      {step === 'main' && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setStep('select-list')}
            className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-accent transition-colors text-foreground"
          >
            <span className="flex items-center gap-3">
              <List className="h-4 w-4 shrink-0 text-foreground/80" />
              <span className="text-sm font-medium text-foreground">Select a location</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-foreground/70" />
          </button>
          
          {/* Divider */}
          <div className="flex items-center gap-3 px-4 py-2 border-t border-b border-border bg-muted/30">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-medium text-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          
          <button
            type="button"
            onClick={() => setStep('manual-input')}
            className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-accent transition-colors text-foreground"
          >
            <span className="flex items-center gap-3">
              <Edit3 className="h-4 w-4 shrink-0 text-foreground/80" />
              <span className="text-sm font-medium text-foreground">Enter a location manually</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-foreground/70" />
          </button>
        </div>
      )}

      {/* Step 2a: Full Location List */}
      {step === 'select-list' && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {/* Back button */}
          <button
            type="button"
            onClick={() => setStep('main')}
            className="w-full px-3 py-2 text-left flex items-center gap-2 border-b border-border bg-muted/50 hover:bg-muted transition-colors text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          <div className="max-h-[280px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-foreground">
                Loading locations...
              </div>
            ) : (
              Object.entries(filteredGrouped).map(([category, locs]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-foreground/80 bg-muted/50 sticky top-0">
                    {category}
                  </div>
                  {locs.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectLocation(loc.name)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm flex items-center justify-between text-foreground",
                        "hover:bg-accent focus:bg-accent focus:outline-none transition-colors",
                        value === loc.name && "bg-accent"
                      )}
                    >
                      <span className="truncate">{loc.name}</span>
                      {value === loc.name && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step 2b: Manual Input */}
      {step === 'manual-input' && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {/* Back button */}
          <button
            type="button"
            onClick={() => setStep('main')}
            className="w-full px-3 py-2 text-left flex items-center gap-2 border-b border-border bg-muted/50 hover:bg-muted transition-colors text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          <div className="p-3">
            <p className="text-xs text-foreground/90 mb-2">
              Enter your location (min 3 characters)
            </p>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. My Society, Near XYZ landmark"
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleManualSubmit}
                disabled={!isManualValid}
                variant="default"
              >
                Add
              </Button>
            </div>
            {manualInput.length > 0 && manualInput.length < 3 && (
              <p className="text-xs text-destructive mt-1.5">
                Min 3 characters required
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
