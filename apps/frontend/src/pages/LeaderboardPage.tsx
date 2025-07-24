import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Clock, Medal, Crown, RefreshCw } from 'lucide-react';
import { userService, Leaderboard } from '../services/userService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const LeaderboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wins' | 'walks'>('wins');
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'all-time'>('daily');
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      try {
        const data = await userService.getLeaderboard(timePeriod);
        setLeaderboard(data);
      } catch (error) {
        // If API doesn't exist yet, use mock data
        const mockLeaderboard: Leaderboard = {
          topWins: [
            { userId: '1', username: 'LuckyDog123', value: 125.50, gameSessionId: '1', createdAt: new Date().toISOString() },
            { userId: '2', username: 'WalkMaster', value: 98.25, gameSessionId: '2', createdAt: new Date().toISOString() },
            { userId: '3', username: 'SquirrelDodger', value: 87.75, gameSessionId: '3', createdAt: new Date().toISOString() },
            { userId: '4', username: 'CashOutKing', value: 76.00, gameSessionId: '4', createdAt: new Date().toISOString() },
            { userId: '5', username: 'RiskTaker', value: 65.50, gameSessionId: '5', createdAt: new Date().toISOString() }
          ],
          longestWalks: [
            { userId: '1', username: 'MarathonWalker', value: 28.5, gameSessionId: '1', createdAt: new Date().toISOString() },
            { userId: '2', username: 'PatiencePlayer', value: 27.2, gameSessionId: '2', createdAt: new Date().toISOString() },
            { userId: '3', username: 'NerveOfSteel', value: 26.8, gameSessionId: '3', createdAt: new Date().toISOString() },
            { userId: '4', username: 'TimingMaster', value: 25.1, gameSessionId: '4', createdAt: new Date().toISOString() },
            { userId: '5', username: 'LongWalker', value: 24.7, gameSessionId: '5', createdAt: new Date().toISOString() }
          ],
          period: timePeriod
        };
        setLeaderboard(mockLeaderboard);
      }
      
    } catch (error: any) {
      console.error('Failed to fetch leaderboard:', error);
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and when time period changes
  useEffect(() => {
    fetchLeaderboard();
  }, [timePeriod]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
    toast.success('Leaderboard refreshed');
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-400" size={20} />;
      case 2:
        return <Medal className="text-gray-300" size={20} />;
      case 3:
        return <Medal className="text-amber-600" size={20} />;
      default:
        return <span className="text-gray-400 font-bold text-lg">#{rank}</span>;
    }
  };

  const formatValue = (value: number, type: 'wins' | 'walks'): string => {
    if (type === 'wins') {
      return `$${value.toFixed(2)}`;
    } else {
      return `${value.toFixed(1)}s`;
    }
  };

  const getUserAvatar = (username: string): string => {
    // Generate a consistent emoji based on username
    const avatars = ['🐕', '🦮', '🐶', '🐕‍🦺', '🐩'];
    const index = username.length % avatars.length;
    return avatars[index];
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-400/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/20 border-amber-600/30';
      default:
        return 'bg-gray-800 border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <LoadingSpinner size="large" />
        <p className="text-gray-400 mt-4">Loading leaderboard...</p>
      </div>
    );
  }

  const currentData = activeTab === 'wins' ? leaderboard?.topWins : leaderboard?.longestWalks;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          🏆 <span className="gradient-text">Leaderboard</span>
        </h1>
        <p className="text-xl text-gray-300">See who's walking the furthest and winning the most!</p>
      </div>

      {/* Controls */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          {/* Time Period Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['daily', 'weekly', 'all-time'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timePeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('wins')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                activeTab === 'wins'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <TrendingUp size={16} />
              <span>Biggest Wins</span>
            </button>
            <button
              onClick={() => setActiveTab('walks')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                activeTab === 'walks'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Clock size={16} />
              <span>Longest Walks</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary py-2 px-4 flex items-center space-x-2"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {currentData?.map((entry, index) => (
          <div
            key={entry.userId}
            className={`p-4 rounded-lg border transition-all hover:scale-[1.02] ${getRankBg(index + 1)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Rank */}
                <div className="flex items-center justify-center w-10 h-10">
                  {getRankIcon(index + 1)}
                </div>

                {/* Avatar */}
                <div className="text-2xl">
                  {getUserAvatar(entry.username)}
                </div>

                {/* User Info */}
                <div>
                  <h3 className="font-bold text-lg">{entry.username}</h3>
                  <p className="text-gray-400 text-sm">
                    {activeTab === 'wins' ? 'Top Win' : 'Longest Walk'}
                  </p>
                </div>
              </div>

              {/* Value */}
              <div className="text-right">
                <div className={`text-xl font-bold ${
                  index + 1 === 1 ? 'text-yellow-400' :
                  index + 1 === 2 ? 'text-gray-300' :
                  index + 1 === 3 ? 'text-amber-600' :
                  'text-blue-400'
                }`}>
                  {formatValue(entry.value, activeTab)}
                </div>
                <p className="text-gray-400 text-sm">
                  {timePeriod === 'all-time' ? 'All Time' : timePeriod}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Your Rank */}
      <div className="card bg-blue-900/20 border-blue-500/50">
        <h2 className="text-xl font-bold mb-4 flex items-center space-x-2 text-blue-400">
          <Trophy size={24} />
          <span>Your Ranking</span>
        </h2>
        
        <div className="text-center py-8 text-gray-400">
          <p className="mb-2">You haven't played any games yet!</p>
          <p className="text-sm">Play some games to appear on the leaderboards.</p>
          <button className="text-blue-400 hover:text-blue-300 transition-colors mt-3 px-6 py-2 bg-blue-600/20 rounded-lg">
            Start Playing →
          </button>
        </div>
      </div>

      {/* Hall of Fame */}
      <div className="card">
        <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
          <Crown className="text-yellow-400" size={24} />
          <span>Hall of Fame</span>
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          {/* Biggest Win */}
          <div className="text-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
            <div className="text-3xl mb-2">👑</div>
            <h3 className="font-bold text-yellow-400 mb-1">Biggest Win</h3>
            <p className="text-2xl font-bold mb-1">$250.00</p>
            <p className="text-gray-400 text-sm">by LegendaryPlayer</p>
          </div>

          {/* Longest Walk */}
          <div className="text-center p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <div className="text-3xl mb-2">⏱️</div>
            <h3 className="font-bold text-blue-400 mb-1">Longest Walk</h3>
            <p className="text-2xl font-bold mb-1">29.8s</p>
            <p className="text-gray-400 text-sm">by PatienceMaster</p>
          </div>

          {/* Most Games */}
          <div className="text-center p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="text-3xl mb-2">🎮</div>
            <h3 className="font-bold text-purple-400 mb-1">Most Games</h3>
            <p className="text-2xl font-bold mb-1">1,247</p>
            <p className="text-gray-400 text-sm">by GameAddict</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage; 