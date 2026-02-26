import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  useGroupChatMessages,
  useGroupChatMembers,
  getTimeRemaining,
} from '@/hooks/useGroupChats';
import {
  ArrowLeft,
  Send,
  Loader2,
  Clock,
  AlertCircle,
  MessageCircle,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { VerifiedBadge } from '@/components/VerifiedBadge';

interface GroupChatData {
  id: string;
  ride_id: string;
  chat_name: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
}

export default function GroupChatDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [groupChat, setGroupChat] = useState<GroupChatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [rideCancelled, setRideCancelled] = useState(false);

  const { messages, loading: messagesLoading, sendMessage } = useGroupChatMessages(groupId);
  const { members, loading: membersLoading } = useGroupChatMembers(groupId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch group chat data
  const fetchGroupChat = useCallback(async () => {
    if (!groupId || !user) return;

    try {
      const data = await api.post<any[]>('/rpc/get_user_group_chats', { _user_id: user.id });
      const list = Array.isArray(data) ? data : [];
      const group = list.find((g: GroupChatData) => g.id === groupId);
      if (!group) {
        toast({
          title: 'Group not found',
          description: 'This group chat does not exist or you do not have access.',
          variant: 'destructive',
        });
        navigate('/chats', { replace: true });
        return;
      }

      setGroupChat(group);
      setTimeRemaining(getTimeRemaining(group.expires_at));

      const rideList = await api.get<any[]>('/data/rides', { params: { id: group.ride_id } });
      const rideData = Array.isArray(rideList) && rideList[0] ? rideList[0] : null;
      if (rideData?.status === 'cancelled_by_admin') {
        setRideCancelled(true);
      }
    } catch (error) {
      console.error('Error fetching group chat:', error);
      navigate('/chats', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [groupId, user, navigate, toast]);

  useEffect(() => {
    if (user && groupId) {
      fetchGroupChat();
    }
  }, [user, groupId, fetchGroupChat]);

  // Update time remaining every minute
  useEffect(() => {
    if (!groupChat) return;

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(groupChat.expires_at));
    }, 60000);

    return () => clearInterval(interval);
  }, [groupChat]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || groupChat?.is_expired) return;

    setSending(true);
    const success = await sendMessage(newMessage);
    
    if (success) {
      setNewMessage('');
      inputRef.current?.focus();
    } else {
      toast({
        title: 'Failed to send message',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
    setSending(false);
  };

  const handleBack = () => {
    navigate('/chats');
  };

  if (authLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isExpired = groupChat?.is_expired ?? false;
  const isChatDisabled = isExpired || rideCancelled;

  const memberMap = new Map(members.map((m) => [m.user_id, m]));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={handleBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {loading ? (
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-semibold text-foreground truncate text-sm">
                {groupChat?.chat_name}
              </h1>
              <div className="flex items-center gap-1.5 text-xs">
                {rideCancelled ? (
                  <span className="text-destructive font-medium">Ride Cancelled</span>
                ) : isExpired ? (
                  <span className="text-destructive font-medium">Expired</span>
                ) : (
                  <>
                    <span className="text-muted-foreground">
                      {members.length} members
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{timeRemaining}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Members Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Users className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Group Members ({members.length})</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-100px)] mt-4">
              <div className="space-y-3">
                {membersLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))
                ) : (
                  members.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">
                            {member.full_name}
                          </span>
                          {member.is_verified && <VerifiedBadge size="sm" />}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Joined {format(new Date(member.joined_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
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

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 bg-muted/30"
      >
        {loading || messagesLoading ? (
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
              Group Chat Expired
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              This group chat has expired. Messages are no longer available.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageCircle className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Start the group conversation
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Say hello to your travel partners!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              const sender = memberMap.get(msg.sender_id);
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwn && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={sender?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {sender?.full_name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-card text-foreground rounded-bl-md border border-border'
                      }`}
                    >
                      {!isOwn && sender && (
                        <p className="text-xs font-medium text-primary mb-1">
                          {sender.full_name}
                        </p>
                      )}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input Area */}
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
        </footer>
      )}
    </div>
  );
}

