import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Types for form data
export interface FormField {
  id: string;
  questionKey: string;
  questionType: string;
  displayText: string;
  isRequired: boolean;
  helperText?: string;
  placeholder?: string;
  options?: { optionText: string; optionValue: string; order: number }[];
  min?: number;
  max?: number;
  metadata?: Record<string, any>;
}

export interface FormPage {
  id: number;
  pageTitle: string;
  pageOrder: number;
  description?: string;
  questions: FormField[];
}

export interface FormDefinition {
  id: number;
  formKey: string;
  formTitle: string;
  description?: string;
  isActive: boolean;
  pages: FormPage[];
  rules?: any[];
}

// Animated variants for staggered field appearance
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// This component dynamically renders form fields based on question type
export const DynamicFormField = ({ 
  question, 
  value, 
  onChange,
  animate = true
}: { 
  question: FormField;
  value: any;
  onChange: (questionKey: string, value: any) => void;
  animate?: boolean;
}) => {
  const Component = animate ? motion.div : 'div';
  const props = animate ? { variants: item } : {};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { type, checked, value: inputValue } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      onChange(question.questionKey, checked);
    } else {
      onChange(question.questionKey, inputValue);
    }
  };

  const handleMultiCheckboxChange = (optionValue: string, checked: boolean) => {
    let currentValues = Array.isArray(value) ? value : [];
    if (checked) {
      currentValues = [...currentValues, optionValue];
    } else {
      currentValues = currentValues.filter(v => v !== optionValue);
    }
    onChange(question.questionKey, currentValues);
  };

  switch (question.questionType) {
    case 'textbox':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <input 
            type="text" 
            className="w-full px-3 py-2 border rounded-md"
            placeholder={question.placeholder || `Enter ${question.displayText.toLowerCase()}`}
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          />
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'textarea':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <textarea 
            className="w-full px-3 py-2 border rounded-md h-24"
            placeholder={question.placeholder || `Enter ${question.displayText.toLowerCase()}`}
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          ></textarea>
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'email':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <input 
            type="email" 
            className="w-full px-3 py-2 border rounded-md"
            placeholder={question.placeholder || "Enter email address"}
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          />
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'phone':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <input 
            type="tel" 
            className="w-full px-3 py-2 border rounded-md"
            placeholder={question.placeholder || "Enter phone number"}
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          />
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'number':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <input 
            type="number" 
            className="w-full px-3 py-2 border rounded-md"
            placeholder={question.placeholder || "Enter number"}
            min={question.min}
            max={question.max}
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          />
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'date':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <input 
            type="date" 
            className="w-full px-3 py-2 border rounded-md"
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          />
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'time':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <input 
            type="time" 
            className="w-full px-3 py-2 border rounded-md"
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          />
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'dropdown':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <select 
            className="w-full px-3 py-2 border rounded-md"
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          >
            <option value="">{question.placeholder || "Select an option"}</option>
            {question.options?.sort((a, b) => a.order - b.order).map(option => (
              <option key={option.optionValue} value={option.optionValue}>
                {option.optionText}
              </option>
            ))}
          </select>
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'radio_group':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <div className="space-y-2 mt-2">
            {question.options?.sort((a, b) => a.order - b.order).map(option => (
              <label key={option.optionValue} className="flex items-center space-x-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                <input 
                  type="radio" 
                  name={question.questionKey}
                  value={option.optionValue}
                  checked={value === option.optionValue}
                  onChange={handleChange}
                  required={question.isRequired}
                />
                <span>{option.optionText}</span>
              </label>
            ))}
          </div>
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'checkbox_group':
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <div className="grid grid-cols-2 gap-2">
            {question.options?.sort((a, b) => a.order - b.order).map(option => (
              <label 
                key={option.optionValue} 
                className="flex items-center border p-3 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <input 
                  type="checkbox" 
                  className="mr-2"
                  checked={Array.isArray(value) && value.includes(option.optionValue)}
                  onChange={(e) => handleMultiCheckboxChange(option.optionValue, e.target.checked)}
                />
                <span>{option.optionText}</span>
              </label>
            ))}
          </div>
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
    
    case 'checkbox':
      return (
        <Component {...props} className="space-y-2">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input 
              type="checkbox"
              checked={value === true}
              onChange={handleChange}
              required={question.isRequired}
            />
            <span>{question.displayText}</span>
          </label>
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
      
    default:
      return (
        <Component {...props} className="space-y-2">
          <label className="font-medium">{question.displayText}</label>
          <input 
            type="text" 
            className="w-full px-3 py-2 border rounded-md"
            placeholder={question.placeholder}
            required={question.isRequired}
            value={value || ''}
            onChange={handleChange}
          />
          {question.helperText && (
            <p className="text-sm text-muted-foreground">{question.helperText}</p>
          )}
        </Component>
      );
  }
};

