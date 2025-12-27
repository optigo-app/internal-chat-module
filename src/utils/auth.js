import { disconnectSocket } from '../socket';

export const logout = () => {
  // Clear session storage
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('userData');
  
  // Disconnect socket
  disconnectSocket();
  
  // Redirect to login
  window.location.href = '/login';
};
