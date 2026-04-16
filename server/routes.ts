import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db"; // For direct database access
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import session from "express-session";
import { eq, and, isNull, inArray } from "drizzle-orm"; // For equality operations
import Anthropic from "@anthropic-ai/sdk";
import pgSession from 'connect-pg-simple';
import {
  insertUserSchema,
  insertOpportunitySchema,
  insertMenuItemSchema,
  insertMenuSchema,
  insertClientSchema,
  insertEstimateSchema,
  insertEventSchema,
  insertContactIdentifierSchema, // New
  insertCommunicationSchema,     // New
  opportunityPriorityEnum,       // For priority filtering
  insertRawLeadSchema,           // For raw leads management
  opportunities,                  // for send-inquiry endpoint
  communications,                // table for drizzle updates
  opportunityEmailThreads,       // table for thread migration
  quoteRequests,                 // for promote-to-quote-request endpoint
  rawLeads,                      // for promote-to-quote-request endpoint
  estimates,                     // for accept-estimate endpoint
  followUpDrafts,                // for follow-up engine
  estimateVersions,              // for quote versioning
  contactIdentifiers,            // for duplicate merge
  clients,                       // for accept-estimate endpoint (prospect→customer graduation)
  events,                        // for auto-create event on accept and /full endpoint
  menus,                         // for /api/events/:id/full aggregate endpoint
  type InsertCommunication,
  type InsertOpportunityEmailThread,
} from "@shared/schema";
import { aiService } from './services/aiService';
import { normalizePhoneNumber, isValidPhone } from './services/phoneService';
import {
  hasWriteAccess,
  canViewFinancials,
  isAdminOrUser,
  hasChefOrAboveWriteAccess,
} from './middleware/permissions';
import { filterEstimate, filterEstimates, filterMenuItem, filterMenuItems } from './utils/dataFilters';
import { buildProposalFromQuoteRequest, buildProposalFromEstimateAlone } from './lib/proposalFromQuoteRequest';
import type { Proposal } from '@shared/proposal';
import { getSiteConfig, getEmailConfig } from './utils/siteConfig';
import { sendEmail, sendEmailInBackground } from './utils/email';
import {
  quoteSentEmail,
  quoteViewedAdminEmail,
  quoteAcceptedCustomerEmail,
  quoteAcceptedAdminEmail,
  findMyEventEmail,
  eventReminderEmail,
  inquiryInvitationEmail,
  followUpInquiryNotOpened,
  followUpInquiryNotSubmitted,
  followUpQuoteNotViewed,
  followUpQuoteNoAction,
  followUpQuoteExpiringSoon,
  type ReminderKind,
} from './utils/emailTemplates';

// Helper function to map lead quality to opportunity priority
function mapLeadQualityToPriority(leadQuality?: string): 'high' | 'medium' | 'low' {
  if (!leadQuality) return 'medium';
  
  switch (leadQuality) {
    case 'hot':
      return 'high';
    case 'warm':
      return 'medium';
    case 'cold':
    case 'nurture':
      return 'low';
    default:
      return 'medium';
  }
}

