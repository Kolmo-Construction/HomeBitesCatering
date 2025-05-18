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
    const parsed = formSchema.insertFormSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid form data", errors: parsed.error.format() });
    }
    
    const [newForm] = await db.insert(formSchema.forms)
      .values(parsed.data)
      .returning();
      
    return res.status(201).json(newForm);
  } catch (error) {
    console.error("Error creating form:", error);
    return res.status(500).json({ message: "Failed to create form" });
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
      return res.status(400).json({ message: "Invalid page data", errors: parsed.error.format() });
    }
    
    // Create the page
    const [newPage] = await db.insert(formSchema.formPages)
      .values(parsed.data)
      .returning();
      
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
    
    // Start a transaction for reordering
    for (const item of parsed.data) {
      await db.update(formSchema.formPages)
        .set({ pageOrder: item.newPageOrder, updatedAt: new Date() })
        .where(and(
          eq(formSchema.formPages.id, item.pageId),
          eq(formSchema.formPages.formId, formId)
        ));
    }
    
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
    const libraryQuestionId = req.body.libraryQuestionId;
    const [libraryQuestion] = await db.select()
      .from(formSchema.questionLibrary)
      .where(eq(formSchema.questionLibrary.id, libraryQuestionId));
    
    if (!libraryQuestion) {
      return res.status(404).json({ message: "Library question not found" });
    }
    
    // Parse and validate request body
    const questionSchema = formSchema.insertFormPageQuestionSchema.extend({
      formPageId: z.number().int().positive(),
    });
    
    const parsed = questionSchema.safeParse({ ...req.body, formPageId: pageId });
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid question data", errors: parsed.error.format() });
    }
    
    // Create the question
    const [newQuestion] = await db.insert(formSchema.formPageQuestions)
      .values(parsed.data)
      .returning();
      
    return res.status(201).json(newQuestion);
  } catch (error) {
    console.error("Error adding question:", error);
    return res.status(500).json({ message: "Failed to add question" });
  }
});

