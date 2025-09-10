import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase/config';
import type { UserRole } from '../types';

export type Permission = 
  | 'read_services' 
  | 'write_services' 
  | 'delete_services'
  | 'read_clients' 
  | 'write_clients' 
  | 'delete_clients'
  | 'read_reports' 
  | 'write_reports'
  | 'read_admin' 
  | 'write_admin'
  | 'manage_users'
  | 'manage_roles';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'read_services', 'write_services', 'delete_services',
    'read_clients', 'write_clients', 'delete_clients',
    'read_reports', 'write_reports',
    'read_admin', 'write_admin', 'manage_users', 'manage_roles'
  ],
  manager: [
    'read_services', 'write_services', 'delete_services',
    'read_clients', 'write_clients', 'delete_clients',
    'read_reports', 'write_reports'
  ],
  supervisor: [
    'read_services', 'write_services',
    'read_clients', 'write_clients',
    'read_reports'
  ],
  technician: [
    'read_services', 'write_services',
    'read_clients'
  ],
  finance: [
    'read_services',
    'read_clients',
    'read_reports', 'write_reports'
  ],
  client: [
    'read_services'
  ]
};

type AuthContextType = {
  currentUser: User | null;
  userRole: UserRole | null;
  permissions: Permission[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  refreshToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const updateUserPermissions = (role: UserRole | null) => {
    if (role && ROLE_PERMISSIONS[role]) {
      setPermissions(ROLE_PERMISSIONS[role]);
    } else {
      setPermissions([]);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get the ID token result to access custom claims
          const idTokenResult = await user.getIdTokenResult();
          const role = idTokenResult.claims.role as UserRole || null;
          setCurrentUser(user);
          setUserRole(role);
          updateUserPermissions(role);
        } catch (error) {
          console.error('Error getting user claims:', error);
          setCurrentUser(user);
          setUserRole(null);
          setPermissions([]);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setPermissions([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserRole(null);
    setPermissions([]);
  };

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!userRole) return false;
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  };

  const refreshToken = async (): Promise<void> => {
    if (currentUser) {
      try {
        const idTokenResult = await currentUser.getIdTokenResult(true);
        const role = idTokenResult.claims.role as UserRole || null;
        setUserRole(role);
        updateUserPermissions(role);
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    }
  };

  const value = {
    currentUser,
    userRole,
    permissions,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
