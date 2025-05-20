import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { evaluateFormula } from '../../lib/calculation-utils';

interface HiddenCalculationRendererProps {
  questionKey: string;
  metadata: {
    formula: string;
    dataType?: 'number' | 'currency' | 'percentage';
    precision?: number;
    formatOptions?: {
      prefix?: string;
      suffix?: string;
    };
    description?: string;
  };
}

/**
 * Component that processes a hidden calculation field in a form
 * This component doesn't render any visible UI but calculates values
 * based on other form field values in real-time.
 */
const HiddenCalculationRenderer: React.FC<HiddenCalculationRendererProps> = ({
  questionKey,
  metadata
}) => {
  const { watch, setValue } = useFormContext();
  
  // Watch all form values to recalculate when any field changes
  const formValues = watch();
  
  useEffect(() => {
    if (!metadata?.formula) {
      console.warn(`Hidden calculation [${questionKey}] has no formula defined`);
      return;
    }
    
    try {
      // Calculate the value based on the formula and current form values
      const calculatedValue = evaluateFormula(metadata.formula, formValues);
      
      // Update the form with the calculated value
      setValue(questionKey, calculatedValue, {
        shouldValidate: true,
        shouldDirty: true,
      });
      
      // Also set a formatted version if needed
      if (metadata.dataType) {
        const precision = metadata.precision || 2;
        let formattedValue = calculatedValue.toFixed(precision);
        
        // Apply prefix/suffix if provided
        if (metadata.formatOptions?.prefix) {
          formattedValue = metadata.formatOptions.prefix + formattedValue;
        } else if (metadata.dataType === 'currency') {
          formattedValue = '$' + formattedValue;
        }
        
        if (metadata.formatOptions?.suffix) {
          formattedValue = formattedValue + metadata.formatOptions.suffix;
        } else if (metadata.dataType === 'percentage') {
          formattedValue = formattedValue + '%';
        }
        
        setValue(`${questionKey}_formatted`, formattedValue);
      }
      
      console.log(`Hidden calculation [${questionKey}] = ${calculatedValue}`);
    } catch (error) {
      console.error(`Error calculating [${questionKey}]:`, error);
      // Set a default value of 0 if calculation fails
      setValue(questionKey, 0);
    }
  }, [questionKey, metadata, formValues, setValue]);
  
  // This component doesn't render anything visible
  return null;
};

export default HiddenCalculationRenderer;