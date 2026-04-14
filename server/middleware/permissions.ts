import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Extend session to cache user data
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: string;
    userFullData?: any;
  }
}

// Helper to get user with caching
async function getUserFromSession(req: Request) {
  if (!req.session.userId) return null;

  // Check cache
  if (req.session.userFullData && req.session.userRole) {
    return req.session.userFullData;
  }

  // Fetch and cache
  const user = await storage.getUser(req.session.userId);
  if (user) {
    req.session.userRole = user.role;
    req.session.userFullData = user;
  }
  return user;
}

// Middleware: Check if user has write access (admin only).
// This is the gate for commercial/financial mutations. Chef writes are handled
// by hasChefOrAboveWriteAccess below, which is a narrower grant.
export const hasWriteAccess = async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUserFromSession(req);

  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Insufficient permissions. Admin access required.' });
  }

  next();
};

// Middleware: allow operational writes for chefs, users, and admins.
// Used by endpoints that chefs legitimately need to edit: event checklist,
// event status transitions (confirmed → in-progress → completed), event notes,
// recipes, base ingredients, shopping list check-offs.
export const hasChefOrAboveWriteAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = await getUserFromSession(req);

  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (user.role !== 'admin' && user.role !== 'user' && user.role !== 'chef') {
    return res.status(403).json({ message: 'Insufficient permissions.' });
  }

  next();
};

// Middleware: any staff member (admin, user, chef). Used for operational reads
// that chefs need but customers/clients shouldn't see.
export const isStaff = async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUserFromSession(req);

  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (user.role !== 'admin' && user.role !== 'user' && user.role !== 'chef') {
    return res.status(403).json({ message: 'Insufficient permissions.' });
  }

  next();
};

// Middleware: only sales-side roles (admin, user). Chefs are explicitly blocked
// from sales data: leads, opportunities, clients, inquiries, quotes, reports.
export const canViewSales = async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUserFromSession(req);

  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (user.role !== 'admin' && user.role !== 'user') {
    return res.status(403).json({ message: 'Chefs do not have access to sales data.' });
  }

  next();
};

// Middleware: Check if user can view financial data (admin only)
export const canViewFinancials = async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUserFromSession(req);

  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Insufficient permissions to view financial data.' });
  }

  next();
};

// Middleware: Check if user is admin or regular user (not client)
export const isAdminOrUser = async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUserFromSession(req);

  if (!user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (user.role !== 'admin' && user.role !== 'user') {
    return res.status(403).json({ message: 'Insufficient permissions.' });
  }

  next();
};

// Middleware: Check if user can edit a specific record (admin or creator)
export const canEditRecord = (createdByField: string = 'createdBy') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getUserFromSession(req);

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Admins can edit anything
    if (user.role === 'admin') {
      return next();
    }

    // For non-admins, check if they created this record
    // This requires fetching the record first
    // Implementation depends on the route - set req.canEdit = true/false
    // and check in route handler
    (req as any).requiresOwnershipCheck = true;
    (req as any).currentUserId = user.id;
    next();
  };
};

// Helper function to check if user role allows viewing financials
export function canUserViewFinancials(userRole: string): boolean {
  return userRole === 'admin';
}

// Helper function to check if user role allows viewing sales data
// (leads, inquiries, quotes, opportunities, clients, reports)
export function canUserViewSales(userRole: string | undefined | null): boolean {
  return userRole === 'admin' || userRole === 'user';
}

// Helper function to check if user role allows write access
export function canUserWrite(userRole: string): boolean {
  return userRole === 'admin';
}

// Helper: true for any staff role (admin, user, chef)
export function isStaffRole(userRole: string | undefined | null): boolean {
  return userRole === 'admin' || userRole === 'user' || userRole === 'chef';
}
