import { Check, Star, ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  isPremium?: boolean;
  isAdmin?: boolean;
}

export function VerifiedBadge({ size = 'sm', showTooltip = true, isPremium = false, isAdmin = false }: VerifiedBadgeProps) {
  const sizeConfig = {
    sm: { container: 'h-4 w-4', icon: 'h-2.5 w-2.5' },
    md: { container: 'h-5 w-5', icon: 'h-3 w-3' },
    lg: { container: 'h-6 w-6', icon: 'h-3.5 w-3.5' },
  };

  if (isAdmin) {
    // Gold shield badge for admin
    const badge = (
      <span 
        className={`${sizeConfig[size].container} inline-flex items-center justify-center rounded-full flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg, #FFD700, #F59E0B)' }}
        aria-label="Admin Premium"
      >
        <ShieldCheck className={`${sizeConfig[size].icon} text-white stroke-[3]`} />
      </span>
    );

    if (!showTooltip) return badge;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{badge}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Permanent Admin Premium</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isPremium) {
    // Gold + Teal gradient star badge for premium
    const badge = (
      <span 
        className={`${sizeConfig[size].container} inline-flex items-center justify-center rounded-full flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg, #FFD700, #14B8A6)' }}
        aria-label="Premium"
      >
        <Star className={`${sizeConfig[size].icon} text-white stroke-[3] fill-white`} />
      </span>
    );

    if (!showTooltip) return badge;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{badge}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">YaatraBuddy Premium</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Blue Instagram-style verified badge (admin approved)
  const badge = (
    <span 
      className={`${sizeConfig[size].container} inline-flex items-center justify-center rounded-full bg-[#0095F6] flex-shrink-0`}
      aria-label="Verified"
    >
      <Check className={`${sizeConfig[size].icon} text-white stroke-[3]`} />
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Verified User</p>
      </TooltipContent>
    </Tooltip>
  );
}
