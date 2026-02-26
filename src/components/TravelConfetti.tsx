import { useEffect, useState } from 'react';
import { Car, Luggage, MapPin, Plane, Users, Gift, Star } from 'lucide-react';

interface ConfettiPiece {
  id: number;
  type: 'icon' | 'shape';
  Icon?: React.ElementType;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

interface TravelConfettiProps {
  active: boolean;
  duration?: number;
}

const TRAVEL_ICONS = [Car, Luggage, MapPin, Plane, Users, Gift, Star];

const COLORS = [
  'hsl(280, 70%, 50%)', // Purple
  'hsl(25, 95%, 55%)',  // Orange
  'hsl(45, 100%, 55%)', // Yellow
  'hsl(174, 55%, 45%)', // Teal
  'hsl(340, 80%, 60%)', // Pink
  'hsl(200, 80%, 50%)', // Blue
];

export function TravelConfetti({ active, duration = 4000 }: TravelConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = [];
      
      // Add travel icons
      for (let i = 0; i < 20; i++) {
        newPieces.push({
          id: i,
          type: 'icon',
          Icon: TRAVEL_ICONS[Math.floor(Math.random() * TRAVEL_ICONS.length)],
          left: Math.random() * 100,
          delay: Math.random() * 0.8,
          duration: 2.5 + Math.random() * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 16 + Math.random() * 12,
          rotation: Math.random() * 360,
        });
      }
      
      // Add regular confetti shapes
      for (let i = 20; i < 60; i++) {
        newPieces.push({
          id: i,
          type: 'shape',
          left: Math.random() * 100,
          delay: Math.random() * 0.6,
          duration: 2 + Math.random() * 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 10,
          rotation: Math.random() * 360,
        });
      }
      
      setPieces(newPieces);

      const timeout = setTimeout(() => {
        setPieces([]);
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [active, duration]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0"
          style={{
            left: `${piece.left}%`,
            animation: `travel-confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
          }}
        >
          {piece.type === 'icon' && piece.Icon ? (
            <piece.Icon
              style={{
                width: piece.size,
                height: piece.size,
                color: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          ) : (
            <div
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
