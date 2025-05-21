console.log("--- formBuilderRoutes.ts loaded ---"); // First line to verify this file is loaded

import { Router } from "express";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import * as formSchema from "@shared/form-schema";

// Create router
const router = Router();

// --- FORM DEFINITIONS API ---

// Create a new form
router.post("/forms", async (req, res) => {
  try {
    // Log the exact body received by the server
    console.log("SERVER /forms received body:", JSON.stringify(req.body, null, 2));

    const parsed = formSchema.insertFormSchema.safeParse(req.body);
    
    if (!parsed.success) {
      // Log the detailed Zod error to the server console
      console.error("SERVER ZOD VALIDATION ERROR for /forms:", JSON.stringify(parsed.error.format(), null, 2));
      return res.status(400).json({ message: "Invalid form data", errors: parsed.error.format() });
    }
    
    const [newForm] = await db.insert(formSchema.forms)
      .values(parsed.data)
      .returning();
      
    return res.status(201).json(newForm);
  } catch (error) {
    console.error("Error creating form in /forms route:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown server error";
    return res.status(500).json({ message: "Failed to create form", errorDetail: errorMessage });
  }
});

// List all forms
router.get("/forms", async (req, res) => {
  try {
    const { status, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    let query = db.select().from(formSchema.forms);
    
    // Filter by status if provided
    if (status) {
      query = query.where(eq(formSchema.forms.status, status as string));
    }
    
    // Add pagination
    query = query.limit(limitNum).offset(offset).orderBy(desc(formSchema.forms.updatedAt));
    
    const forms = await query;
    const totalCount = await db.select({ count: sql<number>`count(*)` })
      .from(formSchema.forms)
      .then(result => result[0].count);
    
    return res.json({
      data: forms,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error("Error listing forms:", error);
    return res.status(500).json({ message: "Failed to list forms" });
  }
});

// Get a single form by ID
router.get("/forms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }
    
    const [form] = await db.select().from(formSchema.forms).where(eq(formSchema.forms.id, id));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    return res.json(form);
  } catch (error) {
    console.error("Error getting form:", error);
    return res.status(500).json({ message: "Failed to get form" });
  }
});

// Get a form with its pages and questions
router.get("/forms/:formId", async (req, res) => {
  const formId = parseInt(req.params.formId);
  if (isNaN(formId)) {
    return res.status(400).json({ message: "Invalid form ID" });
  }

  try {
    const form = await db.query.forms.findFirst({
      where: eq(formSchema.forms.id, formId),
    });

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    const pages = await db.query.formPages.findMany({
      where: eq(formSchema.formPages.formId, formId),
      orderBy: [asc(formSchema.formPages.pageOrder)],
    });

    // Add this log: Check what pages were fetched
    console.log('Backend: Fetched pages:', pages);

    const pageQuestionData = await db.query.pageQuestions.findMany({
      where: inArray(formSchema.pageQuestions.pageId, pages.map(p => p.id)),
      orderBy: [asc(formSchema.pageQuestions.displayOrder)],
      with: {
        questionLibraryQuestion: true
      }
    });

    // Add this log: Check what page questions were fetched BEFORE filtering/mapping
    console.log('Backend: Fetched page questions (before structuring):', pageQuestionData);

    const formWithPagesAndQuestions = {
      ...form,
      pages: pages.map(page => {
        const questionsForPage = pageQuestionData.filter(pq => pq.pageId === page.id);
        return {
          ...page,
          questions: questionsForPage
        };
      })
    };

    // Add this log: Check the final structured data being sent
    console.log('Backend: Structured form data (before sending):', formWithPagesAndQuestions);

    return res.json(formWithPagesAndQuestions);
  } catch (error) {
    console.error('Error fetching form with pages and questions:', error);
    return res.status(500).json({ message: "Failed to get form with pages and questions" });
  }
});

// Get a form by key and version
router.get("/forms/key/:formKey/version/:version", async (req, res) => {
  try {
    const formKey = req.params.formKey;
    const version = parseInt(req.params.version);
    
    if (isNaN(version)) {
      return res.status(400).json({ message: "Invalid version" });
    }
    
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(and(
        eq(formSchema.forms.formKey, formKey),
        eq(formSchema.forms.version, version)
      ));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    return res.json(form);
  } catch (error) {
    console.error("Error getting form by key and version:", error);
    return res.status(500).json({ message: "Failed to get form" });
  }
});

// Update a form
router.put("/forms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }
    
    // Get the existing form
    const [existingForm] = await db.select()
      .from(formSchema.forms)
      .where(eq(formSchema.forms.id, id));
    
    if (!existingForm) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // Check for published status to handle versioning
    if (existingForm.status === "published" && req.body.status !== "published") {
      // If form is being unpublished, just update it
      const parsed = formSchema.insertFormSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid form data", errors: parsed.error.format() });
      }
      
      const [updatedForm] = await db.update(formSchema.forms)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(formSchema.forms.id, id))
        .returning();
      
      return res.json(updatedForm);
    } else if (existingForm.status !== "published" && req.body.status === "published") {
      // If form is being published for the first time or after being unpublished
      const parsed = formSchema.insertFormSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid form data", errors: parsed.error.format() });
      }
      
      const [updatedForm] = await db.update(formSchema.forms)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(formSchema.forms.id, id))
        .returning();
      
      return res.json(updatedForm);
    } else {
      // If form status is unchanged
      const parsed = formSchema.insertFormSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid form data", errors: parsed.error.format() });
      }
      
      const [updatedForm] = await db.update(formSchema.forms)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(formSchema.forms.id, id))
        .returning();
      
      return res.json(updatedForm);
    }
  } catch (error) {
    console.error("Error updating form:", error);
    return res.status(500).json({ message: "Failed to update form" });
  }
});

// Delete a form
router.delete("/forms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }
    
    // Check if the form exists
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(eq(formSchema.forms.id, id));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // Check if the form has submissions
    const submissions = await db.select()
      .from(formSchema.formSubmissions)
      .where(eq(formSchema.formSubmissions.formId, id))
      .limit(1);
    
    if (submissions.length > 0) {
      return res.status(409).json({ 
        message: "Cannot delete a form that has submissions. Consider changing its status to 'archived' instead."
      });
    }
    
    // Delete the form
    await db.delete(formSchema.forms).where(eq(formSchema.forms.id, id));
    
    return res.json({ success: true, message: "Form deleted successfully" });
  } catch (error) {
    console.error("Error deleting form:", error);
    return res.status(500).json({ message: "Failed to delete form" });
  }
});

// --- FORM PAGES API ---

// Create a new page
router.post("/forms/:formId/pages", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    
    if (isNaN(formId)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }
    
    // Log the exact body received by the server
    console.log(`SERVER /forms/${formId}/pages received body:`, JSON.stringify(req.body, null, 2));
    
    // Check if the form exists
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(eq(formSchema.forms.id, formId));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // Parse and validate request body
    const pageSchema = formSchema.insertFormPageSchema.extend({
      formId: z.number().int().positive(),
    });
    
    const parsed = pageSchema.safeParse({ ...req.body, formId });
    
    if (!parsed.success) {
      // Log the detailed Zod error
      console.error(`SERVER ZOD VALIDATION ERROR for /forms/${formId}/pages:`, JSON.stringify(parsed.error.format(), null, 2));
      return res.status(400).json({ message: "Invalid page data", errors: parsed.error.format() });
    }
    
    // Create the page
    const [newPage] = await db.insert(formSchema.formPages)
      .values(parsed.data)
      .returning();
      
    console.log(`SERVER: Created new page for form ${formId}:`, JSON.stringify(newPage, null, 2));
    return res.status(201).json(newPage);
  } catch (error) {
    console.error("Error creating page:", error);
    return res.status(500).json({ message: "Failed to create page" });
  }
});

// List all pages for a form
router.get("/forms/:formId/pages", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    
    if (isNaN(formId)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }
    
    // Check if the form exists
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(eq(formSchema.forms.id, formId));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // Get all pages for this form, ordered by pageOrder
    const pages = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.formId, formId))
      .orderBy(formSchema.formPages.pageOrder);
      
    console.log(`SERVER: Listing pages for form ${formId}:`, JSON.stringify(pages, null, 2));
    return res.json(pages);
  } catch (error) {
    console.error("Error listing pages:", error);
    return res.status(500).json({ message: "Failed to list pages" });
  }
});

