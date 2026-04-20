import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db"; // For direct database access
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import session from "express-session";
import { eq, and, isNull, inArray, or, desc } from "drizzle-orm"; // For equality operations
import Anthropic from "@anthropic-ai/sdk";
import pgSession from 'connect-pg-simple';
import {
  insertUserSchema,
  insertOpportunitySchema,
  insertMenuItemSchema,
  insertMenuSchema,
  insertClientSchema,
  insertQuoteSchema,
  insertEventSchema,
  insertContactIdentifierSchema, // New
  insertCommunicationSchema,     // New
  opportunityPriorityEnum,       // For priority filtering
  insertRawLeadSchema,           // For raw leads management
  opportunities,                  // for send-inquiry endpoint
  communications,                // table for drizzle updates
  opportunityEmailThreads,       // table for thread migration
  inquiries,                 // for promote-to-inquiry endpoint
  inquiryInvites,            // for Mike-initiated manual inquiry invites
  rawLeads,                      // for promote-to-inquiry endpoint
  quotes,                     // for accept-quote endpoint
  followUpDrafts,                // for follow-up engine
  quoteVersions,              // for quote versioning
  contactIdentifiers,            // for duplicate merge
  clients,                       // for accept-quote endpoint (prospect→customer graduation)
  events,                        // for auto-create event on accept and /full endpoint
  menus,                         // for /api/events/:id/full aggregate endpoint
  menuItems,                     // for enriching celebration-page menu with descriptions
  tastings,                      // P1-1: tasting bookings
  contracts,                     // P2-1: contracts
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
import { filterQuote, filterQuotes, filterMenuItem, filterMenuItems } from './utils/dataFilters';
import { buildProposalFromInquiry, buildProposalFromQuoteAlone } from './lib/proposalFromInquiry';
import type { Proposal } from '@shared/proposal';
import { getSiteConfig, getEmailConfig, getCalComConfig, getSquareConfig, getBoldSignConfig, getDepositPercent, getReviewConfig } from './utils/siteConfig';
import { createCheckoutLink, verifySquareWebhook } from './services/paymentService';
import {
  generateContractHtml,
  sendContractForSignature,
  verifyBoldSignWebhook,
  boldSignEventToStatus,
} from './services/contractService';
import { sendEmail, sendEmailInBackground } from './utils/email';
import { sendOwnerSmsInBackground } from './services/smsService';
import {
  newInquiryOwnerSms,
  infoRequestedOwnerSms,
  consultationBookedOwnerSms,
  quoteDeclinedOwnerSms,
  declineFeedbackOwnerSms,
  dripDay3CustomerSms,
  dripDay7OwnerSms,
  tastingBookedOwnerSms,
  tastingPaidOwnerSms,
  contractSignedOwnerSms,
  paymentReceivedOwnerSms,
  inquiryInviteCustomerSms,
} from './utils/smsTemplates';
import { sendSmsInBackground } from './services/smsService';
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
  infoRequestedClientAckEmail,
  infoRequestedOwnerEmail,
  consultationBookedOwnerEmail,
  quoteDeclinedFeedbackEmail,
  declineFeedbackOwnerEmail,
  eventReviewRequestEmail,
  dripDay2SoftEmail,
  dripDay5ValueEmail,
  dripDay10FinalEmail,
  tastingPaymentEmail,
  tastingBookedOwnerEmail,
  tastingPaidCustomerEmail,
  contractSentCustomerEmail,
  contractSignedOwnerEmail,
  depositRequestCustomerEmail,
  balanceRequestCustomerEmail,
  paymentReceivedCustomerEmail,
  paymentReceivedOwnerEmail,
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
          requirementsText = requirements.map((req: any) => `• ${req}`).join('\n');
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
          redFlagsText = redFlags.map((flag: any) => `• ${flag}`).join('\n');
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

/**
 * P1-2: Pause the drip for an opportunity if it's currently active. No-op if
 * the opportunity doesn't exist, hasn't started, or is already paused. Safe to
 * call from any route that represents customer engagement (reply, call, click).
 */
async function pauseOpportunityDrip(opportunityId: number | null | undefined, reason: string): Promise<void> {
  if (!opportunityId) return;
  try {
    const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, opportunityId));
    if (!opp) return;
    if (opp.followUpSequencePausedAt) return; // already paused
    if (!opp.followUpSequenceStartedAt) return; // never started — nothing to pause
    await db
      .update(opportunities)
      .set({ followUpSequencePausedAt: new Date(), updatedAt: new Date() })
      .where(eq(opportunities.id, opp.id));
    console.log(`[drip] paused opp #${opp.id} (reason: ${reason})`);
  } catch (err) {
    console.warn(`[drip] failed to pause opp #${opportunityId}:`, err);
  }
}

