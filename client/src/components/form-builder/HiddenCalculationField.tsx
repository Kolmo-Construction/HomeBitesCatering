import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { evaluateFormula } from '../../lib/calculation-utils';

interface HiddenCalculationFieldProps {
  questionKey: string;
  formula: string;
  onChange?: (value: number) => void;
}

/**
 * Hidden calculation field for forms
 * This component doesn't render anything visible but calculates values based on other form fields
 */
const HiddenCalculationField: React.FC<HiddenCalculationFieldProps> = ({
  questionKey,
  formula,
  onChange
}) => {
  const { watch, setValue } = useFormContext();
  
  // Watch all form values to recalculate when any field changes
  const allFormValues = watch();
  
  useEffect(() => {
    // Skip if there's no formula
    if (!formula) return;
    
    try {
      // Calculate the value
      const calculatedValue = evaluateFormula(formula, allFormValues);
      
      // Update the form value
      setValue(questionKey, calculatedValue, {
        shouldValidate: true,
        shouldDirty: true,
      });
      
      // Call onChange if provided
      if (onChange) {
        onChange(calculatedValue);
      }
    } catch (error) {
      console.error('Error calculating hidden field value:', error);
    }
  }, [formula, allFormValues, setValue, questionKey, onChange]);
  
  // This component doesn't render anything visible
  return null;
};

export default HiddenCalculationField;