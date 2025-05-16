import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db"; // For direct database access
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from "memorystore";
import { eq } from "drizzle-orm"; // For equality operations
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
  insertQuestionnairePageSchema, // For questionnaire page management
  insertQuestionnaireDefinitionSchema, // For questionnaire definition management
  insertQuestionnaireQuestionSchema, // For questionnaire question management
  insertQuestionnaireQuestionOptionSchema, // For questionnaire question options
  insertQuestionnaireMatrixColumnSchema, // For matrix columns
  insertQuestionnaireConditionalLogicSchema, // For conditional logic rules
  questionTypeEnum, // For question type validation
  questionnaireQuestions, // Table access
  questionnaireQuestionOptions, // Table access
  questionnaireMatrixColumns, // Table access
  conditionTriggerOperatorEnum, // For conditional logic trigger operators
  conditionActionTypeEnum, // For conditional logic actions
  questionnaireDefinitions, // Table access for definitions
  questionnaireSubmissions // Table access for submissions
} from "@shared/schema";
import { GmailSyncService } from './services/emailSyncService'; // Import the service
import { LeadGenerationService } from './services/leadGenerationService';
import { CommunicationSyncService } from './services/communicationSyncService';

const MS_IN_ONE_DAY = 24 * 60 * 60 * 1000;

// Validation schemas for questionnaire page API endpoints
const questionnairePageCreateSchema = insertQuestionnairePageSchema.extend({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }),
  order: z.number().int().nonnegative({ message: "Order must be a non-negative integer" })
}).omit({
  definitionId: true // We'll get this from the URL params
});

const questionnairePageUpdateSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters long" }).optional(),
  order: z.number().int().nonnegative({ message: "Order must be a non-negative integer" }).optional()
});

const questionnairePagesReorderSchema = z.object({
  pageIds: z.array(z.number().int().positive())
});

// Validation schemas for questionnaire questions API endpoints
// Define schema for options in question creation
const questionOptionCreateSchema = z.object({
  optionText: z.string().min(1, { message: "Option text is required" }),
  optionValue: z.string().min(1, { message: "Option value is required" }),
  order: z.number().int().nonnegative(),
  defaultSelectionIndicator: z.string().optional(),
  relatedMenuItemId: z.number().int().positive().optional()
});

// Define schema for matrix columns in question creation
const matrixColumnCreateSchema = z.object({
  columnText: z.string().min(1, { message: "Column text is required" }),
  columnValue: z.string().min(1, { message: "Column value is required" }),
  order: z.number().int().nonnegative()
});

// Main question creation schema
const questionnaireQuestionCreateSchema = insertQuestionnaireQuestionSchema.extend({
  questionText: z.string().min(3, { message: "Question text must be at least 3 characters long" }),
  questionKey: z.string().min(2, { message: "Question key must be at least 2 characters long" }),
  questionType: z.enum(questionTypeEnum.enumValues),
  order: z.number().int().nonnegative(),
  isRequired: z.boolean().default(false),
  placeholderText: z.string().optional(),
  helpText: z.string().optional(),
  validationRules: z.any().optional(),
  options: z.array(questionOptionCreateSchema).optional(),
  matrixColumns: z.array(matrixColumnCreateSchema).optional()
}).omit({
  pageId: true // We'll get this from the URL params
});

const questionnaireQuestionUpdateSchema = z.object({
  questionText: z.string().min(3, { message: "Question text must be at least 3 characters long" }).optional(),
  questionKey: z.string().min(2, { message: "Question key must be at least 2 characters long" }).optional(),
  questionType: z.enum(questionTypeEnum.enumValues).optional(),
  order: z.number().int().nonnegative().optional(),
  isRequired: z.boolean().optional(),
  placeholderText: z.string().optional(),
  helpText: z.string().optional(),
  validationRules: z.any().optional(),
  options: z.array(questionOptionCreateSchema).optional(),
  matrixColumns: z.array(matrixColumnCreateSchema).optional()
});

const questionnaireQuestionsReorderSchema = z.object({
  questionIds: z.array(z.number().int().positive())
});

// Validation schemas for questionnaire conditional logic API endpoints
const conditionalLogicRuleCreateSchema = z.object({
  triggerQuestionKey: z.string().min(1, { message: "Trigger question key is required" }),
  triggerCondition: z.enum(conditionTriggerOperatorEnum.enumValues, {
    errorMap: () => ({ message: `Trigger condition must be one of: ${conditionTriggerOperatorEnum.enumValues.join(', ')}` })
  }),
  triggerValue: z.string().optional(),
  actionType: z.enum(conditionActionTypeEnum.enumValues, {
    errorMap: () => ({ message: `Action type must be one of: ${conditionActionTypeEnum.enumValues.join(', ')}` })
  }),
  targetQuestionKey: z.string().optional(),
  targetPageId: z.number().int().positive().optional(),
  targetOptionValue: z.string().optional()
});

