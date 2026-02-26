import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function FloatingChatButton() {
  const { user } = useAuth();

  // Fetch unread message count from chat_messages
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-chat-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const connections = await api.get<{ id: string; user1_id: string; user2_id: string }[]>('/data/connections');
      const list = Array.isArray(connections) ? connections : [];
      const mine = list.filter((c) => c.user1_id === user.id || c.user2_id === user.id);
      if (!mine.length) return 0;
      let unread = 0;
      for (const c of mine) {
        const messages = await api.get<any[]>('/data/chat_messages', { connection_id: c.id });
        const msgs = Array.isArray(messages) ? messages : [];
        unread += msgs.filter((m) => m.sender_id !== user.id && !m.read).length;
      }
      return unread;
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  if (!user) return null;

  return (
    <Link
      to="/chats"
      className={cn(
        "fixed z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground",
        "flex items-center justify-center shadow-lg shadow-primary/30",
        "active:scale-90 transition-all duration-200",
        "hover:scale-110",
        "bottom-20 right-4"
      )}
      aria-label="Open chats"
    >
      <MessageCircle className="h-6 w-6" />
      
      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
