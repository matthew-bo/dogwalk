import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminDashboard from '../components/admin/AdminDashboard';

const AdminPage: React.FC = () => {
  const { user } = useAuth();

  // Check if user is admin (you can implement proper role checking)
  const isAdmin = user?.email === 'admin@dogwalk.io' || user?.id === 'admin_user';

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-4xl font-bold text-red-400 mb-4">Access Denied</h1>
        <p className="text-gray-300 mb-8">You don't have permission to access the admin dashboard.</p>
        <div className="text-6xl mb-4">🚫</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <AdminDashboard />
    </div>
  );
};

export default AdminPage; 