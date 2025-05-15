import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStore from "memorystore";
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
  insertRawLeadSchema            // For raw leads management
} from "@shared/schema";
import { GmailSyncService } from './services/emailSyncService'; // Import the service

const MS_IN_ONE_DAY = 24 * 60 * 60 * 1000;

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
        clientId: insertOpportunitySchema.shape.clientId.optional(),
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
      const clients = await storage.listClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
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
                
                ${!hasModifyScope ? `
                <div class="error">
                  <h3>Warning: Missing Required Permission</h3>
                  <p>The "gmail.modify" scope is missing. The system will not be able to mark emails as read 
                  after processing them. This may cause the same emails to be processed multiple times.</p>
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

  // Email Sync Service Control Endpoints - FOR DEBUGGING, isAuthenticated and isAdmin are temporarily removed
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
