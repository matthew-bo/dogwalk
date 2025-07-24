import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { X, Eye, EyeOff } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';

interface AuthModalProps {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ mode, onClose, onSwitchMode }) => {
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    ageConfirmed: false
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Password validation for registration
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/\d/.test(password)) errors.push('One number');
    return errors;
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // Email validation (register only)
    if (mode === 'register') {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (mode === 'register') {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        newErrors.password = `Password must have: ${passwordErrors.join(', ')}`;
      }
    }

    // Age confirmation (register only)
    if (mode === 'register' && !formData.ageConfirmed) {
      newErrors.ageConfirmed = 'You must confirm you are 21 years or older';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({}); // Clear any previous errors

    try {
      if (mode === 'login') {
        await login(formData.username, formData.password);
      } else {
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          ageConfirmed: formData.ageConfirmed
        });
      }
      onClose();
    } catch (error: any) {
      // Handle network errors differently
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        setErrors({ 
          general: 'Cannot connect to server. Try the demo mode instead!' 
        });
      } else {
        setErrors({ 
          general: error.response?.data?.error?.message || 'An error occurred' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSwitchMode = () => {
    setErrors({}); // Clear errors when switching modes
    setFormData({
      username: '',
      email: '',
      password: '',
      ageConfirmed: false
    });
    onSwitchMode();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">
            {mode === 'login' ? 'Welcome Back' : 'Join Dog Walk Gamble'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-full"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter your username"
              required
              aria-label="Username"
              aria-describedby={errors.username ? "username-error" : undefined}
            />
            {errors.username && <p id="username-error" className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>

          {/* Email (Register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter your email"
                required
                aria-label="Email address"
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="input-field pr-12"
                placeholder="Enter your password"
                required
                minLength={mode === 'register' ? 8 : undefined}
                aria-label="Password"
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {mode === 'register' && (
              <p className="text-xs text-gray-400 mt-1">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </p>
            )}
            {errors.password && <p id="password-error" className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Age Confirmation (Register only) */}
          {mode === 'register' && (
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                name="ageConfirmed"
                checked={formData.ageConfirmed}
                onChange={handleInputChange}
                className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                required
                aria-describedby={errors.ageConfirmed ? "age-error" : undefined}
              />
              <label className="text-sm text-gray-300">
                I confirm that I am 21 years of age or older and understand that this platform
                involves real money gambling.
              </label>
            </div>
          )}
          {errors.ageConfirmed && <p id="age-error" className="text-red-500 text-xs mt-1">{errors.ageConfirmed}</p>}

          {/* General Error Display */}
          {errors.general && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary flex items-center justify-center space-x-2"
            aria-label={mode === 'login' ? 'Login to your account' : 'Create new account'}
          >
            {isLoading && <LoadingSpinner size="small" />}
            <span>{mode === 'login' ? 'Login' : 'Create Account'}</span>
          </button>

          {/* Switch Mode */}
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={handleSwitchMode}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {mode === 'login'
                ? "Don't have an account? Create Account"
                : 'Already have an account? Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal; 