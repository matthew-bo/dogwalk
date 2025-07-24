import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/AuthModalContext';
import { User, Wallet, Trophy, Home, LogOut, Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { openModal } = useAuthModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthClick = (mode: 'login' | 'register') => {
    openModal(mode);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2" onClick={handleLinkClick}>
              <span className="text-2xl">🐕</span>
              <span className="text-xl font-bold gradient-text">Dog Walk Gamble</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`flex items-center space-x-1 transition-colors ${
                      isActivePath('/dashboard') ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Home size={18} />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/game"
                    className={`flex items-center space-x-1 transition-colors ${
                      isActivePath('/game') ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <span>🎮</span>
                    <span>Play</span>
                  </Link>
                  <Link
                    to="/leaderboard"
                    className={`flex items-center space-x-1 transition-colors ${
                      isActivePath('/leaderboard') ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Trophy size={18} />
                    <span>Leaderboard</span>
                  </Link>
                  <Link
                    to="/profile"
                    className={`flex items-center space-x-1 transition-colors ${
                      isActivePath('/profile') ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <User size={18} />
                    <span>Profile</span>
                  </Link>
                </>
              ) : (
                <Link 
                  to="/" 
                  className={`transition-colors ${
                    isActivePath('/') ? 'text-blue-400' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Home
                </Link>
              )}
            </div>

            {/* Desktop Auth/User Section */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* User Balance */}
                  <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-lg">
                    <Wallet size={16} className="text-green-400" />
                    <span className="text-green-400 font-semibold">
                      ${((user?.usdBalanceCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>

                  {/* User Menu */}
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-300 hidden lg:block">
                      Welcome, {user?.username}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
                      aria-label="Logout"
                    >
                      <LogOut size={18} />
                      <span className="hidden lg:block">Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="btn-primary"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-3">
              {/* Mobile Balance (if authenticated) */}
              {isAuthenticated && (
                <div className="flex items-center space-x-1 bg-gray-800 px-2 py-1 rounded text-sm">
                  <Wallet size={14} className="text-green-400" />
                  <span className="text-green-400 font-semibold">
                    ${((user?.usdBalanceCents || 0) / 100).toFixed(2)}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-white p-2"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-4 py-3 space-y-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`flex items-center space-x-2 py-2 px-3 rounded transition-colors ${
                      isActivePath('/dashboard') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={handleLinkClick}
                  >
                    <Home size={18} />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    to="/game"
                    className={`flex items-center space-x-2 py-2 px-3 rounded transition-colors ${
                      isActivePath('/game') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={handleLinkClick}
                  >
                    <span>🎮</span>
                    <span>Play</span>
                  </Link>
                  <Link
                    to="/leaderboard"
                    className={`flex items-center space-x-2 py-2 px-3 rounded transition-colors ${
                      isActivePath('/leaderboard') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={handleLinkClick}
                  >
                    <Trophy size={18} />
                    <span>Leaderboard</span>
                  </Link>
                  <Link
                    to="/profile"
                    className={`flex items-center space-x-2 py-2 px-3 rounded transition-colors ${
                      isActivePath('/profile') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={handleLinkClick}
                  >
                    <User size={18} />
                    <span>Profile</span>
                  </Link>
                  
                  <div className="border-t border-gray-700 pt-3">
                    <div className="flex items-center space-x-2 text-gray-300 mb-3">
                      <User size={16} />
                      <span>Welcome, {user?.username}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 py-2 px-3 rounded text-gray-300 hover:bg-gray-700 w-full text-left transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className={`flex items-center space-x-2 py-2 px-3 rounded transition-colors ${
                      isActivePath('/') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                    onClick={handleLinkClick}
                  >
                    <Home size={18} />
                    <span>Home</span>
                  </Link>
                  
                  <div className="border-t border-gray-700 pt-3 space-y-2">
                    <button
                      onClick={() => handleAuthClick('login')}
                      className="w-full text-left py-2 px-3 rounded text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => handleAuthClick('register')}
                      className="w-full btn-primary py-2"
                    >
                      Sign Up
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </nav>


    </>
  );
};

export default Navbar; 