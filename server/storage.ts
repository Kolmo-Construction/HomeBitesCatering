// server/storage.ts
import {
  users, opportunities, menuItems, menus, clients, estimates, events, contactIdentifiers, communications,
  opportunityPriorityEnum, rawLeadStatusEnum, rawLeads,
  type User, type InsertUser,
  type Opportunity, type InsertOpportunity,
  type MenuItem, type InsertMenuItem, // Ensure MenuItem type is imported
  type Menu as DrizzleMenu, type InsertMenu, // Alias original Menu to DrizzleMenu to avoid naming conflict
  type Client, type InsertClient,
  type Estimate, type InsertEstimate,
  type Event, type InsertEvent,
  type ContactIdentifier, type InsertContactIdentifier,
  type Communication, type InsertCommunication,
  type RawLead, type InsertRawLead
} from "@shared/schema";
import { db } from "./db";
import { eq, gte, inArray, and, isNull, desc, or } from "drizzle-orm"; // Added or for logical OR operations

// Define an enriched Menu type that includes full menu item details
// This type will be used for the return values of getMenu and listMenus
export type EnrichedMenu = Omit<DrizzleMenu, 'items'> & {
  items: (MenuItem & { quantity: number })[];
};

// Define the structure of item entries stored in the Menu's items JSONB field
// Assumes 'id' refers to the menuItem's ID
type MenuItemEntry = {
  id: number; // This ID refers to the menuItems.id
  quantity: number;
  // Potentially other fields if you store more than just id and quantity directly in menu.items
  // For example, if you were caching name/price here, though it's better to fetch fresh data.
};


export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(): Promise<User[]>;

  // Opportunities
  getOpportunity(id: number): Promise<Opportunity | undefined>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunity(id: number, opportunity: Partial<Opportunity>): Promise<Opportunity | undefined>;
  deleteOpportunity(id: number): Promise<boolean>;
  listOpportunities(): Promise<Opportunity[]>;
  listOpportunitiesByStatus(status: string): Promise<Opportunity[]>;
  listOpportunitiesBySource(source: string): Promise<Opportunity[]>;
  listOpportunitiesByPriority(priority: typeof opportunityPriorityEnum.enumValues[number]): Promise<Opportunity[]>;

  // Menu Items
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  listMenuItems(): Promise<MenuItem[]>;
  listMenuItemsByCategory(category: string): Promise<MenuItem[]>;

  // Menus - Updated return types
  getMenu(id: number): Promise<EnrichedMenu | undefined>;
  createMenu(menu: InsertMenu): Promise<DrizzleMenu>; // Create still returns the basic DrizzleMenu
  updateMenu(id: number, menu: Partial<InsertMenu>): Promise<EnrichedMenu | undefined>;
  deleteMenu(id: number): Promise<boolean>;
  listMenus(): Promise<EnrichedMenu[]>;

  // Clients
  getClient(id: number): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  getClientByPhone(phone: string): Promise<Client | undefined>;
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
  
  // Contact Identifiers
  createContactIdentifier(identifier: InsertContactIdentifier): Promise<ContactIdentifier>;
  getContactIdentifiers(owner: { opportunityId?: number; clientId?: number }): Promise<ContactIdentifier[]>;
  updateContactIdentifier(id: number, identifier: Partial<ContactIdentifier>): Promise<ContactIdentifier | undefined>;
  deleteContactIdentifier(id: number): Promise<boolean>;
  findOpportunityOrClientByContactIdentifier(value: string, type: 'email' | 'phone'): Promise<{ opportunity?: Opportunity, client?: Client } | null>;
  
  // Communications
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  getCommunicationsForOpportunity(opportunityId: number): Promise<Communication[]>;
  getCommunicationsForClient(clientId: number): Promise<Communication[]>;
  getCommunicationsByExternalId(externalId: string): Promise<Communication[]>;
  
  // Raw Leads
  createRawLead(data: InsertRawLead): Promise<RawLead>;
  getRawLeadById(id: number): Promise<RawLead | undefined>;
  listRawLeads(filters?: { status?: string; source?: string }): Promise<RawLead[]>;
  updateRawLead(id: number, data: Partial<RawLead>): Promise<RawLead | undefined>;
  deleteRawLead(id: number): Promise<boolean>;
  deleteManyRawLeads(ids: number[]): Promise<{ deleted: number, failed: number }>;
}

