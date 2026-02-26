import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Bell, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const list = await api.get<{ read: boolean }[]>('/data/notifications');
      return (list || []).filter((n) => !n.read).length;
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="relative flex items-center justify-between h-14 px-4">
        <Logo size="sm" showText={false} />

        <span className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-foreground">
          YaatraBuddy
        </span>

        <div className="flex items-center gap-1">
          {/* Notifications */}
          <Link to="/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative active:scale-95 transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-fade-in" />
              )}
            </Button>
          </Link>

          {/* 3-dot menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9 active:scale-95 transition-all duration-200"
            aria-label="Open menu"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
