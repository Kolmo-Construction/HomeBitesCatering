import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db"; // For direct database access
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
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
  communications,                // table for drizzle updates
  opportunityEmailThreads,       // table for thread migration
  quoteRequests,                 // for promote-to-quote-request endpoint
  rawLeads,                      // for promote-to-quote-request endpoint
  estimates,                     // for accept-estimate endpoint
  clients,                       // for accept-estimate endpoint (prospect→customer graduation)
  events,                        // for auto-create event on accept and /full endpoint
  menus,                         // for /api/events/:id/full aggregate endpoint
  type InsertCommunication,
  type InsertOpportunityEmailThread,
} from "@shared/schema";
import { aiService } from './services/aiService';
import { normalizePhoneNumber, isValidPhone } from './services/phoneService';
import { hasWriteAccess, canViewFinancials, isAdminOrUser } from './middleware/permissions';
import { filterEstimate, filterEstimates, filterMenuItem, filterMenuItems } from './utils/dataFilters';

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
      
      // Set the user id in the session
      req.session.userId = user.id;
      
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
        status: "new",
        opportunitySource: inquiryData.source,
        priority: "medium" as const, // Default priority for public inquiries
        assignedTo: null // Will be assigned later by admin
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

      return res.status(200).json({
        event,
        client: client ?? null,
        estimate,
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
  app.patch('/api/events/:id/checklist', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
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
  
  // Update an event
  app.patch('/api/events/:id', isAuthenticated, hasWriteAccess, async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const updateData = req.body;
      
      const updatedEvent = await storage.updateEvent(eventId, updateData);
      
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
      
      // Map AI-enriched fields to opportunity data
      const opportunityData = {
        // Ensure NOT NULL fields are always populated with at least empty strings
        firstName: firstName || 'Unknown',
        lastName: lastName || 'Contact',
        email: lead.extractedProspectEmail || 'unknown@example.com',
        phone: lead.extractedProspectPhone || null,
        eventType: lead.extractedEventType || 'Unspecified Event',
        // Handle different date formats
        eventDate: lead.extractedEventDate ? new Date(lead.extractedEventDate) : null,
        guestCount: lead.extractedGuestCount || null,
        venue: lead.extractedVenue || null,
        // Use leadSourcePlatform if available, otherwise use source or default
        opportunitySource: lead.leadSourcePlatform || lead.source || 'raw_lead',
        status: 'new',
        // Combine AI message summary with internal notes if both exist
        notes: formatNotes(lead),
        // Priority derived from AI lead quality (defaults to 'medium')
        priority: mapLeadQualityToPriority(lead.aiOverallLeadQuality ?? undefined),
      };

      const opportunity = await storage.createOpportunity(opportunityData);

      // Update the raw lead status and link the created opportunity
      await storage.updateRawLead(leadId, {
        status: 'qualified',
        createdOpportunityId: opportunity.id,
      });
      
      // Return the created opportunity
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