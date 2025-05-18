import type { Express, Request, Response } from "express";
import { z, ZodError } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  forms,
  formPages,
  insertFormSchema,
  insertFormPageSchema,
  reorderFormPagesSchema
} from "@shared/form-schema";

// Helper for error handling
const handleError = (err: any, res: Response) => {
  console.error('Error in form builder routes:', err);
  
  if (err instanceof ZodError) {
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: err.errors 
    });
  }
  
  return res.status(500).json({ 
    message: 'Internal server error',
    error: err.message || String(err)
  });
};

export const registerFormBuilderRoutes = (app: Express) => {
  // ==================== FORMS API ====================
  
  // Create a new form
  app.post('/api/form-builder/forms', async (req: Request, res: Response) => {
    try {
      const formData = insertFormSchema.parse(req.body);
      
      // Check if form key already exists
      const existingForm = await db
        .select({ id: forms.id })
        .from(forms)
        .where(eq(forms.formKey, formData.formKey))
        .limit(1);
      
      if (existingForm.length > 0) {
        return res.status(400).json({ message: `Form with key '${formData.formKey}' already exists` });
      }
      
      const [newForm] = await db.insert(forms).values(formData).returning();
      
      return res.status(201).json(newForm);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // List all forms with pagination
  app.get('/api/form-builder/forms', async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 25;
      const offset = (page - 1) * pageSize;
      const status = req.query.status as string | undefined;
      
      // Build query conditionally
      let query = db.select().from(forms);
      
      // Add status filter if provided
      if (status) {
        query = query.where(eq(forms.status, status));
      }
      
      // Add pagination
      query = query.limit(pageSize).offset(offset);
      
      const formsList = await query;
      
      // Get total count for pagination
      let count = 0;
      try {
        if (status) {
          // Use count with where clause
          const countResult = await db
            .select({ count: sql`count(*)` })
            .from(forms)
            .where(eq(forms.status, status));
          count = Number(countResult[0]?.count || 0);
        } else {
          // Use simple count query
          const countResult = await db
            .select({ count: sql`count(*)` })
            .from(forms);
          count = Number(countResult[0]?.count || 0);
        }
      } catch (err) {
        console.error('Error counting forms:', err);
        // In case of error, use array length as fallback
        count = formsList.length;
      }
      
      return res.status(200).json({
        data: formsList,
        pagination: {
          total: Number(count),
          page,
          pageSize,
          totalPages: Math.ceil(Number(count) / pageSize)
        }
      });
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Get a single form by ID
  app.get('/api/form-builder/forms/:id', async (req: Request, res: Response) => {
    try {
      const formId = Number(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: 'Invalid form ID' });
      }
      
      const [form] = await db
        .select()
        .from(forms)
        .where(eq(forms.id, formId))
        .limit(1);
      
      if (!form) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      return res.status(200).json(form);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Update a form
  app.put('/api/form-builder/forms/:id', async (req: Request, res: Response) => {
    try {
      const formId = Number(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: 'Invalid form ID' });
      }
      
      // Get the existing form
      const [existingForm] = await db
        .select()
        .from(forms)
        .where(eq(forms.id, formId))
        .limit(1);
      
      if (!existingForm) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      // For published forms, we might want to create a new version instead of updating
      // But here we'll just update it for simplicity
      const formData = insertFormSchema.parse(req.body);
      
      // Update the form
      const [updatedForm] = await db
        .update(forms)
        .set({
          ...formData,
          updatedAt: new Date()
        })
        .where(eq(forms.id, formId))
        .returning();
      
      return res.status(200).json(updatedForm);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Delete a form
  app.delete('/api/form-builder/forms/:id', async (req: Request, res: Response) => {
    try {
      const formId = Number(req.params.id);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: 'Invalid form ID' });
      }
      
      // Get the existing form
      const [existingForm] = await db
        .select()
        .from(forms)
        .where(eq(forms.id, formId))
        .limit(1);
      
      if (!existingForm) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      // Delete the form (will cascade to pages due to foreign key constraint)
      await db
        .delete(forms)
        .where(eq(forms.id, formId));
      
      return res.status(200).json({ 
        message: 'Form deleted successfully', 
        id: formId 
      });
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // ==================== FORM PAGES API ====================
  
  // Create a new page for a form
  app.post('/api/form-builder/forms/:formId/pages', async (req: Request, res: Response) => {
    try {
      const formId = Number(req.params.formId);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: 'Invalid form ID' });
      }
      
      // Check if form exists
      const [existingForm] = await db
        .select({ id: forms.id })
        .from(forms)
        .where(eq(forms.id, formId))
        .limit(1);
      
      if (!existingForm) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      const pageData = insertFormPageSchema.parse({
        ...req.body,
        formId: formId
      });
      
      const [newPage] = await db.insert(formPages).values(pageData).returning();
      
      return res.status(201).json(newPage);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // List all pages for a form
  app.get('/api/form-builder/forms/:formId/pages', async (req: Request, res: Response) => {
    try {
      const formId = Number(req.params.formId);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: 'Invalid form ID' });
      }
      
      // Check if form exists
      const [existingForm] = await db
        .select({ id: forms.id })
        .from(forms)
        .where(eq(forms.id, formId))
        .limit(1);
      
      if (!existingForm) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      // Get all pages for the form ordered by pageOrder
      const pagesList = await db
        .select()
        .from(formPages)
        .where(eq(formPages.formId, formId))
        .orderBy(formPages.pageOrder);
      
      return res.status(200).json(pagesList);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Update a page
  app.put('/api/form-builder/forms/:formId/pages/:pageId', async (req: Request, res: Response) => {
    try {
      const formId = Number(req.params.formId);
      const pageId = Number(req.params.pageId);
      
      if (isNaN(formId) || isNaN(pageId)) {
        return res.status(400).json({ message: 'Invalid ID parameters' });
      }
      
      // Check if page exists and belongs to the form
      const [existingPage] = await db
        .select()
        .from(formPages)
        .where(and(
          eq(formPages.id, pageId),
          eq(formPages.formId, formId)
        ))
        .limit(1);
      
      if (!existingPage) {
        return res.status(404).json({ message: 'Page not found or does not belong to the specified form' });
      }
      
      const pageData = insertFormPageSchema.parse({
        ...req.body,
        formId: formId
      });
      
      const [updatedPage] = await db
        .update(formPages)
        .set({
          ...pageData,
          updatedAt: new Date()
        })
        .where(eq(formPages.id, pageId))
        .returning();
      
      return res.status(200).json(updatedPage);
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Delete a page
  app.delete('/api/form-builder/forms/:formId/pages/:pageId', async (req: Request, res: Response) => {
    try {
      const formId = Number(req.params.formId);
      const pageId = Number(req.params.pageId);
      
      if (isNaN(formId) || isNaN(pageId)) {
        return res.status(400).json({ message: 'Invalid ID parameters' });
      }
      
      // Check if page exists and belongs to the form
      const [existingPage] = await db
        .select()
        .from(formPages)
        .where(and(
          eq(formPages.id, pageId),
          eq(formPages.formId, formId)
        ))
        .limit(1);
      
      if (!existingPage) {
        return res.status(404).json({ message: 'Page not found or does not belong to the specified form' });
      }
      
      // Delete the page
      await db
        .delete(formPages)
        .where(eq(formPages.id, pageId));
      
      return res.status(200).json({ 
        message: 'Page deleted successfully', 
        id: pageId 
      });
    } catch (err) {
      return handleError(err, res);
    }
  });
  
  // Reorder pages
  app.post('/api/form-builder/forms/:formId/pages/reorder', async (req: Request, res: Response) => {
    try {
      const formId = Number(req.params.formId);
      
      if (isNaN(formId)) {
        return res.status(400).json({ message: 'Invalid form ID' });
      }
      
      // Check if form exists
      const [existingForm] = await db
        .select({ id: forms.id })
        .from(forms)
        .where(eq(forms.id, formId))
        .limit(1);
      
      if (!existingForm) {
        return res.status(404).json({ message: 'Form not found' });
      }
      
      const reorderData = reorderFormPagesSchema.parse(req.body);
      
      // Validate that all pages exist and belong to the form
      for (const item of reorderData) {
        const [page] = await db
          .select({ id: formPages.id })
          .from(formPages)
          .where(and(
            eq(formPages.id, item.pageId),
            eq(formPages.formId, formId)
          ))
          .limit(1);
        
        if (!page) {
          return res.status(400).json({ 
            message: `Page with ID ${item.pageId} not found or does not belong to form ${formId}` 
          });
        }
      }
      
      // Update page orders in a transaction
      for (const item of reorderData) {
        await db
          .update(formPages)
          .set({ 
            pageOrder: item.newPageOrder,
            updatedAt: new Date()
          })
          .where(eq(formPages.id, item.pageId));
      }
      
      return res.status(200).json({ 
        message: 'Pages reordered successfully',
        updates: reorderData
      });
    } catch (err) {
      return handleError(err, res);
    }
  });
};