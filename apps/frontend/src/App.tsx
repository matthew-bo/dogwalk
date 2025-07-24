import { Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAuthModal } from './contexts/AuthModalContext';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthModal from './components/auth/AuthModal';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

function App() {
  const { isLoading } = useAuth();
  const { isOpen, mode, closeModal, switchMode } = useAuthModal();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          {/* Public Game Route - No Login Required */}
          <Route path="/game" element={<GamePage />} />
          
          {/* Protected Routes - Require Login */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<div className="text-center py-20">
            <h1 className="text-4xl font-bold text-gray-300 mb-4">404</h1>
            <p className="text-gray-400">Page not found</p>
          </div>} />
        </Routes>
      </main>
      
      {/* Global Auth Modal */}
      {isOpen && (
        <AuthModal
          mode={mode}
          onClose={closeModal}
          onSwitchMode={switchMode}
        />
      )}
    </div>
  );
}

export default App; 