import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gift, Smartphone, Tv, ShoppingBag, Banknote, Package } from 'lucide-react';

interface SpinWheelProps {
  onSpin: () => Promise<{
    success: boolean;
    reward_type: string | null;
    reward_name: string | null;
    reward_description: string | null;
    error_message: string | null;
  } | null>;
  spinning: boolean;
  disabled: boolean;
}

const REWARDS = [
  { type: 'mobile_recharge', name: 'Mobile Recharge', icon: Smartphone, color: 'bg-blue-500' },
  { type: 'ott_subscription', name: 'OTT Subscription', icon: Tv, color: 'bg-purple-500' },
  { type: 'myntra_coupon', name: 'Myntra Coupon', icon: ShoppingBag, color: 'bg-pink-500' },
  { type: 'upi_cash', name: 'UPI Cash', icon: Banknote, color: 'bg-green-500' },
  { type: 'surprise_gift', name: 'Surprise Gift', icon: Package, color: 'bg-orange-500' },
];

export function SpinWheel({ onSpin, spinning, disabled }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{
    reward_name: string | null;
    reward_description: string | null;
    reward_type: string | null;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = async () => {
    if (spinning || disabled) return;

    setShowResult(false);
    setResult(null);

    // Start spinning animation
    const randomSpins = 5 + Math.random() * 3; // 5-8 full rotations
    const baseRotation = randomSpins * 360;

    // Pre-spin to build anticipation
    setRotation(prev => prev + baseRotation);

    // Call the actual spin function
    const spinResult = await onSpin();

    if (spinResult?.success && spinResult.reward_type) {
      // Find reward index and calculate final position
      const rewardIndex = REWARDS.findIndex(r => r.type === spinResult.reward_type);
      const segmentAngle = 360 / REWARDS.length;
      const finalAngle = rewardIndex * segmentAngle + segmentAngle / 2;
      
      // Adjust rotation to land on the correct segment
      setRotation(prev => {
        const currentRotation = prev % 360;
        const adjustment = (360 - finalAngle) - currentRotation + 360;
        return prev + adjustment + 360; // Add extra rotation for effect
      });

      // Show result after animation
      setTimeout(() => {
        setResult({
          reward_name: spinResult.reward_name,
          reward_description: spinResult.reward_description,
          reward_type: spinResult.reward_type,
        });
        setShowResult(true);
      }, 4000);
    }
  };

  const getRewardIcon = (type: string | null) => {
    const reward = REWARDS.find(r => r.type === type);
    if (!reward) return Gift;
    return reward.icon;
  };

  return (
    <Card className="border-border shadow-elevated">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Gift className="h-6 w-6 text-primary" />
          Spin & Win
        </CardTitle>
        <CardDescription>
          Spin the wheel to win amazing rewards!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        {/* Wheel Container */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full border-4 border-primary/20 shadow-xl overflow-hidden transition-transform duration-[4000ms] ease-out"
            style={{
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(
                from 0deg,
                #3b82f6 0deg 72deg,
                #a855f7 72deg 144deg,
                #ec4899 144deg 216deg,
                #22c55e 216deg 288deg,
                #f97316 288deg 360deg
              )`,
            }}
          >
            {/* Reward Labels */}
            {REWARDS.map((reward, index) => {
              const angle = (index * 72) + 36; // Center of each segment
              const Icon = reward.icon;
              return (
                <div
                  key={reward.type}
                  className="absolute w-full h-full flex items-center justify-center"
                  style={{
                    transform: `rotate(${angle}deg)`,
                  }}
                >
                  <div
                    className="absolute flex flex-col items-center gap-1"
                    style={{
                      top: '15%',
                      transform: `rotate(-${angle}deg)`,
                    }}
                  >
                    <Icon className="h-6 w-6 text-white drop-shadow-md" />
                    <span className="text-[10px] font-bold text-white drop-shadow-md text-center max-w-[60px] leading-tight">
                      {reward.name}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center shadow-lg">
              <Gift className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={disabled || spinning}
          size="lg"
          variant="hero"
          className="min-w-[200px]"
        >
          {spinning ? 'Spinning...' : disabled ? 'Spin Locked' : 'SPIN NOW!'}
        </Button>

        {/* Result Display */}
        {showResult && result && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    {(() => {
                      const Icon = getRewardIcon(result.reward_type);
                      return <Icon className="h-8 w-8 text-primary" />;
                    })()}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    🎉 Congratulations! 🎉
                  </h3>
                  <p className="text-lg font-semibold text-primary">
                    {result.reward_name}
                  </p>
                  <p className="text-muted-foreground">
                    {result.reward_description}
                  </p>
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      🎁 Our YaatraBuddy team will contact you shortly to deliver your reward!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