// List all questions for a page
router.get("/pages/:pageId/questions", async (req, res) => {
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
      displayText: formSchema.questionLibrary.displayText,
      isRequired: formSchema.questionLibrary.isRequired,
      isHidden: formSchema.questionLibrary.isHidden,
      placeholder: formSchema.questionLibrary.placeholder,
      helperText: formSchema.questionLibrary.helperText,
      metadata: formSchema.questionLibrary.metadata,
      options: formSchema.questionLibrary.options,
      validationRules: formSchema.questionLibrary.validationRules,
    })
    .from(formSchema.formPageQuestions)
    .innerJoin(
      formSchema.questionLibrary, 
      eq(formSchema.formPageQuestions.libraryQuestionId, formSchema.questionLibrary.id)
    )
    .where(eq(formSchema.formPageQuestions.formPageId, pageId))
    .orderBy(formSchema.formPageQuestions.displayOrder);
    
    // Process questions to resolve overrides
    const resolvedQuestions = questions.map(q => {
      // Apply overrides if they exist
      return {
        id: q.pageQuestionId,
        formPageId: q.formPageId,
        libraryQuestionId: q.libraryQuestionId,
        displayOrder: q.displayOrder,
        questionType: q.questionType,
        displayText: q.displayTextOverride || q.displayText,
        isRequired: q.isRequiredOverride !== null ? q.isRequiredOverride : q.isRequired,
        isHidden: q.isHiddenOverride !== null ? q.isHiddenOverride : q.isHidden,
        placeholder: q.placeholderOverride || q.placeholder,
        helperText: q.helperTextOverride || q.helperText,
        metadata: q.metadataOverrides ? { ...q.metadata, ...q.metadataOverrides } : q.metadata,
        options: q.optionsOverrides ? { ...q.options, ...q.optionsOverrides } : q.options,
        validationRules: q.validationRules,
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
    
    // Reorder questions
    for (const item of parsed.data) {
      await db.update(formSchema.formPageQuestions)
        .set({ displayOrder: item.newDisplayOrder, updatedAt: new Date() })
        .where(and(
          eq(formSchema.formPageQuestions.id, item.questionInstanceId),
          eq(formSchema.formPageQuestions.formPageId, pageId)
        ));
    }
    
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
router.post("/forms/:formKey/versions/:versionNumber/submit", async (req, res) => {
  try {
    const formKey = req.params.formKey;
    const versionNumber = parseInt(req.params.versionNumber);
    const { clientId, opportunityId, rawLeadId, answers } = req.body;
    
    if (isNaN(versionNumber)) {
      return res.status(400).json({ message: "Invalid version number" });
    }
    
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: "Invalid answers format" });
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
    // We need this to validate the submitted answers
    const pages = await db.select()
      .from(formSchema.formPages)
      .where(eq(formSchema.formPages.formId, form.id))
      .orderBy(formSchema.formPages.pageOrder);
    
    // Collect all questions from all pages
    const resolvedQuestions = [];
    
    for (const page of pages) {
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
          libraryQuestionId: libraryQuestion.id,
          questionType: libraryQuestion.questionType,
          displayText: instance.displayTextOverride || libraryQuestion.defaultText,
          isRequired: instance.isRequiredOverride !== null ? instance.isRequiredOverride : libraryQuestion.isRequired,
          isHidden: instance.isHiddenOverride !== null ? instance.isHiddenOverride : libraryQuestion.isHidden,
          placeholder: instance.placeholderOverride || libraryQuestion.placeholder,
          helperText: instance.helperTextOverride || libraryQuestion.helperText,
          metadata: mergeMetadata(libraryQuestion.metadata, instance.metadataOverrides),
          options: mergeOptions(libraryQuestion.options, instance.optionsOverrides)
        };
        
        if (libraryQuestion.questionType === 'matrix') {
          // Get matrix rows and columns for validation
          const matrixRows = await db.select()
            .from(formSchema.libraryMatrixRows)
            .where(eq(formSchema.libraryMatrixRows.questionId, libraryQuestion.id))
            .orderBy(formSchema.libraryMatrixRows.displayOrder);
          
          const matrixColumns = await db.select()
            .from(formSchema.libraryMatrixColumns)
            .where(eq(formSchema.libraryMatrixColumns.questionId, libraryQuestion.id))
            .orderBy(formSchema.libraryMatrixColumns.displayOrder);
          
          resolvedQuestion.matrixRows = matrixRows;
          resolvedQuestion.matrixColumns = matrixColumns;
        }
        
        resolvedQuestions.push(resolvedQuestion);
      }
    }
    
    // 2. Validate the submitted answers
    const validationErrors = {};
    
    for (const question of resolvedQuestions) {
      const questionId = question.questionInstanceId.toString();
      const answer = answers[questionId];
      
      // Validate this answer
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
    
    // 3. Store the submission in a transaction
    const result = await db.transaction(async (tx) => {
      // Create form submission record
      const [submission] = await tx.insert(formSchema.formSubmissions)
        .values({
          formId: form.id,
          formVersion: versionNumber,
          clientId: clientId || null,
          opportunityId: opportunityId || null,
          rawLeadId: rawLeadId || null,
          status: "completed",
          submittedAt: new Date()
        })
        .returning();
      
      // Create answer records for each question
      const answerInserts = [];
      
      for (const [questionIdStr, answerValue] of Object.entries(answers)) {
        const questionId = parseInt(questionIdStr);
        if (isNaN(questionId)) continue;
        
        answerInserts.push({
          formSubmissionId: submission.id,
          formPageQuestionId: questionId,
          answerValue: answerValue,
          answeredAt: new Date()
        });
      }
      
      if (answerInserts.length > 0) {
        await tx.insert(formSchema.formSubmissionAnswers).values(answerInserts);
      }
      
      return submission;
    });
    
    return res.status(201).json({
      message: "Form submitted successfully",
      submissionId: result.id,
      submission: result
    });
    
  } catch (error) {
    console.error("Error submitting form:", error);
    return res.status(500).json({ message: "Failed to submit form" });
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
        eq(formSchema.forms.version, versionNumber),
        eq(formSchema.forms.status, "published") // Only return published forms unless previewing
      ));
    
    if (!form) {
      return res.status(404).json({ message: "Form not found or not published" });
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
            .where(eq(formSchema.libraryMatrixRows.questionId, libraryQuestion.id))
            .orderBy(formSchema.libraryMatrixRows.displayOrder);
          
          // Fetch matrix columns
          matrixColumns = await db.select()
            .from(formSchema.libraryMatrixColumns)
            .where(eq(formSchema.libraryMatrixColumns.questionId, libraryQuestion.id))
            .orderBy(formSchema.libraryMatrixColumns.displayOrder);
        }
        
        // Merge library question with instance overrides
        const resolvedQuestion = {
          questionInstanceId: instance.id,
          libraryQuestionId: libraryQuestion.id,
          questionType: libraryQuestion.questionType,
          displayText: instance.displayTextOverride || libraryQuestion.displayText,
          isRequired: instance.isRequiredOverride !== null ? instance.isRequiredOverride : libraryQuestion.isRequired,
          isHidden: instance.isHiddenOverride !== null ? instance.isHiddenOverride : libraryQuestion.isHidden,
          placeholder: instance.placeholderOverride || libraryQuestion.placeholder,
          helperText: instance.helperTextOverride || libraryQuestion.helperText,
          displayOrder: instance.displayOrder,
          // Intelligently merge metadata
          metadata: mergeMetadata(libraryQuestion.metadata, instance.metadataOverrides),
          // Intelligently merge options
          options: mergeOptions(libraryQuestion.options, instance.optionsOverrides)
        };
        
        // Add matrix structure if applicable
        if (libraryQuestion.questionType === 'matrix') {
          // Apply any row/column overrides if they exist in metadataOverrides or optionsOverrides
          resolvedQuestion.matrixStructure = {
            rows: matrixRows.map(row => ({
              id: row.id,
              key: row.rowKey,
              label: row.rowLabel,
              displayOrder: row.displayOrder
            })),
            columns: matrixColumns.map(col => ({
              id: col.id,
              key: col.columnKey,
              label: col.columnLabel,
              displayOrder: col.displayOrder
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
      
      return {
        ruleId: rule.id,
        triggerFormPageQuestionId: rule.triggerFormPageQuestionId,
        conditionType: rule.conditionType,
        conditionValue: rule.conditionValue,
        actionType: rule.actionType,
        ruleDescription: rule.ruleDescription,
        executionOrder: rule.executionOrder,
        targets: targets.map(target => ({
          targetId: target.targetId,
          targetType: target.targetType
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
      pages: resolvedPages,
      rules: rulesWithTargets
    };
    
    return res.json(formDefinition);
  } catch (error) {
    console.error("Error getting resolved form definition:", error);
    return res.status(500).json({ message: "Failed to get form definition" });
  }
});

// Helper function to merge metadata
function mergeMetadata(baseMetadata, overrides) {
  if (!baseMetadata) return overrides || {};
  if (!overrides) return baseMetadata;
  
  // Deep merge the metadata objects
  return { ...baseMetadata, ...overrides };
}

// Helper function to merge options
function mergeOptions(baseOptions, overrides) {
  if (!baseOptions) return overrides || {};
  if (!overrides) return baseOptions;
  
  // Deep merge the options objects
  return { ...baseOptions, ...overrides };
}

// Helper function to validate a single answer based on question type and rules
function validateAnswer(answer, question) {
  if (!answer && question.isRequired) {
    return "This field is required";
  }
  
  // Skip further validation if answer is empty and not required
  if (!answer && !question.isRequired) {
    return null;
  }
  
  const type = question.questionType;
  const metadata = question.metadata || {};
  
  switch (type) {
    case 'email':
      // Simple email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) {
        return "Please enter a valid email address";
      }
      break;
      
    case 'phone':
      // Basic phone validation (adjust based on your needs)
      if (!/^[0-9+\-() ]{7,20}$/.test(answer)) {
        return "Please enter a valid phone number";
      }
      break;
      
    case 'number':
      const num = Number(answer);
      if (isNaN(num)) {
        return "Please enter a valid number";
      }
      if (metadata.min !== undefined && num < metadata.min) {
        return `Value must be at least ${metadata.min}`;
      }
      if (metadata.max !== undefined && num > metadata.max) {
        return `Value must be no more than ${metadata.max}`;
      }
      break;
      
    case 'textbox':
    case 'textarea':
      if (metadata.minLength && answer.length < metadata.minLength) {
        return `Please enter at least ${metadata.minLength} characters`;
      }
      if (metadata.maxLength && answer.length > metadata.maxLength) {
        return `Please enter no more than ${metadata.maxLength} characters`;
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
      // For checkboxes, answer should be an array
      if (!Array.isArray(answer)) {
        return "Invalid checkbox selection format";
      }
      
      // Check if all selected values are valid options
      if (question.options && answer.some(val => !question.options.some(opt => opt.value === val))) {
        return "One or more selected options are invalid";
      }
      
      // Check min/max selected items if specified
      if (metadata.minSelected && answer.length < metadata.minSelected) {
        return `Please select at least ${metadata.minSelected} options`;
      }
      if (metadata.maxSelected && answer.length > metadata.maxSelected) {
        return `Please select no more than ${metadata.maxSelected} options`;
      }
      break;
      
    case 'datetime':
      // Basic date validation
      const date = new Date(answer);
      if (date.toString() === 'Invalid Date') {
        return "Please enter a valid date";
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

export default router;