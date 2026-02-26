import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { NotificationDetails } from './NotificationDetails';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  ride_id: string | null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use the SAME query key as TopBar for unread count — no duplicate subscription needed
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const list = await api.get<{ read: boolean }[]>('/data/notifications');
      return (list || []).filter((n) => !n.read).length;
    },
    enabled: !!user?.id,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-bell', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const data = await api.get<Notification[]>('/data/notifications');
      return (data || []).slice(0, 20).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user?.id && open,
  });

  const markAsRead = async (notificationId: string) => {
    await api.patch(`/data/notifications/${notificationId}`);
    queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications-bell', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || !user?.id) return;
    await api.patch('/data/notifications/read-all');
    queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications-bell', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setSelectedNotification(notification);
    setDetailsOpen(true);
    setOpen(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-primary';
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between border-b border-border p-3">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="h-80">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="mb-2 h-8 w-8 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className={`w-full text-left p-3 transition-colors hover:bg-accent/50 ${
                      !notification.read ? 'bg-accent/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${getTypeColor(notification.type)}`}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{notification.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <NotificationDetails
        notification={selectedNotification}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onActionComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['notifications-bell', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user?.id] });
        }}
      />
    </>
  );
}