// Update a page
router.put("/forms/:formId/pages/:pageId", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    const pageId = parseInt(req.params.pageId);
    
    if (isNaN(formId) || isNaN(pageId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // Check if the page exists and belongs to the form
    const [page] = await db.select()
      .from(formSchema.formPages)
      .where(and(
        eq(formSchema.formPages.id, pageId),
        eq(formSchema.formPages.formId, formId)
      ));
    
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }
    
    // Parse and validate request body
    const parsed = formSchema.insertFormPageSchema.partial().safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid page data", errors: parsed.error.format() });
    }
    
    // Update the page
    const [updatedPage] = await db.update(formSchema.formPages)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(formSchema.formPages.id, pageId))
      .returning();
      
    return res.json(updatedPage);
  } catch (error) {
    console.error("Error updating page:", error);
    return res.status(500).json({ message: "Failed to update page" });
  }
});

// Delete a page
router.delete("/forms/:formId/pages/:pageId", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    const pageId = parseInt(req.params.pageId);
    
    if (isNaN(formId) || isNaN(pageId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // Check if the page exists and belongs to the form
    const [page] = await db.select()
      .from(formSchema.formPages)
      .where(and(
        eq(formSchema.formPages.id, pageId),
        eq(formSchema.formPages.formId, formId)
      ));
    
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }
    
    // Delete the page (cascade will handle related questions)
    await db.delete(formSchema.formPages).where(eq(formSchema.formPages.id, pageId));
    
    return res.json({ success: true, message: "Page deleted successfully" });
  } catch (error) {
    console.error("Error deleting page:", error);
    return res.status(500).json({ message: "Failed to delete page" });
  }
});

// Reorder pages
router.post("/forms/:formId/pages/reorder", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    
    if (isNaN(formId)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }
    
    // Check if the form exists
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(eq(formSchema.forms.id, formId));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // Validate request body
    const reorderSchema = z.array(z.object({
      pageId: z.number().int().positive(),
      newPageOrder: z.number().int().nonnegative()
    }));
    
    const parsed = reorderSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid reorder data", errors: parsed.error.format() });
    }
    
    // Use a single transaction to handle all the updates atomically
    // This approach ensures all updates happen together, preventing constraints violations
    await db.transaction(async (tx) => {
      // First, shift all pages to negative page orders to avoid conflicts
      await tx.execute(sql`
        UPDATE form_pages 
        SET page_order = -page_order - 1000
        WHERE form_id = ${formId}
      `);
      
      // Now apply the new order
      for (const item of parsed.data) {
        await tx.execute(sql`
          UPDATE form_pages 
          SET page_order = ${item.newPageOrder}, updated_at = NOW()
          WHERE id = ${item.pageId} AND form_id = ${formId}
        `);
      }
    });
    
    // Get the updated pages
    const updatedPages = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.formId, formId))
      .orderBy(formSchema.formPages.pageOrder);
      
    return res.json({
      success: true,
      message: "Pages reordered successfully",
      pages: updatedPages
    });
  } catch (error) {
    console.error("Error reordering pages:", error);
    return res.status(500).json({ message: "Failed to reorder pages" });
  }
});

// --- FORM PAGE QUESTIONS API ---

// Add a question to a page
router.post("/pages/:pageId/questions", async (req, res) => {
  try {
    const pageId = parseInt(req.params.pageId);
    
    if (isNaN(pageId)) {
      return res.status(400).json({ message: "Invalid page ID" });
    }
    
    // Check if the page exists
    const [page] = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.id, pageId));
    
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }
    
    // Check if the library question exists
    const libraryQuestionId = req.body.libraryQuestionId || req.body.library_question_id;
    
    // Log incoming question data for debugging
    console.log("SERVER: Adding question to page, received data:", JSON.stringify(req.body, null, 2));
    console.log("SERVER: Using libraryQuestionId:", libraryQuestionId);
    
    if (!libraryQuestionId) {
      return res.status(400).json({ message: "Missing library question ID" });
    }
    
    const [libraryQuestion] = await db.select()
      .from(formSchema.questionLibrary)
      .where(eq(formSchema.questionLibrary.id, libraryQuestionId));
    
    if (!libraryQuestion) {
      return res.status(404).json({ message: `Library question not found with ID: ${libraryQuestionId}` });
    }
    
    // Get the existing questions to calculate the next display order
    const existingQuestions = await db.select()
      .from(formSchema.formPageQuestions)
      .where(eq(formSchema.formPageQuestions.formPageId, pageId))
      .orderBy(formSchema.formPageQuestions.displayOrder);
    
    console.log(`SERVER: Found ${existingQuestions.length} existing questions on page ${pageId}`);
    
    // Calculate the next available display order
    let nextDisplayOrder = 1; // Default if no questions exist
    
    if (existingQuestions.length > 0) {
      const maxOrder = Math.max(...existingQuestions.map(q => q.displayOrder));
      nextDisplayOrder = maxOrder + 1;
    }
    
    console.log(`SERVER: Using display order ${nextDisplayOrder} for new question`);
    
    // Transform request body with careful handling for booleans
    const getBooleanOverride = (camelCaseKey: string, snakeCaseKey: string, defaultValue: boolean | null = null): boolean | null => {
        if (req.body[camelCaseKey] !== undefined && req.body[camelCaseKey] !== null) {
            return Boolean(req.body[camelCaseKey]);
        }
        if (req.body[snakeCaseKey] !== undefined && req.body[snakeCaseKey] !== null) {
            return Boolean(req.body[snakeCaseKey]);
        }
        return defaultValue; // Return explicit null if not provided and no default, or the default
    };

    const transformedBody = {
      formPageId: pageId,
      libraryQuestionId: libraryQuestionId,
      displayOrder: nextDisplayOrder,
      displayTextOverride: req.body.displayTextOverride || req.body.display_text_override || null,
      // Explicitly handle boolean conversion or allow null if schema supports it
      isRequiredOverride: getBooleanOverride('isRequiredOverride', 'is_required_override', null),
      isHiddenOverride: getBooleanOverride('isHiddenOverride', 'is_hidden_override', null),
      helperTextOverride: req.body.helperTextOverride || req.body.helper_text_override || null,
      placeholderOverride: req.body.placeholderOverride || req.body.placeholder_override || null,
      metadataOverrides: req.body.metadataOverrides || req.body.metadata_overrides || {},
      optionsOverrides: req.body.optionsOverrides || req.body.options_overrides || []
    };
    
    console.log("SERVER: Transformed question data for DB:", JSON.stringify(transformedBody, null, 2));

    // Parse and validate request body with explicit handling for nullable booleans
    const questionSchema = formSchema.insertFormPageQuestionSchema.extend({
      formPageId: z.number().int().positive(),
      // Make boolean overrides explicitly optional and nullable if your DB allows it
      isRequiredOverride: z.boolean().nullable().optional(),
      isHiddenOverride: z.boolean().nullable().optional(),
    });
    
    const parsed = questionSchema.safeParse(transformedBody);
    
    if (!parsed.success) {
      console.error("SERVER: Validation error adding question to page:", JSON.stringify(parsed.error.format(), null, 2));
      return res.status(400).json({ message: "Invalid question data for instance", errors: parsed.error.format() });
    }
    
    // Create the question
    const [newQuestionInstance] = await db.insert(formSchema.formPageQuestions)
      .values(parsed.data)
      .returning();
      
    // Fetch the fully resolved question to return to the client
    const [resolvedNewQuestion] = await db
      .select({
        pageQuestionId: formSchema.formPageQuestions.id,
        formPageId: formSchema.formPageQuestions.formPageId,
        displayOrder: formSchema.formPageQuestions.displayOrder,
        displayTextOverride: formSchema.formPageQuestions.displayTextOverride,
        isRequiredOverride: formSchema.formPageQuestions.isRequiredOverride,
        isHiddenOverride: formSchema.formPageQuestions.isHiddenOverride,
        placeholderOverride: formSchema.formPageQuestions.placeholderOverride,
        helperTextOverride: formSchema.formPageQuestions.helperTextOverride,
        metadataOverrides: formSchema.formPageQuestions.metadataOverrides,
        optionsOverrides: formSchema.formPageQuestions.optionsOverrides,
        libraryQuestionId: formSchema.questionLibrary.id,
        questionType: formSchema.questionLibrary.questionType,
        libraryDefaultText: formSchema.questionLibrary.defaultText,
        libraryDefaultMetadata: formSchema.questionLibrary.defaultMetadata,
        libraryDefaultOptions: formSchema.questionLibrary.defaultOptions,
      })
      .from(formSchema.formPageQuestions)
      .innerJoin(
        formSchema.questionLibrary,
        eq(formSchema.formPageQuestions.libraryQuestionId, formSchema.questionLibrary.id)
      )
      .where(eq(formSchema.formPageQuestions.id, newQuestionInstance.id));

    if (!resolvedNewQuestion) {
      // Handle error: newly inserted question not found (should not happen)
      return res.status(500).json({ message: "Error retrieving newly added question" });
    }
    
    // Construct the final object with combined data from library and overrides
    const finalQuestionObject = {
      id: resolvedNewQuestion.pageQuestionId,
      formPageId: resolvedNewQuestion.formPageId,
      libraryQuestionId: resolvedNewQuestion.libraryQuestionId,
      displayOrder: resolvedNewQuestion.displayOrder,
      questionType: resolvedNewQuestion.questionType,
      displayText: resolvedNewQuestion.displayTextOverride ?? resolvedNewQuestion.libraryDefaultText,
      isRequired: resolvedNewQuestion.isRequiredOverride ?? (resolvedNewQuestion.libraryDefaultMetadata?.isRequired ?? false),
      isHidden: resolvedNewQuestion.isHiddenOverride ?? (resolvedNewQuestion.libraryDefaultMetadata?.isHidden ?? false),
      placeholder: resolvedNewQuestion.placeholderOverride ?? (resolvedNewQuestion.libraryDefaultMetadata?.placeholder ?? ""),
      helperText: resolvedNewQuestion.helperTextOverride ?? (resolvedNewQuestion.libraryDefaultMetadata?.helperText ?? ""),
      metadata: { ...(resolvedNewQuestion.libraryDefaultMetadata || {}), ...(resolvedNewQuestion.metadataOverrides || {}) },
      options: resolvedNewQuestion.optionsOverrides?.length ? resolvedNewQuestion.optionsOverrides : (resolvedNewQuestion.libraryDefaultOptions || []),
      // Include the raw overrides for the client's settings panel
      overrides: {
        displayTextOverride: resolvedNewQuestion.displayTextOverride,
        isRequiredOverride: resolvedNewQuestion.isRequiredOverride,
        isHiddenOverride: resolvedNewQuestion.isHiddenOverride,
        placeholderOverride: resolvedNewQuestion.placeholderOverride,
        helperTextOverride: resolvedNewQuestion.helperTextOverride,
        metadataOverrides: resolvedNewQuestion.metadataOverrides,
        optionsOverrides: resolvedNewQuestion.optionsOverrides,
      }
    };
    
    // Return the constructed question with 201 Created status
    return res.status(201).json(finalQuestionObject);
  } catch (error) {
    console.error("Error adding question:", error);
    return res.status(500).json({ message: "Failed to add question" });
  }
});

