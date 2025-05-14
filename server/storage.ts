// server/storage.ts
import {
  users, leads, menuItems, menus, clients, estimates, events, contactIdentifiers, communications,
  type User, type InsertUser,
  type Lead, type InsertLead,
  type MenuItem, type InsertMenuItem, // Ensure MenuItem type is imported
  type Menu as DrizzleMenu, type InsertMenu, // Alias original Menu to DrizzleMenu to avoid naming conflict
  type Client, type InsertClient,
  type Estimate, type InsertEstimate,
  type Event, type InsertEvent,
  type ContactIdentifier, type InsertContactIdentifier,
  type Communication, type InsertCommunication
} from "@shared/schema";
import { db } from "./db";
import { eq, gte, inArray, and, isNull, desc } from "drizzle-orm"; // Added new imports

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
  getContactIdentifier(id: number): Promise<ContactIdentifier | undefined>;
  createContactIdentifier(identifier: InsertContactIdentifier): Promise<ContactIdentifier>;
  updateContactIdentifier(id: number, identifier: Partial<ContactIdentifier>): Promise<ContactIdentifier | undefined>;
  deleteContactIdentifier(id: number): Promise<boolean>;
  listContactIdentifiers(): Promise<ContactIdentifier[]>;
  listContactIdentifiersByLead(leadId: number): Promise<ContactIdentifier[]>;
  listContactIdentifiersByClient(clientId: number): Promise<ContactIdentifier[]>;
  listContactIdentifiersByType(type: string): Promise<ContactIdentifier[]>;
  
  // Communications
  getCommunication(id: number): Promise<Communication | undefined>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  updateCommunication(id: number, communication: Partial<Communication>): Promise<Communication | undefined>;
  deleteCommunication(id: number): Promise<boolean>;
  listCommunications(): Promise<Communication[]>;
  listCommunicationsByLead(leadId: number): Promise<Communication[]>;
  listCommunicationsByClient(clientId: number): Promise<Communication[]>;
  listCommunicationsByUser(userId: number): Promise<Communication[]>;
  listCommunicationsByType(type: string): Promise<Communication[]>;
  listRecentCommunications(limit?: number): Promise<Communication[]>;
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

  // For leads
  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db
      .insert(leads)
      .values(lead)
      .returning();
    return newLead;
  }

  async updateLead(id: number, leadData: Partial<Lead>): Promise<Lead | undefined> {
    const [updatedLead] = await db
      .update(leads)
      .set(leadData)
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }

  async deleteLead(id: number): Promise<boolean> {
    await db
      .delete(leads)
      .where(eq(leads.id, id));
    return true;
  }

  async listLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }

  async listLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.status, status));
  }

  async listLeadsBySource(source: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.leadSource, source));
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
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
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
    return await db.select().from(clients);
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
}

// Export an instance of the DatabaseStorage
export const storage = new DatabaseStorage();