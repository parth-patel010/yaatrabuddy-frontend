import { useEffect, useState } from 'react';
import { Car, Luggage, MapPin, Plane, Users } from 'lucide-react';

interface FloatingIcon {
  id: number;
  Icon: React.ElementType;
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

const TRAVEL_ICONS = [Car, Luggage, MapPin, Plane, Users];

export function TravelFloatingIcons() {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    const newIcons: FloatingIcon[] = [];
    for (let i = 0; i < 15; i++) {
      newIcons.push({
        id: i,
        Icon: TRAVEL_ICONS[i % TRAVEL_ICONS.length],
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 8 + Math.random() * 6,
        size: 16 + Math.random() * 20,
        opacity: 0.15 + Math.random() * 0.2,
      });
    }
    setIcons(newIcons);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="absolute animate-travel-float"
          style={{
            left: `${icon.left}%`,
            top: `${icon.top}%`,
            animationDelay: `${icon.delay}s`,
            animationDuration: `${icon.duration}s`,
            opacity: icon.opacity,
          }}
        >
          <icon.Icon
            className="text-white"
            style={{ width: icon.size, height: icon.size }}
          />
        </div>
      ))}

      {/* Flight path dotted lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
        <defs>
          <pattern id="flight-dash" patternUnits="userSpaceOnUse" width="12" height="1">
            <rect x="0" y="0" width="6" height="1" fill="white" />
          </pattern>
        </defs>
        <path
          d="M-50,100 Q200,50 400,150 T800,100"
          fill="none"
          stroke="url(#flight-dash)"
          strokeWidth="2"
          className="animate-flight-path"
        />
        <path
          d="M-100,200 Q300,120 500,200 T900,150"
          fill="none"
          stroke="url(#flight-dash)"
          strokeWidth="2"
          className="animate-flight-path"
          style={{ animationDelay: '3s' }}
        />
      </svg>

      {/* Moving road lines */}
      <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden opacity-20">
        <div className="flex gap-8 animate-road-move">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-12 h-1 bg-white rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
