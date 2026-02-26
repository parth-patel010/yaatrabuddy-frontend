import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePremium } from '@/hooks/usePremium';
import { Check, X, Loader2, Users, Shield, IndianRupee, Clock, Crown } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { PaymentModal } from './PaymentModal';

interface RideRequest {
  id: string;
  ride_id: string;
  requester_id: string;
  status: string;
  created_at: string;
  show_profile_photo: boolean;
  show_mobile_number: boolean;
  requester_show_profile_photo: boolean;
  requester_show_mobile_number: boolean;
  request_payment_status: string | null;
  accept_payment_status: string | null;
  requester_profile?: {
    full_name: string;
    avatar_url: string | null;
    phone_number: string | null;
    is_verified?: boolean;
    is_premium?: boolean;
  };
}

interface RideRequestsManagerProps {
  rideId: string;
}

export function RideRequestsManager({ rideId }: RideRequestsManagerProps) {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{ open: boolean; request: RideRequest | null }>({
    open: false,
    request: null,
  });
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null,
  });
  const [showPhoto, setShowPhoto] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium } = usePremium();

  useEffect(() => {
    if (user) fetchRequests();
  }, [rideId, user]);

  const fetchRequests = async () => {
    try {
      if (!user) return;

      const requestsData = await api.get<any[]>('/data/ride_requests', { params: { ride_id: rideId } });
      const list = Array.isArray(requestsData) ? requestsData : [];

      const requestsWithProfiles = await Promise.all(
        list
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(async (request) => {
            if (request.request_payment_status !== 'paid') return null;

            if (request.status === 'approved') {
              const contactRows = await api.post<any[]>('/rpc/get_approved_contact_details', {
                _target_user_id: request.requester_id,
                _requesting_user_id: user.id,
              });
              const contact = Array.isArray(contactRows) ? contactRows[0] : null;

              if (contact) {
                return {
                  ...request,
                  requester_profile: {
                    full_name: contact.full_name,
                    avatar_url: contact.avatar_url,
                    phone_number: contact.phone_number,
                    is_verified: contact.is_verified,
                  },
                  requester_show_profile_photo: contact.show_profile_photo,
                  requester_show_mobile_number: contact.show_mobile_number,
                };
              }
            }

            const profileRows = await api.post<any[]>('/rpc/get_public_profile', { _user_id: request.requester_id });
            const profile = Array.isArray(profileRows) ? profileRows[0] : null;

            const profilesList = await api.get<any[]>('/data/profiles', { params: { ids: request.requester_id } });
            const premiumData = Array.isArray(profilesList) && profilesList.length > 0 ? profilesList[0] : null;
            const requesterIsPremium =
              premiumData?.is_premium &&
              premiumData?.subscription_expiry &&
              new Date(premiumData.subscription_expiry) > new Date();

            return {
              ...request,
              requester_profile: profile
                ? {
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    phone_number: null,
                    is_verified: profile.is_verified,
                    is_premium: requesterIsPremium,
                  }
                : undefined,
            };
          })
      );

      setRequests(requestsWithProfiles.filter(Boolean) as RideRequest[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openApprovalDialog = (request: RideRequest) => {
    setShowPhoto(true);
    setApprovalDialog({ open: true, request });
  };

  const handleProceedToPayment = async () => {
    const request = approvalDialog.request;
    if (!request) return;
    
    setApprovalDialog({ open: false, request: null });

    if (isPremium) {
      // Premium user: auto-accept without payment
      setProcessingId(request.id);
      try {
        // Update photo consent
        await api.patch(`/data/ride_requests/${request.id}`, { show_profile_photo: showPhoto });

        const data = await api.post<{ success: boolean; error_message?: string }[]>('/rpc/pay_accept_request', {
          _user_id: user!.id,
          _ride_request_id: request.id,
          _payment_source: 'premium',
          _razorpay_payment_id: null,
        });

        const result = Array.isArray(data) ? data[0] : null;
        if (!result?.success) throw new Error(result?.error_message || 'Failed to accept');

        await fetchRequests();
        toast({
          title: '🎉 Ride Connected!',
          description: 'Chat is now open. Happy travels!',
          className: 'bg-green-50 border-green-200',
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to accept request',
          variant: 'destructive',
        });
      } finally {
        setProcessingId(null);
      }
    } else {
      setPaymentModal({ open: true, requestId: request.id });
    }
  };

  const handlePaymentSuccess = async () => {
    await fetchRequests();
    toast({
      title: '🎉 Ride Connected!',
      description: 'Chat is now open. Happy travels!',
      className: 'bg-green-50 border-green-200',
    });
  };

  const handleDecline = async (requestId: string, requesterId: string) => {
    if (processingId) return; // prevent double-click
    setProcessingId(requestId);
    // Optimistic UI update
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'declined' } : r))
    );
    toast({ title: '❌ Request Declined' });

    try {
      await api.patch(`/data/ride_requests/${requestId}`, { status: 'declined' });

      await api.post('/data/notifications', {
        user_id: requesterId,
        title: 'Request Declined',
        message: 'Your ride request was declined.',
        type: 'error',
        ride_id: rideId,
      });
    } catch (error) {
      // Revert on failure
      console.error('Error declining request:', error);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'pending' } : r))
      );
      toast({ title: 'Error', description: 'Failed to decline request.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>No requests yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => (
          <Card key={request.id} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {request.status === 'approved' && request.requester_show_profile_photo ? (
                      <AvatarImage src={request.requester_profile?.avatar_url || undefined} />
                    ) : null}
                    <AvatarFallback className={request.status === 'approved' && request.requester_show_profile_photo ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}>
                      {request.requester_profile?.full_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-foreground">
                        {request.requester_profile?.full_name || 'Unknown'}
                      </p>
                      {request.requester_profile?.is_premium ? (
                        <VerifiedBadge size="sm" isPremium />
                      ) : request.requester_profile?.is_verified ? (
                        <VerifiedBadge size="sm" />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Requester</span>
                      {request.request_payment_status === 'paid' && request.status === 'pending' && (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] px-1 py-0">
                          Paid
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {request.status === 'pending' && (
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <Button
                        variant="hero"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => openApprovalDialog(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isPremium ? (
                          <>
                            <Crown className="h-3.5 w-3.5" />
                            <span>Accept</span>
                          </>
                        ) : (
                          <>
                            <IndianRupee className="h-3.5 w-3.5" />
                            <span>Pay ₹21 & Accept</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleDecline(request.id, request.requester_id)}
                        disabled={processingId === request.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}
                  {request.status === 'approved' && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ Connected
                    </Badge>
                  )}
                  {request.status === 'declined' && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      Declined
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog({ open, request: open ? approvalDialog.request : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Request</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {approvalDialog.request?.requester_profile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={approvalDialog.request.requester_profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {approvalDialog.request.requester_profile.full_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {approvalDialog.request.requester_profile.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">wants to join your ride</p>
                </div>
              </div>
            )}

            {isPremium ? (
              <div className="rounded-lg p-4 border" style={{ background: 'linear-gradient(135deg, #FFD70010, #14B8A610)', borderColor: '#FFD70040' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5" style={{ color: '#FFD700' }} />
                  <span className="font-semibold text-foreground">Premium Member</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Accept instantly — no payment needed!
                </p>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-400">Connection Fee Required</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay ₹21 to accept this request and start chatting.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Privacy Settings</h4>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showPhoto" 
                  checked={showPhoto} 
                  onCheckedChange={(checked) => setShowPhoto(checked as boolean)}
                />
                <Label htmlFor="showPhoto" className="text-sm">
                  Allow my profile photo to be shown
                </Label>
              </div>
            </div>

            <div className="rounded-md bg-primary/10 p-3 text-xs text-primary border border-primary/20">
              <Shield className="inline-block h-3 w-3 mr-1" />
              After approval, you'll be able to chat with your travel partner. Phone numbers are never shared.
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setApprovalDialog({ open: false, request: null })}>
                Cancel
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleProceedToPayment}>
                {isPremium ? (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Accept Request
                  </>
                ) : (
                  <>
                    <IndianRupee className="h-4 w-4 mr-2" />
                    Pay ₹21 to Accept
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal - only for non-premium */}
      {!isPremium && paymentModal.requestId && (
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
    </>
  );
}
