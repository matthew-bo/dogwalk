import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, Skull, Clock } from 'lucide-react';

interface DramaticRiskVisualsProps {
  riskMultiplier: number;
  gameTime: number;
  isActive: boolean;
  currentPayout: number;
}

export const DramaticRiskVisuals: React.FC<DramaticRiskVisualsProps> = ({
  riskMultiplier,
  gameTime,
  isActive,
  currentPayout
}) => {

  const [showDangerZone, setShowDangerZone] = useState(false);
  const [riskWarnings, setRiskWarnings] = useState<string[]>([]);

  // Calculate risk levels for different psychological effects
  const riskLevel = Math.min((riskMultiplier - 1) * 2, 1); // 0-1 scale
  const isHighRisk = riskMultiplier > 1.8;
  const isExtremeRisk = riskMultiplier > 2.3;
  const isCriticalRisk = riskMultiplier > 2.8;

  // Dynamic risk escalation effects
  useEffect(() => {
    if (!isActive) {
      setShowDangerZone(false);
      setRiskWarnings([]);
      return;
    }

    // Escalating psychological warnings
    if (isHighRisk && !showDangerZone) {
      setShowDangerZone(true);
      setRiskWarnings(prev => [
        ...prev,
        "⚠️ Entering the danger zone!"
      ]);
    }

    if (isExtremeRisk && !riskWarnings.includes("🚨 SQUIRREL ALERT!")) {
      setRiskWarnings(prev => [
        ...prev,
        "🚨 SQUIRREL ALERT! Cash out NOW!"
      ]);
    }

    if (isCriticalRisk && !riskWarnings.includes("💀 CRITICAL DANGER!")) {
      setRiskWarnings(prev => [
        ...prev,
        "💀 CRITICAL DANGER! You're about to lose everything!"
      ]);
    }

    // Clear old warnings
    setTimeout(() => {
      setRiskWarnings(prev => prev.slice(1));
    }, 3000);

  }, [riskMultiplier, isActive, isHighRisk, isExtremeRisk, isCriticalRisk, gameTime]);

  // Risk meter component
  const RiskMeter = () => (
    <motion.div
      className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50"
      animate={{ 
        scale: isExtremeRisk ? [1, 1.1, 1] : 1,
        y: isExtremeRisk ? [0, -2, 0] : 0
      }}
      transition={{ duration: 0.5, repeat: isExtremeRisk ? Infinity : 0 }}
    >
      <div className="bg-black bg-opacity-80 rounded-2xl p-4 border-2 shadow-2xl backdrop-blur-sm"
           style={{ 
             borderColor: isCriticalRisk ? '#dc2626' : 
                          isExtremeRisk ? '#ea580c' : 
                          isHighRisk ? '#f59e0b' : '#6b7280',
             boxShadow: `0 0 30px ${
               isCriticalRisk ? 'rgba(220, 38, 38, 0.8)' : 
               isExtremeRisk ? 'rgba(234, 88, 12, 0.6)' : 
               isHighRisk ? 'rgba(245, 158, 11, 0.4)' : 'transparent'
             }`
           }}>
        
        {/* Risk Level Indicator */}
        <div className="flex items-center space-x-3 mb-2">
          <motion.div
            animate={{ rotate: isCriticalRisk ? [0, -10, 10, 0] : 0 }}
            transition={{ duration: 0.1, repeat: isCriticalRisk ? Infinity : 0 }}
          >
            {isCriticalRisk ? <Skull className="text-red-500" size={24} /> :
             isExtremeRisk ? <Zap className="text-orange-500" size={24} /> :
             isHighRisk ? <AlertTriangle className="text-yellow-500" size={24} /> :
             <Clock className="text-gray-400" size={24} />}
          </motion.div>
          
          <div>
            <div className="text-white font-bold text-lg">
              {isCriticalRisk ? "💀 LETHAL" :
               isExtremeRisk ? "🚨 EXTREME" :
               isHighRisk ? "⚠️ HIGH RISK" :
               "✅ SAFE"}
            </div>
            <div className="text-gray-300 text-sm">
              Risk: {Math.round(riskLevel * 100)}% • Time: {gameTime}s
            </div>
          </div>
        </div>

        {/* Risk Bar */}
        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${riskLevel * 100}%` }}
            transition={{ duration: 0.3 }}
            style={{
              background: `linear-gradient(90deg, 
                #22c55e 0%, 
                #eab308 30%, 
                #f97316 60%, 
                #dc2626 85%, 
                #7f1d1d 100%)`
            }}
          />
          
          {/* Pulsing overlay for extreme danger */}
          {isExtremeRisk && (
            <motion.div
              className="absolute inset-0 bg-red-500 rounded-full"
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
          )}

          {/* Danger markers */}
          <div className="absolute top-0 left-[60%] w-1 h-full bg-orange-300 opacity-60" />
          <div className="absolute top-0 left-[85%] w-1 h-full bg-red-300 opacity-80" />
        </div>

        {/* Money at risk indicator */}
        <div className="text-center mt-2">
          <span className="text-gray-400 text-xs">At Risk: </span>
          <span className={`font-bold ${
            isCriticalRisk ? 'text-red-400' : 
            isExtremeRisk ? 'text-orange-400' : 
            'text-white'
          }`}>
            ${(currentPayout / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-45">
      {/* Risk Meter */}
      <AnimatePresence>
        {isActive && <RiskMeter />}
      </AnimatePresence>

      {/* Danger Zone Overlay */}
      <AnimatePresence>
        {showDangerZone && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Pulsing red border */}
            <motion.div
              className="absolute inset-2 border-4 rounded-2xl"
              animate={{ 
                borderColor: [
                  'rgba(239, 68, 68, 0)',
                  'rgba(239, 68, 68, 0.8)',
                  'rgba(239, 68, 68, 0)'
                ],
                boxShadow: [
                  '0 0 0px rgba(239, 68, 68, 0)',
                  '0 0 40px rgba(239, 68, 68, 0.6)',
                  '0 0 0px rgba(239, 68, 68, 0)'
                ]
              }}
              transition={{ 
                duration: Math.max(0.5, 2 - riskLevel * 1.5), 
                repeat: Infinity 
              }}
            />

            {/* Corner danger indicators */}
            {[
              { top: 4, left: 4 },
              { top: 4, right: 4 },
              { bottom: 4, left: 4 },
              { bottom: 4, right: 4 }
            ].map((position, index) => (
              <motion.div
                key={index}
                className="absolute w-8 h-8 bg-red-500 rounded-full"
                style={position}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: Infinity,
                  delay: index * 0.1
                }}
              >
                <AlertTriangle className="text-white m-1" size={24} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Escalating Risk Warnings */}
      <AnimatePresence>
        {riskWarnings.map((warning, index) => (
          <motion.div
            key={`risk-warning-${index}`}
            className="absolute top-32 left-1/2 transform -translate-x-1/2"
            initial={{ y: -50, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.5 }}
            transition={{ 
              type: "spring", 
              damping: 15, 
              stiffness: 300 
            }}
          >
            <motion.div
              className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-4 border-2 border-red-400 shadow-2xl"
              animate={{ 
                scale: [1, 1.05, 1],
                boxShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.6)',
                  '0 0 40px rgba(239, 68, 68, 1)',
                  '0 0 20px rgba(239, 68, 68, 0.6)'
                ]
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <div className="text-white font-bold text-lg text-center">
                {warning}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Screen Edge Glow Effect */}
      {isExtremeRisk && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ 
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            background: `radial-gradient(ellipse at center, 
              transparent 30%, 
              rgba(239, 68, 68, 0.2) 60%, 
              rgba(239, 68, 68, 0.6) 100%)`
          }}
        />
      )}

      {/* Critical Risk Screen Shake Simulation */}
      {isCriticalRisk && (
        <motion.div
          className="absolute inset-0 pointer-events-none bg-red-900 rounded-2xl"
          animate={{ 
            opacity: [0, 0.3, 0],
            scale: [1, 1.02, 1]
          }}
          transition={{ duration: 0.1, repeat: Infinity }}
        />
      )}

      {/* Tension Lines */}
      {isHighRisk && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({length: 8}, (_, i) => (
            <motion.div
              key={`tension-line-${i}`}
              className="absolute h-1 bg-red-400 opacity-60"
              style={{
                top: `${20 + i * 10}%`,
                left: '-100px',
                width: '200px',
                transform: `rotate(${-10 + i * 2}deg)`
              }}
              animate={{
                x: [0, window.innerWidth + 200],
                opacity: [0, 0.8, 0]
              }}
              transition={{
                duration: 2 - riskLevel,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}; 