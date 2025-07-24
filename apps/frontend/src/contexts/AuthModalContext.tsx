import React, { createContext, useContext, useState } from 'react';

interface AuthModalContextType {
  isOpen: boolean;
  mode: 'login' | 'register';
  openModal: (mode: 'login' | 'register') => void;
  closeModal: () => void;
  switchMode: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const openModal = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const value: AuthModalContextType = {
    isOpen,
    mode,
    openModal,
    closeModal,
    switchMode
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}; 