import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';

/**
 * Renders nothing; when mounted, subscribes to realtime notification changes
 * for the current user so all pages get instant updates (list + unread count).
 */
export function NotificationRealtimeSubscriber() {
  useNotificationsRealtime();
  return null;
}
