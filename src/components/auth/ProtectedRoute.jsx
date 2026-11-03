import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginPage from './LoginPage';

/**
 * Wrap any route with this. Pass adminOnly to restrict to role === 'admin'.
 *
 * <Route path="/settings/staff" element={
 *   <ProtectedRoute adminOnly><StaffList /></ProtectedRoute>
 * } />
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D] text-gray-400">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
