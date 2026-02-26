import { useEffect, useState } from 'react';
import { Car, MapPin, Star, Users } from 'lucide-react';

export function TravelHeroAnimation() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const phases = [0, 1, 2, 3, 4];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % phases.length;
      setPhase(phases[currentIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto h-48 md:h-56">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-travel-float"
            style={{
              left: `${10 + (i * 12)}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              opacity: 0.4,
            }}
          >
            {i % 3 === 0 ? (
              <MapPin className="h-4 w-4 text-yellow-300" />
            ) : i % 3 === 1 ? (
              <Star className="h-3 w-3 text-white" />
            ) : (
              <Car className="h-4 w-4 text-orange-200" />
            )}
          </div>
        ))}
      </div>

      {/* Animation container */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Left person */}
        <div
          className={`absolute transition-all duration-1000 ease-out ${
            phase >= 1 ? 'left-1/3 opacity-100' : 'left-0 opacity-0'
          }`}
          style={{ top: '40%' }}
        >
          <div className="flex flex-col items-center">
            {/* Person icon */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            {/* Bag */}
            <div className="w-4 h-3 bg-orange-300 rounded-sm mt-1" />
          </div>
        </div>

        {/* Right person */}
        <div
          className={`absolute transition-all duration-1000 ease-out ${
            phase >= 1 ? 'right-1/3 opacity-100' : 'right-0 opacity-0'
          }`}
          style={{ top: '40%' }}
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="w-4 h-3 bg-indigo-300 rounded-sm mt-1" />
          </div>
        </div>

        {/* Handshake / Meeting point */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 transition-all duration-700 ${
            phase >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{ top: '35%' }}
        >
          <div className="text-3xl">🤝</div>
        </div>

        {/* Car appears */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 transition-all duration-1000 ${
            phase >= 3 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-4'
          }`}
          style={{ top: '50%' }}
        >
          <div className="relative">
            {/* Car glow */}
            <div className={`absolute inset-0 bg-yellow-400/30 rounded-full blur-xl transition-opacity duration-500 ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`} />
            
            {/* Car */}
            <div className="relative w-20 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow-xl flex items-center justify-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-indigo-400 rounded-t-lg" />
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-yellow-300 rounded-full" />
                <div className="w-3 h-3 bg-yellow-300 rounded-full" />
              </div>
              {/* Wheels */}
              <div className="absolute -bottom-2 left-2 w-4 h-4 bg-gray-800 rounded-full border-2 border-gray-600" />
              <div className="absolute -bottom-2 right-2 w-4 h-4 bg-gray-800 rounded-full border-2 border-gray-600" />
            </div>
          </div>
        </div>

        {/* Spin wheel glow behind */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 transition-all duration-1000 ${
            phase >= 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
          style={{ top: '25%' }}
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 opacity-60 blur-lg animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center shadow-lg animate-spin-slow" style={{ animationDuration: '8s' }}>
                <span className="text-lg">🎡</span>
              </div>
            </div>
          </div>
        </div>

        {/* Journey text fade in */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-4 transition-all duration-1000 ${
            phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-white/90 text-sm font-medium tracking-wide text-center whitespace-nowrap">
            ✨ Your journey unlocks rewards ✨
          </p>
        </div>
      </div>
    </div>
  );
}
