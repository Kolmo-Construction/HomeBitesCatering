import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { evaluateFormula } from '../../lib/calculation-utils';

interface QuestionTypeHiddenCalculationProps {
  questionKey: string;
  questionData: {
    metadata: {
      formula: string;
      dataType?: 'number' | 'currency' | 'percentage';
      precision?: number;
      formatOptions?: {
        prefix?: string;
        suffix?: string;
      }
    }
  };
}

/**
 * Hidden calculation field component for forms
 * This component doesn't render anything visible but performs calculations
 * based on other form fields and stores the result.
 */
const QuestionTypeHiddenCalculation: React.FC<QuestionTypeHiddenCalculationProps> = ({
  questionKey,
  questionData
}) => {
  const { watch, setValue } = useFormContext();
  const [lastCalculatedValue, setLastCalculatedValue] = useState<number | null>(null);
  
  // Get the formula from metadata
  const formula = questionData.metadata?.formula || '';
  
  // Watch all form values to recalculate when any field changes
  const allFormValues = watch();
  
  useEffect(() => {
    // Skip if there's no formula
    if (!formula) return;
    
    try {
      // Calculate the value
      const calculatedValue = evaluateFormula(formula, allFormValues);
      
      // Only update if the value has changed
      if (calculatedValue !== lastCalculatedValue) {
        setLastCalculatedValue(calculatedValue);
        
        // Update the form value
        setValue(questionKey, calculatedValue, {
          shouldValidate: true,
          shouldDirty: true,
        });
        
        console.log(`Hidden calculation [${questionKey}]: Formula "${formula}" = ${calculatedValue}`);
      }
    } catch (error) {
      console.error(`Error calculating hidden field [${questionKey}]:`, error);
    }
  }, [formula, allFormValues, setValue, questionKey, lastCalculatedValue]);
  
  // This component doesn't render anything visible
  return null;
};

export default QuestionTypeHiddenCalculation;