// form-structure-upsert.ts
// This script imports the complete form structure with upsert logic for existing questions
// It handles:
// 1. Forms with metadata
// 2. Pages within forms
// 3. Questions on pages
// 4. Conditional logic rules

import { db } from '../server/db';
import * as formSchema from '../shared/form-schema';
import { sql } from 'drizzle-orm';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

// --- Type Definitions for CSV Rows ---
interface FormDefinitionRow {
  FormKey: string;
  Title: string;
  Description: string;
  Version: string;
}

interface PageRow {
  FormKey: string;
  PageOrder: string;
  PageTitle: string;
  Description: string;
}

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

interface OptionRow {
  QuestionKey: string;
  OptionLabel: string;
  OptionValue: string;
  OptionOrder: string;
}

interface ConditionalLogicRow {
  TargetElementKey: string;
  TriggerElementKey: string;
  Condition: string;
  Value: string;
  Action: string;
}

// --- Helper: CSV Parsing ---
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

// --- Helper: Type Mapping ---
function mapQuestionType(csvType: string): typeof formSchema.formQuestionTypeEnum.enumValues[number] {
  const mapping: Record<string, typeof formSchema.formQuestionTypeEnum.enumValues[number]> = {
    'control_head': 'header',
    'control_text': 'text_display',
    'control_textbox': 'textbox',
    'control_textarea': 'textarea',
    'control_email': 'email',
    'control_phone': 'phone',
    'control_number': 'number',
    'control_datetime': 'datetime',
    'control_time': 'time',
    'control_checkbox': 'checkbox_group',
    'control_radio': 'radio_group',
    'control_dropdown': 'dropdown',
    'control_fullname': 'full_name',
    'control_address': 'address',
    'control_matrix': 'matrix',
  };
  
  const mapped = mapping[csvType.toLowerCase()];
  if (!mapped) {
    console.warn(`Unknown question type: ${csvType}, defaulting to textbox`);
    return 'textbox';
  }
  return mapped;
}

function mapConditionType(csvCondition: string): typeof formSchema.conditionalLogicConditionTypeEnum.enumValues[number] {
  const mapping: Record<string, typeof formSchema.conditionalLogicConditionTypeEnum.enumValues[number]> = {
    'EQUALS': 'equals',
    'NOT_EQUALS': 'not_equals',
    'IS_FILLED': 'is_filled',
    'IS_EMPTY': 'is_empty',
    'CONTAINS': 'contains',
    'DOESNT_CONTAIN': 'does_not_contain',
    'LESS_THAN': 'less_than',
    'GREATER_THAN': 'greater_than',
  };
  
  const mapped = mapping[csvCondition];
  if (!mapped) {
    console.warn(`Unknown condition type: ${csvCondition}, defaulting to equals`);
    return 'equals';
  }
  return mapped;
}

function mapActionType(csvAction: string, targetKey: string): typeof formSchema.conditionalLogicActionTypeEnum.enumValues[number] {
  const isPageTarget = targetKey.toLowerCase().startsWith('page_');
  const mapping: Record<string, typeof formSchema.conditionalLogicActionTypeEnum.enumValues[number]> = {
    'SHOW': isPageTarget ? 'show_page' : 'show_question',
    'HIDE': isPageTarget ? 'hide_page' : 'hide_question',
    'SKIP_TO_PAGE': 'skip_to_page',
    'DISABLE': 'disable_option',
    'ENABLE': 'enable_option',
    'REQUIRE': 'require_question',
    'UNREQUIRE': 'unrequire_question',
  };
  
  const mapped = mapping[csvAction];
  if (!mapped) {
    console.warn(`Unknown action type: ${csvAction}, defaulting to ${isPageTarget ? 'show_page' : 'show_question'}`);
    return isPageTarget ? 'show_page' : 'show_question';
  }
  return mapped;
}

