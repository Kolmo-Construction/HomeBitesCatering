import { useAuth } from './use-auth';

// Hook: Check if current user can write/edit data (admin-only commercial writes)
export function useCanWrite() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

// Hook: Check if current user can view financial data (admin only)
export function useCanViewFinancials() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

// Hook: Check if current user can view sales data (admin or user, NOT chef).
// Covers: leads, opportunities, clients, inquiries, quotes, reports.
export function useCanViewSales() {
  const { user } = useAuth();
  return user?.role === 'admin' || user?.role === 'user';
}

// Hook: Check if current user is admin
export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === 'admin';
}

// Hook: Check if current user is a chef (kitchen staff)
export function useIsChef() {
  const { user } = useAuth();
  return user?.role === 'chef';
}

// Hook: Can the user perform operational writes — status transitions,
// checklist ticks, notes, prep schedule updates, shopping check-offs.
// Granted to admin, user, and chef.
export function useCanWriteEventOps() {
  const { user } = useAuth();
  return user?.role === 'admin' || user?.role === 'user' || user?.role === 'chef';
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

// Hook: Check if current user has access to staff features
// (admin, user, OR chef — anyone who works for Homebites)
export function useIsStaff() {
  const { user } = useAuth();
  return user?.role === 'admin' || user?.role === 'user' || user?.role === 'chef';
}
