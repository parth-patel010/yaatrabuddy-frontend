import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { usePremium } from '@/hooks/usePremium';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { 
  X, ChevronRight, ChevronDown, User, Car, Send, 
  HelpCircle, MessageSquare, LogOut, Shield, Crown,
  Gift
} from 'lucide-react';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [myAccountOpen, setMyAccountOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['drawer-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const data = await api.get<{ full_name: string; avatar_url: string | null }>('/data/profiles/me');
      return { full_name: data.full_name, avatar_url: data.avatar_url };
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [open]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    onClose();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const menuItems = [
    { icon: Crown, label: 'Premium', path: '/premium', highlight: !isPremium },
    { icon: HelpCircle, label: 'FAQ', path: '/faq' },
    { icon: MessageSquare, label: 'Contact Us', path: '/contact' },
  ];

  const accountSubItems = [
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Car, label: 'My Posted Rides', path: '/my-posted-rides' },
    { icon: Send, label: 'Requests Sent', path: '/ride-requests-sent' },
    { icon: Gift, label: 'Rewards', path: '/rewards' },
  ];

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 z-50 transition-opacity duration-260 md:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-[80%] max-w-[320px] bg-deep-teal z-50 shadow-2xl",
          "transform transition-transform duration-260 ease-out md:hidden",
          "rounded-l-[20px] flex flex-col text-cream font-poppins",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-cream"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>

        <button
          onClick={() => handleNavigate('/profile')}
          className="flex items-center gap-4 p-6 pt-8 border-b border-white/10 hover:bg-white/5 transition-colors text-left w-full"
        >
          <Avatar className="h-14 w-14 border-2 border-copper/30">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-copper/30 text-cream text-lg font-semibold">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            {isPremium && (
              <div className="flex items-center gap-1.5 text-sm font-medium text-copper-light">
                <Crown className="h-4 w-4" />
                <span>Premium</span>
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-cream/70" />
        </button>

        <nav className="flex-1 overflow-y-auto py-2">
          <div className="border-b border-white/10">
            <button
              onClick={() => setMyAccountOpen(!myAccountOpen)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors text-cream"
            >
              <span className="flex items-center gap-3 font-medium">
                <User className="h-5 w-5 text-cream/70" />
                My Account
              </span>
              <ChevronDown 
                className={cn(
                  "h-5 w-5 text-cream/70 transition-transform duration-150",
                  myAccountOpen && "rotate-180"
                )} 
              />
            </button>
            
            <div 
              className={cn(
                "overflow-hidden transition-all duration-150 ease-out",
                myAccountOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="bg-dark-teal/50 py-1">
                {accountSubItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center gap-3 px-10 py-3 hover:bg-white/5 transition-colors text-sm text-cream"
                  >
                    <item.icon className="h-4 w-4 text-copper" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/10 text-cream",
                item.highlight && "bg-copper/10"
              )}
            >
              <span className="flex items-center gap-3 font-medium">
                <item.icon className={cn("h-5 w-5", item.highlight ? "text-copper" : "text-cream/70")} />
                {item.label}
              </span>
              {item.highlight && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white copper-gradient">
                  Upgrade
                </span>
              )}
            </button>
          ))}

          {isAdmin && (
            <button
              onClick={() => handleNavigate('/admin')}
              className="w-full flex items-center gap-3 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/10 text-cream"
            >
              <Shield className="h-5 w-5 text-copper" />
              <span className="font-medium">Admin Panel</span>
            </button>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-cream hover:text-red-300 hover:bg-red-500/10 border-0"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}
