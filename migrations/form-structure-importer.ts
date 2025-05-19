// form-structure-importer.ts
// This script imports the complete form structure from CSV files including:
// 1. Forms with metadata
// 2. Pages within forms
// 3. Questions on pages
// 4. Conditional logic rules

import { db } from '../server/db';
import * as formSchema from '../shared/form-schema';
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

// --- Data quality audit functions ---
function auditFormDefinition(form: FormDefinitionRow): boolean {
  if (!form.FormKey || !form.Title) {
    console.warn(`Form skipped due to missing required fields: ${JSON.stringify(form)}`);
    return false;
  }
  
  // Validate version is a number
  if (form.Version && isNaN(parseInt(form.Version))) {
    console.warn(`Form has invalid version number: ${form.Version}, defaulting to 1`);
    form.Version = '1';
  }
  
  return true;
}

function auditPage(page: PageRow): boolean {
  if (!page.FormKey || !page.PageOrder || !page.PageTitle) {
    console.warn(`Page skipped due to missing required fields: ${JSON.stringify(page)}`);
    return false;
  }
  
  // Validate page order is a number
  if (isNaN(parseInt(page.PageOrder))) {
    console.warn(`Page has invalid order: ${page.PageOrder}, skipping`);
    return false;
  }
  
  return true;
}

function auditQuestion(question: QuestionRow): boolean {
  if (!question.QuestionKey || !question.QuestionType || !question.FormKey || !question.PageOrder) {
    console.warn(`Question skipped due to missing required fields: ${JSON.stringify(question)}`);
    return false;
  }
  
  // Check for common data issues in question text
  if (!question.QuestionText) {
    console.warn(`Question ${question.QuestionKey} has no text, adding default`);
    question.QuestionText = `Question ${question.QuestionKey}`;
  }
  
  // Validate question order is a number
  if (question.QuestionOrder && isNaN(parseInt(question.QuestionOrder))) {
    console.warn(`Question has invalid order: ${question.QuestionOrder}, defaulting to 0`);
    question.QuestionOrder = '0';
  }
  
  return true;
}

function auditOption(option: OptionRow): boolean {
  if (!option.QuestionKey || !option.OptionLabel) {
    console.warn(`Option skipped due to missing required fields: ${JSON.stringify(option)}`);
    return false;
  }
  
  // Set default value if missing
  if (!option.OptionValue) {
    console.warn(`Option for ${option.QuestionKey} has no value, using label as value`);
    option.OptionValue = option.OptionLabel;
  }
  
  // Validate option order is a number
  if (option.OptionOrder && isNaN(parseInt(option.OptionOrder))) {
    console.warn(`Option has invalid order: ${option.OptionOrder}, defaulting to 0`);
    option.OptionOrder = '0';
  }
  
  return true;
}

function auditConditionalLogic(logic: ConditionalLogicRow): boolean {
  if (!logic.TargetElementKey || !logic.TriggerElementKey || !logic.Condition || !logic.Action) {
    console.warn(`Conditional logic skipped due to missing required fields: ${JSON.stringify(logic)}`);
    return false;
  }
  
  return true;
}

