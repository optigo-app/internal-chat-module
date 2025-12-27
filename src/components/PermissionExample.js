import React, { useContext } from 'react';
import { LoginContext } from '../context/LoginData';

/**
 * Example component showing how to access user permissions
 * This is for demonstration purposes only
 */
const PermissionExample = () => {
  const { permissions } = useContext(LoginContext);
  
  // Example of checking a specific permission
  const canEditMessages = permissions?.some(permission => 
    permission.module === 'messages' && permission.actions.includes('edit')
  );
  
  return (
    <div>
      <h3>User Permissions</h3>
      {permissions ? (
        <div>
          <p>Total permissions: {permissions.length}</p>
          <pre>{JSON.stringify(permissions, null, 2)}</pre>
          <p>Can edit messages: {canEditMessages ? 'Yes' : 'No'}</p>
        </div>
      ) : (
        <p>No permissions data available</p>
      )}
    </div>
  );
};

export default PermissionExample;