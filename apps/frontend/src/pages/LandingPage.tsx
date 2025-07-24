import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../contexts/AuthModalContext';
import { Play, TrendingUp, Shield, Users } from 'lucide-react';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      openModal('register');
    }
  };

  const handlePlayDemo = () => {
    // Anyone can play the demo - no login required
    navigate('/game');
  };

  const handlePlayReal = () => {
    if (isAuthenticated) {
      navigate('/game');
    } else {
      openModal('login');
    }
  };

  return (
    <>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="gradient-text">Dog Walk</span>
                <br />
                <span className="text-white">Gamble</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Walk your virtual dog and cash out before the squirrel appears! 
                The longer you walk, the bigger the payout – but beware of the squirrel!
              </p>
              
              {/* Game Preview */}
              <div className="game-canvas mb-8 max-w-2xl mx-auto relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl animate-bounce-dog">🐕</div>
                </div>
                <div className="absolute bottom-4 right-4 text-4xl animate-float">🌳</div>
                <div className="absolute top-4 left-4 text-3xl animate-float" style={{ animationDelay: '0.5s' }}>☁️</div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <button
                  onClick={handlePlayDemo}
                  className="btn-primary py-4 px-8 text-xl flex items-center space-x-3 transform hover:scale-105 transition-all shadow-2xl"
                >
                  <Play size={24} />
                  <span>🎮 Play Demo (Free)</span>
                </button>
                
                <button
                  onClick={handlePlayReal}
                  className="btn-secondary py-4 px-8 text-xl flex items-center space-x-3 transform hover:scale-105 transition-all"
                >
                  <TrendingUp size={24} />
                  <span>💰 Play Real Money</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-green-400" />
                  <span>Provably Fair</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users size={16} className="text-blue-400" />
                  <span>1000+ Players</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp size={16} className="text-purple-400" />
                  <span>Instant Payouts</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How Dog Walk Works</h2>
              <p className="text-xl text-gray-300">Simple, exciting, and potentially profitable</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="text-6xl mb-4">1️⃣</div>
                <h3 className="text-xl font-bold mb-2 text-blue-400">Place Your Bet</h3>
                <p className="text-gray-300">Choose your wager amount and start the walk</p>
              </div>
              
              <div className="text-center">
                <div className="text-6xl mb-4">2️⃣</div>
                <h3 className="text-xl font-bold mb-2 text-green-400">Watch & Wait</h3>
                <p className="text-gray-300">Your multiplier grows as your dog walks safely</p>
              </div>
              
              <div className="text-center">
                <div className="text-6xl mb-4">3️⃣</div>
                <h3 className="text-xl font-bold mb-2 text-purple-400">Cash Out in Time</h3>
                <p className="text-gray-300">Stop before the squirrel to claim your winnings</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Dog Walk?</h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="card text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-xl font-bold mb-2">Provably Fair</h3>
                  <p className="text-gray-300">Cryptographically secure random number generation you can verify</p>
                </div>
                
                <div className="card text-center">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="text-xl font-bold mb-2">Instant Gameplay</h3>
                  <p className="text-gray-300">No waiting - start playing immediately with our demo mode</p>
                </div>
                
                <div className="card text-center">
                  <div className="text-4xl mb-4">💰</div>
                  <h3 className="text-xl font-bold mb-2">Crypto Payments</h3>
                  <p className="text-gray-300">Deposit and withdraw with Bitcoin, Ethereum, and more</p>
                </div>
                
                <div className="card text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="text-xl font-bold mb-2">Mobile Ready</h3>
                  <p className="text-gray-300">Play anywhere, anytime on any device</p>
                </div>
                
                <div className="card text-center">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-xl font-bold mb-2">Secure & Safe</h3>
                  <p className="text-gray-300">Advanced security measures protect your funds</p>
                </div>
                
                <div className="card text-center">
                  <div className="text-4xl mb-4">🎮</div>
                  <h3 className="text-xl font-bold mb-2">Demo Mode</h3>
                  <p className="text-gray-300">Try the game risk-free with virtual money</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Start Walking?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Join thousands of players in the most exciting dog walking adventure!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handlePlayDemo}
                  className="btn-primary py-4 px-8 text-xl"
                >
                  🎮 Try Demo Now
                </button>
                <button
                  onClick={handleGetStarted}
                  className="btn-secondary py-4 px-8 text-xl"
                >
                  💰 Play for Real
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>


    </>
  );
};

export default LandingPage; 