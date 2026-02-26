import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { PaymentModal } from '@/components/PaymentModal';
import { 
  ArrowLeft, Bell, CheckCircle2, XCircle, Wallet, 
  CreditCard, MessageCircle, Eye, X, AlertCircle,
  MapPin, Calendar, Clock, Users, Crown, IndianRupee, Shield, Loader2, Car
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'ride_accepted':
      return <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />;
    case 'ride_declined':
      return <XCircle className="h-6 w-6 text-destructive" />;
    case 'payment_success':
    case 'payment_confirmed':
      return <CreditCard className="h-6 w-6 text-primary" />;
    case 'wallet_refunded':
      return <Wallet className="h-6 w-6 text-amber-600 dark:text-amber-400" />;
    case 'new_request':
      return <Bell className="h-6 w-6 text-primary" />;
    default:
      return <Bell className="h-6 w-6 text-muted-foreground" />;
  }
};

const getStatusBadge = (type: string) => {
  switch (type) {
    case 'ride_accepted':
    case 'payment_success':
    case 'payment_confirmed':
      return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">Success</Badge>;
    case 'ride_declined':
      return <Badge variant="destructive">Declined</Badge>;
    case 'wallet_refunded':
      return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400">Refunded</Badge>;
    case 'new_request':
      return <Badge className="bg-primary/20 text-primary">New Request</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
};

// Sub-component for ride request action screen
function RideRequestActionScreen({ notification }: { notification: any }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingAction, setProcessingAction] = useState<'accept' | 'decline' | null>(null);
  const [showPhoto, setShowPhoto] = useState(true);
  const [freeConnectionsLeft, setFreeConnectionsLeft] = useState(0);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; requestId: string | null }>({
    open: false, requestId: null,
  });

  useEffect(() => {
    const fetchFree = async () => {
      if (!user) return;
      const data = await api.get<{ free_connections_left: number }>('/data/profiles/me');
      setFreeConnectionsLeft(data?.free_connections_left ?? 0);
    };
    fetchFree();
  }, [user]);

  const canSkipPayment = isPremium || freeConnectionsLeft > 0;

  const { data: ride, isLoading: rideLoading } = useQuery({
    queryKey: ['ride-detail', notification.ride_id],
    queryFn: async () => {
      const list = await api.get<any[]>('/data/rides', { params: { id: notification.ride_id } });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!notification.ride_id,
  });

  const { data: rideRequest, isLoading: requestLoading, refetch: refetchRequest } = useQuery({
    queryKey: ['ride-request-for-notification', notification.ride_id, user?.id],
    queryFn: async () => {
      if (!user?.id || !notification.ride_id) return null;
      const list = await api.get<any[]>('/data/ride_requests', { params: { ride_id: notification.ride_id } });
      const paid = (Array.isArray(list) ? list : []).filter((r) => r.request_payment_status === 'paid');
      paid.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return paid[0] || null;
    },
    enabled: !!notification.ride_id && !!user?.id,
  });

  const { data: requesterProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['requester-profile', rideRequest?.requester_id],
    queryFn: async () => {
      if (!rideRequest?.requester_id) return null;
      const profileData = await api.post<any[]>('/rpc/get_public_profile', { _user_id: rideRequest.requester_id });
      const profile = Array.isArray(profileData) ? profileData[0] : null;
      const profilesList = await api.get<any[]>('/data/profiles', { params: { ids: rideRequest.requester_id } });
      const premiumData = Array.isArray(profilesList) && profilesList[0] ? profilesList[0] : null;
      const requesterIsPremium =
        premiumData?.is_premium &&
        premiumData?.subscription_expiry &&
        new Date(premiumData.subscription_expiry) > new Date();
      return profile ? { ...profile, is_premium: requesterIsPremium } : null;
    },
    enabled: !!rideRequest?.requester_id,
  });

  const handleAccept = async () => {
    if (!rideRequest || !user?.id || processingAction) return; // prevent double-click

    if (canSkipPayment) {
      setProcessingAction('accept');
      try {
        await api.patch(`/data/ride_requests/${rideRequest.id}`, { show_profile_photo: showPhoto });

        const data = await api.post<any[]>('/rpc/pay_accept_request', {
          _user_id: user.id,
          _ride_request_id: rideRequest.id,
          _payment_source: isPremium ? 'premium' : 'free_connection',
          _razorpay_payment_id: null,
        });
        const result = Array.isArray(data) ? data[0] : null;
        if (!result?.success) throw new Error(result?.error_message || 'Failed to accept');

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        toast({
          title: '🎉 Ride Connected!',
          description: 'Chat is now open. Happy travels!',
          className: 'bg-green-50 border-green-200',
        });
        navigate('/chats');
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setProcessingAction(null);
      }
    } else {
      await api.patch(`/data/ride_requests/${rideRequest.id}`, { show_profile_photo: showPhoto });
      setPaymentModal({ open: true, requestId: rideRequest.id });
    }
  };

  const handleDecline = async () => {
    if (!rideRequest || processingAction) return;
    setProcessingAction('decline');
    toast({ title: '❌ Request Declined' });

    try {
      await api.patch(`/data/ride_requests/${rideRequest.id}`, { status: 'declined' });

      await api.post('/data/notifications', {
        user_id: rideRequest.requester_id,
        title: 'Request Declined',
        message: 'Your ride request was declined.',
        type: 'error',
        ride_id: notification.ride_id,
      });

      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      navigate('/notifications');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast({
      title: '🎉 Ride Connected!',
      description: 'Chat is now open. Happy travels!',
      className: 'bg-green-50 border-green-200',
    });
    navigate('/chats');
  };

  const isLoading = rideLoading || requestLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const isAlreadyActioned = rideRequest?.status === 'approved' || rideRequest?.status === 'declined';

  return (
    <div className="space-y-4">
      {/* Ride Details */}
      {ride && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Ride Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium">{ride.from_location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">To</p>
                <p className="text-sm font-medium">{ride.to_location}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{format(new Date(ride.ride_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{ride.ride_time}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{ride.seats_available} seat{ride.seats_available > 1 ? 's' : ''} available</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requester Profile */}
      {requesterProfile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={requesterProfile.avatar_url || undefined} />
                <AvatarFallback className="bg-accent text-accent-foreground">
                  {requesterProfile.full_name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold">{requesterProfile.full_name}</p>
                  {requesterProfile.is_premium ? (
                    <VerifiedBadge size="sm" isPremium />
                  ) : requesterProfile.is_verified ? (
                    <VerifiedBadge size="sm" />
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">Wants to join your ride</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already actioned */}
      {isAlreadyActioned && (
        <Card className={rideRequest?.status === 'approved' ? 'border-green-500/50' : 'border-destructive/50'}>
          <CardContent className="p-4 text-center">
            {rideRequest?.status === 'approved' ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <p className="font-medium">Request Already Accepted</p>
                <Button onClick={() => navigate('/chats')} className="mt-2 gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Open Chat
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <XCircle className="h-8 w-8 text-destructive" />
                <p className="font-medium">Request Declined</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons - only for pending requests */}
      {rideRequest && rideRequest.status === 'pending' && (
        <>
          {/* Payment info */}
          {canSkipPayment ? (
            <div className="rounded-lg p-4 border" style={{ background: 'linear-gradient(135deg, #FFD70010, #14B8A610)', borderColor: '#FFD70040' }}>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-5 w-5" style={{ color: '#FFD700' }} />
                <span className="font-semibold text-foreground">{isPremium ? 'Premium Member' : 'Free Connection'}</span>
              </div>
              <p className="text-sm text-muted-foreground">Accept instantly — no payment needed!</p>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-400">Connection Fee: ₹21</span>
              </div>
              <p className="text-sm text-muted-foreground">Pay to accept this request and start chatting.</p>
            </div>
          )}

          {/* Privacy */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="showPhoto" checked={showPhoto} onCheckedChange={(c) => setShowPhoto(c as boolean)} />
              <Label htmlFor="showPhoto" className="text-sm">Allow my profile photo to be shown</Label>
            </div>
            <div className="rounded-md bg-primary/10 p-3 text-xs text-primary border border-primary/20">
              <Shield className="inline-block h-3 w-3 mr-1" />
              After approval, you'll be able to chat with your travel partner.
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
              onClick={handleDecline}
              disabled={!!processingAction}
            >
              {processingAction === 'decline' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
              Decline
            </Button>
            <Button
              variant="hero"
              className="flex-1 gap-2"
              onClick={handleAccept}
              disabled={!!processingAction}
            >
              {processingAction === 'accept' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : canSkipPayment ? (
                <>
                  <Crown className="h-4 w-4" />
                  Accept
                </>
              ) : (
                <>
                  <IndianRupee className="h-4 w-4" />
                  Pay ₹21 & Accept
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* No request found */}
      {!rideRequest && !isLoading && (
        <Card className="border-muted">
          <CardContent className="p-4 text-center text-muted-foreground">
            <p>No pending request found for this ride.</p>
            <Button variant="outline" className="mt-3" onClick={() => navigate('/my-posted-rides')}>
              <Eye className="h-4 w-4 mr-2" />
              View My Posted Rides
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      {!canSkipPayment && paymentModal.requestId && (
        <PaymentModal
          open={paymentModal.open}
          onOpenChange={(open) => setPaymentModal({ open, requestId: open ? paymentModal.requestId : null })}
          purpose="accept_request"
          rideRequestId={paymentModal.requestId}
          onSuccess={handlePaymentSuccess}
          title="Pay to Accept Request"
          description="Pay ₹21 to accept this request and start the chat."
        />
      )}
    </div>
  );
}

export default function NotificationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notification, isLoading, error } = useQuery({
    queryKey: ['notification-detail', id],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      const list = await api.get<any[]>('/data/notifications');
      const found = (Array.isArray(list) ? list : []).find((n) => n.id === id && n.user_id === user.id);
      return found || null;
    },
    enabled: !!id && !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      await api.patch(`/data/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  useEffect(() => {
    if (notification && !notification.read) {
      markAsReadMutation.mutate();
    }
  }, [notification?.id, notification?.read]);

  const isRideRequest = (notification?.type === 'new_request' || (notification?.type === 'info' && notification?.title?.includes('Ride Request'))) && notification?.ride_id;

  const handleActionButton = () => {
    if (!notification) return;
    switch (notification.type) {
      case 'ride_accepted': navigate('/chats'); break;
      case 'ride_declined':
      case 'wallet_refunded':
      case 'payment_success':
      case 'payment_confirmed': navigate('/notifications'); break;
      case 'new_request': navigate('/my-posted-rides'); break;
      default: navigate('/notifications');
    }
  };

  const getActionButtonText = (type: string) => {
    switch (type) {
      case 'ride_accepted': return { text: 'Open Chat', icon: MessageCircle };
      case 'ride_declined': return { text: 'View Wallet Refund', icon: Wallet };
      case 'payment_success':
      case 'payment_confirmed': return { text: 'View Wallet', icon: Wallet };
      case 'wallet_refunded': return { text: 'View Wallet', icon: Wallet };
      case 'new_request': return { text: 'View Request', icon: Eye };
      default: return { text: 'Close', icon: X };
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (error || !notification) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto space-y-6">
          <button onClick={() => navigate('/notifications')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Notifications</span>
          </button>
          <Card className="border-destructive/50">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold">Notification Not Found</h3>
              <p className="text-sm text-muted-foreground">This notification no longer exists.</p>
              <Button onClick={() => navigate('/notifications')} className="mt-4">Back to Notifications</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">
            {isRideRequest ? 'Ride Request' : 'Notification Details'}
          </h1>
        </div>

        {/* For new_request with ride_id: show full ride request action screen */}
        {isRideRequest ? (
          <RideRequestActionScreen notification={notification} />
        ) : (
          /* Default notification detail card */
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-2">
                  <CardTitle className="text-lg leading-tight">{notification.title}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(notification.type)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-foreground leading-relaxed">{notification.message}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{notification.type.replace(/_/g, ' ')}</span>
              </div>
              {(() => {
                const actionButton = getActionButtonText(notification.type);
                const ActionIcon = actionButton.icon;
                return (
                  <Button onClick={handleActionButton} className="w-full gap-2" variant={notification.type === 'system' ? 'outline' : 'default'}>
                    <ActionIcon className="h-4 w-4" />
                    {actionButton.text}
                  </Button>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
