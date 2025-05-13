import {
  users, User, InsertUser,
  leads, Lead, InsertLead,
  menuItems, MenuItem, InsertMenuItem,
  menus, Menu, InsertMenu,
  clients, Client, InsertClient,
  estimates, Estimate, InsertEstimate,
  events, Event, InsertEvent
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(): Promise<User[]>;

  // Leads
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  listLeads(): Promise<Lead[]>;
  listLeadsByStatus(status: string): Promise<Lead[]>;
  listLeadsBySource(source: string): Promise<Lead[]>;
  
  // Menu Items
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  listMenuItems(): Promise<MenuItem[]>;
  listMenuItemsByCategory(category: string): Promise<MenuItem[]>;
  
  // Menus
  getMenu(id: number): Promise<Menu | undefined>;
  createMenu(menu: InsertMenu): Promise<Menu>;
  updateMenu(id: number, menu: Partial<Menu>): Promise<Menu | undefined>;
  deleteMenu(id: number): Promise<boolean>;
  listMenus(): Promise<Menu[]>;
  
  // Clients
  getClient(id: number): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  listClients(): Promise<Client[]>;
  
  // Estimates
  getEstimate(id: number): Promise<Estimate | undefined>;
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: number, estimate: Partial<Estimate>): Promise<Estimate | undefined>;
  deleteEstimate(id: number): Promise<boolean>;
  listEstimates(): Promise<Estimate[]>;
  listEstimatesByStatus(status: string): Promise<Estimate[]>;
  listEstimatesByClient(clientId: number): Promise<Estimate[]>;
  
  // Events
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  listEvents(): Promise<Event[]>;
  listUpcomingEvents(): Promise<Event[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private leads: Map<number, Lead>;
  private menuItems: Map<number, MenuItem>;
  private menus: Map<number, Menu>;
  private clients: Map<number, Client>;
  private estimates: Map<number, Estimate>;
  private events: Map<number, Event>;
  
  // Counters for IDs
  private userIdCounter: number;
  private leadIdCounter: number;
  private menuItemIdCounter: number;
  private menuIdCounter: number;
  private clientIdCounter: number;
  private estimateIdCounter: number;
  private eventIdCounter: number;

  constructor() {
    this.users = new Map();
    this.leads = new Map();
    this.menuItems = new Map();
    this.menus = new Map();
    this.clients = new Map();
    this.estimates = new Map();
    this.events = new Map();
    
    this.userIdCounter = 1;
    this.leadIdCounter = 1;
    this.menuItemIdCounter = 1;
    this.menuIdCounter = 1;
    this.clientIdCounter = 1;
    this.estimateIdCounter = 1;
    this.eventIdCounter = 1;

    // Initialize with admin user
    this.createUser({
      username: "admin",
      password: "admin123", // In production, this should be hashed
      firstName: "Admin",
      lastName: "User",
      email: "admin@homebites.net",
      role: "admin"
    });

    // Add some sample menu items
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample menu items
    const menuItems = [
      {
        name: "Caprese Skewers",
        description: "Fresh mozzarella, cherry tomatoes, and basil with balsamic glaze",
        category: "appetizer",
        price: 450, // $4.50
        ingredients: "Mozzarella, cherry tomatoes, basil, balsamic glaze, olive oil, salt, pepper",
        isVegetarian: true,
        isGlutenFree: true
      },
      {
        name: "Grilled Salmon",
        description: "Lemon-herb grilled salmon fillet",
        category: "entree",
        price: 1250, // $12.50
        ingredients: "Salmon, lemon, herbs, olive oil, garlic, salt, pepper",
        isGlutenFree: true,
        isDairyFree: true
      },
      {
        name: "Roasted Vegetables",
        description: "Seasonal vegetables roasted with herbs",
        category: "side",
        price: 550, // $5.50
        ingredients: "Zucchini, bell peppers, carrots, onions, herbs, olive oil, salt, pepper",
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        isDairyFree: true
      }
    ];

    menuItems.forEach(item => {
      this.createMenuItem(item as InsertMenuItem);
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const newUser: User = {
      ...user,
      id,
      createdAt: now
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...userData
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Leads
  async getLead(id: number): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const id = this.leadIdCounter++;
    const now = new Date();
    const newLead: Lead = {
      ...lead,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.leads.set(id, newLead);
    return newLead;
  }

  async updateLead(id: number, leadData: Partial<Lead>): Promise<Lead | undefined> {
    const lead = await this.getLead(id);
    if (!lead) return undefined;
    
    const updatedLead: Lead = {
      ...lead,
      ...leadData,
      updatedAt: new Date()
    };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }

  async deleteLead(id: number): Promise<boolean> {
    return this.leads.delete(id);
  }

  async listLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async listLeadsByStatus(status: string): Promise<Lead[]> {
    return Array.from(this.leads.values())
      .filter(lead => lead.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listLeadsBySource(source: string): Promise<Lead[]> {
    return Array.from(this.leads.values())
      .filter(lead => lead.leadSource === source)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Menu Items
  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.menuItemIdCounter++;
    const now = new Date();
    const newMenuItem: MenuItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.menuItems.set(id, newMenuItem);
    return newMenuItem;
  }

  async updateMenuItem(id: number, itemData: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const item = await this.getMenuItem(id);
    if (!item) return undefined;
    
    const updatedItem: MenuItem = {
      ...item,
      ...itemData,
      updatedAt: new Date()
    };
    this.menuItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  async listMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async listMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values())
      .filter(item => item.category === category);
  }

  // Menus
  async getMenu(id: number): Promise<Menu | undefined> {
    return this.menus.get(id);
  }

  async createMenu(menu: InsertMenu): Promise<Menu> {
    const id = this.menuIdCounter++;
    const now = new Date();
    const newMenu: Menu = {
      ...menu,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.menus.set(id, newMenu);
    return newMenu;
  }

  async updateMenu(id: number, menuData: Partial<Menu>): Promise<Menu | undefined> {
    const menu = await this.getMenu(id);
    if (!menu) return undefined;
    
    const updatedMenu: Menu = {
      ...menu,
      ...menuData,
      updatedAt: new Date()
    };
    this.menus.set(id, updatedMenu);
    return updatedMenu;
  }

  async deleteMenu(id: number): Promise<boolean> {
    return this.menus.delete(id);
  }

  async listMenus(): Promise<Menu[]> {
    return Array.from(this.menus.values());
  }

  // Clients
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    return Array.from(this.clients.values())
      .find(client => client.email === email);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    const now = new Date();
    const newClient: Client = {
      ...client,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.clients.set(id, newClient);
    return newClient;
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    const client = await this.getClient(id);
    if (!client) return undefined;
    
    const updatedClient: Client = {
      ...client,
      ...clientData,
      updatedAt: new Date()
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  async listClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  // Estimates
  async getEstimate(id: number): Promise<Estimate | undefined> {
    return this.estimates.get(id);
  }

  async createEstimate(estimate: InsertEstimate): Promise<Estimate> {
    const id = this.estimateIdCounter++;
    const now = new Date();
    const newEstimate: Estimate = {
      ...estimate,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.estimates.set(id, newEstimate);
    return newEstimate;
  }

  async updateEstimate(id: number, estimateData: Partial<Estimate>): Promise<Estimate | undefined> {
    const estimate = await this.getEstimate(id);
    if (!estimate) return undefined;
    
    const updatedEstimate: Estimate = {
      ...estimate,
      ...estimateData,
      updatedAt: new Date()
    };
    this.estimates.set(id, updatedEstimate);
    return updatedEstimate;
  }

  async deleteEstimate(id: number): Promise<boolean> {
    return this.estimates.delete(id);
  }

  async listEstimates(): Promise<Estimate[]> {
    return Array.from(this.estimates.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listEstimatesByStatus(status: string): Promise<Estimate[]> {
    return Array.from(this.estimates.values())
      .filter(estimate => estimate.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listEstimatesByClient(clientId: number): Promise<Estimate[]> {
    return Array.from(this.estimates.values())
      .filter(estimate => estimate.clientId === clientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Events
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventIdCounter++;
    const now = new Date();
    const newEvent: Event = {
      ...event,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const event = await this.getEvent(id);
    if (!event) return undefined;
    
    const updatedEvent: Event = {
      ...event,
      ...eventData,
      updatedAt: new Date()
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  async listEvents(): Promise<Event[]> {
    return Array.from(this.events.values())
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }

  async listUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return Array.from(this.events.values())
      .filter(event => event.eventDate > now)
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }
}

export const storage = new MemStorage();
