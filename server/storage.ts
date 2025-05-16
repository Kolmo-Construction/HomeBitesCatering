// server/storage.ts
import { Pool } from '@neondatabase/serverless';
import {
  users, opportunities, menuItems, menus, clients, estimates, events, contactIdentifiers, communications,
  opportunityPriorityEnum, rawLeadStatusEnum, rawLeads, processedEmails,
  questionnairePages, questionnaireDefinitions, questionnaireQuestions, questionnaireQuestionOptions, questionTypeEnum,
  questionnaireConditionalLogic, questionnaireSubmissions, questionnaireMatrixColumns, 
  type User, type InsertUser,
  type Opportunity, type InsertOpportunity,
  type MenuItem, type InsertMenuItem, // Ensure MenuItem type is imported
  type Menu as DrizzleMenu, type InsertMenu, // Alias original Menu to DrizzleMenu to avoid naming conflict
  type Client, type InsertClient,
  type Estimate, type InsertEstimate,
  type Event, type InsertEvent,
  type ContactIdentifier, type InsertContactIdentifier,
  type Communication, type InsertCommunication,
  type RawLead, type InsertRawLead,
  type ProcessedEmail, type InsertProcessedEmail,
  type QuestionnairePage, type InsertQuestionnairePage, 
  type QuestionnaireDefinition, insertQuestionnaireDefinitionSchema,
  type QuestionnaireQuestion, type InsertQuestionnaireQuestion,
  type QuestionnaireQuestionOption, type InsertQuestionnaireQuestionOption,
  type QuestionnaireMatrixColumn, type InsertQuestionnaireMatrixColumn,
  type QuestionnaireConditionalLogic, type InsertQuestionnaireConditionalLogic,
  type QuestionnaireSubmission, type InsertQuestionnaireSubmission
} from "@shared/schema";
import { db } from "./db";
import { eq, gte, inArray, and, isNull, desc, or } from "drizzle-orm"; // Added or for logical OR operations
import { z } from "zod";

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

  // Email duplicate prevention methods
  isEmailProcessed(messageId: string, service: string): Promise<boolean>;
  recordProcessedEmail(emailData: InsertProcessedEmail): Promise<ProcessedEmail>;
  updateProcessedEmailLabel(messageId: string, labelApplied: boolean): Promise<ProcessedEmail | undefined>;
  getEmailsByService(service: string, limit?: number): Promise<ProcessedEmail[]>;
  
  // Questionnaire management methods
  // Questionnaire Definitions
  createQuestionnaireDefinition(definition: z.infer<typeof insertQuestionnaireDefinitionSchema>): Promise<QuestionnaireDefinition>;
  getQuestionnaireDefinition(definitionId: number): Promise<QuestionnaireDefinition | undefined>;
  
  // Questionnaire Pages
  getQuestionnairePage(pageId: number): Promise<QuestionnairePage | undefined>;
  getQuestionnairePagesByDefinition(definitionId: number): Promise<QuestionnairePage[]>;
  createQuestionnairePage(page: InsertQuestionnairePage): Promise<QuestionnairePage>;
  updateQuestionnairePage(pageId: number, page: Partial<QuestionnairePage>): Promise<QuestionnairePage | undefined>;
  deleteQuestionnairePage(pageId: number): Promise<boolean>;
  reorderQuestionnairePages(definitionId: number, pageIds: number[]): Promise<QuestionnairePage[]>;
  
  // Questionnaire Questions
  getQuestionnaireQuestion(questionId: number): Promise<QuestionnaireQuestion | undefined>;
  getQuestionnaireQuestionsByPage(pageId: number): Promise<QuestionnaireQuestion[]>;
  createQuestionnaireQuestion(question: InsertQuestionnaireQuestion): Promise<QuestionnaireQuestion>;
  updateQuestionnaireQuestion(questionId: number, question: Partial<QuestionnaireQuestion>): Promise<QuestionnaireQuestion | undefined>;
  deleteQuestionnaireQuestion(questionId: number): Promise<boolean>;
  reorderQuestionnaireQuestions(pageId: number, questionIds: number[]): Promise<QuestionnaireQuestion[]>;
  
  // Questionnaire Options (for choice questions)
  getQuestionnaireQuestionOptions(questionId: number): Promise<QuestionnaireQuestionOption[]>;
  createQuestionnaireQuestionOption(option: InsertQuestionnaireQuestionOption): Promise<QuestionnaireQuestionOption>;
  updateQuestionnaireQuestionOption(optionId: number, option: Partial<QuestionnaireQuestionOption>): Promise<QuestionnaireQuestionOption | undefined>;
  deleteQuestionnaireQuestionOption(optionId: number): Promise<boolean>;
  
  // Questionnaire Conditional Logic
  getConditionalLogicRule(ruleId: number): Promise<QuestionnaireConditionalLogic | undefined>;
  getConditionalLogicRulesByDefinition(definitionId: number): Promise<QuestionnaireConditionalLogic[]>;
  createConditionalLogicRule(rule: InsertQuestionnaireConditionalLogic): Promise<QuestionnaireConditionalLogic>;
  updateConditionalLogicRule(ruleId: number, rule: Partial<QuestionnaireConditionalLogic>): Promise<QuestionnaireConditionalLogic | undefined>;
  deleteConditionalLogicRule(ruleId: number): Promise<boolean>;
  questionKeyExistsInDefinition(definitionId: number, questionKey: string): Promise<boolean>;
  
  // Public-facing questionnaire methods
  getActiveQuestionnaireDefinition(): Promise<QuestionnaireDefinition | undefined>;
  getPublicQuestionnaireStructure(definitionId: number): Promise<{
    definition: QuestionnaireDefinition;
    pages: {
      page: QuestionnairePage;
      questions: {
        question: QuestionnaireQuestion;
        options: QuestionnaireQuestionOption[];
        matrixColumns: QuestionnaireMatrixColumn[];
      }[];
    }[];
    conditionalLogic: QuestionnaireConditionalLogic[];
  } | undefined>;
  submitQuestionnaireResponse(submission: InsertQuestionnaireSubmission): Promise<QuestionnaireSubmission>;
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
    console.log(`Updating opportunity ${id} with data:`, JSON.stringify(opportunityData));
    
    // If clientId is being set, get the client info to update firstName and lastName
    if (opportunityData.clientId) {
      console.log(`Client ID detected: ${opportunityData.clientId}`);
      try {
        const client = await this.getClient(opportunityData.clientId);
        console.log(`Retrieved client:`, JSON.stringify(client));
        
        if (client) {
          // Update the opportunityData with the client's name
          opportunityData.firstName = client.firstName;
          opportunityData.lastName = client.lastName;
          console.log(`Updated opportunity data to use client name: ${client.firstName} ${client.lastName}`);
        } else {
          console.log(`No client found with ID ${opportunityData.clientId}`);
        }
      } catch (error) {
        console.error("Error getting client data for opportunity update:", error);
      }
    } else {
      console.log('No clientId in update data');
    }
    
    console.log(`Final opportunity update data:`, JSON.stringify(opportunityData));
    
    const [updatedOpportunity] = await db
      .update(opportunities)
      .set(opportunityData)
      .where(eq(opportunities.id, id))
      .returning();
      
    console.log(`Updated opportunity result:`, JSON.stringify(updatedOpportunity));
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
    // We'll compile conditions first, then apply them
    const conditions = [];
    
    // Add conditions based on filters
    if (filters?.status) {
      conditions.push(eq(rawLeads.status, filters.status as any));
    }
    
    if (filters?.source) {
      conditions.push(eq(rawLeads.source, filters.source));
    }
    
    // Execute query with appropriate conditions
    if (conditions.length === 0) {
      // No filters
      return await db.select().from(rawLeads).orderBy(desc(rawLeads.receivedAt));
    } else {
      // With filters - apply AND logic
      return await db.select()
        .from(rawLeads)
        .where(and(...conditions))
        .orderBy(desc(rawLeads.receivedAt));
    }
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

  // Email duplicate prevention methods implementation
  async isEmailProcessed(messageId: string, service: string): Promise<boolean> {
    try {
      const existingEmail = await db
        .select()
        .from(processedEmails)
        .where(eq(processedEmails.messageId, messageId))
        .limit(1);
      
      return existingEmail.length > 0;
    } catch (error) {
      console.error(`Error checking if email ${messageId} is processed:`, error);
      // If we can't check, assume it's not processed for safety
      return false;
    }
  }

  async recordProcessedEmail(emailData: InsertProcessedEmail): Promise<ProcessedEmail> {
    try {
      // Check if this message ID is already recorded
      const existing = await db
        .select()
        .from(processedEmails)
        .where(eq(processedEmails.messageId, emailData.messageId))
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`Email with message ID ${emailData.messageId} already recorded, returning existing record`);
        return existing[0];
      }
      
      // Record new processed email
      const [result] = await db
        .insert(processedEmails)
        .values(emailData)
        .returning();
      
      return result;
    } catch (error) {
      console.error(`Error recording processed email ${emailData.messageId}:`, error);
      throw error;
    }
  }

  async updateProcessedEmailLabel(messageId: string, labelApplied: boolean): Promise<ProcessedEmail | undefined> {
    try {
      const [updated] = await db
        .update(processedEmails)
        .set({ labelApplied })
        .where(eq(processedEmails.messageId, messageId))
        .returning();
      
      return updated;
    } catch (error) {
      console.error(`Error updating label status for email ${messageId}:`, error);
      return undefined;
    }
  }

  async getEmailsByService(service: string, limit: number = 100): Promise<ProcessedEmail[]> {
    try {
      return await db
        .select()
        .from(processedEmails)
        .where(eq(processedEmails.service, service))
        .orderBy(desc(processedEmails.processedAt))
        .limit(limit);
    } catch (error) {
      console.error(`Error fetching processed emails for service ${service}:`, error);
      return [];
    }
  }

  // Questionnaire Definitions Implementation
  
  async createQuestionnaireDefinition(definition: z.infer<typeof insertQuestionnaireDefinitionSchema>): Promise<QuestionnaireDefinition> {
    try {
      const [newDefinition] = await db
        .insert(questionnaireDefinitions)
        .values(definition)
        .returning();
      
      return newDefinition;
    } catch (error) {
      console.error('Error creating questionnaire definition:', error);
      throw error;
    }
  }
  
  async getQuestionnaireDefinition(definitionId: number): Promise<QuestionnaireDefinition | undefined> {
    try {
      const [definition] = await db
        .select()
        .from(questionnaireDefinitions)
        .where(eq(questionnaireDefinitions.id, definitionId));
      
      return definition;
    } catch (error) {
      console.error(`Error fetching questionnaire definition ${definitionId}:`, error);
      return undefined;
    }
  }
  
  async deleteQuestionnaireDefinition(definitionId: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete questionnaire definition ID: ${definitionId}`);
      
      // First find all pages for this definition
      const pages = await this.getQuestionnairePagesByDefinition(definitionId);
      console.log(`Found ${pages.length} pages for definition ${definitionId}`);
      
      // Execute direct SQL delete statements because they're more reliable than ORM operations
      const client = await db.execute(sql`
        -- First, delete all options and matrix columns for questions in this definition
        DELETE FROM questionnaire_question_options 
        WHERE question_id IN (
          SELECT qq.id FROM questionnaire_questions qq
          JOIN questionnaire_pages qp ON qq.page_id = qp.id
          WHERE qp.definition_id = ${definitionId}
        );
        
        DELETE FROM questionnaire_matrix_columns 
        WHERE question_id IN (
          SELECT qq.id FROM questionnaire_questions qq
          JOIN questionnaire_pages qp ON qq.page_id = qp.id
          WHERE qp.definition_id = ${definitionId}
        );
        
        -- Then delete all questions for this definition
        DELETE FROM questionnaire_questions
        WHERE page_id IN (
          SELECT id FROM questionnaire_pages
          WHERE definition_id = ${definitionId}
        );
        
        -- Delete conditional logic rules
        DELETE FROM questionnaire_conditional_logic
        WHERE definition_id = ${definitionId};
        
        -- Delete all pages
        DELETE FROM questionnaire_pages
        WHERE definition_id = ${definitionId};
        
        -- Finally delete the definition
        DELETE FROM questionnaire_definitions
        WHERE id = ${definitionId};
      `);
      
      console.log(`Successfully executed delete operations for definition ${definitionId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting questionnaire definition ${definitionId}:`, error);
      return false;
    }
  }

  // Questionnaire Pages Implementation

  async getQuestionnairePage(pageId: number): Promise<QuestionnairePage | undefined> {
    try {
      const [page] = await db
        .select()
        .from(questionnairePages)
        .where(eq(questionnairePages.id, pageId));
      
      return page;
    } catch (error) {
      console.error(`Error fetching questionnaire page ${pageId}:`, error);
      return undefined;
    }
  }

  async getQuestionnairePagesByDefinition(definitionId: number): Promise<QuestionnairePage[]> {
    try {
      return await db
        .select()
        .from(questionnairePages)
        .where(eq(questionnairePages.definitionId, definitionId))
        .orderBy(questionnairePages.order);
    } catch (error) {
      console.error(`Error fetching questionnaire pages for definition ${definitionId}:`, error);
      return [];
    }
  }

  async createQuestionnairePage(page: InsertQuestionnairePage): Promise<QuestionnairePage> {
    try {
      const [newPage] = await db
        .insert(questionnairePages)
        .values(page)
        .returning();
      
      return newPage;
    } catch (error) {
      console.error('Error creating questionnaire page:', error);
      throw error;
    }
  }

  async updateQuestionnairePage(pageId: number, pageData: Partial<QuestionnairePage>): Promise<QuestionnairePage | undefined> {
    try {
      const [updatedPage] = await db
        .update(questionnairePages)
        .set({ ...pageData, updatedAt: new Date() })
        .where(eq(questionnairePages.id, pageId))
        .returning();
      
      return updatedPage;
    } catch (error) {
      console.error(`Error updating questionnaire page ${pageId}:`, error);
      return undefined;
    }
  }

  async deleteQuestionnairePage(pageId: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete questionnaire page ID: ${pageId}`);
      
      // Execute direct SQL delete statements
      await db.execute(sql`
        -- First delete question options for all questions in this page
        DELETE FROM questionnaire_question_options 
        WHERE question_id IN (
          SELECT id FROM questionnaire_questions WHERE page_id = ${pageId}
        );
        
        -- Delete matrix columns for all questions in this page
        DELETE FROM questionnaire_matrix_columns
        WHERE question_id IN (
          SELECT id FROM questionnaire_questions WHERE page_id = ${pageId}
        );
        
        -- Delete all questions for this page
        DELETE FROM questionnaire_questions
        WHERE page_id = ${pageId};
        
        -- Finally delete the page itself
        DELETE FROM questionnaire_pages
        WHERE id = ${pageId};
      `);
      
      console.log(`Successfully deleted page ${pageId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting questionnaire page ${pageId}:`, error);
      return false;
    }
  }

  async reorderQuestionnairePages(definitionId: number, pageIds: number[]): Promise<QuestionnairePage[]> {
    // Using a transaction to ensure all updates are atomic
    try {
      // Start transaction
      const updatedPages: QuestionnairePage[] = [];
      
      await db.transaction(async (tx) => {
        // For each pageId in the array, update its order based on its position in the array
        for (let i = 0; i < pageIds.length; i++) {
          const pageId = pageIds[i];
          
          const [updatedPage] = await tx
            .update(questionnairePages)
            .set({ 
              order: i,
              updatedAt: new Date()
            })
            .where(and(
              eq(questionnairePages.id, pageId),
              eq(questionnairePages.definitionId, definitionId)
            ))
            .returning();
          
          if (updatedPage) {
            updatedPages.push(updatedPage);
          }
        }
      });
      
      // Return the updated pages in their new order
      return updatedPages.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error(`Error reordering questionnaire pages for definition ${definitionId}:`, error);
      throw error;
    }
  }
  
  // Questionnaire Questions Implementation
  
  async getQuestionnaireQuestion(questionId: number): Promise<QuestionnaireQuestion | undefined> {
    try {
      const [question] = await db
        .select()
        .from(questionnaireQuestions)
        .where(eq(questionnaireQuestions.id, questionId));
      
      return question;
    } catch (error) {
      console.error(`Error fetching questionnaire question ${questionId}:`, error);
      return undefined;
    }
  }
  
  async getQuestionnaireQuestionsByPage(pageId: number): Promise<QuestionnaireQuestion[]> {
    try {
      return await db
        .select()
        .from(questionnaireQuestions)
        .where(eq(questionnaireQuestions.pageId, pageId))
        .orderBy(questionnaireQuestions.order);
    } catch (error) {
      console.error(`Error fetching questionnaire questions for page ${pageId}:`, error);
      return [];
    }
  }
  
  async createQuestionnaireQuestion(question: InsertQuestionnaireQuestion): Promise<QuestionnaireQuestion> {
    try {
      const [newQuestion] = await db
        .insert(questionnaireQuestions)
        .values(question)
        .returning();
      
      return newQuestion;
    } catch (error) {
      console.error('Error creating questionnaire question:', error);
      throw error;
    }
  }
  
  async updateQuestionnaireQuestion(questionId: number, questionData: Partial<QuestionnaireQuestion>): Promise<QuestionnaireQuestion | undefined> {
    try {
      const [updatedQuestion] = await db
        .update(questionnaireQuestions)
        .set({ ...questionData, updatedAt: new Date() })
        .where(eq(questionnaireQuestions.id, questionId))
        .returning();
      
      return updatedQuestion;
    } catch (error) {
      console.error(`Error updating questionnaire question ${questionId}:`, error);
      return undefined;
    }
  }
  
  async deleteQuestionnaireQuestion(questionId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(questionnaireQuestions)
        .where(eq(questionnaireQuestions.id, questionId));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting questionnaire question ${questionId}:`, error);
      return false;
    }
  }
  
  async reorderQuestionnaireQuestions(pageId: number, questionIds: number[]): Promise<QuestionnaireQuestion[]> {
    try {
      // Using a transaction to ensure all updates are atomic
      const updatedQuestions: QuestionnaireQuestion[] = [];
      
      await db.transaction(async (tx) => {
        // For each questionId in the array, update its order based on its position in the array
        for (let i = 0; i < questionIds.length; i++) {
          const questionId = questionIds[i];
          
          const [updatedQuestion] = await tx
            .update(questionnaireQuestions)
            .set({ 
              order: i,
              updatedAt: new Date()
            })
            .where(and(
              eq(questionnaireQuestions.id, questionId),
              eq(questionnaireQuestions.pageId, pageId)
            ))
            .returning();
          
          if (updatedQuestion) {
            updatedQuestions.push(updatedQuestion);
          }
        }
      });
      
      // Return the updated questions in their new order
      return updatedQuestions.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error(`Error reordering questionnaire questions for page ${pageId}:`, error);
      throw error;
    }
  }
  
  // Questionnaire Options Implementation
  
  async getQuestionnaireQuestionOptions(questionId: number): Promise<QuestionnaireQuestionOption[]> {
    try {
      return await db
        .select()
        .from(questionnaireQuestionOptions)
        .where(eq(questionnaireQuestionOptions.questionId, questionId))
        .orderBy(questionnaireQuestionOptions.order);
    } catch (error) {
      console.error(`Error fetching options for question ${questionId}:`, error);
      return [];
    }
  }
  
  async createQuestionnaireQuestionOption(option: InsertQuestionnaireQuestionOption): Promise<QuestionnaireQuestionOption> {
    try {
      const [newOption] = await db
        .insert(questionnaireQuestionOptions)
        .values(option)
        .returning();
      
      return newOption;
    } catch (error) {
      console.error('Error creating questionnaire question option:', error);
      throw error;
    }
  }
  
  async updateQuestionnaireQuestionOption(optionId: number, optionData: Partial<QuestionnaireQuestionOption>): Promise<QuestionnaireQuestionOption | undefined> {
    try {
      const [updatedOption] = await db
        .update(questionnaireQuestionOptions)
        .set({ ...optionData, updatedAt: new Date() })
        .where(eq(questionnaireQuestionOptions.id, optionId))
        .returning();
      
      return updatedOption;
    } catch (error) {
      console.error(`Error updating questionnaire question option ${optionId}:`, error);
      return undefined;
    }
  }
  
  async deleteQuestionnaireQuestionOption(optionId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(questionnaireQuestionOptions)
        .where(eq(questionnaireQuestionOptions.id, optionId));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting questionnaire question option ${optionId}:`, error);
      return false;
    }
  }
  
  // Methods for Questionnaire Conditional Logic
  async getConditionalLogicRule(ruleId: number): Promise<QuestionnaireConditionalLogic | undefined> {
    try {
      const [rule] = await db
        .select()
        .from(questionnaireConditionalLogic)
        .where(eq(questionnaireConditionalLogic.id, ruleId));
      
      return rule;
    } catch (error) {
      console.error(`Error fetching conditional logic rule ${ruleId}:`, error);
      return undefined;
    }
  }
  
  async getConditionalLogicRulesByDefinition(definitionId: number): Promise<QuestionnaireConditionalLogic[]> {
    try {
      return await db
        .select()
        .from(questionnaireConditionalLogic)
        .where(eq(questionnaireConditionalLogic.definitionId, definitionId));
    } catch (error) {
      console.error(`Error fetching conditional logic rules for definition ${definitionId}:`, error);
      return [];
    }
  }
  
  async createConditionalLogicRule(rule: InsertQuestionnaireConditionalLogic): Promise<QuestionnaireConditionalLogic> {
    try {
      const [newRule] = await db
        .insert(questionnaireConditionalLogic)
        .values(rule)
        .returning();
      
      return newRule;
    } catch (error) {
      console.error('Error creating conditional logic rule:', error);
      throw error;
    }
  }
  
  async updateConditionalLogicRule(ruleId: number, rule: Partial<QuestionnaireConditionalLogic>): Promise<QuestionnaireConditionalLogic | undefined> {
    try {
      const [updatedRule] = await db
        .update(questionnaireConditionalLogic)
        .set({ ...rule, updatedAt: new Date() })
        .where(eq(questionnaireConditionalLogic.id, ruleId))
        .returning();
      
      return updatedRule;
    } catch (error) {
      console.error(`Error updating conditional logic rule ${ruleId}:`, error);
      return undefined;
    }
  }
  
  async deleteConditionalLogicRule(ruleId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(questionnaireConditionalLogic)
        .where(eq(questionnaireConditionalLogic.id, ruleId));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting conditional logic rule ${ruleId}:`, error);
      return false;
    }
  }
  
  async questionKeyExistsInDefinition(definitionId: number, questionKey: string): Promise<boolean> {
    try {
      // Get all pages that belong to this definition
      const pages = await this.getQuestionnairePagesByDefinition(definitionId);
      
      if (pages.length === 0) {
        return false;
      }
      
      const pageIds = pages.map(page => page.id);
      
      // Find questions with this key in any of these pages
      const [question] = await db
        .select()
        .from(questionnaireQuestions)
        .where(
          and(
            inArray(questionnaireQuestions.pageId, pageIds),
            eq(questionnaireQuestions.questionKey, questionKey)
          )
        )
        .limit(1);
      
      return !!question;
    } catch (error) {
      console.error(`Error checking if question key "${questionKey}" exists in definition ${definitionId}:`, error);
      return false;
    }
  }
  
  // Public-facing questionnaire methods implementation
  async getActiveQuestionnaireDefinition(): Promise<QuestionnaireDefinition | undefined> {
    try {
      const [definition] = await db
        .select()
        .from(questionnaireDefinitions)
        .where(eq(questionnaireDefinitions.isActive, true))
        .limit(1);
      
      return definition;
    } catch (error) {
      console.error('Error fetching active questionnaire definition:', error);
      return undefined;
    }
  }
  
  async getPublicQuestionnaireStructure(definitionId: number): Promise<{
    definition: QuestionnaireDefinition;
    pages: {
      page: QuestionnairePage;
      questions: {
        question: QuestionnaireQuestion;
        options: QuestionnaireQuestionOption[];
        matrixColumns: QuestionnaireMatrixColumn[];
      }[];
    }[];
    conditionalLogic: QuestionnaireConditionalLogic[];
  } | undefined> {
    try {
      // Get the definition
      const definition = await this.getQuestionnaireDefinition(definitionId);
      if (!definition) {
        return undefined;
      }
      
      // Get all pages for this definition
      const pages = await this.getQuestionnairePagesByDefinition(definitionId);
      if (pages.length === 0) {
        // Return early with empty pages if none found
        return {
          definition,
          pages: [],
          conditionalLogic: []
        };
      }
      
      // Get conditional logic for this definition
      const conditionalLogic = await this.getConditionalLogicRulesByDefinition(definitionId);
      
      // Build a complete structure with pages and their questions
      const pagesWithQuestions = await Promise.all(pages.map(async (page) => {
        // Get questions for this page
        const questionsRaw = await db
          .select()
          .from(questionnaireQuestions)
          .where(eq(questionnaireQuestions.pageId, page.id))
          .orderBy(questionnaireQuestions.order);
        
        // For each question, get its options and matrix columns
        const questions = await Promise.all(questionsRaw.map(async (question) => {
          const options = await db
            .select()
            .from(questionnaireQuestionOptions)
            .where(eq(questionnaireQuestionOptions.questionId, question.id))
            .orderBy(questionnaireQuestionOptions.order);
          
          const matrixColumns = await db
            .select()
            .from(questionnaireMatrixColumns)
            .where(eq(questionnaireMatrixColumns.questionId, question.id))
            .orderBy(questionnaireMatrixColumns.order);
          
          return {
            question,
            options,
            matrixColumns
          };
        }));
        
        return {
          page,
          questions
        };
      }));
      
      // Return the complete structure
      return {
        definition,
        pages: pagesWithQuestions,
        conditionalLogic
      };
    } catch (error) {
      console.error(`Error fetching public questionnaire structure for definition ${definitionId}:`, error);
      return undefined;
    }
  }
  
  async submitQuestionnaireResponse(submission: InsertQuestionnaireSubmission): Promise<QuestionnaireSubmission> {
    try {
      // Current timestamp for submission
      const now = new Date();
      
      // Add submitted timestamp if the status is 'submitted'
      if (submission.status === 'submitted') {
        submission.submittedAt = now;
      }
      
      // If submittedData is not provided, initialize as empty object
      if (!submission.submittedData) {
        submission.submittedData = {};
      }
      
      // Insert the submission
      const [newSubmission] = await db
        .insert(questionnaireSubmissions)
        .values({
          ...submission,
          // Override any provided timestamps to ensure they're set server-side
          createdAt: now,
          updatedAt: now
        })
        .returning();
      
      return newSubmission;
    } catch (error) {
      console.error('Error submitting questionnaire response:', error);
      throw error;
    }
  }
}

// Export an instance of the DatabaseStorage
export const storage = new DatabaseStorage();