import { useState, useRef } from 'react';
import { Smartphone, Tv, ShoppingBag, Banknote, Package } from 'lucide-react';

interface TravelSpinWheelProps {
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

const SEGMENT_COUNT = 5;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

const REWARDS = [
  { type: 'mobile_recharge', name: 'Mobile Recharge', short: 'Mobile', icon: Smartphone, color: '#3b82f6' },
  { type: 'ott_subscription', name: 'OTT Premium', short: 'OTT', icon: Tv, color: '#a855f7' },
  { type: 'myntra_coupon', name: 'Myntra ₹300', short: 'Myntra', icon: ShoppingBag, color: '#ec4899' },
  { type: 'upi_cash', name: 'UPI ₹300', short: 'UPI', icon: Banknote, color: '#22c55e' },
  { type: 'surprise_gift', name: 'Surprise Gift', short: 'Gift', icon: Package, color: '#f97316' },
];

// Segment center angles (deg): 36, 108, 180, 252, 324
// Icons are placed by centering the block on the ray at 38% from wheel center

export function TravelSpinWheel({ onSpin, spinning, disabled, onSpinComplete }: TravelSpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = async () => {
    if (spinning || disabled || isSpinning) return;

    setIsSpinning(true);
    setErrorMessage(null);

    const spinDuration = 5000 + Math.floor(Math.random() * 1000);
    setDuration(spinDuration);

    const spinResult = await onSpin();

    if (spinResult?.success && spinResult.reward_type) {
      // Map backend reward_type to wheel segment index (must match backend order: mobile, OTT, Myntra, UPI, surprise)
      let rewardIndex = REWARDS.findIndex((r) => r.type === spinResult.reward_type);
      if (rewardIndex < 0) rewardIndex = Math.floor(Math.random() * REWARDS.length);
      const segmentAngle = 360 / SEGMENT_COUNT;
      const finalAngle = rewardIndex * segmentAngle + segmentAngle / 2;
      const fullSpins = (4 + Math.floor(Math.random() * 3)) * 360;
      const targetRotation = fullSpins + (360 - finalAngle);

      setRotation((prev) => prev + targetRotation);

      setTimeout(() => {
        setIsSpinning(false);
        onSpinComplete?.({
          reward_name: spinResult.reward_name,
          reward_description: spinResult.reward_description,
          reward_type: spinResult.reward_type,
        });
      }, spinDuration);
    } else {
      setDuration(1500);
      setRotation((prev) => prev + 720);
      setErrorMessage(spinResult?.error_message ?? null);
      setTimeout(() => {
        setIsSpinning(false);
        setErrorMessage(null);
      }, 1500);
    }
  };

  const conicGradient = REWARDS.map(
    (r, i) => `${r.color} ${i * SEGMENT_ANGLE}deg ${(i + 1) * SEGMENT_ANGLE}deg`
  ).join(', ');

  return (
    <div className="relative flex flex-col items-center py-2">
      {/* Pointer at top – triangle and dot aligned on same vertical axis */}
      <div className="absolute top-0 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center justify-center" aria-hidden>
        <div className="flex justify-center" style={{ width: 22 }}>
          <div className="h-0 w-0 border-l-[11px] border-r-[11px] border-t-[18px] border-l-transparent border-r-transparent border-t-white drop-shadow-md" />
        </div>
        <div className="-mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-yellow-500 shadow-sm" />
      </div>

      {/* Wheel container – match reference max-w and aspect-square */}
      <div className="relative w-full max-w-[320px] aspect-square mx-auto">
        {/* Outer ring – subtle on dark teal */}
        <div className="absolute inset-0 rounded-full border-4 border-white/15 shadow-inner z-0" />
        <div className="absolute -inset-3 rounded-full bg-white/5 blur-xl z-0" />

        {/* Wheel disc: conic gradient + rotation */}
        <div
          ref={wheelRef}
          className="absolute inset-0 rounded-full overflow-hidden shadow-xl z-10"
          style={{
            background: `conic-gradient(from 0deg, ${conicGradient})`,
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? `transform ${duration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
              : 'none',
            willChange: isSpinning ? 'transform' : 'auto',
          }}
        >
          {/* Segment divider lines – from center, short so they don’t cross icons */}
          {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-px origin-bottom -translate-x-px z-0"
              style={{
                height: '40%',
                transform: `translateX(-50%) rotate(${i * SEGMENT_ANGLE}deg)`,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 100%)',
              }}
            />
          ))}

          {/* One icon + label per segment – block center on ray at 38% from wheel center */}
          {REWARDS.map((reward, index) => {
            const angleDeg = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2; // 36, 108, 180, 252, 324
            const Icon = reward.icon;
            return (
              <div
                key={reward.type}
                className="absolute left-1/2 top-1/2 z-10 flex h-full w-full items-center justify-center"
                style={{ transform: `translate(-50%, -50%) rotate(${angleDeg}deg) translateY(-38%)` }}
              >
                <div
                  className="flex flex-col items-center justify-center gap-1"
                  style={{ transform: `rotate(-${angleDeg}deg)` }}
                >
                  <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/50 bg-white/20 shadow-md">
                    <Icon className="h-4 w-4 flex-shrink-0 text-white drop-shadow-md" strokeWidth={2} />
                  </div>
                  <span
                    className="max-w-[60px] text-center text-[10px] font-bold leading-tight text-white drop-shadow-md truncate"
                    title={reward.name}
                  >
                    {reward.short}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: outer ring then button – reference style */}
        <div className="absolute top-1/2 left-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white/40 bg-white/30 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={handleSpin}
            disabled={disabled || spinning || isSpinning}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 shadow-inner transition-transform hover:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-deep-teal"
          >
            {isSpinning ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Spinning...</span>
            ) : (
              <>
                <span className="text-white font-black text-xl tracking-wider drop-shadow-sm">SPIN</span>
                <span className="text-white/80 text-[10px] font-medium tracking-wide">TAP TO WIN</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message when spin fails */}
      {errorMessage && (
        <p className="absolute left-1/2 -translate-x-1/2 -bottom-8 w-full max-w-[240px] text-center text-xs text-red-300 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2 z-20">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
