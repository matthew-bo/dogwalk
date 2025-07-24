import React, { useEffect, useState, useRef } from 'react';
import { useGameContext } from '../../contexts/GameContext';
import { Clock, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface GameCanvasProps {
  betAmount: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ betAmount }) => {
  const { gameState } = useGameContext();
  const [backgroundPosition, setBackgroundPosition] = useState(0);
  const [currentScenery, setCurrentScenery] = useState(0);
  const [dogPosition, setDogPosition] = useState(20); // percentage from left
  const [squirrelPosition, setSquirrelPosition] = useState(-10); // percentage from left
  const [isChasing, setIsChasing] = useState(false);
  const [squirrelDirection, setSquirrelDirection] = useState(1); // 1 for right, -1 for left
  const [shakingIntensity, setShakingIntensity] = useState(0);
  const [tensionLevel, setTensionLevel] = useState(0);
  const [pulseEffects, setPulseEffects] = useState(false);
  const [squirrelSpeed, setSquirrelSpeed] = useState(2);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Enhanced park scenery with more dramatic elements
  const sceneryElements = [
    { trees: '🌳🌲🌳', ground: '🌿🌿🌿', extras: '🦋', sky: '☀️', mood: 'calm' },
    { trees: '🌲🌳🌲', ground: '🌸🌸🌸', extras: '🐝', sky: '⛅', mood: 'peaceful' },
    { trees: '🌳🌴🌳', ground: '🌺🌺🌺', extras: '🦆', sky: '🌤️', mood: 'serene' },
    { trees: '🌲🌲🌳', ground: '🌻🌻🌻', extras: '🐛', sky: '☁️', mood: 'cloudy' },
    { trees: '🌳🌳🌲', ground: '🌷🌷🌷', extras: '🦋', sky: '🌈', mood: 'magical' },
    { trees: '🌲🌪️🌲', ground: '🍂🍂🍂', extras: '🌪️', sky: '⛈️', mood: 'dangerous' }
  ];

  // Calculate tension and risk level
  useEffect(() => {
    const time = gameState.gameTime;
    const newTensionLevel = Math.min(time / 20, 1); // Max tension at 20 seconds
    setTensionLevel(newTensionLevel);
    
    // Increase shaking as tension builds
    setShakingIntensity(newTensionLevel * 3);
    
    // Pulse effects for high tension
    setPulseEffects(newTensionLevel > 0.6);
    
    // Change scenery to more dangerous as time progresses
    if (time > 15) {
      setCurrentScenery(5); // Dangerous scenery
    } else if (time > 10) {
      setCurrentScenery(Math.floor(Math.random() * 4) + 1);
    }
  }, [gameState.gameTime]);

  // Dramatic squirrel chasing animation
  useEffect(() => {
    if (!gameState.squirrelEvent) {
      setSquirrelPosition(-10);
      setIsChasing(false);
      return;
    }

    setIsChasing(true);
    
    // Squirrel runs across screen in zigzag pattern
    const squirrelInterval = setInterval(() => {
      setSquirrelPosition(prev => {
        const newPos = prev + (squirrelDirection * squirrelSpeed);
        
        // Zigzag movement - change direction randomly
        if (Math.random() < 0.3) {
          setSquirrelDirection(prev => prev * -1);
        }
        
        // Speed up as the chase continues
        setSquirrelSpeed(prev => Math.min(prev + 0.1, 8));
        
        // Keep squirrel on screen and make it erratic
        if (newPos > 100) return 80 + Math.sin(Date.now() / 200) * 10;
        if (newPos < -10) return 10 + Math.sin(Date.now() / 200) * 10;
        
        return newPos + Math.sin(Date.now() / 100) * 2; // Add jittery movement
      });
      
      // Dog chases the squirrel but can't catch up
      setDogPosition(prev => {
        const targetPos = Math.max(10, squirrelPosition - 15);
        return prev + (targetPos - prev) * 0.1; // Smooth chase movement
      });
    }, 50);

    return () => clearInterval(squirrelInterval);
  }, [gameState.squirrelEvent, squirrelDirection, squirrelSpeed, squirrelPosition]);

  // Background animation with increased intensity during chase
  useEffect(() => {
    if (!gameState.isGameActive) return;

    const speed = isChasing ? 6 : 2; // Much faster during chase
    const interval = setInterval(() => {
      setBackgroundPosition(prev => prev - speed);
      
      // More frequent scenery changes during tension
      if (gameState.gameTime > 0 && gameState.gameTime % (tensionLevel > 0.5 ? 2 : 5) === 0) {
        setCurrentScenery(prev => (prev + 1) % sceneryElements.length);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameState.isGameActive, isChasing, tensionLevel, gameState.gameTime]);

  // Screen shake effect during high tension
  useEffect(() => {
    if (shakingIntensity > 0 && canvasRef.current) {
      const shakeKeyframes = `
        @keyframes screenShake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-${shakingIntensity}px, ${shakingIntensity}px) rotate(${shakingIntensity * 0.5}deg); }
          20% { transform: translate(${shakingIntensity}px, -${shakingIntensity}px) rotate(-${shakingIntensity * 0.5}deg); }
          30% { transform: translate(-${shakingIntensity}px, ${shakingIntensity}px) rotate(${shakingIntensity * 0.5}deg); }
          40% { transform: translate(${shakingIntensity}px, -${shakingIntensity}px) rotate(-${shakingIntensity * 0.5}deg); }
          50% { transform: translate(-${shakingIntensity}px, ${shakingIntensity}px) rotate(${shakingIntensity * 0.5}deg); }
          60% { transform: translate(${shakingIntensity}px, -${shakingIntensity}px) rotate(-${shakingIntensity * 0.5}deg); }
          70% { transform: translate(-${shakingIntensity}px, ${shakingIntensity}px) rotate(${shakingIntensity * 0.5}deg); }
          80% { transform: translate(${shakingIntensity}px, -${shakingIntensity}px) rotate(-${shakingIntensity * 0.5}deg); }
          90% { transform: translate(-${shakingIntensity}px, ${shakingIntensity}px) rotate(${shakingIntensity * 0.5}deg); }
        }
      `;
      
      const style = document.createElement('style');
      style.textContent = shakeKeyframes;
      document.head.appendChild(style);
      
      canvasRef.current.style.animation = 'screenShake 0.1s infinite';
      
      return () => {
        canvasRef.current && (canvasRef.current.style.animation = '');
        document.head.removeChild(style);
      };
    }
  }, [shakingIntensity]);

  const currentScene = sceneryElements[currentScenery];
  const currentEarnings = ((betAmount * gameState.currentMultiplier) / 100).toFixed(2);
  const profit = ((betAmount * (gameState.currentMultiplier - 1)) / 100).toFixed(2);

  const getDogAnimation = () => {
    if (!gameState.isGameActive) {
      return { 
        animation: 'float 2s ease-in-out infinite',
        transform: 'none'
      };
    }
    
    if (isChasing) {
      return { 
        animation: 'chase-dog 0.3s ease-in-out infinite',
        transform: 'scaleX(-1) rotate(-10deg)', // Dog leans forward while chasing
        filter: 'brightness(1.2) contrast(1.1)'
      };
    }
    
    return { 
      animation: `bounce-dog 0.8s ease-in-out infinite`,
      transform: tensionLevel > 0.5 ? 'scale(1.1)' : 'none'
    };
  };

  const getSquirrelAnimation = () => {
    if (!gameState.squirrelEvent) return { display: 'none' };
    
    return {
      left: `${squirrelPosition}%`,
      animation: 'squirrel-panic 0.2s ease-in-out infinite',
      transform: `scaleX(${squirrelDirection}) scale(${1 + Math.sin(Date.now() / 100) * 0.2})`,
      filter: 'brightness(1.3) drop-shadow(0 0 10px rgba(255, 255, 0, 0.8))',
      display: 'block',
      zIndex: 30
    };
  };

  const getRiskColor = () => {
    if (tensionLevel < 0.3) return 'from-green-500 to-green-400';
    if (tensionLevel < 0.6) return 'from-yellow-500 to-orange-400';
    if (tensionLevel < 0.8) return 'from-orange-500 to-red-400';
    return 'from-red-500 to-red-700';
  };

  const getRiskText = () => {
    if (tensionLevel < 0.3) return '😌 Safe Zone';
    if (tensionLevel < 0.6) return '😰 Getting Risky...';
    if (tensionLevel < 0.8) return '😱 DANGER ZONE!';
    return '💀 EXTREME DANGER!';
  };

  return (
    <div 
      ref={canvasRef}
      className={`relative w-full h-96 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
        tensionLevel > 0.7 ? 'shadow-red-500/50 shadow-2xl border-2 border-red-500/30' : ''
      }`}
      style={{
        background: isChasing 
          ? `linear-gradient(45deg, #dc2626, #991b1b, #dc2626)` 
          : `linear-gradient(to bottom, ${currentScene.mood === 'dangerous' ? '#374151' : '#0ea5e9'} 0%, ${currentScene.mood === 'dangerous' ? '#1f2937' : '#0284c7'} 30%, #22c55e 100%)`,
        filter: tensionLevel > 0.5 ? `saturate(${1 + tensionLevel}) contrast(${1 + tensionLevel * 0.5})` : 'none'
      }}
    >
      {/* Dramatic tension overlay */}
      {tensionLevel > 0.6 && (
        <div 
          className="absolute inset-0 pointer-events-none z-50"
          style={{
            background: `radial-gradient(circle at center, transparent 60%, rgba(220, 38, 38, ${tensionLevel * 0.3}) 100%)`,
            animation: pulseEffects ? 'pulse 0.5s ease-in-out infinite' : 'none'
          }}
        />
      )}

      {/* Emergency lightning effects during high tension */}
      {tensionLevel > 0.8 && (
        <div className="absolute inset-0 pointer-events-none z-40">
          <div 
            className="absolute top-0 left-1/4 w-1 bg-yellow-300"
            style={{
              height: '100%',
              animation: 'lightning 0.1s infinite',
              filter: 'drop-shadow(0 0 10px #fbbf24)'
            }}
          />
          <div 
            className="absolute top-0 right-1/3 w-1 bg-yellow-300"
            style={{
              height: '100%',
              animation: 'lightning 0.15s infinite 0.05s',
              filter: 'drop-shadow(0 0 10px #fbbf24)'
            }}
          />
        </div>
      )}

      {/* Game HUD - Top Overlay with tension indicators */}
      <div className="absolute inset-x-0 top-0 z-30">
        <div className="flex flex-col sm:flex-row justify-between items-start p-2 sm:p-4 space-y-2 sm:space-y-0">
          {/* Left side - Game status with tension indicator */}
          <div className={`rounded-lg px-3 py-2 backdrop-blur-sm transition-all duration-300 ${
            tensionLevel > 0.7 ? 'bg-red-900 bg-opacity-80 border border-red-400' : 'bg-black bg-opacity-60'
          }`}>
            <div className="flex items-center space-x-2">
              <div 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  gameState.connectionStatus === 'connected' ? 
                    (tensionLevel > 0.7 ? 'bg-red-400 animate-pulse' : 'bg-green-400') : 
                  gameState.connectionStatus === 'connecting' ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                aria-label={`Connection status: ${gameState.connectionStatus}`}
              />
              <span className={`text-sm font-medium transition-all duration-300 ${
                tensionLevel > 0.7 ? 'text-red-100' : 'text-white'
              }`}>
                {isChasing ? '🏃‍♂️ CHASING!' : gameState.isGameActive ? '🚶‍♂️ Walking...' : 'Ready'}
              </span>
              {tensionLevel > 0.5 && (
                <AlertTriangle size={16} className="text-yellow-400 animate-bounce" />
              )}
            </div>
          </div>

          {/* Right side - Enhanced HUD with tension styling */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {/* Timer with urgency indicator */}
            <div className={`rounded-lg px-3 py-2 backdrop-blur-sm transition-all duration-300 flex items-center space-x-2 ${
              tensionLevel > 0.7 ? 'bg-red-900 bg-opacity-80 animate-pulse' : 'bg-black bg-opacity-60'
            }`}>
              <Clock size={16} className={tensionLevel > 0.7 ? "text-red-400" : "text-blue-400"} />
              <span className={`font-bold text-lg transition-all duration-300 ${
                tensionLevel > 0.7 ? 'text-red-100 text-xl' : 'text-white'
              }`} aria-label={`Game time: ${gameState.gameTime} seconds`}>
                {gameState.gameTime}s
              </span>
            </div>
            
            {/* Current Value with excitement indicator */}
            <div className={`rounded-lg px-3 py-2 shadow-lg transition-all duration-300 ${
              profit > '0.00' 
                ? `bg-gradient-to-r ${getRiskColor()} animate-pulse` 
                : 'bg-gradient-to-r from-green-600 to-green-500'
            }`}>
              <div className="flex items-center space-x-1">
                <DollarSign size={16} className="text-white" />
                <span className="text-white font-bold text-lg" aria-label={`Current value: ${currentEarnings} dollars`}>
                  ${currentEarnings}
                </span>
              </div>
              <div className="text-green-100 text-xs">
                Current Value
              </div>
            </div>

            {/* Multiplier with intensity scaling */}
            <div className={`rounded-lg px-3 py-2 shadow-lg transition-all duration-300 ${
              tensionLevel > 0.5 
                ? 'bg-gradient-to-r from-purple-700 to-purple-600 scale-110' 
                : 'bg-gradient-to-r from-purple-600 to-purple-500'
            }`}>
              <div className="flex items-center space-x-1">
                <TrendingUp size={16} className="text-white" />
                <span className={`text-white font-bold transition-all duration-300 ${
                  tensionLevel > 0.5 ? 'text-xl' : 'text-lg'
                }`} aria-label={`Multiplier: ${gameState.currentMultiplier.toFixed(2)}x`}>
                  {gameState.currentMultiplier.toFixed(2)}x
                </span>
              </div>
              <div className="text-purple-100 text-xs">
                Multiplier
              </div>
            </div>

            {/* Profit with celebration effects */}
            {gameState.isGameActive && profit > '0.00' && (
              <div className={`rounded-lg px-3 py-2 shadow-lg transition-all duration-300 ${
                tensionLevel > 0.5 
                  ? 'bg-gradient-to-r from-yellow-700 to-yellow-600 animate-bounce scale-110' 
                  : 'bg-gradient-to-r from-yellow-600 to-yellow-500 animate-pulse'
              }`}>
                <div className="flex items-center space-x-1">
                  <span className={`text-white transition-all duration-300 ${
                    tensionLevel > 0.5 ? 'text-lg font-bold' : 'text-sm'
                  }`} aria-label={`Profit: ${profit} dollars`}>
                    +${profit}
                  </span>
                </div>
                <div className="text-yellow-100 text-xs">
                  Profit
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced sky background with dynamic weather */}
      <div className={`absolute inset-0 transition-all duration-1000 ${
        isChasing 
          ? 'bg-gradient-to-b from-red-800 via-red-600 to-orange-400' 
          : currentScene.mood === 'dangerous' 
            ? 'bg-gradient-to-b from-gray-800 via-gray-600 to-green-400'
            : 'bg-gradient-to-b from-blue-400 via-sky-300 to-green-300'
      }`}>
        <div className={`absolute top-8 right-16 text-4xl transition-all duration-500 ${
          isChasing ? 'animate-spin text-6xl' : 'animate-float'
        }`}>
          {isChasing ? '💫' : currentScene.sky}
        </div>
      </div>
      
      {/* Dynamic moving clouds with speed based on tension */}
      <div 
        className="absolute top-8 w-full h-16 flex space-x-12 text-3xl opacity-80 transition-all duration-300"
        style={{ 
          transform: `translateX(${backgroundPosition * (isChasing ? 0.8 : 0.2)}px)`,
          filter: tensionLevel > 0.5 ? 'blur(1px)' : 'none'
        }}
      >
        <span className={isChasing ? 'animate-spin' : ''}>☁️</span>
        <span className={isChasing ? 'animate-spin' : ''}>⛅</span>
        <span className={isChasing ? 'animate-spin' : ''}>☁️</span>
        <span className={isChasing ? 'animate-spin' : ''}>☁️</span>
        <span className={isChasing ? 'animate-spin' : ''}>⛅</span>
        <span className={isChasing ? 'animate-spin' : ''}>☁️</span>
      </div>

      {/* Background mountains/trees with parallax and tension effects */}
      <div 
        className={`absolute bottom-40 w-full h-20 flex space-x-6 text-2xl opacity-40 transition-all duration-500 ${
          tensionLevel > 0.7 ? 'animate-pulse opacity-60' : ''
        }`}
        style={{ transform: `translateX(${backgroundPosition * (isChasing ? 1.0 : 0.3)}px)` }}
      >
        <span>🏔️</span>
        <span>🌲</span>
        <span>🏔️</span>
        <span>🌳</span>
        <span>🏔️</span>
        <span>🌲</span>
        <span>🏔️</span>
      </div>

      {/* Middle ground trees with enhanced movement */}
      <div 
        className={`absolute bottom-28 w-full h-24 flex space-x-8 text-5xl opacity-70 transition-all duration-300 ${
          isChasing ? 'animate-pulse' : ''
        }`}
        style={{ 
          transform: `translateX(${backgroundPosition * (isChasing ? 1.5 : 0.6)}px)`,
          filter: tensionLevel > 0.5 ? `hue-rotate(${tensionLevel * 90}deg)` : 'none'
        }}
      >
        {currentScene.trees.split('').map((tree, i) => (
          <span 
            key={`tree-${i}`} 
            className={`transition-all duration-300 ${
              isChasing ? 'animate-bounce' : 'animate-float'
            }`} 
            style={{ 
              animationDelay: `${i * 0.2}s`,
              transform: tensionLevel > 0.7 ? `scale(${1 + tensionLevel * 0.3}) rotate(${Math.sin(Date.now() / 200) * 10}deg)` : 'none'
            }}
          >
            {tree}
          </span>
        ))}
        <span 
          className={`transition-all duration-300 ${
            isChasing ? 'animate-spin text-6xl' : 'animate-float'
          }`} 
          style={{ animationDelay: '0.6s' }}
        >
          {isChasing ? '🌪️' : currentScene.extras}
        </span>
        {currentScene.trees.split('').map((tree, i) => (
          <span 
            key={`tree-${i + 10}`} 
            className={`transition-all duration-300 ${
              isChasing ? 'animate-bounce' : 'animate-float'
            }`} 
            style={{ 
              animationDelay: `${(i + 3) * 0.2}s`,
              transform: tensionLevel > 0.7 ? `scale(${1 + tensionLevel * 0.3}) rotate(${Math.sin(Date.now() / 200) * -10}deg)` : 'none'
            }}
          >
            {tree}
          </span>
        ))}
      </div>

      {/* Foreground flowers and details with enhanced speed */}
      <div 
        className="absolute bottom-20 w-full h-12 flex space-x-4 text-2xl opacity-90 transition-all duration-300"
        style={{ 
          transform: `translateX(${backgroundPosition * (isChasing ? 3.0 : 1.2)}px)`,
          filter: isChasing ? 'blur(2px)' : 'none'
        }}
      >
        {Array.from({length: 30}, (_, i) => (
          <span key={`ground-${i}`} className={isChasing ? 'animate-bounce' : ''}>
            {currentScene.ground.split('')[i % currentScene.ground.length]}
          </span>
        ))}
      </div>

      {/* Enhanced park path with speed lines during chase */}
      <div className={`absolute bottom-0 w-full h-20 transition-all duration-300 ${
        isChasing 
          ? 'bg-gradient-to-t from-red-800 via-red-700 to-red-600 opacity-90' 
          : 'bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500 opacity-80'
      }`}>
        {/* Speed lines during chase */}
        {isChasing && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({length: 20}, (_, i) => (
              <div
                key={`speed-line-${i}`}
                className="absolute bg-white opacity-60 h-1"
                style={{
                  left: `${(i * 10) % 120}%`,
                  top: `${20 + (i % 5) * 10}%`,
                  width: '30px',
                  animation: `speed-line 0.1s linear infinite`,
                  animationDelay: `${i * 0.01}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Path texture and details with enhanced movement */}
      <div 
        className={`absolute bottom-2 w-full h-12 flex space-x-6 text-lg opacity-60 transition-all duration-300 ${
          isChasing ? 'animate-pulse' : ''
        }`}
        style={{ 
          transform: `translateX(${backgroundPosition * (isChasing ? 4.0 : 1.8)}px)`,
          filter: isChasing ? 'blur(1px)' : 'none'
        }}
      >
        {Array.from({length: 20}, (_, i) => (
          <span key={`debris-${i}`} className={isChasing ? 'animate-bounce' : ''}>
            {i % 2 === 0 ? '🪨' : '🍂'}
          </span>
        ))}
      </div>

      {/* Enhanced owner's hand with leash - shows tension */}
      {gameState.isGameActive && (
        <div 
          className="absolute bottom-16 z-20 transition-all duration-300"
          style={{ 
            left: `${Math.max(8, dogPosition - 15)}%`,
            transform: isChasing ? 'scale(1.2)' : 'none'
          }}
        >
          {/* Hand with tension indicator */}
          <div 
            className={`text-4xl transition-all duration-300 ${
              tensionLevel > 0.7 ? 'animate-bounce' : ''
            }`} 
            style={{ 
              transform: `rotate(${tensionLevel * 15 + Math.sin(Date.now() / 200) * (tensionLevel * 10)}deg)`,
              filter: tensionLevel > 0.5 ? 'brightness(1.2)' : 'none'
            }}
          >
            🤚
          </div>
          {/* Enhanced leash with tension */}
          <svg 
            className="absolute top-4 left-6" 
            width="120" 
            height="50"
            style={{ 
              transform: `rotate(${tensionLevel * 10 + Math.sin(Date.now() / 200) * (tensionLevel * 5)}deg)` 
            }}
          >
            <path
              d={`M 0 0 Q ${30 + tensionLevel * 20} ${15 + tensionLevel * 10} ${60 + tensionLevel * 30} 5`}
              stroke={tensionLevel > 0.7 ? "#dc2626" : "#8B4513"}
              strokeWidth={tensionLevel > 0.5 ? "4" : "3"}
              fill="none"
              strokeLinecap="round"
              style={{
                filter: tensionLevel > 0.7 ? 'drop-shadow(0 0 5px #dc2626)' : 'none'
              }}
            />
          </svg>
        </div>
      )}

      {/* Enhanced dog with dramatic chase animation */}
      <div
        className={`absolute bottom-16 text-7xl transition-all duration-300 z-15 ${
          isChasing ? 'animate-bounce' : ''
        }`}
        style={{
          left: `${dogPosition}%`,
          ...getDogAnimation(),
          filter: isChasing ? 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8)) brightness(1.3)' : 'none'
        }}
      >
        🐕
        {/* Sweat drops during high tension */}
        {tensionLevel > 0.6 && (
          <div className="absolute -top-4 -right-2 text-2xl animate-bounce">
            💦
          </div>
        )}
      </div>

      {/* Dog collar with leash attachment - enhanced during tension */}
      {gameState.isGameActive && (
        <div 
          className={`absolute bottom-20 w-3 h-3 rounded-full z-10 transition-all duration-300 ${
            tensionLevel > 0.7 ? 'bg-red-500 animate-pulse' : 'bg-red-600'
          }`}
          style={{ 
            left: `${dogPosition + 5.5}%`,
            boxShadow: tensionLevel > 0.7 ? '0 0 10px #dc2626' : 'none'
          }}
        />
      )}

      {/* DRAMATIC SQUIRREL with enhanced effects */}
      <div
        className="absolute bottom-16 text-6xl z-25 transition-all duration-100"
        style={getSquirrelAnimation()}
      >
        🐿️
        {/* Squirrel panic effects */}
        {gameState.squirrelEvent && (
          <>
            <div className="absolute -top-6 -left-2 text-2xl animate-ping">⚡</div>
            <div className="absolute -top-4 -right-4 text-xl animate-bounce">💨</div>
            <div className="absolute -bottom-2 left-2 text-lg animate-pulse">💨</div>
          </>
        )}
      </div>

      {/* Enhanced walking effects with chase intensity */}
      {gameState.isGameActive && (
        <>
          {/* Dramatic dust clouds with enhanced effects */}
          <div 
            className={`absolute bottom-12 text-xl opacity-70 transition-all duration-300 ${
              isChasing ? 'animate-ping text-3xl' : 'animate-pulse'
            }`}
            style={{ left: `${dogPosition + 5}%` }}
          >
            💨
          </div>
          <div 
            className={`absolute bottom-10 text-lg opacity-50 transition-all duration-300 ${
              isChasing ? 'animate-ping text-2xl' : 'animate-pulse'
            }`} 
            style={{ 
              left: `${dogPosition + 8}%`,
              animationDelay: '0.3s' 
            }}
          >
            💨
          </div>
          
          {/* Enhanced footprints trail */}
          <div 
            className={`absolute bottom-12 flex space-x-3 text-sm opacity-40 transition-all duration-300 ${
              isChasing ? 'animate-pulse' : ''
            }`}
            style={{ 
              transform: `translateX(${backgroundPosition * (isChasing ? 3.0 : 1.5)}px)`,
              filter: isChasing ? 'blur(1px)' : 'none'
            }}
          >
            {Array.from({length: 15}, (_, i) => (
              <span key={`paw-${i}`}>🐾</span>
            ))}
          </div>
        </>
      )}

      {/* Game status overlays with enhanced drama */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {!gameState.isGameActive && !gameState.squirrelEvent && (
          <div className="text-center bg-black bg-opacity-50 rounded-xl p-8 backdrop-blur-sm animate-slide-in">
            <div className="text-6xl mb-4 animate-bounce-dog">🐕</div>
            <p className="text-white font-bold text-2xl mb-2">Ready for Adventure!</p>
            <p className="text-gray-300">Click "Start Walking" to begin</p>
          </div>
        )}
        
        {gameState.squirrelEvent && (
          <div className="text-center bg-red-900 bg-opacity-90 rounded-xl p-8 backdrop-blur-sm animate-slide-in border-2 border-red-400 shadow-2xl shadow-red-500/50">
            <div className="text-8xl mb-4 animate-spin">🐿️</div>
            <p className="text-red-100 font-bold text-3xl mb-2 animate-pulse">SQUIRREL SPOTTED!</p>
            <p className="text-red-200 text-xl">Your walk has ended!</p>
            <div className="text-6xl mt-4 animate-bounce">💥</div>
          </div>
        )}
      </div>

      {/* Enhanced risk level indicator with dramatic scaling */}
      {gameState.isGameActive && (
        <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-300 ${
          tensionLevel > 0.7 ? 'scale-125 animate-bounce' : ''
        }`}>
          <div className={`rounded-full px-6 py-2 backdrop-blur-sm transition-all duration-300 ${
            tensionLevel > 0.7 
              ? 'bg-red-900 bg-opacity-90 border border-red-400' 
              : 'bg-black bg-opacity-60'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                gameState.gameTime < 5 ? 'bg-green-400' :
                gameState.gameTime < 10 ? 'bg-yellow-400 animate-pulse' :
                gameState.gameTime < 20 ? 'bg-orange-400 animate-pulse' : 'bg-red-400 animate-ping'
              }`}/>
              <span className={`font-medium transition-all duration-300 ${
                tensionLevel > 0.7 ? 'text-red-100 text-lg' : 'text-white text-sm'
              }`}>
                {getRiskText()}
              </span>
              {tensionLevel > 0.8 && (
                <div className="text-xl animate-spin">⚠️</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tension meter */}
      {gameState.isGameActive && tensionLevel > 0.2 && (
        <div className="absolute top-20 left-4 z-30">
          <div className="bg-black bg-opacity-60 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-white text-xs mb-2 font-bold">TENSION</div>
            <div className="w-4 h-32 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`w-full transition-all duration-300 rounded-full ${
                  tensionLevel < 0.3 ? 'bg-green-400' :
                  tensionLevel < 0.6 ? 'bg-yellow-400' :
                  tensionLevel < 0.8 ? 'bg-orange-400' : 'bg-red-400 animate-pulse'
                }`}
                style={{ 
                  height: `${tensionLevel * 100}%`,
                  marginTop: `${(1 - tensionLevel) * 100}%`,
                  boxShadow: tensionLevel > 0.7 ? `0 0 10px ${tensionLevel > 0.8 ? '#dc2626' : '#f97316'}` : 'none'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas; 