const conditionalLogicRuleUpdateSchema = z.object({
  triggerQuestionKey: z.string().min(1).optional(),
  triggerCondition: z.enum(conditionTriggerOperatorEnum.enumValues, {
    errorMap: () => ({ message: `Trigger condition must be one of: ${conditionTriggerOperatorEnum.enumValues.join(', ')}` })
  }).optional(),
  triggerValue: z.string().optional(),
  actionType: z.enum(conditionActionTypeEnum.enumValues, {
    errorMap: () => ({ message: `Action type must be one of: ${conditionActionTypeEnum.enumValues.join(', ')}` })
  }).optional(),
  targetQuestionKey: z.string().optional(),
  targetPageId: z.number().int().positive().optional(),
  targetOptionValue: z.string().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Email sync service is initialized in server/index.ts
  // It's set to OFF by default and must be enabled explicitly by the user
  
  // Authentication middleware
  const SessionStore = MemoryStore(session);
  app.use(session({
    cookie: { maxAge: MS_IN_ONE_DAY },
    store: new SessionStore({
      checkPeriod: MS_IN_ONE_DAY
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'homebites-secret'
  }));

  // Check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session.userId) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };

  // Check if user has admin role
  const isAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    next();
  };

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // In production, passwords should be hashed
      if (password !== user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      res.json({ 
        id: user.id, 
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ 
        id: user.id, 
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.listUsers();
      // Don't send password hashes
      const sanitizedUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/users', isAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Opportunity routes
  app.get('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      const { status, source, priority } = req.query;
      let opportunities;

      if (priority && typeof priority === 'string') {
        // Validate if priority is a valid enum value
        if (!opportunityPriorityEnum.enumValues.includes(priority as any)) {
          return res.status(400).json({ message: 'Invalid priority value' });
        }
        opportunities = await storage.listOpportunitiesByPriority(priority as typeof opportunityPriorityEnum.enumValues[number]);
      } else if (status && typeof status === 'string') {
        opportunities = await storage.listOpportunitiesByStatus(status);
      } else if (source && typeof source === 'string') {
        opportunities = await storage.listOpportunitiesBySource(source);
      } else {
        opportunities = await storage.listOpportunities();
      }
      
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      // Extract client assignment preference and raw lead ID
      const { assignToExistingClient, clientId, rawLeadId, ...opportunityDataRaw } = req.body;
      
      // Validate opportunity data
      const opportunityData = insertOpportunitySchema.parse(opportunityDataRaw);
      
      // Create the opportunity
      const opportunity = await storage.createOpportunity(opportunityData);
      
      // Handle client association
      let client;
      
      if (assignToExistingClient && clientId) {
        // If explicitly assigning to an existing client
        client = await storage.getClient(Number(clientId));
        if (!client) {
          return res.status(404).json({ message: 'Client not found' });
        }
        
        // Update opportunity with client ID
        await storage.updateOpportunity(opportunity.id, { 
          clientId: client.id 
        });
      } else {
        // Auto-associate or create client based on email/phone
        let existingClient = null;
        
        // Check if client with this email already exists
        if (opportunityData.email) {
          existingClient = await storage.getClientByEmail(opportunityData.email);
        }
        
        // Check if client with this phone already exists (if no email match)
        if (!existingClient && opportunityData.phone) {
          existingClient = await storage.getClientByPhone(opportunityData.phone);
        }
        
        if (existingClient) {
          // Associate opportunity with existing client
          client = existingClient;
          await storage.updateOpportunity(opportunity.id, { 
            clientId: client.id 
          });
        } else {
          // Create a new client from opportunity data
          const clientData = {
            firstName: opportunityData.firstName,
            lastName: opportunityData.lastName,
            email: opportunityData.email,
            phone: opportunityData.phone,
            opportunityId: opportunity.id
          };
          
          client = await storage.createClient(clientData);
          
          // Update opportunity with the new client ID
          await storage.updateOpportunity(opportunity.id, { 
            clientId: client.id 
          });
        }
      }
      
      // If this opportunity was created from a raw lead, update the raw lead
      if (rawLeadId && !isNaN(Number(rawLeadId))) {
        const leadId = Number(rawLeadId);
        // Check if the raw lead exists
        const rawLead = await storage.getRawLeadById(leadId);
        if (rawLead) {
          // Update the raw lead with qualified status and link it to the created opportunity
          await storage.updateRawLead(leadId, {
            status: 'qualified',
            createdOpportunityId: opportunity.id
          });
        }
      }
      
      // Return the opportunity with associated client
      const updatedOpportunity = await storage.getOpportunity(opportunity.id);
      res.status(201).json(updatedOpportunity);
    } catch (error) {
      console.error("Error creating opportunity:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      const opportunity = await storage.getOpportunity(Number(req.params.id));
      if (!opportunity) {
        return res.status(404).json({ message: 'Opportunity not found' });
      }
      res.json(opportunity);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      const opportunityId = Number(req.params.id);
      const opportunity = await storage.getOpportunity(opportunityId);
      if (!opportunity) {
        return res.status(404).json({ message: 'Opportunity not found' });
      }
      
      // Validate priority field if it's included
      if (req.body.priority && !opportunityPriorityEnum.enumValues.includes(req.body.priority)) {
        return res.status(400).json({ 
          message: 'Invalid priority value',
          validValues: opportunityPriorityEnum.enumValues 
        });
      }
      
      // Create a partial update schema from the insert schema
      const updateSchema = z.object({
        firstName: insertOpportunitySchema.shape.firstName.optional(),
        lastName: insertOpportunitySchema.shape.lastName.optional(),
        email: insertOpportunitySchema.shape.email.optional(),
        phone: insertOpportunitySchema.shape.phone.optional(),
        eventType: insertOpportunitySchema.shape.eventType.optional(),
        eventDate: insertOpportunitySchema.shape.eventDate.optional(),
        guestCount: insertOpportunitySchema.shape.guestCount.optional(),
        venue: insertOpportunitySchema.shape.venue.optional(),
        notes: insertOpportunitySchema.shape.notes.optional(),
        status: insertOpportunitySchema.shape.status.optional(),
        priority: insertOpportunitySchema.shape.priority.optional(),
        opportunitySource: insertOpportunitySchema.shape.opportunitySource.optional(),
        assignedTo: insertOpportunitySchema.shape.assignedTo.optional(),
        // clientId is omitted in insertOpportunitySchema, add it directly
        clientId: z.number().nullable().optional(),
      });
      
      // Validate update data
      const updateData = updateSchema.parse(req.body);
      
      const updatedOpportunity = await storage.updateOpportunity(opportunityId, updateData);
      res.json(updatedOpportunity);
    } catch (error) {
      console.error("Error updating opportunity:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/opportunities/:id', isAuthenticated, async (req, res) => {
    try {
      const opportunityId = Number(req.params.id);
      const opportunity = await storage.getOpportunity(opportunityId);
      if (!opportunity) {
        return res.status(404).json({ message: 'Opportunity not found' });
      }
      
      await storage.deleteOpportunity(opportunityId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Menu Item routes
  app.get('/api/menu-items', async (req, res) => {
    try {
      const menuItems = await storage.listMenuItems();
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/menu-items', isAuthenticated, async (req, res) => {
    try {
      const menuItemData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/menu-items/:id', async (req, res) => {
    try {
      const menuItem = await storage.getMenuItem(Number(req.params.id));
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/menu-items/:id', isAuthenticated, async (req, res) => {
    try {
      const menuItemId = Number(req.params.id);
      const menuItem = await storage.getMenuItem(menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
      
      const updatedMenuItem = await storage.updateMenuItem(menuItemId, req.body);
      res.json(updatedMenuItem);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/menu-items/:id', isAuthenticated, async (req, res) => {
    try {
      const menuItemId = Number(req.params.id);
      const menuItem = await storage.getMenuItem(menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }
      
      await storage.deleteMenuItem(menuItemId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Menu routes
  app.get('/api/menus', async (req, res) => {
    try {
      const menus = await storage.listMenus();
      res.json(menus);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/menus/:id', async (req, res) => {
    try {
      const menu = await storage.getMenu(Number(req.params.id));
      if (!menu) {
        return res.status(404).json({ message: 'Menu not found' });
      }
      res.json(menu);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/menus', isAuthenticated, async (req, res) => {
    try {
      const menuData = insertMenuSchema.parse(req.body);
      const menu = await storage.createMenu(menuData);
      res.status(201).json(menu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/menus/:id', async (req, res) => {
    try {
      const menu = await storage.getMenu(Number(req.params.id));
      if (!menu) {
        return res.status(404).json({ message: 'Menu not found' });
      }
      res.json(menu);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/menus/:id', isAuthenticated, async (req, res) => {
    try {
      const menuId = Number(req.params.id);
      const menu = await storage.getMenu(menuId);
      if (!menu) {
        return res.status(404).json({ message: 'Menu not found' });
      }
      
      const updatedMenu = await storage.updateMenu(menuId, req.body);
      res.json(updatedMenu);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/menus/:id', isAuthenticated, async (req, res) => {
    try {
      const menuId = Number(req.params.id);
      const menu = await storage.getMenu(menuId);
      if (!menu) {
        return res.status(404).json({ message: 'Menu not found' });
      }
      
      await storage.deleteMenu(menuId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      console.log('Attempting to list all clients');
      const clients = await storage.listClients();
      console.log(`Successfully retrieved ${clients.length} clients`);
      res.json(clients);
    } catch (error) {
      console.error('Error getting clients:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      console.log('Client creation request received:', JSON.stringify(req.body));
      
      // First try to validate the data
      console.log('Validating client data against schema...');
      const clientData = insertClientSchema.parse(req.body);
      console.log('Client data validation passed:', JSON.stringify(clientData));
      
      // Then try to create it in the database
      console.log('Attempting to create client in database...');
      const client = await storage.createClient(clientData);
      console.log('Client created successfully with ID:', client.id);
      
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Client validation error:', JSON.stringify(error.errors));
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error creating client:', error);
      res.status(500).json({ message: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(Number(req.params.id));
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const updatedClient = await storage.updateClient(clientId, req.body);
      res.json(updatedClient);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      await storage.deleteClient(clientId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Estimate routes
  app.get('/api/estimates', isAuthenticated, async (req, res) => {
    try {
      const estimates = await storage.listEstimates();
      res.json(estimates);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/estimates', isAuthenticated, async (req, res) => {
    try {
      const estimateData = insertEstimateSchema.parse({
        ...req.body,
        createdBy: req.session.userId
      });
      const estimate = await storage.createEstimate(estimateData);
      
      // If the estimate is being sent right away, generate a client portal link
      if (estimate.status === 'sent') {
        // In a real app, you would use a proper JWT or secure token
        // For now, we'll just use the estimate ID as the token for simplicity
        const portalToken = estimate.id.toString();
        
        // The client portal URL that would be sent to the client
        const portalUrl = `${req.protocol}://${req.get('host')}/client-portal/${portalToken}`;
        console.log(`Client portal created: ${portalUrl}`);
        
        // Here you would typically send an email to the client with the portal link
        // For now, we'll just log it and include it in the response
        
        return res.status(201).json({ 
          ...estimate, 
          clientPortalUrl: portalUrl,
          message: "Estimate created and client portal link generated"
        });
      }
      
      res.status(201).json(estimate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/estimates/:id', async (req, res) => {
    try {
      const estimateId = Number(req.params.id);
      console.log(`Fetching estimate with ID: ${estimateId}`);
      
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate) {
        console.log(`Estimate with ID ${estimateId} not found`);
        return res.status(404).json({ message: 'Estimate not found' });
      }
      
      console.log(`Found estimate:`, estimate);
      
      // Add client name information for convenience
      if (estimate.clientId) {
        const client = await storage.getClient(estimate.clientId);
        if (client) {
          estimate.clientName = `${client.firstName} ${client.lastName}`;
        }
      }
      
      // Update view status if this is a client viewing
      if (req.query.client === 'true' && estimate.status === 'sent' && !estimate.viewedAt) {
        console.log(`Updating estimate ${estimateId} view status`);
        await storage.updateEstimate(estimate.id, {
          status: 'viewed',
          viewedAt: new Date()
        });
      }
      
      console.log(`Returning estimate data to client for ID ${estimateId}`);
      res.json(estimate);
    } catch (error) {
      console.error(`Error fetching estimate ${req.params.id}:`, error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/estimates/:id', isAuthenticated, async (req, res) => {
    try {
      const estimateId = Number(req.params.id);
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }
      
      // Check if the estimate status is being updated to "sent"
      const beingSent = req.body.status === 'sent' && estimate.status !== 'sent';
      
      // Validate the update data with the schema
      // Using partial because we're only updating some fields
      const partialSchema = z.object({
        // Add the fields we want to update with proper types
        eventDate: z.coerce.date().nullable().optional(),
        eventType: z.string().optional(),
        guestCount: z.number().optional(),
        venue: z.string().optional(),
        zipCode: z.string().optional(),
        menuId: z.number().nullable().optional(),
        items: z.string().optional(),
        additionalServices: z.string().nullable().optional(),
        subtotal: z.number().optional(),
        tax: z.number().optional(),
        total: z.number().optional(),
        status: z.string().optional(),
        notes: z.string().nullable().optional(),
        expiresAt: z.coerce.date().nullable().optional(),
        sentAt: z.coerce.date().nullable().optional(),
        viewedAt: z.coerce.date().nullable().optional(),
        acceptedAt: z.coerce.date().nullable().optional(),
        declinedAt: z.coerce.date().nullable().optional(),
      });
      
      // Validate and parse the data
      const updateData = partialSchema.parse(req.body);
      
      // Update the estimate
      const updatedEstimate = await storage.updateEstimate(estimateId, updateData);
      
      // If the estimate is being sent, generate a client portal link
      if (beingSent) {
        // In a real app, you would use a proper JWT or secure token
        // For now, we'll just use the estimate ID as the token for simplicity
        const portalToken = estimateId.toString();
        
        // The client portal URL that would be sent to the client
        const portalUrl = `${req.protocol}://${req.get('host')}/client-portal/${portalToken}`;
        console.log(`Client portal created: ${portalUrl}`);
        
        // Here you would typically send an email to the client with the portal link
        // For now, we'll just log it and include it in the response
        
        return res.json({ 
          ...updatedEstimate, 
          clientPortalUrl: portalUrl,
          message: "Quote updated and client portal link generated"
        });
      }
      
      res.json(updatedEstimate);
    } catch (error) {
      console.error("Error updating estimate:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/estimates/:id', isAuthenticated, async (req, res) => {
    try {
      const estimateId = Number(req.params.id);
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }
      
      await storage.deleteEstimate(estimateId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Client portal routes
  app.post('/api/estimates/:id/accept', async (req, res) => {
    try {
      const estimateId = Number(req.params.id);
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }
      
      const updatedEstimate = await storage.updateEstimate(estimateId, {
        status: 'accepted',
        acceptedAt: new Date()
      });
      
      res.json(updatedEstimate);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/estimates/:id/decline', async (req, res) => {
    try {
      const estimateId = Number(req.params.id);
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate) {
        return res.status(404).json({ message: 'Estimate not found' });
      }
      
      const updatedEstimate = await storage.updateEstimate(estimateId, {
        status: 'declined',
        declinedAt: new Date()
      });
      
      res.json(updatedEstimate);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Event routes
  app.get('/api/events', isAuthenticated, async (req, res) => {
    try {
      const events = await storage.listEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/events/upcoming', isAuthenticated, async (req, res) => {
    try {
      const events = await storage.listUpcomingEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/events', isAuthenticated, async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/events/:id', isAuthenticated, async (req, res) => {
    try {
      const event = await storage.getEvent(Number(req.params.id));
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/events/:id', isAuthenticated, async (req, res) => {
    try {
      const eventId = Number(req.params.id);
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      const updatedEvent = await storage.updateEvent(eventId, req.body);
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req, res) => {
    try {
      const eventId = Number(req.params.id);
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      await storage.deleteEvent(eventId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // --- NEW: Contact Identifier Routes ---

  // POST /api/contact-identifiers - Create a new contact identifier
  app.post('/api/contact-identifiers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Validate that either opportunityId or clientId is provided, but not both for simplicity here.
      if (!req.body.opportunityId && !req.body.clientId) {
        return res.status(400).json({ message: 'Either opportunityId or clientId must be provided.' });
      }
      if (req.body.opportunityId && req.body.clientId) {
        return res.status(400).json({ message: 'Contact identifier cannot be linked to both an opportunity and a client simultaneously through this endpoint.' });
      }

      const identifierData = insertContactIdentifierSchema.parse(req.body);
      const newIdentifier = await storage.createContactIdentifier(identifierData);
      res.status(201).json(newIdentifier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error("Error creating contact identifier:", error);
      res.status(500).json({ message: 'Server error creating contact identifier' });
    }
  });

  // GET /api/opportunities/:opportunityId/contact-identifiers - Get identifiers for an opportunity
  app.get('/api/opportunities/:opportunityId/contact-identifiers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const opportunityId = Number(req.params.opportunityId);
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: 'Invalid opportunity ID.' });
      }
      const identifiers = await storage.getContactIdentifiers({ opportunityId });
      res.json(identifiers);
    } catch (error) {
      console.error("Error fetching contact identifiers for opportunity:", error);
      res.status(500).json({ message: 'Server error fetching contact identifiers' });
    }
  });

  // GET /api/clients/:clientId/contact-identifiers - Get identifiers for a client
  app.get('/api/clients/:clientId/contact-identifiers', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = Number(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID.' });
      }
      const identifiers = await storage.getContactIdentifiers({ clientId });
      res.json(identifiers);
    } catch (error) {
      console.error("Error fetching contact identifiers for client:", error);
      res.status(500).json({ message: 'Server error fetching contact identifiers' });
    }
  });
  
  // DELETE /api/contact-identifiers/:id - Delete a contact identifier
  app.delete('/api/contact-identifiers/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid identifier ID.' });
      }
      await storage.deleteContactIdentifier(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting contact identifier:", error);
      res.status(500).json({ message: 'Server error deleting contact identifier' });
    }
  });


  // --- NEW: Communication Routes ---

  // POST /api/communications - Create a new communication log (manual entry)
  app.post('/api/communications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Parse the request data with timestamp handling
      const communicationData = insertCommunicationSchema.parse({
        ...req.body,
        timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(), // Ensure timestamp is a Date
      });
      const newCommunication = await storage.createCommunication(communicationData);
      res.status(201).json(newCommunication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error("Error creating communication log:", error);
      res.status(500).json({ message: 'Server error creating communication log' });
    }
  });

  // GET /api/opportunities/:opportunityId/communications - Get communication timeline for an opportunity
  app.get('/api/opportunities/:opportunityId/communications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const opportunityId = Number(req.params.opportunityId);
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: 'Invalid opportunity ID.' });
      }
      const communications = await storage.getCommunicationsForOpportunity(opportunityId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications for opportunity:", error);
      res.status(500).json({ message: 'Server error fetching communications' });
    }
  });

  // GET /api/clients/:clientId/communications - Get communication timeline for a client
  app.get('/api/clients/:clientId/communications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const clientId = Number(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid client ID.' });
      }
      const communications = await storage.getCommunicationsForClient(clientId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications for client:", error);
      res.status(500).json({ message: 'Server error fetching communications' });
    }
  });

  // --- NEW: Route for finding opportunity/client by contact info ---
  app.post('/api/contacts/find', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { value, type } = req.body;
      if (!value || (type !== 'email' && type !== 'phone')) {
        return res.status(400).json({ message: 'Invalid value or type for contact lookup.' });
      }
      const result = await storage.findOpportunityOrClientByContactIdentifier(value, type);
      if (!result) {
        return res.status(404).json({ message: 'No matching opportunity or client found.' });
      }
      res.json(result);
    } catch (error) {
      console.error("Error finding contact:", error);
      res.status(500).json({ message: 'Server error finding contact' });
    }
  });

  // --- Raw Leads Routes ---
  // Create a new raw lead
  app.post('/api/raw-leads', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertRawLeadSchema.parse(req.body);
      const rawLead = await storage.createRawLead(validatedData);
      res.status(201).json(rawLead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error("Error creating raw lead:", error);
      res.status(500).json({ message: 'Server error creating raw lead' });
    }
  });

  // Get a list of raw leads with optional filters
  app.get('/api/raw-leads', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const filters: { status?: string; source?: string } = {};
      
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      if (req.query.source) {
        filters.source = req.query.source as string;
      }
      
      const rawLeads = await storage.listRawLeads(filters);
      res.json(rawLeads);
    } catch (error) {
      console.error("Error listing raw leads:", error);
      res.status(500).json({ message: 'Server error listing raw leads' });
    }
  });

  // Get a specific raw lead by ID
  app.get('/api/raw-leads/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      
      const rawLead = await storage.getRawLeadById(id);
      if (!rawLead) {
        return res.status(404).json({ message: 'Raw lead not found' });
      }
      
      res.json(rawLead);
    } catch (error) {
      console.error(`Error fetching raw lead ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Server error fetching raw lead' });
    }
  });

  // Update a raw lead (e.g., change status, add notes)
  app.put('/api/raw-leads/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      
      // Check if the raw lead exists
      const existingRawLead = await storage.getRawLeadById(id);
      if (!existingRawLead) {
        return res.status(404).json({ message: 'Raw lead not found' });
      }
      
      // Update the raw lead
      const updatedRawLead = await storage.updateRawLead(id, req.body);
      res.json(updatedRawLead);
    } catch (error) {
      console.error(`Error updating raw lead ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Server error updating raw lead' });
    }
  });
  
  // Delete a single raw lead
  app.delete('/api/raw-leads/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      
      // Check if the raw lead exists
      const existingRawLead = await storage.getRawLeadById(id);
      if (!existingRawLead) {
        return res.status(404).json({ message: 'Raw lead not found' });
      }
      
      // Delete the raw lead
      const success = await storage.deleteRawLead(id);
      if (success) {
        res.status(200).json({ message: 'Raw lead deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete raw lead' });
      }
    } catch (error) {
      console.error(`Error deleting raw lead ID ${req.params.id}:`, error);
      res.status(500).json({ message: 'Server error deleting raw lead' });
    }
  });
  
  // Delete multiple raw leads
  app.post('/api/raw-leads/bulk-delete', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Invalid request - must provide an array of IDs' });
      }
      
      // Convert string IDs to numbers if needed
      const numericIds = ids.map(id => typeof id === 'string' ? parseInt(id) : id);
      
      // Check for any invalid IDs
      if (numericIds.some(id => isNaN(id))) {
        return res.status(400).json({ message: 'Invalid ID format in array' });
      }
      
      // Delete the raw leads
      const result = await storage.deleteManyRawLeads(numericIds);
      
      res.status(200).json({ 
        message: `Successfully deleted ${result.deleted} raw leads, ${result.failed} failed`, 
        ...result 
      });
    } catch (error) {
      console.error(`Error in bulk delete operation:`, error);
      res.status(500).json({ message: 'Server error during bulk delete operation' });
    }
  });

  // --- NEW: Google OAuth Routes for Gmail Sync ---
  app.get('/api/auth/google/initiate', isAuthenticated, isAdmin, (req, res) => { // Protect this
    // Log the redirect URI being used
    console.log("Using redirect URI:", process.env.GOOGLE_REDIRECT_URI);
    
    // Display a pre-authorization page with important information for the user
    res.send(`
      <html>
        <head>
          <title>Google Authentication for Email Sync</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { border: 1px solid #ccc; padding: 20px; border-radius: 5px; }
            .important { color: #d32f2f; font-weight: bold; }
            .scope-list { background: #f5f5f5; padding: 10px; border-radius: 4px; }
            button { padding: 10px 15px; background: #4285f4; color: white; border: none; cursor: pointer; border-radius: 4px; }
            button:hover { background: #3367d6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Google Authentication for Email Sync</h1>
            
            <p>You are about to authorize the application to access your Gmail account to automatically process incoming leads.</p>
            
            <p class="important">IMPORTANT: Make sure to grant ALL requested permissions, especially "Modify your Gmail messages" which is needed to mark processed emails as read.</p>
            
            <h3>Required Permissions:</h3>
            <ul class="scope-list">
              <li>Read emails from your Gmail account</li>
              <li>Modify your Gmail messages (to mark as read)</li>
              <li>See your email address</li>
              <li>See your basic profile info</li>
            </ul>
            
            <p>After authorization, the system will begin syncing emails from: ${process.env.SYNC_TARGET_EMAIL_ADDRESS || 'hello@eathomebites.com'}</p>
            
            <p><button onclick="window.location.href='${GmailSyncService.getOAuthClient().generateAuthUrl({
              access_type: 'offline',
              scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/gmail.labels',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
              ],
              prompt: 'consent'
            })}'">Proceed to Google Authentication</button></p>
          </div>
        </body>
      </html>
    `);
  });

  app.get('/api/auth/google/callback', async (req, res) => { // No isAuthenticated here, Google redirects to it
    // Check if there's an error in the callback
    if (req.query.error) {
      console.error("OAuth Error:", req.query.error);
      return res.status(400).send(`
        <h1>Authentication Error</h1>
        <p>Error: ${req.query.error}</p>
        <p>Error description: ${req.query.error_description || 'No description provided'}</p>
        <p>Please check your Google Cloud Console OAuth configuration. Make sure the redirect URI exactly matches:</p>
        <pre>${process.env.GOOGLE_REDIRECT_URI}</pre>
        <p><a href="/api/auth/google/initiate">Try again</a></p>
      `);
    }
    
    const code = req.query.code as string;
    
    console.log("Received OAuth callback with code:", code ? "Code received" : "No code");
    
    if (!code) {
      return res.status(400).send('Authorization code missing.');
    }
    
    try {
      console.log("Attempting to exchange code for tokens...");
      const success = await GmailSyncService.setTokensFromCode(code);
      
      if (success) {
        console.log("Successfully exchanged auth code for tokens!");
        
        // Get the granted scopes for display
        const grantedScopes = GmailSyncService.getOAuthClient().credentials.scope || '';
        const hasModifyScope = grantedScopes.includes('https://www.googleapis.com/auth/gmail.modify');
        const hasLabelsScope = grantedScopes.includes('https://www.googleapis.com/auth/gmail.labels');
        
        res.send(`
          <html>
            <head>
              <title>Google Authentication Successful</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .container { border: 1px solid #ccc; padding: 20px; border-radius: 5px; }
                .success { color: #4caf50; }
                .warning { color: #ff9800; font-weight: bold; }
                .error { color: #f44336; font-weight: bold; }
                .scope-list { background: #f5f5f5; padding: 10px; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="success">Google Authentication Successful!</h1>
                <p>Tokens obtained. The email sync service will now use these credentials.</p>
                
                <h3>Granted Permissions:</h3>
                <div class="scope-list">
                  <p>${grantedScopes.split(' ').join('<br>')}</p>
                </div>
                
                ${!hasModifyScope || !hasLabelsScope ? `
                <div class="error">
                  <h3>Warning: Missing Required Permissions</h3>
                  <p>The following permissions are missing:</p>
                  <ul>
                    ${!hasModifyScope ? `<li>The "gmail.modify" scope is missing. The system will not be able to mark emails as read after processing them.</li>` : ''}
                    ${!hasLabelsScope ? `<li>The "gmail.labels" scope is missing. The system will not be able to create or modify labels to track processed emails.</li>` : ''}
                  </ul>
                  <p>This may cause duplicate email processing and other functionality issues.</p>
                  <p>Please <a href="/api/auth/google/initiate">re-authorize</a> and make sure to grant all requested permissions.</p>
                </div>
                ` : `
                <p class="success">✓ All required permissions have been granted.</p>
                `}
                
                <p>You can close this window and return to the application.</p>
                
                <p><small>Note: If a new Refresh Token was logged in your server console, update your .env/Secrets with it for persistence.</small></p>
              </div>
            </body>
          </html>
        `);
      } else {
        console.error("Failed to obtain tokens from Google.");
        res.status(500).send(`
          <html>
            <head>
              <title>Authentication Failed</title>
              <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                .container { border: 1px solid #ccc; padding: 20px; border-radius: 5px; }
                .error { color: #f44336; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1 class="error">Authentication Failed</h1>
                <p>Failed to obtain tokens from Google.</p>
                <p><a href="/api/auth/google/initiate">Try again</a></p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      res.status(500).send(`
        <h1>Error During Authentication</h1>
        <p>An error occurred while processing your request:</p>
        <pre>${error.message}</pre>
        <p>Please check the server logs for more details.</p>
        <p><a href="/api/auth/google/initiate">Try again</a></p>
      `);
    }
  });

  // Email Services Control Endpoints - FOR DEBUGGING, isAuthenticated and isAdmin are temporarily removed
  
  // Legacy Gmail Sync (general purpose) - will eventually be retired
  app.get('/api/email-sync/status', (req, res) => {
    const gmailSyncService = req.app.get('gmailSyncService');
    if (!gmailSyncService) {
      return res.status(404).json({ 
        enabled: false, 
        configured: false, 
        message: 'Gmail sync service is not configured' 
      });
    }
    
    // Get the running status from the service
    res.json({ 
      enabled: gmailSyncService.isRunning(), 
      configured: true,
      targetEmail: gmailSyncService.getTargetEmail(),
      // Add debug info
      isRunning: gmailSyncService.isRunning(),
      timerId: gmailSyncService.getTimerId() ? "Timer exists" : "No timer",
      inspectRunningStatus: JSON.stringify(gmailSyncService.inspectStatus())
    });
  });
  
  app.post('/api/email-sync/toggle', (req, res) => {
    const gmailSyncService = req.app.get('gmailSyncService');
    
    if (!gmailSyncService) {
      return res.status(404).json({ 
        success: false, 
        message: 'Gmail sync service is not configured' 
      });
    }
    
    const { enabled } = req.body;
    console.log("Email sync toggle request received: ", enabled);
    
    if (enabled === true) {
      // Start the service
      try {
        gmailSyncService.start();
        console.log("Email sync service started successfully");
        return res.json({ 
          success: true, 
          enabled: true, 
          message: 'Gmail sync service started' 
        });
      } catch (error) {
        console.error("Error starting email sync service:", error);
        return res.status(500).json({
          success: false,
          enabled: gmailSyncService.isRunning(),
          message: `Error starting service: ${error.message || 'Unknown error'}`
        });
      }
    } else if (enabled === false) {
      // Stop the service
      try {
        gmailSyncService.stop();
        console.log("Email sync service stopped successfully");
        return res.json({ 
          success: true, 
          enabled: false, 
          message: 'Gmail sync service stopped' 
        });
      } catch (error) {
        console.error("Error stopping email sync service:", error);
        return res.status(500).json({
          success: false,
          enabled: gmailSyncService.isRunning(),
          message: `Error stopping service: ${error.message || 'Unknown error'}`
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request. "enabled" parameter must be true or false' 
      });
    }
  });
  
  // Lead Generation Service Control
  app.get('/api/lead-generation/status', (req, res) => {
    const leadGenService = req.app.get('leadGenService');
    if (!leadGenService) {
      return res.status(404).json({ 
        enabled: false, 
        configured: false, 
        message: 'Lead generation service is not configured' 
      });
    }
    
    res.json({ 
      enabled: leadGenService.isRunning(), 
      configured: true,
      targetEmail: leadGenService.getTargetEmail(),
      // Add debug info
      isRunning: leadGenService.isRunning(),
      timerId: leadGenService.getTimerId() ? "Timer exists" : "No timer",
      inspectRunningStatus: JSON.stringify(leadGenService.inspectStatus()),
      serviceType: 'lead_generation'
    });
  });
  
  app.post('/api/lead-generation/toggle', (req, res) => {
    const leadGenService = req.app.get('leadGenService');
    
    if (!leadGenService) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lead generation service is not configured' 
      });
    }
    
    const { enabled } = req.body;
    console.log("Lead generation toggle request received: ", enabled);
    
    if (enabled === true) {
      try {
        leadGenService.start();
        console.log("Lead generation service started successfully");
        return res.json({ 
          success: true, 
          enabled: true, 
          message: 'Lead generation service started' 
        });
      } catch (error) {
        console.error("Error starting lead generation service:", error);
        return res.status(500).json({
          success: false,
          enabled: leadGenService.isRunning(),
          message: `Error starting service: ${error.message || 'Unknown error'}`
        });
      }
    } else if (enabled === false) {
      try {
        leadGenService.stop();
        console.log("Lead generation service stopped successfully");
        return res.json({ 
          success: true, 
          enabled: false, 
          message: 'Lead generation service stopped' 
        });
      } catch (error) {
        console.error("Error stopping lead generation service:", error);
        return res.status(500).json({
          success: false,
          enabled: leadGenService.isRunning(),
          message: `Error stopping service: ${error.message || 'Unknown error'}`
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request, expected { enabled: true|false }' 
      });
    }
  });
  
  // Communication Sync Service Control
  app.get('/api/communication-sync/status', (req, res) => {
    const commSyncService = req.app.get('commSyncService');
    if (!commSyncService) {
      return res.status(404).json({ 
        enabled: false, 
        configured: false, 
        message: 'Communication sync service is not configured' 
      });
    }
    
    res.json({ 
      enabled: commSyncService.isRunning(), 
      configured: true,
      targetEmail: commSyncService.getTargetEmail(),
      // Add debug info
      isRunning: commSyncService.isRunning(),
      timerId: commSyncService.getTimerId() ? "Timer exists" : "No timer",
      inspectRunningStatus: JSON.stringify(commSyncService.inspectStatus()),
      serviceType: 'communication_sync'
    });
  });
  
  app.post('/api/communication-sync/toggle', (req, res) => {
    const commSyncService = req.app.get('commSyncService');
    
    if (!commSyncService) {
      return res.status(404).json({ 
        success: false, 
        message: 'Communication sync service is not configured' 
      });
    }
    
    const { enabled } = req.body;
    console.log("Communication sync toggle request received: ", enabled);
    
    if (enabled === true) {
      try {
        commSyncService.start();
        console.log("Communication sync service started successfully");
        return res.json({ 
          success: true, 
          enabled: true, 
          message: 'Communication sync service started' 
        });
      } catch (error) {
        console.error("Error starting communication sync service:", error);
        return res.status(500).json({
          success: false,
          enabled: commSyncService.isRunning(),
          message: `Error starting service: ${error.message || 'Unknown error'}`
        });
      }
    } else if (enabled === false) {
      try {
        commSyncService.stop();
        console.log("Communication sync service stopped successfully");
        return res.json({ 
          success: true, 
          enabled: false, 
          message: 'Communication sync service stopped' 
        });
      } catch (error) {
        console.error("Error stopping communication sync service:", error);
        return res.status(500).json({
          success: false,
          enabled: commSyncService.isRunning(),
          message: `Error stopping service: ${error.message || 'Unknown error'}`
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid request, expected { enabled: true|false }' 
      });
    }
  });
  
  // Email Services Status Summary Endpoint
  app.get('/api/email-services/status', (req, res) => {
    const gmailSyncService = req.app.get('gmailSyncService');
    const leadGenService = req.app.get('leadGenService');
    const commSyncService = req.app.get('commSyncService');
    
    res.json({
      legacy: {
        configured: !!gmailSyncService,
        enabled: gmailSyncService ? gmailSyncService.isRunning() : false,
        targetEmail: gmailSyncService ? gmailSyncService.getTargetEmail() : null
      },
      leadGeneration: {
        configured: !!leadGenService,
        enabled: leadGenService ? leadGenService.isRunning() : false,
        targetEmail: leadGenService ? leadGenService.getTargetEmail() : null
      },
      communicationSync: {
        configured: !!commSyncService,
        enabled: commSyncService ? commSyncService.isRunning() : false,
        targetEmail: commSyncService ? commSyncService.getTargetEmail() : null
      },
      aiEnabled: process.env.OPENAI_API_KEY ? true : false
    });
  });

  // ===== Questionnaire Management Routes =====
  
  // Questionnaire Definitions

  // Get all questionnaire definitions
  app.get('/api/admin/questionnaires/definitions', isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('Fetching all questionnaire definitions');
      const definitions = await db.select().from(questionnaireDefinitions);
      console.log(`Found ${definitions.length} questionnaire definitions`);
      res.json(definitions);
    } catch (error) {
      console.error('Error fetching questionnaire definitions:', error);
      res.status(500).json({ message: 'Server error fetching questionnaire definitions' });
    }
  });
  
  // Create a new questionnaire definition
  app.post('/api/admin/questionnaires/definitions', isAdmin, async (req: Request, res: Response) => {
    try {
      console.log('Creating questionnaire definition with data:', req.body);
      const validatedData = insertQuestionnaireDefinitionSchema.parse(req.body);
      console.log('Validated data:', validatedData);
      
      // If setting this definition to active, ensure only one definition is active at a time
      if (validatedData.isActive) {
        console.log('Setting as active definition, deactivating others');
        // Update all other definitions to inactive
        await db
          .update(questionnaireDefinitions)
          .set({ isActive: false })
          .where(eq(questionnaireDefinitions.isActive, true));
      }
      
      console.log('Calling storage.createQuestionnaireDefinition');
      const definition = await storage.createQuestionnaireDefinition(validatedData);
      console.log('Definition created successfully:', definition);
      
      res.status(201).json(definition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.errors);
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error creating questionnaire definition:', error);
      res.status(500).json({ message: 'Server error creating questionnaire definition' });
    }
  });
  
  // 1. Create a New Page for a Definition
  app.post('/api/admin/questionnaires/definitions/:definitionId/pages', isAdmin, async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      if (isNaN(definitionId) || definitionId <= 0) {
        return res.status(400).json({ message: 'Invalid definition ID' });
      }
      
      // Check if the questionnaire definition exists
      const definition = await storage.getQuestionnaireDefinition(definitionId);
      if (!definition) {
        return res.status(404).json({ message: 'Questionnaire definition not found' });
      }

      // Validate the request body
      const validatedData = questionnairePageCreateSchema.parse(req.body);
      
      // Create the page
      const newPage = await storage.createQuestionnairePage({
        ...validatedData,
        definitionId
      });
      
      res.status(201).json(newPage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error creating questionnaire page:', error);
      res.status(500).json({ message: 'Server error creating questionnaire page' });
    }
  });

  // 2. List All Pages for a Definition
  app.get('/api/admin/questionnaires/definitions/:definitionId/pages', isAdmin, async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      if (isNaN(definitionId) || definitionId <= 0) {
        return res.status(400).json({ message: 'Invalid definition ID' });
      }
      
      // Check if the questionnaire definition exists
      const definition = await storage.getQuestionnaireDefinition(definitionId);
      if (!definition) {
        return res.status(404).json({ message: 'Questionnaire definition not found' });
      }
      
      const pages = await storage.getQuestionnairePagesByDefinition(definitionId);
      res.json(pages);
    } catch (error) {
      console.error('Error listing questionnaire pages:', error);
      res.status(500).json({ message: 'Server error listing questionnaire pages' });
    }
  });

  // 3. Get a Single Page Details
  app.get('/api/admin/questionnaires/definitions/:definitionId/pages/:pageId', isAdmin, async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      const pageId = Number(req.params.pageId);
      
      if (isNaN(definitionId) || definitionId <= 0 || isNaN(pageId) || pageId <= 0) {
        return res.status(400).json({ message: 'Invalid definition ID or page ID' });
      }
      
      const page = await storage.getQuestionnairePage(pageId);
      if (!page) {
        return res.status(404).json({ message: 'Questionnaire page not found' });
      }
      
      // Verify the page belongs to the specified definition
      if (page.definitionId !== definitionId) {
        return res.status(404).json({ 
          message: 'Questionnaire page not found for the specified definition' 
        });
      }
      
      res.json(page);
    } catch (error) {
      console.error('Error getting questionnaire page:', error);
      res.status(500).json({ message: 'Server error getting questionnaire page' });
    }
  });

  // 4. Update a Page
  app.put('/api/admin/questionnaires/definitions/:definitionId/pages/:pageId', isAdmin, async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      const pageId = Number(req.params.pageId);
      
      if (isNaN(definitionId) || definitionId <= 0 || isNaN(pageId) || pageId <= 0) {
        return res.status(400).json({ message: 'Invalid definition ID or page ID' });
      }
      
      // Validate the request body
      const validatedData = questionnairePageUpdateSchema.parse(req.body);
      
      // Check if the page exists and belongs to the definition
      const page = await storage.getQuestionnairePage(pageId);
      if (!page) {
        return res.status(404).json({ message: 'Questionnaire page not found' });
      }
      
      if (page.definitionId !== definitionId) {
        return res.status(404).json({ 
          message: 'Questionnaire page not found for the specified definition' 
        });
      }
      
      // Update the page
      const updatedPage = await storage.updateQuestionnairePage(pageId, validatedData);
      res.json(updatedPage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error updating questionnaire page:', error);
      res.status(500).json({ message: 'Server error updating questionnaire page' });
    }
  });

  // 5. Delete a Page
  app.delete('/api/admin/questionnaires/definitions/:definitionId/pages/:pageId', isAdmin, async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      const pageId = Number(req.params.pageId);
      
      if (isNaN(definitionId) || definitionId <= 0 || isNaN(pageId) || pageId <= 0) {
        return res.status(400).json({ message: 'Invalid definition ID or page ID' });
      }
      
      // Check if the page exists and belongs to the definition
      const page = await storage.getQuestionnairePage(pageId);
      if (!page) {
        return res.status(404).json({ message: 'Questionnaire page not found' });
      }
      
      if (page.definitionId !== definitionId) {
        return res.status(404).json({ 
          message: 'Questionnaire page not found for the specified definition' 
        });
      }
      
      // Delete the page (and its associated questions, options, etc. via cascade delete)
      const deleted = await storage.deleteQuestionnairePage(pageId);
      if (deleted) {
        res.json({ message: 'Page deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete page' });
      }
    } catch (error) {
      console.error('Error deleting questionnaire page:', error);
      res.status(500).json({ message: 'Server error deleting questionnaire page' });
    }
  });

  // 6. Batch Update Page Order for a Definition
  app.patch('/api/admin/questionnaires/definitions/:definitionId/pages/reorder', isAdmin, async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      if (isNaN(definitionId) || definitionId <= 0) {
        return res.status(400).json({ message: 'Invalid definition ID' });
      }
      
      // Validate the request body
      const { pageIds } = questionnairePagesReorderSchema.parse(req.body);
      
      // Check if the definition exists
      const definition = await storage.getQuestionnaireDefinition(definitionId);
      if (!definition) {
        return res.status(404).json({ message: 'Questionnaire definition not found' });
      }
      
      // Get all existing pages for the definition
      const existingPages = await storage.getQuestionnairePagesByDefinition(definitionId);
      const existingPageIds = existingPages.map(page => page.id);
      
      // Verify that the provided pageIds match all existing pages
      const allPagesIncluded = pageIds.length === existingPageIds.length && 
        pageIds.every(id => existingPageIds.includes(id));
      
      if (!allPagesIncluded) {
        return res.status(400).json({ 
          message: 'The provided page IDs do not match the existing pages for this definition' 
        });
      }
      
      // Reorder the pages
      const updatedPages = await storage.reorderQuestionnairePages(definitionId, pageIds);
      res.json(updatedPages);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error reordering questionnaire pages:', error);
      res.status(500).json({ message: 'Server error reordering questionnaire pages' });
    }
  });

  // ===== Questionnaire Questions API Endpoints =====
  
  // 1. Create a New Question for a Page
  app.post('/api/admin/questionnaires/pages/:pageId/questions', isAdmin, async (req: Request, res: Response) => {
    try {
      const pageId = Number(req.params.pageId);
      if (isNaN(pageId) || pageId <= 0) {
        return res.status(400).json({ message: 'Invalid page ID' });
      }
      
      // Check if the questionnaire page exists
      const page = await storage.getQuestionnairePage(pageId);
      if (!page) {
        return res.status(404).json({ message: 'Questionnaire page not found' });
      }
      
      // Validate the request body
      const validatedData = questionnaireQuestionCreateSchema.parse(req.body);
      
      // Check for questionKey uniqueness (globally)
      const existingQuestion = await db
        .select()
        .from(questionnaireQuestions)
        .where(eq(questionnaireQuestions.questionKey, validatedData.questionKey))
        .limit(1);
      
      if (existingQuestion.length > 0) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: [{ 
            path: ['questionKey'], 
            message: 'Question key must be globally unique',
            code: 'custom' 
          }]
        });
      }
      
      // Extract any options and matrixColumns from the validated data
      const { options, matrixColumns, ...questionData } = validatedData;
      
      // Validate questionType against provided options/matrixColumns
      const requiresOptions = ['select', 'radio', 'checkbox_group'].includes(questionData.questionType);
      const requiresMatrixColumns = ['matrix_single', 'matrix_multi'].includes(questionData.questionType);
      
      if (requiresOptions && (!options || options.length === 0)) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: [{ 
            path: ['options'], 
            message: `Question type '${questionData.questionType}' requires at least one option`,
            code: 'custom' 
          }]
        });
      }
      
      if (requiresMatrixColumns && (!matrixColumns || matrixColumns.length === 0)) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: [{ 
            path: ['matrixColumns'], 
            message: `Question type '${questionData.questionType}' requires at least one matrix column`,
            code: 'custom' 
          }]
        });
      }
      
      // Create everything in a transaction
      let newQuestion;
      const questionWithRelations: any = {};
      
      await db.transaction(async (tx) => {
        // 1. Create the question
        const [createdQuestion] = await tx
          .insert(questionnaireQuestions)
          .values({
            ...questionData,
            pageId
          })
          .returning();
        
        newQuestion = createdQuestion;
        questionWithRelations.question = createdQuestion;
        questionWithRelations.options = [];
        questionWithRelations.matrixColumns = [];
        
        // 2. Create options if provided
        if (options && options.length > 0) {
          const optionsToInsert = options.map(option => ({
            ...option,
            questionId: createdQuestion.id
          }));
          
          const createdOptions = await tx
            .insert(questionnaireQuestionOptions)
            .values(optionsToInsert)
            .returning();
          
          questionWithRelations.options = createdOptions;
        }
        
        // 3. Create matrix columns if provided
        if (matrixColumns && matrixColumns.length > 0) {
          const columnsToInsert = matrixColumns.map(column => ({
            ...column,
            questionId: createdQuestion.id
          }));
          
          const createdColumns = await tx
            .insert(questionnaireMatrixColumns)
            .values(columnsToInsert)
            .returning();
          
          questionWithRelations.matrixColumns = createdColumns;
        }
      });
      
      res.status(201).json(questionWithRelations);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error creating questionnaire question:', error);
      res.status(500).json({ message: 'Server error creating questionnaire question' });
    }
  });
  
  // 2. List All Questions for a Page
  app.get('/api/admin/questionnaires/pages/:pageId/questions', isAdmin, async (req: Request, res: Response) => {
    try {
      const pageId = Number(req.params.pageId);
      if (isNaN(pageId) || pageId <= 0) {
        return res.status(400).json({ message: 'Invalid page ID' });
      }
      
      // Check if the questionnaire page exists
      const page = await storage.getQuestionnairePage(pageId);
      if (!page) {
        return res.status(404).json({ message: 'Questionnaire page not found' });
      }
      
      // Get questions for the page
      const questions = await db
        .select()
        .from(questionnaireQuestions)
        .where(eq(questionnaireQuestions.pageId, pageId))
        .orderBy(questionnaireQuestions.order);
      
      // For each question, get its options and matrix columns
      const questionsWithRelations = await Promise.all(questions.map(async (question) => {
        // Get options
        const options = await db
          .select()
          .from(questionnaireQuestionOptions)
          .where(eq(questionnaireQuestionOptions.questionId, question.id))
          .orderBy(questionnaireQuestionOptions.order);
        
        // Get matrix columns
        const matrixColumns = await db
          .select()
          .from(questionnaireMatrixColumns)
          .where(eq(questionnaireMatrixColumns.questionId, question.id))
          .orderBy(questionnaireMatrixColumns.order);
        
        return {
          ...question,
          options,
          matrixColumns
        };
      }));
      
      res.json(questionsWithRelations);
    } catch (error) {
      console.error('Error listing questionnaire questions:', error);
      res.status(500).json({ message: 'Server error listing questionnaire questions' });
    }
  });
  
  // 3. Get a Specific Question
  app.get('/api/admin/questionnaires/questions/:questionId', isAdmin, async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.questionId);
      if (isNaN(questionId) || questionId <= 0) {
        return res.status(400).json({ message: 'Invalid question ID' });
      }
      
      // Fetch the question
      const [question] = await db
        .select()
        .from(questionnaireQuestions)
        .where(eq(questionnaireQuestions.id, questionId));
      
      if (!question) {
        return res.status(404).json({ message: 'Questionnaire question not found' });
      }
      
      // Fetch options for this question
      const options = await db
        .select()
        .from(questionnaireQuestionOptions)
        .where(eq(questionnaireQuestionOptions.questionId, questionId))
        .orderBy(questionnaireQuestionOptions.order);
      
      // Fetch matrix columns for this question
      const matrixColumns = await db
        .select()
        .from(questionnaireMatrixColumns)
        .where(eq(questionnaireMatrixColumns.questionId, questionId))
        .orderBy(questionnaireMatrixColumns.order);
      
      // Return the question with its relations
      const questionWithRelations = {
        ...question,
        options,
        matrixColumns
      };
      
      res.json(questionWithRelations);
    } catch (error) {
      console.error('Error fetching questionnaire question:', error);
      res.status(500).json({ message: 'Server error fetching questionnaire question' });
    }
  });
  
  // 4. Update a Question
  app.put('/api/admin/questionnaires/questions/:questionId', isAdmin, async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.questionId);
      if (isNaN(questionId) || questionId <= 0) {
        return res.status(400).json({ message: 'Invalid question ID' });
      }
      
      // Check if the question exists
      const [existingQuestion] = await db
        .select()
        .from(questionnaireQuestions)
        .where(eq(questionnaireQuestions.id, questionId));
      
      if (!existingQuestion) {
        return res.status(404).json({ message: 'Questionnaire question not found' });
      }
      
      // Validate the request body
      const validatedData = questionnaireQuestionUpdateSchema.parse(req.body);
      
      // Check questionKey uniqueness if it's being updated
      if (validatedData.questionKey && validatedData.questionKey !== existingQuestion.questionKey) {
        const [existingQuestionWithKey] = await db
          .select()
          .from(questionnaireQuestions)
          .where(eq(questionnaireQuestions.questionKey, validatedData.questionKey));
        
        if (existingQuestionWithKey) {
          return res.status(400).json({ 
            message: 'Validation error', 
            errors: [{ 
              path: ['questionKey'], 
              message: 'Question key must be globally unique',
              code: 'custom' 
            }]
          });
        }
      }
      
      // Extract options and matrixColumns from the validated data
      const { options, matrixColumns, ...questionData } = validatedData;
      
      // Update in a transaction to ensure data consistency
      const questionWithRelations: any = {};
      
      await db.transaction(async (tx) => {
        // 1. Update the base question data
        const [updatedQuestion] = await tx
          .update(questionnaireQuestions)
          .set({ 
            ...questionData,
            updatedAt: new Date()
          })
          .where(eq(questionnaireQuestions.id, questionId))
          .returning();
        
        questionWithRelations.question = updatedQuestion;
        
        // 2. Update options if provided
        if (options) {
          // First delete existing options (easier than trying to update)
          await tx
            .delete(questionnaireQuestionOptions)
            .where(eq(questionnaireQuestionOptions.questionId, questionId));
          
          if (options.length > 0) {
            // Then insert the new options
            const optionsToInsert = options.map(option => ({
              ...option,
              questionId
            }));
            
            const createdOptions = await tx
              .insert(questionnaireQuestionOptions)
              .values(optionsToInsert)
              .returning();
            
            questionWithRelations.options = createdOptions;
          } else {
            questionWithRelations.options = [];
          }
        } else {
          // If options not in request, fetch existing ones
          const existingOptions = await tx
            .select()
            .from(questionnaireQuestionOptions)
            .where(eq(questionnaireQuestionOptions.questionId, questionId))
            .orderBy(questionnaireQuestionOptions.order);
          
          questionWithRelations.options = existingOptions;
        }
        
        // 3. Update matrix columns if provided
        if (matrixColumns) {
          // First delete existing matrix columns
          await tx
            .delete(questionnaireMatrixColumns)
            .where(eq(questionnaireMatrixColumns.questionId, questionId));
          
          if (matrixColumns.length > 0) {
            // Then insert the new matrix columns
            const columnsToInsert = matrixColumns.map(column => ({
              ...column,
              questionId
            }));
            
            const createdColumns = await tx
              .insert(questionnaireMatrixColumns)
              .values(columnsToInsert)
              .returning();
            
            questionWithRelations.matrixColumns = createdColumns;
          } else {
            questionWithRelations.matrixColumns = [];
          }
        } else {
          // If matrix columns not in request, fetch existing ones
          const existingColumns = await tx
            .select()
            .from(questionnaireMatrixColumns)
            .where(eq(questionnaireMatrixColumns.questionId, questionId))
            .orderBy(questionnaireMatrixColumns.order);
          
          questionWithRelations.matrixColumns = existingColumns;
        }
      });
      
      res.json(questionWithRelations);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error updating questionnaire question:', error);
      res.status(500).json({ message: 'Server error updating questionnaire question' });
    }
  });
  
  // 5. Delete a Question
  app.delete('/api/admin/questionnaires/questions/:questionId', isAdmin, async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.questionId);
      if (isNaN(questionId) || questionId <= 0) {
        return res.status(400).json({ message: 'Invalid question ID' });
      }
      
      // Check if the question exists
      const question = await storage.getQuestionnaireQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Questionnaire question not found' });
      }
      
      // Delete the question
      const success = await storage.deleteQuestionnaireQuestion(questionId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: 'Failed to delete the question' });
      }
    } catch (error) {
      console.error('Error deleting questionnaire question:', error);
      res.status(500).json({ message: 'Server error deleting questionnaire question' });
    }
  });
  
  // 6. Batch Update Question Order for a Page
  app.patch('/api/admin/questionnaires/pages/:pageId/questions/reorder', isAdmin, async (req: Request, res: Response) => {
    try {
      const pageId = Number(req.params.pageId);
      if (isNaN(pageId) || pageId <= 0) {
        return res.status(400).json({ message: 'Invalid page ID' });
      }
      
      // Validate the request body
      const { questionIds } = questionnaireQuestionsReorderSchema.parse(req.body);
      
      // Check if the page exists
      const page = await storage.getQuestionnairePage(pageId);
      if (!page) {
        return res.status(404).json({ message: 'Questionnaire page not found' });
      }
      
      // Get all existing questions for the page
      const existingQuestions = await storage.getQuestionnaireQuestionsByPage(pageId);
      const existingQuestionIds = existingQuestions.map(question => question.id);
      
      // Verify that the provided questionIds match all existing questions
      const allQuestionsIncluded = questionIds.length === existingQuestionIds.length && 
        questionIds.every(id => existingQuestionIds.includes(id));
      
      if (!allQuestionsIncluded) {
        return res.status(400).json({ 
          message: 'The provided question IDs do not match the existing questions for this page' 
        });
      }
      
      // Reorder the questions
      const updatedQuestions = await storage.reorderQuestionnaireQuestions(pageId, questionIds);
      res.json(updatedQuestions);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error reordering questionnaire questions:', error);
      res.status(500).json({ message: 'Server error reordering questionnaire questions' });
    }
  });
  
  // ===== Questionnaire Question Options API Endpoints =====
  
  // 1. List Options for a Question
  app.get('/api/admin/questionnaires/questions/:questionId/options', isAdmin, async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.questionId);
      if (isNaN(questionId) || questionId <= 0) {
        return res.status(400).json({ message: 'Invalid question ID' });
      }
      
      // Check if the question exists
      const question = await storage.getQuestionnaireQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Questionnaire question not found' });
      }
      
      const options = await storage.getQuestionnaireQuestionOptions(questionId);
      res.json(options);
    } catch (error) {
      console.error('Error listing question options:', error);
      res.status(500).json({ message: 'Server error listing question options' });
    }
  });
  
  // 2. Create a New Option for a Question
  app.post('/api/admin/questionnaires/questions/:questionId/options', isAdmin, async (req: Request, res: Response) => {
    try {
      const questionId = Number(req.params.questionId);
      if (isNaN(questionId) || questionId <= 0) {
        return res.status(400).json({ message: 'Invalid question ID' });
      }
      
      // Check if the question exists
      const question = await storage.getQuestionnaireQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: 'Questionnaire question not found' });
      }
      
      // Make sure the question type supports options
      if (!['select', 'multi-select', 'radio', 'checkbox'].includes(question.questionType)) {
        return res.status(400).json({ 
          message: `Cannot add options to a question of type '${question.questionType}'. Options are only supported for select, multi-select, radio, and checkbox types.` 
        });
      }
      
      // Create the option validation schema
      const optionCreateSchema = z.object({
        label: z.string().min(1, { message: "Option label is required" }),
        value: z.string().min(1, { message: "Option value is required" }),
        order: z.number().int().nonnegative().default(0)
      });
      
      // Validate the request body
      const validatedData = optionCreateSchema.parse(req.body);
      
      // Create the option with proper field names mapping
      const newOption = await storage.createQuestionnaireQuestionOption({
        questionId,
        order: validatedData.order,
        optionText: validatedData.label,
        optionValue: validatedData.value
      });
      
      res.status(201).json(newOption);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error creating question option:', error);
      res.status(500).json({ message: 'Server error creating question option' });
    }
  });
  
  // 3. Update an Option
  app.put('/api/admin/questionnaires/options/:optionId', isAdmin, async (req: Request, res: Response) => {
    try {
      const optionId = Number(req.params.optionId);
      if (isNaN(optionId) || optionId <= 0) {
        return res.status(400).json({ message: 'Invalid option ID' });
      }
      
      // Create the option update schema
      const optionUpdateSchema = z.object({
        label: z.string().min(1, { message: "Option label is required" }).optional(),
        value: z.string().min(1, { message: "Option value is required" }).optional(),
        order: z.number().int().nonnegative().optional()
      });
      
      // Validate the request body
      const validatedData = optionUpdateSchema.parse(req.body);
      
      // Map to the correct field names for updating
      const updateData: Partial<QuestionnaireQuestionOption> = {};
      if (validatedData.order !== undefined) updateData.order = validatedData.order;
      if (validatedData.label !== undefined) updateData.optionText = validatedData.label;
      if (validatedData.value !== undefined) updateData.optionValue = validatedData.value;
      
      // Update the option
      const updatedOption = await storage.updateQuestionnaireQuestionOption(optionId, updateData);
      if (!updatedOption) {
        return res.status(404).json({ message: 'Question option not found' });
      }
      
      res.json(updatedOption);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error updating question option:', error);
      res.status(500).json({ message: 'Server error updating question option' });
    }
  });
  
  // 4. Delete an Option
  app.delete('/api/admin/questionnaires/options/:optionId', isAdmin, async (req: Request, res: Response) => {
    try {
      const optionId = Number(req.params.optionId);
      if (isNaN(optionId) || optionId <= 0) {
        return res.status(400).json({ message: 'Invalid option ID' });
      }
      
      // Delete the option
      const success = await storage.deleteQuestionnaireQuestionOption(optionId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: 'Question option not found' });
      }
    } catch (error) {
      console.error('Error deleting question option:', error);
      res.status(500).json({ message: 'Server error deleting question option' });
    }
  });
  
  // ===== Questionnaire Conditional Logic API Endpoints =====
  
  // 1. Create a New Conditional Logic Rule
  app.post('/api/admin/questionnaires/definitions/:definitionId/conditional-logic', isAdmin, async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      if (isNaN(definitionId) || definitionId <= 0) {
        return res.status(400).json({ message: 'Invalid definition ID' });
      }
      
      // Check if the questionnaire definition exists
      const definition = await storage.getQuestionnaireDefinition(definitionId);
      if (!definition) {
        return res.status(404).json({ message: 'Questionnaire definition not found' });
      }
      
      // Validate the request body
      const validatedData = conditionalLogicRuleCreateSchema.parse(req.body);
      
      // Verify that triggerQuestionKey exists within this definition
      const triggerKeyExists = await storage.questionKeyExistsInDefinition(definitionId, validatedData.triggerQuestionKey);
      if (!triggerKeyExists) {
        return res.status(400).json({ 
          message: `Trigger question key "${validatedData.triggerQuestionKey}" does not exist in this questionnaire definition` 
        });
      }
      
      // If targetQuestionKey is provided, verify it exists
      if (validatedData.targetQuestionKey) {
        const targetKeyExists = await storage.questionKeyExistsInDefinition(definitionId, validatedData.targetQuestionKey);
        if (!targetKeyExists) {
          return res.status(400).json({ 
            message: `Target question key "${validatedData.targetQuestionKey}" does not exist in this questionnaire definition` 
          });
        }
      }
      
      // Verify that the action type and target fields are consistent
      // For example, if actionType is 'show_question', targetQuestionKey should be provided
      if (
        ['show_question', 'hide_question', 'require_question', 'unrequire_question'].includes(validatedData.actionType) && 
        !validatedData.targetQuestionKey
      ) {
        return res.status(400).json({ 
          message: `Action type "${validatedData.actionType}" requires a targetQuestionKey` 
        });
      }
      
      // If actionType is 'skip_to_page', targetPageId should be provided
      if (validatedData.actionType === 'skip_to_page' && !validatedData.targetPageId) {
        return res.status(400).json({ 
          message: 'Action type "skip_to_page" requires a targetPageId' 
        });
      }
      
      // If targetPageId is provided, verify it belongs to this definition
      if (validatedData.targetPageId) {
        const page = await storage.getQuestionnairePage(validatedData.targetPageId);
        if (!page || page.definitionId !== definitionId) {
          return res.status(400).json({ 
            message: `Target page ID ${validatedData.targetPageId} does not exist in this questionnaire definition` 
          });
        }
      }
      
      // If actionType is 'enable_option' or 'disable_option', targetQuestionKey and targetOptionValue should be provided
      if (
        ['enable_option', 'disable_option'].includes(validatedData.actionType) && 
        (!validatedData.targetQuestionKey || !validatedData.targetOptionValue)
      ) {
        return res.status(400).json({ 
          message: `Action type "${validatedData.actionType}" requires both targetQuestionKey and targetOptionValue` 
        });
      }
      
      // Create the conditional logic rule
      const rule = await storage.createConditionalLogicRule({
        ...validatedData,
        definitionId
      });
      
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error creating conditional logic rule:', error);
      res.status(500).json({ message: 'Server error creating conditional logic rule' });
    }
  });
  
  // 2. List All Conditional Logic Rules for a Definition
  app.get('/api/admin/questionnaires/definitions/:definitionId/conditional-logic', isAdmin, async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      if (isNaN(definitionId) || definitionId <= 0) {
        return res.status(400).json({ message: 'Invalid definition ID' });
      }
      
      // Check if the questionnaire definition exists
      const definition = await storage.getQuestionnaireDefinition(definitionId);
      if (!definition) {
        return res.status(404).json({ message: 'Questionnaire definition not found' });
      }
      
      const rules = await storage.getConditionalLogicRulesByDefinition(definitionId);
      res.json(rules);
    } catch (error) {
      console.error('Error listing conditional logic rules:', error);
      res.status(500).json({ message: 'Server error listing conditional logic rules' });
    }
  });
  
  // 3. Get a Single Conditional Logic Rule's Details
  app.get('/api/admin/questionnaires/conditional-logic/:ruleId', isAdmin, async (req: Request, res: Response) => {
    try {
      const ruleId = Number(req.params.ruleId);
      if (isNaN(ruleId) || ruleId <= 0) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }
      
      const rule = await storage.getConditionalLogicRule(ruleId);
      if (!rule) {
        return res.status(404).json({ message: 'Conditional logic rule not found' });
      }
      
      res.json(rule);
    } catch (error) {
      console.error('Error fetching conditional logic rule:', error);
      res.status(500).json({ message: 'Server error fetching conditional logic rule' });
    }
  });
  
  // 4. Update a Conditional Logic Rule
  app.put('/api/admin/questionnaires/conditional-logic/:ruleId', isAdmin, async (req: Request, res: Response) => {
    try {
      const ruleId = Number(req.params.ruleId);
      if (isNaN(ruleId) || ruleId <= 0) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }
      
      // Fetch the existing rule to get its definitionId
      const existingRule = await storage.getConditionalLogicRule(ruleId);
      if (!existingRule) {
        return res.status(404).json({ message: 'Conditional logic rule not found' });
      }
      
      const definitionId = existingRule.definitionId;
      
      // Validate the request body
      const validatedData = conditionalLogicRuleUpdateSchema.parse(req.body);
      
      // Verify that triggerQuestionKey exists within this definition
      if (validatedData.triggerQuestionKey) {
        const triggerKeyExists = await storage.questionKeyExistsInDefinition(definitionId, validatedData.triggerQuestionKey);
        if (!triggerKeyExists) {
          return res.status(400).json({ 
            message: `Trigger question key "${validatedData.triggerQuestionKey}" does not exist in this questionnaire definition` 
          });
        }
      }
      
      // If targetQuestionKey is provided, verify it exists
      if (validatedData.targetQuestionKey) {
        const targetKeyExists = await storage.questionKeyExistsInDefinition(definitionId, validatedData.targetQuestionKey);
        if (!targetKeyExists) {
          return res.status(400).json({ 
            message: `Target question key "${validatedData.targetQuestionKey}" does not exist in this questionnaire definition` 
          });
        }
      }
      
      // Check for consistency between action type and target fields
      const actionType = validatedData.actionType || existingRule.actionType;
      const targetQuestionKey = validatedData.targetQuestionKey !== undefined ? validatedData.targetQuestionKey : existingRule.targetQuestionKey;
      const targetPageId = validatedData.targetPageId !== undefined ? validatedData.targetPageId : existingRule.targetPageId;
      const targetOptionValue = validatedData.targetOptionValue !== undefined ? validatedData.targetOptionValue : existingRule.targetOptionValue;
      
      // Check if the update would result in an invalid configuration
      if (
        ['show_question', 'hide_question', 'require_question', 'unrequire_question'].includes(actionType) && 
        !targetQuestionKey
      ) {
        return res.status(400).json({ 
          message: `Action type "${actionType}" requires a targetQuestionKey` 
        });
      }
      
      if (actionType === 'skip_to_page' && !targetPageId) {
        return res.status(400).json({ 
          message: 'Action type "skip_to_page" requires a targetPageId' 
        });
      }
      
      if (
        ['enable_option', 'disable_option'].includes(actionType) && 
        (!targetQuestionKey || !targetOptionValue)
      ) {
        return res.status(400).json({ 
          message: `Action type "${actionType}" requires both targetQuestionKey and targetOptionValue` 
        });
      }
      
      // If targetPageId is provided, verify it belongs to this definition
      if (validatedData.targetPageId) {
        const page = await storage.getQuestionnairePage(validatedData.targetPageId);
        if (!page || page.definitionId !== definitionId) {
          return res.status(400).json({ 
            message: `Target page ID ${validatedData.targetPageId} does not exist in this questionnaire definition` 
          });
        }
      }
      
      // Update the rule
      const updatedRule = await storage.updateConditionalLogicRule(ruleId, validatedData);
      if (!updatedRule) {
        return res.status(500).json({ message: 'Failed to update conditional logic rule' });
      }
      
      res.json(updatedRule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Error updating conditional logic rule:', error);
      res.status(500).json({ message: 'Server error updating conditional logic rule' });
    }
  });
  
  // 5. Delete a Conditional Logic Rule
  app.delete('/api/admin/questionnaires/conditional-logic/:ruleId', isAdmin, async (req: Request, res: Response) => {
    try {
      const ruleId = Number(req.params.ruleId);
      if (isNaN(ruleId) || ruleId <= 0) {
        return res.status(400).json({ message: 'Invalid rule ID' });
      }
      
      const success = await storage.deleteConditionalLogicRule(ruleId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: 'Conditional logic rule not found' });
      }
    } catch (error) {
      console.error('Error deleting conditional logic rule:', error);
      res.status(500).json({ message: 'Server error deleting conditional logic rule' });
    }
  });

  // ===== Public Questionnaire API Endpoints =====
  
  // Create a schema for validating questionnaire submission data
  const questionnaireSubmitSchema = z.object({
    definitionId: z.number().int().positive(),
    submittedData: z.record(z.any()).or(z.any()).optional(), // Flexible schema for various question types
    clientIdentifier: z.string().optional(),
    userId: z.number().int().positive().optional(),
    rawLeadId: z.number().int().positive().optional(),
    status: z.enum(['draft', 'submitted', 'archived']).default('submitted')
  });
  
  // 1. Get Active Questionnaire 
  app.get('/api/questionnaires/active', async (req: Request, res: Response) => {
    try {
      // Get active questionnaire definition
      const activeDefinition = await storage.getActiveQuestionnaireDefinition();
      
      if (!activeDefinition) {
        return res.status(404).json({ 
          message: 'No active questionnaire found',
          success: false
        });
      }
      
      // Get the complete structure for this active questionnaire
      const questionnaireStructure = await storage.getPublicQuestionnaireStructure(activeDefinition.id);
      
      if (!questionnaireStructure) {
        return res.status(500).json({ 
          message: 'Failed to retrieve active questionnaire structure',
          success: false
        });
      }
      
      res.json({
        success: true,
        questionnaire: questionnaireStructure
      });
    } catch (error) {
      console.error('Error retrieving active questionnaire:', error);
      res.status(500).json({ 
        message: 'Server error retrieving active questionnaire',
        success: false
      });
    }
  });
  
  // 2. Get Specific Questionnaire by ID
  app.get('/api/questionnaires/:definitionId', async (req: Request, res: Response) => {
    try {
      const definitionId = Number(req.params.definitionId);
      if (isNaN(definitionId) || definitionId <= 0) {
        return res.status(400).json({ 
          message: 'Invalid questionnaire ID',
          success: false
        });
      }
      
      // Get the questionnaire structure
      const questionnaireStructure = await storage.getPublicQuestionnaireStructure(definitionId);
      
      if (!questionnaireStructure) {
        return res.status(404).json({ 
          message: 'Questionnaire not found',
          success: false
        });
      }
      
      res.json({
        success: true,
        questionnaire: questionnaireStructure
      });
    } catch (error) {
      console.error('Error retrieving questionnaire:', error);
      res.status(500).json({ 
        message: 'Server error retrieving questionnaire',
        success: false
      });
    }
  });
  
  // 3. Submit Questionnaire Response
  app.post('/api/questionnaires/submit', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = questionnaireSubmitSchema.parse(req.body);
      
      // Verify that the questionnaire definition exists
      const definition = await storage.getQuestionnaireDefinition(validatedData.definitionId);
      if (!definition) {
        return res.status(404).json({ 
          message: 'Questionnaire definition not found',
          success: false 
        });
      }
      
      // If user is authenticated, associate their ID
      if (req.session.userId && !validatedData.userId) {
        validatedData.userId = req.session.userId;
      }
      
      // Submit the questionnaire response
      const submission = await storage.submitQuestionnaireResponse(validatedData);
      
      // Process the submission - this might include:
      // 1. Creating a RawLead from the data
      // 2. Updating the RawLead with the submissionId 
      // 3. Converting directly to an Opportunity if enough data is provided
      
      let rawLeadId: number | null = null;
      
      // Check if this is linked to a raw lead already
      if (!validatedData.rawLeadId && validatedData.status === 'submitted') {
        try {
          // Extract lead data from submission
          const submittedData = submission.submittedData as Record<string, any>;
          
          // Attempt to extract name, email, phone from submitted data (common fields)
          const leadData: Partial<InsertRawLead> = {
            status: 'new',
            source: 'questionnaire',
            questionnaireSubmissionId: submission.id,
            questionnaireDefinitionId: submission.definitionId
          };
          
          // Map common fields if present in the submission
          if (submittedData.email) leadData.email = String(submittedData.email);
          if (submittedData.phone) leadData.phone = String(submittedData.phone);
          if (submittedData.firstName) leadData.firstName = String(submittedData.firstName);
          if (submittedData.lastName) leadData.lastName = String(submittedData.lastName);
          if (submittedData.message) leadData.initialInquiry = String(submittedData.message);
          
          // Only create a raw lead if we have at least an email or phone
          if (leadData.email || leadData.phone) {
            // Create raw lead
            const rawLead = await storage.createRawLead(leadData as InsertRawLead);
            rawLeadId = rawLead.id;
            
            // Update submission with the raw lead ID
            if (rawLead.id) {
              await db
                .update(questionnaireSubmissions)
                .set({ rawLeadId: rawLead.id })
                .where(eq(questionnaireSubmissions.id, submission.id));
            }
          }
        } catch (leadError) {
          console.error('Error creating raw lead from questionnaire submission:', leadError);
          // We don't fail the overall request if lead creation fails
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Questionnaire submitted successfully',
        submission: {
          id: submission.id,
          definitionId: submission.definitionId,
          status: submission.status,
          submittedAt: submission.submittedAt,
          rawLeadId: rawLeadId || submission.rawLeadId
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors,
          success: false
        });
      }
      console.error('Error submitting questionnaire:', error);
      res.status(500).json({ 
        message: 'Server error submitting questionnaire',
        success: false
      });
    }
  });

  // AI Assistant API endpoint
  app.post('/api/admin/questionnaires/ai-generate', isAdmin, async (req: Request, res: Response) => {
    try {
      const { prompt, questionnaireContext } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      
      // If we don't have an API key configured, return an error
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ 
          message: 'Anthropic API key not configured', 
          solution: 'Please set the ANTHROPIC_API_KEY environment variable'
        });
      }
      
      // Generate questionnaire content using AI
      const content = await generateQuestionnaireContent(prompt, questionnaireContext);
      
      res.json({ content });
    } catch (error) {
      console.error('Error generating questionnaire with AI:', error);
      res.status(500).json({ 
        message: 'Failed to generate questionnaire content',
        error: error.message 
      });
    }
  });

  // Create HTTP server
  
  // Email sync service should NOT be started automatically
  // It must be manually toggled ON by the user through the /api/email-sync/toggle endpoint
  // Otherwise, emails will be processed even when the user has turned sync OFF
  const syncService = app.get('gmailSyncService');
  if (syncService) {
    console.log("Email sync service available but NOT automatically started - must be enabled via toggle");
  }

  const httpServer = createServer(app);
  return httpServer;
}