// List all questions for a page
router.get("/pages/:pageId/questions", async (req, res) => {
  console.log("--- GET /pages/:pageId/questions handler entered ---");
  console.log(`Backend: Received request for questions on page ID: ${req.params.pageId}`);
  
  try {
    const pageId = parseInt(req.params.pageId);
    
    if (isNaN(pageId)) {
      console.log(`Backend: Invalid page ID: ${req.params.pageId}`);
      return res.status(400).json({ message: "Invalid page ID" });
    }
    
    // Check if the page exists
    const [page] = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.id, pageId));
    
    console.log(`Backend: Page lookup result:`, page);
    
    if (!page) {
      console.log(`Backend: Page with ID ${pageId} not found`);
      return res.status(404).json({ message: "Page not found" });
    }
    
    console.log(`Backend: Found page ${pageId}, fetching questions...`);
    
    // Get all questions for this page, ordered by displayOrder
    // Join with question library to get the full question details
    const questions = await db.select({
      pageQuestionId: formSchema.formPageQuestions.id,
      formPageId: formSchema.formPageQuestions.formPageId,
      displayOrder: formSchema.formPageQuestions.displayOrder,
      displayTextOverride: formSchema.formPageQuestions.displayTextOverride,
      isRequiredOverride: formSchema.formPageQuestions.isRequiredOverride,
      isHiddenOverride: formSchema.formPageQuestions.isHiddenOverride,
      placeholderOverride: formSchema.formPageQuestions.placeholderOverride,
      helperTextOverride: formSchema.formPageQuestions.helperTextOverride,
      metadataOverrides: formSchema.formPageQuestions.metadataOverrides,
      optionsOverrides: formSchema.formPageQuestions.optionsOverrides,
      // Library question fields
      libraryQuestionId: formSchema.questionLibrary.id,
      questionType: formSchema.questionLibrary.questionType,
      libraryKey: formSchema.questionLibrary.libraryQuestionKey,
      libraryDefaultText: formSchema.questionLibrary.defaultText,
      libraryDefaultMetadata: formSchema.questionLibrary.defaultMetadata,
      libraryDefaultOptions: formSchema.questionLibrary.defaultOptions,
    })
    .from(formSchema.formPageQuestions)
    .innerJoin(
      formSchema.questionLibrary, 
      eq(formSchema.formPageQuestions.libraryQuestionId, formSchema.questionLibrary.id)
    )
    .where(eq(formSchema.formPageQuestions.formPageId, pageId))
    .orderBy(formSchema.formPageQuestions.displayOrder);
    
    // Process questions to resolve overrides
    console.log(`Backend: Raw questions data from DB:`, JSON.stringify(questions, null, 2));
    
    const resolvedQuestions = questions.map(q => {
      // Extract base metadata fields from the default metadata (if it exists)
      const baseMetadata = q.libraryDefaultMetadata || {};
      
      // Set defaults for common metadata fields
      const defaultIsRequired = baseMetadata.isRequired || false;
      const defaultIsHidden = baseMetadata.isHidden || false;
      const defaultPlaceholder = baseMetadata.placeholder || '';
      const defaultHelperText = baseMetadata.helperText || '';
      const defaultValidationRules = baseMetadata.validationRules || {};
      
      // Apply overrides if they exist
      return {
        id: q.pageQuestionId,
        formPageId: q.formPageId,
        libraryQuestionId: q.libraryQuestionId,
        displayOrder: q.displayOrder,
        questionType: q.questionType,
        displayText: q.displayTextOverride || q.libraryDefaultText || '',
        isRequired: q.isRequiredOverride !== null ? q.isRequiredOverride : defaultIsRequired,
        isHidden: q.isHiddenOverride !== null ? q.isHiddenOverride : defaultIsHidden, 
        placeholder: q.placeholderOverride || defaultPlaceholder,
        helperText: q.helperTextOverride || defaultHelperText,
        metadata: q.metadataOverrides && baseMetadata ? 
          { ...baseMetadata, ...q.metadataOverrides } : 
          (baseMetadata || q.metadataOverrides || {}),
        options: q.optionsOverrides && q.libraryDefaultOptions ? 
          { ...q.libraryDefaultOptions, ...q.optionsOverrides } : 
          (q.libraryDefaultOptions || q.optionsOverrides || {}),
        validationRules: defaultValidationRules,
        // Include the overrides for reference
        overrides: {
          displayTextOverride: q.displayTextOverride,
          isRequiredOverride: q.isRequiredOverride,
          isHiddenOverride: q.isHiddenOverride,
          placeholderOverride: q.placeholderOverride,
          helperTextOverride: q.helperTextOverride,
          metadataOverrides: q.metadataOverrides,
          optionsOverrides: q.optionsOverrides,
        }
      };
    });
    
    console.log(`Backend: Processed ${resolvedQuestions.length} questions for page ${req.params.pageId}`);
    console.log(`Backend: Fetched questions from DB for pageId: ${req.params.pageId}`);
      
    return res.json(resolvedQuestions);
  } catch (error) {
    console.error("Error listing questions:", error);
    return res.status(500).json({ message: "Failed to list questions" });
  }
});

// Update a question
router.put("/pages/:pageId/questions/:questionId", async (req, res) => {
  try {
    const pageId = parseInt(req.params.pageId);
    const questionId = parseInt(req.params.questionId);
    
    if (isNaN(pageId) || isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // Check if the question exists and belongs to the page
    const [question] = await db.select()
      .from(formSchema.formPageQuestions)
      .where(and(
        eq(formSchema.formPageQuestions.id, questionId),
        eq(formSchema.formPageQuestions.formPageId, pageId)
      ));
    
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    
    // Parse and validate request body
    const parsed = formSchema.insertFormPageQuestionSchema.partial().safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid question data", errors: parsed.error.format() });
    }
    
    // Update the question
    const [updatedQuestion] = await db.update(formSchema.formPageQuestions)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(formSchema.formPageQuestions.id, questionId))
      .returning();
      
    return res.json(updatedQuestion);
  } catch (error) {
    console.error("Error updating question:", error);
    return res.status(500).json({ message: "Failed to update question" });
  }
});

