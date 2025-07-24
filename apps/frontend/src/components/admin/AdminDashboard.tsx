import React, { useState } from 'react';
import { Wallet, TrendingUp, Users, Bitcoin, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import HouseEdgeDisplay from './HouseEdgeDisplay';

interface WalletBalance {
  bitcoin: {
    balance: number;
    address: string;
    usdValue: number;
  };
  ethereum: {
    balance: number;
    address: string;
    usdValue: number;
  };
}

interface TransactionData {
  id: string;
  type: 'deposit' | 'withdrawal' | 'game_win' | 'game_loss';
  amount: number;
  currency: 'BTC' | 'ETH' | 'USD';
  userId: string;
  userEmail: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  txHash?: string;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  houseProfit: number;
  totalGameVolume: number;
}

const AdminDashboard: React.FC = () => {
  const [walletBalances] = useState<WalletBalance>({
    bitcoin: { balance: 2.45831, address: 'bc1q...', usdValue: 123456.78 },
    ethereum: { balance: 15.2847, address: '0x...', usdValue: 45678.90 }
  });
  
  const [userMetrics] = useState<UserMetrics>({
    totalUsers: 1247,
    activeUsers: 89,
    totalDeposits: 456789.12,
    totalWithdrawals: 234567.89,
    pendingWithdrawals: 12345.67,
    houseProfit: 89234.56,
    totalGameVolume: 1234567.89
  });

  const [recentTransactions] = useState<TransactionData[]>([
    {
      id: 'tx_001',
      type: 'deposit',
      amount: 0.001,
      currency: 'BTC',
      userId: 'user_123',
      userEmail: 'player@example.com',
      status: 'completed',
      timestamp: '2024-01-20T10:30:00Z',
      txHash: '1a2b3c4d5e6f7g8h9i0j'
    },
    {
      id: 'tx_002',
      type: 'withdrawal',
      amount: 0.5,
      currency: 'ETH',
      userId: 'user_456',
      userEmail: 'winner@example.com',
      status: 'pending',
      timestamp: '2024-01-20T09:15:00Z'
    },
    {
      id: 'tx_003',
      type: 'game_win',
      amount: 234.56,
      currency: 'USD',
      userId: 'user_789',
      userEmail: 'lucky@example.com',
      status: 'completed',
      timestamp: '2024-01-20T08:45:00Z'
    }
  ]);

  const [showPrivateKeys, setShowPrivateKeys] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshWalletData = async () => {
    setIsRefreshing(true);
    // Simulate API call to refresh wallet balances
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  };

  const processWithdrawal = async (transactionId: string) => {
    // Process withdrawal transaction
    console.log(`Processing withdrawal: ${transactionId}`);
  };

  const emergencyStopWithdrawals = () => {
    // Emergency stop all withdrawals
    console.log('Emergency stop triggered');
  };

  const totalLiquidity = walletBalances.bitcoin.usdValue + walletBalances.ethereum.usdValue;
  const liquidityRatio = (totalLiquidity / userMetrics.pendingWithdrawals).toFixed(2);
  const profitMargin = ((userMetrics.houseProfit / userMetrics.totalGameVolume) * 100).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          <span className="gradient-text">Admin Dashboard</span>
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={refreshWalletData}
            disabled={isRefreshing}
            className="btn-secondary py-2 px-4 flex items-center space-x-2"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={emergencyStopWithdrawals}
            className="btn-danger py-2 px-4 flex items-center space-x-2"
          >
            <AlertTriangle size={16} />
            <span>Emergency Stop</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <Wallet className="mx-auto mb-2 text-green-400" size={24} />
          <p className="text-2xl font-bold text-green-400">${totalLiquidity.toLocaleString()}</p>
          <p className="text-gray-400 text-sm">Total Liquidity</p>
          <p className="text-xs text-gray-500 mt-1">Ratio: {liquidityRatio}x</p>
        </div>
        
        <div className="card text-center">
          <TrendingUp className="mx-auto mb-2 text-blue-400" size={24} />
          <p className="text-2xl font-bold text-blue-400">${userMetrics.houseProfit.toLocaleString()}</p>
          <p className="text-gray-400 text-sm">House Profit</p>
          <p className="text-xs text-gray-500 mt-1">Margin: {profitMargin}%</p>
        </div>
        
        <div className="card text-center">
          <Users className="mx-auto mb-2 text-purple-400" size={24} />
          <p className="text-2xl font-bold text-purple-400">{userMetrics.activeUsers}</p>
          <p className="text-gray-400 text-sm">Active Users</p>
          <p className="text-xs text-gray-500 mt-1">of {userMetrics.totalUsers} total</p>
        </div>
        
        <div className="card text-center">
          <AlertTriangle className="mx-auto mb-2 text-yellow-400" size={24} />
          <p className="text-2xl font-bold text-yellow-400">${userMetrics.pendingWithdrawals.toLocaleString()}</p>
          <p className="text-gray-400 text-sm">Pending Withdrawals</p>
          <p className="text-xs text-gray-500 mt-1">Requires Action</p>
        </div>
      </div>

      {/* Wallet Management */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bitcoin Wallet */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <Bitcoin className="text-orange-400" size={24} />
              <span>Bitcoin Hot Wallet</span>
            </h2>
            <button
              onClick={() => setShowPrivateKeys(!showPrivateKeys)}
              className="text-gray-400 hover:text-white"
            >
              {showPrivateKeys ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Balance</p>
              <p className="text-2xl font-bold text-orange-400">
                ₿ {walletBalances.bitcoin.balance}
              </p>
              <p className="text-gray-300">${walletBalances.bitcoin.usdValue.toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Public Address</p>
              <p className="text-sm font-mono bg-gray-700 p-2 rounded truncate">
                {walletBalances.bitcoin.address}abcd1234efgh5678ijkl9012mnop3456
              </p>
            </div>
            
            {showPrivateKeys && (
              <div>
                <p className="text-sm text-red-400">⚠️ Private Key (SECURE)</p>
                <p className="text-xs font-mono bg-red-900/20 p-2 rounded border border-red-500/30 truncate">
                  L1234567890abcdefghijklmnopqrstuvwxyz...
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button className="btn-secondary py-2 text-sm">Send BTC</button>
              <button className="btn-secondary py-2 text-sm">Generate Address</button>
            </div>
          </div>
        </div>

        {/* Ethereum Wallet */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-blue-400 rounded"></div>
              <span>Ethereum Hot Wallet</span>
            </h2>
            <button
              onClick={() => setShowPrivateKeys(!showPrivateKeys)}
              className="text-gray-400 hover:text-white"
            >
              {showPrivateKeys ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Balance</p>
              <p className="text-2xl font-bold text-purple-400">
                Ξ {walletBalances.ethereum.balance}
              </p>
              <p className="text-gray-300">${walletBalances.ethereum.usdValue.toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400">Public Address</p>
              <p className="text-sm font-mono bg-gray-700 p-2 rounded truncate">
                {walletBalances.ethereum.address}1234567890abcdef1234567890abcdef12345678
              </p>
            </div>
            
            {showPrivateKeys && (
              <div>
                <p className="text-sm text-red-400">⚠️ Private Key (SECURE)</p>
                <p className="text-xs font-mono bg-red-900/20 p-2 rounded border border-red-500/30 truncate">
                  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button className="btn-secondary py-2 text-sm">Send ETH</button>
              <button className="btn-secondary py-2 text-sm">Generate Address</button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">User</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-800">
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tx.type === 'deposit' ? 'bg-green-900/30 text-green-400' :
                      tx.type === 'withdrawal' ? 'bg-red-900/30 text-red-400' :
                      tx.type === 'game_win' ? 'bg-blue-900/30 text-blue-400' :
                      'bg-gray-900/30 text-gray-400'
                    }`}>
                      {tx.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 font-mono">
                    {tx.currency === 'USD' ? '$' : ''}
                    {tx.amount} {tx.currency}
                  </td>
                  <td className="py-3">
                    <div>
                      <p className="text-white">{tx.userEmail}</p>
                      <p className="text-xs text-gray-400">{tx.userId}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tx.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3">
                    {tx.type === 'withdrawal' && tx.status === 'pending' && (
                      <button
                        onClick={() => processWithdrawal(tx.id)}
                        className="btn-primary py-1 px-3 text-xs"
                      >
                        Process
                      </button>
                    )}
                    {tx.txHash && (
                      <a
                        href={`https://blockstream.info/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        View TX
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* House Edge Verification */}
      <HouseEdgeDisplay />

      {/* Liquidity Alerts */}
      <div className="card bg-yellow-900/20 border border-yellow-500/30">
        <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center space-x-2">
          <AlertTriangle size={20} />
          <span>Liquidity Management</span>
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Liquidity Ratio</p>
            <p className="text-2xl font-bold text-yellow-400">{liquidityRatio}x</p>
            <p className="text-xs text-gray-500">
              {Number(liquidityRatio) > 5 ? '✅ Healthy' : 
               Number(liquidityRatio) > 2 ? '⚠️ Moderate' : '🚨 Critical'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-1">Cold Storage Reserve</p>
            <p className="text-2xl font-bold text-blue-400">$250,000</p>
            <p className="text-xs text-gray-500">💎 Offline Backup</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-1">Auto-Rebalance</p>
            <p className="text-2xl font-bold text-green-400">Enabled</p>
            <p className="text-xs text-gray-500">🔄 Trigger at 1.5x ratio</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-900/10 rounded border border-yellow-500/20">
          <p className="text-yellow-300 text-sm">
            💡 <strong>Recommendation:</strong> Current liquidity is healthy at {liquidityRatio}x coverage. 
            Consider moving excess funds to cold storage for security.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 