interface FormRendererProps {
  formDefinition: FormDefinition | null;
  onSubmit: (formData: Record<string, any>) => void;
  headerElement?: React.ReactNode;
  isSubmitting?: boolean;
  submitButtonText?: string;
  className?: string;
}

export function FormRenderer({
  formDefinition,
  onSubmit,
  headerElement,
  isSubmitting = false,
  submitButtonText = "Submit",
  className = ""
}: FormRendererProps) {
  const [formStep, setFormStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Get pages with proper fallback for loading state
  const formPages = formDefinition?.pages || [];
  
  // Handle form field changes
  const handleFieldChange = (questionKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  // Handle form navigation
  const goToNextStep = () => {
    if (formStep < formPages.length - 1) {
      window.scrollTo(0, 0);
      setFormStep(formStep + 1);
    } else {
      handleSubmit();
    }
  };
  
  const goToPreviousStep = () => {
    if (formStep > 0) {
      window.scrollTo(0, 0);
      setFormStep(formStep - 1);
    }
  };
  
  // Handle form submission
  const handleSubmit = () => {
    // Pass the collected form data to the parent component
    onSubmit(formData);
  };

  // Early return if no form definition is provided
  if (!formDefinition) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No form definition available</p>
      </div>
    );
  }

  // Get the current page
  const currentPage = formPages[formStep] || { questions: [] };
  
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header element if provided */}
      {headerElement}
      
      {/* Progress indicators */}
      {formPages.length > 1 && (
        <div className="flex justify-between mb-4">
          {formPages.map((page, index) => (
            <div key={index} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                  ${index === formStep ? 'bg-primary text-white' : 
                  index < formStep ? 'bg-primary-200 text-primary-700' : 'bg-gray-100 text-gray-400'}`}
              >
                {index + 1}
              </div>
              {index < formPages.length - 1 && (
                <div 
                  className={`h-1 w-8 mx-1 
                  ${index < formStep ? 'bg-primary-200' : 'bg-gray-100'}`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Page title and description */}
      <div>
        <h2 className="text-xl font-semibold">{currentPage.pageTitle}</h2>
        {currentPage.description && (
          <p className="text-muted-foreground mt-1">{currentPage.description}</p>
        )}
      </div>
      
      {/* Form fields */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {currentPage.questions && currentPage.questions.length > 0 ? (
          currentPage.questions.map((question) => (
            <DynamicFormField
              key={question.questionKey}
              question={question}
              value={formData[question.questionKey]}
              onChange={handleFieldChange}
            />
          ))
        ) : (
          <p className="text-center py-4">No questions available on this page.</p>
        )}
      </motion.div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        {formStep > 0 ? (
          <Button 
            type="button" 
            variant="outline" 
            onClick={goToPreviousStep}
          >
            Previous
          </Button>
        ) : (
          <div></div> // Empty div to maintain flex spacing
        )}
        
        <Button 
          type="button" 
          onClick={goToNextStep}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : formStep < formPages.length - 1 ? (
            "Next"
          ) : (
            submitButtonText
          )}
        </Button>
      </div>
    </div>
  );
}