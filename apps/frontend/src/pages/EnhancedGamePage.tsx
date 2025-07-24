import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useEnhancedGame, EnhancedGameProvider } from '../contexts/EnhancedGameContext';
import EnhancedCanvas from '../components/game/EnhancedCanvas';
import DogSelectionCarousel from '../components/game/DogSelectionCarousel';
import MiniGameEventModal from '../components/game/MiniGameEventModal';

import { VisualEffects } from '../components/game/VisualEffects';
import { AddictiveEnhancements } from '../components/game/AddictiveEnhancements';
import { 
  Play, 
  DollarSign, 
  Info, 
  Maximize, 
  Minimize,
  Trophy,
  Star,
  Gift,
  Zap,
  X,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GAME_CONFIG } from 'shared';
import { assetManager } from '../utils/assetManager';

const EnhancedGamePageContent: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { state, startEnhancedGame, cashOut, resetGame, makeEventChoice, usePowerUp } = useEnhancedGame();
  const [betAmount, setBetAmount] = useState(50); // $0.50 in cents
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastGameResult, setLastGameResult] = useState<any>(null);

  const [demoBalance, setDemoBalance] = useState(10000); // $100 demo balance
  const [selectedDogId, setSelectedDogId] = useState<string>('golden_retriever');
  const [isFetchMode, setIsFetchMode] = useState(false);
  const [fetchModeError, setFetchModeError] = useState<string | null>(null);
  
  // Visual effects triggers
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCoins, setShowCoins] = useState(false);

  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Get selected dog breed
  const selectedDogBreed = assetManager.getDogBreed(selectedDogId) || assetManager.getAllDogBreeds()[0];

  // Demo mode detection
  const isDemo = !isAuthenticated;
  const balance = isAuthenticated ? (user?.usdBalanceCents || 0) / 100 : demoBalance / 100;

  // Handle game result
  useEffect(() => {
    if (state.gameResult) {
      const enhancedResult = {
        outcome: state.gameResult.outcome,
        betAmount: betAmount,
        walkTime: state.gameTime,
        baseMultiplier: state.gameResult.baseMultiplier,
        bonusMultiplier: state.gameResult.bonusMultiplier,
        finalMultiplier: state.gameResult.finalMultiplier,
        payout: state.gameResult.payout,
        eventsTriggered: state.gameResult.eventsTriggered,
        squirrelTime: state.gameResult.outcome === 'loss' ? state.gameTime : undefined,
        jackpotWon: state.progressiveJackpot.isTriggered ? {
          amount: state.progressiveJackpot.currentAmount,
          multiplier: state.progressiveJackpot.multiplier || 1
        } : undefined
      };
      setLastGameResult(enhancedResult);
      
      if (state.gameResult.outcome === 'win') {
        toast.success(`🎉 Won $${(state.gameResult.payout / 100).toFixed(2)}!`);
        
        // Trigger visual effects based on win type
        if (state.progressiveJackpot.isTriggered) {
          // Jackpot win - confetti + coins
          setShowConfetti(true);
          setShowCoins(true);
          setTimeout(() => setShowConfetti(false), 3000);
          setTimeout(() => setShowCoins(false), 2000);
        } else if (state.gameResult.finalMultiplier > 5) {
          // Big win - confetti
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);
        } else {
          // Regular win - coins
          setShowCoins(true);
          setTimeout(() => setShowCoins(false), 1500);
        }
      } else {
        toast.error('💔 Better luck next time!');
      }
    }
  }, [state.gameResult, betAmount, state.gameTime, state.progressiveJackpot]);

  // Handle errors
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleStartGame = async () => {
    const maxBalance = isDemo ? demoBalance : (user?.usdBalanceCents || 0);
    
    if (betAmount < GAME_CONFIG.MIN_BET_CENTS || betAmount > maxBalance) {
      toast.error(`Invalid bet amount. Min: $${(GAME_CONFIG.MIN_BET_CENTS / 100).toFixed(2)}, Max: $${(maxBalance / 100).toFixed(2)}`);
      return;
    }

    setLastGameResult(null);
    setShowInfo(false);
    
    if (isDemo) {
      // Demo mode - update demo balance locally
      setDemoBalance(prev => prev - betAmount);
      toast.success(`Demo game started! Bet: $${(betAmount / 100).toFixed(2)} with ${selectedDogBreed.displayName}!`);
      
      // For demo mode, we'll let the enhanced game context handle local simulation
      // Fall through to startEnhancedGame which should handle demo mode gracefully
    }

    try {
      await startEnhancedGame(betAmount, isFetchMode);
      toast.success(`Enhanced game started with ${selectedDogBreed.displayName}${isFetchMode ? ' in Fetch Mode' : ''}!`);
    } catch (error) {
      console.error('Failed to start enhanced game:', error);
      toast.error('Failed to start game');
    }
  };

  const handleFetchModeToggle = () => {
    if (state.isGameActive) {
      setFetchModeError('Cannot change Fetch Mode during active game');
      setTimeout(() => setFetchModeError(null), 3000);
      return;
    }
    setIsFetchMode(!isFetchMode);
    setFetchModeError(null);
  };

  const handleDogSelection = (dogId: string) => {
    if (state.isGameActive) {
      toast.error('Cannot change dog during active game');
      return;
    }
    setSelectedDogId(dogId);
    toast.success(`Selected ${assetManager.getDogBreed(dogId)?.displayName}!`);
  };

  const handlePlayAgain = () => {
    setLastGameResult(null);
    resetGame();
    // Reset demo balance if user won in demo mode
    if (isDemo && lastGameResult?.outcome === 'win') {
      setDemoBalance(prev => prev + (lastGameResult.payout || 0));
    }
  };

  const handleGameCanvasClick = () => {
    if (!state.isGameActive) {
      handleStartGame();
    }
  };

  const handleCashOut = async () => {
    try {
      await cashOut();
      toast.success('Cashed out successfully!');
    } catch (error) {
      console.error('Failed to cash out:', error);
      toast.error('Failed to cash out');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && gameContainerRef.current) {
        await gameContainerRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      // Fallback for browsers that don't support fullscreen
      setIsFullscreen(!isFullscreen);
    }
  };

  const formatCurrency = (cents: number) => (cents / 100).toFixed(2);

  const getMaxBet = () => Math.min(isDemo ? demoBalance : (user?.usdBalanceCents || 0), GAME_CONFIG.MAX_BET_CENTS);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">🐕 Enhanced Dog Walk Rules & Features</h2>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6 text-gray-300">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">🎮 How to Play</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Set your bet amount (minimum $0.50)</li>
                    <li>• Click the game area or "Start Enhanced Walk" to begin</li>
                    <li>• Watch your dog walk through the park as multipliers grow</li>
                    <li>• Cash out anytime before a squirrel appears</li>
                    <li>• Interact with mini-game events for bonuses</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">⚡ Enhanced Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span>🦴</span>
                        <span className="font-semibold text-white">Bonus Treats</span>
                      </div>
                      <p className="text-xs">Risk/reward mini-games with choice outcomes</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span>🎾</span>
                        <span className="font-semibold text-white">Fetch Mode</span>
                      </div>
                      <p className="text-xs">High risk, high reward opportunities</p>
                    </div>

                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span>🛡️</span>
                        <span className="font-semibold text-white">Leash Slack</span>
                      </div>
                      <p className="text-xs">One-time squirrel protection power-up</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">💰 Progressive Jackpot</h3>
                  <p className="text-sm">
                    5% chance every 5 seconds to trigger the progressive jackpot!
                    Current jackpot: <span className="text-yellow-400 font-bold">${formatCurrency(state.progressiveJackpot.currentAmount)}</span>
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">📊 Odds & House Edge</h3>
                  <p className="text-sm">
                    This game maintains a fair 8% house edge. All outcomes are provably fair using cryptographic randomness.
                    Risk increases over time, but so do the potential rewards!
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>





              {/* Main Content */}
        <div className={`container mx-auto px-4 py-8 ${isFullscreen ? 'p-0 h-screen' : ''}`}>
          {/* Demo Mode Banner */}
          {isDemo && !isFullscreen && (
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <Info className="text-blue-400" size={24} />
                <div>
                  <h3 className="text-blue-400 font-bold text-lg">🎮 Demo Mode</h3>
                  <p className="text-gray-300">
                    Playing with demo money ($100 virtual balance). 
                    <span className="text-blue-400 ml-2 cursor-pointer hover:underline">
                      Sign up to play with real cryptocurrency and unlock enhanced features →
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}



        {/* Header (hidden in fullscreen) */}
        {!isFullscreen && (
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center space-x-3">
                <span>🐕</span>
                <span>Enhanced Dog Walk</span>
                <span className="text-xl bg-gradient-to-r from-yellow-400 to-orange-400 text-transparent bg-clip-text">
                  ⚡ POWERED UP
                </span>
              </h1>
              <p className="text-gray-300 mt-2">Multi-event gambling with bonuses and power-ups</p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Balance Display */}
              <div className="bg-black bg-opacity-30 rounded-lg px-4 py-2">
                <div className="text-white font-semibold">
                  Balance: ${balance.toFixed(2)}
                  {isDemo && <span className="text-blue-400 text-sm ml-1">(Demo)</span>}
                </div>
              </div>

              {/* Progressive Jackpot Display */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg px-4 py-2"
              >
                <div className="text-white font-semibold flex items-center space-x-2">
                  <Trophy size={16} />
                  <span>Jackpot: ${formatCurrency(state.progressiveJackpot.currentAmount)}</span>
                </div>
              </motion.div>

              {/* Info Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowInfo(true)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                title="Game Rules & Features"
              >
                <Info size={20} />
              </motion.button>

              {/* Fullscreen Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleFullscreen}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize size={20} />
              </motion.button>
            </div>
          </div>
        )}

        {/* Game Area - Centered */}
        <div 
          ref={gameContainerRef}
          className={`${isFullscreen ? 'h-screen bg-gray-900 relative' : 'flex flex-col items-center'}`}
        >
          {/* Fullscreen Exit Button */}
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-black hover:bg-opacity-70 text-white p-3 rounded-full transition-all"
              title="Exit Fullscreen"
            >
              <Minimize size={24} />
            </button>
          )}

          {/* Game Canvas */}
          <div 
            className={`${isFullscreen ? 'h-full flex items-center justify-center' : 'w-full max-w-4xl'} bg-black bg-opacity-20 rounded-xl p-6 backdrop-blur-sm cursor-pointer relative overflow-hidden`}
            onClick={handleGameCanvasClick}
          >
            {/* Click to Start Overlay */}
            {!state.isGameActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10 rounded-xl">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-center"
                >
                  <div className="text-6xl mb-4">🎮</div>
                  <div className="text-white text-2xl font-bold mb-2">Click to Start Walking!</div>
                  <div className="text-gray-300">Bet: ${formatCurrency(betAmount)}</div>
                </motion.div>
              </div>
            )}

            <EnhancedCanvas 
              selectedDogBreed={selectedDogBreed}
              gameState={state}
              isFetchMode={isFetchMode}
              currentMinigame={state.activeMiniGame ? {
                type: state.activeMiniGame.type,
                isActive: state.activeMiniGame.isActive
              } : undefined}
              gameResult={state.gameResult}
            />

            {/* Cash Out Button Overlay - Bottom Center */}
            {state.isGameActive && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCashOut}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 rounded-xl text-white font-bold text-lg shadow-2xl transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <DollarSign size={20} />
                  <span>Cash Out ${formatCurrency(state.currentPayout)}</span>
                </div>
              </motion.button>
            )}

            {/* Mini Game Event Modal - Top of Game Area */}
            {state.activeMiniGame && (
              <MiniGameEventModal
                isOpen={true}
                event={{
                  id: state.activeMiniGame.id,
                  type: state.activeMiniGame.type as 'bonus_treat' | 'fetch_game',
                  title: state.activeMiniGame.title,
                  description: state.activeMiniGame.description,
                  riskDescription: state.activeMiniGame.riskDescription || 'Taking a risk...',
                  rewardDescription: state.activeMiniGame.rewardDescription || 'Potential reward...',
                  acceptAction: state.activeMiniGame.acceptAction,
                  declineAction: state.activeMiniGame.declineAction,
                  timeLimit: 10
                }}
                onChoice={(choice) => makeEventChoice(state.activeMiniGame!.type, choice)}
                onTimeout={() => makeEventChoice(state.activeMiniGame!.type, 'decline')}
              />
            )}
          </div>

          {/* Controls Below Game (hidden in fullscreen) */}
          {!isFullscreen && (
            <div className="w-full max-w-4xl mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Betting Controls */}
                <div className="bg-black bg-opacity-30 rounded-xl p-6 backdrop-blur-sm">
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center space-x-2">
                    <DollarSign className="text-green-400" />
                    <span>Betting</span>
                  </h3>

                  {!state.isGameActive ? (
                    <div className="space-y-4">
                      {/* Bet Amount */}
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">
                          Bet Amount
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="number"
                            value={(betAmount / 100).toFixed(2)}
                            onChange={(e) => setBetAmount(Math.round(parseFloat(e.target.value || '0') * 100))}
                            min={(GAME_CONFIG.MIN_BET_CENTS / 100).toFixed(2)}
                            max={(getMaxBet() / 100).toFixed(2)}
                            step="0.01"
                            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                            placeholder="Enter bet amount"
                          />
                        </div>
                        <div className="mt-2 text-gray-400 text-xs">
                          Min: ${(GAME_CONFIG.MIN_BET_CENTS / 100).toFixed(2)} | Max: ${formatCurrency(getMaxBet())}
                        </div>
                      </div>

                      {/* Quick Bet Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {[50, 100, 500].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setBetAmount(amount)}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
                          >
                            ${formatCurrency(amount)}
                          </button>
                        ))}
                      </div>

                      {/* Start Game Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStartGame}
                        disabled={betAmount < GAME_CONFIG.MIN_BET_CENTS || betAmount > getMaxBet()}
                        className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-500 rounded-xl text-white font-bold text-lg transition-all duration-200 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <Play size={20} />
                          <span>{isDemo ? 'Start Demo Walk' : 'Start Enhanced Walk'}</span>
                          {!isDemo && <Star className="text-yellow-300" size={16} />}
                        </div>
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-4">

                      {/* Power-ups */}
                      {!state.activeBonuses.leashSlackUsed && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => usePowerUp('leash_slack')}
                          className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold transition-colors"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <span>🛡️</span>
                            <span>Use Leash Slack</span>
                          </div>
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Stats */}
                <div className="bg-black bg-opacity-30 rounded-xl p-6 backdrop-blur-sm">
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center space-x-2">
                    <Zap className="text-yellow-400" />
                    <span>Live Stats</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Base Multiplier</div>
                      <div className="text-white font-bold">{state.baseMultiplier.toFixed(2)}x</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Bonus Multiplier</div>
                      <div className="text-yellow-400 font-bold">{state.bonusMultiplier.toFixed(2)}x</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Risk Level</div>
                      <div className="text-red-400 font-bold">{state.riskMultiplier.toFixed(1)}x</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Current Payout</div>
                      <div className="text-green-400 font-bold">${formatCurrency(state.currentPayout)}</div>
                    </div>
                  </div>

                  {/* Game Time */}
                  <div className="mt-4 bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-gray-400 text-xs">Game Time</div>
                    <div className="text-white font-bold text-xl">{state.gameTime}s</div>
                  </div>
                </div>

                {/* Enhanced Features */}
                <div className="bg-black bg-opacity-30 rounded-xl p-6 backdrop-blur-sm">
                  <h3 className="text-white font-bold text-lg mb-4 flex items-center space-x-2">
                    <Gift className="text-purple-400" />
                    <span>Enhanced Features</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">🦴</span>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">Bonus Treats</div>
                        <div className="text-gray-400 text-xs">Risk/reward mini-games</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">🎾</span>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">Fetch Mode</div>
                        <div className="text-gray-400 text-xs">High risk, high reward</div>
                      </div>
                    </div>



                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        state.activeBonuses.leashSlackUsed ? 'bg-gray-500' : 'bg-purple-500'
                      }`}>
                        <span className="text-white text-sm">🛡️</span>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">Leash Slack</div>
                        <div className="text-gray-400 text-xs">
                          {state.activeBonuses.leashSlackUsed ? 'Used' : 'Available'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">💰</span>
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">Progressive Jackpot</div>
                        <div className="text-gray-400 text-xs">5% chance every 5s</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fetch Mode Toggle - Always visible but restricted during game */}
          {!isFullscreen && (
            <div className="w-full max-w-4xl mt-6 flex justify-center relative">
              <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-4">
                <span className="text-white font-medium">🎾 Fetch Mode</span>
                <button
                  onClick={handleFetchModeToggle}
                  disabled={state.isGameActive}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    state.isGameActive
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : isFetchMode 
                        ? 'bg-green-600 text-white shadow-lg hover:bg-green-500' 
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {isFetchMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
                <div className="flex flex-col">
                  <span className="text-gray-300 text-sm">
                    {isFetchMode ? 'Higher risk, higher reward!' : 'Enable for tennis ball bonuses'}
                  </span>
                  {state.isGameActive && (
                    <span className="text-yellow-400 text-xs">Locked during game</span>
                  )}
                </div>
              </div>
              
              {/* Fetch Mode Error Message */}
              <AnimatePresence>
                {fetchModeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-16 bg-orange-500 bg-opacity-90 rounded-lg px-4 py-2 shadow-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={16} className="text-white" />
                      <span className="text-white text-sm font-medium">{fetchModeError}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Reset Demo Balance Button (Demo Mode Only) */}
          {isDemo && demoBalance < 100 && !isFullscreen && (
            <div className="w-full max-w-4xl mt-6 text-center">
              <button
                onClick={() => setDemoBalance(10000)}
                className="bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold py-3 px-6 transition-colors"
              >
                Reset Demo Balance ($100)
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Inline Game Result Card - Below the game */}
      {!isFullscreen && lastGameResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="w-full max-w-4xl mx-auto mt-8 px-4"
        >
          <div className={`
            rounded-xl p-6 backdrop-blur-sm border-2 shadow-2xl
            ${lastGameResult.outcome === 'win' 
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-400' 
              : 'bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-400'
            }
          `}>
            <div className="flex items-center justify-between mb-4">
              {/* Result Header */}
              <div className="flex items-center space-x-4">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: lastGameResult.outcome === 'win' ? [0, 5, -5, 0] : [0, -5, 5, 0]
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-5xl"
                >
                  {lastGameResult.outcome === 'win' ? '🎉' : '💔'}
                </motion.div>
                
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {lastGameResult.outcome === 'win' ? 'You Won!' : 'Game Over'}
                  </h2>
                  <p className="text-gray-300">
                    {selectedDogBreed.displayName} walked for {lastGameResult.walkTime.toFixed(1)}s
                  </p>
                </div>
              </div>

              {/* Play Again Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePlayAgain}
                className="bg-white hover:bg-gray-100 text-gray-800 font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-lg"
              >
                <RotateCcw size={18} />
                <span>Play Again</span>
              </motion.button>
            </div>

            {/* Result Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bet Amount */}
              <div className="bg-black bg-opacity-20 rounded-lg p-4 text-center">
                <div className="text-gray-300 text-sm mb-1">Bet Amount</div>
                <div className="text-white text-xl font-bold">
                  ${formatCurrency(lastGameResult.betAmount)}
                </div>
              </div>

              {/* Profit/Loss */}
              <div className="bg-black bg-opacity-20 rounded-lg p-4 text-center">
                <div className="text-gray-300 text-sm mb-1">
                  {lastGameResult.outcome === 'win' ? 'Profit' : 'Loss'}
                </div>
                <div className={`text-2xl font-bold ${
                  lastGameResult.outcome === 'win' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {lastGameResult.outcome === 'win' 
                    ? `+$${formatCurrency(lastGameResult.payout - lastGameResult.betAmount)}`
                    : `-$${formatCurrency(lastGameResult.betAmount)}`
                  }
                </div>
                {lastGameResult.outcome === 'win' && (
                  <div className="text-gray-300 text-sm mt-1">
                    Payout: ${formatCurrency(lastGameResult.payout)} ({lastGameResult.finalMultiplier.toFixed(2)}x)
                  </div>
                )}
              </div>

              {/* Special Features */}
              <div className="bg-black bg-opacity-20 rounded-lg p-4 text-center">
                {lastGameResult.jackpotWon ? (
                  <>
                    <div className="text-yellow-300 text-sm mb-1">🎰 Jackpot Won!</div>
                    <div className="text-yellow-400 text-xl font-bold animate-pulse">
                      ${formatCurrency(lastGameResult.jackpotWon.amount)}
                    </div>
                  </>
                ) : lastGameResult.eventsTriggered && lastGameResult.eventsTriggered.length > 0 ? (
                  <>
                    <div className="text-purple-300 text-sm mb-1">Events Triggered</div>
                    <div className="text-purple-400 text-lg font-bold">
                      {lastGameResult.eventsTriggered.join(', ')}
                    </div>
                  </>
                ) : lastGameResult.outcome === 'loss' && lastGameResult.squirrelTime ? (
                  <>
                    <div className="text-red-300 text-sm mb-1">Squirrel Attack</div>
                    <div className="text-red-400 text-lg font-bold">
                      At {lastGameResult.squirrelTime.toFixed(1)}s
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-300 text-sm mb-1">Walk Time</div>
                    <div className="text-white text-xl font-bold">
                      {lastGameResult.walkTime.toFixed(1)}s
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Dog Selection Carousel - Below the game */}
      {!isFullscreen && !state.isGameActive && !lastGameResult && (
        <div className="w-full max-w-4xl mx-auto mt-8 px-4">
          <div className="bg-black bg-opacity-20 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white text-center mb-6">Choose Your Dog</h2>
            <DogSelectionCarousel
              onDogSelected={handleDogSelection}
              selectedDogId={selectedDogId}
            />
          </div>
        </div>
      )}
      
      {/* Visual Effects */}
      <VisualEffects
        triggerConfetti={showConfetti}
        triggerCoins={showCoins}
        triggerSparkles={false}
        ambientParticles={true}
        gameActive={state.isGameActive}
      />
      
      {/* Addictive Psychology Enhancements */}
      <AddictiveEnhancements
        gameState={{
          isGameActive: state.isGameActive,
          gameTime: state.gameTime,
          riskMultiplier: state.riskMultiplier,
          currentPayout: state.currentPayout
        }}
        gameResult={lastGameResult ? {
          outcome: lastGameResult.outcome,
          payout: lastGameResult.payout,
          squirrelTime: lastGameResult.squirrelTime
        } : undefined}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  );
};

// Main component with provider wrapper
const EnhancedGamePage: React.FC = () => {
  return (
    <EnhancedGameProvider>
      <EnhancedGamePageContent />
    </EnhancedGameProvider>
  );
};

export default EnhancedGamePage; 