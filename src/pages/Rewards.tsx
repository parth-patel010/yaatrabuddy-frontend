import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { TealHeader } from '@/components/TealHeader';
import { TravelSpinWheel } from '@/components/TravelSpinWheel';
import { TravelConfetti } from '@/components/TravelConfetti';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useRewardSystem } from '@/hooks/useRewardSystem';
import { 
  Gift, History, Lock, Smartphone, Tv, ShoppingBag, Banknote, Package, 
  Link2, Trophy, ArrowRight, PartyPopper, CheckCircle,
  Loader2, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

const REWARD_ICONS: Record<string, React.ElementType> = {
  mobile_recharge: Smartphone,
  ott_subscription: Tv,
  myntra_coupon: ShoppingBag,
  upi_cash: Banknote,
  surprise_gift: Package,
};

const REWARD_COLORS: Record<string, string> = {
  mobile_recharge: 'from-blue-500 to-blue-600',
  ott_subscription: 'from-purple-500 to-purple-600',
  myntra_coupon: 'from-pink-500 to-pink-600',
  upi_cash: 'from-green-500 to-green-600',
  surprise_gift: 'from-orange-500 to-orange-600',
};

const REWARDS_LIST = [
  { type: 'mobile_recharge', name: 'Mobile Recharge', description: '1.5GB/day for 28 days', icon: Smartphone },
  { type: 'ott_subscription', name: 'OTT', description: '1 month premium', icon: Tv },
  { type: 'myntra_coupon', name: 'Myntra', description: '₹300 voucher', icon: ShoppingBag },
  { type: 'upi_cash', name: 'UPI Cash', description: '₹300 instant', icon: Banknote },
  { type: 'surprise_gift', name: 'Surprise', description: 'Special gift', icon: Package },
];

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    progress,
    rewardHistory,
    loading,
    spinning,
    performSpin,
    refetchRewardHistory,
    hasPendingReward,
  } = useRewardSystem();

  const [showConfetti, setShowConfetti] = useState(false);
  const [spinResult, setSpinResult] = useState<{
    reward_name: string | null;
    reward_description: string | null;
    reward_type: string | null;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSpinComplete = (result: typeof spinResult) => {
    setSpinResult(result);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
    // Refetch reward history so the new reward shows in "Your reward history" immediately
    refetchRewardHistory?.();
  };

  const progressPercentage = progress ? (progress.current_progress / 25) * 100 : 0;
  const connectionsToNext = progress ? 25 - progress.current_progress : 25;

  if (authLoading || loading) {
    return (
      <AppShell activeTab="rewards" hideTopBar shellClassName="bg-deep-teal">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-cream" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="rewards" hideTopBar shellClassName="bg-deep-teal">
      <div className="relative w-full max-w-[390px] mx-auto h-full flex flex-col text-cream font-poppins antialiased overflow-hidden">
        <TealHeader title="YaatraBuddy" />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-24">
      <TravelConfetti active={showConfetti} duration={5000} />

      {/* Page title */}
      <div className="mb-4 text-center">
        <h1 className="text-xl font-bold text-white">Spin & Win</h1>
        <p className="text-xs text-cream/70 mt-0.5">Complete 25 ride connections to unlock your spin</p>
      </div>

      {/* Winner Banner */}
      {hasPendingReward && (
        <div className="rounded-xl bg-copper/20 border border-copper/30 mb-4 p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full copper-gradient flex items-center justify-center flex-shrink-0">
            <PartyPopper className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">You Won!</p>
            <p className="text-xs text-cream/80">We will contact you soon</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full copper-gradient text-white font-medium shrink-0">Pending</span>
        </div>
      )}

      {/* Progress Card */}
      <div className="rounded-xl bg-dark-teal border border-white/5 shadow-lg mb-4 p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl copper-gradient flex items-center justify-center shrink-0">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-tight">{progress?.total_connections ?? 0}</p>
              <p className="text-xs text-cream/70">Ride connections</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-cream/70 flex items-center gap-1 justify-end">
              <Trophy className="h-3.5 w-3.5 text-copper" />
              Next spin at 25
            </p>
            <p className="text-lg font-bold text-copper">{progress?.current_progress ?? 0}/25</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-cream/70">
            <span>Progress to next spin</span>
            <span className="font-medium text-cream">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2.5 rounded-full bg-white/10 [&>*]:bg-copper [&>*]:rounded-full" />
        </div>
      </div>

      {/* Spin Section – primary focus when unlocked */}
      <div className="rounded-2xl bg-dark-teal/80 border border-white/10 shadow-xl mb-6 p-5">
        {progress?.spin_unlocked ? (
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 bg-copper/20 px-3 py-1.5 rounded-full mb-2">
              <Sparkles className="h-3.5 w-3.5 text-copper" />
              <span className="font-semibold text-xs text-white">Ready to spin</span>
            </div>
            <TravelSpinWheel
              onSpin={performSpin}
              spinning={false}
              disabled={!progress.spin_unlocked || !progress.rewards_enabled}
              onSpinComplete={handleSpinComplete}
            />
            <p className="text-xs text-cream/60 pt-1">Tap the centre to spin the wheel</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="relative mb-4 inline-block">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <Lock className="h-10 w-10 text-cream/50" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-7 h-7 rounded-full copper-gradient flex items-center justify-center text-white text-xs font-bold shadow-md">
                {connectionsToNext}
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Spin locked</h3>
            <p className="text-sm text-cream/70 mb-5 max-w-[240px] mx-auto">
              Complete <span className="font-bold text-copper">{connectionsToNext} more</span> ride connections to unlock your free spin.
            </p>
            <button
              type="button"
              onClick={() => navigate('/find')}
              className="copper-gradient text-white font-semibold px-5 py-2.5 rounded-xl gap-2 inline-flex items-center text-sm shadow-lg hover:opacity-90 transition-opacity"
            >
              Find rides
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Available Rewards – clearly structured */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Gift className="h-4 w-4 text-copper" />
          Prizes you can win
        </h2>
        <p className="text-xs text-cream/60 mb-3">Each spin can land on any of these rewards</p>
        <div className="space-y-2">
          {REWARDS_LIST.map((reward) => {
            const Icon = reward.icon;
            const colorClass = REWARD_COLORS[reward.type];
            return (
              <div
                key={reward.type}
                className="flex items-center gap-3 rounded-xl bg-dark-teal border border-white/5 p-3"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-md shrink-0`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm">{reward.name}</p>
                  <p className="text-xs text-cream/60">{reward.description}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-copper/70 shrink-0" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Reward History */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <History className="h-4 w-4 text-copper" />
          Your reward history
        </h2>
        {rewardHistory.length === 0 ? (
          <div className="rounded-xl bg-dark-teal/50 border border-white/5 p-6 text-center">
            <History className="h-10 w-10 text-cream/30 mx-auto mb-2" />
            <p className="text-sm text-cream/70">No rewards yet</p>
            <p className="text-xs text-cream/50 mt-0.5">Spin the wheel to win and see your history here</p>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {rewardHistory.map((reward) => {
              const Icon = REWARD_ICONS[reward.reward_type] || Gift;
              return (
                <div
                  key={reward.id}
                  className="flex items-center gap-3 rounded-xl bg-dark-teal border border-white/5 p-3"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${REWARD_COLORS[reward.reward_type] || 'from-gray-400 to-gray-500'} flex items-center justify-center shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{reward.reward_name}</p>
                    <p className="text-xs text-cream/60">{format(new Date(reward.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${reward.status === 'delivered' ? 'text-green-400 bg-green-400/10 border border-green-400/30' : 'text-copper bg-copper/10 border border-copper/30'}`}>
                    {reward.status === 'delivered' ? 'Delivered' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Spin Result Modal – cannot be dismissed except via OK button */}
      {spinResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm shadow-2xl rounded-2xl overflow-hidden animate-scale-in bg-dark-teal border border-white/10">
            <div className="copper-gradient p-8 text-center text-white">
              <PartyPopper className="h-14 w-14 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
              <p className="text-white/80 text-sm">You've won a reward!</p>
            </div>
            <div className="p-6 text-center">
              <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${REWARD_COLORS[spinResult.reward_type || 'surprise_gift']} flex items-center justify-center shadow-lg mb-4`}>
                {(() => {
                  const Icon = REWARD_ICONS[spinResult.reward_type || 'surprise_gift'] || Gift;
                  return <Icon className="h-10 w-10 text-white" />;
                })()}
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">You've won: {spinResult.reward_name}</h3>
              <p className="text-sm text-cream/80 mb-5">{spinResult.reward_description}</p>
              
              <div className="bg-copper/10 border border-copper/30 rounded-xl p-4 mb-5">
                <p className="text-sm text-cream font-medium">
                  Our YaatraBuddy team will contact you shortly.
                </p>
              </div>
              
              <button
                type="button"
                className="w-full copper-gradient text-white font-bold py-3 rounded-xl text-base"
                onClick={() => setSpinResult(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>
    </AppShell>
  );
}
