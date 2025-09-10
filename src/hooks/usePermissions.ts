import { useAuth } from '../contexts/AuthContext';
import type { Permission } from '../contexts/AuthContext';
import type { UserRole } from '../types';

/**
 * Custom hook for handling permissions and role-based access control
 */
export const usePermissions = () => {
  const { userRole, permissions, hasPermission, hasRole } = useAuth();

  /**
   * Check if user can perform a specific action
   */
  const canPerform = (action: Permission): boolean => {
    return hasPermission(action);
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: UserRole[]): boolean => {
    return hasRole(roles);
  };

  /**
   * Check if user can access a specific section
   */
  const canAccess = {
    services: {
      read: () => canPerform('read_services'),
      write: () => canPerform('write_services'),
      delete: () => canPerform('delete_services'),
    },
    clients: {
      read: () => canPerform('read_clients'),
      write: () => canPerform('write_clients'),
      delete: () => canPerform('delete_clients'),
    },
    reports: {
      read: () => canPerform('read_reports'),
      write: () => canPerform('write_reports'),
    },
    admin: {
      read: () => canPerform('read_admin'),
      write: () => canPerform('write_admin'),
      manageUsers: () => canPerform('manage_users'),
      manageRoles: () => canPerform('manage_roles'),
    },
  };

  /**
   * Get user's role level (higher number = more permissions)
   */
  const getRoleLevel = (): number => {
    switch (userRole) {
      case 'admin': return 5;
      case 'manager': return 4;
      case 'supervisor': return 3;
      case 'technician': return 2;
      case 'finance': return 2;
      case 'client': return 1;
      default: return 0;
    }
  };

  /**
   * Check if user has higher or equal role level
   */
  const hasMinimumRole = (minimumRole: UserRole): boolean => {
    const userLevel = getRoleLevel();
    const requiredLevel = (() => {
      switch (minimumRole) {
        case 'admin': return 5;
        case 'manager': return 4;
        case 'supervisor': return 3;
        case 'technician': return 2;
        case 'finance': return 2;
        case 'client': return 1;
        default: return 0;
      }
    })();
    
    return userLevel >= requiredLevel;
  };

  return {
    userRole,
    permissions,
    canPerform,
    hasAnyRole,
    canAccess,
    getRoleLevel,
    hasMinimumRole,
    // Convenience flags
    isAdmin: userRole === 'admin',
    isManager: hasAnyRole(['admin', 'manager']),
    isSupervisor: hasAnyRole(['admin', 'manager', 'supervisor']),
    isStaff: hasAnyRole(['admin', 'manager', 'supervisor', 'technician']),
    isFinance: userRole === 'finance',
    isClient: userRole === 'client',
  };
};

export default usePermissions;