// --- Main import function ---
async function importCompleteFormStructure() {
  // File paths for CSV data
  const formDefPath = path.join(process.cwd(), 'csv_data', 'Form Definition.csv');
  const pagesPath = path.join(process.cwd(), 'csv_data', 'Pages.csv');
  const questionsPath = path.join(process.cwd(), 'csv_data', 'Questions.csv');
  const optionsPath = path.join(process.cwd(), 'csv_data', 'Options.csv');
  const conditionalLogicPath = path.join(process.cwd(), 'csv_data', 'Conditional Logic.csv');
  
  console.log('Starting complete form structure import with files:');
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
  
  // If Form Definition is empty, create one from the first page
  let validFormDefs = formDefs.filter(auditFormDefinition);
  if (validFormDefs.length === 0 && pageRows.length > 0) {
    const uniqueFormKeys = [...new Set(pageRows.map(p => p.FormKey))];
    console.log(`No valid form definitions found. Creating from page form keys: ${uniqueFormKeys.join(', ')}`);
    
    validFormDefs = uniqueFormKeys.map(formKey => ({
      FormKey: formKey,
      Title: `Form ${formKey}`,
      Description: `Imported form ${formKey}`,
      Version: '1'
    }));
  }
  
  // Audit data
  const validPages = pageRows.filter(auditPage);
  const validQuestions = questionRows.filter(auditQuestion);
  const validOptions = optionRows.filter(auditOption);
  const validLogicRules = conditionalLogicRows.filter(auditConditionalLogic);
  
  console.log(`After data quality audit: ${validFormDefs.length}/${formDefs.length} forms, ${validPages.length}/${pageRows.length} pages, ${validQuestions.length}/${questionRows.length} questions, ${validOptions.length}/${optionRows.length} options, ${validLogicRules.length}/${conditionalLogicRows.length} logic rules`);
  
  // Tracking maps for database IDs
  const formKeyToDbId = new Map<string, number>();
  const pageCompositeKeyToDbId = new Map<string, number>(); // Key: `${formKey}-${pageOrder}`
  const questionKeyToLibraryId = new Map<string, number>();
  const questionKeyToPageQuestionId = new Map<string, number>();
  const pageKeyToDbId = new Map<string, { type: 'page', id: number }>(); // For conditional logic
  
  // Start transaction to ensure data consistency
  try {
    await db.transaction(async (tx) => {
      // 1. Import Forms
      console.log('Importing forms...');
      for (const formDef of validFormDefs) {
        const [insertedForm] = await tx.insert(formSchema.forms).values({
          formKey: formDef.FormKey,
          formTitle: formDef.Title,
          description: formDef.Description || null,
          version: parseInt(formDef.Version, 10) || 1,
          status: 'draft',
        }).returning();
        
        formKeyToDbId.set(formDef.FormKey, insertedForm.id);
        console.log(`Imported form: ${insertedForm.formTitle} (ID: ${insertedForm.id})`);
      }
      
      // 2. Import Pages
      console.log('Importing pages...');
      for (const page of validPages) {
        const formId = formKeyToDbId.get(page.FormKey);
        if (!formId) {
          console.warn(`Form with key ${page.FormKey} not found for page ${page.PageTitle}. Skipping.`);
          continue;
        }
        
        const [insertedPage] = await tx.insert(formSchema.formPages).values({
          formId: formId,
          pageTitle: page.PageTitle,
          pageOrder: parseInt(page.PageOrder, 10),
          description: page.Description || null,
        }).returning();
        
        const pageKey = `${page.FormKey}-${page.PageOrder}`;
        pageCompositeKeyToDbId.set(pageKey, insertedPage.id);
        
        // Create a key for conditional logic targets
        const pageIdentifier = `Page_${page.PageOrder}_${page.PageTitle.replace(/[^a-zA-Z0-9]/g, '')}`;
        pageKeyToDbId.set(pageIdentifier, { type: 'page', id: insertedPage.id });
        
        console.log(`Imported page: ${insertedPage.pageTitle} (ID: ${insertedPage.id}, Order: ${insertedPage.pageOrder}) for form ID ${formId}`);
      }
      
      // 3. Import Questions to Library
      console.log('Importing questions to library...');
      const uniqueQuestionKeys = [...new Set(validQuestions.map(q => q.QuestionKey))];
      
      for (const qKey of uniqueQuestionKeys) {
        // Find the first question with this key (they should all have the same core attributes)
        const questionTemplate = validQuestions.find(q => q.QuestionKey === qKey);
        if (!questionTemplate) continue;
        
        const questionType = mapQuestionType(questionTemplate.QuestionType);
        
        // Process options for multiple choice questions
        let defaultOptions = null;
        const questionOptions = validOptions.filter(opt => opt.QuestionKey === qKey);
        
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
        
        // Insert question into library
        try {
          const [insertedLibQuestion] = await tx.insert(formSchema.questionLibrary).values({
            libraryQuestionKey: qKey,
            defaultText: questionTemplate.QuestionText,
            questionType: questionType,
            defaultOptions: defaultOptions ? JSON.stringify(defaultOptions) : null,
            defaultMetadata: Object.keys(defaultMetadata).length > 0 ? defaultMetadata : null,
            category: 'imported',
          }).returning();
          
          questionKeyToLibraryId.set(qKey, insertedLibQuestion.id);
          console.log(`Imported library question: ${qKey} (ID: ${insertedLibQuestion.id})`);
          
          // Handle matrix questions if needed
          if (questionType === 'matrix' && questionOptions.length > 0) {
            console.log(`Processing matrix question ${qKey} with ${questionOptions.length} row options`);
            
            for (const matrixRowOpt of questionOptions) {
              await tx.insert(formSchema.libraryMatrixRows).values({
                libraryQuestionId: insertedLibQuestion.id,
                rowKey: matrixRowOpt.OptionValue,
                label: matrixRowOpt.OptionLabel,
                rowOrder: parseInt(matrixRowOpt.OptionOrder, 10) || 0,
              }).execute();
            }
            
            console.log(`Added ${questionOptions.length} rows to matrix question ${qKey}`);
          }
        } catch (error) {
          console.error(`Error importing question ${qKey} to library:`, error);
        }
      }
      
      // 4. Import Question Instances to Pages
      console.log('Importing question instances to pages...');
      for (const question of validQuestions) {
        const pageKey = `${question.FormKey}-${question.PageOrder}`;
        const pageId = pageCompositeKeyToDbId.get(pageKey);
        const libraryQuestionId = questionKeyToLibraryId.get(question.QuestionKey);
        
        if (!pageId || !libraryQuestionId) {
          console.warn(`Can't import question ${question.QuestionKey}: Missing page (${pageId}) or library question (${libraryQuestionId})`);
          continue;
        }
        
        try {
          const [insertedPageQuestion] = await tx.insert(formSchema.formPageQuestions).values({
            formPageId: pageId,
            libraryQuestionId: libraryQuestionId,
            displayOrder: parseInt(question.QuestionOrder, 10) || 0,
            displayTextOverride: question.QuestionText || null,
            isRequiredOverride: question.Required?.toLowerCase() === 'yes',
            placeholderOverride: question.PlaceholderText || null,
            helperTextOverride: question.HelperText || null,
          }).returning();
          
          questionKeyToPageQuestionId.set(question.QuestionKey, insertedPageQuestion.id);
          console.log(`Imported page question: ${question.QuestionKey} (ID: ${insertedPageQuestion.id}) on page ID ${pageId}`);
        } catch (error) {
          console.error(`Error importing question instance ${question.QuestionKey}:`, error);
        }
      }
      
      // 5. Import Conditional Logic
      if (validLogicRules.length > 0) {
        console.log('Importing conditional logic rules...');
        
        for (const rule of validLogicRules) {
          // Get trigger question ID
          const triggerQuestionId = questionKeyToPageQuestionId.get(rule.TriggerElementKey);
          if (!triggerQuestionId) {
            console.warn(`Trigger question ${rule.TriggerElementKey} not found for conditional logic. Skipping rule.`);
            continue;
          }
          
          // Get form ID from the trigger question's page
          const triggerQuestion = validQuestions.find(q => q.QuestionKey === rule.TriggerElementKey);
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
            const [insertedRule] = await tx.insert(formSchema.formRules).values({
              formId: formId,
              triggerFormPageQuestionId: triggerQuestionId,
              conditionType: conditionType,
              conditionValue: rule.Value || null,
              actionType: actionType,
              ruleDescription: `${rule.TriggerElementKey} ${rule.Condition} ${rule.Value || 'value'} -> ${rule.Action} ${rule.TargetElementKey}`,
            }).returning();
            
            console.log(`Imported rule: ${insertedRule.id} (${rule.Action} ${rule.TargetElementKey})`);
            
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
            
            await tx.insert(formSchema.formRuleTargets).values({
              ruleId: insertedRule.id,
              targetType: targetType,
              targetId: targetId,
            }).execute();
            
            console.log(`Imported rule target: ${targetType} ${targetId} for rule ${insertedRule.id}`);
          } catch (error) {
            console.error(`Error importing conditional logic rule:`, error);
          }
        }
      }
      
      console.log('Form structure import completed successfully!');
    });
    
    console.log('All data imported and transaction committed.');
  } catch (error) {
    console.error('Error during import, transaction rolled back:', error);
  }
}

// Run the import
importCompleteFormStructure().catch(error => {
  console.error('Import failed with error:', error);
  process.exit(1);
});