import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthProvider';

/**
 * Redirect authenticated users to the correct dashboard for their role.
 */
export const AutoRedirect = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const roleRoutes = {
      ADMIN: '/admin',
      TRAINER: '/trainer',
      CLIENT: '/client',
    };

    navigate(roleRoutes[user.role] || '/login', { replace: true });
  }, [isLoading, navigate, user]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h2>Redirecting...</h2>
        <p>Please wait while we redirect you to your dashboard.</p>
      </div>
    </div>
  );
};
