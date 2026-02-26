import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, IndianRupee } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

// This PaymentModal is used for ACCEPT REQUEST only
interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: 'accept_request';
  rideRequestId: string;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function PaymentModal({
  open,
  onOpenChange,
  purpose,
  rideRequestId,
  onSuccess,
  title = 'Payment Required',
  description,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const { createRazorpayOrder, verifyPayment, loadRazorpayScript } = useWallet();
  const { toast } = useToast();

  const defaultDescription = 'Pay ₹21 to accept this request and start the chat';

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error('Failed to load payment gateway');
      }

      const orderData = await createRazorpayOrder(21, 'accept_request', rideRequestId);

      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: 'YaatraBuddy',
        description: 'Connection Fee - Accept Request',
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              purpose: 'accept_request',
              amount: 21,
              ride_request_id: rideRequestId,
            });
            toast({
              title: '🎉 Ride Connected!',
              description: 'Chat is now open. Happy travels!',
              className: 'bg-green-50 border-green-200',
            });
            onOpenChange(false);
            onSuccess();
          } catch (error: any) {
            toast({
              title: 'Payment Verification Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        },
        prefill: {},
        theme: {
          color: '#10B981',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Unable to initiate payment',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Platform Connection Fee</p>
            <p className="text-3xl font-bold text-foreground">₹21</p>
          </div>

          <Button
            variant="hero"
            className="w-full justify-start gap-3 h-12"
            onClick={handleRazorpayPayment}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            <div className="flex-1 text-left">
              <p className="font-medium">Pay ₹21 via Razorpay</p>
              <p className="text-xs opacity-80">UPI, Cards, Net Banking</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