// Delete a question
router.delete("/pages/:pageId/questions/:questionId", async (req, res) => {
  try {
    const pageId = parseInt(req.params.pageId);
    const questionId = parseInt(req.params.questionId);
    
    if (isNaN(pageId) || isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // Check if the question exists and belongs to the page
    const [question] = await db.select()
      .from(formSchema.formPageQuestions)
      .where(and(
        eq(formSchema.formPageQuestions.id, questionId),
        eq(formSchema.formPageQuestions.formPageId, pageId)
      ));
    
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }
    
    // Delete the question
    await db.delete(formSchema.formPageQuestions)
      .where(eq(formSchema.formPageQuestions.id, questionId));
    
    return res.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return res.status(500).json({ message: "Failed to delete question" });
  }
});

// Reorder questions
router.post("/pages/:pageId/questions/reorder", async (req, res) => {
  try {
    const pageId = parseInt(req.params.pageId);
    
    if (isNaN(pageId)) {
      return res.status(400).json({ message: "Invalid page ID" });
    }
    
    // Check if the page exists
    const [page] = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.id, pageId));
    
    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }
    
    // Validate request body
    const reorderSchema = z.array(z.object({
      questionInstanceId: z.number().int().positive(),
      newDisplayOrder: z.number().int().nonnegative()
    }));
    
    const parsed = reorderSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid reorder data", errors: parsed.error.format() });
    }
    
    // Use a single transaction to handle all the updates atomically
    // This approach ensures all updates happen together, preventing constraints violations
    await db.transaction(async (tx) => {
      // First, shift all questions to negative display orders to avoid conflicts
      await tx.execute(sql`
        UPDATE form_page_questions 
        SET display_order = -display_order - 1000
        WHERE form_page_id = ${pageId}
      `);
      
      // Now apply the new order
      for (const item of parsed.data) {
        await tx.execute(sql`
          UPDATE form_page_questions 
          SET display_order = ${item.newDisplayOrder}, updated_at = NOW()
          WHERE id = ${item.questionInstanceId} AND form_page_id = ${pageId}
        `);
      }
    });
    
    // Get the updated questions
    const updatedQuestions = await db.select()
      .from(formSchema.formPageQuestions)
      .where(eq(formSchema.formPageQuestions.formPageId, pageId))
      .orderBy(formSchema.formPageQuestions.displayOrder);
      
    return res.json({
      success: true,
      message: "Questions reordered successfully",
      questions: updatedQuestions
    });
  } catch (error) {
    console.error("Error reordering questions:", error);
    return res.status(500).json({ message: "Failed to reorder questions" });
  }
});

// --- FORM SUBMISSION API ---

// Submit a completed form
// Handle form submissions
router.post("/forms/:formKey/versions/:versionNumber/submit", async (req, res) => {
  try {
    const formKey = req.params.formKey;
    const versionNumber = parseInt(req.params.versionNumber);
    const { responses, submitterInfo, clientId, opportunityId, rawLeadId } = req.body;
    
    if (isNaN(versionNumber)) {
      return res.status(400).json({ message: "Invalid version number" });
    }
    
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ message: "Invalid responses format. Expected object with question keys mapping to answers." });
    }
    
    // Get the form definition for validation
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(and(
        eq(formSchema.forms.formKey, formKey),
        eq(formSchema.forms.version, versionNumber)
      ));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // 1. Get the resolved form questions (similar to the render endpoint)
    const pages = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.formId, form.id))
      .orderBy(formSchema.formPages.pageOrder);
    
    // Map to track which rules apply to each question
    const questionRules = new Map();
    
    // Get all rules for this form to evaluate conditional logic
    const rules = await db.select()
      .from(formSchema.formRules)
      .where(eq(formSchema.formRules.formId, form.id));
      
    for (const rule of rules) {
      const targets = await db.select()
        .from(formSchema.formRuleTargets)
        .where(eq(formSchema.formRuleTargets.ruleId, rule.id));
        
      // Map targets to their questions
      for (const target of targets) {
        if (target.targetType === 'question') {
          if (!questionRules.has(target.targetId)) {
            questionRules.set(target.targetId, []);
          }
          questionRules.get(target.targetId).push({
            rule,
            target
          });
        }
      }
    }
    
    // Collect all questions from all pages and identify conditionally visible questions
    const resolvedQuestions = [];
    const questionIdToPage = new Map(); // For tracking which page a question belongs to
    const pageIdToQuestions = new Map(); // For tracking questions in each page
    
    for (const page of pages) {
      const pageQuestions = [];
      
      const questionInstances = await db.select()
        .from(formSchema.formPageQuestions)
        .where(eq(formSchema.formPageQuestions.formPageId, page.id))
        .orderBy(formSchema.formPageQuestions.displayOrder);
      
      for (const instance of questionInstances) {
        const [libraryQuestion] = await db.select()
          .from(formSchema.questionLibrary)
          .where(eq(formSchema.questionLibrary.id, instance.libraryQuestionId));
        
        if (!libraryQuestion) {
          console.error(`Library question ${instance.libraryQuestionId} not found for instance ${instance.id}`);
          continue;
        }
        
        // Create a resolved question object
        const resolvedQuestion = {
          questionInstanceId: instance.id,
          questionKey: `${page.id}_${instance.id}`, // Create a consistent key
          libraryQuestionId: libraryQuestion.id,
          libraryQuestionKey: libraryQuestion.libraryQuestionKey,
          questionType: libraryQuestion.questionType,
          displayText: instance.displayTextOverride || libraryQuestion.defaultText,
          isRequired: instance.isRequiredOverride !== null ? 
            instance.isRequiredOverride : 
            (libraryQuestion.defaultMetadata?.isRequired || false),
          isHidden: instance.isHiddenOverride !== null ? 
            instance.isHiddenOverride : 
            (libraryQuestion.defaultMetadata?.isHidden || false),
          metadata: mergeMetadata(libraryQuestion.defaultMetadata, instance.metadataOverrides),
          options: mergeOptions(libraryQuestion.defaultOptions, instance.optionsOverrides),
          pageId: page.id,
          // Track rules that affect this question
          affectingRules: questionRules.get(instance.id) || []
        };
        
        if (libraryQuestion.questionType === 'matrix') {
          // Get matrix rows and columns for validation
          const matrixRows = await db.select()
            .from(formSchema.libraryMatrixRows)
            .where(eq(formSchema.libraryMatrixRows.libraryQuestionId, libraryQuestion.id))
            .orderBy(formSchema.libraryMatrixRows.rowOrder);
          
          const matrixColumns = await db.select()
            .from(formSchema.libraryMatrixColumns)
            .where(eq(formSchema.libraryMatrixColumns.libraryQuestionId, libraryQuestion.id))
            .orderBy(formSchema.libraryMatrixColumns.columnOrder);
          
          // Add matrix structure to the question
          resolvedQuestion.matrixStructure = {
            rows: matrixRows.map(row => ({
              id: row.id,
              key: row.rowKey,
              label: row.label,
              displayOrder: row.rowOrder
            })),
            columns: matrixColumns.map(col => ({
              id: col.id,
              key: col.columnKey,
              header: col.header,
              cellInputType: col.cellInputType,
              displayOrder: col.columnOrder
            }))
          };
        }
        
        resolvedQuestions.push(resolvedQuestion);
        pageQuestions.push(resolvedQuestion);
        questionIdToPage.set(instance.id, page);
      }
      
      pageIdToQuestions.set(page.id, pageQuestions);
    }
    
    // 2. Determine visibility based on conditional logic
    const visibility = {
      visibleQuestions: new Set(),
      hiddenQuestions: new Set()
    };
    
    // Initial visibility - all questions start as visible unless marked isHidden
    for (const question of resolvedQuestions) {
      if (question.isHidden) {
        visibility.hiddenQuestions.add(question.questionInstanceId);
      } else {
        visibility.visibleQuestions.add(question.questionInstanceId);
      }
    }
    
    // Now apply all the rules to determine final visibility
    for (const rule of rules) {
      // Find the trigger question
      const triggerQuestion = resolvedQuestions.find(q => q.questionInstanceId === rule.triggerFormPageQuestionId);
      if (!triggerQuestion) continue;
      
      // Get the value for this question from the responses
      const triggerValue = responses[rule.triggerFormPageQuestionId];
      
      // Skip rules where the trigger question itself is not visible
      if (!visibility.visibleQuestions.has(triggerQuestion.questionInstanceId)) {
        continue;
      }
      
      // Check if the rule condition is met
      let conditionMet = false;
      
      switch (rule.conditionType) {
        case 'equals':
          conditionMet = triggerValue === rule.conditionValue;
          break;
        case 'not_equals':
          conditionMet = triggerValue !== rule.conditionValue;
          break;
        case 'contains':
          if (Array.isArray(triggerValue)) {
            conditionMet = triggerValue.includes(rule.conditionValue);
          } else if (typeof triggerValue === 'string') {
            conditionMet = triggerValue.includes(rule.conditionValue);
          }
          break;
        case 'not_contains':
          if (Array.isArray(triggerValue)) {
            conditionMet = !triggerValue.includes(rule.conditionValue);
          } else if (typeof triggerValue === 'string') {
            conditionMet = !triggerValue.includes(rule.conditionValue);
          }
          break;
        case 'greater_than':
          conditionMet = Number(triggerValue) > Number(rule.conditionValue);
          break;
        case 'less_than':
          conditionMet = Number(triggerValue) < Number(rule.conditionValue);
          break;
        case 'is_answered':
          conditionMet = triggerValue !== undefined && triggerValue !== null && triggerValue !== '';
          break;
        case 'is_not_answered':
          conditionMet = triggerValue === undefined || triggerValue === null || triggerValue === '';
          break;
        default:
          console.warn(`Unknown condition type: ${rule.conditionType}`);
      }
      
      // If condition is met, apply the rule action to all targets
      if (conditionMet) {
        const targets = await db.select()
          .from(formSchema.formRuleTargets)
          .where(eq(formSchema.formRuleTargets.ruleId, rule.id));
        
        for (const target of targets) {
          if (target.targetType === 'question') {
            // Apply the rule action to this question
            if (rule.actionType === 'show') {
              visibility.visibleQuestions.add(target.targetId);
              visibility.hiddenQuestions.delete(target.targetId);
            } else if (rule.actionType === 'hide') {
              visibility.hiddenQuestions.add(target.targetId);
              visibility.visibleQuestions.delete(target.targetId);
            }
          }
          // Could add handling for page-level targets here
        }
      }
    }
    
    // 3. Validate the submitted answers
    const validationErrors = {};
    
    for (const question of resolvedQuestions) {
      // Skip validation for questions that should be hidden
      if (!visibility.visibleQuestions.has(question.questionInstanceId)) {
        continue;
      }
      
      const questionId = question.questionInstanceId.toString();
      const answer = responses[questionId];
      
      // Validate this answer with our robust validation function
      const error = validateAnswer(answer, question);
      
      if (error) {
        validationErrors[questionId] = error;
      }
    }
    
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors
      });
    }
    
    // 4. Store the submission in a transaction
    const result = await db.transaction(async (tx) => {
      // Create form submission record
      const [submission] = await tx.insert(formSchema.formSubmissions)
        .values({
          formId: form.id,
          formVersion: versionNumber,
          userId: req.user?.id || null, // Get from session if available
          clientId: clientId || null,
          opportunityId: opportunityId || null,
          rawLeadId: rawLeadId || null,
          status: "completed", 
          submittedAt: new Date()
        })
        .returning();
      
      // Create answer records for each question
      const answerInserts = [];
      
      for (const [questionIdStr, answerValue] of Object.entries(responses)) {
        const questionId = parseInt(questionIdStr);
        if (isNaN(questionId)) continue;
        
        // Only store answers for visible questions
        if (visibility.visibleQuestions.has(questionId)) {
          answerInserts.push({
            formSubmissionId: submission.id,
            formPageQuestionId: questionId,
            answerValue: answerValue,
            answeredAt: new Date()
          });
        }
      }
      
      if (answerInserts.length > 0) {
        await tx.insert(formSchema.formSubmissionAnswers).values(answerInserts);
      }
      
      // If submitter info was provided, store it
      if (submitterInfo) {
        await tx.update(formSchema.formSubmissions)
          .set({
            submitterInfo: JSON.stringify(submitterInfo)
          })
          .where(eq(formSchema.formSubmissions.id, submission.id));
      }
      
      return submission;
    });
    
    // 5. Implement any post-submission actions here
    // For example: Send notifications, update CRM, create tasks, etc.
    // These should be implemented as async operations that don't block the response
    
    // For now, just log the submission
    console.log(`Form submission ${result.id} completed for form ${formKey} v${versionNumber}`);
    
    return res.status(201).json({
      message: "Form submitted successfully",
      submissionId: result.id,
      submission: result
    });
    
  } catch (error) {
    console.error("Error submitting form:", error);
    return res.status(500).json({ 
      message: "Failed to submit form", 
      error: error.message 
    });
  }
});

