import { Router } from 'express';
import { z } from 'zod';
import { db } from './db';
import { forms, formPages, pageQuestions, libraryQuestions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Schema for questionnaire submission
const submissionSchema = z.object({
  responses: z.record(z.string(), z.any())
});

// GET endpoint to fetch a resolved form definition by its formKey
router.get('/questionnaires/:formKey', async (req, res) => {
  try {
    const { formKey } = req.params;
    
    // 1. Fetch the form metadata
    const formResult = await db
      .select()
      .from(forms)
      .where(eq(forms.formKey, formKey))
      .limit(1);
    
    if (formResult.length === 0) {
      return res.status(404).json({ message: `Form with key '${formKey}' not found` });
    }
    
    const form = formResult[0];
    
    // 2. Fetch the form pages
    const pagesResult = await db
      .select()
      .from(formPages)
      .where(eq(formPages.formId, form.id))
      .orderBy(formPages.pageOrder);
    
    const pagesWithQuestions = await Promise.all(pagesResult.map(async (page) => {
      // 3. For each page, fetch the questions with their details
      const questionsData = await db.execute(/* sql */`
        SELECT 
          pq.id as "pageQuestionId",
          pq.form_page_id as "formPageId",
          pq.display_order as "displayOrder",
          pq.display_text_override as "displayTextOverride",
          pq.is_required_override as "isRequiredOverride",
          pq.is_hidden_override as "isHiddenOverride",
          pq.placeholder_override as "placeholderOverride",
          pq.helper_text_override as "helperTextOverride",
          pq.metadata_overrides as "metadataOverrides",
          pq.options_overrides as "optionsOverrides",
          lq.id as "libraryQuestionId",
          lq.question_type as "questionType",
          lq.library_key as "questionKey",
          COALESCE(pq.display_text_override, lq.default_text) as "displayText",
          COALESCE(pq.is_required_override, false) as "isRequired",
          COALESCE(pq.is_hidden_override, false) as "isHidden",
          COALESCE(pq.placeholder_override, lq.placeholder) as "placeholder",
          COALESCE(pq.helper_text_override, lq.helper_text) as "helperText",
          COALESCE(pq.metadata_overrides, lq.default_metadata) as "metadata",
          COALESCE(pq.options_overrides, lq.default_options) as "options"
        FROM page_questions pq
        JOIN library_questions lq ON pq.library_question_id = lq.id
        WHERE pq.form_page_id = $1
        ORDER BY pq.display_order
      `, [page.id]);
      
      // Process the questions to ensure proper typing and formatting for frontend
      const processedQuestions = questionsData.rows.map(question => ({
        ...question,
        // Ensure options is always an array if it exists
        options: question.options ? 
          (Array.isArray(question.options) ? question.options : []) : 
          undefined
      }));
      
      return {
        ...page,
        questions: processedQuestions
      };
    }));
    
    // 4. Return the complete form definition with all pages and questions
    return res.json({
      id: form.id,
      formKey: form.formKey,
      formTitle: form.formTitle,
      description: form.description,
      isActive: form.isActive,
      pages: pagesWithQuestions
    });
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return res.status(500).json({ message: 'Failed to fetch questionnaire' });
  }
});

// POST endpoint to handle form submissions
router.post('/questionnaires/:formKey/submit', async (req, res) => {
  try {
    const { formKey } = req.params;
    const validatedData = submissionSchema.parse(req.body);
    const { responses } = validatedData;
    
    // First, verify the form exists
    const formResult = await db
      .select()
      .from(forms)
      .where(eq(forms.formKey, formKey))
      .limit(1);
    
    if (formResult.length === 0) {
      return res.status(404).json({ message: `Form with key '${formKey}' not found` });
    }
    
    const form = formResult[0];
    
    // Save the submission to the database
    // Note: You'll need to create a submissions table in your schema
    // For now, we'll just return success
    
    // In a real implementation, you would save the submission like:
    // await db.insert(formSubmissions).values({
    //   formId: form.id,
    //   responses: JSON.stringify(responses),
    //   submittedAt: new Date()
    // });
    
    // For now, just log the submission for debugging
    console.log(`Received submission for form ${formKey}:`, responses);
    
    return res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      submissionId: Math.floor(Math.random() * 100000) // Placeholder ID for now
    });
  } catch (error) {
    console.error('Error processing form submission:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid form data', errors: error.errors });
    }
    return res.status(500).json({ message: 'Failed to process form submission' });
  }
});

export default router;