import React from 'react';
import { X, Trophy, XCircle, Clock, DollarSign } from 'lucide-react';

interface GameResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    outcome: 'win' | 'loss';
    betAmount: number;
    walkTime: number;
    multiplier: number;
    payout: number;
    squirrelTime?: number;
  } | null;
}

const GameResultModal: React.FC<GameResultModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  const isWin = result.outcome === 'win';
  const profit = result.payout - result.betAmount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 rounded-t-xl ${isWin ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isWin ? (
                <Trophy className="text-yellow-400" size={32} />
              ) : (
                <XCircle className="text-red-400" size={32} />
              )}
              <div>
                <h2 className={`text-2xl font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                  {isWin ? 'Successful Walk!' : 'Squirrel Caught You!'}
                </h2>
                <p className="text-gray-300">
                  {isWin ? 'You cashed out in time!' : 'Better luck next time!'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Game visualization */}
        <div className="p-6 bg-gray-800">
          <div className="relative h-32 bg-gradient-to-r from-green-600 to-green-400 rounded-lg overflow-hidden mb-6">
            {/* Park scene */}
            <div className="absolute inset-0 flex items-end justify-center">
              <div className="absolute bottom-4 left-8">
                <div className="text-4xl animate-bounce">🐕</div>
              </div>
              
              {!isWin && (
                <div className="absolute bottom-4 right-8">
                  <div className="text-3xl animate-wiggle">🐿️</div>
                </div>
              )}
              
              {/* Path */}
              <div className="absolute bottom-0 w-full h-6 bg-amber-600 opacity-70"></div>
              
              {/* Trees */}
              <div className="absolute bottom-6 left-20 text-2xl">🌳</div>
              <div className="absolute bottom-8 right-24 text-2xl">🌲</div>
            </div>
            
            {/* Timeline */}
            <div className="absolute top-2 left-2 right-2">
              <div className="bg-black bg-opacity-40 rounded px-3 py-1 text-sm">
                <div className="flex justify-between items-center">
                  <span>Walk Time: {result.walkTime}s</span>
                  {result.squirrelTime && (
                    <span className="text-red-400">
                      Squirrel appeared at {result.squirrelTime}s
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results breakdown */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign size={20} className="text-blue-400" />
                  <span className="text-sm text-gray-300">Bet Amount</span>
                </div>
                <p className="text-xl font-bold">${(result.betAmount / 100).toFixed(2)}</p>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock size={20} className="text-yellow-400" />
                  <span className="text-sm text-gray-300">Walk Duration</span>
                </div>
                <p className="text-xl font-bold">{result.walkTime}s</p>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">Multiplier Reached</span>
                <span className="text-2xl font-bold text-purple-400">
                  {result.multiplier.toFixed(2)}x
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-purple-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(result.multiplier / 5 * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Final result */}
            <div className={`rounded-lg p-6 text-center ${
              isWin ? 'bg-green-900/30 border border-green-500/50' : 'bg-red-900/30 border border-red-500/50'
            }`}>
              <div className="text-6xl mb-4">
                {isWin ? '🎉' : '😢'}
              </div>
              
              {isWin ? (
                <div>
                  <p className="text-green-400 font-bold text-2xl mb-2">
                    Won ${(result.payout / 100).toFixed(2)}!
                  </p>
                  <p className="text-green-300">
                    Profit: +${(profit / 100).toFixed(2)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-red-400 font-bold text-2xl mb-2">
                    Lost ${(result.betAmount / 100).toFixed(2)}
                  </p>
                  <p className="text-red-300">
                    {result.squirrelTime ? 
                      `Squirrel appeared at ${result.squirrelTime}s` : 
                      'Walked too long'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="btn-primary flex-1 py-3"
            >
              Play Again
            </button>
            <button
              onClick={onClose}
              className="btn-secondary flex-1 py-3"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameResultModal; 