// --- RESOLVED FORM DEFINITION API ---

// Get a complete resolved form definition for rendering
router.get("/forms/:formKey/versions/:versionNumber/render", async (req, res) => {
  try {
    const formKey = req.params.formKey;
    const versionNumber = parseInt(req.params.versionNumber);
    
    if (isNaN(versionNumber)) {
      return res.status(400).json({ message: "Invalid version number" });
    }
    
    // 1. Fetch the form definition
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(and(
        eq(formSchema.forms.formKey, formKey),
        eq(formSchema.forms.version, versionNumber)
      ));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // If not previewing, check if form is published
    if (req.query.preview !== 'true' && form.status !== 'published') {
      return res.status(403).json({ message: "Form is not published" });
    }
    
    // 2. Fetch all pages for this form, ordered by pageOrder
    const pages = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.formId, form.id))
      .orderBy(formSchema.formPages.pageOrder);
    
    // 3. Fetch and resolve all questions for each page
    const resolvedPages = await Promise.all(pages.map(async (page) => {
      // Get all question instances for this page
      const questionInstances = await db.select()
        .from(formSchema.formPageQuestions)
        .where(eq(formSchema.formPageQuestions.formPageId, page.id))
        .orderBy(formSchema.formPageQuestions.displayOrder);
      
      // Resolve each question instance by merging with its library question
      const resolvedQuestions = await Promise.all(questionInstances.map(async (instance) => {
        // Get the base question from library
        const [libraryQuestion] = await db.select()
          .from(formSchema.questionLibrary)
          .where(eq(formSchema.questionLibrary.id, instance.libraryQuestionId));
        
        if (!libraryQuestion) {
          console.error(`Library question ${instance.libraryQuestionId} not found for instance ${instance.id}`);
          return null;
        }
        
        // Handle matrix questions - fetch rows and columns if applicable
        let matrixRows = [];
        let matrixColumns = [];
        
        if (libraryQuestion.questionType === 'matrix') {
          // Fetch matrix rows
          matrixRows = await db.select()
            .from(formSchema.libraryMatrixRows)
            .where(eq(formSchema.libraryMatrixRows.libraryQuestionId, libraryQuestion.id))
            .orderBy(formSchema.libraryMatrixRows.rowOrder);
          
          // Fetch matrix columns
          matrixColumns = await db.select()
            .from(formSchema.libraryMatrixColumns)
            .where(eq(formSchema.libraryMatrixColumns.libraryQuestionId, libraryQuestion.id))
            .orderBy(formSchema.libraryMatrixColumns.columnOrder);
        }
        
        // Merge library question with instance overrides
        const resolvedQuestion = {
          questionInstanceId: instance.id,
          questionKey: `${page.id}_${instance.id}`, // Create a unique key for this question instance
          libraryQuestionId: libraryQuestion.id,
          libraryQuestionKey: libraryQuestion.libraryQuestionKey,
          questionType: libraryQuestion.questionType,
          displayText: instance.displayTextOverride || libraryQuestion.defaultText,
          isRequired: instance.isRequiredOverride !== null ? 
            instance.isRequiredOverride : 
            (libraryQuestion.defaultMetadata?.isRequired || false),
          isHidden: instance.isHiddenOverride !== null ? 
            instance.isHiddenOverride : 
            (libraryQuestion.defaultMetadata?.isHidden || false),
          placeholder: instance.placeholderOverride || 
            (libraryQuestion.defaultMetadata?.placeholder || ""),
          helperText: instance.helperTextOverride || 
            (libraryQuestion.defaultMetadata?.helperText || ""),
          displayOrder: instance.displayOrder,
          // Intelligently merge metadata
          metadata: mergeMetadata(libraryQuestion.defaultMetadata, instance.metadataOverrides),
          // Intelligently merge options
          options: mergeOptions(libraryQuestion.defaultOptions, instance.optionsOverrides)
        };
        
        // Add matrix structure if applicable
        if (libraryQuestion.questionType === 'matrix') {
          // Get any row/column overrides from instance
          const rowOverrides = instance.optionsOverrides?.matrixRows || {};
          const columnOverrides = instance.optionsOverrides?.matrixColumns || {};
          
          // Build the matrix structure with overrides applied
          resolvedQuestion.matrixStructure = {
            rows: matrixRows.map(row => ({
              id: row.id,
              key: row.rowKey,
              label: rowOverrides[row.rowKey]?.label || row.label,
              price: rowOverrides[row.rowKey]?.price || row.price,
              displayOrder: row.rowOrder,
              metadata: mergeMetadata(row.defaultMetadata, rowOverrides[row.rowKey]?.metadata)
            })),
            columns: matrixColumns.map(col => ({
              id: col.id,
              key: col.columnKey,
              header: columnOverrides[col.columnKey]?.header || col.header,
              cellInputType: columnOverrides[col.columnKey]?.cellInputType || col.cellInputType,
              displayOrder: col.columnOrder,
              metadata: mergeMetadata(col.defaultMetadata, columnOverrides[col.columnKey]?.metadata)
            }))
          };
        }
        
        return resolvedQuestion;
      }));
      
      // Filter out any null questions (those that couldn't be resolved)
      const validQuestions = resolvedQuestions.filter(q => q !== null);
      
      // Return the resolved page with its questions
      return {
        pageId: page.id,
        pageTitle: page.pageTitle,
        pageOrder: page.pageOrder,
        description: page.description,
        questions: validQuestions
      };
    }));
    
    // 4. Fetch all rules and their targets
    const rules = await db.select()
      .from(formSchema.formRules)
      .where(eq(formSchema.formRules.formId, form.id))
      .orderBy(formSchema.formRules.executionOrder);
    
    // Get targets for each rule
    const rulesWithTargets = await Promise.all(rules.map(async (rule) => {
      const targets = await db.select()
        .from(formSchema.formRuleTargets)
        .where(eq(formSchema.formRuleTargets.ruleId, rule.id));
      
      // Get the question instance for this rule
      const [triggerQuestion] = await db.select()
        .from(formSchema.formPageQuestions)
        .where(eq(formSchema.formPageQuestions.id, rule.triggerFormPageQuestionId));
      
      // Get the page for this trigger question to create a questionKey
      const [triggerPage] = triggerQuestion ? await db.select()
        .from(formSchema.formPages)
        .where(eq(formSchema.formPages.id, triggerQuestion.formPageId)) : [null];
        
      const questionKey = triggerQuestion && triggerPage ? 
        `${triggerPage.id}_${triggerQuestion.id}` : null;
      
      return {
        ruleId: rule.id,
        questionKey: questionKey, // Add the resolved questionKey for client-side use
        triggerFormPageQuestionId: rule.triggerFormPageQuestionId,
        conditionType: rule.conditionType,
        conditionValue: rule.conditionValue,
        actionType: rule.actionType,
        ruleDescription: rule.ruleDescription,
        executionOrder: rule.executionOrder,
        targets: await Promise.all(targets.map(async target => {
          let targetKey = null;
          
          if (target.targetType === 'question') {
            // Resolve the target question key
            const [targetQuestion] = await db.select()
              .from(formSchema.formPageQuestions)
              .where(eq(formSchema.formPageQuestions.id, target.targetId));
              
            if (targetQuestion) {
              const [targetPage] = await db.select()
                .from(formSchema.formPages)
                .where(eq(formSchema.formPages.id, targetQuestion.formPageId));
                
              if (targetPage) {
                targetKey = `${targetPage.id}_${targetQuestion.id}`;
              }
            }
          }
          
          return {
            targetId: target.targetId,
            targetType: target.targetType,
            targetKey: targetKey // Include resolved key for client-side use
          };
        }))
      };
    }));
    
    // 5. Assemble and return the complete form definition
    const formDefinition = {
      formId: form.id,
      formKey: form.formKey,
      formTitle: form.formTitle,
      description: form.description,
      version: form.version,
      status: form.status,
      pages: resolvedPages,
      rules: rulesWithTargets
    };
    
    return res.json(formDefinition);
  } catch (error) {
    console.error("Error getting resolved form definition:", error);
    return res.status(500).json({ message: "Failed to get form definition", error: error.message });
  }
});

