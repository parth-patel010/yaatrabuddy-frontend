import { memo, useState } from 'react';
import yaatraBuddyLogo from '@/assets/yaatrabuddy-logo.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20 md:h-24 md:w-24',
};

const textClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-xl',
  xl: 'text-2xl md:text-3xl',
};

// Memoized Logo component to prevent unnecessary re-renders
export const Logo = memo(function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {!imgError ? (
        <img
          src={yaatraBuddyLogo}
          alt="YaatraBuddy"
          className={`${sizeClasses[size]} rounded-xl object-cover shrink-0`}
          loading="eager"
          decoding="async"
          fetchpriority="high"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-xl bg-primary/20 flex items-center justify-center shrink-0`}>
          <span className="text-primary font-bold text-lg">YB</span>
        </div>
      )}
      {showText && (
        <span className={`${textClasses[size]} font-bold text-foreground`}>YaatraBuddy</span>
      )}
    </div>
  );
});

// Export the logo source for preloading
export const logoSrc = yaatraBuddyLogo;
