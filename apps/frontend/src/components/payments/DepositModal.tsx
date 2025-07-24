import React, { useState, useEffect, useRef } from 'react';
import { Bitcoin, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/paymentService';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositComplete: (amount: number, currency: string) => void;
}

interface DepositAddress {
  address: string;
  currency: 'BTC' | 'ETH';
  qrCode: string;
  expiresAt?: string;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onDepositComplete }) => {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'BTC' | 'ETH'>('BTC');
  const [depositAddress, setDepositAddress] = useState<DepositAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [monitoringDeposit, setMonitoringDeposit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Cryptocurrency prices (fetched from API)
  const [cryptoPrices, setCryptoPrices] = useState({
    BTC: 45000,
    ETH: 2800
  });

  // Minimum deposit amounts
  const MINIMUM_DEPOSITS = {
    BTC: 0.0001, // ~$4.50 at current prices
    ETH: 0.001   // ~$2.80 at current prices
  };

  // Network fees (estimated)
  const NETWORK_FEES = {
    BTC: 0.00001, // ~$0.45
    ETH: 0.001    // ~$2.80
  };

  // Fetch real-time crypto prices using paymentService
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        const prices = await paymentService.getCryptoPrices();
        setCryptoPrices(prices);
      } catch (error) {
        console.warn('Failed to fetch real-time prices, using defaults:', error);
      }
    };

    fetchCryptoPrices();
    // Update prices every 30 seconds
    const priceInterval = setInterval(fetchCryptoPrices, 30000);
    return () => clearInterval(priceInterval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError(null); // Clear any previous errors
      generateDepositAddress();
    }
  }, [isOpen, selectedCurrency]);

  const generateDepositAddress = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check authentication
      if (!user) {
        throw new Error('Please log in to generate a deposit address');
      }
      
      // Use paymentService instead of direct fetch
      const data = await paymentService.createDepositAddress(selectedCurrency, user.id);
      
      setDepositAddress({
        address: data.address,
        currency: selectedCurrency,
        qrCode: data.qrCode,
        expiresAt: data.expiresAt
      });
      
      // Start REAL deposit monitoring
      if (data.sessionId) {
        startDepositMonitoring(data.address, data.sessionId);
      }
    } catch (error) {
      console.error('Error generating deposit address:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate address');
    } finally {
      setLoading(false);
    }
  };

  const startDepositMonitoring = (address: string, sessionId: string) => {
    setMonitoringDeposit(true);
    
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Validate WebSocket URL  
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
    const fullWsUrl = `${wsUrl}/deposit-monitor`;
    
    try {
      // REAL WebSocket connection for deposit monitoring
      const ws = new WebSocket(fullWsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'monitor_address',
          address,
          sessionId,
          currency: selectedCurrency
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'deposit_detected') {
          onDepositComplete(data.amount, selectedCurrency);
          setMonitoringDeposit(false);
          ws.close();
          onClose();
        } else if (data.type === 'deposit_error') {
          setError(data.message);
          setMonitoringDeposit(false);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
        setMonitoringDeposit(false);
      };
      
      ws.onclose = () => {
        setMonitoringDeposit(false);
      };
      
      // Cleanup WebSocket connection after timeout
      timeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          setMonitoringDeposit(false);
        }
      }, 300000); // 5 minute timeout
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to start deposit monitoring');
      setMonitoringDeposit(false);
    }
  };

  const copyToClipboard = async () => {
    if (depositAddress) {
      await navigator.clipboard.writeText(depositAddress.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshAddress = () => {
    generateDepositAddress();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Address expiration countdown
  useEffect(() => {
    if (!depositAddress?.expiresAt) return;

    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(depositAddress.expiresAt!).getTime();
      const remaining = Math.max(0, expiry - now);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        setError('Deposit address has expired. Please generate a new one.');
        setDepositAddress(null);
        setMonitoringDeposit(false);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [depositAddress?.expiresAt]);

  // Format time remaining for display
  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  // Error state
  if (error) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">Deposit Error</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setError(null)}
                className="btn-secondary flex-1 py-3"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="btn-primary flex-1 py-3"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Deposit Funds</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Currency Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Cryptocurrency
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedCurrency('BTC')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedCurrency === 'BTC'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-600 bg-gray-700/50'
                }`}
                aria-label="Select Bitcoin"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Bitcoin className="text-orange-400" size={24} />
                  <div className="text-left">
                    <p className="font-bold text-white">Bitcoin</p>
                    <p className="text-sm text-gray-400">${cryptoPrices.BTC.toLocaleString()}</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedCurrency('ETH')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedCurrency === 'ETH'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-600 bg-gray-700/50'
                }`}
                aria-label="Select Ethereum"
              >
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-blue-400 rounded"></div>
                  <div className="text-left">
                    <p className="font-bold text-white">Ethereum</p>
                    <p className="text-sm text-gray-400">${cryptoPrices.ETH.toLocaleString()}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Deposit Address */}
          {loading ? (
            <div className="text-center py-8">
              <LoadingSpinner size="large" />
              <p className="text-gray-400 mt-4">Generating secure deposit address...</p>
            </div>
          ) : depositAddress ? (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg text-center">
                <img 
                  src={depositAddress.qrCode} 
                  alt="Deposit QR Code"
                  className="mx-auto mb-2"
                  width="150"
                  height="150"
                />
                <p className="text-gray-600 text-sm">Scan with your wallet</p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {selectedCurrency} Deposit Address
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  <input
                    type="text"
                    value={depositAddress.address}
                    readOnly
                    className="input-field flex-1 font-mono text-sm"
                    aria-label={`${selectedCurrency} deposit address`}
                  />
                  <button
                    onClick={copyToClipboard}
                    className="btn-secondary py-3 px-4 flex items-center justify-center space-x-2 w-full sm:w-auto"
                    aria-label="Copy address to clipboard"
                  >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-bold text-blue-400 mb-2 flex items-center space-x-2">
                  <AlertCircle size={16} />
                  <span>Deposit Instructions</span>
                  {timeRemaining !== null && timeRemaining > 0 && (
                    <span className="ml-auto text-yellow-400 text-sm">
                      Expires in: {formatTimeRemaining(timeRemaining)}
                    </span>
                  )}
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Send {selectedCurrency} to the address above</li>
                  <li>• Minimum deposit: {MINIMUM_DEPOSITS[selectedCurrency]} {selectedCurrency} (~${(MINIMUM_DEPOSITS[selectedCurrency] * cryptoPrices[selectedCurrency]).toFixed(2)})</li>
                  <li>• Network fee: ~{NETWORK_FEES[selectedCurrency]} {selectedCurrency} (deducted from deposit)</li>
                  <li>• Funds credited after {selectedCurrency === 'BTC' ? '3' : '12'} network confirmations</li>
                  <li>• This address is unique to your account and expires in 6 hours</li>
                  <li>• Only send {selectedCurrency} to this address</li>
                </ul>
              </div>

              {/* Monitoring Status */}
              {monitoringDeposit && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <LoadingSpinner size="small" />
                    <div>
                      <p className="font-bold text-yellow-400">Monitoring for deposits...</p>
                      <p className="text-sm text-gray-300">
                        We'll automatically detect when you send {selectedCurrency} to this address
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={refreshAddress}
                  className="btn-secondary flex-1 py-3"
                  aria-label="Generate new deposit address"
                >
                  Generate New Address
                </button>
                <button
                  onClick={onClose}
                  className="btn-primary flex-1 py-3"
                  aria-label="Close deposit modal"
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              🔒 This address is securely generated and unique to your account. 
              Never share your private keys with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositModal; 