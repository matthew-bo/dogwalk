import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


interface MiniGameEventModalProps {
  isOpen: boolean;
  event: {
    id: string;
    type: 'bonus_treat' | 'fetch_game';
    title: string;
    description: string;
    riskDescription: string;
    rewardDescription: string;
    acceptAction: string;
    declineAction: string;
    timeLimit: number;
  } | null;
  onChoice: (choice: 'accept' | 'decline') => void;
  onTimeout: () => void;
}

const MiniGameEventModal: React.FC<MiniGameEventModalProps> = ({
  isOpen,
  event,
  onChoice,
  onTimeout
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isChoiceMade, setIsChoiceMade] = useState(false);

  useEffect(() => {
    if (!isOpen || !event) {
      setTimeRemaining(0);
      setIsChoiceMade(false);
      return;
    }

    setTimeRemaining(event.timeLimit);
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (!isChoiceMade) {
            onTimeout();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, event, onTimeout, isChoiceMade]);

  const handleChoice = (choice: 'accept' | 'decline') => {
    setIsChoiceMade(true);
    onChoice(choice);
  };

  const getEventEmoji = (type: string): string => {
    switch (type) {
      case 'bonus_treat': return '🦴';
      case 'fetch_game': return '🎾';
      default: return '⚡';
    }
  };

  const getEventTheme = (type: string) => {
    switch (type) {
      case 'bonus_treat':
        return {
          bg: 'from-amber-500 to-orange-500',
          border: 'border-amber-400',
          accent: 'text-amber-200',
          glow: 'shadow-amber-500/50'
        };
      case 'fetch_game':
        return {
          bg: 'from-green-500 to-emerald-500',
          border: 'border-green-400',
          accent: 'text-green-200',
          glow: 'shadow-green-500/50'
        };

      default:
        return {
          bg: 'from-blue-500 to-indigo-500',
          border: 'border-blue-400',
          accent: 'text-blue-200',
          glow: 'shadow-blue-500/50'
        };
    }
  };



  if (!event) return null;

  const theme = getEventTheme(event.type);

  // Calculate circular timer progress
  const timeProgress = event.timeLimit > 0 ? (timeRemaining / event.timeLimit) * 100 : 0;
  const circumference = 2 * Math.PI * 20; // radius of 20
  const strokeOffset = circumference - (timeProgress / 100) * circumference;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40"
        >
          <motion.div
            className={`
              relative bg-gradient-to-r ${theme.bg} 
              rounded-xl px-4 py-3 border-2 ${theme.border} 
              shadow-lg ${theme.glow} max-w-sm
            `}
            whileHover={{ scale: 1.02 }}
          >
            {/* Circular Timer */}
            <div className="absolute -top-2 -right-2 w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 50 50">
                {/* Background circle */}
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  stroke={timeRemaining <= 3 ? "#EF4444" : timeRemaining <= 5 ? "#F59E0B" : "#10B981"}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-1000 ease-linear"
                />
                {/* Timer text */}
                <text
                  x="25"
                  y="30"
                  textAnchor="middle"
                  className="text-xs font-bold fill-white"
                  transform="rotate(90 25 25)"
                >
                  {timeRemaining}
                </text>
              </svg>
            </div>

            {/* Compact Content */}
            <div className="relative z-10 flex items-center space-x-3">
              {/* Event Icon */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="text-3xl"
              >
                {getEventEmoji(event.type)}
              </motion.div>
              
              {/* Event Info */}
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm">
                  {event.title}
                </h3>
                <p className="text-white text-xs opacity-90">
                  {event.description}
                </p>
              </div>

              
              {/* Compact Action Buttons */}
              <div className="flex space-x-2 ml-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChoice('decline')}
                  disabled={isChoiceMade}
                  className={`
                    px-3 py-1 rounded-lg font-semibold text-xs
                    bg-gray-600 hover:bg-gray-500 text-white
                    border border-gray-500 hover:border-gray-400
                    transition-all duration-200
                    ${isChoiceMade ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  ❌
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChoice('accept')}
                  disabled={isChoiceMade}
                  className={`
                    px-3 py-1 rounded-lg font-semibold text-xs
                    bg-white text-gray-800 hover:bg-gray-100
                    border border-white hover:border-gray-200
                    transition-all duration-200
                    ${isChoiceMade ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  ✅
                </motion.button>
              </div>
              
              {/* Urgent Time Warning for compact popup */}
              {timeRemaining <= 3 && timeRemaining > 0 && !isChoiceMade && (
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-red-500 rounded-xl pointer-events-none"
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MiniGameEventModal; 