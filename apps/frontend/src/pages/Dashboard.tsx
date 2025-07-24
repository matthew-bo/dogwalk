import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Play, TrendingUp, Clock, DollarSign, Plus, Minus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import HouseEdgeDisplay from '../components/admin/HouseEdgeDisplay';
import DepositModal from '../components/payments/DepositModal';
import WithdrawalModal from '../components/payments/WithdrawalModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { gameService } from '../services/gameService';
import toast from 'react-hot-toast';

interface UserStats {
  gamesPlayed: number;
  winRate: number;
  bestMultiplier: number;
  totalWagered: number;
  totalWon: number;
}

const Dashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    gamesPlayed: 0,
    winRate: 0,
    bestMultiplier: 0,
    totalWagered: 0,
    totalWon: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const balance = (user?.usdBalanceCents || 0) / 100;

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent games
      const gameHistory = await gameService.getGameHistory(5, 0);
      setRecentGames(gameHistory.games);
      
      // Calculate user stats from games
      const stats = calculateUserStats(gameHistory.games);
      setUserStats(stats);
      
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate user statistics
  const calculateUserStats = (games: any[]): UserStats => {
    if (games.length === 0) {
      return {
        gamesPlayed: 0,
        winRate: 0,
        bestMultiplier: 0,
        totalWagered: 0,
        totalWon: 0
      };
    }

    const completedGames = games.filter(g => g.outcome !== 'incomplete');
    const wins = completedGames.filter(g => g.outcome === 'win');
    const winRate = completedGames.length > 0 ? (wins.length / completedGames.length) * 100 : 0;
    
    const totalWagered = games.reduce((sum, g) => sum + (g.betAmount || 0), 0);
    const totalWon = games.reduce((sum, g) => sum + (g.payoutAmount || 0), 0);
    
    // Find best multiplier from wins
    const bestMultiplier = wins.reduce((max, g) => {
      const multiplier = g.betAmount > 0 ? (g.payoutAmount || 0) / g.betAmount : 0;
      return Math.max(max, multiplier);
    }, 0);

    return {
      gamesPlayed: games.length,
      winRate: Math.round(winRate),
      bestMultiplier: Math.round(bestMultiplier * 100) / 100,
      totalWagered: totalWagered / 100,
      totalWon: totalWon / 100
    };
  };

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh dashboard data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      refreshUser()
    ]);
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleDepositComplete = async (amount: number, currency: string) => {
    console.log(`Deposit completed: ${amount} ${currency}`);
    await refreshUser(); // Refresh user balance
    await fetchDashboardData(); // Refresh dashboard
    toast.success(`Deposit of ${amount} ${currency} completed!`);
  };

  const handleWithdrawalComplete = async (amount: number, currency: string) => {
    console.log(`Withdrawal completed: ${amount} USD as ${currency}`);
    await refreshUser(); // Refresh user balance
    await fetchDashboardData(); // Refresh dashboard
    toast.success(`Withdrawal of $${amount} as ${currency} completed!`);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome back, <span className="gradient-text">{user?.email?.split('@')[0]}</span>!
          </h1>
          <p className="text-gray-300 text-lg">
            Ready for another dog walking adventure?
          </p>
        </div>

        {/* Balance and Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Balance Card */}
          <div className="card text-center bg-gradient-to-r from-green-900/30 to-blue-900/30 border-green-500/30">
            <DollarSign className="mx-auto mb-3 text-green-400" size={32} />
            <p className="text-3xl font-bold text-green-400 mb-2">
              ${balance.toFixed(2)}
            </p>
            <p className="text-gray-300 mb-4">Your Balance</p>
            
            {/* Deposit/Withdrawal Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => setShowDepositModal(true)}
                className="btn-primary flex-1 py-2 text-sm flex items-center justify-center space-x-1"
              >
                <Plus size={16} />
                <span>Deposit</span>
              </button>
              <button
                onClick={() => setShowWithdrawalModal(true)}
                disabled={balance <= 0}
                className="btn-secondary flex-1 py-2 text-sm flex items-center justify-center space-x-1 disabled:opacity-50"
              >
                <Minus size={16} />
                <span>Withdraw</span>
              </button>
            </div>
          </div>

          {/* Quick Play */}
          <div className="card text-center">
            <Play className="mx-auto mb-3 text-blue-400" size={32} />
            <p className="text-xl font-bold text-white mb-2">Start Playing</p>
            <p className="text-gray-400 mb-4">Jump into a new game</p>
            <Link to="/game" className="btn-primary py-3 px-6 inline-block">
              Play Now
            </Link>
          </div>

          {/* Stats */}
          <div className="card text-center">
            <TrendingUp className="mx-auto mb-3 text-purple-400" size={32} />
            <p className="text-xl font-bold text-white mb-2">Your Stats</p>
            <div className="space-y-1 text-sm">
              <p className="text-gray-400">Games Played: <span className="text-white">{userStats.gamesPlayed}</span></p>
              <p className="text-gray-400">Win Rate: <span className="text-green-400">{userStats.winRate}%</span></p>
              <p className="text-gray-400">Best Multiplier: <span className="text-yellow-400">{userStats.bestMultiplier}x</span></p>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center space-x-2">
              <Clock className="text-blue-400" size={24} />
              <span>Recent Games</span>
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary py-2 px-4 flex items-center space-x-2"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3">Result</th>
                  <th className="text-left py-3">Bet</th>
                  <th className="text-left py-3">Multiplier</th>
                  <th className="text-left py-3">Payout</th>
                  <th className="text-left py-3">Walk Time</th>
                  <th className="text-left py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : recentGames.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      No recent games found.
                    </td>
                  </tr>
                ) : (
                  recentGames.map((game) => {
                    const multiplier = game.betAmount > 0 ? (game.payoutAmount || 0) / game.betAmount : 0;
                    
                    return (
                      <tr key={game.id} className="border-b border-gray-800">
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            game.outcome === 'win' 
                              ? 'bg-green-900/30 text-green-400' 
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            {game.outcome === 'win' ? '🎉 Win' : '🐿️ Loss'}
                          </span>
                        </td>
                        <td className="py-4 font-mono">
                          ${(game.betAmount / 100).toFixed(2)}
                        </td>
                        <td className="py-4 font-bold">
                          {multiplier > 0 ? `${multiplier.toFixed(2)}x` : '-'}
                        </td>
                        <td className="py-4 font-mono">
                          <span className={game.outcome === 'win' ? 'text-green-400' : 'text-gray-400'}>
                            ${(game.payoutAmount / 100).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-4">
                          {game.duration || 0}s
                        </td>
                        <td className="py-4 text-gray-400">
                          {new Date(game.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="text-center mt-6">
            <Link to="/profile" className="text-blue-400 hover:text-blue-300">
              View All Games →
            </Link>
          </div>
        </div>

        {/* Game Instructions */}
        <div className="card bg-blue-900/20 border border-blue-500/30">
          <h2 className="text-xl font-bold text-blue-400 mb-4">🎮 How to Play Dog Walk</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <h3 className="font-bold text-white">Place Your Bet</h3>
                  <p className="text-gray-300 text-sm">Choose how much you want to wager on your dog walk</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <h3 className="font-bold text-white">Start Walking</h3>
                  <p className="text-gray-300 text-sm">Watch your dog walk through the park as your multiplier grows</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <h3 className="font-bold text-white">Cash Out in Time</h3>
                  <p className="text-gray-300 text-sm">Stop the walk before a squirrel appears to win your payout</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">4️⃣</span>
                <div>
                  <h3 className="font-bold text-white">Enjoy Your Winnings</h3>
                  <p className="text-gray-300 text-sm">The longer you wait, the bigger the reward - but the higher the risk!</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* House Edge Display */}
        <HouseEdgeDisplay />
      </div>

      {/* Modals */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onDepositComplete={handleDepositComplete}
      />
      
      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onWithdrawalComplete={handleWithdrawalComplete}
      />
    </>
  );
};

export default Dashboard; 