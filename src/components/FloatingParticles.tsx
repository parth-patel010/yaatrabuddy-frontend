import { useEffect, useState } from 'react';
import { Car, MapPin, Star } from 'lucide-react';

interface Particle {
  id: number;
  Icon: React.ElementType;
  left: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
}

const PARTICLE_ICONS = [MapPin, Car, Star];
const COLORS = ['text-yellow-300', 'text-orange-300', 'text-white/60', 'text-amber-200'];

export function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: i,
        Icon: PARTICLE_ICONS[i % PARTICLE_ICONS.length],
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 6 + Math.random() * 4,
        size: 12 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-travel-float"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        >
          <particle.Icon
            className={`${particle.color} opacity-50`}
            style={{ width: particle.size, height: particle.size }}
          />
        </div>
      ))}
    </div>
  );
}
