// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

import { PERMISSIONS } from '../constants/permissions';
import api from '../api/api';

const AuthContext = createContext();

// Helper function to normalize user objects (MongoDB _id to id)
const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    id: user._id || user.id,  // Ensure id field exists
    _id: user._id || user.id  // Keep _id for MongoDB compatibility
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        // Verify token with backend
        const response = await api.get('/auth/me');
        const normalizedUser = normalizeUser(response.data);
        setUser(normalizedUser);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        
        // Fetch users if admin
        if (normalizedUser.role === 'admin') {
          await fetchUsers();
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      console.log('Login attempt:', username);
      const response = await api.post('/auth/login', { username, password });
      const { token, user: userData } = response.data;
      
      const normalizedUser = normalizeUser(userData);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      
      // Fetch users if admin
      if (normalizedUser.role === 'admin') {
        await fetchUsers();
      }
      
      console.log('Login successful:', normalizedUser.username);
      return { success: true, user: normalizedUser };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setUsers([]);
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      // Normalize all users to have id field
      const normalizedUsers = response.data.map(user => normalizeUser(user));
      setUsers(normalizedUsers);
      return normalizedUsers;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  };

  const createUser = async (userData) => {
    try {
      console.log('Creating user:', userData);
      const response = await api.post('/users', {
        username: userData.username,
        password: userData.password,
        name: userData.name,
        role: userData.role,
        permissions: userData.permissions
      });
      
      // Refresh user list
      await fetchUsers();
      
      return { success: true, user: response.data };
    } catch (error) {
      console.error('Create user error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create user';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      // Validate userId
      if (!userId) {
        console.error('Update user called with invalid userId:', userId);
        return { 
          success: false, 
          error: 'Invalid user ID. Please refresh the page and try again.' 
        };
      }
      
      console.log('Updating user with ID:', userId);
      console.log('Update data:', updates);
      
      const response = await api.put(`/users/${userId}`, updates);
      
      // Refresh user list
      await fetchUsers();
      
      // Update current user if it's the logged-in user
      if (user && (user.id === userId || user._id === userId)) {
        const updatedUser = normalizeUser({ ...user, ...updates });
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return { success: true, user: response.data };
    } catch (error) {
      console.error('Update user error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update user';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const deleteUser = async (userId) => {
    try {
      // Validate userId
      if (!userId) {
        console.error('Delete user called with invalid userId:', userId);
        return { 
          success: false, 
          error: 'Invalid user ID. Please refresh the page and try again.' 
        };
      }
      
      console.log('Deleting user with ID:', userId);
      await api.delete(`/users/${userId}`);
      
      // Refresh user list
      await fetchUsers();
      
      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete user';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions.some(p => user.permissions?.includes(p));
  };

  const hasAllPermissions = (permissions) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions.every(p => user.permissions?.includes(p));
  };

  const value = {
    user,
    users,
    loading,
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
    fetchUsers,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};