// --- Main import function ---
async function importFormStructureWithUpsert() {
  // File paths for CSV data
  const formDefPath = path.join(process.cwd(), 'csv_data', 'Form Definition.csv');
  const pagesPath = path.join(process.cwd(), 'csv_data', 'Pages.csv');
  const questionsPath = path.join(process.cwd(), 'csv_data', 'Questions.csv');
  const optionsPath = path.join(process.cwd(), 'csv_data', 'Options.csv');
  const conditionalLogicPath = path.join(process.cwd(), 'csv_data', 'Conditional Logic.csv');
  
  console.log('Starting form structure import with upsert logic:');
  console.log(`Form definition: ${formDefPath}`);
  console.log(`Pages: ${pagesPath}`);
  console.log(`Questions: ${questionsPath}`);
  console.log(`Options: ${optionsPath}`);
  console.log(`Conditional Logic: ${conditionalLogicPath}`);
  
  // Parse CSVs
  const formDefs = await parseCsv<FormDefinitionRow>(formDefPath);
  const pageRows = await parseCsv<PageRow>(pagesPath);
  const questionRows = await parseCsv<QuestionRow>(questionsPath);
  const optionRows = await parseCsv<OptionRow>(optionsPath);
  const conditionalLogicRows = await parseCsv<ConditionalLogicRow>(conditionalLogicPath);
  
  console.log(`Parsed CSVs: ${formDefs.length} forms, ${pageRows.length} pages, ${questionRows.length} questions, ${optionRows.length} options, ${conditionalLogicRows.length} logic rules`);
  
  // Create default form if none exists
  let validFormDefs = formDefs.length > 0 ? formDefs : [];
  if (validFormDefs.length === 0 && pageRows.length > 0) {
    const uniqueFormKeys = [...new Set(pageRows.map(p => p.FormKey))];
    console.log(`No form definitions found. Creating from page form keys: ${uniqueFormKeys.join(', ')}`);
    
    validFormDefs = uniqueFormKeys.map(formKey => ({
      FormKey: formKey,
      Title: `Form ${formKey}`,
      Description: `Imported form ${formKey}`,
      Version: '1'
    }));
  }
  
  // Tracking maps for database IDs
  const formKeyToDbId = new Map<string, number>();
  const pageCompositeKeyToDbId = new Map<string, number>(); // Key: `${formKey}-${pageOrder}`
  const questionKeyToLibraryId = new Map<string, number>();
  const questionKeyToPageQuestionId = new Map<string, number>();
  const pageKeyToDbId = new Map<string, { type: 'page', id: number }>();
  
  // Find existing questions in library to avoid duplicates
  console.log('Checking for existing questions in library...');
  const uniqueQuestionKeys = [...new Set(questionRows.map(q => q.QuestionKey))];
  const existingQuestions = await db.select({
    id: formSchema.questionLibrary.id,
    key: formSchema.questionLibrary.libraryQuestionKey
  })
  .from(formSchema.questionLibrary)
  .where(sql`${formSchema.questionLibrary.libraryQuestionKey} in (${uniqueQuestionKeys.join(',')})`)
  .execute();
  
  // Create a map of existing questions
  const existingQuestionMap = new Map<string, number>();
  for (const q of existingQuestions) {
    existingQuestionMap.set(q.key, q.id);
    questionKeyToLibraryId.set(q.key, q.id);
  }
  
  console.log(`Found ${existingQuestions.length} existing questions in library out of ${uniqueQuestionKeys.length} unique questions in CSV`);
  
  // Process form data in multiple non-transactional steps to avoid rollbacks
  
  // 1. Import or update forms
  console.log('Importing forms...');
  for (const formDef of validFormDefs) {
    // Check if form already exists
    const existingForm = await db.select({ id: formSchema.forms.id })
      .from(formSchema.forms)
      .where(sql`${formSchema.forms.formKey} = ${formDef.FormKey}`)
      .limit(1)
      .execute();
    
    let formId: number;
    
    if (existingForm.length > 0) {
      formId = existingForm[0].id;
      console.log(`Form ${formDef.FormKey} already exists with ID ${formId}, updating...`);
      
      // Update existing form
      await db.update(formSchema.forms)
        .set({
          formTitle: formDef.Title,
          description: formDef.Description || null,
          version: parseInt(formDef.Version, 10) || 1,
        })
        .where(sql`${formSchema.forms.id} = ${formId}`)
        .execute();
    } else {
      // Insert new form
      const [insertedForm] = await db.insert(formSchema.forms)
        .values({
          formKey: formDef.FormKey,
          formTitle: formDef.Title,
          description: formDef.Description || null,
          version: parseInt(formDef.Version, 10) || 1,
          status: 'draft',
        })
        .returning()
        .execute();
        
      formId = insertedForm.id;
      console.log(`Created new form: ${formDef.Title} (ID: ${formId})`);
    }
    
    formKeyToDbId.set(formDef.FormKey, formId);
  }
  
  // 2. Import Pages
  console.log('Importing pages...');
  for (const page of pageRows) {
    const formId = formKeyToDbId.get(page.FormKey);
    if (!formId) {
      console.warn(`Form with key ${page.FormKey} not found for page ${page.PageTitle}. Skipping.`);
      continue;
    }
    
    // Check if page already exists for this form with this order
    const existingPage = await db.select({ id: formSchema.formPages.id })
      .from(formSchema.formPages)
      .where(sql`${formSchema.formPages.formId} = ${formId} and ${formSchema.formPages.pageOrder} = ${parseInt(page.PageOrder, 10)}`)
      .limit(1)
      .execute();
    
    let pageId: number;
    
    if (existingPage.length > 0) {
      pageId = existingPage[0].id;
      console.log(`Page at order ${page.PageOrder} already exists for form ${page.FormKey}, updating...`);
      
      // Update existing page
      await db.update(formSchema.formPages)
        .set({
          pageTitle: page.PageTitle,
          description: page.Description || null,
        })
        .where(sql`${formSchema.formPages.id} = ${pageId}`)
        .execute();
    } else {
      // Insert new page
      try {
        const [insertedPage] = await db.insert(formSchema.formPages)
          .values({
            formId: formId,
            pageTitle: page.PageTitle,
            pageOrder: parseInt(page.PageOrder, 10),
            description: page.Description || null,
          })
          .returning()
          .execute();
          
        pageId = insertedPage.id;
        console.log(`Created new page: ${page.PageTitle} (ID: ${pageId}, Order: ${insertedPage.pageOrder})`);
      } catch (error) {
        console.error(`Error creating page ${page.PageTitle} at order ${page.PageOrder}:`, error);
        continue;
      }
    }
    
    const pageKey = `${page.FormKey}-${page.PageOrder}`;
    pageCompositeKeyToDbId.set(pageKey, pageId);
    
    // Create a key for conditional logic targets
    const pageIdentifier = `Page_${page.PageOrder}_${page.PageTitle.replace(/[^a-zA-Z0-9]/g, '')}`;
    pageKeyToDbId.set(pageIdentifier, { type: 'page', id: pageId });
  }
  
  // 3. Import Questions to Library
  console.log('Importing questions to library...');
  for (const qKey of uniqueQuestionKeys) {
    // Find the first question with this key
    const questionTemplate = questionRows.find(q => q.QuestionKey === qKey);
    if (!questionTemplate) continue;
    
    const questionType = mapQuestionType(questionTemplate.QuestionType);
    
    // Process options for multiple choice questions
    let defaultOptions = null;
    const questionOptions = optionRows.filter(opt => opt.QuestionKey === qKey);
    
    if (['checkbox_group', 'radio_group', 'dropdown'].includes(questionType) && questionOptions.length > 0) {
      defaultOptions = questionOptions
        .map(opt => ({
          label: opt.OptionLabel,
          value: opt.OptionValue,
          order: parseInt(opt.OptionOrder, 10) || 0,
        }))
        .sort((a, b) => a.order - b.order);
    }
    
    // Metadata from placeholder and helper text
    const defaultMetadata: Record<string, any> = {};
    if (questionTemplate.PlaceholderText) defaultMetadata.placeholder = questionTemplate.PlaceholderText;
    if (questionTemplate.HelperText) defaultMetadata.helper = questionTemplate.HelperText;
    
    try {
      // Check if question already exists in library
      if (existingQuestionMap.has(qKey)) {
        // Update existing question
        const libraryId = existingQuestionMap.get(qKey)!;
        
        await db.update(formSchema.questionLibrary)
          .set({
            defaultText: questionTemplate.QuestionText,
            questionType: questionType,
            defaultOptions: defaultOptions ? JSON.stringify(defaultOptions) : null,
            defaultMetadata: Object.keys(defaultMetadata).length > 0 ? defaultMetadata : null,
            category: 'imported',
          })
          .where(sql`${formSchema.questionLibrary.id} = ${libraryId}`)
          .execute();
          
        questionKeyToLibraryId.set(qKey, libraryId);
        console.log(`Updated library question: ${qKey} (ID: ${libraryId})`);
        
        // Handle matrix rows if this is a matrix question
        if (questionType === 'matrix' && questionOptions.length > 0) {
          // First delete existing matrix rows for this question
          await db.delete(formSchema.libraryMatrixRows)
            .where(sql`${formSchema.libraryMatrixRows.libraryQuestionId} = ${libraryId}`)
            .execute();
            
          // Then add the new rows
          for (const matrixRowOpt of questionOptions) {
            await db.insert(formSchema.libraryMatrixRows)
              .values({
                libraryQuestionId: libraryId,
                rowKey: matrixRowOpt.OptionValue,
                label: matrixRowOpt.OptionLabel,
                rowOrder: parseInt(matrixRowOpt.OptionOrder, 10) || 0,
              })
              .execute();
          }
          
          console.log(`Updated ${questionOptions.length} rows for matrix question ${qKey}`);
        }
      } else {
        // Insert new question
        const [insertedLibQuestion] = await db.insert(formSchema.questionLibrary)
          .values({
            libraryQuestionKey: qKey,
            defaultText: questionTemplate.QuestionText,
            questionType: questionType,
            defaultOptions: defaultOptions ? JSON.stringify(defaultOptions) : null,
            defaultMetadata: Object.keys(defaultMetadata).length > 0 ? defaultMetadata : null,
            category: 'imported',
          })
          .returning()
          .execute();
          
        const libraryId = insertedLibQuestion.id;
        questionKeyToLibraryId.set(qKey, libraryId);
        console.log(`Created new library question: ${qKey} (ID: ${libraryId})`);
        
        // Handle matrix questions if needed
        if (questionType === 'matrix' && questionOptions.length > 0) {
          console.log(`Processing matrix question ${qKey} with ${questionOptions.length} row options`);
          
          for (const matrixRowOpt of questionOptions) {
            await db.insert(formSchema.libraryMatrixRows)
              .values({
                libraryQuestionId: libraryId,
                rowKey: matrixRowOpt.OptionValue,
                label: matrixRowOpt.OptionLabel,
                rowOrder: parseInt(matrixRowOpt.OptionOrder, 10) || 0,
              })
              .execute();
          }
          
          console.log(`Added ${questionOptions.length} rows to matrix question ${qKey}`);
        }
      }
    } catch (error) {
      console.error(`Error processing library question ${qKey}:`, error);
    }
  }
  
  // 4. Import Question Instances to Pages
  console.log('Importing question instances to pages...');
  for (const question of questionRows) {
    const pageKey = `${question.FormKey}-${question.PageOrder}`;
    const pageId = pageCompositeKeyToDbId.get(pageKey);
    const libraryQuestionId = questionKeyToLibraryId.get(question.QuestionKey);
    
    if (!pageId || !libraryQuestionId) {
      console.warn(`Can't import question ${question.QuestionKey}: Missing page (${pageId}) or library question (${libraryQuestionId})`);
      continue;
    }
    
    // Check if this question instance already exists on this page
    const existingPageQuestion = await db.select({ id: formSchema.formPageQuestions.id })
      .from(formSchema.formPageQuestions)
      .where(sql`${formSchema.formPageQuestions.formPageId} = ${pageId} and ${formSchema.formPageQuestions.libraryQuestionId} = ${libraryQuestionId}`)
      .limit(1)
      .execute();
      
    try {
      let pageQuestionId: number;
      
      if (existingPageQuestion.length > 0) {
        pageQuestionId = existingPageQuestion[0].id;
        
        // Update existing page question
        await db.update(formSchema.formPageQuestions)
          .set({
            displayOrder: parseInt(question.QuestionOrder, 10) || 0,
            displayTextOverride: question.QuestionText || null,
            isRequiredOverride: question.Required?.toLowerCase() === 'yes',
            placeholderOverride: question.PlaceholderText || null,
            helperTextOverride: question.HelperText || null,
          })
          .where(sql`${formSchema.formPageQuestions.id} = ${pageQuestionId}`)
          .execute();
          
        console.log(`Updated page question: ${question.QuestionKey} (ID: ${pageQuestionId}) on page ID ${pageId}`);
      } else {
        // Insert new page question
        const [insertedPageQuestion] = await db.insert(formSchema.formPageQuestions)
          .values({
            formPageId: pageId,
            libraryQuestionId: libraryQuestionId,
            displayOrder: parseInt(question.QuestionOrder, 10) || 0,
            displayTextOverride: question.QuestionText || null,
            isRequiredOverride: question.Required?.toLowerCase() === 'yes',
            placeholderOverride: question.PlaceholderText || null,
            helperTextOverride: question.HelperText || null,
          })
          .returning()
          .execute();
          
        pageQuestionId = insertedPageQuestion.id;
        console.log(`Created new page question: ${question.QuestionKey} (ID: ${pageQuestionId}) on page ID ${pageId}`);
      }
      
      questionKeyToPageQuestionId.set(question.QuestionKey, pageQuestionId);
    } catch (error) {
      console.error(`Error importing question instance ${question.QuestionKey}:`, error);
    }
  }
  
  // 5. Import Conditional Logic (if any)
  if (conditionalLogicRows.length > 0) {
    console.log('Importing conditional logic rules...');
    
    // First, clean up old rules to avoid duplicates
    const formIds = Array.from(formKeyToDbId.values());
    if (formIds.length > 0) {
      try {
        // Get existing rule IDs for these forms
        const existingRules = await db.select({ id: formSchema.formRules.id })
          .from(formSchema.formRules)
          .where(sql`${formSchema.formRules.formId} in (${formIds.join(',')})`)
          .execute();
          
        if (existingRules.length > 0) {
          const ruleIds = existingRules.map(r => r.id);
          
          // Delete rule targets first (due to foreign key constraints)
          await db.delete(formSchema.formRuleTargets)
            .where(sql`${formSchema.formRuleTargets.ruleId} in (${ruleIds.join(',')})`)
            .execute();
            
          // Then delete the rules
          await db.delete(formSchema.formRules)
            .where(sql`${formSchema.formRules.id} in (${ruleIds.join(',')})`)
            .execute();
            
          console.log(`Deleted ${existingRules.length} existing rules to avoid duplicates`);
        }
      } catch (error) {
        console.error('Error cleaning up existing rules:', error);
      }
    }
    
    // Now import the new rules
    for (const rule of conditionalLogicRows) {
      // Get trigger question ID
      const triggerQuestionId = questionKeyToPageQuestionId.get(rule.TriggerElementKey);
      if (!triggerQuestionId) {
        console.warn(`Trigger question ${rule.TriggerElementKey} not found for conditional logic. Skipping rule.`);
        continue;
      }
      
      // Get form ID from the trigger question's page
      const triggerQuestion = questionRows.find(q => q.QuestionKey === rule.TriggerElementKey);
      if (!triggerQuestion) {
        console.warn(`No question details found for trigger ${rule.TriggerElementKey}. Skipping rule.`);
        continue;
      }
      
      const formId = formKeyToDbId.get(triggerQuestion.FormKey);
      if (!formId) {
        console.warn(`Form not found for trigger question ${rule.TriggerElementKey}. Skipping rule.`);
        continue;
      }
      
      // Map condition and action types
      const conditionType = mapConditionType(rule.Condition);
      const actionType = mapActionType(rule.Action, rule.TargetElementKey);
      
      try {
        // Insert rule
        const [insertedRule] = await db.insert(formSchema.formRules)
          .values({
            formId: formId,
            triggerFormPageQuestionId: triggerQuestionId,
            conditionType: conditionType,
            conditionValue: rule.Value || null,
            actionType: actionType,
            ruleDescription: `${rule.TriggerElementKey} ${rule.Condition} ${rule.Value || 'value'} -> ${rule.Action} ${rule.TargetElementKey}`,
          })
          .returning()
          .execute();
          
        console.log(`Created rule: ${insertedRule.id} (${rule.Action} ${rule.TargetElementKey})`);
        
        // Insert rule target
        let targetType: 'page' | 'question' = 'question';
        let targetId: number | undefined;
        
        // Check if target is a page
        if (rule.TargetElementKey.toLowerCase().startsWith('page_')) {
          const pageTarget = pageKeyToDbId.get(rule.TargetElementKey);
          if (pageTarget) {
            targetType = 'page';
            targetId = pageTarget.id;
          }
        } else {
          // Target is a question
          targetId = questionKeyToPageQuestionId.get(rule.TargetElementKey);
        }
        
        if (!targetId) {
          console.warn(`Target element ${rule.TargetElementKey} not found. Skipping rule target.`);
          continue;
        }
        
        await db.insert(formSchema.formRuleTargets)
          .values({
            ruleId: insertedRule.id,
            targetType: targetType,
            targetId: targetId,
          })
          .execute();
          
        console.log(`Created rule target: ${targetType} ${targetId} for rule ${insertedRule.id}`);
      } catch (error) {
        console.error(`Error importing conditional logic rule:`, error);
      }
    }
  }
  
  console.log('Form structure import completed successfully!');
}

// Run the import
importFormStructureWithUpsert().catch(error => {
  console.error('Import failed with error:', error);
  process.exit(1);
});