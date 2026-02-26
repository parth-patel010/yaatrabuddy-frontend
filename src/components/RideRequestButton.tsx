import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/api/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useVerification } from '@/hooks/useVerification';
import { usePremium } from '@/hooks/usePremium';
import { JoinRequestPaymentModal } from '@/components/JoinRequestPaymentModal';
import { UserPlus, Loader2, Check, X, Shield, IndianRupee, Crown } from 'lucide-react';

interface RideRequestButtonProps {
  rideId: string;
  rideOwnerId: string;
  rideOwnerName: string;
  existingStatus?: string | null;
  existingPaymentStatus?: string | null;
  onRequestSent?: () => void;
}

export function RideRequestButton({
  rideId,
  rideOwnerId,
  rideOwnerName,
  existingStatus,
  existingPaymentStatus,
  onRequestSent,
}: RideRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(existingStatus);
  const [paymentStatus, setPaymentStatus] = useState(existingPaymentStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [showMyPhoto, setShowMyPhoto] = useState(true);
  const [freeConnectionsLeft, setFreeConnectionsLeft] = useState(0);
  const { user } = useAuth();
  const { isVerified, loading: verificationLoading } = useVerification();
  const { isPremium } = usePremium();
  const { toast } = useToast();

  useEffect(() => {
    const fetchFree = async () => {
      if (!user) return;
      const data = await api.get<{ free_connections_left: number }>('/data/profiles/me');
      setFreeConnectionsLeft(data?.free_connections_left ?? 0);
    };
    fetchFree();
  }, [user]);

  const openConsentDialog = () => {
    if (!user) return;
    
    if (!isVerified) {
      toast({
        title: 'Account Not Verified',
        description: 'Your account is not verified yet. We verify ID proofs within 24 hours.',
        variant: 'destructive',
      });
      return;
    }

    if (status === 'pending' && paymentStatus === 'paid') {
      toast({
        title: 'Request Already Sent',
        description: 'You already have a pending request for this ride.',
        variant: 'destructive',
      });
      return;
    }
    
    setShowMyPhoto(true);
    setDialogOpen(true);
  };

  const canSkipPayment = isPremium || freeConnectionsLeft > 0;

  const handleProceedToPayment = async () => {
    setDialogOpen(false);
    
    if (canSkipPayment) {
      // Premium or free connections: skip payment, send request directly
      setLoading(true);
      try {
        const data = await api.post<{ success: boolean; error_message?: string; request_id?: string }[]>('/rpc/create_and_pay_join_request', {
          _requester_id: user!.id,
          _ride_id: rideId,
          _payment_source: isPremium ? 'premium' : 'free_connection',
          _requester_show_profile_photo: showMyPhoto,
          _requester_show_mobile_number: false,
          _razorpay_payment_id: null,
        });

        const result = Array.isArray(data) ? data[0] : null;
        if (!result?.success) throw new Error(result?.error_message || 'Failed to send request');

        await handlePaymentSuccess(result.request_id);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to send request',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    } else {
      setPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = async (requestId: string) => {
    if (!user) return;

    try {
      // Notification is already created by the backend RPC (create_and_pay_join_request)
      // Do NOT insert a duplicate notification here

      setStatus('pending');
      setPaymentStatus('paid');
      setPaymentModalOpen(false); // Close payment modal on success
      
      toast({
        title: '✅ Request Sent!',
        description: 'The ride owner will be notified.',
        className: 'bg-green-50 border-green-200',
      });
      
      onRequestSent?.();
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handlePaymentCancel = () => {
    toast({
      title: 'Payment Cancelled',
      description: 'Payment not completed. Request not sent.',
    });
  };

  if (user?.id === rideOwnerId) return null;

  if (status === 'approved') {
    return (
      <Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-600" disabled>
        <Check className="h-4 w-4" /> Approved
      </Button>
    );
  }

  if (status === 'declined') {
    return (
      <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-600" disabled>
        <X className="h-4 w-4" /> Declined
      </Button>
    );
  }

  if (status === 'pending' && paymentStatus === 'paid') {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" disabled>
        <Loader2 className="h-4 w-4 animate-spin" /> Pending
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="hero"
        size="sm"
        className="gap-1.5"
        onClick={openConsentDialog}
        disabled={loading || verificationLoading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Request to Join
      </Button>

      {/* Consent Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request to Join Ride</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You're requesting to join <span className="font-medium text-foreground">{rideOwnerName}'s</span> ride.
            </p>

            {/* Payment Info */}
            {canSkipPayment ? (
              <div className="rounded-lg p-4 border" style={{ background: 'linear-gradient(135deg, #FFD70010, #14B8A610)', borderColor: '#FFD70040' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5" style={{ color: '#FFD700' }} />
                  <span className="font-semibold text-foreground">{isPremium ? 'Premium Member' : 'Free Connection'}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  No payment needed! Your request will be sent instantly.
                </p>
              </div>
            ) : (
              <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Payment Required</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay ₹21 platform connection fee to send this request.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Privacy Settings</h4>
              <p className="text-xs text-muted-foreground">
                If approved, you'll be able to chat with your travel partner.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showMyPhoto" 
                  checked={showMyPhoto} 
                  onCheckedChange={(checked) => setShowMyPhoto(checked as boolean)}
                />
                <Label htmlFor="showMyPhoto" className="text-sm">Share my profile photo</Label>
              </div>
            </div>

            <div className="rounded-md bg-primary/10 p-3 text-xs text-primary border border-primary/20">
              <Shield className="inline-block h-3 w-3 mr-1" />
              Phone numbers are never shared. All communication happens via in-app chat.
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="hero" className="flex-1" onClick={handleProceedToPayment} disabled={loading}>
                {canSkipPayment ? (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Send Request
                  </>
                ) : (
                  <>
                    <IndianRupee className="h-4 w-4 mr-2" />
                    Continue to Pay ₹21
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal - only when payment required */}
      {!canSkipPayment && (
        <JoinRequestPaymentModal
          open={paymentModalOpen}
          onOpenChange={(open) => {
            if (!open && paymentModalOpen) {
              // Only treat as cancel if we're closing without a successful payment
              // onSuccess will handle closing on success
              handlePaymentCancel();
            }
            setPaymentModalOpen(open);
          }}
          rideId={rideId}
          rideOwnerId={rideOwnerId}
          requesterShowProfilePhoto={showMyPhoto}
          requesterShowMobileNumber={false}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
