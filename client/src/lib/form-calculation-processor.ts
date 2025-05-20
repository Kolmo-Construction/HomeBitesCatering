/**
 * Utilities for processing calculations during form rendering and submission
 */
import { evaluateFormula, formatCalculatedValue } from './calculation-utils';

/**
 * Processes all hidden calculations in a form, resolving their values
 * based on other form field values.
 * 
 * @param formData The current form data
 * @param questions Array of questions from the form definition
 * @returns Updated form data with calculated values
 */
export function processFormCalculations(
  formData: Record<string, any>,
  questions: Array<{
    questionKey: string;
    questionType: string;
    metadata?: any;
  }>
): Record<string, any> {
  // Create a copy of form data to avoid mutating the original
  const updatedData = { ...formData };
  
  // Find all calculation fields
  const calculationFields = questions.filter(
    q => q.questionType === 'hidden_calculation' && q.metadata?.formula
  );
  
  // If no calculation fields, return original data
  if (calculationFields.length === 0) {
    return formData;
  }
  
  // Process each calculation field
  calculationFields.forEach(field => {
    const { questionKey, metadata } = field;
    
    try {
      // Calculate the value
      const calculatedValue = evaluateFormula(metadata.formula, updatedData);
      
      // Store the raw calculated value
      updatedData[questionKey] = calculatedValue;
      
      // Also store a formatted version if needed
      if (metadata.dataType) {
        updatedData[`${questionKey}_formatted`] = formatCalculatedValue(
          calculatedValue,
          metadata
        );
      }
    } catch (error) {
      console.error(`Error processing calculation for ${questionKey}:`, error);
      // Set to 0 if calculation fails
      updatedData[questionKey] = 0;
    }
  });
  
  return updatedData;
}

/**
 * Determines the order in which calculations should be processed
 * based on their dependencies.
 * 
 * @param questions Array of calculation questions
 * @returns Ordered array of question keys
 */
export function getCalculationProcessingOrder(
  questions: Array<{
    questionKey: string;
    questionType: string;
    metadata?: any;
  }>
): string[] {
  // Get only calculation fields
  const calculationFields = questions.filter(
    q => q.questionType === 'hidden_calculation' && q.metadata?.formula
  );
  
  // Build dependency graph
  const dependencies: Record<string, string[]> = {};
  
  calculationFields.forEach(field => {
    const { questionKey, metadata } = field;
    const referencedFields = extractQuestionReferences(metadata.formula);
    
    // Store dependencies
    dependencies[questionKey] = referencedFields.filter(
      // Only include dependencies that are calculation fields
      ref => calculationFields.some(calc => calc.questionKey === ref)
    );
  });
  
  // Perform topological sort
  const visited = new Set<string>();
  const result: string[] = [];
  
  function visit(key: string) {
    if (visited.has(key)) return;
    visited.add(key);
    
    // Visit all dependencies first
    (dependencies[key] || []).forEach(dep => visit(dep));
    
    // Add this key after all its dependencies
    result.push(key);
  }
  
  // Visit all nodes
  calculationFields.forEach(field => visit(field.questionKey));
  
  return result;
}

/**
 * Extract question references from a formula
 * @param formula The calculation formula
 * @returns Array of question keys that are referenced
 */
function extractQuestionReferences(formula: string): string[] {
  const regex = /{([^}]+)}/g;
  const matches = formula.match(regex) || [];
  return matches.map(match => match.slice(1, -1));
}