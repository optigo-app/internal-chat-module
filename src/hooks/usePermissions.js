import { useContext } from 'react';
import { LoginContext } from '../context/LoginData';

/**
 * Custom hook to access user permissions from the LoginContext
 * @returns {Object|null} User permissions object or null if not available
 */
export const usePermissions = () => {
  const context = useContext(LoginContext);
  
  if (!context) {
    throw new Error('usePermissions must be used within a LoginData provider');
  }
  
  return context.permissions;
};