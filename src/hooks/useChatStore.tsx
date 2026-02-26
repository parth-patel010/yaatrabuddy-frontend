import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { api } from '@/api/client';
import { useAuth } from './useAuth';
import { useConnection } from './useConnection';

interface RideDetails {
  id: string;
  from_location: string;
  to_location: string;
  ride_date: string;
}

interface PartnerProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  is_verified?: boolean;
  is_premium?: boolean;
}

export interface ChatPreview {
  connectionId: string;
  partnerId: string;
  partnerProfile: PartnerProfile;
  rideDetails: RideDetails | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  expiresAt: string;
  isExpired: boolean;
  timeRemaining: string;
  connectedAt: string;
}

interface ChatStoreContextType {
  chatPreviews: ChatPreview[];
  loading: boolean;
  initialized: boolean;
  totalUnreadCount: number;
  refetch: () => void;
}

const ChatStoreContext = createContext<ChatStoreContextType | undefined>(undefined);

export function ChatStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeConnections, expiredConnections, loading: connectionsLoading } = useConnection();
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const lastConnectionIdsRef = useRef<string>('');
  const isFetchingRef = useRef(false);

  const getTimeRemaining = useCallback((expiresAt: string): string => {
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
  }, []);

  const fetchChatPreviews = useCallback(async (allConnections: typeof activeConnections) => {
    if (!user || allConnections.length === 0 || isFetchingRef.current) {
      if (!isFetchingRef.current) {
        setLoading(false);
        setInitialized(true);
      }
      return;
    }

    isFetchingRef.current = true;

    try {
      const previews: ChatPreview[] = await Promise.all(
        allConnections.map(async (conn) => {
          // Fetch partner profile
          const profileData = await api.post<any[]>('/rpc/get_public_profile', { _user_id: conn.partner_id });
          const profilesList = await api.get<any[]>('/data/profiles', { params: { ids: conn.partner_id } });
          const premiumData = Array.isArray(profilesList) && profilesList.length > 0 ? profilesList[0] : null;
          const partnerIsPremium =
            premiumData?.is_premium &&
            premiumData?.subscription_expiry &&
            new Date(premiumData.subscription_expiry) > new Date();

          const baseProfile = Array.isArray(profileData) ? profileData[0] : null;
          const partnerProfile: PartnerProfile = baseProfile ? {
            user_id: baseProfile.user_id,
            full_name: baseProfile.full_name,
            avatar_url: baseProfile.avatar_url,
            is_verified: baseProfile.is_verified,
            is_premium: !!partnerIsPremium,
          } : {
            user_id: conn.partner_id,
            full_name: 'Unknown User',
            avatar_url: null,
          };

          const rideList = await api.get<any[]>('/data/rides', { params: { id: conn.ride_id } });
          const rideData = Array.isArray(rideList) && rideList.length > 0 ? rideList[0] : null;

          const messagesList = await api.get<any[]>('/data/chat_messages', { params: { connection_id: conn.id } });
          const sorted = (messagesList || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const lastMsgData = sorted[0] || null;

          const unreadCount = (messagesList || []).filter((m: any) => !m.read && m.sender_id !== user?.id).length;
          const count = unreadCount;

          return {
            connectionId: conn.id,
            partnerId: conn.partner_id,
            partnerProfile,
            rideDetails: rideData,
            lastMessage: lastMsgData?.message || null,
            lastMessageTime: lastMsgData?.created_at || null,
            unreadCount: count || 0,
            expiresAt: conn.expires_at,
            isExpired: conn.is_expired,
            timeRemaining: getTimeRemaining(conn.expires_at),
            connectedAt: conn.created_at,
          };
        })
      );

      // Sort by last message time (most recent first), then by creation
      previews.sort((a, b) => {
        if (a.isExpired && !b.isExpired) return 1;
        if (!a.isExpired && b.isExpired) return -1;

        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });

      setChatPreviews(previews);
    } catch (error) {
      console.error('Error fetching chat previews:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
      isFetchingRef.current = false;
    }
  }, [user, getTimeRemaining]);

  // Prefetch chat previews when connections change
  useEffect(() => {
    if (connectionsLoading || !user) return;

    const allConnections = [...activeConnections, ...expiredConnections];
    const connectionIds = allConnections.map((c) => c.id).sort().join(',');

    // Only refetch if connections actually changed
    if (connectionIds !== lastConnectionIdsRef.current) {
      lastConnectionIdsRef.current = connectionIds;

      if (allConnections.length > 0) {
        setLoading(true);
        fetchChatPreviews(allConnections);
      } else {
        setChatPreviews([]);
        setLoading(false);
        setInitialized(true);
      }
    } else if (!initialized && allConnections.length === 0) {
      setLoading(false);
      setInitialized(true);
    }
  }, [activeConnections, expiredConnections, connectionsLoading, user, fetchChatPreviews, initialized]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) {
      setChatPreviews([]);
      setLoading(false);
      setInitialized(false);
      lastConnectionIdsRef.current = '';
    }
  }, [user]);

  // Polling: refetch chat previews periodically (replaces realtime subscription)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const allConnections = [...activeConnections, ...expiredConnections];
      if (allConnections.length > 0) fetchChatPreviews(allConnections);
    }, 10000);
    return () => clearInterval(interval);
  }, [user, activeConnections, expiredConnections, fetchChatPreviews]);

  // Update time remaining every minute
  useEffect(() => {
    if (chatPreviews.length === 0) return;

    const interval = setInterval(() => {
      setChatPreviews((prev) => {
        const updated = prev.map((chat) => ({
          ...chat,
          timeRemaining: getTimeRemaining(chat.expiresAt),
          isExpired: new Date(chat.expiresAt) <= new Date(),
        }));
        // Only update if something actually changed
        const hasChanges = updated.some(
          (u, i) => u.timeRemaining !== prev[i].timeRemaining || u.isExpired !== prev[i].isExpired
        );
        return hasChanges ? updated : prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [chatPreviews.length, getTimeRemaining]);

  const refetch = useCallback(() => {
    const allConnections = [...activeConnections, ...expiredConnections];
    if (allConnections.length > 0) {
      isFetchingRef.current = false; // Reset to allow refetch
      fetchChatPreviews(allConnections);
    }
  }, [activeConnections, expiredConnections, fetchChatPreviews]);

  const totalUnreadCount = useMemo(
    () => chatPreviews.filter((c) => !c.isExpired).reduce((sum, c) => sum + c.unreadCount, 0),
    [chatPreviews]
  );

  // Mark messages as read for a specific connection
  const markAsRead = useCallback((connectionId: string) => {
    setChatPreviews((prev) =>
      prev.map((chat) =>
        chat.connectionId === connectionId ? { ...chat, unreadCount: 0 } : chat
      )
    );
  }, []);

  const value = useMemo(
    () => ({
      chatPreviews,
      loading,
      initialized,
      totalUnreadCount,
      refetch,
      markAsRead,
    }),
    [chatPreviews, loading, initialized, totalUnreadCount, refetch, markAsRead]
  );

  return <ChatStoreContext.Provider value={value}>{children}</ChatStoreContext.Provider>;
}

export function useChatStore() {
  const context = useContext(ChatStoreContext);
  if (context === undefined) {
    throw new Error('useChatStore must be used within a ChatStoreProvider');
  }
  return context;
}
