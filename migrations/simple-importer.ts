// simple-importer.ts - A simplified CSV importer
import { db } from '../server/db';
import {
  forms,
  formPages,
  questionLibrary,
  formQuestionTypeEnum
} from '../shared/form-schema';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

// Parse CSV file
async function parseCsv<T>(filePath: string): Promise<T[]> {
  try {
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

// Map question type from CSV to database enum
function mapQuestionType(csvType: string): typeof formQuestionTypeEnum.enumValues[number] {
  const mapping: Record<string, typeof formQuestionTypeEnum.enumValues[number]> = {
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
    return 'textbox'; // Default to textbox instead of throwing error
  }
  return mapped;
}

// Main import function
async function importQuestionLibrary() {
  const questionsPath = path.join(process.cwd(), 'csv_data', 'Questions.csv');
  const optionsPath = path.join(process.cwd(), 'csv_data', 'Options.csv');
  
  console.log('Starting library import with files:');
  console.log(`Questions: ${questionsPath}`);
  console.log(`Options: ${optionsPath}`);
  
  // Parse CSVs
  const questionRows = await parseCsv<{
    QuestionKey: string;
    QuestionType: string;
    QuestionText: string;
    Required: string;
    PlaceholderText: string;
    HelperText: string;
  }>(questionsPath);
  
  const optionRows = await parseCsv<{
    QuestionKey: string;
    OptionLabel: string;
    OptionValue: string;
    OptionOrder: string;
  }>(optionsPath);
  
  console.log(`Parsed ${questionRows.length} questions and ${optionRows.length} options`);
  
  // Get unique question keys
  const uniqueQuestionKeys = [...new Set(questionRows.map(q => q.QuestionKey))];
  console.log(`Found ${uniqueQuestionKeys.length} unique questions to import`);
  
  // Import each unique question
  let successCount = 0;
  for (const qKey of uniqueQuestionKeys) {
    try {
      // Find the first question with this key
      const q = questionRows.find(q => q.QuestionKey === qKey);
      if (!q) continue;
      
      const questionType = mapQuestionType(q.QuestionType);
      
      // Process options if it's a multiple choice question
      let defaultOptions = null;
      if (['checkbox_group', 'radio_group', 'dropdown'].includes(questionType)) {
        defaultOptions = optionRows
          .filter(opt => opt.QuestionKey === qKey)
          .map(opt => ({
            label: opt.OptionLabel,
            value: opt.OptionValue,
            order: parseInt(opt.OptionOrder, 10) || 0,
          }))
          .sort((a, b) => a.order - b.order);
      }
      
      // Basic metadata
      const defaultMetadata: Record<string, any> = {};
      if (q.PlaceholderText) defaultMetadata.placeholder = q.PlaceholderText;
      if (q.HelperText) defaultMetadata.helper = q.HelperText;
      
      // Insert the question directly (no transaction)
      const [inserted] = await db.insert(questionLibrary).values({
        libraryQuestionKey: qKey,
        defaultText: q.QuestionText,
        questionType: questionType,
        defaultOptions: defaultOptions,
        defaultMetadata: Object.keys(defaultMetadata).length > 0 ? defaultMetadata : null,
        category: 'imported', // Mark as imported
      }).returning();
      
      console.log(`Imported question ${qKey} (${questionType}) with ID ${inserted.id}`);
      successCount++;
      
      // Add a small delay to avoid overloading the database
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error importing question ${qKey}:`, error);
    }
  }
  
  console.log(`Successfully imported ${successCount} questions out of ${uniqueQuestionKeys.length}`);
}

// Run the import
importQuestionLibrary().catch(error => {
  console.error('Import failed:', error);
});