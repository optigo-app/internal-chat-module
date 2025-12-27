import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Example component showing how to access user permissions using the custom hook
 * This is for demonstration purposes only
 */
const PermissionHookExample = () => {
  const permissions = usePermissions();
  
  // Example of checking a specific permission
  const canDeleteMessages = permissions?.some(permission => 
    permission.module === 'messages' && permission.actions.includes('delete')
  );
  
  return (
    <div>
      <h3>User Permissions (using hook)</h3>
      {permissions ? (
        <div>
          <p>Total permissions: {permissions.length}</p>
          <pre>{JSON.stringify(permissions, null, 2)}</pre>
          <p>Can delete messages: {canDeleteMessages ? 'Yes' : 'No'}</p>
        </div>
      ) : (
        <p>No permissions data available</p>
      )}
    </div>
  );
};

export default PermissionHookExample;