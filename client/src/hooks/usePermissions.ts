import { useAuth } from './use-auth';

// Hook: Check if current user can write/edit data
export function useCanWrite() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

// Hook: Check if current user can view financial data
export function useCanViewFinancials() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

// Hook: Check if current user is admin
export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

// Hook: Check if current user can edit a specific record
export function useCanEditRecord(createdBy: number | null | undefined) {
  const { user } = useAuth();

  if (!user) return false;

  // Admins can edit anything
  if (user.role === 'admin') return true;

  // Check if user created this record
  if (!createdBy) return false;
  return createdBy === user.id;
}

// Hook: Check if current user is a regular user (not client, not admin)
export function useIsUser() {
  const { user } = useAuth();
  return user?.role === 'user';
}

// Hook: Check if current user has access to admin/user features
export function useIsStaff() {
  const { user } = useAuth();
  return user?.role === 'admin' || user?.role === 'user';
}
