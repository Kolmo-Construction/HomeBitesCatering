// server/storage.ts
import { Pool } from '@neondatabase/serverless';
import {
  users, opportunities, menuItems, menus, clients, quotes, events, contactIdentifiers, communications,
  opportunityPriorityEnum, rawLeadStatusEnum, rawLeads, gmailSyncState, processedEmails,
  opportunityEmailThreads, followUpDrafts, quoteVersions,
  type User, type InsertUser,
  type Opportunity, type InsertOpportunity,
  type MenuItem, type InsertMenuItem,
  type Menu as DrizzleMenu, type InsertMenu,
  type Client, type InsertClient,
  type Quote, type InsertQuote,
  type Event, type InsertEvent,
  type ContactIdentifier, type InsertContactIdentifier,
  type Communication, type InsertCommunication,
  type RawLead, type InsertRawLead,
  type GmailSyncState, type InsertGmailSyncState,
  type ProcessedEmail, type InsertProcessedEmail,
  type OpportunityEmailThread, type InsertOpportunityEmailThread,
  type FollowUpDraft, type InsertFollowUpDraft,
  type QuoteVersion, type InsertQuoteVersion,
  auditLog,
  type AuditLogEntry,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, gte, lte, inArray, and, isNull, desc, or, sql } from "drizzle-orm"; // Added lte for date range query
import { z } from "zod";
import { hasLlmProvider } from "./services/llmClient";

// Define storage interface
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(): Promise<User[]>;
  
  // Gmail Sync State
  getGmailSyncState(targetEmail: string): Promise<GmailSyncState | null>;
  saveGmailSyncState(data: InsertGmailSyncState): Promise<void>;
  
  // Processed Emails
  isEmailProcessed(messageId: string, serviceName: string | null): Promise<boolean>;
  recordProcessedEmail(data: InsertProcessedEmail): Promise<void>;
  updateProcessedEmailLabel(messageId: string, labelApplied: boolean): Promise<void>;

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
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, menuItem: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;
  listMenuItems(): Promise<MenuItem[]>;

  // Menus
  getMenu(id: number): Promise<DrizzleMenu | undefined>;
  createMenu(menu: InsertMenu): Promise<DrizzleMenu>;
  updateMenu(id: number, menu: Partial<DrizzleMenu>): Promise<DrizzleMenu | undefined>;
  deleteMenu(id: number): Promise<boolean>;
  listMenus(): Promise<DrizzleMenu[]>;

  // Clients
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  listClients(): Promise<Client[]>;

  // Quotes
  getQuote(id: number): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<Quote>): Promise<Quote | undefined>;
  deleteQuote(id: number): Promise<boolean>;
  listQuotes(): Promise<Quote[]>;

  // Events
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  listEvents(): Promise<Event[]>;
  listUpcomingEvents(): Promise<Event[]>;

  // Contact Identifiers
  createContactIdentifier(data: InsertContactIdentifier): Promise<ContactIdentifier>;
  getContactIdentifier(id: number): Promise<ContactIdentifier | undefined>;
  getContactIdentifiersForOpportunity(opportunityId: number): Promise<ContactIdentifier[]>;
  getContactIdentifiersForClient(clientId: number): Promise<ContactIdentifier[]>;
  findContactIdentifierByPhone(phone: string): Promise<ContactIdentifier | undefined>;
  findContactIdentifierByValue(value: string): Promise<ContactIdentifier | undefined>;
  deleteContactIdentifier(id: number): Promise<boolean>;
  seedClientIdentifiers(clientId: number, email: string, phone?: string | null): Promise<void>;

  // Communications
  createCommunication(data: InsertCommunication): Promise<Communication>;
  getCommunication(id: number): Promise<Communication | undefined>;
  getCommunicationsForOpportunity(opportunityId: number): Promise<Communication[]>;
  getCommunicationsForClient(clientId: number): Promise<Communication[]>;
  getCommunicationsForRawLead(rawLeadId: number): Promise<Communication[]>;
  getUnmatchedCommunications(): Promise<Communication[]>;
  assignCommunicationToClient(communicationId: number, clientId: number): Promise<Communication | undefined>;
  resolveClientFromIdentifier(value: string): Promise<{ clientId: number; opportunityId?: number } | null>;
  
  // Opportunity Email Threads
  createOpportunityEmailThread(data: InsertOpportunityEmailThread): Promise<OpportunityEmailThread>;
  getOpportunityEmailThread(gmailThreadId: string): Promise<OpportunityEmailThread | undefined>;
  getOpportunityEmailThreadsByOpportunity(opportunityId: number): Promise<OpportunityEmailThread[]>;
  updateOpportunityEmailThread(gmailThreadId: string, data: Partial<OpportunityEmailThread>): Promise<OpportunityEmailThread | undefined>;
  deleteOpportunityEmailThread(gmailThreadId: string): Promise<boolean>;

  // Raw Leads
  createRawLead(lead: InsertRawLead): Promise<RawLead>;
  getRawLead(id: number): Promise<RawLead | undefined>;
  listRawLeads(): Promise<RawLead[]>;
  listRawLeadsByStatus(status: string): Promise<RawLead[]>;
  updateRawLead(id: number, data: Partial<RawLead>): Promise<RawLead | undefined>;
  deleteRawLead(id: number): Promise<boolean>;
  deleteManyRawLeads(ids: number[]): Promise<{ deleted: number, failed: number }>;
  findContactsByIdentifier(identifier: string, type?: string): Promise<any[]>;
  getLeadSystemSettings(): Promise<any>;

  // Follow-Up Drafts (Tier 1)
  createFollowUpDraft(draft: InsertFollowUpDraft): Promise<FollowUpDraft>;
  getFollowUpDraft(id: number): Promise<FollowUpDraft | undefined>;
  listFollowUpDrafts(status?: string): Promise<FollowUpDraft[]>;
  listPendingFollowUpDrafts(): Promise<FollowUpDraft[]>;
  updateFollowUpDraft(id: number, data: Partial<FollowUpDraft>): Promise<FollowUpDraft | undefined>;
  deleteFollowUpDraft(id: number): Promise<boolean>;
  getFollowUpDraftsForOpportunity(opportunityId: number): Promise<FollowUpDraft[]>;
  getFollowUpDraftsForQuote(quoteId: number): Promise<FollowUpDraft[]>;

  // Quote Versions (Tier 3)
  createQuoteVersion(version: InsertQuoteVersion): Promise<QuoteVersion>;
  getQuoteVersions(quoteId: number): Promise<QuoteVersion[]>;
  getQuoteVersion(id: number): Promise<QuoteVersion | undefined>;
}

