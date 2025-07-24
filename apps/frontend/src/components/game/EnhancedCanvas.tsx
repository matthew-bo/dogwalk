import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DogBreed, assetManager } from '../../utils/assetManager';


interface EnhancedCanvasProps {
  selectedDogBreed: DogBreed;
  gameState: {
    isGameActive: boolean;
    gameTime: number;
    baseMultiplier: number;
    bonusMultiplier: number;
    riskMultiplier: number;
    currentPayout: number;
    activeBonuses: {
      leashSlackUsed: boolean;
      fetchActiveUntil?: number;
      butterflyBonus?: number;
      riskMultiplier: number;
      payoutMultiplier: number;
    };
  };
  isFetchMode: boolean;
  onSquirrelEvent?: () => void;
  currentMinigame?: {
    type: string;
    isActive: boolean;
  } | undefined;
  // Add props for game outcome to trigger loss sequence
  gameResult?: {
    outcome: 'win' | 'loss' | null;
    payout?: number;
    squirrelTime?: number;
    baseMultiplier?: number;
    bonusMultiplier?: number;
    finalMultiplier?: number;
    eventsTriggered?: string[];
  } | null;
}

interface GameLayer {
  elements: JSX.Element[];
  speed: number;
  zIndex: number;
}

const EnhancedCanvas: React.FC<EnhancedCanvasProps> = ({
  selectedDogBreed,
  gameState,
  isFetchMode,
  currentMinigame,
  gameResult
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [backgroundOffset, setBackgroundOffset] = useState(0);
  const [dogAnimationFrame, setDogAnimationFrame] = useState(0);
  const [dogPosition, setDogPosition] = useState({ x: 35, y: 65 }); // Position dog on walking path

  const [screenShake, setScreenShake] = useState({ x: 0, y: 0, intensity: 0 });
  const [visualEffects, setVisualEffects] = useState({
    heartbeat: 1,
    saturation: 1,
    brightness: 1,
    redFlash: 0
  });
  const heartbeatAudioRef = useRef<HTMLAudioElement | null>(null);
  const [dogSprite, setDogSprite] = useState<HTMLImageElement | null>(null);
  const [bonusItems, setBonusItems] = useState<Array<{
    id: string;
    type: 'treat' | 'tennis_ball';
    x: number;
    y: number;
    collected: boolean;
  }>>([]);
  
  // Enhanced loss sequence states
  const [isLossSequence, setIsLossSequence] = useState(false);
  const [lossEffects, setLossEffects] = useState({
    squirrelPosition: { x: 90, y: 70 },
    dogChasing: false,
    explosionCount: 0,
    shakeIntensity: 0,
    screenFlash: 0
  });

  // Load sprites when component mounts or dog breed changes
  useEffect(() => {
    const loadSprites = async () => {
      try {
        // Load dog sprite
        const dogImg = await assetManager.getDogSprite(selectedDogBreed.id);
        setDogSprite(dogImg);
      } catch (error) {
        console.error('Failed to load sprites:', error);
        // Fallback to basic colored rectangles if sprites fail
        setDogSprite(null);
      }
    };

    loadSprites();
  }, [selectedDogBreed.id]);

  // Main animation loop - dog should always be animated, even when game isn't active
  useEffect(() => {
    const frameRate = isFetchMode ? 
      selectedDogBreed.animations.run.frameRate : 
      selectedDogBreed.animations.walk.frameRate;
    
    const animationInterval = 1000 / frameRate;
    
    const interval = setInterval(() => {
      // Update dog animation frame
      const maxFrames = isFetchMode ? 
        selectedDogBreed.animations.run.frames.length :
        selectedDogBreed.animations.walk.frames.length;
      
      setDogAnimationFrame(prev => (prev + 1) % maxFrames);
      
      // Update background scrolling only when game is active or during loss sequence
      if (gameState.isGameActive || isLossSequence) {
        const scrollSpeed = isLossSequence ? 8 : (isFetchMode ? 4 : 2);
        setBackgroundOffset(prev => prev + scrollSpeed);
      }
      
      // Update dog position (walking movement or chasing during loss)
      if (gameState.isGameActive) {
        const energy = 1 + (gameState.riskMultiplier * 0.3);
        setDogPosition(() => ({
          x: Math.min(80, 35 + (gameState.gameTime / 80)),
          y: 65 + Math.sin(Date.now() / 600) * (0.5 * energy)
        }));
      } else if (isLossSequence && lossEffects.dogChasing) {
        // Dog chases squirrel during loss sequence
        setDogPosition(prev => ({
          x: Math.min(prev.x + 2, lossEffects.squirrelPosition.x - 10),
          y: 65 + Math.sin(Date.now() / 200) * 5 // More frantic movement
        }));
      } else {
        // Keep dog stationary but visible when not playing
        setDogPosition(() => ({
          x: 35,
          y: 65
        }));
      }
      
    }, animationInterval);

    return () => clearInterval(interval);
  }, [gameState.isGameActive, isFetchMode, selectedDogBreed, gameState.riskMultiplier, isLossSequence, lossEffects.dogChasing, lossEffects.squirrelPosition.x]);

  // Enhanced screen shake and visual effects based on risk (NO ZOOM)
  useEffect(() => {
    const intensity = Math.max(0, gameState.riskMultiplier - 1);
    
    if (intensity > 0) {
      // ENHANCED SCREEN SHAKE instead of zoom
      const baseShake = intensity * 8; // Increased from 6
      const shakeX = (Math.random() - 0.5) * baseShake;
      const shakeY = (Math.random() - 0.5) * baseShake;
      
      // Add extra intense shake at high risk
      const extraShake = intensity > 1.5 ? intensity * 3 : 0;
      
      setScreenShake({ 
        x: shakeX + (Math.random() - 0.5) * extraShake, 
        y: shakeY + (Math.random() - 0.5) * extraShake, 
        intensity 
      });
      
      setVisualEffects({
        heartbeat: 1 + intensity * 0.15,
        saturation: 1 + intensity * 0.4,
        brightness: 1 + intensity * 0.2,
        redFlash: intensity > 1.5 ? Math.random() * 0.3 : 0 // Increased flash intensity
      });

      // TDD Requirement: Heartbeat audio when >70% risk (risk multiplier > 1.7)
      if (intensity > 0.7) {
        if (!heartbeatAudioRef.current) {
          // Create synthetic heartbeat sound using Web Audio API
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(60, audioContext.currentTime); // Low thump
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        }
      }
    } else {
      setScreenShake({ x: 0, y: 0, intensity: 0 });
      setVisualEffects({
        heartbeat: 1,
        saturation: 1,
        brightness: 1,
        redFlash: 0
      });
    }
  }, [gameState.riskMultiplier]);

  // Loss sequence trigger - EPIC SQUIRREL CHASE
  useEffect(() => {
    if (gameResult?.outcome === 'loss' && !isLossSequence) {
      setIsLossSequence(true);
      
      // Start epic loss sequence
      const lossSequenceSteps = [
        // Step 1: Squirrel appears aggressively (0-500ms)
        () => {
          setLossEffects(prev => ({
            ...prev,
            squirrelPosition: { x: 95, y: 70 },
            shakeIntensity: 3,
            screenFlash: 0.8
          }));
        },
        
        // Step 2: Dog starts chasing (500ms)
        () => {
          setLossEffects(prev => ({
            ...prev,
            dogChasing: true,
            explosionCount: 1
          }));
        },
        
        // Step 3: Squirrel moves, more explosions (1000ms)
        () => {
          setLossEffects(prev => ({
            ...prev,
            squirrelPosition: { x: 75, y: 60 },
            explosionCount: 3,
            shakeIntensity: 5
          }));
        },
        
        // Step 4: Maximum chaos (1500ms)
        () => {
          setLossEffects(prev => ({
            ...prev,
            squirrelPosition: { x: 60, y: 50 },
            explosionCount: 6,
            shakeIntensity: 8,
            screenFlash: 1
          }));
        },
        
        // Step 5: Ending (2500ms)
        () => {
          setLossEffects(prev => ({
            ...prev,
            squirrelPosition: { x: 40, y: 45 },
            explosionCount: 10,
            shakeIntensity: 2
          }));
        },
        
        // Step 6: Fade out (3500ms)
        () => {
          setIsLossSequence(false);
          setLossEffects({
            squirrelPosition: { x: 90, y: 70 },
            dogChasing: false,
            explosionCount: 0,
            shakeIntensity: 0,
            screenFlash: 0
          });
        }
      ];
      
      // Execute sequence steps
      lossSequenceSteps.forEach((step, index) => {
        setTimeout(step, index * 500);
      });
    }
  }, [gameResult?.outcome, isLossSequence]);



  // Spawn bonus items during mini-games
  useEffect(() => {
    if (currentMinigame?.type === 'bonus_treat' && currentMinigame.isActive) {
      const newTreat = {
        id: `treat-${Date.now()}`,
        type: 'treat' as const,
        x: dogPosition.x + 10,
        y: dogPosition.y + 5,
        collected: false
      };
      setBonusItems(prev => [...prev, newTreat]);
    }
    
    if (isFetchMode && gameState.gameTime % 8 === 0) {
      const newBall = {
        id: `ball-${Date.now()}`,
        type: 'tennis_ball' as const,
        x: 80 + Math.random() * 15,
        y: 40 + Math.random() * 20,
        collected: false
      };
      setBonusItems(prev => [...prev.slice(-3), newBall]); // Keep only last 3
    }
  }, [currentMinigame, isFetchMode, gameState.gameTime, dogPosition]);



  // Enhanced background layers with proper park environment
  const backgroundLayers: GameLayer[] = [
    {
      elements: [
        // Enhanced sky with clouds
        <div key="sky" className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-400 via-cyan-300 to-green-200" />
          {/* Animated clouds */}
          {Array.from({length: 4}, (_, i) => (
            <div
              key={`cloud-${i}`}
              className="absolute opacity-80"
              style={{
                left: `${(i * 200 - backgroundOffset * 0.05) % 1200}px`,
                top: `${20 + (i % 2) * 40}px`,
                transform: (i * 200 - backgroundOffset * 0.05) < -100 ? 'translateX(1200px)' : 'none'
              }}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white rounded-full opacity-90" />
                <div className="w-12 h-12 bg-white rounded-full opacity-90 -ml-4" />
                <div className="w-8 h-8 bg-white rounded-full opacity-90 -ml-4" />
              </div>
            </div>
          ))}
        </div>
      ],
      speed: 0,
      zIndex: 1
    },
    {
      elements: [
        // Distant mountains with Club Penguin style
        ...Array.from({length: 6}, (_, i) => (
          <div
            key={`mountain-${i}`}
            className="absolute bottom-0 opacity-40"
            style={{
              left: `${(i * 150 - backgroundOffset * 0.08) % 1000}px`,
              width: '100px',
              height: `${80 + (i % 3) * 20}px`,
              background: `linear-gradient(to top, #16a34a 0%, #15803d 50%, #ffffff 100%)`,
              clipPath: 'polygon(0% 100%, 50% 10%, 100% 100%)',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            }}
          />
        ))
      ],
      speed: 0.08,
      zIndex: 2
    },
    {
      elements: [
        // Enhanced grass field with texture
        <div key="grass" className="absolute bottom-0 w-full h-40">
          <div className="absolute inset-0 bg-gradient-to-b from-green-400 via-green-500 to-green-600" />
          {/* Grass texture details */}
          {Array.from({length: 20}, (_, i) => (
            <div
              key={`grass-${i}`}
              className="absolute bottom-0 w-1 bg-green-600 opacity-60"
              style={{
                left: `${(i * 50 - backgroundOffset * 0.1) % 1000}px`,
                height: `${10 + Math.random() * 8}px`,
                transform: `rotate(${-5 + Math.random() * 10}deg)`
              }}
            />
          ))}
        </div>
      ],
      speed: 0.1,
      zIndex: 3
    },
    {
      elements: [
        // Enhanced trees with variety
        ...Array.from({length: 10}, (_, i) => {
          const treeType = i % 3;
          const xPos = (i * 90 - backgroundOffset * 0.25) % 1000;
          return (
            <div 
              key={`tree-${i}`} 
              className="absolute bottom-20" 
              style={{
                left: `${xPos}px`,
                transform: xPos < -80 ? 'translateX(1000px)' : 'none'
              }}
            >
              {/* Tree trunk */}
              <div className="w-4 h-20 bg-amber-900 mx-auto rounded-t-sm border-2 border-amber-800" />
              
              {/* Tree crown based on type */}
              {treeType === 0 && (
                <div className="w-16 h-16 bg-green-600 rounded-full -mt-8 border-4 border-green-700 shadow-lg relative">
                  <div className="absolute top-1 left-2 w-3 h-3 bg-green-400 rounded-full" />
                  <div className="absolute bottom-2 right-3 w-2 h-2 bg-green-400 rounded-full" />
                </div>
              )}
              {treeType === 1 && (
                <div className="w-14 h-18 bg-green-500 rounded-t-full -mt-8 border-4 border-green-600 shadow-lg relative">
                  <div className="absolute top-2 left-3 w-2 h-2 bg-green-300 rounded-full" />
                </div>
              )}
              {treeType === 2 && (
                <div className="w-18 h-14 bg-green-700 rounded-full -mt-6 border-4 border-green-800 shadow-lg relative">
                  <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                  <div className="absolute bottom-1 left-4 w-3 h-3 bg-green-500 rounded-full" />
                </div>
              )}
            </div>
          );
        })
      ],
      speed: 0.25,
      zIndex: 4
    },
    {
      elements: [
        // Park benches and decorations
        ...Array.from({length: 3}, (_, i) => (
          <div 
            key={`bench-${i}`}
            className="absolute bottom-28"
            style={{
              left: `${(i * 250 - backgroundOffset * 0.4) % 1000}px`,
              transform: (i * 250 - backgroundOffset * 0.4) < -60 ? 'translateX(1000px)' : 'none'
            }}
          >
            {/* Bench */}
            <div className="w-12 h-6 bg-amber-700 rounded-lg border-2 border-amber-800 shadow-md">
              <div className="w-full h-2 bg-amber-600 rounded-t-lg" />
            </div>
            <div className="w-12 h-2 bg-amber-800 rounded-b-sm" />
            
            {/* Flowers nearby */}
            <div className="absolute -right-4 top-2 flex space-x-1">
              <div className="w-2 h-2 bg-pink-400 rounded-full" />
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <div className="w-2 h-2 bg-purple-400 rounded-full" />
            </div>
          </div>
        ))
      ],
      speed: 0.4,
      zIndex: 5
    },
    {
      elements: [
        // Enhanced park walking path
        <div 
          key="path"
          className="absolute bottom-0 w-full h-24"
          style={{
            background: `linear-gradient(to bottom, 
              #D1D5DB 0%, 
              #9CA3AF 25%, 
              #6B7280 50%, 
              #4B5563 75%, 
              #374151 100%)`,
            transform: `translateX(-${backgroundOffset % 50}px)`,
            boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.2), 0 -2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {/* Path center dashed line */}
          <div 
            className="absolute top-10 w-full h-1 opacity-80"
            style={{
              background: 'repeating-linear-gradient(to right, #FFF 0px, #FFF 20px, transparent 20px, transparent 40px)'
            }}
          />
          
          {/* Path edge highlights */}
          <div className="absolute top-0 w-full h-1 bg-gray-200 opacity-60" />
          <div className="absolute bottom-0 w-full h-1 bg-gray-800 opacity-80" />
          
          {/* Path texture lines */}
          {Array.from({length: 8}, (_, i) => (
            <div
              key={`path-line-${i}`}
              className="absolute w-full h-px bg-gray-400 opacity-30"
              style={{
                top: `${3 + i * 2.5}px`,
                left: `${(backgroundOffset * 0.5) % 40}px`
              }}
            />
          ))}
        </div>
      ],
      speed: 1,
      zIndex: 6
    }
  ];

  // Get breed-specific characteristics
  const getBreedCharacteristics = (breed: DogBreed) => {
    switch (breed.id) {
      case 'golden_retriever':
        return {
          emoji: '🦮',
          earStyle: 'long',
          furPattern: 'fluffy',
          size: 'large',
          specialFeature: '✨'
        };
      case 'labrador':
        return {
          emoji: '🐕‍🦺',
          earStyle: 'medium',
          furPattern: 'smooth',
          size: 'large',
          specialFeature: '💪'
        };
      case 'husky':
        return {
          emoji: '🐺',
          earStyle: 'pointed',
          furPattern: 'thick',
          size: 'large',
          specialFeature: '❄️'
        };
      case 'bulldog':
        return {
          emoji: '🐶',
          earStyle: 'small',
          furPattern: 'short',
          size: 'compact',
          specialFeature: '💨'
        };
      case 'beagle':
        return {
          emoji: '🐕',
          earStyle: 'floppy',
          furPattern: 'short',
          size: 'medium',
          specialFeature: '👃'
        };
      default:
        return {
          emoji: '🐕',
          earStyle: 'medium',
          furPattern: 'smooth',
          size: 'medium',
          specialFeature: '🐾'
        };
    }
  };

  // Current dog frame for animation (REMOVED ZOOM EFFECTS)
  const getCurrentDogFrame = () => {
    // Animation calculations
    const walkOffset = Math.sin((dogAnimationFrame * 0.5)) * 2;
    const bounceOffset = Math.abs(Math.sin(dogAnimationFrame * 0.3)) * 4;
    const characteristics = getBreedCharacteristics(selectedDogBreed);
    
    // Determine current animation state (NO ZOOM/FLIP based on risk)
    const isFlipped = false; // Remove risk-based flipping
    const scale = isFetchMode ? 1.1 : 1; // Only fetch mode scaling
    
    // Enhanced frantic movement during loss sequence
    const lossMovement = isLossSequence ? {
      x: walkOffset + (Math.random() - 0.5) * 4,
      y: bounceOffset + (Math.random() - 0.5) * 4
    } : { x: walkOffset, y: bounceOffset };
    
    // If we have a loaded sprite, use it
    if (dogSprite) {
      return (
        <div 
          className="relative w-16 h-16 transition-all duration-100"
          style={{ 
            transform: `scale(${scale}) ${isFlipped ? 'scaleX(-1)' : ''} translateY(${lossMovement.y - 2}px) translateX(${lossMovement.x}px)`
          }}
        >
          <img
            src={dogSprite.src}
            alt={selectedDogBreed.displayName}
            className="w-full h-full object-contain drop-shadow-lg"
            style={{
              filter: gameState.activeBonuses.leashSlackUsed ? "drop-shadow(0 0 8px #10b981)" : "none"
            }}
          />
          {/* Animation frame overlay indicator */}
          <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full opacity-50 z-10" 
               style={{ transform: `scale(${dogAnimationFrame % 4 === 0 ? 1.5 : 1})` }} />
        </div>
      );
    }
    
    // Enhanced fallback with breed-specific Club Penguin style - EXTRA LARGE FOR VISIBILITY
    return (
      <div 
        className="relative transition-all duration-100"
        style={{ 
          transform: `scale(${scale * 1.5}) ${isFlipped ? 'scaleX(-1)' : ''} translateY(${lossMovement.y - 2}px) translateX(${lossMovement.x}px)`,
          width: characteristics.size === 'compact' ? '80px' : '96px',
          height: characteristics.size === 'compact' ? '64px' : '96px'
        }}
      >
        {/* Enhanced dog body with loss sequence effects */}
        <div 
          className={`relative flex items-center justify-center border-3 border-white shadow-2xl overflow-hidden ${
            characteristics.size === 'compact' ? 'w-14 h-12 rounded-3xl' : 'w-16 h-16 rounded-full'
          } ${isLossSequence ? 'animate-pulse border-red-500' : ''}`}
          style={{ 
            backgroundColor: selectedDogBreed.color,
            boxShadow: isLossSequence ? 
              '0 8px 16px rgba(239, 68, 68, 0.8), inset 0 2px 4px rgba(255,255,255,0.3)' :
              '0 8px 16px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.3)',
            borderRadius: characteristics.size === 'compact' ? '50% 50% 40% 40%' : '50%'
          }}
        >
          {/* Fur pattern overlay */}
          <div 
            className={`absolute inset-1 ${characteristics.size === 'compact' ? 'rounded-2xl' : 'rounded-full'} ${
              characteristics.furPattern === 'fluffy' ? 'bg-gradient-to-br from-white to-transparent opacity-40' :
              characteristics.furPattern === 'thick' ? 'bg-gradient-to-t from-gray-600 to-transparent opacity-30' :
              ''
            }`} 
          />
          
          {/* Main breed emoji */}
          <div className={`relative z-10 ${
            characteristics.size === 'large' ? 'text-3xl' :
            characteristics.size === 'compact' ? 'text-2xl' :
            'text-2xl'
          }`}>
            {characteristics.emoji}
          </div>
          
          {/* Breed-specific ears with enhanced loss animation */}
          {characteristics.earStyle === 'long' && (
            <>
              <div
                className="absolute -left-2 top-1 w-3 h-6 rounded-full border-2 border-white opacity-90"
                style={{
                  backgroundColor: selectedDogBreed.color,
                  transform: `rotate(${-15 + lossMovement.x * (isLossSequence ? 6 : 3)}deg)`
                }}
              />
              <div
                className="absolute -right-2 top-1 w-3 h-6 rounded-full border-2 border-white opacity-90"
                style={{
                  backgroundColor: selectedDogBreed.color,
                  transform: `rotate(${15 - lossMovement.x * (isLossSequence ? 6 : 3)}deg)`
                }}
              />
            </>
          )}
          
          {characteristics.earStyle === 'pointed' && (
            <>
              <div 
                className="absolute -left-1 -top-1 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent opacity-90" 
                style={{ 
                  borderBottomColor: selectedDogBreed.color,
                  transform: `rotate(${walkOffset}deg)`
                }} 
              />
              <div 
                className="absolute -right-1 -top-1 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent opacity-90" 
                style={{ 
                  borderBottomColor: selectedDogBreed.color,
                  transform: `rotate(${-walkOffset}deg)`
                }} 
              />
            </>
          )}
          
          {characteristics.earStyle === 'floppy' && (
            <>
              <div 
                className="absolute -left-2 top-2 w-4 h-5 rounded-full border-2 border-white opacity-90" 
                style={{ 
                  backgroundColor: selectedDogBreed.color,
                  transform: `rotate(${-30 + walkOffset * 4}deg)`
                }} 
              />
              <div 
                className="absolute -right-2 top-2 w-4 h-5 rounded-full border-2 border-white opacity-90" 
                style={{ 
                  backgroundColor: selectedDogBreed.color,
                  transform: `rotate(${30 - walkOffset * 4}deg)`
                }} 
              />
            </>
          )}
        </div>

        {/* Breed special feature indicator */}
        <div className="absolute -top-1 -right-1 text-sm animate-pulse">
          {characteristics.specialFeature}
        </div>

        {/* Loss sequence panic indicators */}
        {isLossSequence && (
          <>
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-red-500 text-lg animate-bounce">😱</div>
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 text-yellow-400 text-xs animate-ping">💨💨💨</div>
          </>
        )}

        {/* Animation state indicator */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className={`w-3 h-1 rounded-full ${isFetchMode ? 'bg-green-400' : 'bg-blue-400'} opacity-70`} />
        </div>
      </div>
    );
  };

  return (
    <motion.div
      ref={canvasRef}
      className="relative w-full h-96 rounded-xl overflow-hidden shadow-2xl"
      animate={{
        x: screenShake.x + (isLossSequence ? lossEffects.shakeIntensity * (Math.random() - 0.5) * 4 : 0),
        y: screenShake.y + (isLossSequence ? lossEffects.shakeIntensity * (Math.random() - 0.5) * 4 : 0),
        scale: visualEffects.heartbeat
      }}
      transition={{ duration: 0.05 }}
      style={{
        filter: `saturate(${visualEffects.saturation}) brightness(${visualEffects.brightness})`,
      }}
    >
      {/* Enhanced red danger flash overlay */}
      <div 
        className="absolute inset-0 bg-red-600 pointer-events-none transition-opacity duration-100 z-50"
        style={{ opacity: Math.max(visualEffects.redFlash, lossEffects.screenFlash) }}
      />

      {/* Loss sequence screen effects */}
      {isLossSequence && (
        <>
          {/* Lightning flashes */}
          <div className="absolute inset-0 bg-yellow-300 pointer-events-none z-45 animate-pulse" 
               style={{ opacity: lossEffects.explosionCount > 3 ? 0.3 : 0 }} />
          
          {/* Chaos overlay */}
          <div className="absolute inset-0 pointer-events-none z-44">
            {Array.from({length: lossEffects.explosionCount}, (_, i) => (
              <div
                key={`explosion-${i}`}
                className="absolute animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  fontSize: `${Math.random() * 20 + 20}px`,
                  animationDelay: `${Math.random() * 0.5}s`
                }}
              >
                {['💥', '⚡', '🔥', '💢'][Math.floor(Math.random() * 4)]}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Background layers */}
      {backgroundLayers.map((layer, index) => (
        <div key={index} className="absolute inset-0" style={{ zIndex: layer.zIndex }}>
          {layer.elements}
        </div>
      ))}

      {/* Player hand holding leash - REPOSITIONED ON PATH */}
      <div
        className="absolute z-25"
        style={{
          left: '8%',
          top: '50%',
          transform: `translate(-50%, -50%) ${isLossSequence ? `rotate(${Math.sin(Date.now() / 100) * 10}deg)` : ''}`
        }}
      >
        {/* Enhanced hand with leash handle */}
        <div className="relative flex items-center justify-center">
          {/* Hand emoji - enlarged */}
          <div className="text-3xl">✋</div>
          
          {/* Leash handle - more prominent */}
          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-4 h-8 bg-amber-900 border-2 border-amber-700 rounded-sm shadow-lg">
            {/* Connection point */}
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gray-600 rounded-full" />
          </div>
          
          {/* Loss sequence panic effects */}
          {isLossSequence && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-red-500 text-lg animate-bounce">😨</div>
          )}
        </div>
      </div>

      {/* Enhanced Leash with loss effects */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
        style={{ overflow: 'visible' }}
        viewBox="0 0 800 600"
        preserveAspectRatio="none"
      >
        {/* White outline for leash */}
        <line
          x1="13%"
          y1="53%"
          x2={`${dogPosition.x}%`}
          y2={`${dogPosition.y}%`}
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.6"
        />
        
        {/* Main leash line with loss effects */}
        <line
          x1="13%"
          y1="53%"
          x2={`${dogPosition.x}%`}
          y2={`${dogPosition.y}%`}
          stroke={isLossSequence ? "#EF4444" : "#8B4513"}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="1"
          style={{
            filter: isLossSequence ? 
              'drop-shadow(0 0 8px #EF4444)' : 
              'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
          }}
        />
      </svg>

      {/* Dog on walking path - HIGHLY VISIBLE */}
      <div
        className="absolute transition-all duration-300 z-30 cursor-pointer"
        style={{
          left: `${dogPosition.x}%`,
          top: `${dogPosition.y}%`,
          transform: `translate(-50%, -50%)`,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
          minWidth: '80px',
          minHeight: '80px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: isLossSequence ? '2px solid rgba(239, 68, 68, 0.8)' : '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%'
        }}
        onClick={() => console.log('Dog clicked!', dogPosition)}
      >
        {getCurrentDogFrame()}
        
        {/* Stress indicators enhanced for loss */}
        {(gameState.riskMultiplier > 1.5 || isLossSequence) && (
          <div className="absolute -top-2 -right-1 text-sm animate-bounce">
            {isLossSequence ? '😰' : '💧'}
          </div>
        )}
      </div>

      {/* Enhanced Bonus Treats - HIGHLY VISIBLE */}
      {bonusItems.filter(item => !item.collected).map((item, index) => (
        <motion.div
          key={index}
          className="absolute z-20 cursor-pointer"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
            y: [0, -5, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{ scale: 1.3 }}
          onClick={() => console.log('Bonus collected:', item)}
        >
          {item.type === 'treat' ? (
            // Enhanced dog treat
            <div className="relative">
              <div className="w-8 h-8 bg-amber-600 rounded-lg border-2 border-amber-400 shadow-lg flex items-center justify-center">
                <div className="text-white font-bold text-lg">🦴</div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 w-8 h-8 bg-amber-400 rounded-lg opacity-50 animate-pulse" />
              {/* Sparkle particles */}
              <div className="absolute -top-1 -right-1 text-yellow-300 text-xs animate-ping">✨</div>
              <div className="absolute -bottom-1 -left-1 text-yellow-300 text-xs animate-ping" style={{ animationDelay: '0.5s' }}>✨</div>
            </div>
          ) : (
            // Enhanced tennis ball
            <div className="relative">
              <div className="w-8 h-8 bg-green-400 rounded-full border-2 border-green-300 shadow-lg flex items-center justify-center">
                <div className="text-white font-bold text-lg">🎾</div>
              </div>
              {/* Bounce effect */}
              <div className="absolute inset-0 w-8 h-8 bg-green-300 rounded-full opacity-30 animate-bounce" />
              {/* Trail effect */}
              <div className="absolute -top-1 -right-1 text-green-200 text-xs animate-pulse">⚡</div>
            </div>
          )}
        </motion.div>
      ))}

      {/* EPIC SQUIRREL - ONLY DURING LOSS SEQUENCE */}
      {isLossSequence && (
        <motion.div
          className="absolute z-40"
          style={{
            left: `${lossEffects.squirrelPosition.x}%`,
            top: `${lossEffects.squirrelPosition.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
          animate={{
            scale: [2, 3, 2], // MASSIVE aggressive squirrel
            rotate: [-25, 25, -25],
            x: [-20, 20, -20],
            y: [-10, 10, -10]
          }}
          transition={{
            duration: 0.1, // Very fast, aggressive movement
            repeat: Infinity
          }}
        >
          {/* Massive warning glow */}
          <div 
            className="absolute inset-0 rounded-full animate-pulse bg-red-600"
            style={{
              width: '120px',
              height: '120px',
              left: '-40px',
              top: '-40px',
              opacity: 0.8
            }}
          />

          {/* MEGA SQUIRREL */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Squirrel body - AGGRESSIVE */}
            <div className="relative w-8 h-8 bg-amber-700 rounded-full border-2 border-amber-600 shadow-2xl">
              {/* Angry eyes */}
              <div className="absolute top-1 left-1 w-1 h-1 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute top-1 right-1 w-1 h-1 bg-red-500 rounded-full animate-pulse" />
              {/* Angry mouth */}
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-red-600">😡</div>
            </div>
            
            {/* Squirrel head */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-amber-600 rounded-full border-2 border-amber-500">
              {/* Evil squirrel face */}
              <div className="absolute top-1 left-1 w-1 h-1 bg-black rounded-full" />
              <div className="absolute top-1 right-1 w-1 h-1 bg-black rounded-full" />
              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black rounded-full" />
            </div>
            
            {/* Ears - twitching */}
            <div className="absolute -top-2 left-1 w-2 h-3 bg-amber-600 rounded-full transform rotate-12 animate-pulse" />
            <div className="absolute -top-2 right-1 w-2 h-3 bg-amber-600 rounded-full transform -rotate-12 animate-pulse" />
            
            {/* MASSIVE tail */}
            <div 
              className="absolute -right-4 top-0 w-8 h-6 bg-amber-700 rounded-full border-2 border-amber-600 shadow-lg"
              style={{ transform: 'rotate(45deg) scale(1.5)' }}
            />
            
            {/* Arms - clawing */}
            <div className="absolute -left-1 top-2 w-2 h-1 bg-amber-600 rounded-full" />
            <div className="absolute -right-1 top-2 w-2 h-1 bg-amber-600 rounded-full" />
            
            {/* Legs - running */}
            <div className="absolute -bottom-1 left-1 w-1 h-2 bg-amber-600 rounded-full" />
            <div className="absolute -bottom-1 right-1 w-1 h-2 bg-amber-600 rounded-full" />
          </div>

          {/* MASSIVE attack effects */}
          <div className="absolute inset-0">
            {/* Lightning storm */}
            {Array.from({length: 8}, (_, i) => (
              <div
                key={`lightning-${i}`}
                className="absolute text-yellow-400 text-4xl animate-ping"
                style={{
                  left: `${(i % 4) * 20 - 40}px`,
                  top: `${Math.floor(i / 4) * 20 - 20}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              >
                ⚡
              </div>
            ))}
            
            {/* Explosion effects */}
            {Array.from({length: 6}, (_, i) => (
              <div
                key={`mega-explosion-${i}`}
                className="absolute text-red-500 text-3xl animate-bounce"
                style={{
                  left: `${(i % 3) * 30 - 30}px`,
                  top: `${Math.floor(i / 3) * 30 - 15}px`,
                  animationDelay: `${i * 0.15}s`
                }}
              >
                💥
              </div>
            ))}
            
            {/* Fire effects */}
            {Array.from({length: 4}, (_, i) => (
              <div
                key={`fire-${i}`}
                className="absolute text-orange-500 text-2xl animate-pulse"
                style={{
                  left: `${i * 15 - 20}px`,
                  top: `${i * 10 - 10}px`,
                  animationDelay: `${i * 0.2}s`
                }}
              >
                🔥
              </div>
            ))}
          </div>

          {/* ATTACK WARNING */}
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-lg px-3 py-1 rounded font-bold animate-pulse">
            🚨 SQUIRREL ATTACK! 🚨
          </div>
        </motion.div>
      )}

      {/* Fetch Mode Speed Lines */}
      {isFetchMode && gameState.isGameActive && (
        <div className="absolute inset-0 overflow-hidden z-10">
          {Array.from({length: 15}, (_, i) => (
            <div
              key={`speed-line-${i}`}
              className="absolute bg-white opacity-60 h-1 animate-pulse"
              style={{
                left: `${(i * 8) % 120}%`,
                top: `${30 + (i % 4) * 15}%`,
                width: '20px',
                animation: `slide-left 0.1s linear infinite`,
                animationDelay: `${i * 0.02}s`
              }}
            />
          ))}
        </div>
      )}

      {/* HUD Overlays - Updated for loss sequence */}
      <div className="absolute top-4 right-4 z-40">
        <div className="bg-black bg-opacity-60 rounded-lg p-3 border border-gray-600">
          <div className="text-white text-sm font-bold">
            {isLossSequence ? '🚨 SQUIRREL ATTACK!' :
             gameState.riskMultiplier > 2.5 ? '⚠️ EXTREME DANGER!' :
             gameState.riskMultiplier > 2 ? '🔥 HIGH RISK' :
             gameState.riskMultiplier > 1.5 ? '⚡ DANGER ZONE' :
             '✅ Safe Zone'}
          </div>
          <div className="text-gray-300 text-xs">
            {isLossSequence ? 'GAME OVER' : `Risk: ${gameState.riskMultiplier.toFixed(1)}x`}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedCanvas; 