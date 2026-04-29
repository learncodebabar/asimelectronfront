// components/PermissionGuard.jsx
import { useAuth } from '../context/AuthContext';

export function PermissionGuard({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();
  
  if (hasPermission(permission)) {
    return children;
  }
  return fallback;
}

export function AnyPermissionGuard({ permissions, children, fallback = null }) {
  const { hasAnyPermission } = useAuth();
  
  if (hasAnyPermission(permissions)) {
    return children;
  }
  return fallback;
}

export function ProtectedRoute({ permission, children }) {
  const { hasPermission, user } = useAuth();
  
  if (!user) return null;
  if (!hasPermission(permission)) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#c0392b' }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }
  return children;
}