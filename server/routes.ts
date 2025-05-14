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
  insertCommunicationSchema      // New
} from "@shared/schema";
import { GmailSyncService } from './services/emailSyncService'; // Import the service

const MS_IN_ONE_DAY = 24 * 60 * 60 * 1000;

export async function registerRoutes(app: Express): Promise<Server> {
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
      const opportunities = await storage.listOpportunities();
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/opportunities', isAuthenticated, async (req, res) => {
    try {
      // Extract client assignment preference
      const { assignToExistingClient, clientId, ...opportunityDataRaw } = req.body;
      
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
      
      const updatedOpportunity = await storage.updateOpportunity(opportunityId, req.body);
      res.json(updatedOpportunity);
    } catch (error) {
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

  // GET /api/leads/:leadId/communications - Get communication timeline for a lead
  app.get('/api/leads/:leadId/communications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leadId = Number(req.params.leadId);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: 'Invalid lead ID.' });
      }
      const communications = await storage.getCommunicationsForLead(leadId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications for lead:", error);
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

  // --- NEW: Route for finding lead/client by contact info ---
  app.post('/api/contacts/find', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { value, type } = req.body;
      if (!value || (type !== 'email' && type !== 'phone')) {
        return res.status(400).json({ message: 'Invalid value or type for contact lookup.' });
      }
      const result = await storage.findLeadOrClientByContactIdentifier(value, type);
      if (!result) {
        return res.status(404).json({ message: 'No matching lead or client found.' });
      }
      res.json(result);
    } catch (error) {
      console.error("Error finding contact:", error);
      res.status(500).json({ message: 'Server error finding contact' });
    }
  });

  // --- NEW: Google OAuth Routes for Gmail Sync ---
  app.get('/api/auth/google/initiate', isAuthenticated, isAdmin, (req, res) => { // Protect this
    // Log the redirect URI being used
    console.log("Using redirect URI:", process.env.GOOGLE_REDIRECT_URI);
    
    const authUrl = GmailSyncService.getOAuthClient().generateAuthUrl({
      access_type: 'offline', // Important to get a refresh token
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly', // Start with readonly
        // 'https://www.googleapis.com/auth/gmail.modify', // To mark as read or move
        'https://www.googleapis.com/auth/userinfo.email', // To verify the user if needed
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent' // Force consent screen to ensure refresh token is granted on first auth
    });
    
    console.log("Generated auth URL:", authUrl);
    res.redirect(authUrl);
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
        // Optionally, immediately start the sync service if it wasn't running or re-initialize it
        // This depends on how you manage the service instance.
        // For now, we assume it will pick up the tokens on its next scheduled run or on server restart.
        res.send(`
          <h1>Google Authentication Successful!</h1>
          <p>Tokens obtained. The email sync service will now use these credentials.</p>
          <p>You can close this window.</p>
          <p>IMPORTANT: If a new Refresh Token was logged in your server console, update your .env/Secrets with it for persistence.</p>
        `);
      } else {
        console.error("Failed to obtain tokens from Google.");
        res.status(500).send('Failed to obtain tokens from Google.');
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

  // Create HTTP server

  const httpServer = createServer(app);
  return httpServer;
}
