import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'confetti' | 'coin' | 'sparkle' | 'leaf' | 'bubble';
  color: string;
  size: number;
}

interface VisualEffectsProps {
  triggerConfetti?: boolean;
  triggerCoins?: boolean;
  triggerSparkles?: boolean;
  ambientParticles?: boolean;
  gameActive?: boolean;
}

export const VisualEffects: React.FC<VisualEffectsProps> = ({
  triggerConfetti = false,
  triggerCoins = false,
  triggerSparkles = false,
  ambientParticles = true,
  gameActive = false
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  // Create particles based on triggers
  useEffect(() => {
    if (triggerConfetti) {
      createConfettiParticles();
    }
  }, [triggerConfetti]);

  useEffect(() => {
    if (triggerCoins) {
      createCoinParticles();
    }
  }, [triggerCoins]);

  useEffect(() => {
    if (triggerSparkles) {
      createSparkleParticles();
    }
  }, [triggerSparkles]);

  // Ambient particles during gameplay
  useEffect(() => {
    if (!ambientParticles || !gameActive) return;

    const interval = setInterval(() => {
      createAmbientParticles();
    }, 2000);

    return () => clearInterval(interval);
  }, [ambientParticles, gameActive]);

  // Particle animation loop
  useEffect(() => {
    const animationFrame = setInterval(() => {
      setParticles(prev => 
        prev
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.2, // gravity
            life: particle.life - 1
          }))
          .filter(particle => particle.life > 0 && particle.y < window.innerHeight + 50)
      );
    }, 16); // ~60fps

    return () => clearInterval(animationFrame);
  }, []);

  const createConfettiParticles = () => {
    const newParticles: Particle[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: `confetti-${Date.now()}-${i}`,
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1,
        life: 180,
        maxLife: 180,
        type: 'confetti',
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  const createCoinParticles = () => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        id: `coin-${Date.now()}-${i}`,
        x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.3,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 4 - 2,
        life: 150,
        maxLife: 150,
        type: 'coin',
        color: '#FFD700',
        size: Math.random() * 6 + 8
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  const createSparkleParticles = () => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: `sparkle-${Date.now()}-${i}`,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * 0.7,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 1,
        life: 120,
        maxLife: 120,
        type: 'sparkle',
        color: '#FFFFFF',
        size: Math.random() * 4 + 2
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  const createAmbientParticles = () => {
    const newParticles: Particle[] = [];
    const types: Array<'leaf' | 'bubble'> = ['leaf', 'bubble'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    for (let i = 0; i < 3; i++) {
      newParticles.push({
        id: `ambient-${Date.now()}-${i}`,
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 1,
        vy: Math.random() * 0.5 + 0.5,
        life: 300,
        maxLife: 300,
        type,
        color: type === 'leaf' ? '#22C55E' : '#3B82F6',
        size: Math.random() * 6 + 4
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  const getParticleStyle = (particle: Particle) => {
    const opacity = particle.life / particle.maxLife;
    const scale = particle.type === 'coin' ? 
      Math.sin((particle.maxLife - particle.life) * 0.1) * 0.3 + 0.7 : 1;

    return {
      position: 'absolute' as const,
      left: particle.x,
      top: particle.y,
      width: particle.size,
      height: particle.size,
      backgroundColor: particle.color,
      opacity,
      transform: `scale(${scale}) rotate(${(particle.maxLife - particle.life) * 2}deg)`,
      borderRadius: particle.type === 'coin' || particle.type === 'bubble' ? '50%' : '2px',
      border: particle.type === 'coin' ? '2px solid #B8860B' : 'none',
      boxShadow: particle.type === 'sparkle' ? '0 0 10px currentColor' : 'none',
      pointerEvents: 'none' as const,
      zIndex: 100
    };
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            style={getParticleStyle(particle)}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {particle.type === 'coin' && (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-amber-800">
                $
              </div>
            )}
            {particle.type === 'sparkle' && (
              <div className="w-full h-full flex items-center justify-center text-white">
                ✨
              </div>
            )}
            {particle.type === 'leaf' && (
              <div className="w-full h-full flex items-center justify-center text-green-600">
                🍃
              </div>
            )}
            {particle.type === 'bubble' && (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-300 to-blue-500 opacity-60 border border-blue-400" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}; 