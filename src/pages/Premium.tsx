import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TealHeader } from '@/components/TealHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { 
  Crown, Star, Zap, Users, Eye, Shield, 
  Check, Loader2, CreditCard, ShieldCheck 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Premium() {
  const { user } = useAuth();
  const { isPremium, isAdmin, subscriptionExpiry, refresh, loading: premiumLoading } = usePremium();
  const { createRazorpayOrder, verifyPayment, loadRazorpayScript } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const benefits = [
    { icon: Zap, text: 'Unlimited ride partner connections' },
    { icon: Shield, text: 'No ₹21 per request fee' },
    { icon: Star, text: 'Priority matching in ride results' },
    { icon: Crown, text: 'Premium gold badge next to your name' },
    { icon: Eye, text: 'Higher profile visibility' },
    { icon: Users, text: 'Stand out from other travelers' },
  ];

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load payment gateway');

      const orderData = await createRazorpayOrder(99, 'subscription');

      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: 'YaatraBuddy',
        description: 'Premium Subscription - 30 Days',
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              purpose: 'subscription',
              amount: 99,
            });

            toast({
              title: '🎉 Welcome to Premium!',
              description: 'You now have unlimited connections for 30 days.',
            });
            await refresh();
          } catch (error: any) {
            toast({
              title: 'Subscription Failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        },
        prefill: {},
        theme: { color: '#FFD700' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to initiate payment',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (premiumLoading) {
    return (
      <AppShell hideTopBar shellClassName="bg-deep-teal">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-cream" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto h-full flex flex-col text-cream font-poppins antialiased overflow-hidden">
        <TealHeader title="YaatraBuddy" />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 pb-24">
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" 
            style={{ background: isAdmin ? 'linear-gradient(135deg, #FFD700, #F59E0B)' : 'linear-gradient(135deg, #FFD700, #14B8A6)' }}>
            {isAdmin ? <ShieldCheck className="h-8 w-8 text-white" /> : <Crown className="h-8 w-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isAdmin ? 'YaatraBuddy Admin' : 'YaatraBuddy Premium'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Lifetime Premium Access' : 'Upgrade your travel experience'}
          </p>
        </div>

        {/* Admin Lifetime Status */}
        {isAdmin && (
          <Card className="border-2" style={{ borderColor: '#FFD700' }}>
            <CardContent className="p-4 text-center space-y-2">
              <Badge className="mb-2" style={{ background: 'linear-gradient(135deg, #FFD700, #F59E0B)', color: 'white' }}>
                <ShieldCheck className="h-3 w-3 mr-1" /> Admin – Lifetime Premium
              </Badge>
              <p className="text-sm text-muted-foreground">
                Your admin account has permanent premium access. No subscription needed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Current Status - non-admin premium */}
        {!isAdmin && isPremium && subscriptionExpiry && (
          <Card className="border-2" style={{ borderColor: '#FFD700' }}>
            <CardContent className="p-4 text-center">
              <Badge className="mb-2" style={{ background: 'linear-gradient(135deg, #FFD700, #14B8A6)', color: 'white' }}>
                <Crown className="h-3 w-3 mr-1" /> Active Premium
              </Badge>
              <p className="text-sm text-muted-foreground">
                Expires: {format(new Date(subscriptionExpiry), 'dd MMM yyyy')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pricing Card - hidden for admins */}
        {!isAdmin && (
        <Card className="rounded-2xl overflow-hidden">
          <div className="p-1" style={{ background: 'linear-gradient(135deg, #FFD700, #14B8A6)' }}>
            <div className="bg-background rounded-xl p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">Monthly Plan</p>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="text-4xl font-bold text-foreground">₹99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                {benefits.map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #FFD70020, #14B8A620)' }}>
                      <Icon className="h-4 w-4" style={{ color: '#14B8A6' }} />
                    </div>
                    <span className="text-sm text-foreground">{text}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full h-12 text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #FFD700, #14B8A6)' }}
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-5 w-5 mr-2" />
                )}
                {isPremium ? 'Extend Subscription' : 'Subscribe Now'}
              </Button>
            </div>
          </div>
        </Card>
        )}

        {/* Comparison - hidden for admins */}
        {!isAdmin && (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-4">Free vs Premium</h3>
            <div className="space-y-3">
              {[
                { feature: 'Send ride requests', free: '₹21 each', premium: 'Free' },
                { feature: 'Accept ride requests', free: '₹21 each', premium: 'Free' },
                { feature: 'Profile badge', free: 'Verified tick', premium: 'Gold Premium badge' },
                { feature: 'Profile visibility', free: 'Standard', premium: 'Priority' },
              ].map(({ feature, free, premium }, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-muted-foreground">{feature}</span>
                  <span className="text-center text-foreground">{free}</span>
                  <span className="text-center font-medium" style={{ color: '#14B8A6' }}>{premium}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
        </main>
      </div>
    </AppShell>
  );
}