// Helper function to merge metadata
function mergeMetadata(baseMetadata, overrides) {
  if (!baseMetadata) return overrides || {};
  if (!overrides) return baseMetadata;
  
  // Deep merge the metadata objects
  // Handle nested objects properly
  const result = { ...baseMetadata };
  
  for (const key in overrides) {
    // If both base and override have an object at this key, merge them recursively
    if (
      typeof overrides[key] === 'object' && 
      overrides[key] !== null &&
      !Array.isArray(overrides[key]) && 
      typeof result[key] === 'object' && 
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = mergeMetadata(result[key], overrides[key]);
    }
    // If override has an array that should replace the base array
    else if (Array.isArray(overrides[key])) {
      result[key] = [...overrides[key]];
    }
    // Otherwise just replace the value
    else {
      result[key] = overrides[key];
    }
  }
  
  return result;
}

// Helper function to merge options
function mergeOptions(baseOptions, overrides) {
  if (!baseOptions) return overrides || {};
  if (!overrides) return baseOptions;
  
  // If options is an array of option items, then handle accordingly
  if (Array.isArray(baseOptions)) {
    // If overrides is also an array, it completely replaces the base options
    if (Array.isArray(overrides)) {
      return overrides;
    }
    
    // If overrides is an object with specific modifications
    if (typeof overrides === 'object' && overrides !== null) {
      if (overrides.include) {
        // Filter to only include options from include array
        return baseOptions.filter(opt => overrides.include.includes(opt.key));
      } else if (overrides.exclude) {
        // Filter to exclude options from exclude array
        return baseOptions.filter(opt => !overrides.exclude.includes(opt.key));
      } else if (overrides.modify) {
        // Apply modifications to specific options
        return baseOptions.map(opt => {
          const modification = overrides.modify.find(m => m.key === opt.key);
          if (modification) {
            return { ...opt, ...modification };
          }
          return opt;
        });
      } else if (overrides.reorder) {
        // Reorder options based on the specified order
        const reorderedOptions = [...baseOptions];
        reorderedOptions.sort((a, b) => {
          const aIndex = overrides.reorder.indexOf(a.key);
          const bIndex = overrides.reorder.indexOf(b.key);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        return reorderedOptions;
      }
    }
    
    // Default, return base options unchanged
    return baseOptions;
  }
  
  // If options is an object with properties (e.g., for matrix questions), do a deep merge
  return mergeMetadata(baseOptions, overrides);
}

// Helper function to validate a single answer based on question type and rules
function validateAnswer(answer, question) {
  // If the question is required and the answer is empty, return an error
  if (question.isRequired) {
    // For arrays/multiple choice, check if they selected at least one option
    if (Array.isArray(answer)) {
      if (answer.length === 0) {
        return "This field is required";
      }
    } 
    // For matrix questions, check if required cells have values
    else if (question.questionType === 'matrix' && question.matrixStructure) {
      // The answer format for matrix should be an object with keys corresponding to row_column combinations
      if (!answer || typeof answer !== 'object' || Object.keys(answer).length === 0) {
        return "This field requires at least one response";
      }
      
      // Check if all required cells have values
      const requiredCells = question.metadata?.requiredCells || [];
      for (const cellKey of requiredCells) {
        if (!answer[cellKey] || answer[cellKey].trim() === '') {
          return `The cell ${cellKey} is required`;
        }
      }
    }
    // For other types, check if the value is empty
    else if (answer === undefined || answer === null || answer === '') {
      return "This field is required";
    }
  }
  
  // Skip further validation if not required and empty
  if ((answer === undefined || answer === null || answer === '') && !question.isRequired) {
    return null;
  }
  
  // Type-specific validation
  const type = question.questionType;
  const metadata = question.metadata || {};
  
  switch (type) {
    case 'email':
      // Email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) {
        return "Please enter a valid email address";
      }
      break;
      
    case 'phone':
      // Phone validation with international format support
      if (!/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/.test(answer)) {
        return "Please enter a valid phone number";
      }
      break;
      
    case 'number':
      const num = Number(answer);
      if (isNaN(num)) {
        return "Please enter a valid number";
      }
      
      // Check min/max constraints
      if (metadata.min !== undefined && num < metadata.min) {
        return `Value must be at least ${metadata.min}`;
      }
      if (metadata.max !== undefined && num > metadata.max) {
        return `Value must be no more than ${metadata.max}`;
      }
      
      // Check if integer is required
      if (metadata.integer && !Number.isInteger(num)) {
        return "Please enter a whole number";
      }
      break;
      
    case 'textbox':
    case 'textarea':
      // Text length validation
      if (metadata.minLength && answer.length < metadata.minLength) {
        return `Please enter at least ${metadata.minLength} characters`;
      }
      if (metadata.maxLength && answer.length > metadata.maxLength) {
        return `Please enter no more than ${metadata.maxLength} characters`;
      }
      
      // Pattern validation if specified
      if (metadata.pattern) {
        try {
          const regex = new RegExp(metadata.pattern);
          if (!regex.test(answer)) {
            return metadata.patternMessage || "Input doesn't match the required format";
          }
        } catch (e) {
          console.error("Invalid regex pattern in metadata:", e);
        }
      }
      break;
      
    case 'select':
    case 'radio':
      // Validate that selected option is in available options
      if (question.options && !question.options.some(opt => opt.value === answer)) {
        return "Please select a valid option";
      }
      break;
      
    case 'checkbox':
    case 'multiselect':
      // For checkboxes, answer should be an array
      if (!Array.isArray(answer)) {
        return "Invalid selection format";
      }
      
      // Check if all selected options are in the allowed options
      if (question.options) {
        const optionValues = question.options.map(opt => opt.value);
        for (const selected of answer) {
          if (!optionValues.includes(selected)) {
            return "One or more selected options are invalid";
          }
        }
      }
      
      // Check min/max selections if specified
      if (metadata.minSelections && answer.length < metadata.minSelections) {
        return `Please select at least ${metadata.minSelections} options`;
      }
      if (metadata.maxSelections && answer.length > metadata.maxSelections) {
        return `Please select no more than ${metadata.maxSelections} options`;
      }
      
      // We already validated options above, so we don't need this duplicate check
      
      // We already checked min/max selections above with the metadata.minSelections property
      break;
      
    case 'matrix':
      // Matrix validation should check that values match the column input types
      if (!question.matrixStructure) {
        return "Invalid matrix structure";
      }
      
      // Validate each answer against its column type
      const { rows, columns } = question.matrixStructure;
      
      for (const [cellKey, cellValue] of Object.entries(answer)) {
        // Format should be rowKey_columnKey
        const [rowKey, columnKey] = cellKey.split('_');
        
        // Find the column to determine the cell input type
        const column = columns.find(col => col.key === columnKey);
        if (!column) {
          return `Invalid column reference: ${columnKey}`;
        }
        
        // Validate based on cell input type
        switch (column.cellInputType) {
          case 'text':
            if (metadata.maxLength && cellValue.length > metadata.maxLength) {
              return `Text in ${cellKey} exceeds maximum length of ${metadata.maxLength}`;
            }
            break;
            
          case 'number':
            const numVal = Number(cellValue);
            if (cellValue && isNaN(numVal)) {
              return `Please enter a valid number in ${cellKey}`;
            }
            if (metadata.min !== undefined && numVal < metadata.min) {
              return `Value in ${cellKey} must be at least ${metadata.min}`;
            }
            if (metadata.max !== undefined && numVal > metadata.max) {
              return `Value in ${cellKey} must be no more than ${metadata.max}`;
            }
            break;
            
          case 'select':
            // This would require the column to specify allowed options for validation
            const columnOptions = column.metadata?.options || [];
            if (columnOptions.length > 0 && !columnOptions.includes(cellValue)) {
              return `Invalid selection in ${cellKey}`;
            }
            break;
            
          case 'boolean':
          case 'checkbox':
            if (cellValue !== true && cellValue !== false && cellValue !== 'true' && cellValue !== 'false') {
              return `Please provide a valid boolean value in ${cellKey}`;
            }
            break;
        }
      }
      break;
      
    case 'date':
    case 'datetime':
      // Date validation
      const date = new Date(answer);
      if (isNaN(date.getTime())) {
        return "Please enter a valid date";
      }
      
      // Min/max date validation
      if (metadata.minDate) {
        const minDate = new Date(metadata.minDate);
        if (date < minDate) {
          return `Date must be on or after ${minDate.toLocaleDateString()}`;
        }
      }
      
      if (metadata.maxDate) {
        const maxDate = new Date(metadata.maxDate);
        if (date > maxDate) {
          return `Date must be on or before ${maxDate.toLocaleDateString()}`;
        }
      }
      break;
      
    case 'address':
      // Basic address validation
      if (typeof answer !== 'object') {
        return "Invalid address format";
      }
      
      if (metadata.requireStreet && (!answer.street || answer.street.trim() === '')) {
        return "Street address is required";
      }
      if (metadata.requireCity && (!answer.city || answer.city.trim() === '')) {
        return "City is required";
      }
      if (metadata.requireState && (!answer.state || answer.state.trim() === '')) {
        return "State/Province is required";
      }
      if (metadata.requireZip && (!answer.zipCode || answer.zipCode.trim() === '')) {
        return "ZIP/Postal code is required";
      }
      if (metadata.requireCountry && (!answer.country || answer.country.trim() === '')) {
        return "Country is required";
      }
      break;
      
    case 'matrix':
      // Matrix answers should be objects with row_key x column_key format
      if (typeof answer !== 'object' || answer === null) {
        return "Invalid matrix answer format";
      }
      
      // Could add more specific matrix validation here
      break;
  }
  
  return null; // No validation errors
}

// --- FORM RULES & TARGETS API ---

// Create a new rule
router.post("/forms/:formId/rules", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    
    if (isNaN(formId)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }
    
    // Check if the form exists
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(eq(formSchema.forms.id, formId));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // Extract targets from the request
    const { targets, ...ruleData } = req.body;
    
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ message: "Rule must have at least one target" });
    }
    
    // Parse and validate the rule data
    const ruleSchema = formSchema.insertFormRuleSchema.extend({
      formId: z.number().int().positive(),
    });
    
    const parsed = ruleSchema.safeParse({ ...ruleData, formId });
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid rule data", errors: parsed.error.format() });
    }
    
    // Start a transaction
    try {
      // Create the rule
      const [newRule] = await db.insert(formSchema.formRules)
        .values(parsed.data)
        .returning();
      
      // Create each target
      const targetSchema = formSchema.insertFormRuleTargetSchema.extend({
        ruleId: z.number().int().positive(),
      });
      
      const createdTargets = [];
      
      for (const target of targets) {
        const parsedTarget = targetSchema.safeParse({ ...target, ruleId: newRule.id });
        
        if (!parsedTarget.success) {
          return res.status(400).json({ 
            message: "Invalid target data", 
            errors: parsedTarget.error.format() 
          });
        }
        
        const [newTarget] = await db.insert(formSchema.formRuleTargets)
          .values(parsedTarget.data)
          .returning();
          
        createdTargets.push(newTarget);
      }
      
      // Return the rule with its targets
      return res.status(201).json({
        ...newRule,
        targets: createdTargets
      });
    } catch (error) {
      console.error("Transaction error:", error);
      throw new Error("Failed to create rule with targets");
    }
  } catch (error) {
    console.error("Error creating rule:", error);
    return res.status(500).json({ message: "Failed to create rule" });
  }
});

