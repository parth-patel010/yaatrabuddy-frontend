import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportUserModal } from '@/components/ReportUserModal';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Clock, AlertCircle, MessageCircle, MoreVertical, Flag, Ban } from 'lucide-react';
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
}

interface ChatRoomProps {
  connectionId: string;
  partnerId: string;
  partnerProfile: PartnerProfile;
  rideId: string;
  expiresAt: string;
  isExpired: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatRoom({
  connectionId,
  partnerId,
  partnerProfile,
  rideId,
  expiresAt,
  isExpired,
  open,
  onOpenChange,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Mark messages as read when opening chat
  useEffect(() => {
    if (open && connectionId && user) {
      markMessagesAsRead();
    }
  }, [open, connectionId, user]);

  const markMessagesAsRead = async () => {
    if (!user) return;
    try {
      const list = await api.get<any[]>('/data/chat_messages', { connection_id: connectionId });
      const toMark = (Array.isArray(list) ? list : []).filter((m) => m.sender_id !== user.id && !m.read);
      await Promise.all(toMark.map((m) => api.patch(`/data/chat_messages/${m.id}`)));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!user || !rideId) return;

    setBlocking(true);
    try {
      await api.post('/data/user_reports', {
        reported_user_id: partnerId,
        ride_id: rideId,
        reason: 'blocked',
        description: 'User blocked from chat',
      });

      toast({
        title: 'User blocked',
        description: 'You will no longer receive messages from this user. Our team will review this action.',
      });

      onOpenChange(false);
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

  // Calculate time remaining
  const getTimeRemaining = () => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [open, expiresAt]);

  useEffect(() => {
    if (open && connectionId) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 8000);
      return () => clearInterval(interval);
    }
  }, [open, connectionId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await api.get<ChatMessage[]>('/data/chat_messages', { connection_id: connectionId });
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || isExpired) return;

    setSending(true);
    try {
      await api.post('/data/chat_messages', {
        connection_id: connectionId,
        message: newMessage.trim(),
      });
      setNewMessage('');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={partnerProfile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {partnerProfile.full_name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-base">{partnerProfile.full_name}</DialogTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{timeRemaining}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isExpired ? (
                <Badge variant="destructive" className="text-xs">
                  Expired
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              )}
              {!isExpired && rideId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
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
          </div>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">Connection Expired</p>
              <p className="text-sm text-muted-foreground mt-1">
                This chat has expired after 24 hours.
                <br />
                Messages are no longer available.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">Start the conversation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Say hello to your travel partner!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
        </ScrollArea>

        {/* Input */}
        {!isExpired && (
          <form onSubmit={handleSend} className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Messages disappear after connection expires
            </p>
          </form>
        )}

        {/* Report Modal */}
        {rideId && (
          <ReportUserModal
            open={showReportModal}
            onOpenChange={setShowReportModal}
            reportedUserId={partnerId}
            reportedUserName={partnerProfile.full_name}
            rideId={rideId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
