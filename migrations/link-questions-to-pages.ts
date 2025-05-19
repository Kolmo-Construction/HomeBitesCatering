// link-questions-to-pages.ts
// This script specifically links existing questions in the library to form pages
// It assumes the form and pages have already been created

import { db } from '../server/db';
import * as formSchema from '../shared/form-schema';
import { eq, sql } from 'drizzle-orm';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

// CSV structure type
interface QuestionRow {
  FormKey: string;
  PageOrder: string;
  QuestionOrder: string;
  QuestionType: string;
  QuestionText: string;
  QuestionKey: string;
  Required: string;
  PlaceholderText: string;
  HelperText: string;
}

// Parse CSV helper
async function parseCsv<T>(filePath: string): Promise<T[]> {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return [];
    }
    
    const csvFile = fs.readFileSync(filePath, 'utf8');
    return new Promise((resolve, reject) => {
      Papa.parse<T>(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error),
      });
    });
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return [];
  }
}

async function linkQuestionsToPages() {
  console.log('Starting question-to-page linking process...');
  
  // Path to questions CSV
  const questionsPath = path.join(process.cwd(), 'csv_data', 'Questions.csv');
  
  // Parse Questions CSV
  const questionRows = await parseCsv<QuestionRow>(questionsPath);
  console.log(`Parsed ${questionRows.length} questions from CSV`);
  
  // Get form ID for HB2025
  const [formResult] = await db.select({ id: formSchema.forms.id })
    .from(formSchema.forms)
    .where(eq(formSchema.forms.formKey, 'HB2025'))
    .limit(1)
    .execute();
    
  if (!formResult) {
    console.error('Form HB2025 not found in database. Please import the form first.');
    return;
  }
  
  const formId = formResult.id;
  console.log(`Found form HB2025 with ID ${formId}`);
  
  // Get all pages for this form
  const formPages = await db.select({
    id: formSchema.formPages.id,
    order: formSchema.formPages.pageOrder,
    title: formSchema.formPages.pageTitle
  })
  .from(formSchema.formPages)
  .where(eq(formSchema.formPages.formId, formId))
  .orderBy(formSchema.formPages.pageOrder)
  .execute();
  
  console.log(`Found ${formPages.length} pages for form HB2025`);
  
  // Create a map of page order to page ID
  const pageOrderToId = new Map<number, number>();
  for (const page of formPages) {
    pageOrderToId.set(page.order, page.id);
  }
  
  // Get all questions from the library
  const libraryQuestions = await db.select({
    id: formSchema.questionLibrary.id,
    key: formSchema.questionLibrary.libraryQuestionKey
  })
  .from(formSchema.questionLibrary)
  .execute();
  
  // Map question keys to IDs
  const questionKeyToId = new Map<string, number>();
  for (const q of libraryQuestions) {
    questionKeyToId.set(q.key, q.id);
  }
  
  console.log(`Found ${libraryQuestions.length} questions in library`);
  
  // Check for existing page-question links and delete them if found
  const existingPageQuestions = await db.select({ id: formSchema.formPageQuestions.id })
    .from(formSchema.formPageQuestions)
    .where(sql`${formSchema.formPageQuestions.formPageId} IN (SELECT id FROM form_pages WHERE form_id = ${formId})`)
    .execute();
    
  if (existingPageQuestions.length > 0) {
    console.log(`Found ${existingPageQuestions.length} existing page-question links for this form. Removing them for clean import...`);
    await db.delete(formSchema.formPageQuestions)
      .where(sql`${formSchema.formPageQuestions.formPageId} IN (SELECT id FROM form_pages WHERE form_id = ${formId})`)
      .execute();
  }
  
  // Now link questions to pages
  let successCount = 0;
  let errorCount = 0;
  
  for (const question of questionRows) {
    const pageOrder = parseInt(question.PageOrder, 10);
    const pageId = pageOrderToId.get(pageOrder);
    const libraryQuestionId = questionKeyToId.get(question.QuestionKey);
    
    if (!pageId) {
      console.warn(`Page with order ${pageOrder} not found for form HB2025. Skipping question ${question.QuestionKey}.`);
      errorCount++;
      continue;
    }
    
    if (!libraryQuestionId) {
      console.warn(`Question ${question.QuestionKey} not found in library. Skipping.`);
      errorCount++;
      continue;
    }
    
    try {
      // Insert question link
      await db.insert(formSchema.formPageQuestions)
        .values({
          formPageId: pageId,
          libraryQuestionId: libraryQuestionId,
          displayOrder: parseInt(question.QuestionOrder, 10) || 0,
          displayTextOverride: question.QuestionText || null,
          isRequiredOverride: question.Required?.toLowerCase() === 'yes',
          placeholderOverride: question.PlaceholderText || null,
          helperTextOverride: question.HelperText || null,
        })
        .execute();
        
      successCount++;
    } catch (error) {
      console.error(`Error linking question ${question.QuestionKey} to page ${pageId}:`, error);
      errorCount++;
    }
  }
  
  console.log(`Linking complete: ${successCount} questions linked to pages, ${errorCount} errors`);
}

// Run the import
linkQuestionsToPages().catch(error => {
  console.error('Linking failed with error:', error);
  process.exit(1);
});