// DatabaseStorage implementation using PostgreSQL
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  // Gmail Sync State methods
  async getGmailSyncState(targetEmail: string): Promise<GmailSyncState | null> {
    const [result] = await db.select().from(gmailSyncState).where(eq(gmailSyncState.targetEmail, targetEmail));
    return result || null;
  }

  async saveGmailSyncState(data: InsertGmailSyncState): Promise<void> {
    try {
      // First try to select to see if record exists
      const existing = await this.getGmailSyncState(data.targetEmail);
      
      if (existing) {
        // Update existing record
        await db.update(gmailSyncState)
          .set({
            lastHistoryId: data.lastHistoryId,
            watchExpirationTimestamp: data.watchExpirationTimestamp,
            lastWatchAttemptTimestamp: data.lastWatchAttemptTimestamp || new Date(),
            updatedAt: new Date()
          })
          .where(eq(gmailSyncState.targetEmail, data.targetEmail));
      } else {
        // Insert new record
        await db.insert(gmailSyncState)
          .values({
            targetEmail: data.targetEmail,
            lastHistoryId: data.lastHistoryId,
            watchExpirationTimestamp: data.watchExpirationTimestamp,
            lastWatchAttemptTimestamp: data.lastWatchAttemptTimestamp || new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    } catch (error) {
      console.error(`Error saving Gmail sync state for ${data.targetEmail}:`, error);
      throw error;
    }
  }
  
  // Processed Emails methods
  async isEmailProcessed(messageId: string, serviceName: string | null): Promise<boolean> {
    const conditions = [eq(processedEmails.messageId, messageId)];
    if (serviceName) {
      conditions.push(eq(processedEmails.service, serviceName));
    }
    const existing = await db.select({ id: processedEmails.id })
                           .from(processedEmails)
                           .where(and(...conditions))
                           .limit(1);
    return existing.length > 0;
  }

  async recordProcessedEmail(data: InsertProcessedEmail): Promise<void> {
    // Ensure you don't re-insert if somehow missed by isEmailProcessed
    try {
      // Check if the record already exists
      const existing = await db.select({ id: processedEmails.id })
                           .from(processedEmails)
                           .where(eq(processedEmails.messageId, data.messageId))
                           .limit(1);
      
      if (existing.length === 0) {
        // Add processedAt as current date if not provided
        await db.insert(processedEmails).values({
          ...data,
          processedAt: new Date()
        });
        console.log(`Recorded processed email with ID ${data.messageId}`);
      } else {
        // Update the existing record if desired
        await db.update(processedEmails)
          .set({ 
            labelApplied: data.labelApplied,
            processedAt: new Date() 
          })
          .where(eq(processedEmails.messageId, data.messageId));
        console.log(`Updated processed email record for ${data.messageId}`);
      }
    } catch (e) {
      console.error("Error recording processed email:", e);
    }
  }

  async updateProcessedEmailLabel(messageId: string, labelApplied: boolean): Promise<void> {
    await db.update(processedEmails)
      .set({ labelApplied })
      .where(eq(processedEmails.messageId, messageId));
  }
  
  // Events method for conflict checking
  async getEventsAroundDate(date: Date, daysBuffer: number = 3): Promise<Event[]> {
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - daysBuffer);
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + daysBuffer);

    return await db.select()
      .from(events)
      .where(and(
        gte(events.eventDate, startDate),
        lte(events.eventDate, endDate)
      ))
      .orderBy(events.eventDate);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return !!deletedUser;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Opportunity methods
  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return opportunity;
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const [createdOpportunity] = await db.insert(opportunities).values(opportunity as any).returning();
    return createdOpportunity;
  }

  async updateOpportunity(id: number, opportunity: Partial<Opportunity>): Promise<Opportunity | undefined> {
    const [updatedOpportunity] = await db
      .update(opportunities)
      .set({ ...opportunity, updatedAt: new Date() })
      .where(eq(opportunities.id, id))
      .returning();
    return updatedOpportunity;
  }

  async deleteOpportunity(id: number): Promise<boolean> {
    // Tier 4: Soft delete
    const [softDeleted] = await db
      .update(opportunities)
      .set({ deletedAt: new Date() })
      .where(eq(opportunities.id, id))
      .returning({ id: opportunities.id });
    return !!softDeleted;
  }

  async listOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(isNull(opportunities.deletedAt));
  }

  async listOpportunitiesByStatus(status: string): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(and(eq(opportunities.status, status as any), isNull(opportunities.deletedAt)));
  }

  async listOpportunitiesBySource(source: string): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(and(eq(opportunities.opportunitySource, source), isNull(opportunities.deletedAt)));
  }

  async listOpportunitiesByPriority(priority: typeof opportunityPriorityEnum.enumValues[number]): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(and(eq(opportunities.priority, priority), isNull(opportunities.deletedAt)));
  }

  // Menu Item methods
  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    try {
      console.log('Storage: Getting menu item with ID:', id);
      const result = await db.select().from(menuItems).where(eq(menuItems.id, id));
      console.log('Storage: Query result:', result.length > 0 ? 'Found' : 'Not found');
      return result[0];
    } catch (error) {
      console.error('Storage: Error getting menu item:', error);
      return undefined;
    }
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [createdMenuItem] = await db.insert(menuItems).values(menuItem as any).returning();
    return createdMenuItem;
  }

  async updateMenuItem(id: string, menuItem: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const [updatedMenuItem] = await db
      .update(menuItems)
      .set({ ...menuItem, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return updatedMenuItem;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const [deletedMenuItem] = await db
      .delete(menuItems)
      .where(eq(menuItems.id, id))
      .returning({ id: menuItems.id });
    return !!deletedMenuItem;
  }

  async listMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems);
  }

  // Menu methods
  async getMenu(id: number): Promise<DrizzleMenu | undefined> {
    const [menu] = await db.select().from(menus).where(eq(menus.id, id));
    return menu;
  }

  async createMenu(menu: InsertMenu): Promise<DrizzleMenu> {
    const [createdMenu] = await db.insert(menus).values(menu as any).returning();
    return createdMenu;
  }

  async updateMenu(id: number, menu: Partial<DrizzleMenu>): Promise<DrizzleMenu | undefined> {
    const [updatedMenu] = await db
      .update(menus)
      .set({ ...menu, updatedAt: new Date() })
      .where(eq(menus.id, id))
      .returning();
    return updatedMenu;
  }

  async deleteMenu(id: number): Promise<boolean> {
    const [deletedMenu] = await db
      .delete(menus)
      .where(eq(menus.id, id))
      .returning({ id: menus.id });
    return !!deletedMenu;
  }

  async listMenus(): Promise<DrizzleMenu[]> {
    const allMenus = await db.select().from(menus);
    return allMenus;
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [createdClient] = await db.insert(clients).values(client).returning();
    return createdClient;
  }

  async updateClient(id: number, client: Partial<Client>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    const [softDeleted] = await db
      .update(clients)
      .set({ deletedAt: new Date() })
      .where(eq(clients.id, id))
      .returning({ id: clients.id });
    return !!softDeleted;
  }

  async listClients(): Promise<Client[]> {
    return await db.select().from(clients).where(isNull(clients.deletedAt));
  }

  // Quote methods
  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [createdQuote] = await db.insert(quotes).values(quote).returning();
    return createdQuote;
  }

  async updateQuote(id: number, quote: Partial<Quote>): Promise<Quote | undefined> {
    const [updatedQuote] = await db
      .update(quotes)
      .set({ ...quote, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return updatedQuote;
  }

  async deleteQuote(id: number): Promise<boolean> {
    const [softDeleted] = await db
      .update(quotes)
      .set({ deletedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning({ id: quotes.id });
    return !!softDeleted;
  }

  async listQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).where(isNull(quotes.deletedAt));
  }

  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [createdEvent] = await db.insert(events).values(event).returning();
    return createdEvent;
  }

  async updateEvent(id: number, event: Partial<Event>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const [softDeleted] = await db
      .update(events)
      .set({ deletedAt: new Date() })
      .where(eq(events.id, id))
      .returning({ id: events.id });
    return !!softDeleted;
  }

  async listEvents(): Promise<Event[]> {
    return await db.select().from(events).where(isNull(events.deletedAt));
  }

  async listUpcomingEvents(): Promise<Event[]> {
    const today = new Date();
    return await db
      .select()
      .from(events)
      .where(and(gte(events.eventDate, today), isNull(events.deletedAt)))
      .orderBy(events.eventDate);
  }

  // Contact Identifiers methods
  async createContactIdentifier(data: InsertContactIdentifier): Promise<ContactIdentifier> {
    const [createdIdentifier] = await db.insert(contactIdentifiers).values(data).returning();
    return createdIdentifier;
  }

  async getContactIdentifier(id: number): Promise<ContactIdentifier | undefined> {
    const [identifier] = await db.select().from(contactIdentifiers).where(eq(contactIdentifiers.id, id));
    return identifier;
  }

  async getContactIdentifiersForOpportunity(opportunityId: number): Promise<ContactIdentifier[]> {
    return await db.select().from(contactIdentifiers).where(eq(contactIdentifiers.opportunityId, opportunityId));
  }

  async getContactIdentifiersForClient(clientId: number): Promise<ContactIdentifier[]> {
    return await db.select().from(contactIdentifiers).where(eq(contactIdentifiers.clientId, clientId));
  }

  async findContactIdentifierByPhone(phone: string): Promise<ContactIdentifier | undefined> {
    const [identifier] = await db
      .select()
      .from(contactIdentifiers)
      .where(and(
        eq(contactIdentifiers.type, 'phone'),
        eq(contactIdentifiers.value, phone)
      ))
      .limit(1);
    return identifier;
  }

  async deleteContactIdentifier(id: number): Promise<boolean> {
    const [deletedIdentifier] = await db
      .delete(contactIdentifiers)
      .where(eq(contactIdentifiers.id, id))
      .returning({ id: contactIdentifiers.id });
    return !!deletedIdentifier;
  }

  async findContactIdentifierByValue(value: string): Promise<ContactIdentifier | undefined> {
    const normalized = value.trim().toLowerCase();
    const [identifier] = await db
      .select()
      .from(contactIdentifiers)
      .where(sql`lower(trim(${contactIdentifiers.value})) = ${normalized}`)
      .limit(1);
    return identifier;
  }

  async seedClientIdentifiers(clientId: number, email: string, phone?: string | null): Promise<void> {
    // Check if email identifier already exists for this client
    const existingEmail = await db.select().from(contactIdentifiers)
      .where(and(
        eq(contactIdentifiers.clientId, clientId),
        eq(contactIdentifiers.type, 'email'),
        sql`lower(trim(${contactIdentifiers.value})) = ${email.trim().toLowerCase()}`
      ))
      .limit(1);

    if (existingEmail.length === 0 && email) {
      await db.insert(contactIdentifiers).values({
        clientId,
        type: 'email',
        value: email.trim().toLowerCase(),
        isPrimary: true,
        verified: false,
        source: 'auto_seed',
      });
    }

    if (phone) {
      const normalizedPhone = phone.replace(/[^\d+]/g, '');
      const existingPhone = await db.select().from(contactIdentifiers)
        .where(and(
          eq(contactIdentifiers.clientId, clientId),
          eq(contactIdentifiers.type, 'phone'),
          eq(contactIdentifiers.value, normalizedPhone)
        ))
        .limit(1);

      if (existingPhone.length === 0) {
        await db.insert(contactIdentifiers).values({
          clientId,
          type: 'phone',
          value: normalizedPhone,
          isPrimary: true,
          verified: false,
          source: 'auto_seed',
        });
      }
    }
  }

  // Resolve a client from an email/phone/handle by looking up contact_identifiers, then fallback to clients table
  async resolveClientFromIdentifier(value: string): Promise<{ clientId: number; opportunityId?: number } | null> {
    const normalized = value.trim().toLowerCase();

    // First, look up in contact_identifiers (most reliable)
    const [identifier] = await db
      .select()
      .from(contactIdentifiers)
      .where(sql`lower(trim(${contactIdentifiers.value})) = ${normalized}`)
      .limit(1);

    if (identifier?.clientId) {
      // Also find the most recent opportunity for context
      const [opp] = await db.select({ id: opportunities.id })
        .from(opportunities)
        .where(eq(opportunities.clientId, identifier.clientId))
        .orderBy(desc(opportunities.createdAt))
        .limit(1);
      return { clientId: identifier.clientId, opportunityId: opp?.id };
    }

    if (identifier?.opportunityId) {
      // Found via opportunity — check if that opp has a client
      const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, identifier.opportunityId));
      if (opp?.clientId) {
        return { clientId: opp.clientId, opportunityId: opp.id };
      }
      return { clientId: 0, opportunityId: opp?.id }; // has opportunity but no client yet
    }

    // Fallback: look in clients table directly (email or phone)
    const [client] = await db.select({ id: clients.id })
      .from(clients)
      .where(and(
        isNull(clients.deletedAt),
        or(
          sql`lower(trim(${clients.email})) = ${normalized}`,
          sql`replace(${clients.phone}, '-', '') = replace(${normalized}, '-', '')`
        )
      ))
      .limit(1);

    if (client) {
      return { clientId: client.id };
    }

    return null;
  }

  // Communications methods
  async createCommunication(data: InsertCommunication): Promise<Communication> {
    const [createdCommunication] = await db.insert(communications).values(data).returning();
    return createdCommunication;
  }

  async getCommunication(id: number): Promise<Communication | undefined> {
    const [communication] = await db.select().from(communications).where(eq(communications.id, id));
    return communication;
  }

  async getCommunicationsForOpportunity(opportunityId: number): Promise<Communication[]> {
    const comms = await db
      .select()
      .from(communications)
      .where(eq(communications.opportunityId, opportunityId))
      .orderBy(desc(communications.timestamp));
    
    // Rename metaData to metadata for frontend compatibility and add hasFullEmailInStorage flag
    return comms.map(comm => ({
      ...comm,
      metaData: undefined, // Remove the DB field name
      metadata: {
        ...(comm.metaData as any || {}),
        hasFullEmailInStorage: !!(comm.gcpStoragePath && comm.gmailMessageId)
      }
    }));
  }

  async getCommunicationsForClient(clientId: number): Promise<Communication[]> {
    const comms = await db
      .select()
      .from(communications)
      .where(eq(communications.clientId, clientId))
      .orderBy(desc(communications.timestamp));
    
    // Enhance metadata to include hasFullEmailInStorage flag for frontend
    return comms.map(comm => ({
      ...comm,
      metadata: {
        ...(comm.metaData as any || {}),
        hasFullEmailInStorage: !!(comm.gcpStoragePath && comm.gmailMessageId)
      }
    }));
  }

  async getCommunicationsForRawLead(rawLeadId: number): Promise<Communication[]> {
    // Get all thread IDs associated with this raw lead
    const threads = await db
      .select()
      .from(opportunityEmailThreads)
      .where(eq(opportunityEmailThreads.rawLeadId, rawLeadId));
    
    if (threads.length === 0) {
      return [];
    }
    
    // Filter out any null/empty thread IDs before querying
    const threadIds = threads
      .map(t => t.gmailThreadId)
      .filter(id => id && id.trim().length > 0);
    
    if (threadIds.length === 0) {
      return [];
    }
    
    // Get all communications for those threads
    const comms = await db
      .select()
      .from(communications)
      .where(inArray(communications.gmailThreadId, threadIds))
      .orderBy(desc(communications.timestamp));
    
    // Enhance metadata to include hasFullEmailInStorage flag for frontend
    return comms.map(comm => ({
      ...comm,
      metaData: undefined, // Remove the DB field name
      metadata: {
        ...(comm.metaData as any || {}),
        hasFullEmailInStorage: !!(comm.gcpStoragePath && comm.gmailMessageId)
      }
    }));
  }

  async getUnmatchedCommunications(): Promise<Communication[]> {
    const comms = await db
      .select()
      .from(communications)
      .where(and(
        isNull(communications.clientId),
        isNull(communications.opportunityId)
      ))
      .orderBy(desc(communications.timestamp));

    return comms.map(comm => ({
      ...comm,
      metadata: {
        ...(comm.metaData as any || {}),
        hasFullEmailInStorage: !!(comm.gcpStoragePath && comm.gmailMessageId)
      }
    }));
  }

  async assignCommunicationToClient(communicationId: number, clientId: number): Promise<Communication | undefined> {
    const [updated] = await db
      .update(communications)
      .set({ clientId, updatedAt: new Date() })
      .where(eq(communications.id, communicationId))
      .returning();
    return updated;
  }

  async createOpportunityEmailThread(data: InsertOpportunityEmailThread): Promise<OpportunityEmailThread> {
    const [thread] = await db
      .insert(opportunityEmailThreads)
      .values(data)
      .returning();
    return thread;
  }

  async getOpportunityEmailThread(gmailThreadId: string): Promise<OpportunityEmailThread | undefined> {
    const [thread] = await db
      .select()
      .from(opportunityEmailThreads)
      .where(eq(opportunityEmailThreads.gmailThreadId, gmailThreadId));
    return thread;
  }

  async getOpportunityEmailThreadsByOpportunity(opportunityId: number): Promise<OpportunityEmailThread[]> {
    return await db
      .select()
      .from(opportunityEmailThreads)
      .where(eq(opportunityEmailThreads.opportunityId, opportunityId))
      .orderBy(desc(opportunityEmailThreads.createdAt));
  }

  async updateOpportunityEmailThread(gmailThreadId: string, data: Partial<OpportunityEmailThread>): Promise<OpportunityEmailThread | undefined> {
    const [updated] = await db
      .update(opportunityEmailThreads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(opportunityEmailThreads.gmailThreadId, gmailThreadId))
      .returning();
    return updated;
  }

  async deleteOpportunityEmailThread(gmailThreadId: string): Promise<boolean> {
    const result = await db
      .delete(opportunityEmailThreads)
      .where(eq(opportunityEmailThreads.gmailThreadId, gmailThreadId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Raw Leads methods
  async createRawLead(lead: InsertRawLead): Promise<RawLead> {
    const [createdLead] = await db.insert(rawLeads).values(lead as any).returning();

    // Auto-match against existing clients/opportunities. Best-effort — any
    // failure is logged and swallowed so ingestion never breaks. If a match
    // is found, the raw lead row is updated (status, createdOpportunityId)
    // and a communication is logged on the matched client's timeline; we
    // re-read here so the returned row reflects the post-match state.
    try {
      const { autoMatchRawLead } = await import("./services/rawLeadMatcher");
      const result = await autoMatchRawLead(createdLead);
      if (result.matched) {
        const [refreshed] = await db
          .select()
          .from(rawLeads)
          .where(eq(rawLeads.id, createdLead.id));
        if (refreshed) return refreshed;
      }
    } catch (err) {
      console.error("[createRawLead] auto-match failed (non-fatal):", err);
    }
    return createdLead;
  }

  async getRawLead(id: number): Promise<RawLead | undefined> {
    const [lead] = await db.select().from(rawLeads).where(eq(rawLeads.id, id));
    return lead;
  }

  async listRawLeads(): Promise<RawLead[]> {
    return await db.select().from(rawLeads).orderBy(desc(rawLeads.receivedAt));
  }

  async listRawLeadsByStatus(status: string): Promise<RawLead[]> {
    return await db
      .select()
      .from(rawLeads)
      .where(eq(rawLeads.status, status as any)) // Type cast to enum
      .orderBy(desc(rawLeads.receivedAt));
  }

  async updateRawLead(id: number, data: Partial<RawLead>): Promise<RawLead | undefined> {
    const [updatedLead] = await db
      .update(rawLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rawLeads.id, id))
      .returning();
    return updatedLead;
  }

  async deleteRawLead(id: number): Promise<boolean> {
    const [deletedLead] = await db
      .delete(rawLeads)
      .where(eq(rawLeads.id, id))
      .returning({ id: rawLeads.id });
    return !!deletedLead;
  }

  async deleteManyRawLeads(ids: number[]): Promise<{ deleted: number, failed: number }> {
    if (!ids.length) return { deleted: 0, failed: 0 };
    
    try {
      const result = await db
        .delete(rawLeads)
        .where(inArray(rawLeads.id, ids))
        .returning({ id: rawLeads.id });
      
      return {
        deleted: result.length,
        failed: ids.length - result.length
      };
    } catch (error) {
      console.error('Error deleting many raw leads:', error);
      return { deleted: 0, failed: ids.length };
    }
  }

  // Contact search methods
  async findContactsByIdentifier(identifier: string, type?: string): Promise<any[]> {
    const results = [];
    
    // Prepare queries based on the type
    const queries = [];
    
    if (!type || type === 'email') {
      // Find opportunities with matching email
      queries.push(
        db.select().from(opportunities).where(eq(opportunities.email, identifier))
      );
      
      // Find clients with matching email
      queries.push(
        db.select().from(clients).where(eq(clients.email, identifier))
      );
      
      // Find via contact identifiers
      queries.push(
        db.select({
          contact: contactIdentifiers,
          opportunity: opportunities,
          client: clients
        })
        .from(contactIdentifiers)
        .leftJoin(opportunities, eq(contactIdentifiers.opportunityId, opportunities.id))
        .leftJoin(clients, eq(contactIdentifiers.clientId, clients.id))
        .where(
          and(
            eq(contactIdentifiers.type, 'email'),
            eq(contactIdentifiers.value, identifier)
          )
        )
      );
    }
    
    if (!type || type === 'phone') {
      // Find opportunities with matching phone
      queries.push(
        db.select().from(opportunities).where(eq(opportunities.phone, identifier))
      );
      
      // Find clients with matching phone
      queries.push(
        db.select().from(clients).where(eq(clients.phone, identifier))
      );
      
      // Find via contact identifiers
      queries.push(
        db.select({
          contact: contactIdentifiers,
          opportunity: opportunities,
          client: clients
        })
        .from(contactIdentifiers)
        .leftJoin(opportunities, eq(contactIdentifiers.opportunityId, opportunities.id))
        .leftJoin(clients, eq(contactIdentifiers.clientId, clients.id))
        .where(
          and(
            eq(contactIdentifiers.type, 'phone'),
            eq(contactIdentifiers.value, identifier)
          )
        )
      );
    }
    
    try {
      // Execute all queries
      const allResults = await Promise.all(queries);
      
      // Process and flatten the results
      for (const queryResult of allResults) {
        if (queryResult.length > 0) {
          const firstRow = queryResult[0] as any;
          // Check if this is a structured result (from a join)
          if (firstRow.contact) {
            for (const row of queryResult) {
              const r = row as any;
              if (r.opportunity && r.opportunity.id) {
                results.push({
                  type: 'opportunity',
                  data: r.opportunity,
                  via: 'contact_identifier'
                });
              }

              if (r.client && r.client.id) {
                results.push({
                  type: 'client',
                  data: r.client,
                  via: 'contact_identifier'
                });
              }
            }
          } else if (firstRow.firstName) {
            // This is either an opportunity or client
            const isOpportunity = firstRow.status !== undefined; // Opportunities have status

            for (const item of queryResult) {
              results.push({
                type: isOpportunity ? 'opportunity' : 'client',
                data: item,
                via: 'direct_match'
              });
            }
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error searching contacts by identifier:', error);
      return [];
    }
  }

  // Lead system settings
  async getLeadSystemSettings(): Promise<any> {
    return {
      autoProcessing: true,
      aiIntegration: hasLlmProvider(),
      emailSync: {
        enabled: !!process.env.GMAIL_API_KEY,
        interval: 5,
      }
    };
  }

  // ─── Follow-Up Drafts (Tier 1) ─────────────────────────────────────────────

  async createFollowUpDraft(draft: InsertFollowUpDraft): Promise<FollowUpDraft> {
    const [created] = await db.insert(followUpDrafts).values(draft).returning();
    return created;
  }

  async getFollowUpDraft(id: number): Promise<FollowUpDraft | undefined> {
    const [draft] = await db.select().from(followUpDrafts).where(eq(followUpDrafts.id, id));
    return draft;
  }

  async listFollowUpDrafts(status?: string): Promise<FollowUpDraft[]> {
    if (status) {
      return await db.select().from(followUpDrafts)
        .where(eq(followUpDrafts.status, status as any))
        .orderBy(desc(followUpDrafts.createdAt));
    }
    return await db.select().from(followUpDrafts).orderBy(desc(followUpDrafts.createdAt));
  }

  async listPendingFollowUpDrafts(): Promise<FollowUpDraft[]> {
    return await db.select().from(followUpDrafts)
      .where(eq(followUpDrafts.status, 'pending'))
      .orderBy(desc(followUpDrafts.createdAt));
  }

  async updateFollowUpDraft(id: number, data: Partial<FollowUpDraft>): Promise<FollowUpDraft | undefined> {
    const [updated] = await db.update(followUpDrafts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(followUpDrafts.id, id))
      .returning();
    return updated;
  }

  async deleteFollowUpDraft(id: number): Promise<boolean> {
    const [deleted] = await db.delete(followUpDrafts)
      .where(eq(followUpDrafts.id, id))
      .returning({ id: followUpDrafts.id });
    return !!deleted;
  }

  async getFollowUpDraftsForOpportunity(opportunityId: number): Promise<FollowUpDraft[]> {
    return await db.select().from(followUpDrafts)
      .where(eq(followUpDrafts.opportunityId, opportunityId))
      .orderBy(desc(followUpDrafts.createdAt));
  }

  async getFollowUpDraftsForQuote(quoteId: number): Promise<FollowUpDraft[]> {
    return await db.select().from(followUpDrafts)
      .where(eq(followUpDrafts.quoteId, quoteId))
      .orderBy(desc(followUpDrafts.createdAt));
  }

  // ─── Quote Versions (Tier 3) ────────────────────────────────────────────

  async createQuoteVersion(version: InsertQuoteVersion): Promise<QuoteVersion> {
    const [created] = await db.insert(quoteVersions).values(version).returning();
    return created;
  }

  async getQuoteVersions(quoteId: number): Promise<QuoteVersion[]> {
    return await db.select().from(quoteVersions)
      .where(eq(quoteVersions.quoteId, quoteId))
      .orderBy(desc(quoteVersions.version));
  }

  async getQuoteVersion(id: number): Promise<QuoteVersion | undefined> {
    const [version] = await db.select().from(quoteVersions).where(eq(quoteVersions.id, id));
    return version;
  }

  // ─── Audit Log (Tier 4) ─────────────────────────────────────────────────

  async writeAuditLog(entry: {
    entityType: string;
    entityId: number;
    action: 'created' | 'updated' | 'deleted' | 'restored' | 'merged';
    userId?: number;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await db.insert(auditLog).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId || null,
      changes: entry.changes || null,
      metadata: entry.metadata || null,
    });
  }

  async getAuditLog(entityType?: string, entityId?: number, limit = 50): Promise<AuditLogEntry[]> {
    const conditions = [];
    if (entityType) conditions.push(eq(auditLog.entityType, entityType));
    if (entityId) conditions.push(eq(auditLog.entityId, entityId));

    const query = db.select().from(auditLog);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(auditLog.createdAt)).limit(limit);
    }
    return await query.orderBy(desc(auditLog.createdAt)).limit(limit);
  }

  // Restore soft-deleted record
  async restoreOpportunity(id: number): Promise<boolean> {
    const [restored] = await db.update(opportunities).set({ deletedAt: null }).where(eq(opportunities.id, id)).returning({ id: opportunities.id });
    return !!restored;
  }

  async restoreClient(id: number): Promise<boolean> {
    const [restored] = await db.update(clients).set({ deletedAt: null }).where(eq(clients.id, id)).returning({ id: clients.id });
    return !!restored;
  }

  async restoreQuote(id: number): Promise<boolean> {
    const [restored] = await db.update(quotes).set({ deletedAt: null }).where(eq(quotes.id, id)).returning({ id: quotes.id });
    return !!restored;
  }

  async restoreEvent(id: number): Promise<boolean> {
    const [restored] = await db.update(events).set({ deletedAt: null }).where(eq(events.id, id)).returning({ id: events.id });
    return !!restored;
  }

}

// Create and export the storage instance
export const storage = new DatabaseStorage();