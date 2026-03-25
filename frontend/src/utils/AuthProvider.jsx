import { createContext, useContext, useEffect, useState } from 'react';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const withDefaultAvatar = (u) => {
    if (!u) return u;
    if (u.avatar) return u;
    const g = (u.gender || '').toString().toLowerCase();
    if (g === 'male' || g === 'm') u.avatar = maleAvatar;
    else if (g === 'female' || g === 'f') u.avatar = femaleAvatar;
    return u;
  };

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      return withDefaultAvatar(parsed);
    } catch (e) {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Auto-login: Verify token validity on app load
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const saved = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (saved && token) {
          const userData = JSON.parse(saved);
          // Verify token is still valid (you can add API call here if needed)
          // For now, just restore the user from localStorage and ensure avatar exists
          setUser(withDefaultAvatar(userData));
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyAuth();
  }, []);
 
  const login = (userData) => {
    const withAvatar = withDefaultAvatar(userData);
    setUser(withAvatar);
    localStorage.setItem('user', JSON.stringify(withAvatar));
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('activationToken');
  };
  
  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);