// First-view-wins: stamp viewedAt, start the drip clock on the linked opportunity,
// and fire a one-shot admin notification. Safe to call multiple times — guarded by
// the `viewedAt` check. Returns void so callers can fire-and-forget.
async function stampQuoteViewedInBackground(
  quote: typeof quotes.$inferSelect,
): Promise<void> {
  // Re-read to avoid racing with a parallel view. The caller's copy may be stale.
  const [current] = await db.select().from(quotes).where(eq(quotes.id, quote.id));
  if (!current || current.viewedAt) return;

  const now = new Date();
  await db
    .update(quotes)
    .set({ viewedAt: now, updatedAt: now })
    .where(eq(quotes.id, current.id));

  if (current.opportunityId) {
    const [opp] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, current.opportunityId));
    if (opp && !opp.followUpSequenceStartedAt) {
      await db
        .update(opportunities)
        .set({ followUpSequenceStartedAt: now, updatedAt: now })
        .where(eq(opportunities.id, opp.id));
    }
  }

  try {
    const [client] = await db.select().from(clients).where(eq(clients.id, current.clientId));
    const emailCfg = getEmailConfig();
    const adminQuoteUrl = `${emailCfg.publicBaseUrl}/quotes/${current.id}/view`;
    const template = quoteViewedAdminEmail({
      customerName: client ? `${client.firstName} ${client.lastName}` : 'A customer',
      eventType: current.eventType,
      eventDate: current.eventDate,
      totalCents: current.total,
      adminQuoteUrl,
    });
    sendEmailInBackground({
      to: emailCfg.adminNotificationEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      clientId: current.clientId,
      templateKey: 'quote_viewed_admin',
    });
  } catch (notifyError) {
    console.warn('Failed to fire quote-viewed admin notification:', notifyError);
  }
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
        const currentUser = await storage.getUser(req.session.userId!);

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
        case 'quote': restored = await storage.restoreQuote(entityId); break;
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
        await db.update(inquiries)
          .set({ opportunityId: primaryId })
          .where(eq(inquiries.opportunityId, secondaryId));

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

        // Move quotes
        const allQuotes = await storage.listQuotes();
        for (const est of allQuotes) {
          if (est.clientId === secondaryId) {
            await storage.updateQuote(est.id, { clientId: primaryId });
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

  app.post('/api/quotes/bulk-action', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const { ids, action } = req.body as { ids: number[]; action: string };
      if (!ids?.length) return res.status(400).json({ message: 'No IDs provided' });

      let processed = 0;
      for (const id of ids) {
        switch (action) {
          case 'delete':
            await storage.deleteQuote(id);
            processed++;
            break;
          case 'expire':
            await storage.updateQuote(id, { status: 'declined' as any });
            processed++;
            break;
        }
      }

      await storage.writeAuditLog({
        entityType: 'quote',
        entityId: 0,
        action: action === 'delete' ? 'deleted' : 'updated',
        userId: req.session.userId,
        metadata: { bulkAction: action, ids, processed },
      });

      res.status(200).json({ message: `${processed} quotes processed`, processed });
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
      const allQuotes = await storage.listQuotes();
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

      // Quote counts by status
      const estCounts: Record<string, number> = {};
      for (const est of allQuotes) {
        estCounts[est.status] = (estCounts[est.status] || 0) + 1;
      }

      // Event counts
      const eventCount = allEvents.filter(e => e.status !== 'cancelled').length;

      // Build funnel stages
      const totalLeads = allOpps.length;
      const contacted = allOpps.filter(o => ['contacted', 'qualified', 'proposal', 'booked'].includes(o.status)).length;
      const qualified = allOpps.filter(o => ['qualified', 'proposal', 'booked'].includes(o.status)).length;
      const quotesSent = allQuotes.filter(e => ['sent', 'viewed', 'accepted', 'declined'].includes(e.status)).length;
      const accepted = allQuotes.filter(e => e.status === 'accepted').length;
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

      // Average time to close (first contact to booked) from accepted quotes
      const acceptedQuotes = allQuotes.filter(e => e.status === 'accepted' && e.acceptedAt);
      let avgDaysToClose = 0;
      if (acceptedQuotes.length > 0) {
        const totalDays = acceptedQuotes.reduce((sum, e) => {
          return sum + (new Date(e.acceptedAt!).getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgDaysToClose = Math.round(totalDays / acceptedQuotes.length);
      }

      // Revenue this month vs last month
      const thisMonthRevenue = allQuotes
        .filter(e => e.status === 'accepted' && e.acceptedAt &&
          new Date(e.acceptedAt).getMonth() === thisMonth &&
          new Date(e.acceptedAt).getFullYear() === thisYear)
        .reduce((sum, e) => sum + e.total, 0);

      const lastMonthRevenue = allQuotes
        .filter(e => e.status === 'accepted' && e.acceptedAt &&
          new Date(e.acceptedAt).getMonth() === lastMonth &&
          new Date(e.acceptedAt).getFullYear() === lastMonthYear)
        .reduce((sum, e) => sum + e.total, 0);

      // P2-3: Break down the funnel by source/campaign.
      // For each opportunitySource we report: count of opportunities, count of
      // those that resulted in an accepted quote (booked), and total revenue.
      // Sources with zero bookings still appear so Mike can see where the noise is.
      const quotesByOpp = new Map<number, any[]>();
      for (const e of allQuotes) {
        if (e.opportunityId != null) {
          const arr = quotesByOpp.get(e.opportunityId) || [];
          arr.push(e);
          quotesByOpp.set(e.opportunityId, arr);
        }
      }
      const bySource: Record<string, { count: number; booked: number; revenue: number; utmCampaigns: Record<string, number> }> = {};
      for (const opp of allOpps) {
        const src = (opp.opportunitySource || opp.utmSource || 'unknown').toLowerCase();
        if (!bySource[src]) bySource[src] = { count: 0, booked: 0, revenue: 0, utmCampaigns: {} };
        bySource[src].count += 1;
        if (opp.utmCampaign) {
          bySource[src].utmCampaigns[opp.utmCampaign] =
            (bySource[src].utmCampaigns[opp.utmCampaign] || 0) + 1;
        }
        const ests = quotesByOpp.get(opp.id) || [];
        const accepted = ests.find((e) => e.status === 'accepted');
        if (accepted) {
          bySource[src].booked += 1;
          bySource[src].revenue += accepted.total;
        }
      }

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
        bySource,
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

        // P2-3: UTM / referral attribution — captured from URL params or document.referrer
        utmSource: z.string().optional().nullable(),
        utmMedium: z.string().optional().nullable(),
        utmCampaign: z.string().optional().nullable(),
        utmContent: z.string().optional().nullable(),
        utmTerm: z.string().optional().nullable(),
        referrer: z.string().optional().nullable(),

        // Detailed form responses for historical record
        formResponses: z.array(z.object({
          questionId: z.number(),
          questionKey: z.string(),
          answer: z.any()
        })).optional()
      });

      const inquiryData = publicInquirySchema.parse(req.body);
      
      // Create the opportunity with appropriate defaults for public inquiries.
      // P2-3: carry UTM + referrer attribution onto the opportunity so it shows
      // up in reporting and we can tie bookings back to source campaigns.
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
        opportunitySource: inquiryData.utmSource || inquiryData.source || 'website',
        utmSource: inquiryData.utmSource || null,
        utmMedium: inquiryData.utmMedium || null,
        utmCampaign: inquiryData.utmCampaign || null,
        utmContent: inquiryData.utmContent || null,
        utmTerm: inquiryData.utmTerm || null,
        referrer: inquiryData.referrer || null,
        priority: "medium" as const,
        assignedTo: null
      };

      // Create the opportunity
      const newOpportunity = await storage.createOpportunity(opportunityData);

      // Fire-and-forget owner SMS alert (P0-1)
      sendOwnerSmsInBackground({
        ...newInquiryOwnerSms({
          firstName: newOpportunity.firstName,
          lastName: newOpportunity.lastName,
          eventType: newOpportunity.eventType,
          guestCount: newOpportunity.guestCount,
          eventDate: newOpportunity.eventDate,
          source: newOpportunity.opportunitySource || 'website',
          opportunityId: newOpportunity.id,
        }),
        templateKey: 'new_inquiry_owner_alert',
        opportunityId: newOpportunity.id,
      });

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
  
  // ===== P1-2: Admin drip state + pause/resume controls =====

  app.get('/api/opportunities/:id/drip-state', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const oppId = parseInt(req.params.id);
      if (isNaN(oppId)) return res.status(400).json({ message: 'Invalid opportunity ID' });

      const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, oppId));
      if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

      const startedAt = opp.followUpSequenceStartedAt;
      const step = opp.followUpSequenceStep ?? 0;
      const pausedAt = opp.followUpSequencePausedAt;

      // Compute when the next step fires (if any), so admin UI can show "next at X"
      let nextStepAt: string | null = null;
      let nextStepLabel: string | null = null;
      if (startedAt && !pausedAt && step < 5) {
        const dayOffsets: Record<number, number> = { 0: 2, 1: 3, 2: 5, 3: 7, 4: 10 };
        const nextDay = dayOffsets[step];
        if (nextDay !== undefined) {
          const t = new Date(startedAt);
          t.setDate(t.getDate() + nextDay);
          nextStepAt = t.toISOString();
          const labels = ['Day 2 email', 'Day 3 SMS', 'Day 5 email', 'Day 7 phone task', 'Day 10 final'];
          nextStepLabel = labels[step];
        }
      }

      return res.json({
        started: !!startedAt,
        startedAt,
        step,
        totalSteps: 5,
        paused: !!pausedAt,
        pausedAt,
        completed: step >= 5,
        nextStepAt,
        nextStepLabel,
        autosendEnabled: process.env.FOLLOWUP_AUTOSEND_ENABLED === 'true',
      });
    } catch (error) {
      console.error('Error fetching drip state:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/opportunities/:id/drip-pause', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const oppId = parseInt(req.params.id);
      if (isNaN(oppId)) return res.status(400).json({ message: 'Invalid opportunity ID' });
      const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, oppId));
      if (!opp) return res.status(404).json({ message: 'Opportunity not found' });
      if (opp.followUpSequencePausedAt) return res.json({ ok: true, alreadyPaused: true });

      await db
        .update(opportunities)
        .set({ followUpSequencePausedAt: new Date(), updatedAt: new Date() })
        .where(eq(opportunities.id, oppId));
      return res.json({ ok: true });
    } catch (error) {
      console.error('Error pausing drip:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/opportunities/:id/drip-resume', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const oppId = parseInt(req.params.id);
      if (isNaN(oppId)) return res.status(400).json({ message: 'Invalid opportunity ID' });
      const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, oppId));
      if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

      await db
        .update(opportunities)
        .set({ followUpSequencePausedAt: null, updatedAt: new Date() })
        .where(eq(opportunities.id, oppId));
      return res.json({ ok: true });
    } catch (error) {
      console.error('Error resuming drip:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== Send Inquiry to Customer (from Opportunity) =====

  app.post('/api/opportunities/:id/send-inquiry', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const oppId = parseInt(req.params.id);
      if (isNaN(oppId)) return res.status(400).json({ message: 'Invalid opportunity ID' });
      const { personalNote } = req.body || {};

      const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, oppId));
      if (!opp) return res.status(404).json({ message: 'Opportunity not found' });

      const token = opp.inquiryToken || randomBytes(24).toString('base64url');
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const inquiryUrl = `${proto}://${host}/inquire?opp=${token}`;

      const template = inquiryInvitationEmail({
        customerFirstName: opp.firstName,
        eventType: opp.eventType,
        eventDate: opp.eventDate,
        inquiryUrl,
        personalNote: personalNote || undefined,
      });

      // Await email so we can report delivery status
      const emailResult = await sendEmail({
        to: opp.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        templateKey: 'inquiry_invitation',
        opportunityId: oppId,
      });

      if (!emailResult.sent && !emailResult.skipped) {
        return res.status(502).json({
          message: `Email failed to send: ${emailResult.error || 'unknown error'}`,
          emailError: emailResult.error,
        });
      }

      // Only stamp sent + update status after successful send (or skip)
      const newStatus = opp.status === 'new' ? 'contacted' : opp.status;
      const statusHistory = Array.isArray(opp.statusHistory) ? [...opp.statusHistory] : [];
      if (newStatus !== opp.status) {
        statusHistory.push({
          status: newStatus,
          changedAt: new Date().toISOString(),
          changedBy: req.session.userId,
        });
      }

      await db.update(opportunities).set({
        inquiryToken: token,
        inquirySentAt: new Date(),
        status: newStatus,
        statusChangedAt: newStatus !== opp.status ? new Date() : opp.statusChangedAt,
        statusHistory,
        updatedAt: new Date(),
      }).where(eq(opportunities.id, oppId));

      return res.json({
        message: 'Inquiry sent',
        inquiryUrl,
        token,
        emailSent: emailResult.sent,
        emailSkipped: emailResult.skipped,
      });
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

      const linkedInquiries = await db.select().from(inquiries).where(eq(inquiries.opportunityId, oppId));
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

  // ===== Inquiry Invites (Mike-initiated manual invitations) =====
  // Flow: Mike meets a lead offline → fills name/email/phone on /clients →
  // POST creates an invite row with unguessable token + sends via email and/or SMS.
  // Customer opens /inquire?invite=<token> → Inquire.tsx prefills + submits
  // with invite token → backend links the resulting inquiries row to the invite.

  app.post('/api/inquiry-invites', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().optional().nullable(),
        email: z.string().trim().email(),
        phone: z.string().trim().optional().nullable(),
        eventType: z.string().trim().optional().nullable(),
        notes: z.string().trim().optional().nullable(),
        clientId: z.number().int().optional().nullable(),
        sendViaEmail: z.boolean().default(true),
        sendViaSms: z.boolean().default(false),
        personalNote: z.string().trim().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid invite payload', errors: parsed.error.format() });
      }
      const body = parsed.data;
      if (body.sendViaSms && !body.phone) {
        return res.status(400).json({ message: 'Phone required to send via SMS' });
      }
      if (!body.sendViaEmail && !body.sendViaSms) {
        return res.status(400).json({ message: 'Must send via at least one channel' });
      }

      const token = randomBytes(24).toString('base64url');
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const inquiryUrl = `${proto}://${host}/inquire?invite=${token}`;

      const [invite] = await db.insert(inquiryInvites).values({
        token,
        firstName: body.firstName,
        lastName: body.lastName || null,
        email: body.email,
        phone: body.phone || null,
        eventType: body.eventType || null,
        notes: body.notes || null,
        clientId: body.clientId || null,
        sentViaEmail: false,
        sentViaSms: false,
        createdBy: req.session.userId,
      }).returning();

      // Fire email (await so we can report delivery status)
      let emailSent = false;
      let emailError: string | undefined;
      if (body.sendViaEmail) {
        const template = inquiryInvitationEmail({
          customerFirstName: body.firstName,
          eventType: body.eventType || 'event',
          eventDate: null,
          inquiryUrl,
          personalNote: body.personalNote,
        });
        const result = await sendEmail({
          to: body.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          templateKey: 'inquiry_invitation_manual',
          clientId: body.clientId || undefined,
        });
        emailSent = result.sent;
        if (!result.sent && !result.skipped) emailError = result.error;
      }

      // Fire SMS in background — failures don't block the response
      let smsQueued = false;
      if (body.sendViaSms && body.phone) {
        const sms = inquiryInviteCustomerSms({
          firstName: body.firstName,
          inquiryUrl,
        });
        sendSmsInBackground({
          to: body.phone,
          body: sms.body,
          templateKey: 'inquiry_invitation_manual',
          clientId: body.clientId || undefined,
        });
        smsQueued = true;
      }

      // Stamp the invite with the channels that actually fired
      await db.update(inquiryInvites).set({
        sentViaEmail: emailSent,
        sentViaSms: smsQueued,
      }).where(eq(inquiryInvites.id, invite.id));

      return res.json({
        id: invite.id,
        token,
        inquiryUrl,
        emailSent,
        emailError,
        smsQueued,
      });
    } catch (error) {
      console.error('Error creating inquiry invite:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin list — sent invites with view/submit state for dashboard visibility
  app.get('/api/inquiry-invites', isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(inquiryInvites).orderBy(inquiryInvites.sentAt);
      return res.json(rows.reverse());
    } catch (error) {
      console.error('Error listing inquiry invites:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: prefill + mark-viewed on first open
  app.get('/api/public/inquiry-invite/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const [invite] = await db.select().from(inquiryInvites).where(eq(inquiryInvites.token, token));
      if (!invite) return res.status(404).json({ message: 'Invite not found' });

      if (!invite.viewedAt) {
        await db.update(inquiryInvites).set({ viewedAt: new Date() }).where(eq(inquiryInvites.id, invite.id));
      }

      return res.json({
        token: invite.token,
        firstName: invite.firstName,
        lastName: invite.lastName,
        email: invite.email,
        phone: invite.phone,
        eventType: invite.eventType,
        notes: invite.notes,
        alreadySubmitted: !!invite.submittedAt,
      });
    } catch (error) {
      console.error('Error fetching invite:', error);
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

      // Auto-derive themeKey when the menu is being published to the inquiry
      // form without one. The inquiry Step 4 picker filters by themeKey, so a
      // menu with displayOnCustomerForm=true but themeKey=null would silently
      // fail to appear. Derive from the menu name on the first publish.
      if (updateData.displayOnCustomerForm === true && !updateData.themeKey) {
        const existing = await storage.getMenu(menuId);
        if (existing && !existing.themeKey) {
          const nameForSlug = updateData.name ?? existing.name ?? "";
          const slug = nameForSlug
            .toLowerCase()
            .replace(/[\s\-]+/g, "_")
            .replace(/[^a-z0-9_]/g, "")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
          if (slug) {
            dataToStore.themeKey = slug;
            console.log(
              `[menus] auto-derived themeKey="${slug}" for menu #${menuId} on first publish`,
            );
          }
        }
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

      // Auto-seed contact identifiers from primary email/phone
      try {
        await storage.seedClientIdentifiers(newClient.id, newClient.email, newClient.phone);
      } catch (seedErr) {
        console.error('Warning: failed to seed identifiers for new client:', seedErr);
      }

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
  
  // ===== Quotes Routes =====
  
  // Get all quotes
  app.get('/api/quotes', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const quotes = await storage.listQuotes();

      // Filter financial data for non-admin users
      const user = await storage.getUser(req.session.userId!);
      const filtered = filterQuotes(quotes, user!.role);

      res.status(200).json(filtered);
    } catch (error) {
      console.error('Error getting quotes:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get a specific quote
  // `:id(\\d+)` forces numeric match so non-numeric sub-paths (e.g. /venues,
  // /promo-codes) fall through to the public quoteRoutes sub-router mounted
  // later in index.ts.
  app.get('/api/quotes/:id(\\d+)', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);

      if (isNaN(quoteId)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
      }

      const quote = await storage.getQuote(quoteId);

      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      // Filter financial data for non-admin users
      const user = await storage.getUser(req.session.userId!);
      const filtered = filterQuote(quote, user!.role);

      res.status(200).json(filtered);
    } catch (error) {
      console.error('Error getting quote:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Admin preview of the customer-facing quote page. Returns the same
  // { quote, client, proposal } shape as the public token endpoint so the
  // admin UI can render the identical QuoteProposalView component. Auth-gated
  // to any logged-in user; no view token required.
  app.get('/api/quotes/:id/preview', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
      }

      const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
      const proposal = await resolveProposalForQuote(quote, client ?? null);

      return res.status(200).json({
        quote: sanitizeQuoteForPublic(quote),
        client: client ? sanitizeClientForPublic(client) : null,
        proposal,
      });
    } catch (error) {
      console.error('Error fetching quote preview:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Tier 3: Admin PDF download
  app.get('/api/quotes/:id/pdf', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) return res.status(400).json({ message: 'Invalid quote ID' });

      const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
      if (!quote) return res.status(404).json({ message: 'Quote not found' });
      if (!quote.proposal) return res.status(400).json({ message: 'No proposal to generate PDF from' });

      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
      const { generateQuotePDF } = await import('./services/pdfGenerator');
      const pdf = await generateQuotePDF(quote.proposal as any, quote, client);

      const lastName = client?.lastName || 'Quote';
      const dateStr = quote.eventDate ? new Date(quote.eventDate).toISOString().split('T')[0] : 'undated';
      const filename = `HomeBites-Quote-${lastName}-${dateStr}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdf);
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // Admin: save just the proposal blob for an quote. Used by the customize
  // drawer. Separate from the generic PATCH to avoid tangling with the legacy
  // QuoteForm's line-item-focused save path.
  app.patch('/api/quotes/:id/proposal', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
      }

      const proposal = req.body.proposal ?? req.body;
      const changeNote = req.body.changeNote as string | undefined;

      if (!proposal || typeof proposal !== 'object' || proposal.version !== 1) {
        return res.status(400).json({ message: 'Invalid proposal payload' });
      }

      // Tier 3: Snapshot current version before overwriting
      const [existing] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
      if (!existing) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      if (existing.proposal) {
        await storage.createQuoteVersion({
          quoteId,
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
        .update(quotes)
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
        .where(eq(quotes.id, quoteId))
        .returning();

      return res.status(200).json({
        quote: sanitizeQuoteForPublic(updated),
        proposal: updated.proposal,
        version: nextVersion,
      });
    } catch (error) {
      console.error('Error updating proposal:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Tier 3: Get version history for an quote
  app.get('/api/quotes/:id/versions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) return res.status(400).json({ message: 'Invalid quote ID' });

      const versions = await storage.getQuoteVersions(quoteId);
      const quote = await storage.getQuote(quoteId);

      res.status(200).json({
        currentVersion: quote?.currentVersion || 1,
        versions,
      });
    } catch (error) {
      console.error('Error getting quote versions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create a new quote
  app.post('/api/quotes', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      
      const newQuote = await storage.createQuote(quoteData);
      
      res.status(201).json(newQuote);
    } catch (error) {
      console.error('Error creating quote:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update an quote
  app.patch('/api/quotes/:id(\\d+)', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
      }
      
      const updateData = req.body;
      
      const updatedQuote = await storage.updateQuote(quoteId, updateData);
      
      if (!updatedQuote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      res.status(200).json(updatedQuote);
    } catch (error) {
      console.error('Error updating quote:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Accept an quote — graduates the linked client from 'prospect' to 'customer'
  // and auto-creates a confirmed Event row so the chef has a prep surface the moment
  // the deal closes. Idempotent: if an event already exists for this quote, we skip
  // the creation step and return the existing one.
  app.post('/api/quotes/:id/accept', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
      }

      const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      const now = new Date();
      const [updatedQuote] = await db
        .update(quotes)
        .set({ status: 'accepted', acceptedAt: now, updatedAt: now })
        .where(eq(quotes.id, quoteId))
        .returning();

      // Graduate the linked client from prospect → customer
      const [updatedClient] = await db
        .update(clients)
        .set({ type: 'customer', updatedAt: now })
        .where(eq(clients.id, quote.clientId))
        .returning();

      // Ensure contact identifiers exist for matching engine
      if (updatedClient) {
        try {
          await storage.seedClientIdentifiers(updatedClient.id, updatedClient.email, updatedClient.phone);
        } catch (seedErr) {
          console.error('Warning: failed to seed identifiers on quote accept:', seedErr);
        }
      }

      // Auto-create (or fetch existing) Event row for this quote
      const [existingEvent] = await db.select().from(events).where(eq(events.quoteId, quoteId));
      let createdEvent = existingEvent ?? null;

      if (!existingEvent) {
        // Find the originating quote request so we can use its time/venue details
        const [originatingQuote] = await db
          .select()
          .from(inquiries)
          .where(eq(inquiries.quoteId, quoteId));

        // Compose start/end timestamps. Quote request stores them as text ("14:00") — combine
        // with the event date to get real timestamps. Fall back to noon + 4h if missing.
        const eventDate = quote.eventDate ?? now;
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
          quote.venue ||
          originatingQuote?.venueName ||
          (originatingQuote?.venueAddress as any)?.street ||
          'Venue TBD';
        const guestCount = quote.guestCount ?? originatingQuote?.guestCount ?? 1;

        [createdEvent] = await db
          .insert(events)
          .values({
            clientId: quote.clientId,
            quoteId: quote.id,
            eventDate,
            startTime,
            endTime,
            eventType: quote.eventType,
            guestCount,
            venue: venueText,
            menuId: quote.menuId ?? null,
            status: 'confirmed',
            notes: quote.notes ?? null,
            completedTasks: [],
            viewToken: randomBytes(24).toString('base64url'),
          } as any)
          .returning();
      }

      return res.status(200).json({
        message: existingEvent
          ? 'Quote re-accepted; existing event retained'
          : 'Quote accepted; client graduated to customer and event created',
        quote: updatedQuote,
        client: updatedClient,
        event: createdEvent,
        eventAlreadyExisted: !!existingEvent,
      });
    } catch (error) {
      console.error('Error accepting quote:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Send a quote to the customer — bumps status draft→sent, stamps sentAt,
  // lazily issues a viewToken (unguessable base64url) if one doesn't exist,
  // and (if RESEND_API_KEY is configured) fires an automated email with the
  // public URL. When Resend is not configured, the response still includes
  // publicUrl and the UI falls back to the mailto draft flow.
  app.post('/api/quotes/:id/send', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
      }

      const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      const now = new Date();
      const viewToken = quote.viewToken || randomBytes(24).toString('base64url');

      const [updated] = await db
        .update(quotes)
        .set({
          status: 'sent',
          sentAt: quote.sentAt ?? now,
          viewToken,
          updatedAt: now,
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      // Build the public URL using the request's own origin so it works in any env
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || req.protocol;
      const publicUrl = `${proto}://${host}/quote/${viewToken}`;

      // Fetch the client so we can send the email
      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));

      let emailSent = false;
      let emailSkipped = true;
      let emailRecipient: string | null = null;
      if (client?.email) {
        emailRecipient = client.email;
        const template = quoteSentEmail({
          customerFirstName: client.firstName || 'there',
          eventType: quote.eventType,
          eventDate: quote.eventDate,
          guestCount: quote.guestCount,
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
        quote: updated,
        publicUrl,
        emailSent,
        emailSkipped,
        emailRecipient,
      });
    } catch (error) {
      console.error('Error sending quote:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Decline an quote (admin-triggered — e.g. Mike declines on behalf of a customer
  // who responded by email instead of clicking the public link)
  app.post('/api/quotes/:id/decline', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
      }

      const now = new Date();
      const [updated] = await db
        .update(quotes)
        .set({
          status: 'declined',
          declinedAt: now,
          declinedReason: typeof req.body?.reason === 'string' ? req.body.reason : null,
          updatedAt: now,
        })
        .where(eq(quotes.id, quoteId))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      return res.status(200).json(updated);
    } catch (error) {
      console.error('Error declining quote:', error);
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

  // Sanitize an quote row for public consumption. Strips internal fields
  // like createdBy. Intentionally does NOT include the proposal blob — that's
  // returned as a separate top-level field on the response so the client
  // treats it as the source of truth for rendering.
  const sanitizeQuoteForPublic = (e: typeof quotes.$inferSelect) => ({
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
    // P0-2: "I need more info" state
    infoRequestedAt: e.infoRequestedAt,
    infoRequestNote: e.infoRequestNote,
    consultationBookedAt: e.consultationBookedAt,
    consultationMeetingUrl: e.consultationMeetingUrl,
  });

  // Resolve (and lazily hydrate) the proposal for an quote. New quotes
  // have quote.proposal populated at creation time; legacy quotes don't,
  // so we fall back to building one from the originating inquiry (or
  // from the quote alone if there isn't one) and persist the result so
  // subsequent reads are cheap and the admin can edit it.
  async function resolveProposalForQuote(
    quote: typeof quotes.$inferSelect,
    client: typeof clients.$inferSelect | null,
  ): Promise<Proposal> {
    if (quote.proposal) {
      return quote.proposal as Proposal;
    }

    const [originatingQuote] = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.quoteId, quote.id));

    const proposal = originatingQuote
      ? await buildProposalFromInquiry(originatingQuote, quote)
      : buildProposalFromQuoteAlone(quote, client);

    // Persist so future reads (and admin edits) use the same blob.
    await db
      .update(quotes)
      .set({ proposal: proposal as any, updatedAt: new Date() })
      .where(eq(quotes.id, quote.id));

    return proposal;
  }

  // Public: fetch a quote by its view token.
  //
  // Tier 3: Public PDF download by token (no auth — customer can download their quote)
  app.get('/api/public/quote/:token/pdf', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      if (!token || token.length < 10) return res.status(400).json({ message: 'Invalid token' });

      const [quote] = await db.select().from(quotes).where(eq(quotes.viewToken, token));
      if (!quote) return res.status(404).json({ message: 'Quote not found' });
      if (!quote.proposal) return res.status(400).json({ message: 'No proposal available' });

      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
      const { generateQuotePDF } = await import('./services/pdfGenerator');
      const pdf = await generateQuotePDF(quote.proposal as any, quote, client);

      const lastName = client?.lastName || 'Quote';
      const dateStr = quote.eventDate ? new Date(quote.eventDate).toISOString().split('T')[0] : 'undated';
      const filename = `HomeBites-Quote-${lastName}-${dateStr}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdf);
    } catch (error) {
      console.error('Error generating public PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // Returns the Proposal blob stored on quote.proposal — this is the
  // single source of truth for the customer-facing page.
  app.get('/api/public/quote/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      if (!token || token.length < 10) {
        return res.status(400).json({ message: 'Invalid token' });
      }

      const [quote] = await db.select().from(quotes).where(eq(quotes.viewToken, token));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
      const proposal = await resolveProposalForQuote(quote, client ?? null);

      // Public-safe slice of site config so the quote page can personalize the
      // chef note, contact info, and social links without another round-trip.
      const site = getSiteConfig();
      const sitePublic = {
        businessName: site.businessName,
        tagline: site.tagline,
        phone: site.phone,
        email: site.email,
        website: site.website,
        chef: {
          firstName: site.chef.firstName,
          lastName: site.chef.lastName,
          role: site.chef.role,
          bio: site.chef.bio,
          photoUrl: site.chef.photoUrl,
          phone: site.chef.phone,
          email: site.chef.email,
        },
        social: site.social,
      };

      // First-view-wins: stamp viewedAt the first time the customer loads the
      // quote. Kept as a side-effect of the GET (not a separate POST) so tracking
      // doesn't depend on the frontend remembering to call /view. Fire-and-forget
      // so the admin notification doesn't slow the customer's page load.
      if (!quote.viewedAt) {
        stampQuoteViewedInBackground(quote).catch((err) =>
          console.warn(`[quote-view] stamp failed for quote ${quote.id}:`, err)
        );
      }

      return res.status(200).json({
        quote: sanitizeQuoteForPublic(quote),
        client: client ? sanitizeClientForPublic(client) : null,
        proposal,
        site: sitePublic,
      });
    } catch (error) {
      console.error('Error fetching public quote:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: stamp viewedAt the first time the customer opens the quote.
  // Kept as an explicit endpoint so the frontend can signal a view independently
  // of the GET (e.g. after a non-cached render). GET /api/public/quote/:token
  // also stamps as a side-effect so tracking works even without this call.
  app.post('/api/public/quote/:token/view', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const [quote] = await db.select().from(quotes).where(eq(quotes.viewToken, token));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      await stampQuoteViewedInBackground(quote);
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
      const [quote] = await db.select().from(quotes).where(eq(quotes.viewToken, token));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      if (quote.status === 'declined') {
        return res.status(400).json({ message: 'This quote has already been declined.' });
      }

      const now = new Date();
      const [updatedQuote] = await db
        .update(quotes)
        .set({ status: 'accepted', acceptedAt: quote.acceptedAt ?? now, updatedAt: now })
        .where(eq(quotes.id, quote.id))
        .returning();

      // P1-2: pause drip — client accepted the quote
      await pauseOpportunityDrip(quote.opportunityId, 'quote_accepted');

      // Advance the linked opportunity to "booked" so the pipeline reflects
      // reality. Without this, the card is stuck in Qualified even though the
      // deal is won.
      if (quote.opportunityId) {
        await db
          .update(opportunities)
          .set({
            status: 'booked' as any,
            statusChangedAt: now,
            updatedAt: now,
          })
          .where(eq(opportunities.id, quote.opportunityId));
      }

      // Graduate the client → customer
      await db
        .update(clients)
        .set({ type: 'customer', updatedAt: now })
        .where(eq(clients.id, quote.clientId));

      // Auto-create an event if one doesn't already exist for this quote
      const [existingEvent] = await db.select().from(events).where(eq(events.quoteId, quote.id));
      if (!existingEvent) {
        const [originatingQuote] = await db
          .select()
          .from(inquiries)
          .where(eq(inquiries.quoteId, quote.id));

        const eventDate = quote.eventDate ?? now;
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
          clientId: quote.clientId,
          quoteId: quote.id,
          opportunityId: quote.opportunityId ?? null,
          inquiryId: originatingQuote?.id ?? null,
          totalCents: quote.total ?? null,
          eventDate,
          startTime,
          endTime,
          eventType: quote.eventType,
          guestCount: quote.guestCount ?? originatingQuote?.guestCount ?? 1,
          venue:
            quote.venue ||
            originatingQuote?.venueName ||
            (originatingQuote?.venueAddress as any)?.street ||
            (typeof originatingQuote?.venueAddress === 'string'
              ? originatingQuote?.venueAddress
              : null) ||
            'Venue TBD',
          menuId: quote.menuId ?? null,
          status: 'confirmed',
          notes: quote.notes ?? null,
          completedTasks: [],
          viewToken: randomBytes(24).toString('base64url'),
        } as any);
      }

      // Find the event (freshly created or pre-existing) so we can return the public URL
      const [eventForResponse] = await db
        .select()
        .from(events)
        .where(eq(events.quoteId, quote.id));

      // P2-1: auto-create a draft contract so the admin can "Send contract"
      // without an extra click. Moved AFTER event creation so the contract's
      // event_id gets populated. Errors don't block the accept.
      try {
        await ensureContractForQuote(quote.id);
      } catch (contractErr) {
        console.warn(`[p2-1] failed to auto-create contract for quote ${quote.id}:`, contractErr);
      }

      // Mint a portal magic-link token so the customer can land directly in
      // /my-events after accepting (Option A). Email magic links still work in
      // parallel — this just removes the email dependency from the immediate
      // post-accept flow.
      const { clientMagicLinks } = await import('@shared/schema');
      const portalToken = randomBytes(32).toString('base64url');
      const portalExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h
      try {
        await db.insert(clientMagicLinks).values({
          clientId: quote.clientId,
          token: portalToken,
          expiresAt: portalExpiresAt,
        } as any);
      } catch (linkErr) {
        console.warn(`[accept] failed to mint portal magic link for quote ${quote.id}:`, linkErr);
      }

      // Compose the customer event URL + portal URL from the request origin
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || req.protocol;
      const eventPublicUrl = eventForResponse?.viewToken
        ? `${proto}://${host}/event/${eventForResponse.viewToken}`
        : null;
      const portalUrl = `${proto}://${host}/my-events?token=${portalToken}`;

      // Fire customer + admin notifications. Fire-and-forget so the customer's
      // response isn't delayed by email latency.
      try {
        const [acceptingClient] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
        if (acceptingClient?.email) {
          const customerTemplate = quoteAcceptedCustomerEmail({
            customerFirstName: acceptingClient.firstName || 'there',
            eventType: quote.eventType,
            eventDate: quote.eventDate,
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
          eventType: quote.eventType,
          eventDate: quote.eventDate,
          totalCents: quote.total,
          adminEventUrl,
        });
        sendEmailInBackground({
          to: emailCfg.adminNotificationEmail,
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          text: adminTemplate.text,
          clientId: quote.clientId,
          eventId: eventForResponse?.id ?? null,
          templateKey: 'quote_accepted_admin',
        });
      } catch (notifyError) {
        console.warn('Failed to fire quote-accepted notifications:', notifyError);
      }

      return res.status(200).json({
        ok: true,
        quote: sanitizeQuoteForPublic(updatedQuote),
        eventPublicUrl,
        portalUrl,
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
      const [quote] = await db.select().from(quotes).where(eq(quotes.viewToken, token));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      if (quote.status === 'accepted') {
        return res.status(400).json({ message: 'This quote has already been accepted.' });
      }

      // Accept both the legacy single-`reason` payload AND the flattened
      // P0-3 payload `{ category, notes }`. When category is present, we
      // capture the structured decline reason in one pass and skip the
      // magic-link follow-up email.
      const bodySchema = z.object({
        reason: z.string().max(2000).optional().nullable(),
        category: z.enum(['pricing', 'menu', 'timing', 'other']).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
      });
      const body = bodySchema.parse(req.body || {});
      const now = new Date();
      const category = body.category ?? null;
      const notes = body.notes ?? body.reason ?? null;
      const reason = notes;
      const hasStructuredFeedback = !!category;

      // P0-3: always mint a feedback magic-link token so /decline-feedback/:token
      // still resolves even when feedback was submitted up-front (backward-compat
      // for anyone clicking an older decline email).
      const feedbackToken = quote.declineFeedbackToken || randomBytes(24).toString('base64url');

      const [updated] = await db
        .update(quotes)
        .set({
          status: 'declined',
          declinedAt: now,
          declinedReason: reason,
          declineFeedbackToken: feedbackToken,
          // When structured feedback came in, stamp it right away so admin
          // reporting shows this decline in its aggregate bucket immediately.
          ...(hasStructuredFeedback
            ? {
                declineCategory: category,
                declineFeedbackSubmittedAt: now,
              }
            : {}),
          updatedAt: now,
        })
        .where(eq(quotes.id, quote.id))
        .returning();

      // P1-2: pause drip — client declined the quote
      await pauseOpportunityDrip(quote.opportunityId, 'quote_declined');

      // Notifications (fire-and-forget)
      try {
        const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
        const emailCfg = getEmailConfig();
        const customerName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'A client';

        // Only send the magic-link feedback email when we DON'T already have
        // structured feedback. With flattening, the email is skipped for the
        // common case where the customer picked a category inline.
        if (!hasStructuredFeedback && client?.email) {
          const feedbackUrl = `${emailCfg.publicBaseUrl}/decline-feedback/${feedbackToken}`;
          const clientTemplate = quoteDeclinedFeedbackEmail({
            customerFirstName: client.firstName || 'there',
            eventType: quote.eventType,
            feedbackUrl,
          });
          sendEmailInBackground({
            to: client.email,
            subject: clientTemplate.subject,
            html: clientTemplate.html,
            text: clientTemplate.text,
            clientId: client.id,
            opportunityId: quote.opportunityId ?? null,
            templateKey: 'quote_declined_feedback',
          });
        }

        // Decline SMS to owner — always fires, now includes category when known
        sendOwnerSmsInBackground({
          ...quoteDeclinedOwnerSms({
            customerName,
            eventDate: quote.eventDate,
            reason: category ? `${category}${notes ? ` — ${notes}` : ''}` : reason,
            quoteId: quote.id,
          }),
          templateKey: 'quote_declined_owner_alert',
          clientId: quote.clientId,
          opportunityId: quote.opportunityId ?? null,
        });

        // When structured feedback came in up-front, also fire the owner's
        // "consider re-engaging" email immediately (it would normally fire
        // only after the customer submitted the magic-link form).
        if (hasStructuredFeedback && category) {
          const adminUrl = `${emailCfg.publicBaseUrl}/quotes/${quote.id}`;
          const ownerTemplate = declineFeedbackOwnerEmail({
            customerName,
            customerEmail: client?.email || 'unknown',
            eventType: quote.eventType,
            eventDate: quote.eventDate,
            category,
            notes,
            adminQuoteUrl: adminUrl,
          });
          sendEmailInBackground({
            to: emailCfg.adminNotificationEmail,
            subject: ownerTemplate.subject,
            html: ownerTemplate.html,
            text: ownerTemplate.text,
            clientId: quote.clientId,
            opportunityId: quote.opportunityId ?? null,
            templateKey: 'decline_feedback_owner_alert',
          });
          sendOwnerSmsInBackground({
            ...declineFeedbackOwnerSms({
              customerName,
              category,
              quoteId: quote.id,
            }),
            templateKey: 'decline_feedback_owner_alert',
            clientId: quote.clientId,
            opportunityId: quote.opportunityId ?? null,
          });
        }
      } catch (notifyError) {
        console.warn('Failed to fire decline notifications:', notifyError);
      }

      return res.status(200).json({
        ok: true,
        quote: sanitizeQuoteForPublic(updated),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid body', errors: error.errors });
      }
      console.error('Error declining public quote:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== P0-3: Public decline-feedback form =====

  // Returns minimal info needed to render the feedback form (no PII beyond first name + event)
  app.get('/api/public/decline-feedback/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const [quote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.declineFeedbackToken, token));
      if (!quote) {
        return res.status(404).json({ message: 'Not found' });
      }
      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
      return res.json({
        firstName: client?.firstName || null,
        eventType: quote.eventType,
        eventDate: quote.eventDate,
        alreadySubmitted: !!quote.declineFeedbackSubmittedAt,
        category: quote.declineCategory,
      });
    } catch (error) {
      console.error('Error fetching decline feedback:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Records the client's categorized decline reason. Idempotent — latest write wins.
  app.post('/api/public/decline-feedback/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const bodySchema = z.object({
        category: z.enum(['pricing', 'menu', 'timing', 'other']),
        notes: z.string().max(2000).optional().nullable(),
      });
      const { category, notes } = bodySchema.parse(req.body || {});

      const [quote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.declineFeedbackToken, token));
      if (!quote) {
        return res.status(404).json({ message: 'Not found' });
      }

      const now = new Date();
      await db
        .update(quotes)
        .set({
          declineCategory: category,
          declinedReason: notes ?? quote.declinedReason ?? null,
          declineFeedbackSubmittedAt: now,
          updatedAt: now,
        })
        .where(eq(quotes.id, quote.id));

      // Fire owner notification — email + SMS. Re-engage CTA surfaces in the
      // email body when the category is pricing/menu.
      try {
        const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
        const emailCfg = getEmailConfig();
        const customerName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'A client';
        const adminUrl = `${emailCfg.publicBaseUrl}/quotes/${quote.id}`;

        const ownerTemplate = declineFeedbackOwnerEmail({
          customerName,
          customerEmail: client?.email || 'unknown',
          eventType: quote.eventType,
          eventDate: quote.eventDate,
          category,
          notes: notes ?? null,
          adminQuoteUrl: adminUrl,
        });
        sendEmailInBackground({
          to: emailCfg.adminNotificationEmail,
          subject: ownerTemplate.subject,
          html: ownerTemplate.html,
          text: ownerTemplate.text,
          clientId: quote.clientId,
          opportunityId: quote.opportunityId ?? null,
          templateKey: 'decline_feedback_owner_alert',
        });

        sendOwnerSmsInBackground({
          ...declineFeedbackOwnerSms({
            customerName,
            category,
            quoteId: quote.id,
          }),
          templateKey: 'decline_feedback_owner_alert',
          clientId: quote.clientId,
          opportunityId: quote.opportunityId ?? null,
        });
      } catch (notifyError) {
        console.warn('Failed to fire decline-feedback notifications:', notifyError);
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid body', errors: error.errors });
      }
      console.error('Error submitting decline feedback:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== P1-3: Public Cal.com config (used by inquiry thank-you + any page
  // that wants to embed the calendar without a token context). Returns only
  // the raw embed URLs — no PII, no token. Safe for anonymous clients.
  app.get('/api/public/cal-config', async (_req: Request, res: Response) => {
    const cal = getCalComConfig();
    return res.json({
      consultationUrl: cal.consultationEmbedUrl,
      tastingUrl: cal.tastingEmbedUrl,
    });
  });

  // ===== P0-2: "I Need More Info" — client opens a conversation path =====

  // Public: surface Cal.com embed + state for the proposal page.
  // Frontend fetches this lazily when the user clicks "Need More Info."
  app.get('/api/public/quote/:token/booking-config', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const [quote] = await db.select().from(quotes).where(eq(quotes.viewToken, token));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
      const cal = getCalComConfig();

      // Build a pre-filled booking URL: pass name + email + a metadata flag
      // `quoteToken` so the webhook can round-trip back to the right quote.
      const buildUrl = (base: string | null): string | null => {
        if (!base) return null;
        try {
          const u = new URL(base);
          if (client?.firstName) u.searchParams.set('name', `${client.firstName} ${client.lastName || ''}`.trim());
          if (client?.email) u.searchParams.set('email', client.email);
          // Cal.com custom fields come through as query params that become form metadata
          u.searchParams.set('quoteToken', token);
          return u.toString();
        } catch {
          // If base isn't a valid URL, return it raw
          return base;
        }
      };

      return res.json({
        consultationUrl: buildUrl(cal.consultationEmbedUrl),
        tastingUrl: buildUrl(cal.tastingEmbedUrl),
        infoRequestedAt: quote.infoRequestedAt,
        consultationBookedAt: quote.consultationBookedAt,
        consultationMeetingUrl: quote.consultationMeetingUrl,
      });
    } catch (error) {
      console.error('Error fetching booking config:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: client clicked "I need more info" on the proposal. Stamps
  // infoRequestedAt + optional note, fires owner SMS + email, and returns the
  // booking URL so the frontend can present the calendar.
  app.post('/api/public/quote/:token/request-info', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const bodySchema = z.object({ note: z.string().max(2000).optional().nullable() });
      const { note } = bodySchema.parse(req.body || {});

      const [quote] = await db.select().from(quotes).where(eq(quotes.viewToken, token));
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }

      if (quote.status === 'accepted' || quote.status === 'declined') {
        return res.status(400).json({
          message: `This quote has already been ${quote.status}.`,
        });
      }

      const now = new Date();
      const [updated] = await db
        .update(quotes)
        .set({
          // Don't change status — stays 'viewed' so downstream logic (follow-up engine)
          // can see this as a pause-trigger without treating it as a terminal state.
          infoRequestedAt: quote.infoRequestedAt ?? now,
          infoRequestNote: note ?? quote.infoRequestNote ?? null,
          updatedAt: now,
        })
        .where(eq(quotes.id, quote.id))
        .returning();

      // P1-2: pause drip — client asked for more info (active engagement)
      await pauseOpportunityDrip(quote.opportunityId, 'info_requested');

      const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
      const cal = getCalComConfig();
      const emailCfg = getEmailConfig();

      // Pre-fill the booking URL with client info + round-trip token
      let bookingUrl: string | null = null;
      if (cal.consultationEmbedUrl) {
        try {
          const u = new URL(cal.consultationEmbedUrl);
          if (client?.firstName) u.searchParams.set('name', `${client.firstName} ${client.lastName || ''}`.trim());
          if (client?.email) u.searchParams.set('email', client.email);
          u.searchParams.set('quoteToken', token);
          bookingUrl = u.toString();
        } catch {
          bookingUrl = cal.consultationEmbedUrl;
        }
      }

      // Fire client acknowledgment email (fire-and-forget)
      if (client?.email && bookingUrl) {
        const clientTemplate = infoRequestedClientAckEmail({
          customerFirstName: client.firstName || 'there',
          eventType: quote.eventType,
          bookingUrl,
          note: note ?? null,
        });
        sendEmailInBackground({
          to: client.email,
          subject: clientTemplate.subject,
          html: clientTemplate.html,
          text: clientTemplate.text,
          clientId: client.id,
          opportunityId: quote.opportunityId ?? null,
          templateKey: 'info_requested_client_ack',
        });
      }

      // Fire owner email + SMS alert (fire-and-forget)
      try {
        const adminUrl = `${emailCfg.publicBaseUrl}/quotes/${quote.id}`;
        const customerName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'A client';
        const ownerTemplate = infoRequestedOwnerEmail({
          customerName,
          customerEmail: client?.email || 'unknown',
          customerPhone: client?.phone || null,
          eventType: quote.eventType,
          eventDate: quote.eventDate,
          note: note ?? null,
          adminQuoteUrl: adminUrl,
        });
        sendEmailInBackground({
          to: emailCfg.adminNotificationEmail,
          subject: ownerTemplate.subject,
          html: ownerTemplate.html,
          text: ownerTemplate.text,
          clientId: quote.clientId,
          opportunityId: quote.opportunityId ?? null,
          templateKey: 'info_requested_owner_alert',
        });

        sendOwnerSmsInBackground({
          ...infoRequestedOwnerSms({
            customerName,
            eventDate: quote.eventDate,
            note: note ?? null,
            quoteId: quote.id,
          }),
          templateKey: 'info_requested_owner_alert',
          clientId: quote.clientId,
          opportunityId: quote.opportunityId ?? null,
        });
      } catch (notifyError) {
        console.warn('Failed to fire info-requested notifications:', notifyError);
      }

      return res.status(200).json({
        ok: true,
        quote: sanitizeQuoteForPublic(updated),
        bookingUrl,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid body', errors: error.errors });
      }
      console.error('Error handling request-info:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== P0-2: Cal.com webhook — consultation booked / cancelled =====

  // Verify Cal.com webhook signature. Cal.com sends `x-cal-signature-256` as
  // a hex HMAC-SHA256 of the raw body using `CAL_COM_WEBHOOK_SECRET`.
  const verifyCalWebhook = (req: Request): boolean => {
    const cal = getCalComConfig();
    if (!cal.webhookSecret) {
      console.warn('[cal] webhook received but CAL_COM_WEBHOOK_SECRET is unset — accepting (INSECURE, dev only)');
      return true;
    }
    const provided = req.header('x-cal-signature-256') || req.header('x-cal-signature') || '';
    if (!provided) return false;
    try {
      const raw = (req as any).rawBody as Buffer | undefined;
      const payload = raw ? raw : Buffer.from(JSON.stringify(req.body));
      const expected = createHmac('sha256', cal.webhookSecret).update(payload).digest('hex');
      if (provided.length !== expected.length) return false;
      return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    } catch (err) {
      console.error('[cal] signature verification error:', err);
      return false;
    }
  };

  app.post('/api/cal-webhook', async (req: Request, res: Response) => {
    try {
      if (!verifyCalWebhook(req)) {
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }

      const triggerEvent = req.body?.triggerEvent as string | undefined;
      const payload = req.body?.payload || {};
      if (!triggerEvent) {
        return res.status(400).json({ message: 'Missing triggerEvent' });
      }

      const now = new Date();
      const sqCfg = getSquareConfig();

      // P1-1: Tasting branch — identify by event-type slug.
      // Cal.com puts the event type in different spots depending on version, so
      // check multiple locations.
      const eventTypeSlug: string =
        payload.eventType?.slug ||
        payload.eventType?.title?.toLowerCase?.() ||
        payload.type ||
        payload.eventTitle?.toLowerCase?.() ||
        '';
      const isTasting = eventTypeSlug.toLowerCase().includes(sqCfg.tastingEventSlug.toLowerCase());

      if (isTasting) {
        const scheduledAt = payload.startTime ? new Date(payload.startTime) : now;
        const attendee = Array.isArray(payload.attendees) ? payload.attendees[0] : null;
        const bookingUid: string = payload.uid || payload.bookingUid || payload.id || '';
        const email: string | null = attendee?.email || payload.responses?.email?.value || payload.responses?.email || null;
        const name: string = attendee?.name || payload.responses?.name?.value || payload.responses?.name || '';
        const phone: string | null = attendee?.phoneNumber || payload.responses?.phone?.value || payload.responses?.phone || null;
        const [firstName, ...rest] = name.trim().split(/\s+/);
        const lastName = rest.join(' ') || null;
        // Guest count — look for a custom question or fall back to 2 per spec
        const rawGuestCount: any =
          payload.responses?.guestCount?.value ??
          payload.responses?.guests?.value ??
          payload.responses?.guestCount ??
          2;
        const guestCount = Math.max(1, Math.min(10, Number(rawGuestCount) || 2));

        if (triggerEvent === 'BOOKING_CANCELLED') {
          // Cancel any tasting we previously created for this booking
          if (bookingUid) {
            await db
              .update(tastings)
              .set({ status: 'cancelled', updatedAt: now })
              .where(eq(tastings.calBookingUid, bookingUid));
          }
          return res.status(200).json({ ok: true, tasting: 'cancelled' });
        }

        if (triggerEvent === 'BOOKING_CREATED' || triggerEvent === 'BOOKING_RESCHEDULED') {
          // Try to link to an existing client/opportunity via email
          let linkedClientId: number | null = null;
          let linkedOpportunityId: number | null = null;
          if (email) {
            const [c] = await db.select().from(clients).where(eq(clients.email, email));
            if (c) linkedClientId = c.id;
            const [o] = await db.select().from(opportunities).where(eq(opportunities.email, email));
            if (o) linkedOpportunityId = o.id;
          }

          // Idempotency: if a tasting for this booking already exists, update it
          let tastingId: number;
          if (bookingUid) {
            const [existing] = await db
              .select()
              .from(tastings)
              .where(eq(tastings.calBookingUid, bookingUid));
            if (existing) {
              await db
                .update(tastings)
                .set({
                  scheduledAt,
                  guestCount,
                  status: 'scheduled',
                  firstName: firstName || existing.firstName,
                  lastName: lastName || existing.lastName,
                  email: email || existing.email,
                  phone: phone || existing.phone,
                  updatedAt: now,
                })
                .where(eq(tastings.id, existing.id));
              tastingId = existing.id;
            } else {
              const [inserted] = await db
                .insert(tastings)
                .values({
                  opportunityId: linkedOpportunityId,
                  clientId: linkedClientId,
                  firstName: firstName || null,
                  lastName,
                  email,
                  phone,
                  scheduledAt,
                  guestCount,
                  pricePerGuestCents: Math.round(sqCfg.tastingFlatPriceCents / guestCount),
                  totalPriceCents: sqCfg.tastingFlatPriceCents,
                  status: 'scheduled',
                  calBookingId: String(payload.id ?? ''),
                  calBookingUid: bookingUid,
                } as any)
                .returning();
              tastingId = inserted.id;
            }
          } else {
            // No uid — create fresh (can't dedup)
            const [inserted] = await db
              .insert(tastings)
              .values({
                opportunityId: linkedOpportunityId,
                clientId: linkedClientId,
                firstName: firstName || null,
                lastName,
                email,
                phone,
                scheduledAt,
                guestCount,
                pricePerGuestCents: Math.round(sqCfg.tastingFlatPriceCents / guestCount),
                totalPriceCents: sqCfg.tastingFlatPriceCents,
                status: 'scheduled',
              } as any)
              .returning();
            tastingId = inserted.id;
          }

          // Log as internal communication
          try {
            await db.insert(communications).values({
              type: 'meeting',
              direction: 'internal',
              timestamp: scheduledAt,
              source: 'cal_com',
              externalId: bookingUid || null,
              subject: `Tasting: ${name || email || 'booked via Cal.com'}`,
              bodySummary: `Guest count: ${guestCount}`,
              clientId: linkedClientId,
              opportunityId: linkedOpportunityId,
              metaData: {
                calTriggerEvent: triggerEvent,
                scheduledAt: scheduledAt.toISOString(),
                tastingId,
                rawPayload: payload,
              },
            } as any);
          } catch (logErr) {
            console.warn('[cal] failed to log tasting communication:', logErr);
          }

          // Fire Square Checkout link creation + customer payment email (fire-and-forget)
          const emailCfg = getEmailConfig();
          const baseUrl = emailCfg.publicBaseUrl.replace(/\/$/, '');
          if (email) {
            // Defer to avoid blocking webhook response
            (async () => {
              try {
                const customerName = `${firstName || ''} ${lastName || ''}`.trim() || 'Client';
                const link = await createCheckoutLink({
                  amountCents: sqCfg.tastingFlatPriceCents,
                  name: `Home Bites Tasting — ${customerName}`,
                  note: `Tasting on ${scheduledAt.toLocaleString()} · ${guestCount} guest(s)`,
                  redirectUrl: `${baseUrl}/tasting/thanks?tid=${tastingId}`,
                  referenceId: `tasting-${tastingId}`,
                  email,
                  phone,
                });
                if (link.created && link.paymentLinkUrl) {
                  await db
                    .update(tastings)
                    .set({
                      squarePaymentLinkId: link.paymentLinkId || null,
                      squarePaymentLinkUrl: link.paymentLinkUrl,
                      squareOrderId: link.orderId || null,
                      updatedAt: new Date(),
                    })
                    .where(eq(tastings.id, tastingId));

                  // Email customer the payment link
                  const tpl = tastingPaymentEmail({
                    customerFirstName: firstName || 'there',
                    scheduledAt,
                    guestCount,
                    totalPriceCents: sqCfg.tastingFlatPriceCents,
                    paymentUrl: link.paymentLinkUrl,
                  });
                  sendEmailInBackground({
                    to: email,
                    subject: tpl.subject,
                    html: tpl.html,
                    text: tpl.text,
                    clientId: linkedClientId,
                    opportunityId: linkedOpportunityId,
                    templateKey: 'tasting_payment_request',
                  });
                } else if (link.skipped) {
                  console.log(`[tasting ${tastingId}] Square unconfigured — booking scheduled without payment`);
                } else {
                  console.error(`[tasting ${tastingId}] Square error:`, link.error);
                }
              } catch (payErr) {
                console.error(`[tasting ${tastingId}] checkout link error:`, payErr);
              }
            })();
          }

          // Owner alerts (email + SMS)
          try {
            const customerName = `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
            const adminUrl = `${baseUrl}/admin/tastings/${tastingId}`;
            const ownerTpl = tastingBookedOwnerEmail({
              customerName,
              customerEmail: email,
              customerPhone: phone,
              scheduledAt,
              guestCount,
              totalPriceCents: sqCfg.tastingFlatPriceCents,
              adminUrl,
            });
            sendEmailInBackground({
              to: emailCfg.adminNotificationEmail,
              subject: ownerTpl.subject,
              html: ownerTpl.html,
              text: ownerTpl.text,
              clientId: linkedClientId,
              opportunityId: linkedOpportunityId,
              templateKey: 'tasting_booked_owner',
            });
            sendOwnerSmsInBackground({
              ...tastingBookedOwnerSms({
                customerName,
                scheduledAt,
                guestCount,
                tastingId,
              }),
              templateKey: 'tasting_booked_owner',
              clientId: linkedClientId,
              opportunityId: linkedOpportunityId,
            });
          } catch (notifyErr) {
            console.warn('[cal] failed to fire tasting owner alerts:', notifyErr);
          }

          return res.status(200).json({ ok: true, tastingId });
        }

        return res.status(200).json({ ok: true, ignored: true, reason: `tasting: unhandled ${triggerEvent}` });
      }

      // Extract quoteToken from Cal's metadata / responses. Cal.com puts
      // query-param prefills inside payload.responses or payload.metadata.
      const quoteToken: string | undefined =
        payload.metadata?.quoteToken ||
        payload.responses?.quoteToken?.value ||
        payload.responses?.quoteToken ||
        payload.additionalNotes?.quoteToken;

      if (!quoteToken) {
        console.warn(`[cal] webhook ${triggerEvent} without quoteToken — ignoring`);
        return res.status(200).json({ ok: true, ignored: true, reason: 'no quoteToken' });
      }

      const [quote] = await db
        .select()
        .from(quotes)
        .where(eq(quotes.viewToken, quoteToken));
      if (!quote) {
        console.warn(`[cal] webhook ${triggerEvent} for unknown quoteToken ${quoteToken}`);
        return res.status(200).json({ ok: true, ignored: true, reason: 'quote not found' });
      }

      if (triggerEvent === 'BOOKING_CREATED' || triggerEvent === 'BOOKING_RESCHEDULED') {
        const scheduledAt = payload.startTime ? new Date(payload.startTime) : now;
        const meetingUrl: string | null =
          payload.location?.link || payload.metadata?.videoCallUrl || payload.videoCallUrl || null;

        await db
          .update(quotes)
          .set({
            consultationBookedAt: scheduledAt,
            consultationMeetingUrl: meetingUrl,
            updatedAt: now,
          })
          .where(eq(quotes.id, quote.id));

        // P1-2: pause drip — client booked a consultation (definite engagement)
        await pauseOpportunityDrip(quote.opportunityId, 'consultation_booked');

        // Log the booking as a communication (meeting type)
        try {
          await db.insert(communications).values({
            type: 'meeting',
            direction: 'internal',
            timestamp: scheduledAt,
            source: 'cal_com',
            externalId: payload.uid || payload.id || null,
            subject: `Consultation: ${payload.title || 'Booked via Cal.com'}`,
            bodySummary: payload.additionalNotes || null,
            clientId: quote.clientId,
            opportunityId: quote.opportunityId ?? null,
            metaData: {
              calTriggerEvent: triggerEvent,
              scheduledAt: scheduledAt.toISOString(),
              meetingUrl,
              rawPayload: payload,
            },
          } as any);
        } catch (logErr) {
          console.warn('[cal] failed to log communication:', logErr);
        }

        // Owner SMS + email alert
        try {
          const [client] = await db.select().from(clients).where(eq(clients.id, quote.clientId));
          const emailCfg = getEmailConfig();
          const customerName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'A client';
          const adminUrl = `${emailCfg.publicBaseUrl}/quotes/${quote.id}`;

          const ownerEmail = consultationBookedOwnerEmail({
            customerName,
            scheduledAt,
            meetingUrl,
            adminQuoteUrl: adminUrl,
          });
          sendEmailInBackground({
            to: emailCfg.adminNotificationEmail,
            subject: ownerEmail.subject,
            html: ownerEmail.html,
            text: ownerEmail.text,
            clientId: quote.clientId,
            opportunityId: quote.opportunityId ?? null,
            templateKey: 'consultation_booked_owner',
          });

          sendOwnerSmsInBackground({
            ...consultationBookedOwnerSms({
              customerName,
              scheduledAt,
              quoteId: quote.id,
            }),
            templateKey: 'consultation_booked_owner',
            clientId: quote.clientId,
            opportunityId: quote.opportunityId ?? null,
          });
        } catch (notifyError) {
          console.warn('[cal] failed to fire booking notifications:', notifyError);
        }

        return res.status(200).json({ ok: true, quoteId: quote.id });
      }

      if (triggerEvent === 'BOOKING_CANCELLED') {
        await db
          .update(quotes)
          .set({
            consultationBookedAt: null,
            consultationMeetingUrl: null,
            updatedAt: now,
          })
          .where(eq(quotes.id, quote.id));
        return res.status(200).json({ ok: true, quoteId: quote.id, cleared: true });
      }

      // Unknown trigger — acknowledge but don't act
      return res.status(200).json({ ok: true, ignored: true, triggerEvent });
    } catch (error) {
      console.error('[cal] webhook error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== P1-1: Tasting endpoints =====

  // Public: fetch tasting details by id (used on the /tasting/thanks page).
  // No PII token scheme here — the id is opaque enough given the low volume,
  // and the page only shows scheduled time + guest count + payment state.
  app.get('/api/public/tastings/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid tasting id' });
      const [t] = await db.select().from(tastings).where(eq(tastings.id, id));
      if (!t) return res.status(404).json({ message: 'Not found' });
      return res.json({
        id: t.id,
        scheduledAt: t.scheduledAt,
        guestCount: t.guestCount,
        totalPriceCents: t.totalPriceCents,
        status: t.status,
        paid: !!t.paidAt,
        paidAt: t.paidAt,
        paymentUrl: t.squarePaymentLinkUrl,
        firstName: t.firstName,
      });
    } catch (error) {
      console.error('Error fetching tasting:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Public: (re)issue a Square checkout link for a tasting. Idempotent — if
  // we already have a link and it's unpaid, we return the existing one.
  app.post('/api/tastings/:id/checkout', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid tasting id' });
      const [t] = await db.select().from(tastings).where(eq(tastings.id, id));
      if (!t) return res.status(404).json({ message: 'Not found' });
      if (t.paidAt) {
        return res.status(400).json({ message: 'This tasting has already been paid for.' });
      }
      if (t.squarePaymentLinkUrl) {
        return res.json({ url: t.squarePaymentLinkUrl, reused: true });
      }

      const emailCfg = getEmailConfig();
      const customerName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Client';
      const link = await createCheckoutLink({
        amountCents: t.totalPriceCents,
        name: `Home Bites Tasting — ${customerName}`,
        note: `Tasting on ${new Date(t.scheduledAt).toLocaleString()} · ${t.guestCount} guest(s)`,
        redirectUrl: `${emailCfg.publicBaseUrl.replace(/\/$/, '')}/tasting/thanks?tid=${id}`,
        referenceId: `tasting-${id}`,
        email: t.email,
        phone: t.phone,
      });
      if (link.skipped) {
        return res.status(503).json({ message: 'Square is not configured on the server.' });
      }
      if (!link.created || !link.paymentLinkUrl) {
        return res.status(502).json({ message: link.error || 'Failed to create checkout link' });
      }

      await db
        .update(tastings)
        .set({
          squarePaymentLinkId: link.paymentLinkId || null,
          squarePaymentLinkUrl: link.paymentLinkUrl,
          squareOrderId: link.orderId || null,
          updatedAt: new Date(),
        })
        .where(eq(tastings.id, id));

      return res.json({ url: link.paymentLinkUrl, reused: false });
    } catch (error) {
      console.error('Error creating tasting checkout:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ===== Square Webhook =====
  // Listens for payment / order events. Signature-verified. Only action we take
  // today is marking tastings paid on payment.created / payment.updated when
  // the associated order references a known tasting.
  app.post('/api/webhooks/square', async (req: Request, res: Response) => {
    try {
      const signatureHeader =
        req.get('x-square-hmacsha256-signature') || req.get('x-square-signature') || '';
      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!verifySquareWebhook(rawBody ?? JSON.stringify(req.body ?? {}), signatureHeader)) {
        return res.status(401).json({ message: 'Invalid signature' });
      }

      const evt = req.body;
      const type = evt?.type as string | undefined;
      if (!type) return res.status(400).json({ message: 'Missing type' });

      // Square fires several events around a payment. We want to react once the
      // payment is COMPLETED. Check both payment.updated and order.fulfilled.
      const payment = evt?.data?.object?.payment;
      const order = evt?.data?.object?.order;
      const orderId: string | null =
        payment?.order_id || order?.id || evt?.data?.object?.order_id || null;
      const paymentId: string | null = payment?.id || evt?.data?.id || null;
      const paymentStatus: string | null = payment?.status || null;

      if (!orderId) {
        return res.status(200).json({ ok: true, ignored: true, reason: 'no orderId' });
      }

      // Only act when the payment reaches a successful terminal state.
      const isCompleted =
        type === 'payment.updated' && paymentStatus === 'COMPLETED';
      const isCreatedCompleted =
        type === 'payment.created' && paymentStatus === 'COMPLETED';
      const isOrderFulfilled = type === 'order.fulfilled';
      if (!isCompleted && !isCreatedCompleted && !isOrderFulfilled) {
        return res.status(200).json({ ok: true, ignored: true, reason: `status ${paymentStatus ?? type}` });
      }

      const now = new Date();

      // Route by orderId — it may belong to a tasting, an event deposit, or an
      // event balance. We check each in order and take the first match.
      const [t] = await db.select().from(tastings).where(eq(tastings.squareOrderId, orderId));
      if (t) {
        if (t.paidAt) {
          return res.status(200).json({ ok: true, alreadyPaid: true, tastingId: t.id });
        }
        await db
          .update(tastings)
          .set({ squarePaymentId: paymentId, paidAt: now, updatedAt: now })
          .where(eq(tastings.id, t.id));

        try {
          const customerName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Client';
          if (t.email) {
            const tpl = tastingPaidCustomerEmail({
              customerFirstName: t.firstName || 'there',
              scheduledAt: t.scheduledAt,
              guestCount: t.guestCount,
              totalPriceCents: t.totalPriceCents,
            });
            sendEmailInBackground({
              to: t.email,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
              clientId: t.clientId,
              opportunityId: t.opportunityId,
              templateKey: 'tasting_paid_customer',
            });
          }
          sendOwnerSmsInBackground({
            ...tastingPaidOwnerSms({
              customerName,
              totalPriceCents: t.totalPriceCents,
              tastingId: t.id,
            }),
            templateKey: 'tasting_paid_owner',
            clientId: t.clientId,
            opportunityId: t.opportunityId,
          });
        } catch (notifyErr) {
          console.warn('[square] tasting paid-notifications failed:', notifyErr);
        }
        return res.status(200).json({ ok: true, tastingId: t.id });
      }

      // P2-2: Event deposit
      const [evDep] = await db.select().from(events).where(eq(events.depositSquareOrderId, orderId));
      if (evDep) {
        if (evDep.depositPaidAt) {
          return res.status(200).json({ ok: true, alreadyPaid: true, eventId: evDep.id, kind: 'deposit' });
        }
        await db
          .update(events)
          .set({ depositSquarePaymentId: paymentId, depositPaidAt: now, updatedAt: now })
          .where(eq(events.id, evDep.id));

        try {
          const [client] = await db.select().from(clients).where(eq(clients.id, evDep.clientId));
          const emailCfg = getEmailConfig();
          const customerName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'Client';
          if (client?.email) {
            const tpl = paymentReceivedCustomerEmail({
              customerFirstName: client.firstName || 'there',
              eventType: evDep.eventType,
              eventDate: evDep.eventDate,
              amountCents: evDep.depositAmountCents || 0,
              paymentKind: 'deposit',
            });
            sendEmailInBackground({
              to: client.email,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
              clientId: client.id,
              eventId: evDep.id,
              templateKey: 'deposit_paid_customer',
            });
          }
          const ownerTpl = paymentReceivedOwnerEmail({
            customerName,
            amountCents: evDep.depositAmountCents || 0,
            paymentKind: 'deposit',
            eventId: evDep.id,
            adminUrl: `${emailCfg.publicBaseUrl}/events/${evDep.id}`,
          });
          sendEmailInBackground({
            to: emailCfg.adminNotificationEmail,
            subject: ownerTpl.subject,
            html: ownerTpl.html,
            text: ownerTpl.text,
            clientId: evDep.clientId,
            eventId: evDep.id,
            templateKey: 'deposit_paid_owner',
          });
          sendOwnerSmsInBackground({
            ...paymentReceivedOwnerSms({
              customerName,
              amountCents: evDep.depositAmountCents || 0,
              paymentKind: 'deposit',
              eventId: evDep.id,
            }),
            templateKey: 'deposit_paid_owner',
            clientId: evDep.clientId,
            eventId: evDep.id,
          });
        } catch (notifyErr) {
          console.warn('[square] deposit paid-notifications failed:', notifyErr);
        }
        return res.status(200).json({ ok: true, eventId: evDep.id, kind: 'deposit' });
      }

      // P2-2: Event balance
      const [evBal] = await db.select().from(events).where(eq(events.balanceSquareOrderId, orderId));
      if (evBal) {
        if (evBal.balancePaidAt) {
          return res.status(200).json({ ok: true, alreadyPaid: true, eventId: evBal.id, kind: 'balance' });
        }
        await db
          .update(events)
          .set({ balanceSquarePaymentId: paymentId, balancePaidAt: now, updatedAt: now })
          .where(eq(events.id, evBal.id));

        try {
          const [client] = await db.select().from(clients).where(eq(clients.id, evBal.clientId));
          const emailCfg = getEmailConfig();
          const customerName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'Client';
          if (client?.email) {
            const tpl = paymentReceivedCustomerEmail({
              customerFirstName: client.firstName || 'there',
              eventType: evBal.eventType,
              eventDate: evBal.eventDate,
              amountCents: evBal.balanceAmountCents || 0,
              paymentKind: 'balance',
            });
            sendEmailInBackground({
              to: client.email,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
              clientId: client.id,
              eventId: evBal.id,
              templateKey: 'balance_paid_customer',
            });
          }
          const ownerTpl = paymentReceivedOwnerEmail({
            customerName,
            amountCents: evBal.balanceAmountCents || 0,
            paymentKind: 'balance',
            eventId: evBal.id,
            adminUrl: `${emailCfg.publicBaseUrl}/events/${evBal.id}`,
          });
          sendEmailInBackground({
            to: emailCfg.adminNotificationEmail,
            subject: ownerTpl.subject,
            html: ownerTpl.html,
            text: ownerTpl.text,
            clientId: evBal.clientId,
            eventId: evBal.id,
            templateKey: 'balance_paid_owner',
          });
          sendOwnerSmsInBackground({
            ...paymentReceivedOwnerSms({
              customerName,
              amountCents: evBal.balanceAmountCents || 0,
              paymentKind: 'balance',
              eventId: evBal.id,
            }),
            templateKey: 'balance_paid_owner',
            clientId: evBal.clientId,
            eventId: evBal.id,
          });
        } catch (notifyErr) {
          console.warn('[square] balance paid-notifications failed:', notifyErr);
        }
        return res.status(200).json({ ok: true, eventId: evBal.id, kind: 'balance' });
      }

      console.warn(`[square] webhook for unknown orderId ${orderId}`);
      return res.status(200).json({ ok: true, ignored: true, reason: 'no matching record' });
    } catch (error) {
      console.error('[square] webhook error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================================================
  // P2-1: Contracts — BoldSign e-signature flow
  // ============================================================================

  // Helper: fire the deposit checkout link for an event (used by the contract
  // signed webhook, and also callable manually by admin via /api/events/:id/deposit/checkout).
  async function ensureEventDepositCheckout(eventId: number): Promise<{ url: string | null; error?: string }> {
    const [ev] = await db.select().from(events).where(eq(events.id, eventId));
    if (!ev) return { url: null, error: "event not found" };
    if (ev.depositPaidAt) return { url: ev.depositSquarePaymentLinkUrl, error: "already paid" };
    if (ev.depositSquarePaymentLinkUrl) return { url: ev.depositSquarePaymentLinkUrl };

    const [client] = await db.select().from(clients).where(eq(clients.id, ev.clientId));
    const [est] = ev.quoteId
      ? await db.select().from(quotes).where(eq(quotes.id, ev.quoteId))
      : [null as any];
    if (!est) return { url: null, error: "no quote — cannot determine amount" };

    const depositPercent = ev.depositPercent ?? getDepositPercent();
    const depositCents = Math.round((est.total * depositPercent) / 100);

    const emailCfg = getEmailConfig();
    const customerName = client ? `${client.firstName} ${client.lastName || ""}`.trim() : "Client";
    const link = await createCheckoutLink({
      amountCents: depositCents,
      name: `Home Bites ${est.eventType.replace(/_/g, " ")} — Deposit`,
      note: `${depositPercent}% deposit for ${ev.eventType} on ${new Date(ev.eventDate).toLocaleDateString()}`,
      redirectUrl: `${emailCfg.publicBaseUrl.replace(/\/$/, "")}/event/${ev.viewToken || ev.id}?paid=deposit`,
      referenceId: `event-deposit-${eventId}`,
      email: client?.email ?? null,
      phone: client?.phone ?? null,
    });
    if (link.skipped) return { url: null, error: "square not configured" };
    if (!link.created || !link.paymentLinkUrl) return { url: null, error: link.error || "link failed" };

    await db
      .update(events)
      .set({
        depositAmountCents: depositCents,
        depositSquarePaymentLinkId: link.paymentLinkId || null,
        depositSquarePaymentLinkUrl: link.paymentLinkUrl,
        depositSquareOrderId: link.orderId || null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    // Fire customer email with deposit link
    if (client?.email) {
      const tpl = depositRequestCustomerEmail({
        customerFirstName: client.firstName || "there",
        eventType: ev.eventType,
        eventDate: ev.eventDate,
        depositCents,
        paymentUrl: link.paymentLinkUrl,
      });
      sendEmailInBackground({
        to: client.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        clientId: client.id,
        eventId,
        templateKey: "deposit_request_customer",
      });
    }
    return { url: link.paymentLinkUrl };
  }

  async function ensureEventBalanceCheckout(eventId: number): Promise<{ url: string | null; error?: string }> {
    const [ev] = await db.select().from(events).where(eq(events.id, eventId));
    if (!ev) return { url: null, error: "event not found" };
    if (ev.balancePaidAt) return { url: ev.balanceSquarePaymentLinkUrl, error: "already paid" };
    if (ev.balanceSquarePaymentLinkUrl) return { url: ev.balanceSquarePaymentLinkUrl };

    const [client] = await db.select().from(clients).where(eq(clients.id, ev.clientId));
    const [est] = ev.quoteId
      ? await db.select().from(quotes).where(eq(quotes.id, ev.quoteId))
      : [null as any];
    if (!est) return { url: null, error: "no quote — cannot determine balance" };

    const depositPercent = ev.depositPercent ?? getDepositPercent();
    const depositCents = ev.depositAmountCents ?? Math.round((est.total * depositPercent) / 100);
    const balanceCents = Math.max(0, est.total - depositCents);

    const emailCfg = getEmailConfig();
    const link = await createCheckoutLink({
      amountCents: balanceCents,
      name: `Home Bites ${est.eventType.replace(/_/g, " ")} — Balance`,
      note: `Final balance for ${ev.eventType} on ${new Date(ev.eventDate).toLocaleDateString()}`,
      redirectUrl: `${emailCfg.publicBaseUrl.replace(/\/$/, "")}/event/${ev.viewToken || ev.id}?paid=balance`,
      referenceId: `event-balance-${eventId}`,
      email: client?.email ?? null,
      phone: client?.phone ?? null,
    });
    if (link.skipped) return { url: null, error: "square not configured" };
    if (!link.created || !link.paymentLinkUrl) return { url: null, error: link.error || "link failed" };

    await db
      .update(events)
      .set({
        balanceAmountCents: balanceCents,
        balanceSquarePaymentLinkId: link.paymentLinkId || null,
        balanceSquarePaymentLinkUrl: link.paymentLinkUrl,
        balanceSquareOrderId: link.orderId || null,
        balanceRequestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    if (client?.email) {
      const tpl = balanceRequestCustomerEmail({
        customerFirstName: client.firstName || "there",
        eventType: ev.eventType,
        eventDate: ev.eventDate,
        balanceCents,
        paymentUrl: link.paymentLinkUrl,
      });
      sendEmailInBackground({
        to: client.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        clientId: client.id,
        eventId,
        templateKey: "balance_request_customer",
      });
    }
    return { url: link.paymentLinkUrl };
  }

  // Admin: create-or-reuse a draft contract for an quote. Auto-called on
  // quote accept (no-op if one exists), and also callable manually.
  async function ensureContractForQuote(quoteId: number): Promise<{ id: number } | { error: string }> {
    const [est] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
    if (!est) return { error: "quote not found" };
    const [existing] = await db.select().from(contracts).where(eq(contracts.quoteId, quoteId));
    if (existing) return { id: existing.id };
    const [client] = await db.select().from(clients).where(eq(clients.id, est.clientId));
    if (!client) return { error: "client not found" };
    const [ev] = await db.select().from(events).where(eq(events.quoteId, quoteId));

    const [inserted] = await db
      .insert(contracts)
      .values({
        clientId: client.id,
        quoteId: est.id,
        eventId: ev?.id ?? null,
        status: "draft",
        contractSnapshot: est.proposal,
      } as any)
      .returning();
    return { id: inserted.id };
  }

  // GET contract(s) by quote — used by the admin UI
  app.get('/api/quotes/:id/contract', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) return res.status(400).json({ message: 'Invalid quote ID' });
      const [c] = await db.select().from(contracts).where(eq(contracts.quoteId, quoteId));
      return res.json(c || null);
    } catch (error) {
      console.error('Error fetching contract:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Admin action: generate contract HTML, send via BoldSign, stamp sentAt
  app.post('/api/quotes/:id/send-contract', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      if (isNaN(quoteId)) return res.status(400).json({ message: 'Invalid quote ID' });

      const [est] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
      if (!est) return res.status(404).json({ message: 'Quote not found' });
      const [client] = await db.select().from(clients).where(eq(clients.id, est.clientId));
      if (!client?.email) return res.status(400).json({ message: 'Client has no email address' });

      // Ensure the contract row exists
      const ensured = await ensureContractForQuote(quoteId);
      if ("error" in ensured) return res.status(400).json({ message: ensured.error });
      const contractId = ensured.id;

      const depositPercent = getDepositPercent();
      const html = generateContractHtml({
        clientName: `${client.firstName} ${client.lastName || ''}`.trim(),
        clientEmail: client.email,
        eventType: est.eventType,
        eventDate: est.eventDate,
        guestCount: est.guestCount,
        venue: est.venue,
        totalCents: est.total,
        depositPercent,
        proposal: (est.proposal as any) || null,
      });

      const site = getSiteConfig();
      const result = await sendContractForSignature({
        contractId,
        title: `${site.businessName} — ${est.eventType.replace(/_/g, ' ')} Contract`,
        message: `Please review and sign your catering contract with ${site.businessName}.`,
        signerName: `${client.firstName} ${client.lastName || ''}`.trim() || "Client",
        signerEmail: client.email,
        documentHtml: html,
      });

      if (result.skipped) {
        // BoldSign not configured — mark contract as 'sent' manually so admin
        // sees status changed, and include the HTML in the response.
        await db
          .update(contracts)
          .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
          .where(eq(contracts.id, contractId));
        return res.json({ ok: true, skipped: true, contractId, note: 'BOLDSIGN_API_KEY unset — contract HTML generated but not sent via e-sign provider' });
      }
      if (!result.sent) {
        return res.status(502).json({ message: result.error || 'BoldSign send failed' });
      }

      await db
        .update(contracts)
        .set({
          status: 'sent',
          sentAt: new Date(),
          providerDocId: result.providerDocId || null,
          signingUrl: result.signingUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(contracts.id, contractId));

      // Notify customer (in addition to BoldSign's email)
      const tpl = contractSentCustomerEmail({
        customerFirstName: client.firstName || 'there',
        eventType: est.eventType,
        signingUrl: result.signingUrl ?? null,
      });
      sendEmailInBackground({
        to: client.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        clientId: client.id,
        opportunityId: est.opportunityId,
        templateKey: 'contract_sent_customer',
      });

      return res.json({ ok: true, contractId, providerDocId: result.providerDocId });
    } catch (error) {
      console.error('Error sending contract:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // BoldSign webhook — consumes document lifecycle events.
  app.post('/api/webhooks/boldsign', async (req: Request, res: Response) => {
    try {
      const rawBody = (req as any).rawBody as Buffer | undefined;
      const signatureHeader = req.get('x-boldsign-signature') || '';
      if (!verifyBoldSignWebhook(rawBody ?? JSON.stringify(req.body ?? {}), signatureHeader)) {
        return res.status(401).json({ message: 'Invalid signature' });
      }

      const evt = req.body || {};
      const eventName: string | undefined = evt.event || evt.eventType || evt.type;
      const docData = evt.data || evt;
      const providerDocId: string | undefined = docData?.documentId || docData?.id;
      if (!providerDocId) {
        return res.status(200).json({ ok: true, ignored: true, reason: 'no documentId' });
      }

      const status = boldSignEventToStatus(eventName);
      if (!status) {
        return res.status(200).json({ ok: true, ignored: true, reason: `unknown event ${eventName}` });
      }

      const [c] = await db.select().from(contracts).where(eq(contracts.providerDocId, providerDocId));
      if (!c) {
        return res.status(200).json({ ok: true, ignored: true, reason: 'contract not found' });
      }

      const now = new Date();
      const patch: Partial<typeof contracts.$inferInsert> = { status, updatedAt: now };
      if (status === 'viewed') patch.viewedAt = c.viewedAt ?? now;
      if (status === 'signed') patch.signedAt = now;
      if (status === 'declined') patch.declinedAt = now;
      if (status === 'expired') patch.expiredAt = now;
      if (docData?.downloadUrl) patch.pdfUrl = docData.downloadUrl;

      await db.update(contracts).set(patch as any).where(eq(contracts.id, c.id));

      // On signed: fire deposit + owner alerts
      if (status === 'signed') {
        const [client] = await db.select().from(clients).where(eq(clients.id, c.clientId));
        const [est] = c.quoteId
          ? await db.select().from(quotes).where(eq(quotes.id, c.quoteId))
          : [null as any];
        const [ev] = c.eventId
          ? await db.select().from(events).where(eq(events.id, c.eventId))
          : [null as any];
        const customerName = client ? `${client.firstName} ${client.lastName || ''}`.trim() : 'A client';
        const emailCfg = getEmailConfig();
        const adminUrl = est ? `${emailCfg.publicBaseUrl}/quotes/${est.id}` : emailCfg.publicBaseUrl;

        sendEmailInBackground({
          to: emailCfg.adminNotificationEmail,
          ...contractSignedOwnerEmail({
            customerName,
            eventType: est?.eventType || ev?.eventType || 'event',
            eventDate: est?.eventDate || ev?.eventDate || null,
            totalCents: est?.total || 0,
            adminUrl,
          }),
          clientId: c.clientId,
          eventId: c.eventId ?? null,
          templateKey: 'contract_signed_owner',
        });

        sendOwnerSmsInBackground({
          ...contractSignedOwnerSms({
            customerName,
            eventDate: est?.eventDate || ev?.eventDate || null,
            quoteId: c.quoteId,
            opportunityId: est?.opportunityId,
          }),
          templateKey: 'contract_signed_owner',
          clientId: c.clientId,
        });

        // Fire the deposit checkout link (emails customer automatically)
        if (c.eventId) {
          try {
            await ensureEventDepositCheckout(c.eventId);
          } catch (e) {
            console.warn(`[boldsign] failed to fire deposit checkout for event ${c.eventId}:`, e);
          }
        }
      }

      return res.status(200).json({ ok: true, contractId: c.id, status });
    } catch (error) {
      console.error('[boldsign] webhook error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================================================
  // P2-2: Deposit / balance Square checkout endpoints
  // ============================================================================

  app.post('/api/events/:id/deposit/checkout', async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) return res.status(400).json({ message: 'Invalid event id' });
      const result = await ensureEventDepositCheckout(eventId);
      if (!result.url) return res.status(400).json({ message: result.error || 'Failed' });
      return res.json({ url: result.url });
    } catch (error) {
      console.error('Error creating deposit checkout:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/events/:id/balance/checkout', async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) return res.status(400).json({ message: 'Invalid event id' });
      const result = await ensureEventBalanceCheckout(eventId);
      if (!result.url) return res.status(400).json({ message: result.error || 'Failed' });
      return res.json({ url: result.url });
    } catch (error) {
      console.error('Error creating balance checkout:', error);
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

      // ─── P0-4: Post-event review & referral request ──────────────────────
      // Separate pass with its own gating: day-after-event AND status='completed'
      // AND no prior review request. Dedicated column (reviewRequestSentAt) so
      // it doesn't pile up in completedTasks and is easy to surface in reports.
      const reviewResults: Array<{ eventId: number; sent: boolean; skipped?: string }> = [];
      for (const ev of allEvents) {
        if (ev.status !== 'completed') continue;
        if (ev.reviewRequestSentAt) {
          reviewResults.push({ eventId: ev.id, sent: false, skipped: 'already_sent' });
          continue;
        }
        const eventDay = new Date(ev.eventDate);
        eventDay.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((eventDay.getTime() - now.getTime()) / 86400000);
        if (daysUntil !== -1) continue; // only the day after

        const [client] = await db.select().from(clients).where(eq(clients.id, ev.clientId));
        if (!client?.email) {
          reviewResults.push({ eventId: ev.id, sent: false, skipped: 'no_client_email' });
          continue;
        }

        const template = eventReviewRequestEmail({
          customerFirstName: client.firstName || 'there',
          eventType: ev.eventType,
          eventDate: ev.eventDate,
        });

        const r = await sendEmail({
          to: client.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          clientId: client.id,
          eventId: ev.id,
          templateKey: 'event_review_request',
        });

        if (r.sent || r.skipped) {
          // Stamp even on skip so we don't re-fire once keys come online.
          await db
            .update(events)
            .set({ reviewRequestSentAt: new Date(), updatedAt: new Date() })
            .where(eq(events.id, ev.id));
          reviewResults.push({ eventId: ev.id, sent: true, skipped: r.skipped ? 'no_resend_key' : undefined });
        } else {
          reviewResults.push({ eventId: ev.id, sent: false, skipped: r.error || 'unknown_error' });
        }
      }

      // ─── P2-2: Balance reminder — 7 days before event ────────────────────
      // Sends the balance Square Checkout link (and creates it on the fly) for
      // any event whose balance hasn't been paid or requested yet, exactly 7
      // days out. Idempotent via `balance_requested_at`.
      const balanceResults: Array<{ eventId: number; sent: boolean; skipped?: string }> = [];
      for (const ev of allEvents) {
        if (ev.status === 'cancelled' || ev.status === 'completed') continue;
        if (ev.balancePaidAt) continue;
        if (ev.balanceRequestedAt) continue;
        const eventDay = new Date(ev.eventDate);
        eventDay.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((eventDay.getTime() - now.getTime()) / 86400000);
        if (daysUntil !== 7) continue;

        try {
          const result = await ensureEventBalanceCheckout(ev.id);
          if (result.url) {
            balanceResults.push({ eventId: ev.id, sent: true });
          } else {
            balanceResults.push({ eventId: ev.id, sent: false, skipped: result.error || 'unknown' });
          }
        } catch (e: any) {
          balanceResults.push({ eventId: ev.id, sent: false, skipped: e?.message || 'error' });
        }
      }

      return res.status(200).json({
        ok: true,
        results,
        reviewResults,
        balanceResults,
        processedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error running event reminder cron:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── P1-2: Auto-Send Drip Engine ─────────────────────────────────────────
  // Advances each active opportunity through the 5-step follow-up cadence:
  //   Day 2  — soft check-in email
  //   Day 3  — SMS (if phone on file)
  //   Day 5  — value + tasting email
  //   Day 7  — phone-call TASK for Mike (draft in follow_up_drafts) + owner SMS
  //   Day 10 — final urgency email
  // Clock starts on first quote view (followUpSequenceStartedAt). Paused on
  // any customer engagement signal (inbound reply, info-requested, booked,
  // accept, decline). Intended to run daily at a stable time via Railway cron.
  //
  // Gated by FOLLOWUP_AUTOSEND_ENABLED env var. Unset/false → cron is a no-op.
  app.post('/api/cron/drip-engine', async (req: Request, res: Response) => {
    try {
      const emailCfg = getEmailConfig();
      if (!emailCfg.cronSecret) {
        return res.status(503).json({ message: 'CRON_SECRET not configured' });
      }
      const supplied = req.get('x-cron-secret');
      if (supplied !== emailCfg.cronSecret) {
        return res.status(401).json({ message: 'Invalid cron secret' });
      }

      if (process.env.FOLLOWUP_AUTOSEND_ENABLED !== 'true') {
        return res.status(200).json({
          ok: true,
          disabled: true,
          reason: 'Set FOLLOWUP_AUTOSEND_ENABLED=true to enable auto-send drip.',
          processedAt: new Date().toISOString(),
        });
      }

      const cal = getCalComConfig();
      const siteConfig = getSiteConfig();
      const now = new Date();

      // Active drips only: started AND not paused AND not completed all 5 steps.
      const activeOpps = await db
        .select()
        .from(opportunities)
        .where(
          and(
            // drizzle: followUpSequenceStartedAt IS NOT NULL AND pausedAt IS NULL
            // We filter step < 5 in code to keep the SQL simple.
            isNull(opportunities.followUpSequencePausedAt),
          )
        );

      const results: Array<{ opportunityId: number; fired?: string; skipped?: string }> = [];

      for (const opp of activeOpps) {
        if (!opp.followUpSequenceStartedAt) {
          continue; // not started yet
        }
        if ((opp.followUpSequenceStep ?? 0) >= 5) {
          continue; // sequence complete
        }

        const startedAt = new Date(opp.followUpSequenceStartedAt);
        const dayNumber = Math.floor((now.getTime() - startedAt.getTime()) / 86400000);
        const step = opp.followUpSequenceStep ?? 0;

        // Determine NEXT step this opp qualifies for today.
        let nextStep: 1 | 2 | 3 | 4 | 5 | null = null;
        if (step < 1 && dayNumber >= 2) nextStep = 1;
        else if (step < 2 && dayNumber >= 3) nextStep = 2;
        else if (step < 3 && dayNumber >= 5) nextStep = 3;
        else if (step < 4 && dayNumber >= 7) nextStep = 4;
        else if (step < 5 && dayNumber >= 10) nextStep = 5;

        if (nextStep === null) {
          results.push({ opportunityId: opp.id, skipped: `no_step_due_day_${dayNumber}` });
          continue;
        }

        // Find the linked quote for quote URL (most recent sent one)
        const [quote] = await db
          .select()
          .from(quotes)
          .where(eq(quotes.opportunityId, opp.id));

        const quoteUrl = quote?.viewToken
          ? `${emailCfg.publicBaseUrl}/quote/${quote.viewToken}`
          : `${emailCfg.publicBaseUrl}/opportunities/${opp.id}`;

        const buildCalUrl = (base: string | null): string | null => {
          if (!base) return null;
          try {
            const u = new URL(base);
            if (opp.firstName) u.searchParams.set('name', `${opp.firstName} ${opp.lastName || ''}`.trim());
            if (opp.email) u.searchParams.set('email', opp.email);
            if (quote?.viewToken) u.searchParams.set('quoteToken', quote.viewToken);
            return u.toString();
          } catch {
            return base;
          }
        };
        const bookingUrl = buildCalUrl(cal.consultationEmbedUrl);
        const tastingUrl = buildCalUrl(cal.tastingEmbedUrl);

        let fired = false;
        const firedKind: string[] = [];

        if (nextStep === 1) {
          // Day 2 — Soft email
          if (opp.email) {
            const tpl = dripDay2SoftEmail({
              customerFirstName: opp.firstName || 'there',
              eventType: opp.eventType,
              quoteUrl,
              tastingUrl,
              bookingUrl,
            });
            const r = await sendEmail({
              to: opp.email,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
              opportunityId: opp.id,
              templateKey: 'drip_day_2',
            });
            if (r.sent || r.skipped) fired = true;
            firedKind.push('day2_email');
          }
        } else if (nextStep === 2) {
          // Day 3 — SMS to customer (only if we have a phone)
          if (opp.phone) {
            const tpl = dripDay3CustomerSms({
              firstName: opp.firstName || 'there',
              chefFirstName: siteConfig.chef.firstName,
            });
            sendSmsInBackground({
              to: opp.phone,
              body: tpl.body,
              templateKey: 'drip_day_3',
              opportunityId: opp.id,
            });
            fired = true;
            firedKind.push('day3_sms');
          } else {
            // No phone — skip the SMS step but still advance so we don't stall
            fired = true;
            firedKind.push('day3_skipped_no_phone');
          }
        } else if (nextStep === 3) {
          // Day 5 — Value email
          if (opp.email) {
            const tpl = dripDay5ValueEmail({
              customerFirstName: opp.firstName || 'there',
              eventType: opp.eventType,
              quoteUrl,
              tastingUrl,
              bookingUrl,
            });
            const r = await sendEmail({
              to: opp.email,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
              opportunityId: opp.id,
              templateKey: 'drip_day_5',
            });
            if (r.sent || r.skipped) fired = true;
            firedKind.push('day5_email');
          }
        } else if (nextStep === 4) {
          // Day 7 — Phone-call TASK for Mike (followUpDrafts with type=drip_phone_call)
          const subject = `☎️ Call ${opp.firstName} ${opp.lastName || ''}`.trim() + ` — Day 7 drip`;
          const body = `Customer has been silent since first viewing the quote 7 days ago. Per the drip cadence, today is the phone-call day.\n\nScript opener: "Hey ${opp.firstName || 'there'}, this is ${siteConfig.chef.firstName} from Home Bites Catering — I just wanted to follow up on the proposal and see if you had any questions."\n\nIf hesitant: "Totally understand — this is usually when people are comparing options."\n\nOffer: tasting · Zoom/phone · budget adjustment.\n\nPhone: ${opp.phone || 'not on file'}\nEmail: ${opp.email}`;
          await db.insert(followUpDrafts).values({
            type: 'drip_phone_call',
            opportunityId: opp.id,
            quoteId: quote?.id ?? null,
            recipientEmail: opp.email,
            recipientName: `${opp.firstName} ${opp.lastName || ''}`.trim(),
            subject,
            bodyHtml: `<pre style="white-space:pre-wrap">${body}</pre>`,
            bodyText: body,
            triggerReason: 'Day 7 drip — phone call task',
          } as any);

          // Owner SMS nudge
          sendOwnerSmsInBackground({
            ...dripDay7OwnerSms({
              customerName: `${opp.firstName} ${opp.lastName || ''}`.trim(),
              customerPhone: opp.phone,
              opportunityId: opp.id,
            }),
            templateKey: 'drip_day_7',
            opportunityId: opp.id,
          });
          fired = true;
          firedKind.push('day7_phone_task');
        } else if (nextStep === 5) {
          // Day 10 — Final email
          if (opp.email) {
            const tpl = dripDay10FinalEmail({
              customerFirstName: opp.firstName || 'there',
              eventType: opp.eventType,
              eventDate: opp.eventDate,
              quoteUrl,
              tastingUrl,
              bookingUrl,
            });
            const r = await sendEmail({
              to: opp.email,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
              opportunityId: opp.id,
              templateKey: 'drip_day_10',
            });
            if (r.sent || r.skipped) fired = true;
            firedKind.push('day10_email');
          }
        }

        if (fired) {
          await db
            .update(opportunities)
            .set({ followUpSequenceStep: nextStep, lastFollowUpAt: now, updatedAt: now })
            .where(eq(opportunities.id, opp.id));
          results.push({ opportunityId: opp.id, fired: firedKind.join(',') });
        } else {
          results.push({ opportunityId: opp.id, skipped: `step_${nextStep}_no_send` });
        }
      }

      return res.status(200).json({ ok: true, results, processedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Error running drip engine cron:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── Tier 1: Follow-Up Engine (creates DRAFTS only — never auto-sends) ──────
  // Scans for stalled opportunities and quotes, creates follow-up email drafts
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
        if (opp.status === 'archived' || opp.status === 'booked' || opp.status === 'lost') continue;
        if (!opp.inquirySentAt || opp.inquiryViewedAt) continue;
        if (now.getTime() - new Date(opp.inquirySentAt).getTime() < TWO_DAYS_MS) continue;
        // Respect minimum follow-up gap
        if (opp.lastFollowUpAt && now.getTime() - new Date(opp.lastFollowUpAt).getTime() < MIN_FOLLOW_UP_GAP_MS) continue;

        // Check if we already have a pending draft for this type+opportunity
        const existingDrafts = await storage.getFollowUpDraftsForOpportunity(opp.id);
        if (existingDrafts.some(d => d.type === 'inquiry_not_opened' && (d.status === 'pending' || d.status === 'edited'))) continue;

        const inquiryUrl = `${baseUrl}/inquire?opp=${opp.inquiryToken}`;
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

      // 2. Inquiry opened but not submitted (72h+ since viewed, no linked inquiry)
      for (const opp of allOpps) {
        if (opp.status === 'archived' || opp.status === 'booked' || opp.status === 'lost') continue;
        if (!opp.inquiryViewedAt) continue;
        if (now.getTime() - new Date(opp.inquiryViewedAt).getTime() < THREE_DAYS_MS) continue;
        if (opp.lastFollowUpAt && now.getTime() - new Date(opp.lastFollowUpAt).getTime() < MIN_FOLLOW_UP_GAP_MS) continue;

        // Check if they actually submitted a quote request
        const linkedQR = await db.select().from(inquiries).where(eq(inquiries.opportunityId, opp.id));
        if (linkedQR.length > 0) continue;

        const existingDrafts = await storage.getFollowUpDraftsForOpportunity(opp.id);
        if (existingDrafts.some(d => d.type === 'inquiry_not_submitted' && (d.status === 'pending' || d.status === 'edited'))) continue;

        const inquiryUrl = `${baseUrl}/inquire?opp=${opp.inquiryToken}`;
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
      const allQuotes = await storage.listQuotes();
      for (const est of allQuotes) {
        if (est.status !== 'sent') continue;
        if (!est.sentAt || est.viewedAt) continue;
        if (now.getTime() - new Date(est.sentAt).getTime() < TWO_DAYS_MS) continue;
        if (!est.viewToken) continue;

        const existingDrafts = await storage.getFollowUpDraftsForQuote(est.id);
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
          quoteId: est.id,
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
      for (const est of allQuotes) {
        if (est.status !== 'viewed') continue;
        if (!est.viewedAt) continue;
        if (now.getTime() - new Date(est.viewedAt).getTime() < FIVE_DAYS_MS) continue;
        if (!est.viewToken) continue;

        const existingDrafts = await storage.getFollowUpDraftsForQuote(est.id);
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
          quoteId: est.id,
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
      for (const est of allQuotes) {
        if (est.status === 'accepted' || est.status === 'declined') continue;
        if (!est.expiresAt || !est.viewToken) continue;
        const daysUntilExpiry = (new Date(est.expiresAt).getTime() - now.getTime()) / (24*60*60*1000);
        if (daysUntilExpiry < 0 || daysUntilExpiry > 3) continue;

        const existingDrafts = await storage.getFollowUpDraftsForQuote(est.id);
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
          quoteId: est.id,
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

  // ═══════════════ Follow-ups inbox cron jobs ═════════════════════════════
  //
  // Three separate endpoints so they can be scheduled independently:
  //   follow-up-digest:    morning email to admin(s) with top-line count
  //   follow-up-sla:       SMS when a P0 has been sitting unacted > 24h
  //   follow-up-cleanup:   nightly orphan state cleanup
  //
  // All three share the same auth check as the other cron routes
  // (X-Cron-Secret header against CRON_SECRET env).

  app.post('/api/cron/follow-up-digest', async (req: Request, res: Response) => {
    try {
      const emailCfg = getEmailConfig();
      if (!emailCfg.cronSecret) return res.status(503).json({ message: 'CRON_SECRET not configured' });
      if (req.get('x-cron-secret') !== emailCfg.cronSecret) return res.status(401).json({ message: 'Invalid cron secret' });

      const { listFollowUps } = await import('./services/followUps');

      const admins = (await storage.listUsers()).filter((u) => u.role === 'admin' || u.role === 'user');
      const sent: Array<{ userId: number; email: string; total: number }> = [];

      for (const admin of admins) {
        if (!admin.email) continue;
        const { items, counts } = await listFollowUps({ userId: admin.id, urgency: ['P0', 'P1'] });
        if (counts.total === 0) continue;

        const host = emailCfg.publicBaseUrl.replace(/\/$/, '');
        const previewRows = items.slice(0, 5).map((i) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee;vertical-align:top">
              <div style="font-weight:600;color:#1a1a1a">${i.title}</div>
              <div style="font-size:13px;color:#666">${i.subtitle}</div>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;vertical-align:top;font-size:12px;color:#888">
              ${i.urgency}
            </td>
          </tr>`).join('');

        const html = `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px;color:#333">
            <h2 style="color:#8B7355;margin:0 0 4px 0">Your morning follow-up digest</h2>
            <p style="color:#666;margin:0 0 20px 0">
              <strong>${counts.p0}</strong> urgent today · <strong>${counts.p1}</strong> this week
            </p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">${previewRows}</table>
            <a href="${host}/follow-ups" style="display:inline-block;background:#8B7355;color:white;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600">
              Open follow-ups inbox
            </a>
            <p style="color:#999;font-size:12px;margin-top:20px">
              This digest runs each morning when you have open follow-ups. It won't send when your inbox is empty.
            </p>
          </div>`;

        sendEmailInBackground({
          to: admin.email,
          subject: `${counts.total} follow-up${counts.total === 1 ? '' : 's'} waiting · ${counts.p0} urgent`,
          html,
          text: `${counts.total} follow-ups waiting. ${counts.p0} urgent today. Open: ${host}/follow-ups`,
          templateKey: 'follow_up_digest',
        });
        sent.push({ userId: admin.id, email: admin.email, total: counts.total });
      }

      return res.json({ ok: true, sentCount: sent.length, sent });
    } catch (error) {
      console.error('Error running follow-up digest cron:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/cron/follow-up-sla', async (req: Request, res: Response) => {
    try {
      const emailCfg = getEmailConfig();
      if (!emailCfg.cronSecret) return res.status(503).json({ message: 'CRON_SECRET not configured' });
      if (req.get('x-cron-secret') !== emailCfg.cronSecret) return res.status(401).json({ message: 'Invalid cron secret' });

      const { listFollowUps } = await import('./services/followUps');
      const SLA_BREACH_SECONDS = 24 * 3600; // 24h

      // Aggregate across admin users — only ping owner SMS once per breach
      // item regardless of how many admins have it open. Use a simple Set.
      const admins = (await storage.listUsers()).filter((u) => u.role === 'admin' || u.role === 'user');
      const alerted: Set<string> = new Set();
      const breaches: Array<{ key: string; title: string; ageHours: number }> = [];

      for (const admin of admins) {
        const { items } = await listFollowUps({ userId: admin.id, urgency: ['P0'] });
        for (const item of items) {
          if (item.userState.state !== 'open') continue;
          if (item.ageSeconds < SLA_BREACH_SECONDS) continue;
          if (alerted.has(item.key)) continue;
          alerted.add(item.key);
          breaches.push({ key: item.key, title: item.title, ageHours: Math.floor(item.ageSeconds / 3600) });
        }
      }

      if (breaches.length > 0) {
        const body =
          `⚠ ${breaches.length} urgent follow-up${breaches.length === 1 ? '' : 's'} past 24h:\n` +
          breaches
            .slice(0, 3)
            .map((b) => `• ${b.title} (${b.ageHours}h)`)
            .join('\n') +
          (breaches.length > 3 ? `\n…and ${breaches.length - 3} more.` : '') +
          `\n${emailCfg.publicBaseUrl}/follow-ups`;

        sendOwnerSmsInBackground({
          body,
          templateKey: 'follow_up_sla_breach',
        });
      }

      return res.json({ ok: true, breachCount: breaches.length, breaches });
    } catch (error) {
      console.error('Error running follow-up SLA cron:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/cron/follow-up-cleanup', async (req: Request, res: Response) => {
    try {
      const emailCfg = getEmailConfig();
      if (!emailCfg.cronSecret) return res.status(503).json({ message: 'CRON_SECRET not configured' });
      if (req.get('x-cron-secret') !== emailCfg.cronSecret) return res.status(401).json({ message: 'Invalid cron secret' });
      const { cleanupOrphanStates } = await import('./services/followUps');
      const result = await cleanupOrphanStates();
      return res.json({ ok: true, ...result });
    } catch (error) {
      console.error('Error running follow-up cleanup cron:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // ─── Tier 1: Follow-Up Draft Management (CRUD) ────────────────────────────

  // List follow-up drafts (optionally filter by status)
  // ═══════════════ Follow-ups inbox ═══════════════════════════════════════
  // Unified inbox of everything waiting on the admin. Computed from 16
  // source queries each request. Per-user state overlay (snooze / dismiss /
  // in-progress / note) lives in follow_up_states.
  {
    const {
      listFollowUps,
      snoozeItem,
      dismissItem,
      pinItem,
      unpinItem,
      setItemNote,
    } = await import('./services/followUps');

    const parseUrgency = (v: unknown): any[] | undefined => {
      if (!v) return undefined;
      const s = String(v).toLowerCase();
      const out = s
        .split(',')
        .map((x) => x.trim().toUpperCase())
        .filter((x) => ['P0', 'P1', 'P2', 'P3'].includes(x));
      return out.length ? out : undefined;
    };

    app.get('/api/follow-ups', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const urgency = parseUrgency(req.query.urgency);
        const types = req.query.type
          ? String(req.query.type).split(',').map((s) => s.trim()).filter(Boolean)
          : undefined;
        const includeSnoozed = req.query.includeSnoozed === 'true';
        const includeDismissed = req.query.includeDismissed === 'true';
        const result = await listFollowUps({
          userId,
          urgency,
          types: types as any,
          includeSnoozed,
          includeDismissed,
        });
        res.json(result);
      } catch (error) {
        console.error('Error listing follow-ups:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.get('/api/follow-ups/count', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { counts } = await listFollowUps({
          userId,
          urgency: ['P0', 'P1'],
        });
        res.json(counts);
      } catch (error) {
        console.error('Error counting follow-ups:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.post('/api/follow-ups/:itemKey/snooze', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { itemKey } = req.params;
        const { snoozeUntil, note } = req.body || {};
        if (!snoozeUntil) return res.status(400).json({ message: 'snoozeUntil required' });
        const when = new Date(snoozeUntil);
        if (isNaN(when.getTime())) return res.status(400).json({ message: 'Invalid snoozeUntil' });
        if (when.getTime() <= Date.now()) return res.status(400).json({ message: 'snoozeUntil must be in the future' });
        await snoozeItem(userId, itemKey, when, typeof note === 'string' ? note : undefined);
        res.json({ ok: true });
      } catch (error) {
        console.error('Error snoozing follow-up:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.post('/api/follow-ups/:itemKey/dismiss', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { itemKey } = req.params;
        const { sourceAge, note } = req.body || {};
        if (!sourceAge || typeof sourceAge !== 'string') {
          return res.status(400).json({ message: 'sourceAge required (ISO timestamp from the item)' });
        }
        await dismissItem(userId, itemKey, sourceAge, typeof note === 'string' ? note : undefined);
        res.json({ ok: true });
      } catch (error) {
        console.error('Error dismissing follow-up:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.post('/api/follow-ups/:itemKey/in-progress', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { itemKey } = req.params;
        const { note } = req.body || {};
        await pinItem(userId, itemKey, typeof note === 'string' ? note : undefined);
        res.json({ ok: true });
      } catch (error) {
        console.error('Error pinning follow-up:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.delete('/api/follow-ups/:itemKey/in-progress', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { itemKey } = req.params;
        await unpinItem(userId, itemKey);
        res.json({ ok: true });
      } catch (error) {
        console.error('Error unpinning follow-up:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    app.post('/api/follow-ups/:itemKey/note', isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        const { itemKey } = req.params;
        const { note } = req.body || {};
        if (typeof note !== 'string') return res.status(400).json({ message: 'note required' });
        await setItemNote(userId, itemKey, note.slice(0, 2000));
        res.json({ ok: true });
      } catch (error) {
        console.error('Error saving follow-up note:', error);
        res.status(500).json({ message: 'Server error' });
      }
    });
  }

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

  // Step 3: Get portal data (all events, quotes, preferences for the logged-in client)
  // Session-auth middleware factory for portal endpoints. Returns the
  // validated client + session or sends a 401.
  async function requirePortalSession(
    req: Request,
    res: Response,
  ): Promise<{ clientId: number } | null> {
    const authHeader = req.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return null;
    }
    const sessionToken = authHeader.slice(7);
    const { clientSessions } = await import('@shared/schema');
    const [session] = await db
      .select()
      .from(clientSessions)
      .where(eq(clientSessions.token, sessionToken));
    if (!session) {
      res.status(401).json({ message: 'Invalid session' });
      return null;
    }
    if (new Date() > new Date(session.expiresAt)) {
      res.status(401).json({ message: 'Session expired' });
      return null;
    }
    return { clientId: session.clientId };
  }

  app.get('/api/public/portal/data', async (req: Request, res: Response) => {
    try {
      const ctx = await requirePortalSession(req, res);
      if (!ctx) return;

      const client = await storage.getClient(ctx.clientId);
      if (!client) return res.status(404).json({ message: 'Client not found' });

      // Get all events and all quotes for this client up-front so the
      // per-event builder below can look up the quote view-token for PDF links.
      const allEvents = await storage.listEvents();
      const allQuotesRaw = await storage.listQuotes();
      const clientEventRows = allEvents.filter(
        (e) => e.clientId === client.id && e.status !== 'cancelled',
      );

      // Get contracts for these events (by eventId OR quoteId)
      const eventIds = clientEventRows.map((e) => e.id);
      const quoteIdsFromEvents = clientEventRows
        .map((e) => e.quoteId)
        .filter((x): x is number => typeof x === 'number');

      let contractRows: (typeof contracts.$inferSelect)[] = [];
      if (eventIds.length > 0 || quoteIdsFromEvents.length > 0) {
        const conds: any[] = [];
        if (eventIds.length > 0) conds.push(inArray(contracts.eventId, eventIds));
        if (quoteIdsFromEvents.length > 0) conds.push(inArray(contracts.quoteId, quoteIdsFromEvents));
        contractRows = await db
          .select()
          .from(contracts)
          .where(conds.length > 1 ? or(...conds) : conds[0]);
      }

      const findContract = (e: typeof events.$inferSelect) => {
        const byEvent = contractRows.find((c) => c.eventId === e.id);
        if (byEvent) return byEvent;
        if (e.quoteId) return contractRows.find((c) => c.quoteId === e.quoteId);
        return undefined;
      };

      const DAY_MS = 86_400_000;
      const now = Date.now();

      const clientEvents = clientEventRows.map((e) => {
        const contract = findContract(e);
        const eventMs = new Date(e.eventDate).getTime();
        const daysToEvent = Math.ceil((eventMs - now) / DAY_MS);

        const depositPaid = !!e.depositPaidAt;
        const balancePaid = !!e.balancePaidAt;
        const contractSigned = contract?.status === 'signed';
        const contractSent = !!contract && ['sent', 'viewed'].includes(contract.status);

        // Final-headcount rule: due when within 14 days of the event and
        // balance isn't yet paid; locked (done) once balance is paid or we're
        // within 7 days of the event.
        const headcountDue = daysToEvent <= 14 && !balancePaid;
        const headcountLocked = balancePaid || daysToEvent <= 7;

        type MilestoneStatus = 'done' | 'current' | 'pending' | 'overdue';
        const mk = (
          key: string,
          label: string,
          status: MilestoneStatus,
          hint?: string,
        ) => ({ key, label, status, hint });

        // Walk through each milestone in order, advancing "current" until we
        // hit an incomplete one. Anything past "current" stays "pending".
        const steps: Array<{ key: string; label: string; done: boolean; hint?: string }> = [
          { key: 'booked', label: 'Booked', done: true, hint: 'Your date is locked in.' },
          {
            key: 'contract',
            label: 'Contract signed',
            done: contractSigned,
            hint: contractSigned
              ? contract?.signedAt
                ? `Signed ${new Date(contract.signedAt).toLocaleDateString()}`
                : 'Signed'
              : contractSent
                ? 'Check your email — the contract is ready to sign.'
                : "We'll send the contract shortly.",
          },
          {
            key: 'deposit',
            label: 'Deposit paid',
            done: depositPaid,
            hint: depositPaid
              ? e.depositPaidAt
                ? `Paid ${new Date(e.depositPaidAt).toLocaleDateString()}`
                : 'Paid'
              : e.depositAmountCents
                ? `Deposit: $${(e.depositAmountCents / 100).toLocaleString()}`
                : undefined,
          },
          {
            key: 'headcount',
            label: 'Final headcount confirmed',
            done: headcountLocked,
            hint: headcountLocked
              ? 'Locked in.'
              : headcountDue
                ? `Please confirm by ${new Date(eventMs - 14 * DAY_MS).toLocaleDateString()}`
                : `Due ~2 weeks before the event.`,
          },
          {
            key: 'balance',
            label: 'Balance paid',
            done: balancePaid,
            hint: balancePaid
              ? e.balancePaidAt
                ? `Paid ${new Date(e.balancePaidAt).toLocaleDateString()}`
                : 'Paid'
              : e.balanceAmountCents
                ? `Balance: $${(e.balanceAmountCents / 100).toLocaleString()} · due the day before`
                : 'Due the day before your event',
          },
          {
            key: 'event',
            label: 'Event day',
            done: daysToEvent <= 0,
            hint: daysToEvent > 0 ? `${daysToEvent} day${daysToEvent === 1 ? '' : 's'} away` : 'Today!',
          },
        ];

        let currentAssigned = false;
        const milestones = steps.map((s) => {
          if (s.done) return mk(s.key, s.label, 'done', s.hint);
          if (!currentAssigned) {
            currentAssigned = true;
            return mk(s.key, s.label, 'current', s.hint);
          }
          return mk(s.key, s.label, 'pending', s.hint);
        });

        // Next-step action — one concrete call to action the portal can surface.
        let nextStep: { label: string; cta: string; url: string | null } | null = null;
        if (!contractSigned && contract?.signingUrl) {
          nextStep = { label: 'Sign the contract', cta: 'Sign now', url: contract.signingUrl };
        } else if (!contractSigned) {
          nextStep = { label: 'Waiting on your contract', cta: "We'll email it shortly", url: null };
        } else if (!depositPaid && e.depositSquarePaymentLinkUrl) {
          nextStep = {
            label: `Pay your deposit ($${((e.depositAmountCents || 0) / 100).toLocaleString()})`,
            cta: 'Pay deposit',
            url: e.depositSquarePaymentLinkUrl,
          };
        } else if (!depositPaid) {
          nextStep = { label: 'Deposit payment link coming up', cta: "We'll email the link", url: null };
        } else if (!headcountLocked && headcountDue) {
          nextStep = {
            label: 'Confirm your final headcount',
            cta: 'Request a change',
            url: null,
          };
        } else if (!balancePaid && e.balanceSquarePaymentLinkUrl) {
          nextStep = {
            label: `Pay your balance ($${((e.balanceAmountCents || 0) / 100).toLocaleString()})`,
            cta: 'Pay balance',
            url: e.balanceSquarePaymentLinkUrl,
          };
        } else if (!balancePaid && daysToEvent <= 3) {
          nextStep = { label: 'Balance payment link coming up', cta: "We'll email the link", url: null };
        }

        // Documents — signed contract, quote PDF, receipts. Anything with a
        // public URL we can safely hand the customer.
        type Doc = { label: string; url: string; kind: 'contract' | 'quote' | 'receipt' };
        const documents: Doc[] = [];
        if (contract?.pdfUrl) {
          documents.push({ label: 'Signed contract (PDF)', url: contract.pdfUrl, kind: 'contract' });
        }
        if (e.quoteId) {
          const q = allQuotesRaw.find((q) => q.id === e.quoteId);
          if (q?.viewToken) {
            documents.push({
              label: 'Quote (PDF)',
              url: `/api/public/quote/${q.viewToken}/pdf`,
              kind: 'quote',
            });
          }
        }
        // Square receipts aren't stored; we skip those.

        return {
          id: e.id,
          eventType: e.eventType,
          eventDate: e.eventDate,
          startTime: e.startTime,
          endTime: e.endTime,
          guestCount: e.guestCount,
          venue: e.venue,
          status: e.status,
          viewToken: e.viewToken,
          daysToEvent,
          totalCents:
            (e.depositAmountCents || 0) + (e.balanceAmountCents || 0) || null,
          payment: {
            depositAmountCents: e.depositAmountCents,
            depositPercent: e.depositPercent,
            depositPaidAt: e.depositPaidAt,
            depositPayUrl: e.depositSquarePaymentLinkUrl,
            balanceAmountCents: e.balanceAmountCents,
            balancePaidAt: e.balancePaidAt,
            balancePayUrl: e.balanceSquarePaymentLinkUrl,
          },
          contract: contract
            ? {
                status: contract.status,
                signingUrl: contract.signingUrl,
                signedAt: contract.signedAt,
                pdfUrl: contract.pdfUrl,
              }
            : null,
          milestones,
          nextStep,
          documents,
        };
      });

      // Surface every quote for the client so the portal can still show
      // pending proposals that haven't been converted to events.
      const clientQuotes = allQuotesRaw
        .filter((e) => e.clientId === client.id)
        .map((e) => ({
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
        quotes: clientQuotes,
      });
    } catch (error) {
      console.error('Error fetching portal data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Portal: customer-initiated change request. Creates a communications row
  // (type: note, direction: incoming) tied to the event/client, and notifies
  // the owner by SMS so Mike sees it immediately.
  app.post('/api/public/portal/events/:id/change-request', async (req: Request, res: Response) => {
    try {
      const ctx = await requirePortalSession(req, res);
      if (!ctx) return;

      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) return res.status(400).json({ message: 'Invalid event id' });

      const { category, message } = req.body || {};
      const trimmed = (message ?? '').toString().trim();
      if (!trimmed) return res.status(400).json({ message: 'Message is required' });
      if (trimmed.length > 5000) return res.status(400).json({ message: 'Message too long' });

      // Verify the event belongs to this client
      const event = await storage.getEvent(eventId);
      if (!event || event.clientId !== ctx.clientId) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const client = await storage.getClient(ctx.clientId);
      const categoryLabel = typeof category === 'string' && category
        ? category.slice(0, 40)
        : 'general';

      const subject = `Change request: ${categoryLabel} · ${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim();
      const [comm] = await db
        .insert(communications)
        .values({
          clientId: ctx.clientId,
          eventId: event.id,
          opportunityId: null,
          type: 'note',
          direction: 'incoming',
          source: 'portal_change_request',
          timestamp: new Date(),
          subject,
          bodyRaw: trimmed,
          bodySummary: trimmed.length > 280 ? trimmed.slice(0, 277) + '…' : trimmed,
          metaData: {
            category: categoryLabel,
            channel: 'client_portal',
            status: 'open',
            submittedAt: new Date().toISOString(),
          },
        })
        .returning();

      // Fire-and-forget SMS to owner
      try {
        const body =
          `📝 Change request from ${client?.firstName ?? 'a customer'} for event #${event.id}` +
          ` (${categoryLabel}): ${trimmed.slice(0, 160)}${trimmed.length > 160 ? '…' : ''}`;
        sendOwnerSmsInBackground({
          body,
          templateKey: 'portal_change_request_owner',
          clientId: ctx.clientId,
          eventId: event.id,
        });
      } catch {
        // SMS is best-effort; the DB record is the source of truth.
      }

      res.status(201).json({ ok: true, communicationId: comm.id });
    } catch (error) {
      console.error('Error recording portal change request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Portal: list the customer's submitted change requests for one event so
  // they can see status + any reply Mike added. Session-authed.
  app.get('/api/public/portal/events/:id/change-requests', async (req: Request, res: Response) => {
    try {
      const ctx = await requirePortalSession(req, res);
      if (!ctx) return;

      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) return res.status(400).json({ message: 'Invalid event id' });

      const event = await storage.getEvent(eventId);
      if (!event || event.clientId !== ctx.clientId) {
        return res.status(404).json({ message: 'Event not found' });
      }

      const rows = await db
        .select({
          id: communications.id,
          subject: communications.subject,
          bodyRaw: communications.bodyRaw,
          metaData: communications.metaData,
          timestamp: communications.timestamp,
        })
        .from(communications)
        .where(
          and(
            eq(communications.eventId, eventId),
            eq(communications.clientId, ctx.clientId),
            eq(communications.source, 'portal_change_request'),
          ),
        )
        .orderBy(desc(communications.timestamp));

      res.json(rows);
    } catch (error) {
      console.error('Error listing portal change requests:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Attach `description` from the menu_items catalog to selections that carry an
  // `itemId`. Selections from older inquiries may not; those pass through as-is.
  async function enrichWithCatalogDescriptions<T extends { itemId?: string; name?: string; description?: string }>(
    items: T[],
  ): Promise<T[]> {
    if (!items || items.length === 0) return items;
    const ids = items.map((i) => i.itemId).filter((v): v is string => !!v);
    if (ids.length === 0) return items;
    const rows = await db
      .select({ id: menuItems.id, description: menuItems.description })
      .from(menuItems)
      .where(inArray(menuItems.id, ids));
    const byId = new Map<string, string | null>(rows.map((r) => [r.id, r.description]));
    return items.map((i) =>
      i.itemId && byId.get(i.itemId)
        ? { ...i, description: i.description ?? (byId.get(i.itemId) as string) }
        : i,
    );
  }

  // Appetizers/desserts don't carry itemId — fall back to lowercased-name match.
  async function enrichAppetizersOrDesserts<T extends { itemName?: string; description?: string }>(
    items: T[],
  ): Promise<T[]> {
    if (!items || items.length === 0) return items;
    const names = items.map((i) => (i.itemName || "").toLowerCase().trim()).filter(Boolean);
    if (names.length === 0) return items;
    const rows = await db
      .select({ name: menuItems.name, description: menuItems.description })
      .from(menuItems);
    const byName = new Map<string, string | null>();
    for (const r of rows) byName.set((r.name || "").toLowerCase().trim(), r.description);
    return items.map((i) => {
      const key = (i.itemName || "").toLowerCase().trim();
      const desc = byName.get(key);
      return desc ? { ...i, description: i.description ?? desc } : i;
    });
  }

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

      let inquiry: typeof inquiries.$inferSelect | null = null;
      let quote: typeof quotes.$inferSelect | null = null;
      if (event.quoteId) {
        const [e] = await db.select().from(quotes).where(eq(quotes.id, event.quoteId));
        quote = e ?? null;
        const [qr] = await db
          .select()
          .from(inquiries)
          .where(eq(inquiries.quoteId, event.quoteId));
        inquiry = qr ?? null;
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

      // Enrich menuSelections / appetizers / desserts with catalog descriptions.
      // Customers on the celebration page see a bulleted list today; adding a
      // one-line description under each item makes the menu read like a
      // restaurant menu rather than a packing list.
      const enrichedMenuSelections = await enrichWithCatalogDescriptions(
        (inquiry?.menuSelections as any[]) ?? []
      );
      const enrichedAppetizers = await enrichAppetizersOrDesserts(
        (inquiry?.appetizers as any)?.selections ?? []
      );
      const enrichedDesserts = await enrichAppetizersOrDesserts(
        (inquiry?.desserts as any[]) ?? []
      );

      const publicInquiry = inquiry
        ? {
            partnerFirstName: inquiry.partnerFirstName,
            partnerLastName: inquiry.partnerLastName,
            menuTheme: inquiry.menuTheme,
            menuTier: inquiry.menuTier,
            menuSelections: enrichedMenuSelections,
            appetizers: inquiry.appetizers
              ? { ...(inquiry.appetizers as any), selections: enrichedAppetizers }
              : inquiry.appetizers,
            desserts: enrichedDesserts.length > 0 ? enrichedDesserts : inquiry.desserts,
            beverages: inquiry.beverages,
            dietary: inquiry.dietary,
            hasCocktailHour: inquiry.hasCocktailHour,
            cocktailStartTime: inquiry.cocktailStartTime,
            cocktailEndTime: inquiry.cocktailEndTime,
            mainMealStartTime: inquiry.mainMealStartTime,
            mainMealEndTime: inquiry.mainMealEndTime,
            specialRequests: inquiry.specialRequests,
            serviceStyle: inquiry.serviceStyle,
            // Link back to the quote page in case the customer wants to renegotiate
            quoteViewToken: quote?.viewToken ?? null,
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
        inquiry: publicInquiry,
        menu: publicMenu,
        siteConfig: getSiteConfig(),
        reviewConfig: getReviewConfig(),
      });
    } catch (error) {
      console.error('Error fetching public event:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete an quote
  app.delete('/api/quotes/:id(\\d+)', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const quoteId = parseInt(req.params.id);
      
      if (isNaN(quoteId)) {
        return res.status(400).json({ message: 'Invalid quote ID' });
      }
      
      const success = await storage.deleteQuote(quoteId);
      
      if (!success) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      res.status(200).json({ message: 'Quote deleted successfully' });
    } catch (error) {
      console.error('Error deleting quote:', error);
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
  // in a single request: the event itself, its client, its quote (with line items),
  // the originating quote request (menu selections, dietary, equipment, beverages,
  // appetizers, AI analysis), and the menu metadata. Any of the joined objects may be
  // null if the data isn't linked — the UI handles missing pieces gracefully.
  //
  // Role-based filtering: chefs never see the quote object (it contains line-item
  // pricing and totals). They get all the operational data they need from inquiry
  // and event. This is defense-in-depth — the UI also hides these fields, but stripping
  // on the server means chefs can't craft requests to see pricing.
  // Admin: update lifecycle state on a single change request. Accepts
  // { status?, adminReply? } and merges into communications.metaData. No
  // schema migration — state lives in the existing jsonb column.
  app.patch('/api/events/:id/change-requests/:commId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      const commId = parseInt(req.params.commId);
      if (isNaN(eventId) || isNaN(commId)) {
        return res.status(400).json({ message: 'Invalid id' });
      }
      const { status, adminReply } = req.body as {
        status?: 'open' | 'resolved';
        adminReply?: string | null;
      };
      if (status && status !== 'open' && status !== 'resolved') {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const [row] = await db
        .select()
        .from(communications)
        .where(
          and(
            eq(communications.id, commId),
            eq(communications.eventId, eventId),
            eq(communications.source, 'portal_change_request'),
          ),
        );
      if (!row) return res.status(404).json({ message: 'Request not found' });

      const existing = (row.metaData as Record<string, unknown>) || {};
      const nextMeta: Record<string, unknown> = { ...existing };
      if (status) {
        nextMeta.status = status;
        if (status === 'resolved') nextMeta.resolvedAt = new Date().toISOString();
        if (status === 'open') delete nextMeta.resolvedAt;
      }
      if (typeof adminReply === 'string') {
        const trimmed = adminReply.trim();
        if (trimmed.length === 0) {
          delete nextMeta.adminReply;
          delete nextMeta.repliedAt;
        } else {
          nextMeta.adminReply = trimmed.slice(0, 2000);
          nextMeta.repliedAt = new Date().toISOString();
        }
      }

      const [updated] = await db
        .update(communications)
        .set({ metaData: nextMeta as any, updatedAt: new Date() })
        .where(eq(communications.id, commId))
        .returning({
          id: communications.id,
          subject: communications.subject,
          bodyRaw: communications.bodyRaw,
          bodySummary: communications.bodySummary,
          metaData: communications.metaData,
          timestamp: communications.timestamp,
        });

      res.json(updated);
    } catch (error) {
      console.error('Error updating change request:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Lightweight list of customer change requests for an event. Reads from
  // communications where source='portal_change_request'. Status + reply live
  // on communications.metaData (no dedicated table yet).
  app.get('/api/events/:id/change-requests', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) return res.status(400).json({ message: 'Invalid event ID' });
      const rows = await db
        .select({
          id: communications.id,
          subject: communications.subject,
          bodyRaw: communications.bodyRaw,
          bodySummary: communications.bodySummary,
          metaData: communications.metaData,
          timestamp: communications.timestamp,
        })
        .from(communications)
        .where(
          and(
            eq(communications.eventId, eventId),
            eq(communications.source, 'portal_change_request'),
          ),
        )
        .orderBy(desc(communications.timestamp));
      res.json(rows);
    } catch (error) {
      console.error('Error fetching change requests:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

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

      let quote: typeof quotes.$inferSelect | null = null;
      let inquiry: typeof inquiries.$inferSelect | null = null;
      if (event.quoteId) {
        const [e] = await db.select().from(quotes).where(eq(quotes.id, event.quoteId));
        quote = e ?? null;
        const [qr] = await db
          .select()
          .from(inquiries)
          .where(eq(inquiries.quoteId, event.quoteId));
        inquiry = qr ?? null;
      }

      let menu: typeof menus.$inferSelect | null = null;
      if (event.menuId) {
        const [m] = await db.select().from(menus).where(eq(menus.id, event.menuId));
        menu = m ?? null;
      }

      // Strip financial data for non-admins. The events tab reads menu/dietary/
      // equipment from inquiry; quote is only needed for pricing displays.
      const viewerRole = await getSessionRole(req);
      const canSeeFinancials = viewerRole === 'admin';

      return res.status(200).json({
        event,
        client: client ?? null,
        quote: canSeeFinancials ? quote : null,
        inquiry,
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
  // (clientId, quoteId, menuId, eventDate, venue, guestCount, startTime, endTime).
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

      // Auto-match: if no clientId provided, try to resolve from fromAddress or toAddress
      let resolvedClientId = data.clientId;
      let resolvedOpportunityId = data.opportunityId;
      if (!resolvedClientId) {
        const matchValue = data.fromAddress || data.toAddress;
        if (matchValue) {
          const match = await storage.resolveClientFromIdentifier(matchValue);
          if (match && match.clientId > 0) {
            resolvedClientId = match.clientId;
            if (!resolvedOpportunityId && match.opportunityId) {
              resolvedOpportunityId = match.opportunityId;
            }
          }
        }
      }

      const result = await storage.createCommunication({
        ...data,
        clientId: resolvedClientId,
        opportunityId: resolvedOpportunityId,
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
  
  // Get unmatched communications (MUST be before /:id route)
  app.get('/api/communications/unmatched', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const result = await storage.getUnmatchedCommunications();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting unmatched communications:', error);
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
  // quote submissions, quote sent/viewed/accepted, event milestones.
  app.get('/api/contacts/:email/timeline', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const email = decodeURIComponent(req.params.email).toLowerCase();
      const timeline: Array<{
        id: string;
        type: string; // communication, status_change, quote_submitted, quote_sent, quote_accepted, event_created
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
      const allQR = await db.select().from(inquiries);
      const matchingQR = allQR.filter(qr => qr.email?.toLowerCase() === email);
      for (const qr of matchingQR) {
        if (qr.submittedAt) {
          timeline.push({
            id: `qr-submitted-${qr.id}`,
            type: 'quote_submitted',
            timestamp: new Date(qr.submittedAt).toISOString(),
            title: `Quote request submitted (${qr.eventType})`,
            detail: qr.menuTheme ? `Menu: ${qr.menuTheme} ${qr.menuTier || ''}` : undefined,
            entityType: 'inquiry',
            entityId: qr.id,
            icon: 'system',
          });
        }
        if (qr.convertedAt) {
          timeline.push({
            id: `qr-converted-${qr.id}`,
            type: 'system',
            timestamp: new Date(qr.convertedAt).toISOString(),
            title: 'Quote request converted to quote',
            entityType: 'inquiry',
            entityId: qr.id,
            icon: 'system',
          });
        }
      }

      // 3. Quote milestones
      const allEst = await storage.listQuotes();
      for (const clientId of matchingClientIds) {
        const clientQuotes = allEst.filter(e => e.clientId === clientId);
        for (const est of clientQuotes) {
          if (est.sentAt) {
            timeline.push({
              id: `est-sent-${est.id}`,
              type: 'quote_sent',
              timestamp: new Date(est.sentAt).toISOString(),
              title: `Quote sent ($${(est.total / 100).toLocaleString()})`,
              entityType: 'quote',
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
              entityType: 'quote',
              entityId: est.id,
              icon: 'system',
            });
          }
          if (est.acceptedAt) {
            timeline.push({
              id: `est-accepted-${est.id}`,
              type: 'quote_accepted',
              timestamp: new Date(est.acceptedAt).toISOString(),
              title: 'Quote accepted!',
              entityType: 'quote',
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
              entityType: 'quote',
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

  // ─── Unified Client Timeline (by client ID) ──────────────────────────────
  // Aggregates all communications, quotes, events, and status changes for a client.
  app.get('/api/clients/:id/timeline', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID' });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }

      const timeline: Array<{
        id: string;
        type: string;
        channel?: string;
        timestamp: string;
        title: string;
        detail?: string;
        direction?: string;
        entityType?: string;
        entityId?: number;
      }> = [];

      // 1. All communications directly linked to this client
      const comms = await storage.getCommunicationsForClient(clientId);
      for (const c of comms) {
        timeline.push({
          id: `comm-${c.id}`,
          type: 'communication',
          channel: c.type,
          direction: c.direction,
          timestamp: (c.timestamp || c.createdAt).toString(),
          title: c.subject || `${c.type} (${c.direction})`,
          detail: c.bodySummary || c.bodyRaw?.substring(0, 200) || undefined,
          entityType: 'communication',
          entityId: c.id,
        });
      }

      // 2. Also get communications linked to the client's opportunities
      const allOpps = await storage.listOpportunities();
      const clientOpps = allOpps.filter(o => o.clientId === clientId);
      for (const opp of clientOpps) {
        const oppComms = await storage.getCommunicationsForOpportunity(opp.id);
        for (const c of oppComms) {
          if (timeline.some(t => t.id === `comm-${c.id}`)) continue;
          timeline.push({
            id: `comm-${c.id}`,
            type: 'communication',
            channel: c.type,
            direction: c.direction,
            timestamp: (c.timestamp || c.createdAt).toString(),
            title: c.subject || `${c.type} (${c.direction})`,
            detail: c.bodySummary || c.bodyRaw?.substring(0, 200) || undefined,
            entityType: 'communication',
            entityId: c.id,
          });
        }

        // Status changes from opportunities
        if (opp.statusHistory && Array.isArray(opp.statusHistory)) {
          for (const entry of opp.statusHistory as any[]) {
            timeline.push({
              id: `status-${opp.id}-${entry.changedAt}`,
              type: 'status_change',
              timestamp: entry.changedAt,
              title: `Pipeline: status changed to "${entry.status}"`,
              entityType: 'opportunity',
              entityId: opp.id,
            });
          }
        }

        // Inquiry milestones
        if (opp.inquirySentAt) {
          timeline.push({
            id: `inquiry-sent-${opp.id}`,
            type: 'milestone',
            timestamp: new Date(opp.inquirySentAt).toISOString(),
            title: 'Inquiry email sent',
            entityType: 'opportunity',
            entityId: opp.id,
          });
        }
        if (opp.inquiryViewedAt) {
          timeline.push({
            id: `inquiry-viewed-${opp.id}`,
            type: 'milestone',
            timestamp: new Date(opp.inquiryViewedAt).toISOString(),
            title: 'Customer opened inquiry',
            entityType: 'opportunity',
            entityId: opp.id,
          });
        }
      }

      // 3. Quote milestones
      const allQuotes = await storage.listQuotes();
      const clientQuotes = allQuotes.filter(e => e.clientId === clientId);
      for (const est of clientQuotes) {
        timeline.push({
          id: `est-created-${est.id}`,
          type: 'milestone',
          timestamp: new Date(est.createdAt).toISOString(),
          title: `Quote created ($${(est.total / 100).toLocaleString()})`,
          entityType: 'quote',
          entityId: est.id,
        });
        if (est.sentAt) {
          timeline.push({
            id: `est-sent-${est.id}`,
            type: 'milestone',
            timestamp: new Date(est.sentAt).toISOString(),
            title: `Quote sent ($${(est.total / 100).toLocaleString()})`,
            entityType: 'quote',
            entityId: est.id,
          });
        }
        if (est.viewedAt) {
          timeline.push({
            id: `est-viewed-${est.id}`,
            type: 'milestone',
            timestamp: new Date(est.viewedAt).toISOString(),
            title: 'Customer viewed quote',
            entityType: 'quote',
            entityId: est.id,
          });
        }
        if (est.acceptedAt) {
          timeline.push({
            id: `est-accepted-${est.id}`,
            type: 'milestone',
            timestamp: new Date(est.acceptedAt).toISOString(),
            title: 'Quote accepted!',
            entityType: 'quote',
            entityId: est.id,
          });
        }
        if (est.declinedAt) {
          timeline.push({
            id: `est-declined-${est.id}`,
            type: 'milestone',
            timestamp: new Date(est.declinedAt).toISOString(),
            title: `Quote declined${est.declinedReason ? `: ${est.declinedReason}` : ''}`,
            entityType: 'quote',
            entityId: est.id,
          });
        }
      }

      // 4. Event milestones
      const allEvents = await storage.listEvents();
      const clientEvents = allEvents.filter(e => e.clientId === clientId);
      for (const evt of clientEvents) {
        timeline.push({
          id: `event-created-${evt.id}`,
          type: 'milestone',
          timestamp: new Date(evt.createdAt).toISOString(),
          title: `Event booked: ${evt.eventType} (${evt.guestCount} guests)`,
          detail: evt.venue || undefined,
          entityType: 'event',
          entityId: evt.id,
        });
      }

      // 5. Quote requests linked via opportunity
      const oppIds = clientOpps.map(o => o.id);
      if (oppIds.length > 0) {
        const allQR = await db.select().from(inquiries);
        const linkedQR = allQR.filter(qr => qr.opportunityId && oppIds.includes(qr.opportunityId));
        for (const qr of linkedQR) {
          if (qr.submittedAt) {
            timeline.push({
              id: `qr-submitted-${qr.id}`,
              type: 'milestone',
              timestamp: new Date(qr.submittedAt).toISOString(),
              title: `Quote request submitted (${qr.eventType})`,
              entityType: 'inquiry',
              entityId: qr.id,
            });
          }
        }
      }

      // Sort chronologically (newest first)
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.status(200).json({
        client: { id: client.id, firstName: client.firstName, lastName: client.lastName, email: client.email },
        totalEntries: timeline.length,
        timeline,
      });
    } catch (error) {
      console.error('Error building client timeline:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Assign an unmatched communication to a client
  app.post('/api/communications/:id/assign', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const communicationId = parseInt(req.params.id);
      const { clientId } = req.body;

      if (isNaN(communicationId) || !clientId) {
        return res.status(400).json({ message: 'Communication ID and clientId are required' });
      }

      const result = await storage.assignCommunicationToClient(communicationId, clientId);
      if (!result) {
        return res.status(404).json({ message: 'Communication not found' });
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error assigning communication:', error);
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
  
  // Admin-triggered batch re-matcher. Runs the same auto-matcher that fires
  // on ingestion across every raw lead that's currently 'new' /
  // 'needs_manual_review' with no linked opportunity. One-shot cleanup.
  app.post('/api/raw-leads/rematch', isAdminOrUser, async (req: Request, res: Response) => {
    try {
      const { autoMatchRawLead } = await import('./services/rawLeadMatcher');
      const candidates = await db
        .select()
        .from(rawLeads)
        .where(
          and(
            inArray(rawLeads.status, ['new', 'needs_manual_review']),
            isNull(rawLeads.createdOpportunityId),
          ),
        );

      const matched: number[] = [];
      const skipped: number[] = [];
      for (const lead of candidates) {
        const r = await autoMatchRawLead(lead);
        if (r.matched) matched.push(lead.id);
        else skipped.push(lead.id);
      }
      return res.json({
        ok: true,
        total: candidates.length,
        matchedCount: matched.length,
        skippedCount: skipped.length,
        matchedIds: matched,
      });
    } catch (error) {
      console.error('Error running raw-lead rematch:', error);
      return res.status(500).json({ message: 'Server error' });
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
  // in the Inquiries admin view (or send the customer a link to complete it themselves).
  app.post('/api/raw-leads/:id/promote-to-inquiry', isAuthenticated, async (req: Request, res: Response) => {
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
      const existing = await db.select().from(inquiries).where(eq(inquiries.rawLeadId, leadId));
      if (existing.length > 0) {
        return res.status(200).json({
          message: 'Lead was already promoted to a quote request',
          inquiry: existing[0],
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

      const [inquiry] = await db.insert(inquiries).values({
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
        inquiry,
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

        // P1-2: pause drip — inbound email reply counts as engagement
        await pauseOpportunityDrip(existingThread.opportunityId ?? null, 'inbound_email');

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

      // Fire-and-forget owner SMS alert for this new lead (P0-1)
      sendOwnerSmsInBackground({
        ...newInquiryOwnerSms({
          firstName: leadData.extractedProspectName || 'Unknown',
          lastName: null,
          eventType: leadData.extractedEventType || 'event',
          guestCount: leadData.extractedGuestCount || null,
          eventDate: leadData.extractedEventDate || null,
          source: leadData.leadSourcePlatform || 'email',
          rawLeadId: createdLead.id,
        }),
        templateKey: 'new_inquiry_owner_alert',
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

      // P1-2: pause drip — inbound call counts as engagement (only if matched
      // to an existing opportunity; a brand-new lead won't have a drip yet).
      if (!isNewLead && callData.direction === 'inbound' && opportunityId) {
        await pauseOpportunityDrip(opportunityId, 'inbound_call');
      }

      // Fire-and-forget owner SMS alert on a new inbound-call lead (P0-1).
      // Only for inbound calls that created a fresh raw lead — outbound or
      // already-matched calls don't count as "new inquiries."
      if (isNewLead && callData.direction === 'inbound' && rawLeadId) {
        sendOwnerSmsInBackground({
          ...newInquiryOwnerSms({
            firstName: 'Unknown Caller',
            eventType: 'call',
            guestCount: null,
            eventDate: null,
            source: `phone ${customerPhone}`,
            rawLeadId,
          }),
          templateKey: 'new_inquiry_owner_alert',
        });
      }

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