// List all rules for a form
router.get("/forms/:formId/rules", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    
    if (isNaN(formId)) {
      return res.status(400).json({ message: "Invalid form ID" });
    }
    
    // Check if the form exists
    const [form] = await db.select()
      .from(formSchema.forms)
      .where(eq(formSchema.forms.id, formId));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    
    // Get all rules for this form
    const rules = await db.select()
      .from(formSchema.formRules)
      .where(eq(formSchema.formRules.formId, formId))
      .orderBy(formSchema.formRules.executionOrder);
    
    // Get targets for all rules
    const rulesWithTargets = await Promise.all(rules.map(async (rule) => {
      const targets = await db.select()
        .from(formSchema.formRuleTargets)
        .where(eq(formSchema.formRuleTargets.ruleId, rule.id));
      
      return { ...rule, targets };
    }));
    
    return res.json(rulesWithTargets);
  } catch (error) {
    console.error("Error listing rules:", error);
    return res.status(500).json({ message: "Failed to list rules" });
  }
});

// Update a rule
router.put("/forms/:formId/rules/:ruleId", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    const ruleId = parseInt(req.params.ruleId);
    
    if (isNaN(formId) || isNaN(ruleId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // Check if the rule exists and belongs to the form
    const [rule] = await db.select()
      .from(formSchema.formRules)
      .where(and(
        eq(formSchema.formRules.id, ruleId),
        eq(formSchema.formRules.formId, formId)
      ));
    
    if (!rule) {
      return res.status(404).json({ message: "Rule not found" });
    }
    
    // Extract targets from the request
    const { targets, ...ruleData } = req.body;
    
    // Parse and validate the rule data
    const parsed = formSchema.insertFormRuleSchema.partial().safeParse(ruleData);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid rule data", errors: parsed.error.format() });
    }
    
    // Start a transaction
    try {
      // Update the rule
      const [updatedRule] = await db.update(formSchema.formRules)
        .set(parsed.data)
        .where(eq(formSchema.formRules.id, ruleId))
        .returning();
      
      // Handle targets if provided
      if (targets && Array.isArray(targets)) {
        // Delete existing targets
        await db.delete(formSchema.formRuleTargets)
          .where(eq(formSchema.formRuleTargets.ruleId, ruleId));
        
        // Create new targets
        const targetSchema = formSchema.insertFormRuleTargetSchema.extend({
          ruleId: z.number().int().positive(),
        });
        
        const createdTargets = [];
        
        for (const target of targets) {
          const parsedTarget = targetSchema.safeParse({ ...target, ruleId });
          
          if (!parsedTarget.success) {
            return res.status(400).json({ 
              message: "Invalid target data", 
              errors: parsedTarget.error.format() 
            });
          }
          
          const [newTarget] = await db.insert(formSchema.formRuleTargets)
            .values(parsedTarget.data)
            .returning();
            
          createdTargets.push(newTarget);
        }
        
        // Return the updated rule with its new targets
        return res.json({
          ...updatedRule,
          targets: createdTargets
        });
      }
      
      // If no targets provided, just return the updated rule
      const currentTargets = await db.select()
        .from(formSchema.formRuleTargets)
        .where(eq(formSchema.formRuleTargets.ruleId, ruleId));
      
      return res.json({
        ...updatedRule,
        targets: currentTargets
      });
    } catch (error) {
      console.error("Transaction error:", error);
      throw new Error("Failed to update rule");
    }
  } catch (error) {
    console.error("Error updating rule:", error);
    return res.status(500).json({ message: "Failed to update rule" });
  }
});

