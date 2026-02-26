import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatRoom } from './ChatRoom';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, Clock, Loader2 } from 'lucide-react';

interface PartnerProfile {
  full_name: string;
  avatar_url: string | null;
}

interface ChatButtonProps {
  rideRequestId: string;
  partnerId: string;
  partnerProfile?: PartnerProfile;
  variant?: 'default' | 'compact';
}

interface ConnectionData {
  id: string;
  user1_id: string;
  user2_id: string;
  ride_id: string;
  created_at: string;
  expires_at: string;
  status: string;
  is_expired: boolean;
}

export function ChatButton({
  rideRequestId,
  partnerId,
  partnerProfile,
  variant = 'default',
}: ChatButtonProps) {
  const [connection, setConnection] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fetchedProfile, setFetchedProfile] = useState<PartnerProfile | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (rideRequestId) {
      fetchConnection();
    }
  }, [rideRequestId]);

  useEffect(() => {
    if (connection && !connection.is_expired) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 8000);
      return () => clearInterval(interval);
    }
  }, [connection]);

  const fetchConnection = async () => {
    setLoading(true);
    try {
      const data = await api.post<any[]>('/rpc/get_connection_for_request', { _ride_request_id: rideRequestId });

      if (data && data.length > 0) {
        setConnection(data[0]);

        if (!partnerProfile) {
          const profileRows = await api.post<any[]>('/rpc/get_public_profile', { _user_id: partnerId });
          if (profileRows && profileRows.length > 0) {
            setFetchedProfile({
              full_name: profileRows[0].full_name,
              avatar_url: profileRows[0].avatar_url,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!connection || !user) return;

    try {
      const messagesList = await api.get<any[]>('/data/chat_messages', { connection_id: connection.id });
      const count = (messagesList || []).filter((m: any) => !m.read && m.sender_id !== user.id).length;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleOpenChat = () => {
    setChatOpen(true);
    setUnreadCount(0); // Reset unread count when opening chat
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!connection) {
    return null;
  }

  const profile = partnerProfile || fetchedProfile;

  if (connection.is_expired) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="text-muted-foreground"
      >
        <Clock className="h-4 w-4 mr-1" />
        Expired
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant === 'compact' ? 'outline' : 'default'}
        size="sm"
        onClick={handleOpenChat}
        className={`relative ${variant === 'default' ? 'bg-primary hover:bg-primary/90' : ''}`}
      >
        <MessageCircle className="h-4 w-4 mr-1" />
        Chat
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {profile && (
        <ChatRoom
          connectionId={connection.id}
          partnerId={partnerId}
          partnerProfile={profile}
          rideId={connection.ride_id}
          expiresAt={connection.expires_at}
          isExpired={connection.is_expired}
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
      )}
    </>
  );
}
