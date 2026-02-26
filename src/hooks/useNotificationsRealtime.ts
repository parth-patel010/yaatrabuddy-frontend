import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

/**
 * Polling: invalidates notification queries every 15s so the UI updates.
 * Replaces previous Supabase realtime subscription.
 */
export function useNotificationsRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count', user.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-bell', user.id] });
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.id, queryClient]);
}
