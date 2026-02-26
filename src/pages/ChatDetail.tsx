import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportUserModal } from '@/components/ReportUserModal';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Send,
  Loader2,
  Clock,
  AlertCircle,
  MessageCircle,
  MoreVertical,
  Flag,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

interface PartnerProfile {
  full_name: string;
  avatar_url: string | null;
  is_verified?: boolean;
  is_premium?: boolean;
}

interface ConnectionData {
  id: string;
  partner_id: string;
  ride_id: string;
  expires_at: string;
  is_expired: boolean;
}

export default function ChatDetail() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [connection, setConnection] = useState<ConnectionData | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [rideCancelled, setRideCancelled] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch connection and partner data
  const fetchConnectionData = useCallback(async () => {
    if (!chatId || !user) return;

    try {
      const connections = await api.post<any[]>('/rpc/get_user_connections', { _user_id: user.id });
      const conn = Array.isArray(connections) ? connections.find((c: any) => c.id === chatId) : null;
      if (!conn) {
        toast({
          title: 'Chat not found',
          description: 'This chat does not exist or you do not have access.',
          variant: 'destructive',
        });
        navigate('/chats', { replace: true });
        return;
      }

      setConnection({
        id: conn.id,
        partner_id: conn.partner_id,
        ride_id: conn.ride_id,
        expires_at: conn.expires_at,
        is_expired: conn.is_expired,
      });

      const rideList = await api.get<any[]>('/data/rides', { params: { id: conn.ride_id } });
      const rideData = Array.isArray(rideList) && rideList[0] ? rideList[0] : null;
      if (rideData?.status === 'cancelled_by_admin') {
        setRideCancelled(true);
      }

      const profileData = await api.post<any[]>('/rpc/get_public_profile', { _user_id: conn.partner_id });
      const profilesList = await api.get<any[]>('/data/profiles', { params: { ids: conn.partner_id } });
      const premiumData = Array.isArray(profilesList) && profilesList[0] ? profilesList[0] : null;

      const partnerIsPremium = premiumData?.is_premium && 
        premiumData?.subscription_expiry && 
        new Date(premiumData.subscription_expiry) > new Date();

      const baseProfile = (Array.isArray(profileData) ? profileData[0] : null) || { full_name: 'Unknown User', avatar_url: null, is_verified: false };
      setPartnerProfile({
        ...baseProfile,
        is_premium: !!partnerIsPremium,
      });
    } catch (error) {
      console.error('Error fetching connection:', error);
      navigate('/chats', { replace: true });
    }
  }, [chatId, user, navigate, toast]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    try {
      const data = await api.get<ChatMessage[]>('/data/chat_messages', { params: { connection_id: chatId } });
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!chatId || !user) return;

    try {
      const list = await api.get<{ id: string; sender_id: string }[]>('/data/chat_messages', { params: { connection_id: chatId } });
      const toMark = (Array.isArray(list) ? list : []).filter((m) => m.sender_id !== user.id && !(m as any).read);
      await Promise.all(toMark.map((m) => api.patch(`/data/chat_messages/${m.id}`)));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [chatId, user]);

  // Calculate time remaining
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

  // Initialize data
  useEffect(() => {
    if (user && chatId) {
      fetchConnectionData();
    }
  }, [user, chatId, fetchConnectionData]);

  // Fetch messages after connection is loaded
  useEffect(() => {
    if (connection) {
      fetchMessages();
      markMessagesAsRead();
      setTimeRemaining(getTimeRemaining(connection.expires_at));
    }
  }, [connection, fetchMessages, markMessagesAsRead, getTimeRemaining]);

  // Update time remaining every minute
  useEffect(() => {
    if (!connection) return;

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(connection.expires_at));
    }, 60000);

    return () => clearInterval(interval);
  }, [connection, getTimeRemaining]);

  // Poll for new messages
  useEffect(() => {
    if (!chatId || !connection) return;
    const interval = setInterval(() => {
      fetchMessages();
      markMessagesAsRead();
    }, 8000);
    return () => clearInterval(interval);
  }, [chatId, connection, fetchMessages, markMessagesAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId || connection?.is_expired) return;

    setSending(true);
    try {
      await api.post('/data/chat_messages', {
        connection_id: chatId,
        message: newMessage.trim(),
      });
      setNewMessage('');
      inputRef.current?.focus();
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Failed to send message',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Handle block user
  const handleBlockUser = async () => {
    if (!user || !connection) return;

    setBlocking(true);
    try {
      await api.post('/data/user_reports', {
        reported_user_id: connection.partner_id,
        ride_id: connection.ride_id,
        reason: 'blocked',
        description: 'User blocked from chat',
      });

      toast({
        title: 'User blocked',
        description:
          'You will no longer receive messages from this user. Our team will review this action.',
      });

      navigate('/chats', { replace: true });
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to block user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBlocking(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/chats');
  };

  if (authLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isExpired = connection?.is_expired ?? false;
  const isChatDisabled = isExpired || rideCancelled;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header - Sticky Top Bar */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-sm">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Partner Info */}
        {loading || !partnerProfile ? (
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={partnerProfile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {partnerProfile.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-semibold text-foreground truncate">
                  {partnerProfile.full_name}
                </h1>
                {partnerProfile.is_premium ? (
                  <VerifiedBadge size="sm" isPremium />
                ) : partnerProfile.is_verified ? (
                  <VerifiedBadge size="sm" />
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {rideCancelled ? (
                  <span className="text-destructive font-medium">Ride Cancelled</span>
                ) : isExpired ? (
                  <span className="text-destructive font-medium">Expired</span>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Active</span>
                    <span className="text-muted-foreground">•</span>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{timeRemaining}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Badge & Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {!isChatDisabled && connection && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setShowReportModal(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleBlockUser}
                  disabled={blocking}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {blocking ? 'Blocking...' : 'Block User'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Admin Cancellation Banner */}
      {rideCancelled && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-destructive/10 border-b border-destructive/20">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">This ride was cancelled by YaatraBuddy</p>
            <p className="text-xs text-destructive/80">Chat has been closed. If you have any issues, feel free to reach out to us.</p>
          </div>
        </div>
      )}

      {/* Messages Area - Scrollable Middle Section */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 bg-muted/30"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rideCancelled ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <ShieldAlert className="h-16 w-16 text-destructive/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Ride Cancelled by YaatraBuddy
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              This ride was cancelled by the YaatraBuddy team. The chat is now closed. Contact support if you need help.
            </p>
          </div>
        ) : isExpired ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <AlertCircle className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Connection Expired
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              This chat has expired after 24 hours. Messages are no longer available.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageCircle className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Start the conversation
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Say hello to your travel partner!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card text-foreground rounded-bl-md border border-border'
                    }`}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">
                      {msg.message}
                    </p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isOwn
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area - Sticky Bottom Bar */}
      {!isChatDisabled && (
        <footer className="shrink-0 bg-card border-t border-border px-4 py-3 safe-area-inset-bottom">
          <form onSubmit={handleSend} className="flex gap-3 max-w-2xl mx-auto">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 h-11"
              disabled={sending}
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Messages disappear when connection expires
          </p>
        </footer>
      )}

      {/* Report Modal */}
      {connection && (
        <ReportUserModal
          open={showReportModal}
          onOpenChange={setShowReportModal}
          reportedUserId={connection.partner_id}
          reportedUserName={partnerProfile?.full_name || 'User'}
          rideId={connection.ride_id}
        />
      )}
    </div>
  );
}