// Delete a rule
router.delete("/forms/:formId/rules/:ruleId", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    const ruleId = parseInt(req.params.ruleId);
    
    if (isNaN(formId) || isNaN(ruleId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // Check if the rule exists and belongs to the form
    const [rule] = await db.select()
      .from(formSchema.formRules)
      .where(and(
        eq(formSchema.formRules.id, ruleId),
        eq(formSchema.formRules.formId, formId)
      ));
    
    if (!rule) {
      return res.status(404).json({ message: "Rule not found" });
    }
    
    // Delete the rule (targets will be deleted via cascade)
    await db.delete(formSchema.formRules)
      .where(eq(formSchema.formRules.id, ruleId));
    
    return res.json({ success: true, message: "Rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting rule:", error);
    return res.status(500).json({ message: "Failed to delete rule" });
  }
});

// --- QUESTION RULES API ---

// Get rules for a specific question
router.get("/questions/:questionId/rules", async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    
    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }
    
    // Get all rules where this question is either the trigger or the target
    console.log(`Looking for rules where triggerFormPageQuestionId = ${questionId}`);
    
    // First, get rules from the main form_rules table
    const rules = await db.select()
      .from(formSchema.formRules)
      .where(eq(formSchema.formRules.triggerFormPageQuestionId, questionId))
      .orderBy(formSchema.formRules.executionOrder);
    
    // Then, check if we have any targets in the form_rule_targets table
    const targetRules = await db.select({
      rule: formSchema.formRules,
      target: formSchema.formRuleTargets
    })
      .from(formSchema.formRuleTargets)
      .innerJoin(
        formSchema.formRules,
        eq(formSchema.formRuleTargets.ruleId, formSchema.formRules.id)
      )
      .where(
        eq(formSchema.formRuleTargets.targetId, questionId)
      )
      .orderBy(formSchema.formRules.executionOrder);
    
    // Combine both sets of rules
    const combinedRules = [
      ...rules,
      ...targetRules.map(tr => tr.rule)
    ];
      
    return res.status(200).json(combinedRules);
  } catch (error) {
    console.error("Error fetching rules for question:", error);
    return res.status(500).json({ message: "Failed to fetch rules" });
  }
});

// Create a new rule for a question
router.post("/questions/:questionId/rules", async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    
    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }
    
    console.log(`SERVER POST rule: Received for target questionId ${questionId}, payload:`, JSON.stringify(req.body, null, 2));
    
    // Find the form page question to get the form ID
    const [question] = await db.select()
      .from(formSchema.formPageQuestions)
      .where(eq(formSchema.formPageQuestions.id, questionId));
      
    if (!question) {
      console.log(`SERVER POST rule: Question ID ${questionId} not found`);
      return res.status(404).json({ message: "Question not found" });
    }
    
    // Find the page to get the form ID
    const [page] = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.id, question.formPageId));
      
    if (!page) {
      console.log(`SERVER POST rule: Page ID ${question.formPageId} not found for question ${questionId}`);
      return res.status(404).json({ message: "Page not found" });
    }
    
    // Validate the rule data
    const ruleSchema = z.object({
      sourceQuestionId: z.number(),
      conditionType: z.string(),
      conditionValue: z.string().optional(),
      actionType: z.string()
    });
    
    const parsed = ruleSchema.safeParse(req.body);
    
    if (!parsed.success) {
      console.log(`SERVER POST rule: Validation failed for rule data:`, parsed.error.format());
      return res.status(400).json({ 
        message: "Invalid rule data", 
        errors: parsed.error.format() 
      });
    }
    
    console.log(`SERVER POST rule: Valid rule data received for form ${page.formId}, sourceQuestion: ${parsed.data.sourceQuestionId}, condition: ${parsed.data.conditionType}`);
    
    // Create the rule in the form_rules table
    const [newRule] = await db.insert(formSchema.formRules)
      .values({
        formId: page.formId,
        triggerFormPageQuestionId: parsed.data.sourceQuestionId,
        conditionType: parsed.data.conditionType,
        conditionValue: parsed.data.conditionValue || null,
        actionType: parsed.data.actionType,
        executionOrder: 0, // Default execution order
      })
      .returning();
      
    console.log(`SERVER POST rule: Created new rule with ID ${newRule.id}`);
    
    // Now create the target entry in the form_rule_targets table
    const [newTarget] = await db.insert(formSchema.formRuleTargets)
      .values({
        ruleId: newRule.id,
        targetType: 'question', // Assume question type, could be extended for other types
        targetId: questionId,
      })
      .returning();
      
    console.log(`SERVER POST rule: Created rule target with ID ${newTarget.id}, linking rule ${newRule.id} to question ${questionId}`);
    
    return res.status(201).json(newRule);
  } catch (error) {
    console.error("Error creating rule:", error);
    return res.status(500).json({ message: "Failed to create rule" });
  }
});

// Delete all rules for a question
router.delete("/questions/:questionId/rules", async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    
    if (isNaN(questionId)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }
    
    console.log(`SERVER: Deleting rules for question ID: ${questionId}`);
    
    // Find rules associated with this question as a target
    const ruleTargets = await db.select()
      .from(formSchema.formRuleTargets)
      .where(eq(formSchema.formRuleTargets.targetId, questionId));
      
    // Get the rule IDs
    const ruleIds = ruleTargets.map(target => target.ruleId);
    console.log(`SERVER: Found ${ruleIds.length} rules where question ${questionId} is a target`);
    
    let targetsDeleted = 0;
    let rulesDeleted = 0;
    
    if (ruleIds.length > 0) {
      // Delete the rule targets first (foreign key constraint)
      const deletedTargets = await db.delete(formSchema.formRuleTargets)
        .where(eq(formSchema.formRuleTargets.targetId, questionId))
        .returning();
      
      targetsDeleted = deletedTargets.length;
      console.log(`SERVER: Deleted ${targetsDeleted} rule targets for question ${questionId}`);
      
      // Then delete the rules
      for (const ruleId of ruleIds) {
        const deletedRule = await db.delete(formSchema.formRules)
          .where(eq(formSchema.formRules.id, ruleId))
          .returning();
          
        if (deletedRule.length > 0) {
          rulesDeleted++;
          console.log(`SERVER: Deleted rule ID ${ruleId}`);
        }
      }
    }
    
    // Also delete rules where this question is the trigger
    const deletedTriggerRules = await db.delete(formSchema.formRules)
      .where(eq(formSchema.formRules.triggerFormPageQuestionId, questionId))
      .returning();
      
    const triggerRulesDeleted = deletedTriggerRules.length;
    console.log(`SERVER: Deleted ${triggerRulesDeleted} rules where question ${questionId} is the trigger`);
      
    return res.status(200).json({ 
      success: true,
      message: "Rules deleted successfully",
      details: {
        targetsDeleted,
        rulesDeleted,
        triggerRulesDeleted,
        totalRulesDeleted: rulesDeleted + triggerRulesDeleted
      }
    });
  } catch (error) {
    console.error("Error deleting rules for question ID:", req.params.questionId, error);
    return res.status(500).json({ 
      message: "Failed to delete rules", 
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;