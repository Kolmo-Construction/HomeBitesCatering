// Calculation utilities for form hidden calculations

import { z } from 'zod';

/**
 * Schema for calculation metadata
 */
export const calculationMetadataSchema = z.object({
  formula: z.string(), // e.g. "{question_1} + {question_2} * 5"
  dataType: z.enum(['number', 'currency', 'percentage']).default('number'),
  precision: z.number().int().min(0).max(10).default(2), // Number of decimal places
  formatOptions: z.object({
    prefix: z.string().optional(), // e.g. "$" for currency
    suffix: z.string().optional(), // e.g. "%" for percentage
  }).optional(),
  description: z.string().optional(), // Internal description of what this calculation does
});

export type CalculationMetadata = z.infer<typeof calculationMetadataSchema>;

/**
 * Parses a formula string and extracts question references
 * @param formula The formula string with question references like "{question_key}"
 * @returns Array of question keys referenced in the formula
 */
export function extractQuestionReferences(formula: string): string[] {
  const regex = /{([^}]+)}/g;
  const matches = formula.match(regex) || [];
  return matches.map(match => match.slice(1, -1)); // Remove the curly braces
}

/**
 * Evaluates a calculation formula using the form data
 * @param formula The formula string with question references like "{question_key}"
 * @param formData Object containing current form data with question keys as properties
 * @returns The calculated result
 */
export function evaluateFormula(formula: string, formData: Record<string, any>): number {
  let evaluableFormula = formula;

  // Replace all question references with their values
  const questionRefs = extractQuestionReferences(formula);
  for (const ref of questionRefs) {
    let value = formData[ref];
    
    // Handle different data types
    if (value === undefined || value === null || value === '') {
      value = 0;
    } else if (Array.isArray(value)) {
      // For checkbox groups, count the number of selected items
      value = value.length;
    } else if (typeof value === 'string') {
      // Try to convert string to number
      const numValue = parseFloat(value);
      value = isNaN(numValue) ? 0 : numValue;
    }
    
    // Replace the reference with the actual value
    evaluableFormula = evaluableFormula.replace(`{${ref}}`, value.toString());
  }

  try {
    // Using Function constructor to evaluate the expression
    // This is safer than eval() but still needs to be used carefully
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${evaluableFormula})`)();
  } catch (error) {
    console.error('Error evaluating formula:', error);
    return 0;
  }
}

/**
 * Formats a calculated value based on the metadata settings
 * @param value The calculated numeric value
 * @param metadata The calculation metadata with formatting options
 * @returns Formatted string representation of the value
 */
export function formatCalculatedValue(value: number, metadata: CalculationMetadata): string {
  const { dataType, precision, formatOptions } = metadata;
  
  // Format the number with the specified precision
  let formatted = value.toFixed(precision);
  
  // Apply prefix/suffix if provided
  if (formatOptions) {
    if (formatOptions.prefix) {
      formatted = formatOptions.prefix + formatted;
    }
    if (formatOptions.suffix) {
      formatted = formatted + formatOptions.suffix;
    }
  } else if (dataType === 'currency') {
    // Default currency formatting
    formatted = '$' + formatted;
  } else if (dataType === 'percentage') {
    // Default percentage formatting
    formatted = formatted + '%';
  }
  
  return formatted;
}