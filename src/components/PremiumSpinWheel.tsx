import { useState, useRef } from 'react';
import { Gift, Smartphone, Tv, ShoppingBag, Banknote, Package, Sparkles } from 'lucide-react';

interface PremiumSpinWheelProps {
  onSpin: () => Promise<{
    success: boolean;
    reward_type: string | null;
    reward_name: string | null;
    reward_description: string | null;
    error_message: string | null;
  } | null>;
  spinning: boolean;
  disabled: boolean;
  onSpinComplete?: (result: {
    reward_name: string | null;
    reward_description: string | null;
    reward_type: string | null;
  }) => void;
}

const REWARDS = [
  { type: 'mobile_recharge', name: 'Mobile\nRecharge', icon: Smartphone, color: '#3b82f6' },
  { type: 'ott_subscription', name: 'OTT\nSubscription', icon: Tv, color: '#a855f7' },
  { type: 'myntra_coupon', name: 'Myntra\nCoupon', icon: ShoppingBag, color: '#ec4899' },
  { type: 'upi_cash', name: '₹300\nUPI Cash', icon: Banknote, color: '#22c55e' },
  { type: 'surprise_gift', name: 'Surprise\nGift', icon: Package, color: '#f97316' },
];

export function PremiumSpinWheel({ onSpin, spinning, disabled, onSpinComplete }: PremiumSpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = async () => {
    if (spinning || disabled || isSpinning) return;

    setIsSpinning(true);

    // Start with random spins
    const randomSpins = 5 + Math.random() * 3;
    const baseRotation = randomSpins * 360;

    setRotation(prev => prev + baseRotation);

    // Call the actual spin function
    const spinResult = await onSpin();

    if (spinResult?.success && spinResult.reward_type) {
      const rewardIndex = REWARDS.findIndex(r => r.type === spinResult.reward_type);
      const segmentAngle = 360 / REWARDS.length;
      const finalAngle = rewardIndex * segmentAngle + segmentAngle / 2;
      
      setRotation(prev => {
        const currentRotation = prev % 360;
        const adjustment = (360 - finalAngle) - currentRotation + 360;
        return prev + adjustment + 360;
      });

      setTimeout(() => {
        setIsSpinning(false);
        onSpinComplete?.({
          reward_name: spinResult.reward_name,
          reward_description: spinResult.reward_description,
          reward_type: spinResult.reward_type,
        });
      }, 4000);
    } else {
      setIsSpinning(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Sparkles around the wheel */}
      <div className="absolute -top-4 -left-4 text-yellow-400 animate-sparkle" style={{ animationDelay: '0s' }}>
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="absolute -top-4 -right-4 text-purple-400 animate-sparkle" style={{ animationDelay: '0.5s' }}>
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="absolute -bottom-4 -left-4 text-orange-400 animate-sparkle" style={{ animationDelay: '1s' }}>
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="absolute -bottom-4 -right-4 text-pink-400 animate-sparkle" style={{ animationDelay: '0.3s' }}>
        <Sparkles className="h-6 w-6" />
      </div>

      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-orange-500 to-yellow-500 blur-xl opacity-30 animate-pulse" />
      
      {/* Wheel Container */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
          <div className="relative">
            <div className="w-0 h-0 border-l-[18px] border-r-[18px] border-t-[30px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-200" />
          </div>
        </div>

        {/* Outer ring decoration */}
        <div className="absolute inset-0 rounded-full border-[6px] border-yellow-400/50 shadow-glow-gold" />
        
        {/* Wheel */}
        <div
          ref={wheelRef}
          className="w-full h-full rounded-full overflow-hidden transition-transform duration-[4000ms] ease-out shadow-2xl"
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
            const angle = (index * 72) + 36;
            const Icon = reward.icon;
            return (
              <div
                key={reward.type}
                className="absolute w-full h-full flex items-center justify-center"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div
                  className="absolute flex flex-col items-center gap-1"
                  style={{
                    top: '12%',
                    transform: `rotate(-${angle}deg)`,
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Icon className="h-5 w-5 text-white drop-shadow-md" />
                  </div>
                  <span className="text-[9px] font-bold text-white drop-shadow-md text-center leading-tight whitespace-pre-line">
                    {reward.name}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Wheel segments dividers */}
          {[0, 72, 144, 216, 288].map((angle) => (
            <div
              key={angle}
              className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-white/30 origin-bottom"
              style={{ transform: `rotate(${angle}deg)` }}
            />
          ))}
        </div>

        {/* Center button */}
        <button
          onClick={handleSpin}
          disabled={disabled || spinning || isSpinning}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 z-10 ${
            disabled || spinning || isSpinning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:scale-105 cursor-pointer animate-pulse-glow'
          }`}
        >
          <div className="flex flex-col items-center">
            <Gift className="h-6 w-6 text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">
              {isSpinning ? 'SPINNING' : 'SPIN'}
            </span>
          </div>
        </button>

        {/* Inner ring decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-white/20 pointer-events-none" />
      </div>
    </div>
  );
}
