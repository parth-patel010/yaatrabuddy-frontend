import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { TealHeader } from '@/components/TealHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RateUserModal } from '@/components/RateUserModal';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore, ChatPreview } from '@/hooks/useChatStore';
import { useGroupChats, getTimeRemaining } from '@/hooks/useGroupChats';
import { submitRating, checkIfRated } from '@/hooks/useUserRating';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Clock, MapPin, ArrowRight, Inbox, Star, Users, Loader2 } from 'lucide-react';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export default function Chats() {
  const { user, loading: authLoading } = useAuth();
  const { chatPreviews, loading: chatsLoading, initialized: chatsInitialized } = useChatStore();
  const { groupChats, loading: groupsLoading, initialized: groupsInitialized } = useGroupChats();
  const navigate = useNavigate();

  if (authLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Filter out 1-to-1 chats that have a corresponding group chat for the same ride
  // (multi-seat rides should only show in group chats section)
  const groupRideIds = new Set(groupChats.map((g) => g.ride_id));
  const filteredChatPreviews = chatPreviews.filter((c) => !groupRideIds.has(c.rideDetails?.id || ''));

  const activeChats = filteredChatPreviews.filter((c) => !c.isExpired);
  const expiredChats = filteredChatPreviews.filter((c) => c.isExpired);

  const activeGroups = groupChats.filter((g) => !g.is_expired);
  const expiredGroups = groupChats.filter((g) => g.is_expired);

  const handleChatClick = (connectionId: string) => {
    navigate(`/chats/${connectionId}`);
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/group-chats/${groupId}`);
  };

  const showSkeleton = !chatsInitialized || !groupsInitialized || 
    ((chatsLoading || groupsLoading) && chatPreviews.length === 0 && groupChats.length === 0);

  const hasNoChats = filteredChatPreviews.length === 0 && groupChats.length === 0;

  return (
    <AppShell activeTab="chats" hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto h-full flex flex-col text-cream font-poppins antialiased overflow-hidden">
        <TealHeader title="YaatraBuddy" />

        <main className="flex-1 min-h-0 flex flex-col px-4 gap-4 overflow-y-auto overflow-x-hidden pb-24">
          <div className="flex items-center gap-3 mb-2 shrink-0">
            <div className="p-2 rounded-xl bg-copper/20">
              <MessageCircle className="h-5 w-5 text-copper" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Chats</h1>
              <p className="text-xs text-cream/70">Your travel partners</p>
            </div>
          </div>

      {showSkeleton ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-dark-teal border border-white/5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-white/10" />
                  <Skeleton className="h-3 w-48 bg-white/10" />
                </div>
                <Skeleton className="h-6 w-16 bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : hasNoChats ? (
        <div className="p-8 text-center rounded-xl bg-dark-teal border border-white/5">
          <Inbox className="h-16 w-16 text-cream/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No active chats yet</h3>
          <p className="text-sm text-cream/80">
            Once a ride request is approved, your chat will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Group Chats */}
          {activeGroups.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-cream/70 mb-2 flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                Group Rides ({activeGroups.length})
              </h2>
              <div className="space-y-2">
                {activeGroups.map((group) => (
                  <GroupChatCard key={group.id} group={group} onClick={() => handleGroupClick(group.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Active 1-to-1 Chats */}
          {activeChats.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-cream/70 mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                Direct Messages ({activeChats.length})
              </h2>
              <div className="space-y-2">
                {activeChats.map((chat) => (
                  <ChatPreviewCard key={chat.connectionId} chat={chat} onClick={() => handleChatClick(chat.connectionId)} />
                ))}
              </div>
            </div>
          )}

          {/* Expired Group Chats */}
          {expiredGroups.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-cream/70 mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-cream/50" />
                Expired Groups ({expiredGroups.length})
              </h2>
              <div className="space-y-2">
                {expiredGroups.map((group) => (
                  <GroupChatCard key={group.id} group={group} onClick={() => handleGroupClick(group.id)} expired />
                ))}
              </div>
            </div>
          )}

          {/* Expired 1-to-1 Chats */}
          {expiredChats.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-cream/70 mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-cream/50" />
                Expired ({expiredChats.length})
              </h2>
              <div className="space-y-2">
                {expiredChats.map((chat) => (
                  <ExpiredChatCard key={chat.connectionId} chat={chat} userId={user.id} onClick={() => handleChatClick(chat.connectionId)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
        </main>
      </div>
    </AppShell>
  );
}

interface GroupChatCardProps {
  group: {
    id: string;
    chat_name: string;
    member_count: number;
    expires_at: string;
    is_expired: boolean;
    created_at: string;
  };
  onClick: () => void;
  expired?: boolean;
}

function GroupChatCard({ group, onClick, expired }: GroupChatCardProps) {
  const timeRemaining = getTimeRemaining(group.expires_at);

  return (
    <div
      className={`p-4 rounded-xl bg-dark-teal border border-white/5 cursor-pointer transition-all hover:bg-dark-teal/80 hover:shadow-md ${
        expired ? 'opacity-70' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="h-12 w-12 rounded-full bg-copper/20 flex items-center justify-center">
            <Users className="h-6 w-6 text-copper" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white truncate text-sm">
              {group.chat_name}
            </h3>
          </div>

          <p className="text-xs text-cream/70 mt-0.5">
            {group.member_count} members
          </p>

          <p className="text-sm mt-1 text-green-400 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
            Group ride chat
          </p>
        </div>

        <div className="shrink-0">
          {expired ? (
            <span className="text-xs px-2 py-1 rounded-full border border-white/20 text-cream/70">
              Expired
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-copper/20 text-copper flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeRemaining}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChatPreviewCardProps {
  chat: ChatPreview;
  onClick: () => void;
}

function ChatPreviewCard({ chat, onClick }: ChatPreviewCardProps) {
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      className={`p-4 rounded-xl bg-dark-teal border border-white/5 cursor-pointer transition-all hover:bg-dark-teal/80 hover:shadow-md ${
        chat.isExpired ? 'opacity-70' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={chat.partnerProfile.avatar_url || undefined} />
            <AvatarFallback className="bg-copper/30 text-cream">
              {chat.partnerProfile.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {chat.unreadCount > 0 && !chat.isExpired && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-copper text-white text-xs font-bold rounded-full flex items-center justify-center">
              {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-white truncate">
                {chat.partnerProfile.full_name}
              </h3>
              {chat.partnerProfile.is_premium ? (
                <VerifiedBadge size="sm" isPremium />
              ) : chat.partnerProfile.is_verified ? (
                <VerifiedBadge size="sm" />
              ) : null}
            </div>
            <span className="text-xs text-cream/70 whitespace-nowrap">
              {formatTime(chat.lastMessageTime)}
            </span>
          </div>

          {chat.rideDetails && (
            <div className="flex items-center gap-1 text-xs text-cream/70 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{chat.rideDetails.from_location}</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="truncate">{chat.rideDetails.to_location}</span>
            </div>
          )}

          <p
            className={`text-sm mt-1 truncate ${
              chat.unreadCount > 0 && !chat.isExpired
                ? 'text-white font-medium'
                : 'text-cream/70'
            }`}
          >
            {chat.lastMessage || (
              <span className="flex items-center gap-1 text-green-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                Connected • Say hello!
              </span>
            )}
          </p>
        </div>

        <div className="shrink-0">
          {chat.isExpired ? (
            <span className="text-xs px-2 py-1 rounded-full border border-white/20 text-cream/70">
              Expired
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-copper/20 text-copper flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {chat.timeRemaining}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ExpiredChatCardProps {
  chat: ChatPreview;
  userId: string;
  onClick: () => void;
}

function ExpiredChatCard({ chat, userId, onClick }: ExpiredChatCardProps) {
  const [showRateModal, setShowRateModal] = useState(false);
  const [hasRated, setHasRated] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (chat.rideDetails?.id) {
      checkIfRated(userId, chat.partnerId, chat.rideDetails.id).then(setHasRated);
    }
  }, [chat.rideDetails?.id, userId, chat.partnerId]);

  const handleRateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRateModal(true);
  };

  const handleSubmitRating = async (rating: number) => {
    if (!chat.rideDetails?.id) return;

    const result = await submitRating(
      chat.rideDetails.id,
      userId,
      chat.partnerId,
      rating
    );

    if (result.success) {
      setHasRated(true);
      toast({
        title: 'Rating submitted',
        description: `You rated ${chat.partnerProfile.full_name} ${rating} star${rating !== 1 ? 's' : ''}.`,
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to submit rating',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      <div
        className="p-4 rounded-xl bg-dark-teal border border-white/5 cursor-pointer transition-all hover:bg-dark-teal/80 hover:shadow-md opacity-70"
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={chat.partnerProfile.avatar_url || undefined} />
              <AvatarFallback className="bg-copper/30 text-cream">
                {chat.partnerProfile.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-white truncate">
                {chat.partnerProfile.full_name}
              </h3>
              {chat.partnerProfile.is_premium ? (
                <VerifiedBadge size="sm" isPremium />
              ) : chat.partnerProfile.is_verified ? (
                <VerifiedBadge size="sm" />
              ) : null}
            </div>
              <span className="text-xs text-cream/70 whitespace-nowrap">
                {formatTime(chat.lastMessageTime)}
              </span>
            </div>

            {chat.rideDetails && (
              <div className="flex items-center gap-1 text-xs text-cream/70 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{chat.rideDetails.from_location}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span className="truncate">{chat.rideDetails.to_location}</span>
              </div>
            )}

            <div className="mt-2">
              {hasRated === null ? (
                <span className="text-xs text-cream/70">Loading...</span>
              ) : hasRated ? (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-green-400" />
                  Rated
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 border-white/20 text-cream hover:bg-white/10"
                  onClick={handleRateClick}
                >
                  <Star className="h-3 w-3" />
                  Rate User
                </Button>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <span className="text-xs px-2 py-1 rounded-full border border-white/20 text-cream/70">
              Expired
            </span>
          </div>
        </div>
      </div>

      <RateUserModal
        open={showRateModal}
        onOpenChange={setShowRateModal}
        partnerName={chat.partnerProfile.full_name}
        onSubmit={handleSubmitRating}
      />
    </>
  );
}