// DatabaseStorage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    await db
      .delete(users)
      .where(eq(users.id, id));
    return true;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // For opportunities
  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return opportunity || undefined;
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [newOpportunity] = await db
      .insert(opportunities)
      .values(opportunity)
      .returning();
    return newOpportunity;
  }

  async updateOpportunity(id: number, opportunityData: Partial<Opportunity>): Promise<Opportunity | undefined> {
    // If clientId is being set, get the client info to update firstName and lastName
    if (opportunityData.clientId) {
      try {
        const client = await this.getClient(opportunityData.clientId);
        if (client) {
          // Update the opportunityData with the client's name
          opportunityData.firstName = client.firstName;
          opportunityData.lastName = client.lastName;
          console.log(`Updating opportunity ${id} with client ${client.id} data: ${client.firstName} ${client.lastName}`);
        }
      } catch (error) {
        console.error("Error getting client data for opportunity update:", error);
      }
    }
    
    const [updatedOpportunity] = await db
      .update(opportunities)
      .set(opportunityData)
      .where(eq(opportunities.id, id))
      .returning();
    return updatedOpportunity;
  }

  async deleteOpportunity(id: number): Promise<boolean> {
    await db
      .delete(opportunities)
      .where(eq(opportunities.id, id));
    return true;
  }

  async listOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities);
  }

  async listOpportunitiesByStatus(status: string): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(eq(opportunities.status, status));
  }

  async listOpportunitiesBySource(source: string): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(eq(opportunities.opportunitySource, source));
  }
  
  async listOpportunitiesByPriority(priority: typeof opportunityPriorityEnum.enumValues[number]): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(eq(opportunities.priority, priority));
  }

  // For menu items
  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return menuItem || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newMenuItem] = await db
      .insert(menuItems)
      .values(item)
      .returning();
    return newMenuItem;
  }

  async updateMenuItem(id: number, itemData: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const [updatedItem] = await db
      .update(menuItems)
      .set(itemData)
      .where(eq(menuItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    await db
      .delete(menuItems)
      .where(eq(menuItems.id, id));
    return true;
  }

  async listMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems);
  }

  async listMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.category, category));
  }

  // For menus
  async getMenu(id: number): Promise<EnrichedMenu | undefined> {
    const [menuData] = await db.select().from(menus).where(eq(menus.id, id));

    if (!menuData) {
      return undefined;
    }
    if (!menuData.items) { // Handle case where items might be null or undefined from DB
        return { ...menuData, items: [] };
    }


    // The 'items' field in DrizzleMenu is `unknown` due to jsonb, cast it.
    // This assumes the stored structure is an array of { id: menuItemId, quantity: number }
    const itemEntries = menuData.items as MenuItemEntry[];

    if (!Array.isArray(itemEntries) || itemEntries.length === 0) {
      return { ...menuData, items: [] };
    }

    const menuItemIds = itemEntries.map(item => item.id).filter(id => id != null); // Filter out potential null/undefined IDs
    if (menuItemIds.length === 0) {
         return { ...menuData, items: [] };
    }

    const fetchedMenuItemsDetails = await db
      .select()
      .from(menuItems)
      .where(inArray(menuItems.id, menuItemIds));

    const menuItemsDetailsMap = new Map<number, MenuItem>();
    fetchedMenuItemsDetails.forEach(mi => menuItemsDetailsMap.set(mi.id, mi));

    const enrichedItems = itemEntries
      .map(itemEntry => {
        const menuItemDetail = menuItemsDetailsMap.get(itemEntry.id);
        if (menuItemDetail) {
          return {
            ...menuItemDetail, // Spread all properties of MenuItem (name, price, category, etc.)
            quantity: itemEntry.quantity,
          };
        }
        console.warn(`Menu item with ID ${itemEntry.id} not found for menu ${menuData.id}`);
        return null; // Or handle missing menu items as needed (e.g., skip or default)
      })
      .filter(item => item !== null) as (MenuItem & { quantity: number })[]; // Type assertion

    return {
      ...menuData,
      items: enrichedItems,
    };
  }

  async createMenu(menu: InsertMenu): Promise<DrizzleMenu> { // Returns the basic DrizzleMenu as it's directly from insert
    const [newMenu] = await db
      .insert(menus)
      .values(menu)
      .returning();
    return newMenu;
  }

  async updateMenu(id: number, menuData: Partial<InsertMenu>): Promise<EnrichedMenu | undefined> {
    const [updatedMenuData] = await db
      .update(menus)
      .set(menuData)
      .where(eq(menus.id, id))
      .returning();

    if (!updatedMenuData) {
      return undefined;
    }
    // After updating, fetch the enriched menu data
    return this.getMenu(updatedMenuData.id);
  }

  async deleteMenu(id: number): Promise<boolean> {
    await db
      .delete(menus)
      .where(eq(menus.id, id));
    return true;
  }

  async listMenus(): Promise<EnrichedMenu[]> {
    const allMenusData = await db.select().from(menus);
    if (allMenusData.length === 0) {
      return [];
    }

    let allMenuItemIds: number[] = [];
    allMenusData.forEach(menu => {
      if (menu.items) {
        // The 'items' field is `unknown` due to jsonb, cast it.
        const itemEntries = menu.items as MenuItemEntry[];
        if (Array.isArray(itemEntries)) {
          itemEntries.forEach(itemEntry => {
            if (itemEntry.id != null && !allMenuItemIds.includes(itemEntry.id)) {
              allMenuItemIds.push(itemEntry.id);
            }
          });
        }
      }
    });

    const menuItemsDetailsMap = new Map<number, MenuItem>();
    if (allMenuItemIds.length > 0) {
      const fetchedMenuItemsDetails = await db
        .select()
        .from(menuItems)
        .where(inArray(menuItems.id, allMenuItemIds));
      fetchedMenuItemsDetails.forEach(mi => menuItemsDetailsMap.set(mi.id, mi));
    }

    const enrichedMenus = allMenusData.map(menuData => {
      let enrichedItems: (MenuItem & { quantity: number })[] = [];
      if (menuData.items) {
        const itemEntries = menuData.items as MenuItemEntry[];
        if (Array.isArray(itemEntries)) {
          enrichedItems = itemEntries
            .map(itemEntry => {
              const menuItemDetail = menuItemsDetailsMap.get(itemEntry.id);
              if (menuItemDetail) {
                return {
                  ...menuItemDetail,
                  quantity: itemEntry.quantity,
                };
              }
              console.warn(`Menu item with ID ${itemEntry.id} not found during listMenus for menu ${menuData.id}`);
              return null;
            })
            .filter(item => item !== null) as (MenuItem & { quantity: number })[];
        }
      }
      return {
        ...menuData,
        items: enrichedItems,
      };
    });

    return enrichedMenus;
  }

  // For clients
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.email, email));
    return client || undefined;
  }

  async getClientByPhone(phone: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.phone, phone));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      console.log('Attempting to insert client into database:', JSON.stringify(client));
      const [newClient] = await db
        .insert(clients)
        .values(client)
        .returning();
      console.log('Client successfully created with ID:', newClient.id);
      return newClient;
    } catch (error) {
      console.error('Database error in createClient:', error);
      throw error; // Re-throw to be handled by the route handler
    }
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(clientData)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    await db
      .delete(clients)
      .where(eq(clients.id, id));
    return true;
  }

  async listClients(): Promise<Client[]> {
    try {
      console.log('Executing listClients database query');
      const clientList = await db.select().from(clients);
      console.log(`Retrieved ${clientList.length} clients from database`);
      return clientList;
    } catch (error) {
      console.error('Database error in listClients:', error);
      throw error; // Re-throw to be handled by the route handler
    }
  }

  // For estimates
  async getEstimate(id: number): Promise<Estimate | undefined> {
    const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id));
    return estimate || undefined;
  }

  async createEstimate(estimate: InsertEstimate): Promise<Estimate> {
    const [newEstimate] = await db
      .insert(estimates)
      .values(estimate)
      .returning();
    return newEstimate;
  }

  async updateEstimate(id: number, estimateData: Partial<Estimate>): Promise<Estimate | undefined> {
    const [updatedEstimate] = await db
      .update(estimates)
      .set(estimateData)
      .where(eq(estimates.id, id))
      .returning();
    return updatedEstimate;
  }

  async deleteEstimate(id: number): Promise<boolean> {
    await db
      .delete(estimates)
      .where(eq(estimates.id, id));
    return true;
  }

  async listEstimates(): Promise<Estimate[]> {
    return await db.select().from(estimates);
  }

  async listEstimatesByStatus(status: string): Promise<Estimate[]> {
    return await db.select().from(estimates).where(eq(estimates.status, status));
  }

  async listEstimatesByClient(clientId: number): Promise<Estimate[]> {
    return await db.select().from(estimates).where(eq(estimates.clientId, clientId));
  }

  // For events
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(eventData)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    await db
      .delete(events)
      .where(eq(events.id, id));
    return true;
  }

  async listEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async listUpcomingEvents(): Promise<Event[]> {
    try {
      const now = new Date();
      return await db
        .select()
        .from(events)
        .where(gte(events.eventDate, now));
    } catch (error) {
      console.error("Error in listUpcomingEvents:", error);
      return [];
    }
  }

  // Contact Identifiers
  async createContactIdentifier(identifier: InsertContactIdentifier): Promise<ContactIdentifier> {
    const [newIdentifier] = await db
      .insert(contactIdentifiers)
      .values(identifier)
      .returning();
    return newIdentifier;
  }

  async getContactIdentifiers(owner: { opportunityId?: number; clientId?: number }): Promise<ContactIdentifier[]> {
    if (owner.opportunityId) {
      return db.select().from(contactIdentifiers).where(eq(contactIdentifiers.opportunityId, owner.opportunityId));
    }
    if (owner.clientId) {
      return db.select().from(contactIdentifiers).where(eq(contactIdentifiers.clientId, owner.clientId));
    }
    return []; // Return empty array if neither opportunityId nor clientId is provided
  }

  async updateContactIdentifier(id: number, identifierData: Partial<ContactIdentifier>): Promise<ContactIdentifier | undefined> {
    const [updatedIdentifier] = await db
      .update(contactIdentifiers)
      .set(identifierData)
      .where(eq(contactIdentifiers.id, id))
      .returning();
    return updatedIdentifier;
  }

  async deleteContactIdentifier(id: number): Promise<boolean> {
    await db
      .delete(contactIdentifiers)
      .where(eq(contactIdentifiers.id, id));
    return true;
  }

  async findOpportunityOrClientByContactIdentifier(value: string, type: 'email' | 'phone'): Promise<{ opportunity?: Opportunity, client?: Client } | null> {
    const foundIdentifiers = await db
      .select()
      .from(contactIdentifiers)
      .where(and(eq(contactIdentifiers.value, value), eq(contactIdentifiers.type, type)));

    if (foundIdentifiers.length === 0) {
      return null;
    }

    // Prioritize client if both opportunity and client are linked, or take the first found
    for (const identifier of foundIdentifiers) {
      if (identifier.clientId) {
        const [client] = await db.select().from(clients).where(eq(clients.id, identifier.clientId));
        if (client) return { client };
      }
      if (identifier.opportunityId) {
        const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, identifier.opportunityId));
        if (opportunity) return { opportunity }; // Return opportunity if client not found for this identifier
      }
    }
    return null;
  }

  // Communications
  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [newCommunication] = await db
      .insert(communications)
      .values(communication)
      .returning();
    return newCommunication;
  }

  async getCommunicationsForOpportunity(opportunityId: number): Promise<Communication[]> {
    return db
      .select()
      .from(communications)
      .where(eq(communications.opportunityId, opportunityId))
      .orderBy(desc(communications.timestamp)); // Order by most recent first
  }

  async getCommunicationsForClient(clientId: number): Promise<Communication[]> {
    return db
      .select()
      .from(communications)
      .where(eq(communications.clientId, clientId))
      .orderBy(desc(communications.timestamp)); // Order by most recent first
  }
  
  async getCommunicationsByExternalId(externalId: string): Promise<Communication[]> {
    return db
      .select()
      .from(communications)
      .where(eq(communications.externalId, externalId));
  }

  // Raw Leads
  async createRawLead(data: InsertRawLead): Promise<RawLead> {
    // Ensure receivedAt is provided, otherwise defaultNow() in schema will override it
    const insertData = {
      ...data,
      // Make sure receivedAt is set explicitly to prevent defaultNow() from being used
      receivedAt: data.receivedAt || new Date()
    };
    
    // Add detailed logging for date tracking
    console.log(`Storage: Creating raw lead with receivedAt date:`);
    console.log(`  - Original receivedAt from data: ${data.receivedAt ? data.receivedAt.toISOString() : 'undefined'}`);
    console.log(`  - Final receivedAt being stored: ${insertData.receivedAt.toISOString()}`);
    console.log(`  - Current server time: ${new Date().toISOString()}`);
    
    const [newRawLead] = await db
      .insert(rawLeads)
      .values(insertData)
      .returning();
    return newRawLead;
  }

  async getRawLeadById(id: number): Promise<RawLead | undefined> {
    const [rawLead] = await db
      .select()
      .from(rawLeads)
      .where(eq(rawLeads.id, id));
    return rawLead;
  }

  async listRawLeads(filters?: { status?: string; source?: string }): Promise<RawLead[]> {
    let query = db.select().from(rawLeads);
    
    if (filters) {
      if (filters.status) {
        query = query.where(eq(rawLeads.status, filters.status as any));
      }
      if (filters.source) {
        query = query.where(eq(rawLeads.source, filters.source));
      }
    }
    
    return query.orderBy(desc(rawLeads.receivedAt)); // Order by most recently received first
  }

  async updateRawLead(id: number, data: Partial<RawLead>): Promise<RawLead | undefined> {
    const [updatedRawLead] = await db
      .update(rawLeads)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(rawLeads.id, id))
      .returning();
    return updatedRawLead;
  }
  
  async deleteRawLead(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(rawLeads)
        .where(eq(rawLeads.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting raw lead:', error);
      return false;
    }
  }
  
  async deleteManyRawLeads(ids: number[]): Promise<{ deleted: number, failed: number }> {
    const results = { deleted: 0, failed: 0 };
    
    if (!ids || ids.length === 0) {
      return results;
    }
    
    try {
      // Use in() operator to delete multiple records at once
      const result = await db
        .delete(rawLeads)
        .where(inArray(rawLeads.id, ids));
        
      // Since we don't know exactly how many were deleted, we'll assume all were successful
      results.deleted = ids.length;
    } catch (error) {
      console.error('Error deleting multiple raw leads:', error);
      results.failed = ids.length;
    }
    
    return results;
  }
}

// Export an instance of the DatabaseStorage
export const storage = new DatabaseStorage();