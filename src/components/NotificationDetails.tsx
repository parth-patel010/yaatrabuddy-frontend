import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, Users, Car, X, Loader2, Shield, MessageCircle, IndianRupee } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PaymentModal } from './PaymentModal';
interface NotificationDetailsProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    ride_id: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: () => void;
}

interface RideDetails {
  id: string;
  from_location: string;
  to_location: string;
  ride_date: string;
  ride_time: string;
  seats_available: number;
  transport_mode: string;
  user_id: string;
}

interface RequestDetails {
  id: string;
  status: string;
  requester_id: string;
  show_profile_photo: boolean;
  show_mobile_number: boolean;
  request_payment_status: string | null;
  accept_payment_status: string | null;
}

interface ProfileDetails {
  full_name: string;
  avatar_url: string | null;
  phone_number: string | null;
}

export function NotificationDetails({ notification, open, onOpenChange, onActionComplete }: NotificationDetailsProps) {
  const [ride, setRide] = useState<RideDetails | null>(null);
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileDetails | null>(null);
  const [rideOwnerProfile, setRideOwnerProfile] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPhoto, setShowPhoto] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (notification?.ride_id && open) {
      fetchDetails();
    }
  }, [notification, open]);

  const fetchDetails = async () => {
    if (!notification?.ride_id || !user) return;
    
    setLoading(true);
    try {
      const rideList = await api.get<any[]>('/data/rides', { params: { id: notification.ride_id } });
      const rideData = Array.isArray(rideList) && rideList[0] ? rideList[0] : null;

      if (rideData) {
        setRide(rideData);

        const ownerProfile = await api.get<any>(`/data/profiles/${rideData.user_id}`).catch(() => null);
        setRideOwnerProfile(ownerProfile ? { full_name: ownerProfile.full_name, avatar_url: ownerProfile.avatar_url, phone_number: ownerProfile.phone_number } : null);

        const isRideOwner = rideData.user_id === user.id;
        const reqList = await api.get<any[]>('/data/ride_requests', { params: { ride_id: notification.ride_id } });
        const requests = Array.isArray(reqList) ? reqList : [];

        if (isRideOwner) {
          const paid = requests.filter((r) => r.request_payment_status === 'paid');
          paid.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const reqData = paid[0] || null;
          if (reqData) {
            setRequest(reqData);
            const requesterProfile = await api.get<any>(`/data/profiles/${reqData.requester_id}`).catch(() => null);
            setPartnerProfile(requesterProfile ? { full_name: requesterProfile.full_name, avatar_url: requesterProfile.avatar_url, phone_number: requesterProfile.phone_number } : null);
          }
        } else {
          const reqData = requests.find((r) => r.requester_id === user.id) || null;
          setRequest(reqData);
          setPartnerProfile(ownerProfile ? { full_name: ownerProfile.full_name, avatar_url: ownerProfile.avatar_url, phone_number: ownerProfile.phone_number } : null);
        }
      }
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!request || !ride || !user) return;

    setProcessing(true);
    try {
      await api.patch(`/data/ride_requests/${request.id}`, { status: 'declined' });

      await api.post('/data/notifications', {
        user_id: request.requester_id,
        title: 'Request Declined - Refund Issued',
        message: 'Your ride request was declined. ₹9 has been refunded to your wallet.',
        type: 'error',
        ride_id: ride.id,
      });

      toast({
        title: '❌ Request Declined',
        description: 'The traveler has been refunded ₹9 to their wallet.',
      });

      onOpenChange(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error declining request:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline request.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast({
      title: '🎉 Ride Connected!',
      description: 'Chat is now open. Happy travels!',
      className: 'bg-green-50 border-green-200',
    });
    onOpenChange(false);
    onActionComplete?.();
  };

  const handleProceedToPayment = () => {
    setPaymentModalOpen(true);
  };

  const isRideOwner = ride?.user_id === user?.id;
  const canShowPhoto = request?.status === 'approved' && request?.show_profile_photo;

  const getTransportIcon = (mode: string) => {
    return <Car className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Approved</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Declined</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {notification?.title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !ride ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>Ride details not available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ride Details */}
            <div className="rounded-lg border border-border bg-accent/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{ride.from_location}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{ride.to_location}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(ride.ride_date), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {ride.ride_time}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {getTransportIcon(ride.transport_mode)}
                  {ride.transport_mode}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {ride.seats_available} seats
                </div>
              </div>
            </div>

            {/* Partner Details */}
            {partnerProfile && (
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">
                  {isRideOwner ? 'Requester Details' : 'Ride Creator Details'}
                </h4>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      {canShowPhoto || (isRideOwner && request?.status === 'pending') ? (
                        <>
                          <AvatarImage src={partnerProfile.avatar_url || undefined} />
                          <AvatarFallback className="bg-accent text-accent-foreground">
                            {partnerProfile.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="bg-muted blur-sm">
                          {partnerProfile.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {!canShowPhoto && request?.status !== 'pending' && !isRideOwner && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-full">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{partnerProfile.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {isRideOwner ? 'Requester' : 'Ride Owner'}
                    </p>
                  </div>
                  {request?.status === 'approved' && (
                    <Link to="/chats">
                      <Badge variant="outline" className="text-green-600 border-green-600 cursor-pointer hover:bg-green-50">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Chat
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Request Status */}
            {request && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(request.status)}
              </div>
            )}

            {/* Payment-required Accept Controls for Ride Owner */}
            {isRideOwner && request?.status === 'pending' && request?.request_payment_status === 'paid' && (
              <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                {/* Payment Info - User B has already paid */}
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2 mb-2">
                    <IndianRupee className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">This user has already paid ₹9</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    To accept this request and start chatting, you must also pay ₹9.
                  </p>
                </div>

                <h4 className="font-medium text-foreground">Privacy Settings</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="showPhotoNotif" 
                      checked={showPhoto} 
                      onCheckedChange={(checked) => setShowPhoto(checked as boolean)}
                    />
                    <Label htmlFor="showPhotoNotif" className="text-sm">
                      Allow my profile photo to be shown
                    </Label>
                  </div>
                </div>

                <div className="rounded-md bg-primary/10 p-3 text-xs text-primary border border-primary/20">
                  <Shield className="inline-block h-3 w-3 mr-1" />
                  After payment, you'll be able to chat with your travel partner. Phone numbers are never shared.
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="hero"
                    className="flex-1"
                    onClick={handleProceedToPayment}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <IndianRupee className="h-4 w-4 mr-2" />
                    )}
                    Pay ₹9 & Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                    onClick={handleDecline}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Decline
                  </Button>
                </div>
              </div>
            )}

            {/* Payment Modal for Accept */}
            {request && (
              <PaymentModal
                open={paymentModalOpen}
                onOpenChange={setPaymentModalOpen}
                purpose="accept_request"
                rideRequestId={request.id}
                onSuccess={handlePaymentSuccess}
                title="Pay to Accept Request"
                description="Pay ₹9 to accept this request and start the chat."
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}