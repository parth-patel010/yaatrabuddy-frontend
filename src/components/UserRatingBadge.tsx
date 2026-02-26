import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserRatingBadgeProps {
  averageRating: number;
  totalRides?: number;
  showRides?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function UserRatingBadge({
  averageRating,
  totalRides = 0,
  showRides = false,
  size = 'sm',
  className,
}: UserRatingBadgeProps) {
  const isNew = totalRides === 0;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  const starSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  };

  if (isNew) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-muted-foreground',
          sizeClasses[size],
          className
        )}
      >
        <Star className={cn(starSizeClasses[size], 'fill-yellow-400 text-yellow-400')} />
        <span>New User</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-foreground',
        sizeClasses[size],
        className
      )}
    >
      <Star className={cn(starSizeClasses[size], 'fill-yellow-400 text-yellow-400')} />
      <span className="font-medium">{averageRating.toFixed(1)}</span>
      {showRides && (
        <span className="text-muted-foreground">
          ({totalRides} ride{totalRides !== 1 ? 's' : ''})
        </span>
      )}
    </span>
  );
}
