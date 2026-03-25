import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../utils/AuthProvider';


export const ProtectedRoute = ({ allowedRoles }) => {
  const auth = useAuth();
  const user = auth?.user;
  const isLoading = auth?.isLoading;
  
  // Show loading while verifying authentication
  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Auto-redirect: Check if user role matches allowed roles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <>
    <div style={{ height: '100px', marginTop: '100px', textAlign: 'center' }}>
    <h2 style={{ textAlign: 'center', color: 'red' }}>Access Denied</h2>
    You are not authorized to view this page. 
    Please contact the administrator for access. <br />
    <Link to="/login" style={{ textDecoration: 'underline' }}>Go to Login</Link>
    </div>
    </>;
  }

  return <Outlet />;
};