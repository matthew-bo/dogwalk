import React, { useState, useEffect } from 'react';
import { Bitcoin, AlertTriangle, Send } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/paymentService';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdrawalComplete: (amount: number, currency: string) => void;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onWithdrawalComplete }) => {
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<'BTC' | 'ETH'>('BTC');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Cryptocurrency prices (fetched from API)
  const [cryptoPrices, setCryptoPrices] = useState({
    BTC: 45000,
    ETH: 2800
  });

  // Withdrawal limits and fees
  const withdrawalLimits = {
    BTC: { min: 0.001, max: 1.0, fee: 0.0005 },
    ETH: { min: 0.01, max: 10.0, fee: 0.002 }
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

    if (isOpen) {
      fetchCryptoPrices();
      // Update prices every 30 seconds while modal is open
      const priceInterval = setInterval(fetchCryptoPrices, 30000);
      return () => clearInterval(priceInterval);
    }
  }, [isOpen]);

  const userBalance = (user?.usdBalanceCents || 0) / 100;
  const cryptoAmount = usdAmount ? parseFloat(usdAmount) / cryptoPrices[selectedCurrency] : 0;
  const withdrawalFee = withdrawalLimits[selectedCurrency].fee;
  const totalCryptoAmount = cryptoAmount + withdrawalFee;

  const validateWithdrawal = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate address
    if (!withdrawalAddress.trim()) {
      newErrors.address = 'Withdrawal address is required';
    } else if (selectedCurrency === 'BTC' && !withdrawalAddress.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/)) {
      newErrors.address = 'Invalid Bitcoin address format';
    } else if (selectedCurrency === 'ETH' && !withdrawalAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.address = 'Invalid Ethereum address format';
    }

    // Validate amount
    if (!usdAmount || parseFloat(usdAmount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (parseFloat(usdAmount) > userBalance) {
      newErrors.amount = 'Insufficient balance';
    } else if (cryptoAmount < withdrawalLimits[selectedCurrency].min) {
      newErrors.amount = `Minimum withdrawal: ${withdrawalLimits[selectedCurrency].min} ${selectedCurrency}`;
    } else if (cryptoAmount > withdrawalLimits[selectedCurrency].max) {
      newErrors.amount = `Maximum withdrawal: ${withdrawalLimits[selectedCurrency].max} ${selectedCurrency}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleWithdrawal = async () => {
    if (!validateWithdrawal()) return;

    setProcessing(true);
    setErrors({}); // Clear previous errors
    
    try {
      // Check authentication
      if (!user) {
        throw new Error('Please log in to process withdrawal');
      }

      // Use paymentService instead of direct fetch
      await paymentService.createWithdrawal(
        selectedCurrency,
        withdrawalAddress.trim(),
        parseFloat(usdAmount),
        user.id
      );

      // Successful withdrawal
      onWithdrawalComplete(parseFloat(usdAmount), selectedCurrency);
      onClose();
      
      // Reset form
      setWithdrawalAddress('');
      setUsdAmount('');
      setErrors({});
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Withdrawal failed. Please try again.' 
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Withdraw Funds</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Balance Display */}
          <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg p-4 mb-6 border border-green-500/30">
            <div className="text-center">
              <p className="text-gray-300 text-sm mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-green-400">${userBalance.toFixed(2)}</p>
            </div>
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
                aria-label="Select Bitcoin for withdrawal"
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
                aria-label="Select Ethereum for withdrawal"
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

          {/* Withdrawal Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {selectedCurrency} Withdrawal Address
            </label>
            <input
              type="text"
              value={withdrawalAddress}
              onChange={(e) => setWithdrawalAddress(e.target.value)}
              placeholder={`Enter your ${selectedCurrency} address`}
              className={`input-field font-mono text-sm ${errors.address ? 'border-red-500' : ''}`}
              aria-label={`${selectedCurrency} withdrawal address`}
              aria-describedby={errors.address ? "address-error" : undefined}
            />
            {errors.address && (
              <p id="address-error" className="text-red-400 text-sm mt-1">{errors.address}</p>
            )}
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Withdrawal Amount (USD)
            </label>
            <input
              type="number"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              max={userBalance}
              className={`input-field ${errors.amount ? 'border-red-500' : ''}`}
              aria-label="Withdrawal amount in USD"
              aria-describedby={errors.amount ? "amount-error" : undefined}
            />
            {errors.amount && (
              <p id="amount-error" className="text-red-400 text-sm mt-1">{errors.amount}</p>
            )}
            
            {/* Conversion Display */}
            {usdAmount && cryptoAmount > 0 && (
              <div className="mt-2 p-3 bg-gray-700/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">You will receive:</span>
                  <span className="text-white font-bold">
                    {cryptoAmount.toFixed(8)} {selectedCurrency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Network fee:</span>
                  <span className="text-orange-400">
                    {withdrawalFee} {selectedCurrency}
                  </span>
                </div>
                <div className="border-t border-gray-600 mt-2 pt-2 flex justify-between text-sm">
                  <span className="text-gray-400">Total deducted:</span>
                  <span className="text-white font-bold">
                    {totalCryptoAmount.toFixed(8)} {selectedCurrency}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Withdrawal Limits */}
          <div className="mb-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h3 className="font-bold text-blue-400 mb-2 text-sm">Withdrawal Limits</h3>
            <div className="text-xs text-gray-300 space-y-1">
              <p>• Minimum: {withdrawalLimits[selectedCurrency].min} {selectedCurrency}</p>
              <p>• Maximum: {withdrawalLimits[selectedCurrency].max} {selectedCurrency}</p>
              <p>• Network fee: {withdrawalLimits[selectedCurrency].fee} {selectedCurrency}</p>
              <p>• Processing time: 1-6 hours</p>
            </div>
          </div>

          {/* Error Display */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertTriangle size={16} />
                <span className="text-sm">{errors.general}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1 py-3"
              disabled={processing}
              aria-label="Cancel withdrawal"
            >
              Cancel
            </button>
            <button
              onClick={handleWithdrawal}
              disabled={processing || !withdrawalAddress || !usdAmount}
              className="btn-primary flex-1 py-3 flex items-center justify-center space-x-2"
              aria-label={`Withdraw ${usdAmount ? `$${usdAmount}` : ''} to ${selectedCurrency} address`}
            >
              {processing ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Withdraw</span>
                </>
              )}
            </button>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-red-900/10 rounded-lg border border-red-500/20">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="text-red-400 mt-0.5" size={16} />
              <div className="text-xs text-gray-400">
                <p className="font-bold text-red-400 mb-1">Security Warning</p>
                <p>
                  Double-check the withdrawal address. Cryptocurrency transactions are irreversible. 
                  We are not responsible for funds sent to incorrect addresses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalModal; 