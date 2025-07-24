import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';

interface AddictiveEnhancementsProps {
  gameState: {
    isGameActive: boolean;
    gameTime: number;
    riskMultiplier: number;
    currentPayout: number;
  };
  gameResult?: {
    outcome: 'win' | 'loss';
    payout: number;
    squirrelTime?: number;
  } | undefined;
  onPlayAgain: () => void;
}

interface GameStreak {
  wins: number;
  totalGames: number;
  bestMultiplier: number;
  hotStreak: number;
}

export const AddictiveEnhancements: React.FC<AddictiveEnhancementsProps> = ({
  gameState,
  gameResult,
  onPlayAgain
}) => {
  const [streak, setStreak] = useState<GameStreak>({ 
    wins: 0, 
    totalGames: 0, 
    bestMultiplier: 1, 
    hotStreak: 0 
  });
  const [nearMiss, setNearMiss] = useState<{
    triggered: boolean;
    timeLeft: number;
    intensity: number;
  }>({ triggered: false, timeLeft: 0, intensity: 0 });
  const [tensionLevel, setTensionLevel] = useState(0);
  const [showFOMO, setShowFOMO] = useState(false);
  const [lastPayoutFlash, setLastPayoutFlash] = useState(0);
  const [psychWarnings, setPsychWarnings] = useState<string[]>([]);
  
  const audioContext = useRef<AudioContext | null>(null);
  const lastGameTime = useRef(0);

  // Initialize Web Audio for psychological sound effects
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  // Enhanced heartbeat with psychological escalation
  const playPsychologicalAudio = (type: 'heartbeat' | 'nearMiss' | 'tension' | 'celebration', intensity: number = 1): void => {
    if (!audioContext.current) return;

    const ctx = audioContext.current;
    const now = ctx.currentTime;

    switch (type) {
      case 'heartbeat':
        // Dramatic bass thump that gets more intense
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.connect(bassGain);
        bassGain.connect(ctx.destination);
        
        bass.frequency.setValueAtTime(40 + intensity * 20, now);
        bassGain.gain.setValueAtTime(0.3 * intensity, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        bass.start(now);
        bass.stop(now + 0.3);
        break;

      case 'nearMiss':
        // Sharp, anxiety-inducing sound
        const warning = ctx.createOscillator();
        const warningGain = ctx.createGain();
        warning.connect(warningGain);
        warningGain.connect(ctx.destination);
        
        warning.frequency.setValueAtTime(800, now);
        warning.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        warningGain.gain.setValueAtTime(0.2, now);
        warningGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        warning.start(now);
        warning.stop(now + 0.2);
        break;

      case 'tension':
        // Rising tension drone
        const drone = ctx.createOscillator();
        const droneGain = ctx.createGain();
        drone.connect(droneGain);
        droneGain.connect(ctx.destination);
        
        drone.frequency.setValueAtTime(200, now);
        drone.frequency.linearRampToValueAtTime(200 + intensity * 100, now + 1);
        droneGain.gain.setValueAtTime(0.1, now);
        droneGain.gain.linearRampToValueAtTime(0.15 * intensity, now + 1);
        
        drone.start(now);
        drone.stop(now + 1);
        break;

      case 'celebration':
        // Satisfying victory chime
        [523, 659, 784].forEach((freq, i) => {
          const note = ctx.createOscillator();
          const noteGain = ctx.createGain();
          note.connect(noteGain);
          noteGain.connect(ctx.destination);
          
          note.frequency.setValueAtTime(freq, now + i * 0.1);
          noteGain.gain.setValueAtTime(0.2, now + i * 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
          
          note.start(now + i * 0.1);
          note.stop(now + i * 0.1 + 0.5);
        });
        break;
    }
  };

  // Track game results and build psychological profile
  useEffect(() => {
    if (gameResult) {
      setStreak(prev => {
        const newStreak = {
          wins: gameResult.outcome === 'win' ? prev.wins + 1 : prev.wins,
          totalGames: prev.totalGames + 1,
          bestMultiplier: Math.max(prev.bestMultiplier, gameResult.payout / 100),
          hotStreak: gameResult.outcome === 'win' ? prev.hotStreak + 1 : 0
        };

        // Psychological hooks based on results
        if (gameResult.outcome === 'loss' && gameResult.squirrelTime) {
          // Near miss detection - creates "almost won" feeling
          if (gameResult.squirrelTime >= 15) {
            setNearMiss({
              triggered: true,
              timeLeft: gameResult.squirrelTime,
              intensity: Math.min(gameResult.squirrelTime / 30, 1)
            });
            playPsychologicalAudio('nearMiss', 1);
            
            // Add FOMO trigger
            setTimeout(() => {
              setShowFOMO(true);
              setTimeout(() => setShowFOMO(false), 5000);
            }, 2000);
          }
          
          // Add psychological pressure based on streak
          if (prev.hotStreak >= 3) {
            setPsychWarnings(prev => [...prev, "You were on fire! Don't let the streak end!"]);
          }
          if (newStreak.totalGames % 5 === 0) {
            setPsychWarnings(prev => [...prev, "Other players are winning big right now..."]);
          }
        } else if (gameResult.outcome === 'win') {
          playPsychologicalAudio('celebration', Math.min(gameResult.payout / 500, 1));
          
          // Positive reinforcement hooks
          if (newStreak.hotStreak >= 5) {
            setPsychWarnings(prev => [...prev, "🔥 You're unstoppable! Keep the streak alive!"]);
          }
          if (gameResult.payout > 1000) {
            setPsychWarnings(prev => [...prev, "💰 Big win! You're in the zone!"]);
          }
        }

        return newStreak;
      });

      // Clear near miss after showing it
      setTimeout(() => {
        setNearMiss(prev => ({ ...prev, triggered: false }));
      }, 4000);
    }
  }, [gameResult]);

  // Real-time tension building during gameplay
  useEffect(() => {
    if (!gameState.isGameActive) {
      setTensionLevel(0);
      return;
    }

    const risk = gameState.riskMultiplier;
    const time = gameState.gameTime;
    
    // Build tension based on multiple factors
    const timeBonus = Math.min(time / 30, 1); // Longer = more tense
    const riskBonus = Math.min((risk - 1) * 2, 1); // Higher risk = more tense
    const payoutBonus = Math.min(gameState.currentPayout / 2000, 1); // Higher payout = more to lose
    
    const newTension = Math.min((timeBonus + riskBonus + payoutBonus) / 3, 1);
    setTensionLevel(newTension);
    
    // Escalating audio cues
    if (risk > 1.8 && time !== lastGameTime.current) {
      playPsychologicalAudio('heartbeat', newTension);
      lastGameTime.current = time;
    }
    
    if (risk > 2.2) {
      playPsychologicalAudio('tension', newTension);
    }

    // Payout flash effect for addiction
    if (gameState.currentPayout !== lastPayoutFlash) {
      setLastPayoutFlash(gameState.currentPayout);
    }
  }, [gameState]);

  // Clear psychological warnings periodically
  useEffect(() => {
    if (psychWarnings.length > 0) {
      const timer = setTimeout(() => {
        setPsychWarnings(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [psychWarnings]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Tension Overlay - Gets more intense with risk */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: tensionLevel * 0.3,
          scale: 1 + tensionLevel * 0.02
        }}
        style={{
          background: `radial-gradient(circle at center, 
            rgba(239, 68, 68, ${tensionLevel * 0.4}) 0%, 
            transparent 60%)`
        }}
      />

      {/* Streak Counter - Builds progression addiction */}
      {(streak.hotStreak > 0 || streak.totalGames > 0) && (
        <motion.div
          className="absolute top-20 left-4 pointer-events-auto"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <div className="bg-black bg-opacity-80 rounded-xl p-4 border-2 border-purple-500 shadow-2xl">
            <div className="flex items-center space-x-3">
              <Flame className={`${streak.hotStreak > 2 ? 'text-orange-400 animate-pulse' : 'text-gray-400'}`} size={24} />
              <div>
                <div className="text-white font-bold text-lg">
                  {streak.hotStreak > 0 ? `🔥 ${streak.hotStreak} Win Streak!` : 'Stats'}
                </div>
                <div className="text-gray-300 text-sm">
                  {streak.wins}/{streak.totalGames} wins • Best: {streak.bestMultiplier.toFixed(2)}x
                </div>
                {streak.hotStreak >= 5 && (
                  <div className="text-yellow-400 text-xs font-bold animate-bounce">
                    ⚡ ON FIRE! ⚡
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Near Miss Psychology - "You almost won!" */}
      <AnimatePresence>
        {nearMiss.triggered && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-auto"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 border-4 border-yellow-400 shadow-2xl max-w-md mx-4"
              animate={{ 
                scale: [1, 1.05, 1],
                boxShadow: [
                  '0 0 30px rgba(251, 191, 36, 0.5)',
                  '0 0 50px rgba(251, 191, 36, 0.8)',
                  '0 0 30px rgba(251, 191, 36, 0.5)'
                ]
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div className="text-center">
                <motion.div
                  className="text-6xl mb-4"
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  😱
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">SO CLOSE!</h2>
                <p className="text-yellow-200 text-lg mb-4">
                  You lasted {nearMiss.timeLeft} seconds!
                </p>
                <div className="text-sm text-yellow-100 mb-4">
                  Just {Math.round((30 - nearMiss.timeLeft) * 10) / 10}s away from a massive payout!
                </div>
                <motion.button
                  onClick={onPlayAgain}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl transition-colors pointer-events-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Try Again - You Can Do It!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOMO Trigger - "Others are winning!" */}
      <AnimatePresence>
        {showFOMO && (
          <motion.div
            className="absolute top-1/3 right-4 pointer-events-auto"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 border-2 border-green-400 shadow-xl max-w-sm"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="text-green-200" size={24} />
                <div>
                  <div className="text-white font-bold">🔥 Hot Streak Alert!</div>
                  <div className="text-green-200 text-sm">
                    Player just won $47.50 in 23s!
                  </div>
                  <div className="text-green-100 text-xs">
                    Don't miss out on the action!
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Psychological Warnings/Encouragement */}
      <AnimatePresence>
        {psychWarnings.map((warning, index) => (
          <motion.div
            key={`warning-${index}`}
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-auto"
            initial={{ y: 50, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 border-2 border-purple-400 shadow-2xl"
              animate={{ 
                scale: [1, 1.02, 1],
                boxShadow: [
                  '0 0 20px rgba(147, 51, 234, 0.4)',
                  '0 0 30px rgba(147, 51, 234, 0.6)',
                  '0 0 20px rgba(147, 51, 234, 0.4)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="text-white font-semibold text-center">
                {warning}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Tension Pulse Ring - Visual feedback for escalating risk */}
      {tensionLevel > 0.5 && gameState.isGameActive && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ 
            scale: [1, 1.02, 1],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ 
            duration: Math.max(0.5, 2 - tensionLevel * 1.5), 
            repeat: Infinity 
          }}
        >
          <div className="absolute inset-4 border-4 border-red-500 rounded-2xl shadow-2xl" 
               style={{ 
                 boxShadow: `inset 0 0 50px rgba(239, 68, 68, ${tensionLevel * 0.6})` 
               }} />
        </motion.div>
      )}

      {/* Payout Flash Effect - Draws attention to increasing money */}
      <AnimatePresence>
        {gameState.currentPayout !== lastPayoutFlash && gameState.isGameActive && (
          <motion.div
            className="absolute top-4 right-4 pointer-events-none"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-yellow-400 font-bold text-2xl drop-shadow-lg">
              +${((gameState.currentPayout - lastPayoutFlash) / 100).toFixed(2)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 