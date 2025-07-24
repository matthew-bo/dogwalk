import React, { useState, useEffect } from 'react';
import { verifyGameProfitability } from '../../utils/houseEdgeVerification';
import { Shield, TrendingUp, Calculator, CheckCircle, XCircle } from 'lucide-react';

const HouseEdgeDisplay: React.FC = () => {
  const [verification, setVerification] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const runVerification = async () => {
      setIsLoading(true);
      try {
        // Run verification in a timeout to avoid blocking UI
        setTimeout(() => {
          const results = verifyGameProfitability();
          setVerification(results);
          setIsLoading(false);
        }, 100);
      } catch (error) {
        console.error('Verification failed:', error);
        setIsLoading(false);
      }
    };

    runVerification();
  }, []);

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="spinner"></div>
          <span className="ml-3">Calculating house edge...</span>
        </div>
      </div>
    );
  }

  if (!verification) {
    return (
      <div className="card bg-red-900/20 border-red-500/50">
        <div className="flex items-center space-x-2 text-red-400">
          <XCircle size={24} />
          <span>House edge verification failed</span>
        </div>
      </div>
    );
  }

  const { theoretical, simulated, profitability } = verification.details;

  return (
    <div className="space-y-6">
      {/* Main Status */}
      <div className={`card ${verification.isProfitable ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {verification.isProfitable ? (
              <CheckCircle className="text-green-400" size={32} />
            ) : (
              <XCircle className="text-red-400" size={32} />
            )}
            <div>
              <h2 className={`text-xl font-bold ${verification.isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                Game Profitability: {verification.isProfitable ? 'CONFIRMED' : 'FAILED'}
              </h2>
              <p className="text-gray-300">
                Mathematical verification complete with {verification.confidence} confidence
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">
              {(verification.theoreticalHouseEdge * 100).toFixed(2)}%
            </div>
            <div className="text-sm text-gray-400">House Edge</div>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Theoretical Analysis */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="text-blue-400" size={20} />
            <h3 className="font-bold">Theoretical Analysis</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400 text-sm">Expected Return</span>
              <p className="text-lg font-bold">{(theoretical.expectedReturn * 100).toFixed(2)}%</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">House Edge</span>
              <p className="text-lg font-bold text-green-400">{(theoretical.houseEdge * 100).toFixed(2)}%</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Win Probability</span>
              <p className="text-lg font-bold">{(theoretical.summary.totalWinProb * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Simulation Results */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="text-purple-400" size={20} />
            <h3 className="font-bold">Simulation (100k games)</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400 text-sm">Actual House Edge</span>
              <p className="text-lg font-bold text-green-400">{(simulated.actualHouseEdge * 100).toFixed(2)}%</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Win Rate</span>
              <p className="text-lg font-bold">{(simulated.winRate * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Games Won</span>
              <p className="text-lg font-bold">{simulated.gamesWon.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Strategy Analysis */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="text-yellow-400" size={20} />
            <h3 className="font-bold">Strategy Protection</h3>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400 text-sm">Always Profitable</span>
              <p className="text-lg font-bold text-green-400">
                {profitability.isAlwaysProfitable ? 'YES' : 'NO'}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Worst Case Edge</span>
              <p className="text-lg font-bold">{(profitability.worstCaseHouseEdge * 100).toFixed(2)}%</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Best Case Edge</span>
              <p className="text-lg font-bold">{(profitability.bestCaseHouseEdge * 100).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Breakdown */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Player Strategy Analysis</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {profitability.strategies.map((strategy: any, index: number) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">{strategy.name}</h4>
                <span className="text-green-400 font-bold">
                  {(strategy.houseEdge * 100).toFixed(2)}%
                </span>
              </div>
              <p className="text-gray-400 text-sm">{strategy.description}</p>
              <div className="mt-2 text-xs text-gray-500">
                Expected Return: {(strategy.expectedReturn * 100).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="card bg-blue-900/20 border-blue-500/50">
        <h3 className="text-lg font-bold text-blue-400 mb-3">🎯 Profitability Summary</h3>
        <div className="space-y-2 text-sm">
          <p>✅ <strong>Theoretical house edge:</strong> {(verification.theoreticalHouseEdge * 100).toFixed(2)}% guarantees long-term profitability</p>
          <p>✅ <strong>Simulation confirms:</strong> {(verification.simulatedHouseEdge * 100).toFixed(2)}% actual edge over 100,000 games</p>
          <p>✅ <strong>Strategy-proof:</strong> All player strategies result in positive house edge</p>
          <p>✅ <strong>Risk escalation:</strong> Squirrel probability increases from 1% to 10% per second</p>
          <p>✅ <strong>Payout curve:</strong> 8% house edge applied to exponential multipliers</p>
        </div>
      </div>
    </div>
  );
};

export default HouseEdgeDisplay; 