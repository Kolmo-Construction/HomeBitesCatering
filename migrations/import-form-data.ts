// import-form-data.ts
import { db } from '../server/db'; // Import database client
import * as formSchema from '../shared/form-schema'; // Import all from form schema
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

// --- Type Definitions for CSV Rows (match your CSV headers) ---
interface FormDefinitionRow {
  FormKey: string;
  Title: string;
  Description: string;
  Version: string; // Needs parsing to number
}

interface PageRow {
  FormKey: string;
  PageOrder: string; // Needs parsing to number
  PageTitle: string;
  Description: string;
}

interface QuestionRow {
  FormKey: string;
  PageOrder: string; // Needs parsing to number
  QuestionOrder: string; // Needs parsing to number
  QuestionType: string;
  QuestionText: string;
  QuestionKey: string;
  Required: string; // "Yes" or "No"
  PlaceholderText: string;
  HelperText: string;
}

interface OptionRow {
  QuestionKey: string;
  OptionLabel: string;
  OptionValue: string;
  OptionOrder: string; // Needs parsing to number
}

interface ConditionalLogicRow {
  TargetElementKey: string;
  TriggerElementKey: string;
  Condition: string;
  Value: string;
  Action: string;
}

// --- Helper: CSV Parsing Function ---
async function parseCsv<T>(filePath: string): Promise<T[]> {
  const csvFile = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve, reject) => {
    Papa.parse<T>(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
}

// --- Helper: Mappers ---
function mapQuestionType(csvType: string): (typeof formSchema.formQuestionTypeEnum.enumValues)[number] {
  const mapping: Record<string, (typeof formSchema.formQuestionTypeEnum.enumValues)[number]> = {
    'control_head': 'header',
    'control_text': 'text_display', // Assuming control_text is for static text
    'control_textbox': 'textbox',
    'control_textarea': 'textarea',
    'control_email': 'email',
    'control_phone': 'phone',
    'control_number': 'number',
    'control_datetime': 'datetime',
    'control_time': 'time',
    'control_checkbox': 'checkbox_group', // Maps to checkbox_group
    'control_radio': 'radio_group',       // Maps to radio_group
    'control_dropdown': 'dropdown',
    'control_fullname': 'full_name',
    'control_address': 'address',
    'control_matrix': 'matrix',
    // Add other mappings as needed
  };
  const mapped = mapping[csvType.toLowerCase()];
  if (!mapped) throw new Error(`Unsupported CSV question type: ${csvType}`);
  return mapped;
}

function mapConditionType(csvCondition: string): (typeof formSchema.conditionalLogicConditionTypeEnum.enumValues)[number] {
  const mapping: Record<string, (typeof formSchema.conditionalLogicConditionTypeEnum.enumValues)[number]> = {
    'EQUALS': 'equals',
    'NOT_EQUALS': 'not_equals',
    'IS_FILLED': 'is_filled',
    'CONTAINS': 'contains',
    'LESS_THAN': 'less_than',
    // Add other mappings
  };
  const mapped = mapping[csvCondition];
  if (!mapped) throw new Error(`Unsupported CSV condition type: ${csvCondition}`);
  return mapped;
}

function mapActionType(csvAction: string, targetKey: string): (typeof formSchema.conditionalLogicActionTypeEnum.enumValues)[number] {
    const isPageTarget = targetKey.toLowerCase().startsWith('page_');
    const mapping: Record<string, (typeof formSchema.conditionalLogicActionTypeEnum.enumValues)[number]> = {
        'SHOW': isPageTarget ? 'show_page' : 'show_question',
        'HIDE': isPageTarget ? 'hide_page' : 'hide_question',
        'SKIP_TO_PAGE': 'skip_to_page',
        'DISABLE': 'disable_option', // Assuming this targets an option within a question
        // Add other mappings
    };
    const mapped = mapping[csvAction];
    if (!mapped) throw new Error(`Unsupported CSV action type: ${csvAction}`);
    return mapped;
}

// --- Main Import Function ---
async function importFormData() {
  // Paths to your CSV files - updated to match the root directory structure
  const formDefPath = path.join(process.cwd(), 'csv_data', 'Form Definition.csv');
  const pagesPath = path.join(process.cwd(), 'csv_data', 'Pages.csv');
  const questionsPath = path.join(process.cwd(), 'csv_data', 'Questions.csv');
  const optionsPath = path.join(process.cwd(), 'csv_data', 'Options.csv');
  const conditionalLogicPath = path.join(process.cwd(), 'csv_data', 'Conditional Logic.csv');

  console.log('Starting data import with files:');
  console.log(`Form definition: ${formDefPath}`);
  console.log(`Pages: ${pagesPath}`);
  console.log(`Questions: ${questionsPath}`);
  console.log(`Options: ${optionsPath}`);
  console.log(`Conditional Logic: ${conditionalLogicPath}`);

  // Parse all CSVs
  const formDefs = await parseCsv<FormDefinitionRow>(formDefPath);
  const pageRows = await parseCsv<PageRow>(pagesPath);
  const questionRows = await parseCsv<QuestionRow>(questionsPath);
  const optionRows = await parseCsv<OptionRow>(optionsPath);
  const conditionalLogicRows = await parseCsv<ConditionalLogicRow>(conditionalLogicPath);

  console.log(`Parsed CSVs: ${formDefs.length} forms, ${pageRows.length} pages, ${questionRows.length} questions, ${optionRows.length} options, ${conditionalLogicRows.length} logic rules`);

  // Create FormKey from first page if form definition is empty
  if (formDefs.length === 0 && pageRows.length > 0) {
    const formKey = pageRows[0].FormKey;
    formDefs.push({
      FormKey: formKey,
      Title: `Form ${formKey}`,
      Description: `Imported form ${formKey}`,
      Version: '1'
    });
    console.log(`Created form definition from first page: ${formKey}`);
  }

  // ID Maps
  const formKeyToDbId = new Map<string, number>();
  const pageCompositeKeyToDbId = new Map<string, number>(); // Key: `${formKey}-${pageOrder}`
  const questionKeyToLibId = new Map<string, number>();
  // Map for original element keys (e.g., "id_10", "Page_6_TacoFiesta") to their DB IDs
  const elementKeyToDbId = new Map<string, { type: 'question' | 'page', id: number }>();

  await db.transaction(async (tx) => {
    // 1. Import Forms
    for (const formDef of formDefs) {
      const [insertedForm] = await tx.insert(formSchema.forms).values({
        formKey: formDef.FormKey,
        formTitle: formDef.Title,
        description: formDef.Description,
        version: parseInt(formDef.Version, 10),
        status: 'draft', // Or derive from CSV if available
      }).returning();
      formKeyToDbId.set(formDef.FormKey, insertedForm.id);
      console.log(`Inserted form: ${insertedForm.formTitle} (ID: ${insertedForm.id})`);
    }

    // 2. Import Form Pages
    for (const pageRow of pageRows) {
      const formId = formKeyToDbId.get(pageRow.FormKey);
      if (!formId) {
        console.warn(`Form with key ${pageRow.FormKey} not found for page ${pageRow.PageTitle}. Skipping.`);
        continue;
      }
      const [insertedPage] = await tx.insert(formSchema.formPages).values({
        formId: formId,
        pageTitle: pageRow.PageTitle,
        pageOrder: parseInt(pageRow.PageOrder, 10),
        description: pageRow.Description,
      }).returning();
      const pageKey = `${pageRow.FormKey}-${pageRow.PageOrder}`;
      pageCompositeKeyToDbId.set(pageKey, insertedPage.id);
      
      // Map page identifier to DB ID
      const pdfPageKey = `Page_${insertedPage.pageOrder}_${insertedPage.pageTitle?.replace(/[^a-zA-Z0-9]/g, '')}`;
      elementKeyToDbId.set(pdfPageKey, { type: 'page', id: insertedPage.id });
      console.log(`Inserted page: ${insertedPage.pageTitle} (ID: ${insertedPage.id}) for form ID ${formId}`);
    }

    // 3. Populate Question Library (and Matrix Structures if applicable)
    const uniqueQuestionKeys = new Set(questionRows.map(q => q.QuestionKey));
    for (const qKey of uniqueQuestionKeys) {
      const questionTemplate = questionRows.find(q => q.QuestionKey === qKey);
      if (!questionTemplate) continue;

      const questionType = mapQuestionType(questionTemplate.QuestionType);
      let defaultOptions: any = null;

      if (['checkbox_group', 'radio_group', 'dropdown'].includes(questionType)) {
        defaultOptions = optionRows
          .filter(opt => opt.QuestionKey === qKey)
          .map(opt => ({
            label: opt.OptionLabel,
            value: opt.OptionValue,
            order: parseInt(opt.OptionOrder, 10),
          }))
          .sort((a, b) => a.order - b.order);
      }

      // Basic metadata from placeholder and helper text
      const defaultMetadata: Record<string, any> = {};
      if (questionTemplate.PlaceholderText) defaultMetadata.placeholder = questionTemplate.PlaceholderText;
      if (questionTemplate.HelperText) defaultMetadata.helper = questionTemplate.HelperText;

      const [insertedLibQuestion] = await tx.insert(formSchema.questionLibrary).values({
        libraryQuestionKey: qKey,
        defaultText: questionTemplate.QuestionText,
        questionType: questionType,
        defaultOptions: defaultOptions,
        defaultMetadata: Object.keys(defaultMetadata).length > 0 ? defaultMetadata : null,
        // category: derive if possible
      }).returning();
      questionKeyToLibId.set(qKey, insertedLibQuestion.id);
      console.log(`Inserted library question: ${qKey} (ID: ${insertedLibQuestion.id})`);

      // Handling Matrix Questions (libraryMatrixRows, libraryMatrixColumns)
      if (questionType === 'matrix') {
        // Example: Assume OptionLabel is the matrix row label, OptionValue is a row_key
        const matrixRowOptions = optionRows.filter(opt => opt.QuestionKey === qKey);
        for (const matrixRowOpt of matrixRowOptions) {
          await tx.insert(formSchema.libraryMatrixRows).values({
            libraryQuestionId: insertedLibQuestion.id,
            rowKey: matrixRowOpt.OptionValue, // Or generate a key
            label: matrixRowOpt.OptionLabel,
            // price: extract from OptionLabel if possible
            rowOrder: parseInt(matrixRowOpt.OptionOrder, 10),
          }).execute();
        }
        console.warn(`Matrix question ${qKey} added to library. Columns might need manual setup.`);
      }
    }

    // 4. Import Form Page Questions (Instances)
    for (const qRow of questionRows) {
      const formId = formKeyToDbId.get(qRow.FormKey);
      const pageKey = `${qRow.FormKey}-${qRow.PageOrder}`;
      const pageId = pageCompositeKeyToDbId.get(pageKey);
      const libraryQuestionId = questionKeyToLibId.get(qRow.QuestionKey);

      if (!formId || !pageId || !libraryQuestionId) {
        console.warn(`Skipping question instance ${qRow.QuestionKey} due to missing form/page/library item.`);
        continue;
      }

      const [insertedPageQuestion] = await tx.insert(formSchema.formPageQuestions).values({
        formPageId: pageId,
        libraryQuestionId: libraryQuestionId,
        displayOrder: parseInt(qRow.QuestionOrder, 10),
        displayTextOverride: qRow.QuestionText, // Assuming CSV QuestionText is the instance text
        isRequiredOverride: qRow.Required?.toLowerCase() === 'yes',
        placeholderOverride: qRow.PlaceholderText || null,
        helperTextOverride: qRow.HelperText || null,
        // metadataOverrides, optionsOverrides - if you have CSV columns for these
      }).returning();
      // Map the original QuestionKey to the formPageQuestion.id
      elementKeyToDbId.set(qRow.QuestionKey, { type: 'question', id: insertedPageQuestion.id });
      console.log(`Inserted page question: ${qRow.QuestionKey} (ID: ${insertedPageQuestion.id}) on page ID ${pageId}`);
    }

    // 5. Import Conditional Logic
    for (const ruleRow of conditionalLogicRows) {
        const formId = formKeyToDbId.get(formDefs[0].FormKey); // Assuming all rules belong to the first form in defs for simplicity
        if (!formId) {
            console.warn(`Cannot determine form ID for rule involving trigger ${ruleRow.TriggerElementKey}. Skipping.`);
            continue;
        }

        const triggerInfo = elementKeyToDbId.get(ruleRow.TriggerElementKey);
        if (!triggerInfo || triggerInfo.type !== 'question') {
            console.warn(`Trigger element ${ruleRow.TriggerElementKey} not found or not a question. Skipping rule.`);
            continue;
        }
        const triggerFormPageQuestionId = triggerInfo.id;

        const conditionType = mapConditionType(ruleRow.Condition);
        const actionType = mapActionType(ruleRow.Action, ruleRow.TargetElementKey);

        const [insertedRule] = await tx.insert(formSchema.formRules).values({
            formId: formId,
            triggerFormPageQuestionId: triggerFormPageQuestionId,
            conditionType: conditionType,
            conditionValue: ruleRow.Value || null,
            actionType: actionType,
            ruleDescription: `${ruleRow.TriggerElementKey} ${ruleRow.Condition} ${ruleRow.Value} -> ${ruleRow.Action} ${ruleRow.TargetElementKey}`,
            // executionOrder: if you have this
        }).returning();
        console.log(`Inserted rule ID: ${insertedRule.id}`);

        // Handle Target
        const targetInfo = elementKeyToDbId.get(ruleRow.TargetElementKey);
        if (!targetInfo) {
            console.warn(`Target element ${ruleRow.TargetElementKey} not found for rule ID ${insertedRule.id}. Skipping target.`);
            continue;
        }

        await tx.insert(formSchema.formRuleTargets).values({
            ruleId: insertedRule.id,
            targetType: targetInfo.type as any, // 'question' or 'page' - using type assertion
            targetId: targetInfo.id,
        }).execute();
        console.log(`Inserted rule target: ${ruleRow.TargetElementKey} for rule ID ${insertedRule.id}`);
    }

    console.log('Form data import completed successfully!');
  });
}

// Execute the import
importFormData().catch(error => {
  console.error('Error during form data import:', error);
  process.exit(1);
});

// Export for use in other modules
export { importFormData };