import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db"; // For direct database access
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import { eq } from "drizzle-orm"; // For equality operations
import Anthropic from "@anthropic-ai/sdk";
import { generateSuggestion, getQuestionTypeHelp, analyzeFormData } from "./services/ai-suggestions";
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
} from "@shared/schema";
// GmailSyncService has been retired in favor of specialized services
import { LeadGenerationService } from './services/leadGenerationService';
import { CommunicationSyncService } from './services/communicationSyncService';
import { VendorLeadIntakeService } from './services/VendorLeadIntakeService';
import { aiService } from './services/aiService';

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

// Initialize the service instances
const leadGenerationService = new LeadGenerationService();
const communicationSyncService = new CommunicationSyncService();
const vendorLeadIntakeService = new VendorLeadIntakeService();

export async function registerRoutes(app: Express): Promise<Server> {
  app.post('/api/gmail/vendor-lead-webhook', express.json({ type: '*/*' }), async (req: Request, res: Response) => {
    try {
      console.log('Received POST on /api/gmail/vendor-lead-webhook');
      // Log raw body for debugging Pub/Sub messages if needed
      // console.log('Raw body:', req.body.toString());

      if (!req.body || !req.body.message || !req.body.message.data) {
        console.warn('Webhook: Invalid Pub/Sub message format.');
        return res.status(400).send('Bad Request: Invalid Pub/Sub message format');
      }

      const pubsubMessage = req.body.message;
      const gmailNotification = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString('utf-8'));
      const { emailAddress, historyId } = gmailNotification;

      if (!emailAddress || !historyId) {
        console.warn('Webhook: Missing emailAddress or historyId in Gmail notification.');
        return res.status(400).send('Bad Request: Missing emailAddress or historyId');
      }

      // Verify this notification is for the email address we care about
      const targetEmail = process.env.SYNC_TARGET_EMAIL_ADDRESS || '';
      if (emailAddress.toLowerCase() !== targetEmail.toLowerCase()) {
        console.warn(`Webhook: Notification for untracked email address: ${emailAddress}. Target: ${targetEmail}`);
        return res.status(204).send(); // Acknowledge to Pub/Sub to prevent retries
      }

      // Asynchronously process the notification to ensure a quick response to Pub/Sub
      vendorLeadIntakeService.processGmailNotification(historyId).catch(processingError => {
        console.error('Webhook: Async error processing Gmail notification:', processingError);
        // Error is logged, Pub/Sub already acknowledged. Consider further error tracking.
      });

      res.status(204).send(); // ACK Pub/Sub immediately

    } catch (error: any) {
      console.error('Webhook: Error in webhook handler:', error);
      // If parsing req.body fails or another synchronous error occurs before async processing
      res.status(500).send('Internal Server Error');
    }
  });
  // Configure PostgreSQL session store
  const PgStore = pgSession(session);
  
  // Configure session middleware
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
      // Allow cookies on both HTTP and HTTPS
      secure: false,
      // Allow cookies across subdomains
      domain: process.env.REPLIT_DOMAINS ? 
        process.env.REPLIT_DOMAINS.split(',')[0].trim() : undefined,
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

  // Initialize email sync service, but don't start it yet
  // It's started manually by the admin via the /api/admin/email-sync/start endpoint
  // Email services are now initialized in server/index.ts and made available via req.app.get('serviceName')
  
  // Initialize and make lead generation service available to routes
  const leadGenService = new LeadGenerationService();
  app.set('leadGenService', leadGenService);
  
  // Initialize and make communication sync service available to routes
  const commSyncService = new CommunicationSyncService();
  app.set('commSyncService', commSyncService);

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
      
      // Don't return the password
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
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
  app.post('/api/opportunities', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const opportunityData = insertOpportunitySchema.parse(req.body);
      
      const newOpportunity = await storage.createOpportunity(opportunityData);
      
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
  app.patch('/api/opportunities/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const opportunityId = parseInt(req.params.id);
      
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: 'Invalid opportunity ID' });
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
  app.delete('/api/opportunities/:id', isAuthenticated, async (req: Request, res: Response) => {
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
      
      // If form data is provided, create form submission record
      if (inquiryData.formId && inquiryData.formResponses) {
        try {
          // Create form submission record
          const submissionData = {
            formId: inquiryData.formId,
            formVersion: inquiryData.formVersion || 1,
            opportunityId: newOpportunity.id,
            status: "completed",
            submittedAt: new Date()
          };
          
          const formSubmission = await storage.createFormSubmission(submissionData);
          
          // Store individual answers
          for (const response of inquiryData.formResponses) {
            await storage.createFormSubmissionAnswer({
              formSubmissionId: formSubmission.id,
              formPageQuestionId: response.questionId,
              answerValue: response.answer
            });
          }
          
          console.log(`Created form submission ${formSubmission.id} for opportunity ${newOpportunity.id}`);
        } catch (formError) {
          console.error('Error creating form submission record:', formError);
          // Don't fail the opportunity creation if form submission fails
        }
      }
      
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
      
      res.status(200).json(menuItems);
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
      
      res.status(200).json(responseItem);
    } catch (error) {
      console.error('Error getting menu item:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new menu item
  app.post('/api/menu-items', isAuthenticated, async (req: Request, res: Response) => {
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
  app.patch('/api/menu-items/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  app.delete('/api/menu-items/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  
  // Create a new menu
  app.post('/api/menus', isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Menu creation request body:', JSON.stringify(req.body, null, 2));
      console.log('Items field type:', typeof req.body.items);
      console.log('Items field value:', req.body.items);
      
      // Parse the incoming menu data with schema that now has default quantity
      const menuData = insertMenuSchema.parse(req.body);
      
      // If items is just a simple array of {id, quantity}, convert to MenuPackageStructure
      // This happens if displayOnCustomerForm is true
      if (Array.isArray(menuData.items) && menuData.items.length > 0 && menuData.displayOnCustomerForm) {
        const simpleItems = menuData.items as Array<{id: string, quantity: number}>;
        
        // Fetch menu item details to organize by category
        const allMenuItems = await storage.listMenuItems();
        const selectedItems = allMenuItems.filter(item => 
          simpleItems.some(simpleItem => simpleItem.id === item.id)
        );
        
        // Group items by category
        const categoriesMap = new Map<string, any[]>();
        selectedItems.forEach(item => {
          const category = item.category || 'Uncategorized';
          if (!categoriesMap.has(category)) {
            categoriesMap.set(category, []);
          }
          categoriesMap.get(category)!.push(item);
        });
        
        // Create MenuPackageStructure
        const packageStructure = {
          theme_key: `custom_${menuData.name.toLowerCase().replace(/\s+/g, '_')}`,
          package_id: `custom_package_${Date.now()}`,
          package_name: menuData.name,
          package_price_per_person: 0, // Will be calculated based on items
          package_description: menuData.description || `Custom menu: ${menuData.name}`,
          customizable: true,
          categories: Array.from(categoriesMap.entries()).map(([categoryName, items]) => ({
            category_key: categoryName.toLowerCase().replace(/\s+/g, '_'),
            display_title: categoryName,
            description: `${categoryName} selection`,
            available_item_ids: items.map(item => item.id),
            selection_limit: items.length, // Allow all items in the category
            upcharge_info: items.reduce((acc, item) => {
              if (item.upcharge && parseFloat(item.upcharge) > 0) {
                acc[item.id] = parseFloat(item.upcharge);
              }
              return acc;
            }, {} as Record<string, number>)
          }))
        };
        
        // Replace simple items array with rich package structure
        menuData.items = packageStructure;
        
        console.log('Converted to MenuPackageStructure:', JSON.stringify(packageStructure, null, 2));
      }
      
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
  app.patch('/api/menus/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const menuId = parseInt(req.params.id);
      
      if (isNaN(menuId)) {
        return res.status(400).json({ message: 'Invalid menu ID' });
      }
      
      const updateData = req.body;
      
      // If items is just a simple array of {id, quantity}, convert to MenuPackageStructure
      // This happens if displayOnCustomerForm is true
      if (Array.isArray(updateData.items) && updateData.items.length > 0 && updateData.displayOnCustomerForm) {
        const simpleItems = updateData.items as Array<{id: string, quantity: number}>;
        
        // Fetch menu item details to organize by category
        const allMenuItems = await storage.listMenuItems();
        const selectedItems = allMenuItems.filter(item => 
          simpleItems.some(simpleItem => simpleItem.id === item.id)
        );
        
        // Group items by category
        const categoriesMap = new Map<string, any[]>();
        selectedItems.forEach(item => {
          const category = item.category || 'Uncategorized';
          if (!categoriesMap.has(category)) {
            categoriesMap.set(category, []);
          }
          categoriesMap.get(category)!.push(item);
        });
        
        // Create MenuPackageStructure
        const packageStructure = {
          theme_key: `custom_${updateData.name?.toLowerCase().replace(/\s+/g, '_') || 'menu'}`,
          package_id: `custom_package_${Date.now()}`,
          package_name: updateData.name || 'Custom Menu',
          package_price_per_person: 0, // Will be calculated based on items
          package_description: updateData.description || 'Custom menu package',
          customizable: true,
          categories: Array.from(categoriesMap.entries()).map(([categoryName, items]) => ({
            category_key: categoryName.toLowerCase().replace(/\s+/g, '_'),
            display_title: categoryName,
            description: `${categoryName} selection`,
            available_item_ids: items.map(item => item.id),
            selection_limit: items.length, // Allow all items in the category
            upcharge_info: items.reduce((acc, item) => {
              if (item.upcharge && parseFloat(item.upcharge) > 0) {
                acc[item.id] = parseFloat(item.upcharge);
              }
              return acc;
            }, {} as Record<string, number>)
          }))
        };
        
        // Replace simple items array with rich package structure
        updateData.items = packageStructure;
      }
      
      const updatedMenu = await storage.updateMenu(menuId, updateData);
      
      if (!updatedMenu) {
        return res.status(404).json({ message: 'Menu not found' });
      }
      
      res.status(200).json(updatedMenu);
    } catch (error) {
      console.error('Error updating menu:', error);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a menu
  app.delete('/api/menus/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  app.post('/api/clients', isAuthenticated, async (req: Request, res: Response) => {
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
  app.patch('/api/clients/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  app.delete('/api/clients/:id', isAuthenticated, async (req: Request, res: Response) => {
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
      
      res.status(200).json(estimates);
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
      
      res.status(200).json(estimate);
    } catch (error) {
      console.error('Error getting estimate:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new estimate
  app.post('/api/estimates', isAuthenticated, async (req: Request, res: Response) => {
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
  app.patch('/api/estimates/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  
  // Delete an estimate
  app.delete('/api/estimates/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  
  // Create a new event
  app.post('/api/events', isAuthenticated, async (req: Request, res: Response) => {
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
  app.patch('/api/events/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  app.delete('/api/events/:id', isAuthenticated, async (req: Request, res: Response) => {
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
  app.post('/api/communications', isAuthenticated, async (req: Request, res: Response) => {
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
      const leadData = {
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
        notes: formatNotes(lead)
      };
      
      // Add priority based on AI lead quality if available
      if (lead.aiOverallLeadQuality) {
        opportunityData.priority = mapLeadQualityToPriority(lead.aiOverallLeadQuality);
      }
      
      const opportunity = await storage.createOpportunity(opportunityData);
      
      // Update the raw lead status to indicate it's been processed
      await storage.updateRawLead(leadId, { 
        status: 'qualified',
        processed: true,
        processedAt: new Date(),
        relatedOpportunityId: opportunity.id
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
  app.post('/api/raw-leads', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadData = insertRawLeadSchema.parse(req.body);
      
      const newLead = await storage.createRawLead(leadData);
      
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
  app.patch('/api/raw-leads/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      
      if (isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid lead ID' });
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
  app.delete('/api/raw-leads/:id', isAuthenticated, async (req: Request, res: Response) => {
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
        calendarConflict: lead.aiCalendarConflictAssessment || '',
        rawEmailData: lead.rawData
      };
      
      res.status(200).json(formData);
    } catch (error) {
      console.error('Error getting lead form data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Trigger manual email sync from interface@eathomebites.com
  app.post('/api/email-parser/sync-now', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const vendorLeadIntakeService = req.app.get('vendorLeadIntakeService');
      
      if (!vendorLeadIntakeService) {
        return res.status(503).json({ 
          message: 'Vendor Lead Intake Service not initialized',
          success: false
        });
      }
      
      await vendorLeadIntakeService.processGmailNotification();
      
      res.status(200).json({
        message: 'Email sync completed successfully',
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error syncing emails:', error);
      res.status(500).json({
        message: 'Failed to sync emails',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    }
  });

  // ===== GOOGLE APPS SCRIPT EMAIL INTAKE =====
  
  // Zod schema for GAS email payload validation
  const gasEmailPayloadSchema = z.object({
    gmailMessageId: z.string().min(1),
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

      // Use AI to extract structured data from the email
      const extractedData = await aiService.extractLeadDataFromEmail({
        subject,
        from,
        bodyText: cleanedText,
        bodyHtml: rawHtml,
        receivedDate: new Date(receivedDate)
      });

      // Create raw lead with structured data
      const leadData: any = {
        source: 'google_apps_script',
        status: extractedData.status || 'new',
        receivedAt: new Date(receivedDate),
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

      // Mark email as processed
      await storage.recordProcessedEmail({
        messageId: gmailMessageId,
        serviceName: 'google_apps_script',
        processedAt: new Date(),
        labelApplied: true
      });

      console.log(`GAS Email Intake: Created lead ID ${createdLead.id} for email "${subject}"`);

      res.status(201).json({
        success: true,
        leadId: createdLead.id,
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

  // ===== Email Services Routes =====
  
  // === Lead Generation Service Routes ===
  
  // Start lead generation service
  app.post('/api/admin/lead-gen/start', isAdmin, async (req: Request, res: Response) => {
    try {
      const leadGenService = req.app.get('leadGenService');
      
      if (!leadGenService) {
        return res.status(503).json({ message: 'Lead Generation Service not initialized' });
      }
      
      // Start the service
      leadGenService.start();
      
      res.status(200).json({
        message: 'Lead Generation service started successfully',
        status: { isRunning: leadGenService.isRunning() }
      });
    } catch (error) {
      console.error('Error starting lead generation service:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Manually process lead emails
  app.post('/api/admin/lead-gen/process', isAdmin, async (req: Request, res: Response) => {
    try {
      const leadGenService = req.app.get('leadGenService');
      
      if (!leadGenService) {
        return res.status(503).json({ message: 'Lead Generation Service not initialized' });
      }
      
      if (!leadGenService.isRunning()) {
        return res.status(400).json({ 
          message: 'Lead Generation Service is not running. Start the service first.',
          success: false
        });
      }
      
      // Process emails on demand
      await leadGenService.processLeadEmailsOnDemand();
      
      res.status(200).json({
        message: 'Lead emails processed successfully',
        success: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing lead emails:', error);
      res.status(500).json({ 
        message: 'Failed to process lead emails',
        error: error.message,
        success: false
      });
    }
  });
  
  // Stop lead generation service
  app.post('/api/admin/lead-gen/stop', isAdmin, async (req: Request, res: Response) => {
    try {
      const leadGenService = req.app.get('leadGenService');
      
      if (!leadGenService) {
        return res.status(503).json({ message: 'Lead Generation Service not initialized' });
      }
      
      // Stop the service
      leadGenService.stop();
      
      res.status(200).json({
        message: 'Lead Generation service stopped successfully',
        status: { isRunning: leadGenService.isRunning() }
      });
    } catch (error) {
      console.error('Error stopping lead generation service:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Manually trigger Gmail OAuth
  app.post('/api/admin/vendor-lead/manual-sync', isAdmin, async (req: Request, res: Response) => {
    try {
      // Trigger manual Gmail API check
      await vendorLeadIntakeService.ensureWatchIsActive();
      
      res.status(200).json({
        message: 'Manual Gmail check executed successfully',
        success: true
      });
    } catch (error) {
      console.error('Error executing manual Gmail check:', error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message,
        success: false
      });
    }
  });
  
  // Get vendor lead intake service status
  app.get('/api/admin/vendor-lead/status', isAdmin, async (req: Request, res: Response) => {
    try {
      // Get basic status for vendor lead intake
      const status = {
        targetEmail: vendorLeadIntakeService.targetEmail,
        isConfigured: !!vendorLeadIntakeService.targetEmail && !!process.env.GOOGLE_CLOUD_PROJECT_ID
      };
      
      res.status(200).json({ status });
    } catch (error) {
      console.error('Error getting vendor lead intake status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // ===== Communication Sync Service Routes =====
  
  // Start communication sync service
  app.post('/api/admin/comm-sync/start', isAdmin, async (req: Request, res: Response) => {
    try {
      const { interval } = req.body;
      
      // Start the service with an optional custom interval
      const result = communicationSyncService.startSyncService(interval);
      
      res.status(200).json({
        message: 'Communication sync service started successfully',
        status: result
      });
    } catch (error) {
      console.error('Error starting communication sync service:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Stop communication sync service
  app.post('/api/admin/comm-sync/stop', isAdmin, async (req: Request, res: Response) => {
    try {
      // Stop the service
      const result = communicationSyncService.stopSyncService();
      
      res.status(200).json({
        message: 'Communication sync service stopped successfully',
        status: result
      });
    } catch (error) {
      console.error('Error stopping communication sync service:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get communication sync status
  app.get('/api/admin/comm-sync/status', isAdmin, async (req: Request, res: Response) => {
    try {
      // Get service status
      const status = communicationSyncService.getSyncStatus();
      
      res.status(200).json(status);
    } catch (error) {
      console.error('Error getting communication sync status:', error);
      res.status(500).json({ message: 'Server error' });
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
  
  // ===== AI Suggestions =====
  
  // Get suggestions for form fields
  app.post('/api/ai/suggestions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = req.body;
      
      if (!context.questionType || !context.questionText) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const suggestion = await generateSuggestion(context);
      
      res.status(200).json(suggestion);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({ 
        message: 'Unable to generate suggestions',
        suggestion: 'Consider providing a clear, concise response.'
      });
    }
  });
  
  // Get help text for question types
  app.get('/api/ai/help/:questionType', isAuthenticated, (req: Request, res: Response) => {
    try {
      const { questionType } = req.params;
      
      const helpText = getQuestionTypeHelp(questionType);
      
      res.status(200).json({ helpText });
    } catch (error) {
      console.error('Error getting help text:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Analyze form data
  app.post('/api/ai/analyze-form', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { formData, questions } = req.body;
      
      if (!formData || !questions) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const analysis = await analyzeFormData(formData, questions);
      
      res.status(200).json(analysis);
    } catch (error) {
      console.error('Error analyzing form data:', error);
      res.status(500).json({ 
        message: 'Unable to analyze form data',
        completeness: 0,
        suggestions: ['Please complete all required fields.']
      });
    }
  });

  // API routes removed

  // Create an HTTP server
  const server = createServer(app);
  
  return server;
}