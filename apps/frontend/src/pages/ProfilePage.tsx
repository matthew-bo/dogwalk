import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Mail, Calendar, TrendingUp, Trophy, Target, Clock, RefreshCw } from 'lucide-react';
import { userService, UserStats } from '../services/userService';
import { gameService } from '../services/gameService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    gamesPlayed: 0,
    totalWagered: 0,
    totalWon: 0,
    winRate: 0,
    bestMultiplier: 0,
    longestWalk: 0
  });
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch user stats from API, fallback to calculating from games
      let userStats: UserStats;
      try {
        userStats = await userService.getUserStats();
      } catch (error) {
        // If API doesn't exist yet, calculate from game history
        const gameHistory = await gameService.getGameHistory(100, 0);
        userStats = calculateStatsFromGames(gameHistory.games);
      }
      
      setStats(userStats);
      
      // Fetch recent games
      const gameHistory = await gameService.getGameHistory(5, 0);
      setRecentGames(gameHistory.games);
      
    } catch (error: any) {
      console.error('Failed to fetch user data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from games if API doesn't exist yet
  const calculateStatsFromGames = (games: any[]): UserStats => {
    if (games.length === 0) {
      return {
        gamesPlayed: 0,
        totalWagered: 0,
        totalWon: 0,
        winRate: 0,
        bestMultiplier: 0,
        longestWalk: 0
      };
    }

    const completedGames = games.filter(g => g.outcome !== 'incomplete');
    const wins = completedGames.filter(g => g.outcome === 'win');
    const winRate = completedGames.length > 0 ? (wins.length / completedGames.length) * 100 : 0;
    
    const totalWagered = games.reduce((sum, g) => sum + (g.betAmount || 0), 0);
    const totalWon = games.reduce((sum, g) => sum + (g.payoutAmount || 0), 0);
    
    const bestMultiplier = wins.reduce((max, g) => {
      const multiplier = g.betAmount > 0 ? (g.payoutAmount || 0) / g.betAmount : 0;
      return Math.max(max, multiplier);
    }, 0);

    const longestWalk = games.reduce((max, g) => Math.max(max, g.duration || 0), 0);

    return {
      gamesPlayed: games.length,
      totalWagered: totalWagered / 100,
      totalWon: totalWon / 100,
      winRate: Math.round(winRate),
      bestMultiplier: Math.round(bestMultiplier * 100) / 100,
      longestWalk
    };
  };

  // Initial load
  useEffect(() => {
    fetchUserData();
  }, []);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
    toast.success('Profile refreshed');
  };

  // Check if user has achievements unlocked
  const checkAchievement = (achievementId: number): boolean => {
    switch (achievementId) {
      case 1: return stats.gamesPlayed > 0; // First Steps
      case 2: return stats.gamesPlayed >= 10 && stats.winRate > 0; // Lucky Dog  
      case 3: return stats.longestWalk >= 25; // Marathon Walker
      case 4: return stats.totalWagered >= 100; // High Roller
      case 5: return stats.longestWalk >= 15; // Squirrel Dodger
      default: return false;
    }
  };

  const achievements = [
    { id: 1, name: 'First Steps', description: 'Play your first game', icon: '🐾' },
    { id: 2, name: 'Lucky Dog', description: 'Win 10 games', icon: '🍀' },
    { id: 3, name: 'Marathon Walker', description: 'Walk for 25+ seconds', icon: '🏃' },
    { id: 4, name: 'High Roller', description: 'Wager $100+ total', icon: '💰' },
    { id: 5, name: 'Squirrel Dodger', description: 'Walk for 15+ seconds', icon: '🐿️' }
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <LoadingSpinner size="large" />
        <p className="text-gray-400 mt-4">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="card">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{user?.username}</h1>
            <div className="space-y-1 text-gray-300">
              <div className="flex items-center space-x-2">
                <Mail size={16} />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">
              ${((user?.usdBalanceCents || 0) / 100).toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm">Current Balance</div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <TrendingUp className="text-blue-400" size={24} />
            <span>Game Statistics</span>
          </h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary py-2 px-4 flex items-center space-x-2"
            aria-label="Refresh profile data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">{stats.gamesPlayed}</div>
            <div className="text-gray-400 text-sm">Total Games</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {Math.round((stats.gamesPlayed * stats.winRate) / 100)}
            </div>
            <div className="text-gray-400 text-sm">Wins</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {stats.gamesPlayed - Math.round((stats.gamesPlayed * stats.winRate) / 100)}
            </div>
            <div className="text-gray-400 text-sm">Losses</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {stats.gamesPlayed > 0 ? `${stats.winRate.toFixed(1)}%` : '0%'}
            </div>
            <div className="text-gray-400 text-sm">Win Rate</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              ${stats.totalWagered.toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm">Total Wagered</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              ${stats.totalWon.toFixed(2)}
            </div>
            <div className="text-gray-400 text-sm">Total Winnings</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">{stats.longestWalk}s</div>
            <div className="text-gray-400 text-sm">Longest Walk</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {stats.bestMultiplier.toFixed(2)}x
            </div>
            <div className="text-gray-400 text-sm">Best Multiplier</div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
          <Trophy className="text-yellow-400" size={24} />
          <span>Achievements</span>
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border ${
                checkAchievement(achievement.id)
                  ? 'bg-yellow-900/20 border-yellow-500/50'
                  : 'bg-gray-700/50 border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`text-2xl ${checkAchievement(achievement.id) ? '' : 'grayscale opacity-50'}`}>
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold ${checkAchievement(achievement.id) ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {achievement.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{achievement.description}</p>
                </div>
                {checkAchievement(achievement.id) && (
                  <div className="text-yellow-400">
                    <Trophy size={20} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Account Settings */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <User className="text-gray-400" size={24} />
            <span>Account Settings</span>
          </h2>
          <div className="space-y-3">
            <button className="btn-secondary w-full py-3 text-left">
              Change Email
            </button>
            <button className="btn-secondary w-full py-3 text-left">
              Change Password
            </button>
            <button className="btn-secondary w-full py-3 text-left">
              Download Data
            </button>
          </div>
        </div>

        {/* Game History */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <Clock className="text-gray-400" size={24} />
            <span>Recent Games</span>
          </h2>
          
          {recentGames.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No games played yet.</p>
              <button 
                onClick={() => window.location.href = '/game'}
                className="text-blue-400 hover:text-blue-300 transition-colors mt-2"
              >
                Play your first game →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGames.map((game) => {
                const multiplier = game.betAmount > 0 ? (game.payoutAmount || 0) / game.betAmount : 0;
                const isWin = game.outcome === 'win';
                
                return (
                  <div key={game.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`text-2xl ${isWin ? '🎉' : '🐿️'}`}>
                        {isWin ? '🎉' : '🐿️'}
                      </div>
                      <div>
                        <div className={`font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                          {isWin ? 'Win' : 'Loss'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {new Date(game.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold">
                        ${(game.betAmount / 100).toFixed(2)} → ${(game.payoutAmount / 100).toFixed(2)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {multiplier > 0 ? `${multiplier.toFixed(2)}x` : '-'} • {game.duration || 0}s
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="text-center pt-3">
                <button 
                  onClick={() => window.location.href = '/game'}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all games →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Responsible Gaming */}
      <div className="card bg-amber-900/20 border-amber-500/50">
        <h2 className="text-xl font-bold mb-4 flex items-center space-x-2 text-amber-400">
          <Target size={24} />
          <span>Responsible Gaming</span>
        </h2>
        <p className="text-gray-300 mb-4">
          We're committed to promoting responsible gambling. Set limits, take breaks, and remember that gambling should be fun, not a financial solution.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary text-sm py-2 px-4">
            Set Deposit Limits
          </button>
          <button className="btn-secondary text-sm py-2 px-4">
            Set Time Limits
          </button>
          <button className="btn-secondary text-sm py-2 px-4">
            Self-Exclusion
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 