import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/api/client';
import { useAuth } from './useAuth';

interface GroupChat {
  id: string;
  ride_id: string;
  chat_name: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  member_count: number;
}

interface GroupChatMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  joined_at: string;
}

interface GroupChatMessage {
  id: string;
  group_chat_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface GroupChatPreview extends GroupChat {
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  timeRemaining: string;
}

export function useGroupChats() {
  const { user } = useAuth();
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchGroupChats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      const data = await api.post<any[]>('/rpc/get_user_group_chats', { _user_id: user.id });
      setGroupChats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching group chats:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [user]);

  useEffect(() => {
    fetchGroupChats();
  }, [fetchGroupChats]);

  // Reset on logout
  useEffect(() => {
    if (!user) {
      setGroupChats([]);
      setLoading(false);
      setInitialized(false);
    }
  }, [user]);

  const activeGroups = useMemo(
    () => groupChats.filter((g) => !g.is_expired),
    [groupChats]
  );

  const expiredGroups = useMemo(
    () => groupChats.filter((g) => g.is_expired),
    [groupChats]
  );

  return {
    groupChats,
    activeGroups,
    expiredGroups,
    loading,
    initialized,
    refetch: fetchGroupChats,
  };
}

export function useGroupChatMessages(groupChatId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!groupChatId) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.get<GroupChatMessage[]>('/data/group_chat_messages', { group_chat_id: groupChatId });
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching group messages:', error);
    } finally {
      setLoading(false);
    }
  }, [groupChatId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!groupChatId || !user) return;
    const interval = setInterval(fetchMessages, 8000);
    return () => clearInterval(interval);
  }, [groupChatId, user, fetchMessages]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!groupChatId || !user || !message.trim()) return false;

      try {
        await api.post('/data/group_chat_messages', {
          group_chat_id: groupChatId,
          message: message.trim(),
        });
        fetchMessages();
        return true;
      } catch (error) {
        console.error('Error sending group message:', error);
        return false;
      }
    },
    [groupChatId, user, fetchMessages]
  );

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
  };
}

export function useGroupChatMembers(groupChatId: string | undefined) {
  const [members, setMembers] = useState<GroupChatMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupChatId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        const data = await api.post<any[]>('/rpc/get_group_chat_members', { _group_chat_id: groupChatId });
        setMembers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching group members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [groupChatId]);

  return { members, loading };
}

// Helper to calculate time remaining
export function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
