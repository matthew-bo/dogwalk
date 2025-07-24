import React, { useState, useEffect, useRef } from 'react';
import { useGameContext } from '../contexts/GameContext';
import { useAuth } from '../hooks/useAuth';
import { Wallet, Play, AlertTriangle, Pause, Settings, Info, Maximize, Minimize } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import GameCanvas from '../components/game/GameCanvas';
import GameResultModal from '../components/game/GameResultModal';

const GamePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { gameState, startGame, cashOut, isStarting, isCashingOut } = useGameContext();
  const [betAmount, setBetAmount] = useState(100); // Default $1.00 in cents
  const [showResultModal, setShowResultModal] = useState(false);
  const [lastGameResult, setLastGameResult] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [demoBalance, setDemoBalance] = useState(10000); // $100 demo balance
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Use demo balance if not authenticated
  const balance = isAuthenticated ? (user?.usdBalanceCents || 0) / 100 : demoBalance / 100;
  const maxBet = Math.min(balance * 100, 1000); // Max $10.00 per bet
  const isDemo = !isAuthenticated;

  // Show result modal when game ends
  useEffect(() => {
    if (!gameState.isGameActive && gameState.currentSession && lastGameResult) {
      setShowResultModal(true);
    }
  }, [gameState.isGameActive, gameState.currentSession, lastGameResult]);

  const handleStartGame = async () => {
    if (betAmount <= 0 || betAmount > (isDemo ? demoBalance : user?.usdBalanceCents!)) return;
    setLastGameResult(null);
    setShowResultModal(false);
    setShowSettings(false);
    
    if (isDemo) {
      // Update demo balance
      setDemoBalance(prev => prev - betAmount);
    }
    
    await startGame(betAmount);
  };

  const handleCashOut = async () => {
    const payout = Math.round(betAmount * gameState.currentMultiplier);
    const result = {
      outcome: 'win' as const,
      betAmount,
      walkTime: gameState.gameTime,
      multiplier: gameState.currentMultiplier,
      payout,
      squirrelTime: undefined
    };
    setLastGameResult(result);
    
    if (isDemo) {
      // Update demo balance with winnings
      setDemoBalance(prev => prev + payout);
    }
    
    await cashOut();
  };

  const handleGameLoss = () => {
    const result = {
      outcome: 'loss' as const,
      betAmount,
      walkTime: gameState.gameTime,
      multiplier: gameState.currentMultiplier,
      payout: 0,
      squirrelTime: gameState.gameTime
    };
    setLastGameResult(result);
  };

  // Listen for squirrel events
  useEffect(() => {
    if (gameState.squirrelEvent && gameState.isGameActive) {
      handleGameLoss();
    }
  }, [gameState.squirrelEvent]);

  // Fullscreen functionality
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && gameContainerRef.current) {
        await gameContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      // Fallback: if element fullscreen fails, show a modal-style fullscreen
      setIsFullscreen(!isFullscreen);
    }
  };

  // Listen for fullscreen changes and keyboard shortcuts
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // F key to toggle fullscreen (when not typing in inputs)
      if (event.key === 'f' && !event.ctrlKey && !event.metaKey && 
          event.target instanceof HTMLElement && 
          event.target.tagName !== 'INPUT' && 
          event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        toggleFullscreen();
      }
      // ESC key to exit fullscreen
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const potential = ((betAmount * gameState.currentMultiplier) / 100).toFixed(2);

  return (
    <>
      <div className={`${isFullscreen ? 'max-w-full px-4' : 'max-w-6xl mx-auto'} space-y-6`}>
        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Info className="text-blue-400" size={24} />
              <div>
                <h3 className="text-blue-400 font-bold text-lg">🎮 Demo Mode</h3>
                <p className="text-gray-300">
                  Playing with demo money ($100 virtual balance). 
                  <span className="text-blue-400 ml-2 cursor-pointer hover:underline">
                    Sign up to play with real cryptocurrency →
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="gradient-text">Dog Walk</span> Adventure
          </h1>
          <p className="text-gray-300 text-lg">
            Guide your dog through the park and cash out before the squirrel appears!
          </p>
          {!isFullscreen && (
            <div className="mt-2 text-sm text-blue-400">
              💡 Press 'F' or click Fullscreen button for immersive gaming
            </div>
          )}
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <Wallet className="mx-auto mb-2 text-green-400" size={24} />
            <p className="text-lg font-bold">${balance.toFixed(2)}</p>
            <p className="text-gray-400 text-sm">
              {isDemo ? 'Demo Balance' : 'Your Balance'}
            </p>
          </div>
          
          <div className="card text-center">
            <p className="text-lg font-bold text-blue-400">
              ${(betAmount / 100).toFixed(2)}
            </p>
            <p className="text-gray-400 text-sm">Current Bet</p>
          </div>
          
          <div className="card text-center">
            <p className="text-lg font-bold text-purple-400">
              {gameState.isGameActive ? `$${potential}` : '$0.00'}
            </p>
            <p className="text-gray-400 text-sm">Potential Win</p>
          </div>
        </div>

        {/* Main Game Canvas */}
        <div 
          ref={gameContainerRef}
          className={`relative transition-all duration-300 ${
            isFullscreen 
              ? 'fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 p-8' 
              : ''
          }`}
        >
          {/* Fullscreen Exit Button */}
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors"
              aria-label="Exit fullscreen"
            >
              <Minimize size={24} />
            </button>
          )}
          
          {/* Fullscreen Header */}
          {isFullscreen && (
            <div className="absolute top-4 left-4 z-10">
              <h2 className="text-2xl font-bold text-white">
                🎮 Dog Walk Gamble
              </h2>
              <p className="text-blue-400 text-sm">
                Press ESC or 'F' to exit fullscreen
              </p>
            </div>
          )}
          
          <div className={`${isFullscreen ? 'h-full flex items-center justify-center' : ''}`}>
            <GameCanvas betAmount={betAmount} />
          </div>
          
          {/* Game Controls Overlay */}
          {!gameState.isGameActive ? (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn-secondary py-3 px-4 flex items-center space-x-2"
              >
                <Settings size={20} />
                <span>Bet: ${(betAmount / 100).toFixed(2)}</span>
              </button>
              
              <button
                onClick={handleStartGame}
                disabled={isStarting || betAmount > (isDemo ? demoBalance : user?.usdBalanceCents || 0) || betAmount < 50}
                className="btn-primary py-4 px-8 text-xl flex items-center space-x-3 transform hover:scale-105 transition-all shadow-2xl"
              >
                {isStarting ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Play size={24} />
                    <span>Start Walking</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <button
                onClick={handleCashOut}
                disabled={isCashingOut}
                className="cash-out-button btn-danger py-4 px-8 text-xl flex items-center space-x-3 animate-pulse shadow-2xl transform hover:scale-105 transition-all"
              >
                {isCashingOut ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span>Stopping...</span>
                  </>
                ) : (
                  <>
                    <Pause size={24} />
                    <span>CASH OUT NOW!</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Small Icon Buttons - Bottom Right */}
          <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-30">
            {/* Help Button */}
            <button
              onClick={() => setShowHelp(true)}
              className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-200 backdrop-blur-sm border border-gray-600/50 hover:border-gray-400/50 hover:scale-110 group"
              aria-label="Help and game rules"
              title="Help"
            >
              <Info size={16} />
              {/* Tooltip */}
              <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                Help
              </div>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all duration-200 backdrop-blur-sm border border-gray-600/50 hover:border-gray-400/50 hover:scale-110 group"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              {/* Tooltip */}
              <div className="absolute right-full mr-2 top-1/2 transform -translate-y-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </div>
            </button>
          </div>
        </div>

        {/* Bet Settings Panel */}
        {showSettings && !gameState.isGameActive && (
          <div className="card animate-slide-in">
            <h3 className="text-lg font-bold mb-4">Bet Settings</h3>
            
            {/* Bet Amount Slider */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bet Amount
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="50"
                  max={Math.max(50, isDemo ? demoBalance : user?.usdBalanceCents || 50)}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="flex-1 h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="bg-gray-700 px-4 py-2 rounded-lg min-w-[100px] text-center font-bold">
                  ${(betAmount / 100).toFixed(2)}
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>$0.50 min</span>
                <span>${(maxBet / 100).toFixed(2)} max</span>
              </div>
            </div>

            {/* Quick Bet Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[50, 100, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={amount > (isDemo ? demoBalance : user?.usdBalanceCents || 0)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    betAmount === amount 
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ${(amount / 100).toFixed(2)}
                </button>
              ))}
            </div>

            {/* Warnings */}
            {betAmount > (isDemo ? demoBalance : user?.usdBalanceCents || 0) && (
              <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
                <AlertTriangle size={16} />
                <span>
                  {isDemo ? 'Not enough demo balance' : 'Insufficient balance - Please add funds or reduce bet'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Game Instructions */}
        <div className="card bg-blue-900/20 border border-blue-500/30">
          <h3 className="text-lg font-bold text-blue-400 mb-3">🎮 How to Play</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="mb-2"><strong>🎯 Goal:</strong> Cash out before the squirrel appears</p>
              <p className="mb-2"><strong>💰 Earnings:</strong> Multiplier grows every second</p>
            </div>
            <div>
              <p className="mb-2"><strong>⏰ Risk:</strong> Squirrel chance increases over time</p>
              <p className="mb-2"><strong>🏆 Strategy:</strong> Balance risk vs reward</p>
            </div>
          </div>
          
          {isDemo && (
            <div className="mt-4 p-3 bg-blue-900/10 rounded border border-blue-500/20">
              <p className="text-blue-300 text-sm">
                💡 <strong>Demo Mode:</strong> You're playing with virtual money. Create an account to play with real cryptocurrency and save your scores!
              </p>
            </div>
          )}
        </div>

        {/* Reset Demo Balance Button (Demo Mode Only) */}
        {isDemo && demoBalance < 100 && (
          <div className="text-center">
            <button
              onClick={() => setDemoBalance(10000)}
              className="btn-secondary py-3 px-6"
            >
              Reset Demo Balance ($100)
            </button>
          </div>
        )}
      </div>

      {/* Game Result Modal */}
      <GameResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={lastGameResult}
      />

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">🎮 How to Play Dog Walk</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Game Overview */}
                <div>
                  <h3 className="text-lg font-bold text-blue-400 mb-3">Game Overview</h3>
                  <p className="text-gray-300">
                    Dog Walk is a thrilling gambling game where you bet on how long your virtual dog can walk 
                    before a squirrel appears. The longer the walk, the higher your potential payout - but wait 
                    too long and you could lose everything!
                  </p>
                </div>

                {/* How to Play */}
                <div>
                  <h3 className="text-lg font-bold text-green-400 mb-3">How to Play</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">1️⃣</span>
                        <div>
                          <h4 className="font-bold text-white">Set Your Bet</h4>
                          <p className="text-gray-300 text-sm">Choose how much you want to wager (minimum $0.50)</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">2️⃣</span>
                        <div>
                          <h4 className="font-bold text-white">Start Walking</h4>
                          <p className="text-gray-300 text-sm">Click "Start Walking" to begin the game</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">3️⃣</span>
                        <div>
                          <h4 className="font-bold text-white">Watch the Multiplier</h4>
                          <p className="text-gray-300 text-sm">Your potential payout grows every second</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">4️⃣</span>
                        <div>
                          <h4 className="font-bold text-white">Cash Out in Time</h4>
                          <p className="text-gray-300 text-sm">Click "Cash Out" before the squirrel appears</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multiplier System */}
                <div>
                  <h3 className="text-lg font-bold text-purple-400 mb-3">Multiplier System</h3>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-green-400 font-bold">1-5 seconds</div>
                        <div className="text-gray-300 text-sm">1.15x - 1.92x</div>
                        <div className="text-green-400 text-xs">Low Risk</div>
                      </div>
                      <div>
                        <div className="text-yellow-400 font-bold">6-10 seconds</div>
                        <div className="text-gray-300 text-sm">1.92x - 3.45x</div>
                        <div className="text-yellow-400 text-xs">Medium Risk</div>
                      </div>
                      <div>
                        <div className="text-orange-400 font-bold">11-20 seconds</div>
                        <div className="text-gray-300 text-sm">3.45x - 9.89x</div>
                        <div className="text-orange-400 text-xs">High Risk</div>
                      </div>
                      <div>
                        <div className="text-red-400 font-bold">20+ seconds</div>
                        <div className="text-gray-300 text-sm">9.89x+</div>
                        <div className="text-red-400 text-xs">Extreme Risk</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fairness */}
                <div>
                  <h3 className="text-lg font-bold text-yellow-400 mb-3">🎯 Provably Fair</h3>
                  <p className="text-gray-300 mb-2">
                    Every game is provably fair using cryptographic randomness. The squirrel event time is 
                    predetermined before each game starts, ensuring complete fairness.
                  </p>
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm">
                      <strong>House Edge:</strong> 8% - This means over time, the house keeps 8% of all bets. 
                      The remaining 92% is paid out to players as winnings.
                    </p>
                  </div>
                </div>

                {/* Tips */}
                <div>
                  <h3 className="text-lg font-bold text-blue-400 mb-3">💡 Pro Tips</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-400">•</span>
                      <span>Start with small bets to get a feel for the game</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-400">•</span>
                      <span>Set a target multiplier and stick to it</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-400">•</span>
                      <span>Remember: the longer you wait, the higher the risk</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-400">•</span>
                      <span>Try the demo mode first to practice risk-free</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-400">•</span>
                      <span>Use game fullscreen for focused gaming (press 'F' key or Fullscreen button)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setShowHelp(false)}
                  className="btn-primary py-3 px-6"
                >
                  Got it! Let's Play
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GamePage; 