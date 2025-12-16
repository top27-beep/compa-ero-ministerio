import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neu-base">
        <Loader2 className="animate-spin text-neu-accent" size={40} />
      </div>
    );
  }

  if (!session) {
    // Redirect them to the /auth page, but save the current location they were
    // trying to go to when they were redirected.
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};