// Helper function to format notes from raw lead data including AI insights
function formatNotes(lead: any): string | null {
  const noteParts = [];
  
  // Add AI-extracted message summary if available
  if (lead.extractedMessageSummary) {
    noteParts.push(`Client Message: ${lead.extractedMessageSummary}`);
  }
  
  // Add AI analysis if available
  if (lead.aiKeyRequirements) {
    let requirementsText = '';
    try {
      // Handle both string and JSON object formats
      if (typeof lead.aiKeyRequirements === 'string') {
        requirementsText = lead.aiKeyRequirements;
      } else {
        // Format requirements as bullet points if it's an array
        const requirements = Array.isArray(lead.aiKeyRequirements) 
          ? lead.aiKeyRequirements 
          : Object.values(lead.aiKeyRequirements);
        
        if (requirements.length > 0) {
          requirementsText = requirements.map(req => `• ${req}`).join('\n');
        }
      }
      
      if (requirementsText) {
        noteParts.push(`Key Requirements:\n${requirementsText}`);
      }
    } catch (e) {
      console.warn('Error formatting AI requirements:', e);
    }
  }
  
  // Add potential red flags if available
  if (lead.aiPotentialRedFlags) {
    let redFlagsText = '';
    try {
      // Handle both string and JSON object formats
      if (typeof lead.aiPotentialRedFlags === 'string') {
        redFlagsText = lead.aiPotentialRedFlags;
      } else {
        // Format red flags as bullet points if it's an array
        const redFlags = Array.isArray(lead.aiPotentialRedFlags) 
          ? lead.aiPotentialRedFlags 
          : Object.values(lead.aiPotentialRedFlags);
        
        if (redFlags.length > 0) {
          redFlagsText = redFlags.map(flag => `• ${flag}`).join('\n');
        }
      }
      
      if (redFlagsText) {
        noteParts.push(`Potential Concerns:\n${redFlagsText}`);
      }
    } catch (e) {
      console.warn('Error formatting AI red flags:', e);
    }
  }
  
  // Add budget information if available
  if (lead.aiBudgetIndication || lead.aiBudgetValue) {
    let budgetText = 'Budget: ';
    
    if (lead.aiBudgetValue) {
      budgetText += `$${lead.aiBudgetValue}`;
    }
    
    if (lead.aiBudgetIndication) {
      budgetText += lead.aiBudgetValue ? ` (${lead.aiBudgetIndication})` : lead.aiBudgetIndication;
    }
    
    noteParts.push(budgetText);
  }
  
  // Add calendar conflict assessment if available
  if (lead.aiCalendarConflictAssessment) {
    noteParts.push(`Calendar Assessment: ${lead.aiCalendarConflictAssessment}`);
  }
  
  // Add internal notes if available
  if (lead.notes) {
    noteParts.push(`Internal Notes: ${lead.notes}`);
  }
  
  return noteParts.length > 0 ? noteParts.join('\n\n') : null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure PostgreSQL session store
  const PgStore = pgSession(session);
  
  // Configure session middleware
  // Replit uses HTTPS for all published apps, so we use secure cookies
  // In development (with REPL_ID), we allow non-secure for localhost
  const isProduction = !process.env.REPL_ID || process.env.NODE_ENV === 'production';
  
  app.use(session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: 'auto',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Global error handler:', err);
    
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    
    return res.status(500).json({ error: 'Internal Server Error' });
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.session.userId) {
      return next();
    }
    return res.status(401).json({ message: 'Not authenticated' });
  };

  // Lazy role lookup — returns req.session.userRole if cached, else fetches
  // from the DB and caches it. Handles sessions created before userRole was
  // populated at login (the sessions table is persistent across deploys).
  const getSessionRole = async (req: Request): Promise<string | null> => {
    if (req.session.userRole) return req.session.userRole;
    if (!req.session.userId) return null;
    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.session.userRole = user.role;
        return user.role;
      }
    } catch (err) {
      console.error('Failed to fetch user role for session:', err);
    }
    return null;
  };

  // Middleware to check if user is an admin
  const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (user && user.role === 'admin') {
        return next();
      }
      return res.status(403).json({ message: 'Insufficient permissions' });
    } catch (error) {
      console.error('Error checking admin status:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };

  // ===== Auth Routes =====
  
  // Register a new user
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Don't return the password
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error registering user:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Set the user id and role in the session. The role is cached here so
      // endpoints that read req.session.userRole directly don't have to
      // round-trip to the DB on every request. Any role change requires the
      // user to log out and back in — acceptable trade-off for SSR/perf.
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      // Save the session explicitly before responding
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        
        // Don't return the password
        const { password: _, ...userWithoutPassword } = user;
        
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get current user
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error getting current user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
  
  // ===== User Routes =====
  
  // Get all users (admin only)
  app.get('/api/users', isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.listUsers();
      
      // Don't return passwords
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific user (admin only)
  app.get('/api/users/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update a user (admin or self)
  app.patch('/api/users/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Only admins can update other users
      if (userId !== req.session.userId) {
        const currentUser = await storage.getUser(req.session.userId);
        
        if (!currentUser || currentUser.role !== 'admin') {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
      }
      
      const updateData = req.body;

      // Prevent users from changing their own role
      if (userId === req.session.userId) {
        const currentUser = await storage.getUser(req.session.userId);
        if (currentUser && currentUser.role !== 'admin' && updateData.role) {
          return res.status(403).json({ message: 'You cannot change your own role' });
        }

        // Prevent last admin from changing their role
        if (currentUser && currentUser.role === 'admin' && updateData.role !== 'admin') {
          const allUsers = await storage.listUsers();
          const adminCount = allUsers.filter(u => u.role === 'admin').length;
          if (adminCount <= 1) {
            return res.status(400).json({ message: 'Cannot change role of last admin' });
          }
        }
      }

      // If password is being updated, hash it
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete a user (admin only)
  app.delete('/api/users/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      // Prevent deleting self
      if (userId === req.session.userId) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
      }

      // Prevent deleting last admin
      const user = await storage.getUser(userId);
      if (user && user.role === 'admin') {
        const allUsers = await storage.listUsers();
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Cannot delete the last admin user' });
        }
      }

      const success = await storage.deleteUser(userId);

      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== Opportunities Routes =====
  
  // ─── Tier 4, Item 15: Audit Log & Restore ────────────────────────────────

  // Get audit log entries (optionally filtered by entity type/id)
  app.get('/api/audit-log', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const entries = await storage.getAuditLog(entityType, entityId, limit);
      res.status(200).json(entries);
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Restore a soft-deleted record
  app.post('/api/restore/:entityType/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const { entityType, id } = req.params;
      const entityId = parseInt(id);
      if (isNaN(entityId)) return res.status(400).json({ message: 'Invalid ID' });

      let restored = false;
      switch (entityType) {
        case 'opportunity': restored = await storage.restoreOpportunity(entityId); break;
        case 'client': restored = await storage.restoreClient(entityId); break;
        case 'estimate': restored = await storage.restoreEstimate(entityId); break;
        case 'event': restored = await storage.restoreEvent(entityId); break;
        default: return res.status(400).json({ message: 'Invalid entity type' });
      }

      if (!restored) return res.status(404).json({ message: 'Record not found' });

      await storage.writeAuditLog({
        entityType,
        entityId,
        action: 'restored',
        userId: req.session.userId,
      });

      res.status(200).json({ message: `${entityType} #${entityId} restored` });
    } catch (error) {
      console.error('Error restoring record:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── Tier 4, Item 14: Duplicate Detection ────────────────────────────────
  // Check for existing records matching an email or phone before creation.
  app.get('/api/duplicates/check', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const email = (req.query.email as string)?.toLowerCase();
      const phone = req.query.phone as string;

      if (!email && !phone) {
        return res.status(400).json({ message: 'Provide email or phone to check' });
      }

      const matches: Array<{ type: string; id: number; name: string; email: string; status?: string }> = [];

      // Check opportunities
      const allOpps = await storage.listOpportunities();
      for (const opp of allOpps) {
        if ((email && opp.email.toLowerCase() === email) || (phone && opp.phone === phone)) {
          matches.push({
            type: 'opportunity',
            id: opp.id,
            name: `${opp.firstName} ${opp.lastName}`,
            email: opp.email,
            status: opp.status,
          });
        }
      }

      // Check clients
      const allClients = await storage.listClients();
      for (const client of allClients) {
        if ((email && client.email.toLowerCase() === email) || (phone && client.phone === phone)) {
          matches.push({
            type: 'client',
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
          });
        }
      }

      res.status(200).json({ hasDuplicates: matches.length > 0, matches });
    } catch (error) {
      console.error('Error checking duplicates:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Merge two opportunities: moves all dependent records from secondary to primary,
  // then soft-deletes the secondary (or hard-deletes if soft delete not yet enabled).
  app.post('/api/duplicates/merge', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const { primaryId, secondaryId, entityType } = req.body;

      if (!primaryId || !secondaryId || primaryId === secondaryId) {
        return res.status(400).json({ message: 'Provide distinct primaryId and secondaryId' });
      }

      if (entityType === 'opportunity') {
        const primary = await storage.getOpportunity(primaryId);
        const secondary = await storage.getOpportunity(secondaryId);
        if (!primary || !secondary) return res.status(404).json({ message: 'One or both opportunities not found' });

        // Move communications
        await db.update(communications)
          .set({ opportunityId: primaryId })
          .where(eq(communications.opportunityId, secondaryId));

        // Move contact identifiers
        await db.update(contactIdentifiers)
          .set({ opportunityId: primaryId })
          .where(eq(contactIdentifiers.opportunityId, secondaryId));

        // Move quote requests
        await db.update(quoteRequests)
          .set({ opportunityId: primaryId })
          .where(eq(quoteRequests.opportunityId, secondaryId));

        // Move follow-up drafts
        await db.update(followUpDrafts)
          .set({ opportunityId: primaryId })
          .where(eq(followUpDrafts.opportunityId, secondaryId));

        // Merge notes
        if (secondary.notes) {
          const mergedNotes = [primary.notes, `[Merged from #${secondaryId}] ${secondary.notes}`]
            .filter(Boolean).join('\n');
          await storage.updateOpportunity(primaryId, { notes: mergedNotes });
        }

        // Delete secondary
        await storage.deleteOpportunity(secondaryId);

        return res.status(200).json({
          message: `Opportunity #${secondaryId} merged into #${primaryId}`,
          primaryId,
        });
      }

      if (entityType === 'client') {
        const primary = await storage.getClient(primaryId);
        const secondary = await storage.getClient(secondaryId);
        if (!primary || !secondary) return res.status(404).json({ message: 'One or both clients not found' });

        // Move estimates
        const allEstimates = await storage.listEstimates();
        for (const est of allEstimates) {
          if (est.clientId === secondaryId) {
            await storage.updateEstimate(est.id, { clientId: primaryId });
          }
        }

        // Move events
        const allEvents = await storage.listEvents();
        for (const evt of allEvents) {
          if (evt.clientId === secondaryId) {
            await storage.updateEvent(evt.id, { clientId: primaryId });
          }
        }

        // Move communications
        await db.update(communications)
          .set({ clientId: primaryId })
          .where(eq(communications.clientId, secondaryId));

        // Move contact identifiers
        await db.update(contactIdentifiers)
          .set({ clientId: primaryId })
          .where(eq(contactIdentifiers.clientId, secondaryId));

        // Merge notes
        if (secondary.notes) {
          const mergedNotes = [primary.notes, `[Merged from #${secondaryId}] ${secondary.notes}`]
            .filter(Boolean).join('\n');
          await storage.updateClient(primaryId, { notes: mergedNotes });
        }

        // Delete secondary
        await storage.deleteClient(secondaryId);

        return res.status(200).json({
          message: `Client #${secondaryId} merged into #${primaryId}`,
          primaryId,
        });
      }

      return res.status(400).json({ message: 'entityType must be "opportunity" or "client"' });
    } catch (error) {
      console.error('Error merging duplicates:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── Tier 4, Item 16: Bulk Actions ───────────────────────────────────────

  app.post('/api/opportunities/bulk-action', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const { ids, action, assignTo } = req.body as { ids: number[]; action: string; assignTo?: number };
      if (!ids?.length) return res.status(400).json({ message: 'No IDs provided' });

      let processed = 0;
      for (const id of ids) {
        switch (action) {
          case 'archive':
            await storage.updateOpportunity(id, { status: 'archived' as any, statusChangedAt: new Date() });
            processed++;
            break;
          case 'delete':
            await storage.deleteOpportunity(id);
            processed++;
            break;
          case 'reassign':
            if (assignTo !== undefined) {
              await storage.updateOpportunity(id, { assignedTo: assignTo });
              processed++;
            }
            break;
          case 'set_status':
            if (req.body.status) {
              await storage.updateOpportunity(id, { status: req.body.status, statusChangedAt: new Date() });
              processed++;
            }
            break;
        }
      }

      await storage.writeAuditLog({
        entityType: 'opportunity',
        entityId: 0, // bulk action
        action: action === 'delete' ? 'deleted' : 'updated',
        userId: req.session.userId,
        metadata: { bulkAction: action, ids, processed },
      });

      res.status(200).json({ message: `${processed} opportunities processed`, processed });
    } catch (error) {
      console.error('Error in bulk action:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/estimates/bulk-action', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const { ids, action } = req.body as { ids: number[]; action: string };
      if (!ids?.length) return res.status(400).json({ message: 'No IDs provided' });

      let processed = 0;
      for (const id of ids) {
        switch (action) {
          case 'delete':
            await storage.deleteEstimate(id);
            processed++;
            break;
          case 'expire':
            await storage.updateEstimate(id, { status: 'declined' as any });
            processed++;
            break;
        }
      }

      await storage.writeAuditLog({
        entityType: 'estimate',
        entityId: 0,
        action: action === 'delete' ? 'deleted' : 'updated',
        userId: req.session.userId,
        metadata: { bulkAction: action, ids, processed },
      });

      res.status(200).json({ message: `${processed} estimates processed`, processed });
    } catch (error) {
      console.error('Error in bulk action:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/clients/bulk-action', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const { ids, action } = req.body as { ids: number[]; action: string };
      if (!ids?.length) return res.status(400).json({ message: 'No IDs provided' });

      let processed = 0;
      for (const id of ids) {
        if (action === 'delete') {
          await storage.deleteClient(id);
          processed++;
        }
      }

      await storage.writeAuditLog({
        entityType: 'client',
        entityId: 0,
        action: 'deleted',
        userId: req.session.userId,
        metadata: { bulkAction: action, ids, processed },
      });

      res.status(200).json({ message: `${processed} clients processed`, processed });
    } catch (error) {
      console.error('Error in bulk action:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── Tier 2: Funnel Metrics Endpoint ──────────────────────────────────────
  // Returns aggregated counts by stage plus conversion rates for the funnel widget.
  app.get('/api/reports/funnel', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allOpps = await storage.listOpportunities();
      const allEstimates = await storage.listEstimates();
      const allEvents = await storage.listEvents();

      // Count by opportunity status
      const oppCounts: Record<string, number> = {};
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      const thisMonthOpps: Record<string, number> = {};
      const lastMonthOpps: Record<string, number> = {};

      for (const opp of allOpps) {
        oppCounts[opp.status] = (oppCounts[opp.status] || 0) + 1;
        const created = new Date(opp.createdAt);
        if (created.getMonth() === thisMonth && created.getFullYear() === thisYear) {
          thisMonthOpps[opp.status] = (thisMonthOpps[opp.status] || 0) + 1;
        }
        if (created.getMonth() === lastMonth && created.getFullYear() === lastMonthYear) {
          lastMonthOpps[opp.status] = (lastMonthOpps[opp.status] || 0) + 1;
        }
      }

      // Estimate counts by status
      const estCounts: Record<string, number> = {};
      for (const est of allEstimates) {
        estCounts[est.status] = (estCounts[est.status] || 0) + 1;
      }

      // Event counts
      const eventCount = allEvents.filter(e => e.status !== 'cancelled').length;

      // Build funnel stages
      const totalLeads = allOpps.length;
      const contacted = allOpps.filter(o => ['contacted', 'qualified', 'proposal', 'booked'].includes(o.status)).length;
      const qualified = allOpps.filter(o => ['qualified', 'proposal', 'booked'].includes(o.status)).length;
      const quotesSent = allEstimates.filter(e => ['sent', 'viewed', 'accepted', 'declined'].includes(e.status)).length;
      const accepted = allEstimates.filter(e => e.status === 'accepted').length;
      const booked = eventCount;

      const stages = [
        { name: "Leads", count: totalLeads, color: "#3B82F6" },
        { name: "Contacted", count: contacted, color: "#EAB308" },
        { name: "Qualified", count: qualified, color: "#A855F7" },
        { name: "Quotes Sent", count: quotesSent, color: "#F97316" },
        { name: "Accepted", count: accepted, color: "#22C55E" },
        { name: "Booked", count: booked, color: "#059669" },
      ];

      // Conversion rates (stage-to-stage)
      const conversionRates = stages.map((stage, i) => ({
        from: i > 0 ? stages[i - 1].name : null,
        to: stage.name,
        rate: i > 0 && stages[i - 1].count > 0
          ? Math.round((stage.count / stages[i - 1].count) * 100)
          : 100,
      }));

      // Average time to close (first contact to booked) from accepted estimates
      const acceptedEstimates = allEstimates.filter(e => e.status === 'accepted' && e.acceptedAt);
      let avgDaysToClose = 0;
      if (acceptedEstimates.length > 0) {
        const totalDays = acceptedEstimates.reduce((sum, e) => {
          return sum + (new Date(e.acceptedAt!).getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgDaysToClose = Math.round(totalDays / acceptedEstimates.length);
      }

      // Revenue this month vs last month
      const thisMonthRevenue = allEstimates
        .filter(e => e.status === 'accepted' && e.acceptedAt &&
          new Date(e.acceptedAt).getMonth() === thisMonth &&
          new Date(e.acceptedAt).getFullYear() === thisYear)
        .reduce((sum, e) => sum + e.total, 0);

      const lastMonthRevenue = allEstimates
        .filter(e => e.status === 'accepted' && e.acceptedAt &&
          new Date(e.acceptedAt).getMonth() === lastMonth &&
          new Date(e.acceptedAt).getFullYear() === lastMonthYear)
        .reduce((sum, e) => sum + e.total, 0);

      res.status(200).json({
        stages,
        conversionRates,
        oppCounts,
        estCounts,
        thisMonth: {
          opportunities: Object.values(thisMonthOpps).reduce((a, b) => a + b, 0),
          revenue: thisMonthRevenue,
        },
        lastMonth: {
          opportunities: Object.values(lastMonthOpps).reduce((a, b) => a + b, 0),
          revenue: lastMonthRevenue,
        },
        avgDaysToClose,
      });
    } catch (error) {
      console.error('Error generating funnel report:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get all opportunities
  app.get('/api/opportunities', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const source = req.query.source as string;
      const priority = req.query.priority as typeof opportunityPriorityEnum.enumValues[number];
      
      let opportunities;
      
      if (status) {
        opportunities = await storage.listOpportunitiesByStatus(status);
      } else if (source) {
        opportunities = await storage.listOpportunitiesBySource(source);
      } else if (priority) {
        opportunities = await storage.listOpportunitiesByPriority(priority);
      } else {
        opportunities = await storage.listOpportunities();
      }
      
      res.status(200).json(opportunities);
    } catch (error) {
      console.error('Error getting opportunities:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific opportunity
  app.get('/api/opportunities/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const opportunityId = parseInt(req.params.id);
      
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: 'Invalid opportunity ID' });
      }
      
      const opportunity = await storage.getOpportunity(opportunityId);
      
      if (!opportunity) {
        return res.status(404).json({ message: 'Opportunity not found' });
      }
      
      res.status(200).json(opportunity);
    } catch (error) {
      console.error('Error getting opportunity:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new opportunity
  app.post('/api/opportunities', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const { rawLeadId, ...opportunityData } = req.body;
      const validatedData = insertOpportunitySchema.parse(opportunityData);

      // Track who created this opportunity
      const newOpportunity = await storage.createOpportunity({
        ...validatedData,
        createdBy: req.session.userId,
      });
      
      // If this opportunity was created from a raw lead, update thread mappings
      if (rawLeadId) {
        try {
          // Find all threads associated with this raw lead
          const rawLeadThreads = await db
            .select()
            .from(opportunityEmailThreads)
            .where(eq(opportunityEmailThreads.rawLeadId, parseInt(rawLeadId)));
          
          // Guard against empty thread array to avoid empty IN() clause
          if (rawLeadThreads.length > 0) {
            // Filter out any null/empty thread IDs
            const validThreads = rawLeadThreads.filter(t => t.gmailThreadId && t.gmailThreadId.trim().length > 0);
            
            if (validThreads.length > 0) {
              // Update each thread to point to the new opportunity instead of the raw lead
              for (const thread of validThreads) {
                await storage.updateOpportunityEmailThread(thread.gmailThreadId, {
                  opportunityId: newOpportunity.id,
                  rawLeadId: null // Clear the raw lead reference
                });
                console.log(`Updated thread ${thread.gmailThreadId} from Raw Lead ${rawLeadId} to Opportunity ${newOpportunity.id}`);
              }
              
              // Also update any communications that were linked to the raw lead via thread
              await db
                .update(communications)
                .set({ opportunityId: newOpportunity.id })
                .where(and(
                  isNull(communications.opportunityId),
                  inArray(
                    communications.gmailThreadId,
                    validThreads.map(t => t.gmailThreadId)
                  )
                ));
              console.log(`Updated communications for raw lead ${rawLeadId} to link to opportunity ${newOpportunity.id}`);
            } else {
              console.log(`All threads for raw lead ${rawLeadId} have invalid thread IDs - skipping migration`);
            }
          } else {
            console.log(`No email threads found for raw lead ${rawLeadId} - this may be a manually created lead`);
          }
        } catch (error) {
          console.error('Error updating thread mappings for opportunity:', error);
          // Don't fail the opportunity creation if thread update fails
        }
      }
      
      res.status(201).json(newOpportunity);
    } catch (error) {
      console.error('Error creating opportunity:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update an opportunity
  app.patch('/api/opportunities/:id', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const opportunityId = parseInt(req.params.id);

      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: 'Invalid opportunity ID' });
      }

      // Check ownership for non-admins
      const user = await storage.getUser(req.session.userId!);
      if (user!.role !== 'admin') {
        const opportunity = await storage.getOpportunity(opportunityId);
        if (!opportunity) {
          return res.status(404).json({ message: 'Opportunity not found' });
        }
        if (opportunity.createdBy !== user!.id) {
          return res.status(403).json({ message: 'You can only edit opportunities you created' });
        }
      }

      const updateData = req.body;

      // Tier 1+2: Track statusChangedAt and append to statusHistory when status changes
      if (updateData.status) {
        const existing = await storage.getOpportunity(opportunityId);
        if (existing && existing.status !== updateData.status) {
          updateData.statusChangedAt = new Date();
          const history = Array.isArray(existing.statusHistory) ? [...existing.statusHistory] : [];
          history.push({
            status: updateData.status,
            changedAt: new Date().toISOString(),
            changedBy: req.session.userId,
          });
          updateData.statusHistory = history;
        }
      }

      const updatedOpportunity = await storage.updateOpportunity(opportunityId, updateData);

      if (!updatedOpportunity) {
        return res.status(404).json({ message: 'Opportunity not found' });
      }

      res.status(200).json(updatedOpportunity);
    } catch (error) {
      console.error('Error updating opportunity:', error);

      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }

      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete an opportunity
  app.delete('/api/opportunities/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const opportunityId = parseInt(req.params.id);
      
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: 'Invalid opportunity ID' });
      }
      
      const success = await storage.deleteOpportunity(opportunityId);
      
      if (!success) {
        return res.status(404).json({ message: 'Opportunity not found' });
      }
      
      res.status(200).json({ message: 'Opportunity deleted successfully' });
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== Public Inquiry Route (No Authentication Required) =====
  
  // Create opportunity from public inquiry form
  app.post('/api/opportunities/public-inquiry', async (req: Request, res: Response) => {
    try {
      // Define schema for public inquiry data
      const publicInquirySchema = z.object({
        // Required contact information
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Valid email address is required"),
        phone: z.string().optional(),
        
        // Required event information
        eventType: z.string().min(1, "Event type is required"),
        eventDate: z.string().optional().nullable().transform(date => date ? new Date(date) : null),
        guestCount: z.coerce.number().int().positive().optional().nullable(),
        venue: z.string().optional(),
        
        // Optional details
        notes: z.string().optional(),
        
        // Form metadata
        formId: z.number().optional(), // Which form was submitted
        formVersion: z.number().optional().default(1),
        source: z.string().optional().default("website"), // Track where inquiry came from
        
        // Detailed form responses for historical record
        formResponses: z.array(z.object({
          questionId: z.number(),
          questionKey: z.string(),
          answer: z.any()
        })).optional()
      });

      const inquiryData = publicInquirySchema.parse(req.body);
      
      // Create the opportunity with appropriate defaults for public inquiries
      const opportunityData = {
        firstName: inquiryData.firstName,
        lastName: inquiryData.lastName,
        email: inquiryData.email,
        phone: inquiryData.phone || null,
        eventType: inquiryData.eventType,
        eventDate: inquiryData.eventDate,
        guestCount: inquiryData.guestCount || null,
        venue: inquiryData.venue || null,
        notes: inquiryData.notes || null,
        status: "new" as const,
        opportunitySource: inquiryData.source,
        priority: "medium" as const,
        assignedTo: null
      };

      // Create the opportunity
      const newOpportunity = await storage.createOpportunity(opportunityData);

      // Return success response with opportunity ID
      res.status(201).json({
        message: 'Inquiry received successfully',
        opportunityId: newOpportunity.id,
        status: 'success'
      });
      
    } catch (error) {
      console.error('Error processing public inquiry:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Invalid inquiry data', 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      res.status(500).json({ message: 'Server error processing inquiry' });
    }
  });
  
  // ===== Send Inquiry to Customer (from Opportunity) =====

  app.post('/api/opportunities/:id/send-inquiry', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const oppId = parseInt(req.params.id);
      if (isNaN(oppId)) return res.status(400).json({ message: 'Invalid opportunity ID' });

      const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, oppId));
      if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

      const token = opp.inquiryToken || randomBytes(24).toString('base64url');
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const inquiryUrl = `${proto}://${host}/request-quote?opp=${token}`;

      await db.update(opportunities).set({
        inquiryToken: token,
        inquirySentAt: new Date(),
        status: opp.status === 'new' ? 'contacted' : opp.status,
        updatedAt: new Date(),
      }).where(eq(opportunities.id, oppId));

      const template = inquiryInvitationEmail({
        customerFirstName: opp.firstName,
        eventType: opp.eventType,
        eventDate: opp.eventDate,
        inquiryUrl,
      });
      sendEmailInBackground({
        to: opp.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        templateKey: 'inquiry_invitation',
      });

      return res.json({ message: 'Inquiry sent', inquiryUrl, token });
    } catch (error) {
      console.error('Error sending inquiry:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Get inquiry status for an opportunity (sent, opened, submitted)
  app.get('/api/opportunities/:id/inquiry-status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const oppId = parseInt(req.params.id);
      if (isNaN(oppId)) return res.status(400).json({ message: 'Invalid opportunity ID' });

      const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, oppId));
      if (!opp) return res.status(404).json({ message: 'Not found' });

      const linkedInquiries = await db.select().from(quoteRequests).where(eq(quoteRequests.opportunityId, oppId));
      const inquiry = linkedInquiries[0] || null;

      return res.json({
        sent: !!opp.inquirySentAt,
        sentAt: opp.inquirySentAt,
        opened: !!opp.inquiryViewedAt,
        openedAt: opp.inquiryViewedAt,
        submitted: !!inquiry,
        submittedAt: inquiry?.submittedAt || null,
        inquiryId: inquiry?.id || null,
        inquiryStatus: inquiry?.status || null,
      });
    } catch (error) {
      console.error('Error fetching inquiry status:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Public endpoint: fetch opportunity basics for pre-filling the inquiry form
  app.get('/api/public/opportunity/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const [opp] = await db.select().from(opportunities).where(eq(opportunities.inquiryToken, token));
      if (!opp) return res.status(404).json({ message: 'Not found' });

      if (!opp.inquiryViewedAt) {
        await db.update(opportunities).set({ inquiryViewedAt: new Date() }).where(eq(opportunities.id, opp.id));
      }

      return res.json({
        opportunityId: opp.id,
        firstName: opp.firstName,
        lastName: opp.lastName,
        email: opp.email,
        phone: opp.phone,
        eventType: opp.eventType,
        eventDate: opp.eventDate,
        guestCount: opp.guestCount,
        venue: opp.venue,
      });
    } catch (error) {
      console.error('Error fetching public opportunity:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== Menu Items Routes =====

  // Get all menu items
  app.get('/api/menu-items', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const menuItems = await storage.listMenuItems();

      // Filter financial data for non-admin users
      const user = await storage.getUser(req.session.userId!);
      const filteredItems = filterMenuItems(menuItems, user!.role);

      res.status(200).json(filteredItems);
    } catch (error) {
      console.error('Error getting menu items:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific menu item
  app.get('/api/menu-items/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const menuItemId = req.params.id; // Accept both string and numeric IDs
      console.log('Getting menu item with ID:', menuItemId, 'Type:', typeof menuItemId);
      
      if (!menuItemId) {
        console.log('Missing menu item ID');
        return res.status(400).json({ message: 'Invalid menu item ID' });
      }
      
      const menuItem = await storage.getMenuItem(menuItemId);
      console.log('Found menu item:', menuItem ? 'YES' : 'NO');
      
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
      
      // Debug: Log the price value and its type
      console.log('Menu item price before sending:', menuItem.price, 'Type:', typeof menuItem.price);
      
      // Ensure price is properly converted to number if it exists
      const responseItem = {
        ...menuItem,
        price: menuItem.price ? parseFloat(menuItem.price.toString()) : menuItem.price,
        upcharge: menuItem.upcharge ? parseFloat(menuItem.upcharge.toString()) : menuItem.upcharge,
      };

      console.log('Menu item price after conversion:', responseItem.price, 'Type:', typeof responseItem.price);

      // Filter financial data for non-admin users
      const user = await storage.getUser(req.session.userId!);
      const filtered = filterMenuItem(responseItem, user!.role);

      res.status(200).json(filtered);
    } catch (error) {
      console.error('Error getting menu item:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new menu item
  app.post('/api/menu-items', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const menuItemData = insertMenuItemSchema.parse(req.body);
      
      const newMenuItem = await storage.createMenuItem(menuItemData);
      
      res.status(201).json(newMenuItem);
    } catch (error) {
      console.error('Error creating menu item:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update a menu item
  app.patch('/api/menu-items/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const menuItemId = req.params.id; // Accept both string and numeric IDs
      
      if (!menuItemId) {
        return res.status(400).json({ message: 'Invalid menu item ID' });
      }
      
      const updateData = req.body;
      
      const updatedMenuItem = await storage.updateMenuItem(menuItemId, updateData);
      
      if (!updatedMenuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
      
      res.status(200).json(updatedMenuItem);
    } catch (error) {
      console.error('Error updating menu item:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a menu item
  app.delete('/api/menu-items/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const menuItemId = req.params.id; // Accept both string and numeric IDs
      
      if (!menuItemId) {
        return res.status(400).json({ message: 'Invalid menu item ID' });
      }
      
      const success = await storage.deleteMenuItem(menuItemId);
      
      if (!success) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
      
      res.status(200).json({ message: 'Menu item deleted successfully' });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ===== Menus Routes =====
  
  // Get all menus
  app.get('/api/menus', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const menus = await storage.listMenus();
      
      res.status(200).json(menus);
    } catch (error) {
      console.error('Error getting menus:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific menu
  app.get('/api/menus/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const menuId = parseInt(req.params.id);
      
      if (isNaN(menuId)) {
        return res.status(400).json({ message: 'Invalid menu ID' });
      }
      
      const menu = await storage.getMenu(menuId);
      
      if (!menu) {
        return res.status(404).json({ message: 'Menu not found' });
      }
      
      res.status(200).json(menu);
    } catch (error) {
      console.error('Error getting menu:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new menu (now uses recipes instead of menu items)
  app.post('/api/menus', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      console.log('Menu creation request body:', JSON.stringify(req.body, null, 2));
      
      // Parse the incoming menu data with the new recipe-based schema
      const menuData = insertMenuSchema.parse(req.body);
      
      const newMenu = await storage.createMenu(menuData);
      
      res.status(201).json(newMenu);
    } catch (error) {
      console.error('Error creating menu:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update a menu
  app.patch('/api/menus/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const menuId = parseInt(req.params.id);
      
      if (isNaN(menuId)) {
        return res.status(400).json({ message: 'Invalid menu ID' });
      }
      
      console.log('Menu update request body:', JSON.stringify(req.body, null, 2));
      
      // Parse and validate the incoming menu data
      const updateData = insertMenuSchema.partial().parse(req.body);
      
      // Serialize recipes array to JSON if present
      const dataToStore: any = {
        ...updateData,
      };
      
      if (updateData.recipes) {
        dataToStore.recipes = JSON.stringify(updateData.recipes);
      }
      
      const updatedMenu = await storage.updateMenu(menuId, dataToStore);
      
      if (!updatedMenu) {
        return res.status(404).json({ message: 'Menu not found' });
      }
      
      res.status(200).json(updatedMenu);
    } catch (error) {
      console.error('Error updating menu:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error', error: String(error) });
    }
  });
  
  // Delete a menu
  app.delete('/api/menus/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const menuId = parseInt(req.params.id);
      
      if (isNaN(menuId)) {
        return res.status(400).json({ message: 'Invalid menu ID' });
      }
      
      const success = await storage.deleteMenu(menuId);
      
      if (!success) {
        return res.status(404).json({ message: 'Menu not found' });
      }
      
      res.status(200).json({ message: 'Menu deleted successfully' });
    } catch (error) {
      console.error('Error deleting menu:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ===== Clients Routes =====
  
  // Get all clients
  app.get('/api/clients', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clients = await storage.listClients();
      
      res.status(200).json(clients);
    } catch (error) {
      console.error('Error getting clients:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific client
  app.get('/api/clients/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      res.status(200).json(client);
    } catch (error) {
      console.error('Error getting client:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new client
  app.post('/api/clients', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      
      const newClient = await storage.createClient(clientData);
      
      res.status(201).json(newClient);
    } catch (error) {
      console.error('Error creating client:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update a client
  app.patch('/api/clients/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      const updateData = req.body;
      
      const updatedClient = await storage.updateClient(clientId, updateData);
      
      if (!updatedClient) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      res.status(200).json(updatedClient);
    } catch (error) {
      console.error('Error updating client:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a client
  app.delete('/api/clients/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      const success = await storage.deleteClient(clientId);
      
      if (!success) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ===== Estimates Routes =====
  
  // Get all estimates
  app.get('/api/estimates', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const estimates = await storage.listEstimates();

      // Filter financial data for non-admin users
      const user = await storage.getUser(req.session.userId!);
      const filtered = filterEstimates(estimates, user!.role);

      res.status(200).json(filtered);
    } catch (error) {
      console.error('Error getting estimates:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific estimate
  app.get('/api/estimates/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      
      if (isNaN(estimateId)) {
        return res.status(400).json({ message: 'Invalid estimate ID' });
      }
      
      const estimate = await storage.getEstimate(estimateId);

      if (!estimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }

      // Filter financial data for non-admin users
      const user = await storage.getUser(req.session.userId!);
      const filtered = filterEstimate(estimate, user!.role);

      res.status(200).json(filtered);
    } catch (error) {
      console.error('Error getting estimate:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Admin preview of the customer-facing quote page. Returns the same
  // { estimate, client, proposal } shape as the public token endpoint so the
  // admin UI can render the identical QuoteProposalView component. Auth-gated
  // to any logged-in user; no view token required.
  app.get('/api/estimates/:id/preview', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      if (isNaN(estimateId)) {
        return res.status(400).json({ message: 'Invalid estimate ID' });
      }

      const [estimate] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
      if (!estimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }

      const [client] = await db.select().from(clients).where(eq(clients.id, estimate.clientId));
      const proposal = await resolveProposalForEstimate(estimate, client ?? null);

      return res.status(200).json({
        estimate: sanitizeEstimateForPublic(estimate),
        client: client ? sanitizeClientForPublic(client) : null,
        proposal,
      });
    } catch (error) {
      console.error('Error fetching estimate preview:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Tier 3: Admin PDF download
  app.get('/api/estimates/:id/pdf', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      if (isNaN(estimateId)) return res.status(400).json({ message: 'Invalid estimate ID' });

      const [estimate] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
      if (!estimate) return res.status(404).json({ message: 'Estimate not found' });
      if (!estimate.proposal) return res.status(400).json({ message: 'No proposal to generate PDF from' });

      const [client] = await db.select().from(clients).where(eq(clients.id, estimate.clientId));
      const { generateQuotePDF } = await import('./services/pdfGenerator');
      const pdf = await generateQuotePDF(estimate.proposal as any, estimate, client);

      const lastName = client?.lastName || 'Quote';
      const dateStr = estimate.eventDate ? new Date(estimate.eventDate).toISOString().split('T')[0] : 'undated';
      const filename = `HomeBites-Quote-${lastName}-${dateStr}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdf);
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // Admin: save just the proposal blob for an estimate. Used by the customize
  // drawer. Separate from the generic PATCH to avoid tangling with the legacy
  // EstimateForm's line-item-focused save path.
  app.patch('/api/estimates/:id/proposal', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      if (isNaN(estimateId)) {
        return res.status(400).json({ message: 'Invalid estimate ID' });
      }

      const proposal = req.body.proposal ?? req.body;
      const changeNote = req.body.changeNote as string | undefined;

      if (!proposal || typeof proposal !== 'object' || proposal.version !== 1) {
        return res.status(400).json({ message: 'Invalid proposal payload' });
      }

      // Tier 3: Snapshot current version before overwriting
      const [existing] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
      if (!existing) {
        return res.status(404).json({ message: 'Estimate not found' });
      }

      if (existing.proposal) {
        await storage.createEstimateVersion({
          estimateId,
          version: existing.currentVersion,
          proposal: existing.proposal,
          subtotalCents: existing.subtotal,
          taxCents: existing.tax,
          totalCents: existing.total,
          changeNote: changeNote || null,
          changedBy: req.session.userId || null,
        });
      }

      const nextVersion = (existing.currentVersion || 1) + 1;

      const [updated] = await db
        .update(estimates)
        .set({
          proposal: proposal as any,
          subtotal: proposal.pricing.subtotalCents,
          tax: proposal.pricing.taxCents,
          total: proposal.pricing.totalCents,
          guestCount: proposal.guestCount ?? null,
          eventDate: proposal.eventDate ? new Date(proposal.eventDate) : null,
          venue: proposal.venue?.name ?? null,
          venueAddress: proposal.venue?.street ?? null,
          venueCity: proposal.venue?.city ?? null,
          venueZip: proposal.venue?.zip ?? null,
          notes: proposal.customerNotes ?? null,
          currentVersion: nextVersion,
          updatedAt: new Date(),
        })
        .where(eq(estimates.id, estimateId))
        .returning();

      return res.status(200).json({
        estimate: sanitizeEstimateForPublic(updated),
        proposal: updated.proposal,
        version: nextVersion,
      });
    } catch (error) {
      console.error('Error updating proposal:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Tier 3: Get version history for an estimate
  app.get('/api/estimates/:id/versions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      if (isNaN(estimateId)) return res.status(400).json({ message: 'Invalid estimate ID' });

      const versions = await storage.getEstimateVersions(estimateId);
      const estimate = await storage.getEstimate(estimateId);

      res.status(200).json({
        currentVersion: estimate?.currentVersion || 1,
        versions,
      });
    } catch (error) {
      console.error('Error getting estimate versions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create a new estimate
  app.post('/api/estimates', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const estimateData = insertEstimateSchema.parse(req.body);
      
      const newEstimate = await storage.createEstimate(estimateData);
      
      res.status(201).json(newEstimate);
    } catch (error) {
      console.error('Error creating estimate:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update an estimate
  app.patch('/api/estimates/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      
      if (isNaN(estimateId)) {
        return res.status(400).json({ message: 'Invalid estimate ID' });
      }
      
      const updateData = req.body;
      
      const updatedEstimate = await storage.updateEstimate(estimateId, updateData);
      
      if (!updatedEstimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }
      
      res.status(200).json(updatedEstimate);
    } catch (error) {
      console.error('Error updating estimate:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Accept an estimate — graduates the linked client from 'prospect' to 'customer'
  // and auto-creates a confirmed Event row so the chef has a prep surface the moment
  // the deal closes. Idempotent: if an event already exists for this estimate, we skip
  // the creation step and return the existing one.
  app.post('/api/estimates/:id/accept', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      if (isNaN(estimateId)) {
        return res.status(400).json({ message: 'Invalid estimate ID' });
      }

      const [estimate] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
      if (!estimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }

      const now = new Date();
      const [updatedEstimate] = await db
        .update(estimates)
        .set({ status: 'accepted', acceptedAt: now, updatedAt: now })
        .where(eq(estimates.id, estimateId))
        .returning();

      // Graduate the linked client from prospect → customer
      const [updatedClient] = await db
        .update(clients)
        .set({ type: 'customer', updatedAt: now })
        .where(eq(clients.id, estimate.clientId))
        .returning();

      // Auto-create (or fetch existing) Event row for this estimate
      const [existingEvent] = await db.select().from(events).where(eq(events.estimateId, estimateId));
      let createdEvent = existingEvent ?? null;

      if (!existingEvent) {
        // Find the originating quote request so we can use its time/venue details
        const [originatingQuote] = await db
          .select()
          .from(quoteRequests)
          .where(eq(quoteRequests.estimateId, estimateId));

        // Compose start/end timestamps. Quote request stores them as text ("14:00") — combine
        // with the event date to get real timestamps. Fall back to noon + 4h if missing.
        const eventDate = estimate.eventDate ?? now;
        const composeTime = (base: Date, hhmm?: string | null, fallbackHours: number = 12): Date => {
          const d = new Date(base);
          if (hhmm && /^\d{1,2}:\d{2}/.test(hhmm)) {
            const [h, m] = hhmm.split(':').map((p) => parseInt(p, 10));
            d.setHours(h, m || 0, 0, 0);
          } else {
            d.setHours(fallbackHours, 0, 0, 0);
          }
          return d;
        };
        const startTime = composeTime(eventDate, originatingQuote?.eventStartTime, 12);
        const endTime = composeTime(eventDate, originatingQuote?.eventEndTime, 16);
        // If end ended up before start (missing endTime and default is less than explicit start),
        // push end to 4h after start.
        if (endTime.getTime() <= startTime.getTime()) {
          endTime.setTime(startTime.getTime() + 4 * 60 * 60 * 1000);
        }

        const venueText =
          estimate.venue ||
          originatingQuote?.venueName ||
          (originatingQuote?.venueAddress as any)?.street ||
          'Venue TBD';
        const guestCount = estimate.guestCount ?? originatingQuote?.guestCount ?? 1;

        [createdEvent] = await db
          .insert(events)
          .values({
            clientId: estimate.clientId,
            estimateId: estimate.id,
            eventDate,
            startTime,
            endTime,
            eventType: estimate.eventType,
            guestCount,
            venue: venueText,
            menuId: estimate.menuId ?? null,
            status: 'confirmed',
            notes: estimate.notes ?? null,
            completedTasks: [],
            viewToken: randomBytes(24).toString('base64url'),
          } as any)
          .returning();
      }

      return res.status(200).json({
        message: existingEvent
          ? 'Estimate re-accepted; existing event retained'
          : 'Estimate accepted; client graduated to customer and event created',
        estimate: updatedEstimate,
        client: updatedClient,
        event: createdEvent,
        eventAlreadyExisted: !!existingEvent,
      });
    } catch (error) {
      console.error('Error accepting estimate:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Send a quote to the customer — bumps status draft→sent, stamps sentAt,
  // lazily issues a viewToken (unguessable base64url) if one doesn't exist,
  // and (if RESEND_API_KEY is configured) fires an automated email with the
  // public URL. When Resend is not configured, the response still includes
  // publicUrl and the UI falls back to the mailto draft flow.
  app.post('/api/estimates/:id/send', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      if (isNaN(estimateId)) {
        return res.status(400).json({ message: 'Invalid estimate ID' });
      }

      const [estimate] = await db.select().from(estimates).where(eq(estimates.id, estimateId));
      if (!estimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }

      const now = new Date();
      const viewToken = estimate.viewToken || randomBytes(24).toString('base64url');

      const [updated] = await db
        .update(estimates)
        .set({
          status: 'sent',
          sentAt: estimate.sentAt ?? now,
          viewToken,
          updatedAt: now,
        })
        .where(eq(estimates.id, estimateId))
        .returning();

      // Build the public URL using the request's own origin so it works in any env
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || req.protocol;
      const publicUrl = `${proto}://${host}/quote/${viewToken}`;

      // Fetch the client so we can send the email
      const [client] = await db.select().from(clients).where(eq(clients.id, estimate.clientId));

      let emailSent = false;
      let emailSkipped = true;
      let emailRecipient: string | null = null;
      if (client?.email) {
        emailRecipient = client.email;
        const template = quoteSentEmail({
          customerFirstName: client.firstName || 'there',
          eventType: estimate.eventType,
          eventDate: estimate.eventDate,
          guestCount: estimate.guestCount,
          publicQuoteUrl: publicUrl,
        });
        const result = await sendEmail({
          to: client.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          clientId: client.id,
          templateKey: 'quote_sent',
        });
        emailSent = result.sent;
        emailSkipped = result.skipped;
      }

      return res.status(200).json({
        estimate: updated,
        publicUrl,
        emailSent,
        emailSkipped,
        emailRecipient,
      });
    } catch (error) {
      console.error('Error sending estimate:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Decline an estimate (admin-triggered — e.g. Mike declines on behalf of a customer
  // who responded by email instead of clicking the public link)
  app.post('/api/estimates/:id/decline', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      if (isNaN(estimateId)) {
        return res.status(400).json({ message: 'Invalid estimate ID' });
      }

      const now = new Date();
      const [updated] = await db
        .update(estimates)
        .set({
          status: 'declined',
          declinedAt: now,
          declinedReason: typeof req.body?.reason === 'string' ? req.body.reason : null,
          updatedAt: now,
        })
        .where(eq(estimates.id, estimateId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: 'Estimate not found' });
      }

      return res.status(200).json(updated);
    } catch (error) {
      console.error('Error declining estimate:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PUBLIC QUOTE ENDPOINTS — no authentication. Token-keyed. Only exposes
  // customer-facing fields; strips internal notes and any admin metadata.
  // ═══════════════════════════════════════════════════════════════════════

  // Sanitize a client row for public consumption — strip internal fields
  const sanitizeClientForPublic = (c: typeof clients.$inferSelect) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    company: c.company,
    address: c.address,
    city: c.city,
    state: c.state,
    zip: c.zip,
  });

  // Sanitize an estimate row for public consumption. Strips internal fields
  // like createdBy. Intentionally does NOT include the proposal blob — that's
  // returned as a separate top-level field on the response so the client
  // treats it as the source of truth for rendering.
  const sanitizeEstimateForPublic = (e: typeof estimates.$inferSelect) => ({
    id: e.id,
    eventType: e.eventType,
    eventDate: e.eventDate,
    guestCount: e.guestCount,
    venue: e.venue,
    venueAddress: e.venueAddress,
    venueCity: e.venueCity,
    venueZip: e.venueZip,
    items: e.items,
    additionalServices: e.additionalServices,
    subtotal: e.subtotal,
    tax: e.tax,
    total: e.total,
    status: e.status,
    notes: e.notes,
    expiresAt: e.expiresAt,
    sentAt: e.sentAt,
    viewedAt: e.viewedAt,
    acceptedAt: e.acceptedAt,
    declinedAt: e.declinedAt,
  });

  // Resolve (and lazily hydrate) the proposal for an estimate. New estimates
  // have estimate.proposal populated at creation time; legacy estimates don't,
  // so we fall back to building one from the originating quote_request (or
  // from the estimate alone if there isn't one) and persist the result so
  // subsequent reads are cheap and the admin can edit it.
  async function resolveProposalForEstimate(
    estimate: typeof estimates.$inferSelect,
    client: typeof clients.$inferSelect | null,
  ): Promise<Proposal> {
    if (estimate.proposal) {
      return estimate.proposal as Proposal;
    }

    const [originatingQuote] = await db
      .select()
      .from(quoteRequests)
      .where(eq(quoteRequests.estimateId, estimate.id));

    const proposal = originatingQuote
      ? buildProposalFromQuoteRequest(originatingQuote, estimate)
      : buildProposalFromEstimateAlone(estimate, client);

    // Persist so future reads (and admin edits) use the same blob.
    await db
      .update(estimates)
      .set({ proposal: proposal as any, updatedAt: new Date() })
      .where(eq(estimates.id, estimate.id));

    return proposal;
  }

  // Public: fetch a quote by its view token.
  //
  // Tier 3: Public PDF download by token (no auth — customer can download their quote)
  app.get('/api/public/quote/:token/pdf', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      if (!token || token.length < 10) return res.status(400).json({ message: 'Invalid token' });

      const [estimate] = await db.select().from(estimates).where(eq(estimates.viewToken, token));
      if (!estimate) return res.status(404).json({ message: 'Quote not found' });
      if (!estimate.proposal) return res.status(400).json({ message: 'No proposal available' });

      const [client] = await db.select().from(clients).where(eq(clients.id, estimate.clientId));
      const { generateQuotePDF } = await import('./services/pdfGenerator');
      const pdf = await generateQuotePDF(estimate.proposal as any, estimate, client);

      const lastName = client?.lastName || 'Quote';
      const dateStr = estimate.eventDate ? new Date(estimate.eventDate).toISOString().split('T')[0] : 'undated';
      const filename = `HomeBites-Quote-${lastName}-${dateStr}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdf);
    } catch (error) {
      console.error('Error generating public PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // Returns the Proposal blob stored on estimate.proposal — this is the
  // single source of truth for the customer-facing page.
  app.get('/api/public/quote/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      if (!token || token.length < 10) {
        return res.status(400).json({ message: 'Invalid token' });
      }

      const [estimate] = await db.select().from(estimates).where(eq(estimates.viewToken, token));
      if (!estimate) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      const [client] = await db.select().from(clients).where(eq(clients.id, estimate.clientId));
      const proposal = await resolveProposalForEstimate(estimate, client ?? null);

      return res.status(200).json({
        estimate: sanitizeEstimateForPublic(estimate),
        client: client ? sanitizeClientForPublic(client) : null,
        proposal,
      });
    } catch (error) {
      console.error('Error fetching public quote:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: stamp viewedAt the first time the customer opens the quote.
  // Also fires a one-shot admin notification (fire-and-forget) so Mike knows
  // the customer engaged with the quote.
  app.post('/api/public/quote/:token/view', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const [estimate] = await db.select().from(estimates).where(eq(estimates.viewToken, token));
      if (!estimate) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      const isFirstView = !estimate.viewedAt;

      // First-view-wins: don't overwrite an existing viewedAt so we track the initial open time
      if (isFirstView) {
        await db
          .update(estimates)
          .set({ viewedAt: new Date(), updatedAt: new Date() })
          .where(eq(estimates.id, estimate.id));

        // Fire the admin notification in the background. Don't block the customer's page load.
        try {
          const [client] = await db.select().from(clients).where(eq(clients.id, estimate.clientId));
          const emailCfg = getEmailConfig();
          const adminQuoteUrl = `${emailCfg.publicBaseUrl}/estimates/${estimate.id}/view`;
          const template = quoteViewedAdminEmail({
            customerName: client ? `${client.firstName} ${client.lastName}` : 'A customer',
            eventType: estimate.eventType,
            eventDate: estimate.eventDate,
            totalCents: estimate.total,
            adminQuoteUrl,
          });
          sendEmailInBackground({
            to: emailCfg.adminNotificationEmail,
            subject: template.subject,
            html: template.html,
            text: template.text,
            clientId: estimate.clientId,
            templateKey: 'quote_viewed_admin',
          });
        } catch (notifyError) {
          console.warn('Failed to fire quote-viewed admin notification:', notifyError);
        }
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error stamping view:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: accept the quote — same downstream effect as the admin accept endpoint
  // (client graduates to customer, event is auto-created). Token-keyed so no auth needed.
  app.post('/api/public/quote/:token/accept', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const [estimate] = await db.select().from(estimates).where(eq(estimates.viewToken, token));
      if (!estimate) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      if (estimate.status === 'declined') {
        return res.status(400).json({ message: 'This quote has already been declined.' });
      }

      const now = new Date();
      const [updatedEstimate] = await db
        .update(estimates)
        .set({ status: 'accepted', acceptedAt: estimate.acceptedAt ?? now, updatedAt: now })
        .where(eq(estimates.id, estimate.id))
        .returning();

      // Graduate the client → customer
      await db
        .update(clients)
        .set({ type: 'customer', updatedAt: now })
        .where(eq(clients.id, estimate.clientId));

      // Auto-create an event if one doesn't already exist for this estimate
      const [existingEvent] = await db.select().from(events).where(eq(events.estimateId, estimate.id));
      if (!existingEvent) {
        const [originatingQuote] = await db
          .select()
          .from(quoteRequests)
          .where(eq(quoteRequests.estimateId, estimate.id));

        const eventDate = estimate.eventDate ?? now;
        const composeTime = (base: Date, hhmm?: string | null, fallbackHours: number = 12): Date => {
          const d = new Date(base);
          if (hhmm && /^\d{1,2}:\d{2}/.test(hhmm)) {
            const [h, m] = hhmm.split(':').map((p) => parseInt(p, 10));
            d.setHours(h, m || 0, 0, 0);
          } else {
            d.setHours(fallbackHours, 0, 0, 0);
          }
          return d;
        };
        const startTime = composeTime(eventDate, originatingQuote?.eventStartTime, 12);
        const endTime = composeTime(eventDate, originatingQuote?.eventEndTime, 16);
        if (endTime.getTime() <= startTime.getTime()) {
          endTime.setTime(startTime.getTime() + 4 * 60 * 60 * 1000);
        }

        await db.insert(events).values({
          clientId: estimate.clientId,
          estimateId: estimate.id,
          eventDate,
          startTime,
          endTime,
          eventType: estimate.eventType,
          guestCount: estimate.guestCount ?? originatingQuote?.guestCount ?? 1,
          venue: estimate.venue || originatingQuote?.venueName || 'Venue TBD',
          menuId: estimate.menuId ?? null,
          status: 'confirmed',
          notes: estimate.notes ?? null,
          completedTasks: [],
          viewToken: randomBytes(24).toString('base64url'),
        } as any);
      }

      // Find the event (freshly created or pre-existing) so we can return the public URL
      const [eventForResponse] = await db
        .select()
        .from(events)
        .where(eq(events.estimateId, estimate.id));

      // Compose the customer event URL from the request origin
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || req.protocol;
      const eventPublicUrl = eventForResponse?.viewToken
        ? `${proto}://${host}/event/${eventForResponse.viewToken}`
        : null;

      // Fire customer + admin notifications. Fire-and-forget so the customer's
      // response isn't delayed by email latency.
      try {
        const [acceptingClient] = await db.select().from(clients).where(eq(clients.id, estimate.clientId));
        if (acceptingClient?.email) {
          const customerTemplate = quoteAcceptedCustomerEmail({
            customerFirstName: acceptingClient.firstName || 'there',
            eventType: estimate.eventType,
            eventDate: estimate.eventDate,
            publicEventUrl: eventPublicUrl,
          });
          sendEmailInBackground({
            to: acceptingClient.email,
            subject: customerTemplate.subject,
            html: customerTemplate.html,
            text: customerTemplate.text,
            clientId: acceptingClient.id,
            eventId: eventForResponse?.id ?? null,
            templateKey: 'quote_accepted_customer',
          });
        }

        const emailCfg = getEmailConfig();
        const adminEventUrl = eventForResponse?.id
          ? `${emailCfg.publicBaseUrl}/events/${eventForResponse.id}`
          : `${emailCfg.publicBaseUrl}/events`;
        const adminTemplate = quoteAcceptedAdminEmail({
          customerName: acceptingClient
            ? `${acceptingClient.firstName} ${acceptingClient.lastName}`
            : 'A customer',
          customerEmail: acceptingClient?.email || 'unknown',
          eventType: estimate.eventType,
          eventDate: estimate.eventDate,
          totalCents: estimate.total,
          adminEventUrl,
        });
        sendEmailInBackground({
          to: emailCfg.adminNotificationEmail,
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          text: adminTemplate.text,
          clientId: estimate.clientId,
          eventId: eventForResponse?.id ?? null,
          templateKey: 'quote_accepted_admin',
        });
      } catch (notifyError) {
        console.warn('Failed to fire quote-accepted notifications:', notifyError);
      }

      return res.status(200).json({
        ok: true,
        estimate: sanitizeEstimateForPublic(updatedEstimate),
        eventPublicUrl,
      });
    } catch (error) {
      console.error('Error accepting public quote:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: decline the quote with an optional reason
  app.post('/api/public/quote/:token/decline', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const [estimate] = await db.select().from(estimates).where(eq(estimates.viewToken, token));
      if (!estimate) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      if (estimate.status === 'accepted') {
        return res.status(400).json({ message: 'This quote has already been accepted.' });
      }

      const now = new Date();
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : null;

      const [updated] = await db
        .update(estimates)
        .set({
          status: 'declined',
          declinedAt: now,
          declinedReason: reason,
          updatedAt: now,
        })
        .where(eq(estimates.id, estimate.id))
        .returning();

      return res.status(200).json({
        ok: true,
        estimate: sanitizeEstimateForPublic(updated),
      });
    } catch (error) {
      console.error('Error declining public quote:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin: generate (or fetch existing) the customer-facing event page URL.
  // Lazy-issues a viewToken if the event doesn't have one yet (heals old events
  // that were created before tokens existed).
  app.post('/api/events/:id/share', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }

      const [event] = await db.select().from(events).where(eq(events.id, eventId));
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const viewToken = event.viewToken || randomBytes(24).toString('base64url');
      if (!event.viewToken) {
        await db
          .update(events)
          .set({ viewToken, updatedAt: new Date() })
          .where(eq(events.id, eventId));
      }

      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || req.protocol;
      const publicUrl = `${proto}://${host}/event/${viewToken}`;

      return res.status(200).json({ publicUrl, viewToken });
    } catch (error) {
      console.error('Error sharing event:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Scheduled reminder dispatcher — designed to be invoked by a cron job
  // (Railway cron or any external scheduler) once a day around 8am local time.
  // Protected by the CRON_SECRET env var passed in the x-cron-secret header;
  // if CRON_SECRET is not set, the endpoint responds 503 to avoid silent access.
  //
  // Iterates all confirmed events, computes days until each, and sends the
  // appropriate reminder template (14d / 7d / 2d / day_of / thank_you). Dedupes
  // via events.completedTasks using reserved keys like `reminder:14d`, so the
  // endpoint is idempotent — hitting it twice a day is fine.
  app.post('/api/cron/event-reminders', async (req: Request, res: Response) => {
    try {
      const emailCfg = getEmailConfig();
      if (!emailCfg.cronSecret) {
        return res.status(503).json({ message: 'CRON_SECRET not configured' });
      }
      const supplied = req.get('x-cron-secret');
      if (supplied !== emailCfg.cronSecret) {
        return res.status(403).json({ message: 'Invalid cron secret' });
      }

      const allEvents = await db.select().from(events);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const results: Array<{ eventId: number; sent: ReminderKind[]; skipped: string[] }> = [];

      for (const ev of allEvents) {
        // Skip events that aren't in a state where reminders make sense.
        if (ev.status === 'cancelled') {
          results.push({ eventId: ev.id, sent: [], skipped: ['cancelled'] });
          continue;
        }

        const eventDay = new Date(ev.eventDate);
        eventDay.setHours(0, 0, 0, 0);
        const daysUntil = Math.round(
          (eventDay.getTime() - now.getTime()) / 86400000
        );

        // Determine which reminder this event should receive today, if any.
        let kind: ReminderKind | null = null;
        if (daysUntil === 14) kind = '14d';
        else if (daysUntil === 7) kind = '7d';
        else if (daysUntil === 2) kind = '2d';
        else if (daysUntil === 0) kind = 'day_of';
        else if (daysUntil === -1) kind = 'thank_you';

        if (!kind) {
          results.push({ eventId: ev.id, sent: [], skipped: [`no_match_${daysUntil}d`] });
          continue;
        }

        const dedupKey = `reminder:${kind}`;
        const completed = Array.isArray(ev.completedTasks) ? (ev.completedTasks as string[]) : [];
        if (completed.includes(dedupKey)) {
          results.push({ eventId: ev.id, sent: [], skipped: [`already_sent_${kind}`] });
          continue;
        }

        // Fetch the client for the email
        const [client] = await db.select().from(clients).where(eq(clients.id, ev.clientId));
        if (!client?.email) {
          results.push({ eventId: ev.id, sent: [], skipped: ['no_client_email'] });
          continue;
        }

        const publicEventUrl = ev.viewToken
          ? `${emailCfg.publicBaseUrl}/event/${ev.viewToken}`
          : null;

        const template = eventReminderEmail({
          kind,
          customerFirstName: client.firstName || 'there',
          eventType: ev.eventType,
          eventDate: ev.eventDate,
          guestCount: ev.guestCount,
          publicEventUrl,
        });

        const result = await sendEmail({
          to: client.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          clientId: client.id,
          eventId: ev.id,
          templateKey: `event_reminder_${kind}`,
        });

        if (result.sent || result.skipped) {
          // Even if skipped (no API key), mark it so we don't retry forever once
          // Resend comes online — we don't want to suddenly blast 10 reminders
          // on the first day the key is added.
          await db
            .update(events)
            .set({
              completedTasks: [...completed, dedupKey],
              updatedAt: new Date(),
            })
            .where(eq(events.id, ev.id));
          results.push({ eventId: ev.id, sent: [kind], skipped: result.skipped ? ['no_resend_key'] : [] });
        } else {
          results.push({ eventId: ev.id, sent: [], skipped: [result.error || 'unknown_error'] });
        }
      }

      return res.status(200).json({ ok: true, results, processedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error running event reminder cron:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── Tier 1: Follow-Up Engine (creates DRAFTS only — never auto-sends) ──────
  // Scans for stalled opportunities and estimates, creates follow-up email drafts
  // in the follow_up_drafts table. Admin reviews and sends each draft manually.
  // Intended to run daily via Railway cron or external scheduler.
  app.post('/api/cron/follow-up-engine', async (req: Request, res: Response) => {
    try {
      const emailCfg = getEmailConfig();
      if (!emailCfg.cronSecret) {
        return res.status(503).json({ message: 'CRON_SECRET not configured' });
      }
      const supplied = req.get('x-cron-secret');
      if (supplied !== emailCfg.cronSecret) {
        return res.status(401).json({ message: 'Invalid cron secret' });
      }

      const now = new Date();
      const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
      const MIN_FOLLOW_UP_GAP_MS = TWO_DAYS_MS; // Don't ping same person more than once per 48h
      const created: number[] = [];

      const config = getSiteConfig();
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
      const host = req.get('host') || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;

      // 1. Inquiry sent but not opened (48h+ since sent, inquiryViewedAt null)
      const allOpps = await storage.listOpportunities();
      for (const opp of allOpps) {
        if (opp.status === 'archived' || opp.status === 'booked') continue;
        if (!opp.inquirySentAt || opp.inquiryViewedAt) continue;
        if (now.getTime() - new Date(opp.inquirySentAt).getTime() < TWO_DAYS_MS) continue;
        // Respect minimum follow-up gap
        if (opp.lastFollowUpAt && now.getTime() - new Date(opp.lastFollowUpAt).getTime() < MIN_FOLLOW_UP_GAP_MS) continue;

        // Check if we already have a pending draft for this type+opportunity
        const existingDrafts = await storage.getFollowUpDraftsForOpportunity(opp.id);
        if (existingDrafts.some(d => d.type === 'inquiry_not_opened' && (d.status === 'pending' || d.status === 'edited'))) continue;

        const inquiryUrl = `${baseUrl}/request-quote?opp=${opp.inquiryToken}`;
        const email = followUpInquiryNotOpened({
          customerFirstName: opp.firstName,
          eventType: opp.eventType,
          eventDate: opp.eventDate,
          inquiryUrl,
        });

        const draft = await storage.createFollowUpDraft({
          type: 'inquiry_not_opened',
          opportunityId: opp.id,
          recipientEmail: opp.email,
          recipientName: `${opp.firstName} ${opp.lastName}`,
          subject: email.subject,
          bodyHtml: email.html,
          bodyText: email.text,
          status: 'pending',
          triggerReason: `Inquiry sent ${Math.round((now.getTime() - new Date(opp.inquirySentAt).getTime()) / (24*60*60*1000))}d ago, not opened`,
        });
        created.push(draft.id);
      }

      // 2. Inquiry opened but not submitted (72h+ since viewed, no linked quoteRequest)
      for (const opp of allOpps) {
        if (opp.status === 'archived' || opp.status === 'booked') continue;
        if (!opp.inquiryViewedAt) continue;
        if (now.getTime() - new Date(opp.inquiryViewedAt).getTime() < THREE_DAYS_MS) continue;
        if (opp.lastFollowUpAt && now.getTime() - new Date(opp.lastFollowUpAt).getTime() < MIN_FOLLOW_UP_GAP_MS) continue;

        // Check if they actually submitted a quote request
        const linkedQR = await db.select().from(quoteRequests).where(eq(quoteRequests.opportunityId, opp.id));
        if (linkedQR.length > 0) continue;

        const existingDrafts = await storage.getFollowUpDraftsForOpportunity(opp.id);
        if (existingDrafts.some(d => d.type === 'inquiry_not_submitted' && (d.status === 'pending' || d.status === 'edited'))) continue;

        const inquiryUrl = `${baseUrl}/request-quote?opp=${opp.inquiryToken}`;
        const email = followUpInquiryNotSubmitted({
          customerFirstName: opp.firstName,
          eventType: opp.eventType,
          eventDate: opp.eventDate,
          inquiryUrl,
        });

        const draft = await storage.createFollowUpDraft({
          type: 'inquiry_not_submitted',
          opportunityId: opp.id,
          recipientEmail: opp.email,
          recipientName: `${opp.firstName} ${opp.lastName}`,
          subject: email.subject,
          bodyHtml: email.html,
          bodyText: email.text,
          status: 'pending',
          triggerReason: `Inquiry opened ${Math.round((now.getTime() - new Date(opp.inquiryViewedAt).getTime()) / (24*60*60*1000))}d ago, not submitted`,
        });
        created.push(draft.id);
      }

      // 3. Quote sent but not viewed (48h+ since sentAt, viewedAt null)
      const allEstimates = await storage.listEstimates();
      for (const est of allEstimates) {
        if (est.status !== 'sent') continue;
        if (!est.sentAt || est.viewedAt) continue;
        if (now.getTime() - new Date(est.sentAt).getTime() < TWO_DAYS_MS) continue;
        if (!est.viewToken) continue;

        const existingDrafts = await storage.getFollowUpDraftsForEstimate(est.id);
        if (existingDrafts.some(d => d.type === 'quote_not_viewed' && (d.status === 'pending' || d.status === 'edited'))) continue;

        const client = await storage.getClient(est.clientId);
        if (!client) continue;

        const quoteUrl = `${baseUrl}/quote/${est.viewToken}`;
        const email = followUpQuoteNotViewed({
          customerFirstName: client.firstName,
          eventType: est.eventType,
          eventDate: est.eventDate,
          quoteUrl,
        });

        const draft = await storage.createFollowUpDraft({
          type: 'quote_not_viewed',
          estimateId: est.id,
          recipientEmail: client.email,
          recipientName: `${client.firstName} ${client.lastName}`,
          subject: email.subject,
          bodyHtml: email.html,
          bodyText: email.text,
          status: 'pending',
          triggerReason: `Quote sent ${Math.round((now.getTime() - new Date(est.sentAt).getTime()) / (24*60*60*1000))}d ago, not viewed`,
        });
        created.push(draft.id);
      }

      // 4. Quote viewed but no action (5d+ since viewedAt, status still 'viewed')
      for (const est of allEstimates) {
        if (est.status !== 'viewed') continue;
        if (!est.viewedAt) continue;
        if (now.getTime() - new Date(est.viewedAt).getTime() < FIVE_DAYS_MS) continue;
        if (!est.viewToken) continue;

        const existingDrafts = await storage.getFollowUpDraftsForEstimate(est.id);
        if (existingDrafts.some(d => d.type === 'quote_no_action' && (d.status === 'pending' || d.status === 'edited'))) continue;

        const client = await storage.getClient(est.clientId);
        if (!client) continue;

        const quoteUrl = `${baseUrl}/quote/${est.viewToken}`;
        const email = followUpQuoteNoAction({
          customerFirstName: client.firstName,
          eventType: est.eventType,
          eventDate: est.eventDate,
          quoteUrl,
        });

        const draft = await storage.createFollowUpDraft({
          type: 'quote_no_action',
          estimateId: est.id,
          recipientEmail: client.email,
          recipientName: `${client.firstName} ${client.lastName}`,
          subject: email.subject,
          bodyHtml: email.html,
          bodyText: email.text,
          status: 'pending',
          triggerReason: `Quote viewed ${Math.round((now.getTime() - new Date(est.viewedAt).getTime()) / (24*60*60*1000))}d ago, no action`,
        });
        created.push(draft.id);
      }

      // 5. Quote expiring within 3 days
      for (const est of allEstimates) {
        if (est.status === 'accepted' || est.status === 'declined') continue;
        if (!est.expiresAt || !est.viewToken) continue;
        const daysUntilExpiry = (new Date(est.expiresAt).getTime() - now.getTime()) / (24*60*60*1000);
        if (daysUntilExpiry < 0 || daysUntilExpiry > 3) continue;

        const existingDrafts = await storage.getFollowUpDraftsForEstimate(est.id);
        if (existingDrafts.some(d => d.type === 'quote_expiring_soon' && (d.status === 'pending' || d.status === 'edited'))) continue;

        const client = await storage.getClient(est.clientId);
        if (!client) continue;

        const quoteUrl = `${baseUrl}/quote/${est.viewToken}`;
        const email = followUpQuoteExpiringSoon({
          customerFirstName: client.firstName,
          eventType: est.eventType,
          quoteUrl,
          expiresAt: est.expiresAt,
        });

        const draft = await storage.createFollowUpDraft({
          type: 'quote_expiring_soon',
          estimateId: est.id,
          recipientEmail: client.email,
          recipientName: `${client.firstName} ${client.lastName}`,
          subject: email.subject,
          bodyHtml: email.html,
          bodyText: email.text,
          status: 'pending',
          triggerReason: `Quote expires in ${Math.round(daysUntilExpiry)} day(s)`,
        });
        created.push(draft.id);
      }

      return res.status(200).json({
        ok: true,
        draftsCreated: created.length,
        draftIds: created,
        processedAt: now.toISOString(),
      });
    } catch (error) {
      console.error('Error running follow-up engine cron:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── Tier 1: Follow-Up Draft Management (CRUD) ────────────────────────────

  // List follow-up drafts (optionally filter by status)
  app.get('/api/follow-up-drafts', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const drafts = status ? await storage.listFollowUpDrafts(status) : await storage.listFollowUpDrafts();
      res.status(200).json(drafts);
    } catch (error) {
      console.error('Error listing follow-up drafts:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get a single follow-up draft
  app.get('/api/follow-up-drafts/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const draft = await storage.getFollowUpDraft(parseInt(req.params.id));
      if (!draft) return res.status(404).json({ message: 'Draft not found' });
      res.status(200).json(draft);
    } catch (error) {
      console.error('Error getting follow-up draft:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update a follow-up draft (edit subject/body before sending)
  app.patch('/api/follow-up-drafts/:id', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const draftId = parseInt(req.params.id);
      const { subject, bodyHtml, bodyText, status } = req.body;

      const existing = await storage.getFollowUpDraft(draftId);
      if (!existing) return res.status(404).json({ message: 'Draft not found' });

      const updateData: Record<string, any> = {};
      if (subject !== undefined) updateData.subject = subject;
      if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
      if (bodyText !== undefined) updateData.bodyText = bodyText;
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'edited') updateData.reviewedBy = req.session.userId;
      }

      const updated = await storage.updateFollowUpDraft(draftId, updateData);
      res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating follow-up draft:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Send a follow-up draft (admin has reviewed and approved)
  app.post('/api/follow-up-drafts/:id/send', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const draftId = parseInt(req.params.id);
      const draft = await storage.getFollowUpDraft(draftId);
      if (!draft) return res.status(404).json({ message: 'Draft not found' });
      if (draft.status === 'sent') return res.status(400).json({ message: 'Draft already sent' });
      if (draft.status === 'cancelled') return res.status(400).json({ message: 'Draft was cancelled' });

      // Send the email
      const emailResult = await sendEmail({
        to: draft.recipientEmail,
        subject: draft.subject,
        html: draft.bodyHtml,
        text: draft.bodyText,
        templateKey: `follow_up_${draft.type}`,
        opportunityId: draft.opportunityId,
      });

      if (!emailResult.sent) {
        return res.status(500).json({ message: 'Failed to send email', error: emailResult.error });
      }

      // Mark draft as sent
      await storage.updateFollowUpDraft(draftId, {
        status: 'sent',
        sentAt: new Date(),
        reviewedBy: req.session.userId,
      });

      // Update lastFollowUpAt on the parent entity
      if (draft.opportunityId) {
        await storage.updateOpportunity(draft.opportunityId, { lastFollowUpAt: new Date() });
      }

      res.status(200).json({ message: 'Follow-up sent successfully' });
    } catch (error) {
      console.error('Error sending follow-up draft:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Cancel a follow-up draft
  app.post('/api/follow-up-drafts/:id/cancel', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const draftId = parseInt(req.params.id);
      const draft = await storage.getFollowUpDraft(draftId);
      if (!draft) return res.status(404).json({ message: 'Draft not found' });

      await storage.updateFollowUpDraft(draftId, {
        status: 'cancelled',
        reviewedBy: req.session.userId,
      });

      res.status(200).json({ message: 'Draft cancelled' });
    } catch (error) {
      console.error('Error cancelling follow-up draft:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete a follow-up draft
  app.delete('/api/follow-up-drafts/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteFollowUpDraft(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ message: 'Draft not found' });
      res.status(200).json({ message: 'Draft deleted' });
    } catch (error) {
      console.error('Error deleting follow-up draft:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: self-serve "find my event" — customer enters their email, we email
  // them the event page link for any accepted event we find. Always responds
  // with the same "if we found an event, we've sent the link" message to prevent
  // email enumeration.
  app.post('/api/public/find-my-event', async (req: Request, res: Response) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!email || !/.+@.+\..+/.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
      }

      // Find clients with this email. Then find any linked events.
      const matchingClients = await db.select().from(clients).where(eq(clients.email, email));
      const emailCfg = getEmailConfig();

      let sentAny = false;
      for (const c of matchingClients) {
        const clientEvents = await db.select().from(events).where(eq(events.clientId, c.id));
        for (const ev of clientEvents) {
          if (ev.status === 'cancelled') continue;
          if (!ev.viewToken) continue;
          const publicEventUrl = `${emailCfg.publicBaseUrl}/event/${ev.viewToken}`;
          const template = findMyEventEmail({
            customerFirstName: c.firstName || 'there',
            publicEventUrl,
          });
          sendEmailInBackground({
            to: c.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
            clientId: c.id,
            eventId: ev.id,
            templateKey: 'find_my_event',
          });
          sentAny = true;
        }
      }

      // Always respond the same way regardless of whether we found a match.
      // Don't leak which emails are in the system.
      return res.status(200).json({
        ok: true,
        message:
          "If we found an event for that email, we've sent the link. Please check your inbox (and spam folder) in the next few minutes.",
      });
    } catch (error) {
      console.error('Error in find-my-event:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── Tier 3: Client Portal Auth (magic-link) ────────────────────────────

  // Step 1: Customer requests a magic link. We find their client record by email
  // and send a login link. Same privacy pattern as find-my-event: same response
  // regardless of whether the email exists to prevent enumeration.
  app.post('/api/public/portal/request-link', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email is required' });
      }

      const allClients = await storage.listClients();
      const client = allClients.find(c => c.email.toLowerCase() === email.toLowerCase());

      if (client) {
        const { clientMagicLinks } = await import("@shared/schema");
        const token = randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

        await db.insert(clientMagicLinks).values({
          clientId: client.id,
          token,
          expiresAt,
        });

        const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
        const host = req.get('host') || 'localhost:5000';
        const portalUrl = `${protocol}://${host}/my-events?token=${token}`;

        // Send magic link email
        const config = getSiteConfig();
        sendEmailInBackground({
          to: client.email,
          subject: `Your ${config.businessName} event portal`,
          html: `<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2>Hi ${client.firstName},</h2>
            <p>Click below to access your event portal:</p>
            <p style="margin:24px 0;text-align:center;">
              <a href="${portalUrl}" style="display:inline-block;padding:12px 28px;background:#8B7355;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View My Events</a>
            </p>
            <p style="color:#666;font-size:13px;">This link expires in 30 minutes. If you didn't request this, you can safely ignore it.</p>
            <p style="color:#999;font-size:12px;">— ${config.businessName}</p>
          </div>`,
          text: `Hi ${client.firstName}, access your event portal: ${portalUrl} (expires in 30 min)`,
          templateKey: 'client_portal_magic_link',
        });
      }

      // Always same response
      res.status(200).json({ message: "If we found your account, we've sent a login link to your email." });
    } catch (error) {
      console.error('Error requesting portal link:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Step 2: Verify magic link token and issue a session
  app.post('/api/public/portal/verify', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: 'Token is required' });

      const { clientMagicLinks, clientSessions } = await import("@shared/schema");

      const [link] = await db.select().from(clientMagicLinks).where(eq(clientMagicLinks.token, token));
      if (!link) return res.status(401).json({ message: 'Invalid or expired link' });
      if (link.usedAt) return res.status(401).json({ message: 'This link has already been used' });
      if (new Date() > new Date(link.expiresAt)) return res.status(401).json({ message: 'Link has expired' });

      // Mark link as used
      await db.update(clientMagicLinks).set({ usedAt: new Date() }).where(eq(clientMagicLinks.id, link.id));

      // Issue session token (valid 7 days)
      const sessionToken = randomBytes(32).toString('base64url');
      const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.insert(clientSessions).values({
        clientId: link.clientId,
        token: sessionToken,
        expiresAt: sessionExpires,
      });

      const client = await storage.getClient(link.clientId);

      res.status(200).json({
        sessionToken,
        client: client ? { id: client.id, firstName: client.firstName, lastName: client.lastName, email: client.email } : null,
      });
    } catch (error) {
      console.error('Error verifying portal token:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Step 3: Get portal data (all events, estimates, preferences for the logged-in client)
  app.get('/api/public/portal/data', async (req: Request, res: Response) => {
    try {
      const authHeader = req.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });

      const sessionToken = authHeader.slice(7);
      const { clientSessions } = await import("@shared/schema");

      const [session] = await db.select().from(clientSessions).where(eq(clientSessions.token, sessionToken));
      if (!session) return res.status(401).json({ message: 'Invalid session' });
      if (new Date() > new Date(session.expiresAt)) return res.status(401).json({ message: 'Session expired' });

      const client = await storage.getClient(session.clientId);
      if (!client) return res.status(404).json({ message: 'Client not found' });

      // Get all events for this client
      const allEvents = await storage.listEvents();
      const clientEvents = allEvents
        .filter(e => e.clientId === client.id && e.status !== 'cancelled')
        .map(e => ({
          id: e.id,
          eventType: e.eventType,
          eventDate: e.eventDate,
          startTime: e.startTime,
          endTime: e.endTime,
          guestCount: e.guestCount,
          venue: e.venue,
          status: e.status,
          viewToken: e.viewToken,
        }));

      // Get all estimates for this client
      const allEstimates = await storage.listEstimates();
      const clientEstimates = allEstimates
        .filter(e => e.clientId === client.id)
        .map(e => ({
          id: e.id,
          eventType: e.eventType,
          eventDate: e.eventDate,
          guestCount: e.guestCount,
          venue: e.venue,
          status: e.status,
          total: e.total,
          viewToken: e.viewToken,
          sentAt: e.sentAt,
          acceptedAt: e.acceptedAt,
        }));

      res.status(200).json({
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          company: client.company,
          type: client.type,
        },
        events: clientEvents,
        estimates: clientEstimates,
      });
    } catch (error) {
      console.error('Error fetching portal data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: fetch the customer-facing event page payload by token.
  // Sanitized: strips internal notes, shopping list, prep schedule, AI analysis,
  // pricing internals, completed tasks, and admin metadata. Includes the site
  // config (chef info, brand, contact) so the client can render without another call.
  app.get('/api/public/event/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      if (!token || token.length < 10) {
        return res.status(400).json({ message: 'Invalid token' });
      }

      const [event] = await db.select().from(events).where(eq(events.viewToken, token));
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const [client] = await db.select().from(clients).where(eq(clients.id, event.clientId));

      let quoteRequest: typeof quoteRequests.$inferSelect | null = null;
      let estimate: typeof estimates.$inferSelect | null = null;
      if (event.estimateId) {
        const [e] = await db.select().from(estimates).where(eq(estimates.id, event.estimateId));
        estimate = e ?? null;
        const [qr] = await db
          .select()
          .from(quoteRequests)
          .where(eq(quoteRequests.estimateId, event.estimateId));
        quoteRequest = qr ?? null;
      }

      let menu: typeof menus.$inferSelect | null = null;
      if (event.menuId) {
        const [m] = await db.select().from(menus).where(eq(menus.id, event.menuId));
        menu = m ?? null;
      }

      // Public event payload: only the fields a customer should see.
      // Explicitly strip: internal notes, completed tasks, admin metadata, pricing.
      const publicEvent = {
        id: event.id,
        eventType: event.eventType,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        guestCount: event.guestCount,
        venue: event.venue,
        status: event.status,
      };

      const publicClient = client
        ? {
            firstName: client.firstName,
            lastName: client.lastName,
            company: client.company,
          }
        : null;

      const publicQuoteRequest = quoteRequest
        ? {
            partnerFirstName: quoteRequest.partnerFirstName,
            partnerLastName: quoteRequest.partnerLastName,
            menuTheme: quoteRequest.menuTheme,
            menuTier: quoteRequest.menuTier,
            menuSelections: quoteRequest.menuSelections,
            appetizers: quoteRequest.appetizers,
            desserts: quoteRequest.desserts,
            beverages: quoteRequest.beverages,
            dietary: quoteRequest.dietary,
            hasCocktailHour: quoteRequest.hasCocktailHour,
            cocktailStartTime: quoteRequest.cocktailStartTime,
            cocktailEndTime: quoteRequest.cocktailEndTime,
            mainMealStartTime: quoteRequest.mainMealStartTime,
            mainMealEndTime: quoteRequest.mainMealEndTime,
            specialRequests: quoteRequest.specialRequests,
            serviceStyle: quoteRequest.serviceStyle,
            // Link back to the quote page in case the customer wants to renegotiate
            quoteViewToken: estimate?.viewToken ?? null,
          }
        : null;

      const publicMenu = menu
        ? {
            name: menu.name,
            description: menu.description,
            themeKey: menu.themeKey,
          }
        : null;

      return res.status(200).json({
        event: publicEvent,
        client: publicClient,
        quoteRequest: publicQuoteRequest,
        menu: publicMenu,
        siteConfig: getSiteConfig(),
      });
    } catch (error) {
      console.error('Error fetching public event:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete an estimate
  app.delete('/api/estimates/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const estimateId = parseInt(req.params.id);
      
      if (isNaN(estimateId)) {
        return res.status(400).json({ message: 'Invalid estimate ID' });
      }
      
      const success = await storage.deleteEstimate(estimateId);
      
      if (!success) {
        return res.status(404).json({ message: 'Estimate not found' });
      }
      
      res.status(200).json({ message: 'Estimate deleted successfully' });
    } catch (error) {
      console.error('Error deleting estimate:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ===== Events Routes =====
  
  // Get all events
  app.get('/api/events', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const upcoming = req.query.upcoming === 'true';
      
      const events = upcoming 
        ? await storage.listUpcomingEvents()
        : await storage.listEvents();
      
      res.status(200).json(events);
    } catch (error) {
      console.error('Error getting events:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific event
  app.get('/api/events/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);

      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }

      const event = await storage.getEvent(eventId);

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.status(200).json(event);
    } catch (error) {
      console.error('Error getting event:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Event Command Center payload — returns everything the event detail page needs
  // in a single request: the event itself, its client, its estimate (with line items),
  // the originating quote request (menu selections, dietary, equipment, beverages,
  // appetizers, AI analysis), and the menu metadata. Any of the joined objects may be
  // null if the data isn't linked — the UI handles missing pieces gracefully.
  //
  // Role-based filtering: chefs never see the estimate object (it contains line-item
  // pricing and totals). They get all the operational data they need from quoteRequest
  // and event. This is defense-in-depth — the UI also hides these fields, but stripping
  // on the server means chefs can't craft requests to see pricing.
  app.get('/api/events/:id/full', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }

      const [event] = await db.select().from(events).where(eq(events.id, eventId));
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const [client] = await db.select().from(clients).where(eq(clients.id, event.clientId));

      let estimate: typeof estimates.$inferSelect | null = null;
      let quoteRequest: typeof quoteRequests.$inferSelect | null = null;
      if (event.estimateId) {
        const [e] = await db.select().from(estimates).where(eq(estimates.id, event.estimateId));
        estimate = e ?? null;
        const [qr] = await db
          .select()
          .from(quoteRequests)
          .where(eq(quoteRequests.estimateId, event.estimateId));
        quoteRequest = qr ?? null;
      }

      let menu: typeof menus.$inferSelect | null = null;
      if (event.menuId) {
        const [m] = await db.select().from(menus).where(eq(menus.id, event.menuId));
        menu = m ?? null;
      }

      // Strip financial data for non-admins. The events tab reads menu/dietary/
      // equipment from quoteRequest; estimate is only needed for pricing displays.
      const viewerRole = await getSessionRole(req);
      const canSeeFinancials = viewerRole === 'admin';

      return res.status(200).json({
        event,
        client: client ?? null,
        estimate: canSeeFinancials ? estimate : null,
        quoteRequest,
        menu,
      });
    } catch (error) {
      console.error('Error getting event full payload:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Toggle a single checklist item on an event. Body: { taskId: string, done: boolean }.
  // Keeps the event detail page responsive without sending the whole task list on every tick.
  app.patch('/api/events/:id/checklist', isAuthenticated, hasChefOrAboveWriteAccess, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }

      const { taskId, done } = req.body ?? {};
      if (typeof taskId !== 'string' || typeof done !== 'boolean') {
        return res.status(400).json({ message: 'Body must include { taskId: string, done: boolean }' });
      }

      const [event] = await db.select().from(events).where(eq(events.id, eventId));
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const current = Array.isArray(event.completedTasks) ? (event.completedTasks as string[]) : [];
      let next: string[];
      if (done) {
        next = current.includes(taskId) ? current : [...current, taskId];
      } else {
        next = current.filter((id) => id !== taskId);
      }

      const [updated] = await db
        .update(events)
        .set({ completedTasks: next, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning();

      return res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating event checklist:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Create a new event
  app.post('/api/events', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      
      const newEvent = await storage.createEvent(eventData);
      
      res.status(201).json(newEvent);
    } catch (error) {
      console.error('Error creating event:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update an event — chefs, users, and admins can all edit operational fields
  // (status, notes, completedTasks). Only admins can touch commercial fields
  // (clientId, estimateId, menuId, eventDate, venue, guestCount, startTime, endTime).
  // A chef submitting a commercial field gets it silently dropped from the update.
  app.patch('/api/events/:id', isAuthenticated, hasChefOrAboveWriteAccess, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }

      const role = await getSessionRole(req);
      const isAdmin = role === 'admin';

      // Field whitelist for non-admin operational writes
      const CHEF_ALLOWED_FIELDS = new Set(['status', 'notes', 'completedTasks']);
      // Chefs can't cancel an event (commercial implication — affects billing)
      const CHEF_ALLOWED_STATUSES = new Set(['confirmed', 'in_progress', 'completed']);

      let updateData: Record<string, unknown>;
      if (isAdmin) {
        updateData = req.body;
      } else {
        updateData = {};
        for (const [key, value] of Object.entries(req.body ?? {})) {
          if (CHEF_ALLOWED_FIELDS.has(key)) {
            if (key === 'status' && typeof value === 'string' && !CHEF_ALLOWED_STATUSES.has(value)) {
              // Silently skip status transitions the chef can't make
              continue;
            }
            updateData[key] = value;
          }
        }
        if (Object.keys(updateData).length === 0) {
          return res.status(403).json({
            message: 'Chefs can only update event status, notes, and checklist items.',
          });
        }
      }

      const updatedEvent = await storage.updateEvent(eventId, updateData as any);

      if (!updatedEvent) {
        return res.status(404).json({ message: 'Event not found' });
      }

      res.status(200).json(updatedEvent);
    } catch (error) {
      console.error('Error updating event:', error);

      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }

      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete an event
  app.delete('/api/events/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const success = await storage.deleteEvent(eventId);
      
      if (!success) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Error deleting event:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== Contact Identifiers Routes =====
  
  // Create a new contact identifier
  app.post('/api/contact-identifiers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertContactIdentifierSchema.parse(req.body);
      
      const result = await storage.createContactIdentifier(data);
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating contact identifier:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific contact identifier
  app.get('/api/contact-identifiers/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid contact identifier ID' });
      }
      
      const result = await storage.getContactIdentifier(id);
      
      if (!result) {
        return res.status(404).json({ message: 'Contact identifier not found' });
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting contact identifier:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get contact identifiers for an opportunity
  app.get('/api/opportunities/:id/contact-identifiers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const opportunityId = parseInt(req.params.id);
      
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: 'Invalid opportunity ID' });
      }
      
      const result = await storage.getContactIdentifiersForOpportunity(opportunityId);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting contact identifiers for opportunity:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get contact identifiers for a client
  app.get('/api/clients/:id/contact-identifiers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      const result = await storage.getContactIdentifiersForClient(clientId);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting contact identifiers for client:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a contact identifier
  app.delete('/api/contact-identifiers/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid contact identifier ID' });
      }
      
      const success = await storage.deleteContactIdentifier(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Contact identifier not found' });
      }
      
      res.status(200).json({ message: 'Contact identifier deleted successfully' });
    } catch (error) {
      console.error('Error deleting contact identifier:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ===== Communications Routes =====
  
  // Create a new communication
  app.post('/api/communications', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const data = insertCommunicationSchema.parse(req.body);
      
      // Set the user ID for tracking who created it
      const userId = req.session.userId;
      
      const result = await storage.createCommunication({
        ...data,
        userId
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating communication:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific communication
  app.get('/api/communications/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid communication ID' });
      }
      
      const result = await storage.getCommunication(id);
      
      if (!result) {
        return res.status(404).json({ message: 'Communication not found' });
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting communication:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get communications for an opportunity
  app.get('/api/opportunities/:id/communications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const opportunityId = parseInt(req.params.id);
      
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: 'Invalid opportunity ID' });
      }
      
      const result = await storage.getCommunicationsForOpportunity(opportunityId);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting communications for opportunity:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get communications for a client
  app.get('/api/clients/:id/communications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }
      
      const result = await storage.getCommunicationsForClient(clientId);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting communications for client:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get full email content from GCP Storage
  app.get('/api/communications/:id/full-email', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const communicationId = parseInt(req.params.id);
      
      if (isNaN(communicationId)) {
        return res.status(400).json({ message: 'Invalid communication ID' });
      }
      
      const communication = await storage.getCommunication(communicationId);
      
      if (!communication) {
        return res.status(404).json({ message: 'Communication not found' });
      }
      
      // Check if this is a Gmail email with storage
      if (!communication.gmailMessageId || !communication.gcpStoragePath) {
        return res.status(404).json({ 
          message: 'No full email content available. This communication is not a Gmail-synced email or does not have stored content.' 
        });
      }
      
      // Dynamically import GCP storage service and check if configured
      const { getEmailFromGCP, isGCPConfigured } = await import('./services/gcpStorageService');
      
      if (!isGCPConfigured()) {
        return res.status(503).json({ 
          message: 'GCP Storage is not configured. Cannot retrieve full email content.' 
        });
      }
      
      const fullEmailData = await getEmailFromGCP(communication.gcpStoragePath);
      
      res.status(200).json(fullEmailData);
    } catch (error) {
      console.error('Error getting full email content:', error);
      res.status(500).json({ 
        message: 'Failed to fetch full email content', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // ─── Tier 2, Item 8: Unified Contact Timeline ────────────────────────────
  // Aggregates all touchpoints across the funnel for a given email address.
  // Returns a chronological list of events: communications, status changes,
  // quote submissions, estimate sent/viewed/accepted, event milestones.
  app.get('/api/contacts/:email/timeline', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const email = decodeURIComponent(req.params.email).toLowerCase();
      const timeline: Array<{
        id: string;
        type: string; // communication, status_change, quote_submitted, estimate_sent, estimate_accepted, event_created
        timestamp: string;
        title: string;
        detail?: string;
        entityType?: string;
        entityId?: number;
        icon?: string; // email, call, sms, note, meeting, system
      }> = [];

      // 1. Communications linked to opportunities or clients with this email
      const allOpps = await storage.listOpportunities();
      const matchingOppIds = allOpps.filter(o => o.email.toLowerCase() === email).map(o => o.id);

      const allClients = await storage.listClients();
      const matchingClientIds = allClients.filter(c => c.email.toLowerCase() === email).map(c => c.id);

      // Collect communications from matching opportunities
      for (const oppId of matchingOppIds) {
        const comms = await storage.getCommunicationsForOpportunity(oppId);
        for (const c of comms) {
          timeline.push({
            id: `comm-${c.id}`,
            type: 'communication',
            timestamp: (c.timestamp || c.createdAt).toString(),
            title: c.subject || `${c.type} (${c.direction})`,
            detail: c.bodySummary || c.bodyRaw?.substring(0, 120) || undefined,
            entityType: 'opportunity',
            entityId: oppId,
            icon: c.type,
          });
        }

        // Add status history entries
        const opp = allOpps.find(o => o.id === oppId);
        if (opp?.statusHistory && Array.isArray(opp.statusHistory)) {
          for (const entry of opp.statusHistory as any[]) {
            timeline.push({
              id: `status-${oppId}-${entry.changedAt}`,
              type: 'status_change',
              timestamp: entry.changedAt,
              title: `Status changed to "${entry.status}"`,
              entityType: 'opportunity',
              entityId: oppId,
              icon: 'system',
            });
          }
        }

        // Inquiry sent/viewed milestones
        if (opp?.inquirySentAt) {
          timeline.push({
            id: `inquiry-sent-${oppId}`,
            type: 'system',
            timestamp: new Date(opp.inquirySentAt).toISOString(),
            title: 'Inquiry email sent to customer',
            entityType: 'opportunity',
            entityId: oppId,
            icon: 'system',
          });
        }
        if (opp?.inquiryViewedAt) {
          timeline.push({
            id: `inquiry-viewed-${oppId}`,
            type: 'system',
            timestamp: new Date(opp.inquiryViewedAt).toISOString(),
            title: 'Customer opened inquiry link',
            entityType: 'opportunity',
            entityId: oppId,
            icon: 'system',
          });
        }
      }

      // Collect communications from matching clients
      for (const clientId of matchingClientIds) {
        const comms = await storage.getCommunicationsForClient(clientId);
        for (const c of comms) {
          // Skip if already added via opportunity link
          if (timeline.some(t => t.id === `comm-${c.id}`)) continue;
          timeline.push({
            id: `comm-${c.id}`,
            type: 'communication',
            timestamp: (c.timestamp || c.createdAt).toString(),
            title: c.subject || `${c.type} (${c.direction})`,
            detail: c.bodySummary || c.bodyRaw?.substring(0, 120) || undefined,
            entityType: 'client',
            entityId: clientId,
            icon: c.type,
          });
        }
      }

      // 2. Quote request submissions
      const allQR = await db.select().from(quoteRequests);
      const matchingQR = allQR.filter(qr => qr.email?.toLowerCase() === email);
      for (const qr of matchingQR) {
        if (qr.submittedAt) {
          timeline.push({
            id: `qr-submitted-${qr.id}`,
            type: 'quote_submitted',
            timestamp: new Date(qr.submittedAt).toISOString(),
            title: `Quote request submitted (${qr.eventType})`,
            detail: qr.menuTheme ? `Menu: ${qr.menuTheme} ${qr.menuTier || ''}` : undefined,
            entityType: 'quoteRequest',
            entityId: qr.id,
            icon: 'system',
          });
        }
        if (qr.convertedAt) {
          timeline.push({
            id: `qr-converted-${qr.id}`,
            type: 'system',
            timestamp: new Date(qr.convertedAt).toISOString(),
            title: 'Quote request converted to estimate',
            entityType: 'quoteRequest',
            entityId: qr.id,
            icon: 'system',
          });
        }
      }

      // 3. Estimate milestones
      const allEst = await storage.listEstimates();
      for (const clientId of matchingClientIds) {
        const clientEstimates = allEst.filter(e => e.clientId === clientId);
        for (const est of clientEstimates) {
          if (est.sentAt) {
            timeline.push({
              id: `est-sent-${est.id}`,
              type: 'estimate_sent',
              timestamp: new Date(est.sentAt).toISOString(),
              title: `Quote sent ($${(est.total / 100).toLocaleString()})`,
              entityType: 'estimate',
              entityId: est.id,
              icon: 'system',
            });
          }
          if (est.viewedAt) {
            timeline.push({
              id: `est-viewed-${est.id}`,
              type: 'system',
              timestamp: new Date(est.viewedAt).toISOString(),
              title: 'Customer viewed quote',
              entityType: 'estimate',
              entityId: est.id,
              icon: 'system',
            });
          }
          if (est.acceptedAt) {
            timeline.push({
              id: `est-accepted-${est.id}`,
              type: 'estimate_accepted',
              timestamp: new Date(est.acceptedAt).toISOString(),
              title: 'Quote accepted!',
              entityType: 'estimate',
              entityId: est.id,
              icon: 'system',
            });
          }
          if (est.declinedAt) {
            timeline.push({
              id: `est-declined-${est.id}`,
              type: 'system',
              timestamp: new Date(est.declinedAt).toISOString(),
              title: `Quote declined${est.declinedReason ? `: ${est.declinedReason}` : ''}`,
              entityType: 'estimate',
              entityId: est.id,
              icon: 'system',
            });
          }
        }
      }

      // 4. Event milestones
      const allEvts = await storage.listEvents();
      for (const clientId of matchingClientIds) {
        const clientEvents = allEvts.filter(e => e.clientId === clientId);
        for (const evt of clientEvents) {
          timeline.push({
            id: `event-created-${evt.id}`,
            type: 'event_created',
            timestamp: new Date(evt.createdAt).toISOString(),
            title: `Event booked: ${evt.eventType} (${evt.guestCount} guests)`,
            detail: evt.venue,
            entityType: 'event',
            entityId: evt.id,
            icon: 'system',
          });
        }
      }

      // Sort chronologically (newest first)
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.status(200).json({
        email,
        totalEntries: timeline.length,
        timeline,
      });
    } catch (error) {
      console.error('Error building contact timeline:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Search contacts
  app.get('/api/contacts/search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { identifier, type } = req.query;
      
      if (!identifier) {
        return res.status(400).json({ message: 'Identifier is required' });
      }
      
      const result = await storage.findContactsByIdentifier(identifier.toString(), type?.toString());
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error searching contacts:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ===== Raw Leads Management =====

  // Test endpoint to create a sample lead with AI-enriched fields
  app.post('/api/raw-leads/create-sample', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sampleWeddingInquiryEmail } = await import('./testData');
      
      // Create the sample lead with the current time
      // Create a lead data object that conforms to the expected schema
      const leadData: any = {
        source: sampleWeddingInquiryEmail.source,
        rawData: sampleWeddingInquiryEmail.rawData,
        status: sampleWeddingInquiryEmail.status,
        notes: sampleWeddingInquiryEmail.notes,
        receivedAt: new Date(),
        extractedProspectName: sampleWeddingInquiryEmail.extractedProspectName,
        extractedProspectEmail: sampleWeddingInquiryEmail.extractedProspectEmail,
        extractedProspectPhone: sampleWeddingInquiryEmail.extractedProspectPhone,
        eventSummary: sampleWeddingInquiryEmail.eventSummary,
        extractedEventType: sampleWeddingInquiryEmail.extractedEventType,
        extractedEventDate: sampleWeddingInquiryEmail.extractedEventDate,
        extractedEventTime: sampleWeddingInquiryEmail.extractedEventTime,
        extractedGuestCount: sampleWeddingInquiryEmail.extractedGuestCount,
        extractedVenue: sampleWeddingInquiryEmail.extractedVenue,
        extractedMessageSummary: sampleWeddingInquiryEmail.extractedMessageSummary,
        aiBudgetIndication: sampleWeddingInquiryEmail.aiBudgetIndication,
        aiBudgetValue: sampleWeddingInquiryEmail.aiBudgetValue,
        aiOverallLeadQuality: sampleWeddingInquiryEmail.aiOverallLeadQuality,
        aiUrgencyScore: sampleWeddingInquiryEmail.aiUrgencyScore,
        aiClarityOfRequestScore: sampleWeddingInquiryEmail.aiClarityOfRequestScore,
        aiDecisionMakerLikelihood: sampleWeddingInquiryEmail.aiDecisionMakerLikelihood,
        aiKeyRequirements: sampleWeddingInquiryEmail.aiKeyRequirements,
        aiPotentialRedFlags: sampleWeddingInquiryEmail.aiPotentialRedFlags
      };
      
      const newLead = await storage.createRawLead(leadData);
      
      res.status(201).json({
        message: 'Sample lead created successfully',
        lead: newLead
      });
    } catch (error) {
      console.error('Error creating sample lead:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Process a raw lead into an opportunity
  app.post('/api/raw-leads/:id/process', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      
      if (isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid lead ID' });
      }
      
      // Get the raw lead data
      const lead = await storage.getRawLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: 'Raw lead not found' });
      }
      
      // Create an opportunity from the lead using AI-enriched fields
      // Split extracted name into first and last name if available
      let firstName = '';
      let lastName = '';
      
      if (lead.extractedProspectName) {
        const nameParts = lead.extractedProspectName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = ''; // Use empty string for lastName if only first name is available
        }
      }
      
      // Build leadData JSONB carrying AI scoring & parsed data forward to the opportunity.
      // This data is preserved so the opportunity detail page can show AI insights
      // without needing to look up the raw lead.
      const leadData: Record<string, any> = {};
      if (lead.aiOverallLeadQuality) leadData.overallQuality = lead.aiOverallLeadQuality;
      if (lead.aiUrgencyScore) leadData.urgencyScore = lead.aiUrgencyScore;
      if (lead.aiUrgencyReason) leadData.urgencyReason = lead.aiUrgencyReason;
      if (lead.aiBudgetIndication) leadData.budgetIndication = lead.aiBudgetIndication;
      if (lead.aiBudgetValue) leadData.budgetValue = lead.aiBudgetValue;
      if (lead.aiBudgetReason) leadData.budgetReason = lead.aiBudgetReason;
      if (lead.aiClarityOfRequestScore) leadData.clarityScore = lead.aiClarityOfRequestScore;
      if (lead.aiClarityReason) leadData.clarityReason = lead.aiClarityReason;
      if (lead.aiDecisionMakerLikelihood) leadData.decisionMakerLikelihood = lead.aiDecisionMakerLikelihood;
      if (lead.aiKeyRequirements) leadData.keyRequirements = lead.aiKeyRequirements;
      if (lead.aiPotentialRedFlags) leadData.redFlags = lead.aiPotentialRedFlags;
      if (lead.aiSuggestedNextStep) leadData.suggestedNextStep = lead.aiSuggestedNextStep;
      if (lead.aiSentiment) leadData.sentiment = lead.aiSentiment;
      if (lead.aiConfidenceScore) leadData.confidenceScore = lead.aiConfidenceScore;
      if (lead.extractedMessageSummary) leadData.messageSummary = lead.extractedMessageSummary;
      if (lead.leadSourcePlatform) leadData.sourcePlatform = lead.leadSourcePlatform;
      leadData.rawLeadSource = lead.source;
      leadData.processedAt = new Date().toISOString();

      // Map AI-enriched fields to opportunity data
      const opportunityData = {
        firstName: firstName || 'Unknown',
        lastName: lastName || 'Contact',
        email: lead.extractedProspectEmail || 'unknown@example.com',
        phone: lead.extractedProspectPhone || null,
        eventType: lead.extractedEventType || 'Unspecified Event',
        eventDate: lead.extractedEventDate ? new Date(lead.extractedEventDate) : null,
        guestCount: lead.extractedGuestCount || null,
        venue: lead.extractedVenue || null,
        opportunitySource: lead.leadSourcePlatform || lead.source || 'raw_lead',
        status: 'new' as const,
        notes: formatNotes(lead),
        priority: mapLeadQualityToPriority(lead.aiOverallLeadQuality ?? undefined),
        // Tier 1: Link back to source raw lead and carry AI data forward
        rawLeadId: leadId,
        leadData: Object.keys(leadData).length > 0 ? leadData : null,
        statusChangedAt: new Date(),
      };

      const opportunity = await storage.createOpportunity(opportunityData);

      // Update the raw lead status and link the created opportunity
      await storage.updateRawLead(leadId, {
        status: 'qualified',
        createdOpportunityId: opportunity.id,
      });

      res.status(200).json({
        message: 'Raw lead processed successfully',
        opportunity
      });
    } catch (error) {
      console.error('Error processing raw lead:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Promote a raw lead to a quote request (structured, priced stage of the funnel).
  // Pre-fills the quote request from extracted lead fields so Mike can finish the details
  // in the QuoteRequests admin view (or send the customer a link to complete it themselves).
  app.post('/api/raw-leads/:id/promote-to-quote-request', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid lead ID' });
      }

      const [lead] = await db.select().from(rawLeads).where(eq(rawLeads.id, leadId));
      if (!lead) {
        return res.status(404).json({ message: 'Raw lead not found' });
      }

      // Idempotent: if already promoted, return the existing quote request
      const existing = await db.select().from(quoteRequests).where(eq(quoteRequests.rawLeadId, leadId));
      if (existing.length > 0) {
        return res.status(200).json({
          message: 'Lead was already promoted to a quote request',
          quoteRequest: existing[0],
          alreadyExisted: true,
        });
      }

      // Split extracted name into first/last
      let firstName = 'Unknown';
      let lastName = 'Contact';
      if (lead.extractedProspectName) {
        const parts = lead.extractedProspectName.trim().split(/\s+/);
        if (parts.length > 0 && parts[0]) firstName = parts[0];
        if (parts.length > 1) lastName = parts.slice(1).join(' ');
      }

      // Parse event date if it looks valid
      let eventDate: Date | null = null;
      if (lead.extractedEventDate) {
        const parsed = new Date(lead.extractedEventDate);
        if (!isNaN(parsed.getTime())) eventDate = parsed;
      }

      const [quoteRequest] = await db.insert(quoteRequests).values({
        firstName,
        lastName,
        email: lead.extractedProspectEmail || 'unknown@example.com',
        phone: lead.extractedProspectPhone || null,
        eventType: lead.extractedEventType || 'other',
        eventDate,
        // guestCount is NOT NULL — default to 1 as a placeholder; Mike updates before sending quote
        guestCount: lead.extractedGuestCount && lead.extractedGuestCount > 0 ? lead.extractedGuestCount : 1,
        venueName: lead.extractedVenue || null,
        specialRequests: lead.extractedMessageSummary || lead.eventSummary || null,
        internalNotes: lead.notes || null,
        source: lead.leadSourcePlatform || lead.source || 'promoted_from_lead',
        status: 'draft',
        rawLeadId: lead.id,
      } as any).returning();

      // Mark the raw lead as qualified (it's moved into the pricing stage of the funnel)
      await db
        .update(rawLeads)
        .set({ status: 'qualified', updatedAt: new Date() })
        .where(eq(rawLeads.id, leadId));

      return res.status(201).json({
        message: 'Raw lead promoted to quote request',
        quoteRequest,
      });
    } catch (error) {
      console.error('Error promoting raw lead to quote request:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Get all raw leads
  app.get('/api/raw-leads', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      
      let leads;
      
      if (status) {
        leads = await storage.listRawLeadsByStatus(status);
      } else {
        leads = await storage.listRawLeads();
      }
      
      res.status(200).json(leads);
    } catch (error) {
      console.error('Error getting raw leads:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific raw lead
  app.get('/api/raw-leads/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      
      if (isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid lead ID' });
      }
      
      const lead = await storage.getRawLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: 'Raw lead not found' });
      }
      
      // Calculate distance if venue information is available
      let distanceInfo = null;
      if (lead.extractedVenue) {
        try {
          const { calculateDistanceToVenue } = await import('./services/distanceService.js');
          distanceInfo = await calculateDistanceToVenue(lead.extractedVenue);
        } catch (distanceError) {
          console.log('Distance calculation not available:', distanceError);
        }
      }
      
      // Check calendar availability if event date is available
      let calendarAvailability = null;
      if (lead.extractedEventDate) {
        try {
          const { checkDateAvailability } = await import('./services/calendarService.js');
          calendarAvailability = await checkDateAvailability(lead.extractedEventDate);
        } catch (calendarError) {
          console.log('Calendar check not available:', calendarError);
        }
      }
      
      res.status(200).json({
        ...lead,
        distanceInfo,
        calendarAvailability
      });
    } catch (error) {
      console.error('Error getting raw lead:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new raw lead
  app.post('/api/raw-leads', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const leadData = insertRawLeadSchema.parse(req.body);

      // Track who created this lead
      const newLead = await storage.createRawLead({
        ...leadData,
        createdBy: req.session.userId,
      });
      
      res.status(201).json(newLead);
    } catch (error) {
      console.error('Error creating raw lead:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update a raw lead
  app.patch('/api/raw-leads/:id', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);

      if (isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid lead ID' });
      }

      // Check ownership for non-admins
      const user = await storage.getUser(req.session.userId!);
      if (user!.role !== 'admin') {
        const lead = await storage.getRawLead(leadId);
        if (!lead) {
          return res.status(404).json({ message: 'Raw lead not found' });
        }
        if (lead.createdBy !== user!.id) {
          return res.status(403).json({ message: 'You can only edit leads you created' });
        }
      }

      const updateData = req.body;

      const updatedLead = await storage.updateRawLead(leadId, updateData);
      
      if (!updatedLead) {
        return res.status(404).json({ message: 'Raw lead not found' });
      }
      
      res.status(200).json(updatedLead);
    } catch (error) {
      console.error('Error updating raw lead:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a raw lead
  app.delete('/api/raw-leads/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      
      if (isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid lead ID' });
      }
      
      const success = await storage.deleteRawLead(leadId);
      
      if (!success) {
        return res.status(404).json({ message: 'Raw lead not found' });
      }
      
      res.status(200).json({ message: 'Raw lead deleted successfully' });
    } catch (error) {
      console.error('Error deleting raw lead:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete multiple raw leads
  app.post('/api/raw-leads/delete-many', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'IDs must be a non-empty array' });
      }
      
      const result = await storage.deleteManyRawLeads(ids);
      
      res.status(200).json({ 
        message: `Deleted ${result.deleted} raw leads, failed to delete ${result.failed} raw leads`,
        ...result
      });
    } catch (error) {
      console.error('Error deleting multiple raw leads:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get lead system settings
  app.get('/api/lead-system/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getLeadSystemSettings();
      
      res.status(200).json(settings);
    } catch (error) {
      console.error('Error getting lead system settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== EMAIL PARSING & FORM PRE-FILL =====
  
  // Get parsed emails for form pre-fill (latest unreviewed leads)
  app.get('/api/email-parser/available-leads', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leads = await storage.listRawLeadsByStatus('new');
      
      const formattedLeads = leads.map(lead => ({
        id: lead.id,
        prospectName: lead.extractedProspectName || '',
        prospectEmail: lead.extractedProspectEmail || '',
        prospectPhone: lead.extractedProspectPhone || '',
        eventType: lead.extractedEventType || '',
        eventDate: lead.extractedEventDate || '',
        eventTime: lead.extractedEventTime || '',
        guestCount: lead.extractedGuestCount || 0,
        venue: lead.extractedVenue || '',
        summary: lead.extractedMessageSummary || lead.eventSummary || '',
        requirements: lead.aiKeyRequirements || [],
        redFlags: lead.aiPotentialRedFlags || [],
        budget: lead.aiBudgetValue || null,
        quality: lead.aiOverallLeadQuality || 'cold',
        receivedAt: lead.receivedAt
      }));
      
      res.status(200).json(formattedLeads);
    } catch (error) {
      console.error('Error getting available leads:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get specific lead data formatted for form population
  app.get('/api/email-parser/lead-form-data/:leadId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.leadId);
      
      if (isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid lead ID' });
      }
      
      const lead = await storage.getRawLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      
      const formData = {
        id: lead.id,
        prospectName: lead.extractedProspectName || '',
        prospectEmail: lead.extractedProspectEmail || '',
        prospectPhone: lead.extractedProspectPhone || '',
        eventType: lead.extractedEventType || '',
        eventDate: lead.extractedEventDate || '',
        eventTime: lead.extractedEventTime || '',
        guestCount: lead.extractedGuestCount || 0,
        venue: lead.extractedVenue || '',
        messageSummary: lead.extractedMessageSummary || '',
        keyRequirements: Array.isArray(lead.aiKeyRequirements) 
          ? lead.aiKeyRequirements 
          : (typeof lead.aiKeyRequirements === 'string' ? JSON.parse(lead.aiKeyRequirements) : []),
        potentialRedFlags: Array.isArray(lead.aiPotentialRedFlags)
          ? lead.aiPotentialRedFlags
          : (typeof lead.aiPotentialRedFlags === 'string' ? JSON.parse(lead.aiPotentialRedFlags) : []),
        budget: lead.aiBudgetValue || null,
        quality: lead.aiOverallLeadQuality || 'cold',
        urgency: lead.aiUrgencyScore || '',
        clarity: lead.aiClarityOfRequestScore || '',
        sentiment: lead.aiSentiment || 'neutral',
        suggestedNextStep: lead.aiSuggestedNextStep || '',
        calendarConflict: '',
        rawEmailData: lead.rawData
      };
      
      res.status(200).json(formData);
    } catch (error) {
      console.error('Error getting lead form data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== GOOGLE APPS SCRIPT EMAIL INTAKE =====
  
  // Zod schema for GAS email payload validation
  const gasEmailPayloadSchema = z.object({
    gmailMessageId: z.string().min(1),
    gmailThreadId: z.string().optional(), // For thread grouping and deduplication
    subject: z.string(),
    from: z.string().email().or(z.string().min(1)),
    to: z.string().optional(),
    receivedDate: z.string().datetime(),
    cleanedText: z.string().min(1),
    rawHtml: z.string().optional()
  });
  
  // Middleware to validate API key from Google Apps Script
  const validateGASApiKey = (req: Request, res: Response, next: Function) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.GAS_API_KEY;
    
    if (!expectedKey) {
      console.error('GAS_API_KEY not configured in environment');
      return res.status(503).json({ message: 'API key not configured on server' });
    }
    
    if (!apiKey || apiKey !== expectedKey) {
      console.warn('Invalid API key attempt for GAS endpoint');
      return res.status(401).json({ message: 'Unauthorized: Invalid API key' });
    }
    
    next();
  };

  // Receive email from Google Apps Script for processing
  app.post('/api/gas-email-intake', validateGASApiKey, async (req: Request, res: Response) => {
    try {
      // Validate payload with Zod schema
      const validationResult = gasEmailPayloadSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Invalid payload',
          errors: validationResult.error.errors
        });
      }

      const {
        gmailMessageId,
        gmailThreadId,
        subject,
        from,
        to,
        receivedDate,
        cleanedText,
        rawHtml
      } = validationResult.data;

      console.log(`GAS Email Intake: Processing email "${subject}" from ${from}`);

      // Check if this email was already processed
      const alreadyProcessed = await storage.isEmailProcessed(gmailMessageId, 'google_apps_script');
      
      if (alreadyProcessed) {
        console.log(`Email ${gmailMessageId} already processed, skipping`);
        return res.status(200).json({ 
          message: 'Email already processed',
          duplicate: true
        });
      }

      const emailDate = new Date(receivedDate);
      
      // Validate that gmailThreadId is provided (critical for proper thread grouping)
      if (!gmailThreadId) {
        console.warn(`GAS Email Intake: No gmailThreadId provided for message ${gmailMessageId}. Thread grouping may not work properly.`);
      }
      
      const threadId = gmailThreadId || `fallback-${from}-${subject.substring(0, 50)}`; // Deterministic fallback
      
      // Check if this thread already exists (deduplication)
      const existingThread = await storage.getOpportunityEmailThread(threadId);
      
      if (existingThread && (existingThread.opportunityId || existingThread.rawLeadId)) {
        // Thread exists - create communication on existing lead/opportunity instead of new lead
        console.log(`GAS Email Intake: Thread ${threadId} already exists for ${existingThread.opportunityId ? `Opportunity ${existingThread.opportunityId}` : `Raw Lead ${existingThread.rawLeadId}`}. Adding communication only.`);
        
        const communicationData: InsertCommunication = {
          opportunityId: existingThread.opportunityId || null,
          clientId: null,
          userId: null,
          type: 'email',
          direction: 'incoming',
          timestamp: emailDate,
          source: 'google_apps_script',
          gmailThreadId: threadId,
          gmailMessageId: gmailMessageId,
          subject: subject,
          fromAddress: from,
          toAddress: to || '',
          bodyRaw: cleanedText,
          metaData: { 
            isFollowUp: true,
            rawHtml: rawHtml,
            rawLeadId: existingThread.rawLeadId || null  // Keep link to raw lead if not yet converted
          }
        };
        
        const comm = await storage.createCommunication(communicationData);
        console.log(`GAS Email Intake: Created follow-up communication ID ${comm.id} for thread ${threadId}`);

        // Mark email as processed
        await storage.recordProcessedEmail({
          messageId: gmailMessageId,
          gmailId: gmailMessageId,
          service: 'google_apps_script',
          email: to || from,
          labelApplied: true,
        });
        
        return res.status(200).json({
          success: true,
          communicationId: comm.id,
          existingLeadId: existingThread.rawLeadId,
          existingOpportunityId: existingThread.opportunityId,
          message: 'Follow-up email added to existing conversation',
          isFollowUp: true
        });
      }

      // No existing thread - create new lead with communication
      // Use AI to extract structured data from the email
      const extractedData = await aiService.extractLeadDataFromEmail({
        subject,
        from,
        bodyText: cleanedText,
        bodyHtml: rawHtml,
        receivedDate: emailDate
      });

      // Create raw lead with structured data
      const leadData: any = {
        source: 'google_apps_script',
        status: extractedData.status || 'new',
        receivedAt: emailDate,
        extractedProspectName: extractedData.inquiry_data?.client_name || '',
        extractedProspectEmail: extractedData.inquiry_data?.client_email || from,
        extractedProspectPhone: extractedData.inquiry_data?.client_phone || null,
        extractedEventType: extractedData.inquiry_data?.event_type || '',
        extractedEventDate: extractedData.inquiry_data?.event_date || null,
        extractedEventTime: extractedData.inquiry_data?.event_time || null,
        extractedGuestCount: extractedData.inquiry_data?.guest_count_min || 
                            extractedData.inquiry_data?.guest_count_max || 
                            null,
        extractedVenue: extractedData.inquiry_data?.service_location || null,
        eventSummary: subject,
        extractedMessageSummary: extractedData.summary_text || '',
        
        // AI Analysis fields
        aiKeyRequirements: extractedData.analysis?.key_requirements || [],
        aiPotentialRedFlags: extractedData.analysis?.potential_concerns || [],
        aiBudgetValue: extractedData.inquiry_data?.estimated_budget || null,
        aiBudgetIndication: extractedData.analysis?.budget_indication || null,
        aiOverallLeadQuality: extractedData.analysis?.lead_quality || 'cold',
        aiUrgencyScore: extractedData.analysis?.urgency_score?.toString() || null,
        aiClarityOfRequestScore: extractedData.analysis?.clarity_score?.toString() || null,
        aiSentiment: extractedData.analysis?.sentiment || 'neutral',
        aiSuggestedNextStep: extractedData.analysis?.suggested_next_step || '',
        
        // Store complete metadata
        rawData: {
          gmailMessageId,
          gmailThreadId: threadId,
          subject,
          from,
          to,
          receivedDate,
          parser_metadata: extractedData.parser_metadata || {
            source_system: 'Direct Email',
            extracted_by_model: 'AI Service',
            received_timestamp: receivedDate
          },
          inquiry_data: extractedData.inquiry_data || {},
          full_extraction: extractedData
        },
        
        leadSourcePlatform: extractedData.parser_metadata?.source_system || 'email',
        notes: `Processed via Google Apps Script\nSource: ${extractedData.parser_metadata?.source_system || 'Direct Email'}\nModel: ${extractedData.parser_metadata?.extracted_by_model || 'Unknown'}`
      };

      const createdLead = await storage.createRawLead(leadData);
      console.log(`GAS Email Intake: Created lead ID ${createdLead.id} for email "${subject}"`);

      // Create thread mapping for this new lead
      const threadData: InsertOpportunityEmailThread = {
        gmailThreadId: threadId,
        opportunityId: null,
        rawLeadId: createdLead.id,
        primaryEmailAddress: from,
        participantEmails: [from, to || ''].filter(Boolean),
        isActive: true
      };
      
      await storage.createOpportunityEmailThread(threadData);
      console.log(`GAS Email Intake: Created thread mapping ${threadId} -> Raw Lead ${createdLead.id}`);

      // Create initial communication record for this email
      const communicationData: InsertCommunication = {
        opportunityId: null,
        clientId: null,
        userId: null,
        type: 'email',
        direction: 'incoming',
        timestamp: emailDate,
        source: 'google_apps_script',
        gmailThreadId: threadId,
        gmailMessageId: gmailMessageId,
        subject: subject,
        fromAddress: from,
        toAddress: to || '',
        bodyRaw: cleanedText,
        metaData: { 
          isInitialEmail: true,
          rawHtml: rawHtml,
          aiExtractedData: extractedData
        }
      };
      
      const comm = await storage.createCommunication(communicationData);
      console.log(`GAS Email Intake: Created initial communication ID ${comm.id} for lead ${createdLead.id}`);

      // Mark email as processed
      await storage.recordProcessedEmail({
        messageId: gmailMessageId,
        gmailId: gmailMessageId,
        service: 'google_apps_script',
        email: to || from,
        labelApplied: true,
      });

      res.status(201).json({
        success: true,
        leadId: createdLead.id,
        communicationId: comm.id,
        message: 'Email processed and lead created successfully',
        extractedData: {
          prospectName: leadData.extractedProspectName,
          eventType: leadData.extractedEventType,
          leadQuality: leadData.aiOverallLeadQuality
        }
      });

    } catch (error) {
      console.error('GAS Email Intake Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process email',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== OPENPHONE WEBHOOK INTEGRATION =====
  
  // Zod schema for OpenPhone webhook payload validation
  const openPhoneCallSchema = z.object({
    id: z.string(),
    object: z.literal('call').optional(),
    createdAt: z.string().datetime().optional(),
    direction: z.enum(['inbound', 'outbound']),
    from: z.string().min(1),
    to: z.string().min(1),
    status: z.string().optional(),
    duration: z.number().optional(), // Duration in seconds
    recordingUrl: z.string().url().optional(),
    transcript: z.string().optional(),
    completedAt: z.string().datetime().optional(),
    userId: z.string().optional(),
    phoneNumberId: z.string().optional()
  });

  const openPhoneWebhookSchema = z.object({
    event: z.string(), // e.g., "call.completed", "call.recording.completed", "call.transcript.completed"
    data: openPhoneCallSchema
  });

  // Middleware to validate OpenPhone webhook (basic API key validation)
  const validateOpenPhoneWebhook = (req: Request, res: Response, next: Function) => {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.OPENPHONE_WEBHOOK_SECRET || process.env.OPENPHONE_API_KEY;
    
    if (!expectedKey) {
      console.warn('OpenPhone webhook secret not configured - accepting all requests (INSECURE)');
      return next(); // Allow through but warn
    }
    
    if (!apiKey || apiKey !== expectedKey) {
      console.warn('Invalid API key attempt for OpenPhone webhook');
      return res.status(401).json({ message: 'Unauthorized: Invalid API key' });
    }
    
    next();
  };

  // Receive call events from OpenPhone
  app.post('/api/openphone-webhook', validateOpenPhoneWebhook, async (req: Request, res: Response) => {
    try {
      console.log('OpenPhone Webhook: Received event', req.body.event);
      
      // Validate payload with Zod schema
      const validationResult = openPhoneWebhookSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error('OpenPhone Webhook: Invalid payload', validationResult.error);
        return res.status(400).json({ 
          message: 'Invalid payload',
          errors: validationResult.error.errors
        });
      }

      const { event, data: callData } = validationResult.data;
      
      // Only process completed calls (ignore in-progress events)
      if (!event.includes('completed')) {
        console.log(`OpenPhone Webhook: Ignoring non-completed event: ${event}`);
        return res.status(200).json({ message: 'Event ignored (not completed)' });
      }

      console.log(`OpenPhone Webhook: Processing ${event} - Call ID ${callData.id}`);
      
      // Normalize phone numbers for matching
      const fromPhone = normalizePhoneNumber(callData.from);
      const toPhone = normalizePhoneNumber(callData.to);
      
      // Determine customer phone (inbound = from, outbound = to)
      const customerPhone = callData.direction === 'inbound' ? fromPhone : toPhone;
      
      if (!isValidPhone(customerPhone)) {
        console.warn(`OpenPhone Webhook: Invalid customer phone number: ${customerPhone}`);
        return res.status(400).json({ message: 'Invalid phone number format' });
      }
      
      // Try to find existing contact by phone number
      const contactIdentifier = await storage.findContactIdentifierByPhone(customerPhone);
      
      let opportunityId: number | null = null;
      let clientId: number | null = null;
      let rawLeadId: number | null = null;
      let isNewLead = false;
      
      if (contactIdentifier) {
        // Found existing contact - link to their opportunity or client
        opportunityId = contactIdentifier.opportunityId || null;
        clientId = contactIdentifier.clientId || null;
        console.log(`OpenPhone Webhook: Matched phone ${customerPhone} to ${opportunityId ? `Opportunity ${opportunityId}` : `Client ${clientId}`}`);
      } else {
        // No match found - create a raw lead for follow-up
        console.log(`OpenPhone Webhook: No match for ${customerPhone}, creating raw lead`);
        isNewLead = true;
        
        const rawLead = await storage.createRawLead({
          source: 'openphone',
          extractedProspectName: callData.direction === 'inbound' ? 'Unknown Caller' : 'Outbound Call',
          extractedProspectPhone: customerPhone,
          extractedProspectEmail: null,
          eventSummary: `${callData.direction === 'inbound' ? 'Inbound' : 'Outbound'} call - ${callData.duration ? Math.floor(callData.duration / 60) + ' min' : 'Duration unknown'}`,
          receivedAt: callData.completedAt ? new Date(callData.completedAt) : new Date(),
          status: 'new',
          rawData: callData
        });
        
        rawLeadId = rawLead.id;
        
        // Create contact identifier for this phone number
        await storage.createContactIdentifier({
          opportunityId: null,
          clientId: null,
          type: 'phone',
          value: customerPhone,
          isPrimary: true,
          source: 'openphone',
        });
        
        console.log(`OpenPhone Webhook: Created raw lead ${rawLeadId} for ${customerPhone}`);
      }
      
      // Create communication record for this call
      const callTimestamp = callData.completedAt ? new Date(callData.completedAt) : new Date();
      const durationMinutes = callData.duration ? Math.floor(callData.duration / 60) : null;
      
      const communicationData: InsertCommunication = {
        opportunityId: opportunityId,
        clientId: clientId,
        userId: null,
        type: 'call',
        direction: callData.direction === 'inbound' ? 'incoming' : 'outgoing',
        timestamp: callTimestamp,
        source: 'openphone',
        externalId: callData.id,
        subject: `${callData.direction === 'inbound' ? 'Inbound' : 'Outbound'} Call - ${durationMinutes ? durationMinutes + ' min' : 'Unknown duration'}`,
        fromAddress: fromPhone,
        toAddress: toPhone,
        bodyRaw: callData.transcript || null,
        bodySummary: callData.transcript ? `Call transcript (${durationMinutes} min)` : durationMinutes ? `Call duration: ${durationMinutes} minutes` : 'Call completed',
        durationMinutes: durationMinutes,
        recordingUrl: callData.recordingUrl || null,
        metaData: {
          openphoneCallId: callData.id,
          openphoneUserId: callData.userId,
          openphonePhoneNumberId: callData.phoneNumberId,
          callStatus: callData.status,
          rawLeadId: rawLeadId, // Link to raw lead if created
          hasTranscript: !!callData.transcript,
          hasRecording: !!callData.recordingUrl
        }
      };
      
      const comm = await storage.createCommunication(communicationData);
      console.log(`OpenPhone Webhook: Created communication ${comm.id} for call ${callData.id}`);
      
      res.status(200).json({
        success: true,
        communicationId: comm.id,
        matched: !isNewLead,
        opportunityId: opportunityId,
        clientId: clientId,
        rawLeadId: rawLeadId,
        message: isNewLead ? 'Call logged and new lead created' : 'Call logged to existing contact'
      });
      
    } catch (error) {
      console.error('OpenPhone Webhook Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process call webhook',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Database export endpoint for admin users
  app.post('/api/admin/export-database', isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('Starting database export...');
      
      // Use pg_dump to export the database
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }
      
      // Generate timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `homebites-backup-${timestamp}.sql`;
      
      // Execute pg_dump command
      const command = `pg_dump "${dbUrl}" --no-owner --no-privileges`;
      console.log('Executing pg_dump...');
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.error('pg_dump stderr:', stderr);
      }
      
      console.log('Database export completed successfully');
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(stdout, 'utf8'));
      
      // Send the SQL content
      res.send(stdout);
      
    } catch (error) {
      console.error('Database export error:', error);
      res.status(500).json({ 
        message: 'Failed to export database', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // API routes removed

  // Create an HTTP server
  const server = createServer(app);
  
  return server;
}