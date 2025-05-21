import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Form Preview Component
export interface FormPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any; // The form definition
  pages: any[]; // The pages with their questions
}

export function FormPreview({ isOpen, onClose, formData, pages }: FormPreviewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [pagesWithQuestions, setPagesWithQuestions] = useState<any[]>([]);

  // Add debugging logs to see what data is being received
  console.log("PREVIEW: formData:", formData);
  console.log("PREVIEW: pages:", pages);

  // Fetch questions for each page
  useEffect(() => {
    if (!isOpen || !pages || pages.length === 0) {
      setPagesWithQuestions([]);
      setIsLoading(false);
      return;
    }

    const fetchQuestionsForPages = async () => {
      setIsLoading(true);
      try {
        const enrichedPages = await Promise.all(
          pages.map(async (page) => {
            // If the page already has questions, use them
            if (page.questions && Array.isArray(page.questions)) {
              return page;
            }

            // Otherwise fetch questions for this page
            try {
              const response = await fetch(`/api/form-builder/pages/${page.id}/questions`);
              if (!response.ok) {
                throw new Error(`Failed to fetch questions for page ${page.id}`);
              }
              const questionsData = await response.json();
              console.log(`PREVIEW: Fetched questions for page ${page.id}:`, questionsData);
              
              // Fetch rules for each question to enable conditional logic
              const questionsWithRules = await Promise.all(
                questionsData.map(async (question) => {
                  try {
                    const questionId = question.pageQuestionId || question.id;
                    const rulesResponse = await fetch(`/api/form-builder/questions/${questionId}/rules`);
                    
                    if (rulesResponse.ok) {
                      const rules = await rulesResponse.json();
                      return {
                        ...question,
                        questionKey: `${page.id}_${questionId}`,
                        rules: rules
                      };
                    }
                  } catch (ruleError) {
                    console.warn(`Error fetching rules for question ${question.id}:`, ruleError);
                  }
                  
                  // Return the question with an empty rules array if fetch failed
                  return {
                    ...question,
                    questionKey: `${page.id}_${question.pageQuestionId || question.id}`,
                    rules: []
                  };
                })
              );
              
              return {
                ...page,
                questions: questionsWithRules
              };
            } catch (err) {
              console.error(`Error fetching questions for page ${page.id}:`, err);
              return {
                ...page,
                questions: []
              };
            }
          })
        );

        setPagesWithQuestions(enrichedPages);
      } catch (err) {
        console.error("Error fetching questions for pages:", err);
        setPagesWithQuestions(pages.map(page => ({ ...page, questions: [] })));
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionsForPages();
  }, [isOpen, pages]);

  // Group questions by conditional logic targets for evaluation
  const conditionalLogicTargets: Record<string, any[]> = {};
  pagesWithQuestions.forEach(page => {
    (page.questions || []).forEach(question => {
      if (question.conditionalLogic) {
        const targetKey = question.conditionalLogic.targetQuestionKey;
        if (!conditionalLogicTargets[targetKey]) {
          conditionalLogicTargets[targetKey] = [];
        }
        conditionalLogicTargets[targetKey].push(question);
      }
    });
  });

  // Sort pages by their display order
  const sortedPages = [...pagesWithQuestions].sort((a, b) => 
    (a.pageOrder || a.displayOrder || 0) - (b.pageOrder || b.displayOrder || 0)
  );

  const currentPage = sortedPages[currentPageIndex] || { questions: [] };
  
  // Function to check if a question should be visible based on conditional logic
  const isQuestionVisible = (question: any) => {
    // Default to visible if no rules apply
    if (!question.rules || question.rules.length === 0) return true;
    
    console.log(`Evaluating visibility for question ${question.id} with ${question.rules.length} rules`);
    
    // Variables to track rule evaluation
    let shouldBeVisible = true; // Default to visible
    let hasShowRule = false; // Flag to check if we have any "show" rules
    
    // Process each rule that affects this question
    for (const rule of question.rules) {
      console.log(`Evaluating rule:`, rule);
      
      // Find the source question that triggers this rule
      const sourceQuestion = pagesWithQuestions.flatMap(p => p.questions || []).find(
        q => q.pageQuestionId === rule.triggerFormPageQuestionId || q.id === rule.triggerFormPageQuestionId
      );
      
      if (!sourceQuestion) {
        console.log(`Source question not found for rule:`, rule);
        continue;
      }
      
      console.log(`Source question found:`, sourceQuestion);
      
      // Get the source question's current value
      const sourceKey = sourceQuestion.questionKey || `${sourceQuestion.formPageId || sourceQuestion.pageId}_${sourceQuestion.pageQuestionId || sourceQuestion.id}`;
      const sourceValue = formValues[sourceKey];
      
      console.log(`Source value for ${sourceKey}:`, sourceValue);
      
      // Default to not matching if we don't have a value yet
      let conditionMatched = false;
      
      // Check if the condition is met
      switch (rule.conditionType) {
        case 'equals':
          conditionMatched = sourceValue === rule.conditionValue;
          break;
        case 'notEquals':
          conditionMatched = sourceValue !== rule.conditionValue && sourceValue !== undefined;
          break;
        case 'contains':
          if (Array.isArray(sourceValue)) {
            conditionMatched = sourceValue.includes(rule.conditionValue);
          } else if (typeof sourceValue === 'string') {
            conditionMatched = sourceValue.includes(rule.conditionValue);
          }
          break;
        case 'notContains':
          if (Array.isArray(sourceValue)) {
            conditionMatched = !sourceValue.includes(rule.conditionValue);
          } else if (typeof sourceValue === 'string') {
            conditionMatched = !sourceValue.includes(rule.conditionValue);
          } else {
            conditionMatched = true; // If not array or string, it definitely doesn't contain the value
          }
          break;
        case 'greaterThan':
          conditionMatched = Number(sourceValue) > Number(rule.conditionValue);
          break;
        case 'lessThan':
          conditionMatched = Number(sourceValue) < Number(rule.conditionValue);
          break;
        case 'is_answered':
          conditionMatched = sourceValue !== undefined && sourceValue !== null && sourceValue !== '';
          break;
        case 'is_not_answered':
          conditionMatched = sourceValue === undefined || sourceValue === null || sourceValue === '';
          break;
        default:
          console.warn(`Unknown condition type: ${rule.conditionType}`);
          conditionMatched = true; // Unknown condition type, default to true
      }
      
      console.log(`Condition matched: ${conditionMatched}`);
      
      // Apply the rule based on its action
      if (rule.actionType === 'show') {
        hasShowRule = true;
        if (conditionMatched) {
          // Show the question if condition matched
          shouldBeVisible = true;
          console.log(`Show rule matched, question should be visible`);
          return true; // Early return since we have a definitive show
        } else {
          // If we have any show rules but none matched, hide by default
          shouldBeVisible = false;
        }
      } else if (rule.actionType === 'hide' && conditionMatched) {
        // Hide the question if condition matched - this takes priority
        console.log(`Hide rule matched, question should be hidden`);
        return false; // Early return since we have a definitive hide
      }
    }
    
    // If we have show rules but none matched, hide the question
    if (hasShowRule && !shouldBeVisible) {
      console.log(`No show rules matched, question should be hidden`);
      return false;
    }
    
    // If we've evaluated all rules and no definitive action was taken, default to visible
    console.log(`No definitive rules applied, defaulting to visible: ${shouldBeVisible}`);
    return shouldBeVisible;
  };

  // Filter questions based on conditional logic
  const visibleQuestions = (currentPage.questions || [])
    .filter(q => isQuestionVisible(q))
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
  console.log("PREVIEW: Current page questions:", currentPage.questions);

  // Handle input changes
  const handleInputChange = (questionKey: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [questionKey]: value
    }));
    
    // Clear error for this field if it has one
    if (errors[questionKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionKey];
        return newErrors;
      });
    }
  };

  // Validate the current page
  const validateCurrentPage = () => {
    const newErrors: Record<string, string> = {};
    
    visibleQuestions.forEach(question => {
      const questionKey = question.questionKey;
      const value = formValues[questionKey];
      
      if ((question.isRequired || question.is_required) && 
          (value === undefined || value === null || value === '')) {
        newErrors[questionKey] = 'This field is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation functions
  const goToNextPage = () => {
    if (validateCurrentPage() && currentPageIndex < sortedPages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  // Submit handler
  const handleSubmit = () => {
    if (validateCurrentPage()) {
      // This is just a preview, so we'll just show a message
      alert('Form would be submitted with the following data:\n\n' + JSON.stringify(formValues, null, 2));
    }
  };

  // Render form fields based on question type
  const renderField = (question: any) => {
    // Get all the possible field names based on API responses
    const { 
      questionKey, 
      questionType,
      // From the API response structure
      displayTextOverride, 
      helperTextOverride,
      placeholderOverride,
      isRequiredOverride,
      // Legacy field names
      displayText, 
      display_text,
      helperText, 
      helper_text,
      placeholder, 
      isRequired, 
      is_required,
      // Options can come from multiple places
      options = [],
      optionsOverrides = [],
      libraryDefaultOptions = []
    } = question;

    // Create a unique key for this question in form values
    const fieldKey = questionKey || `question_${question.id || question.pageQuestionId}`;
    
    // Determine the correct text to display
    const questionText = displayTextOverride || displayText || display_text || question.libraryDefaultText || 'Unnamed Question';
    const helpText = helperTextOverride || helperText || helper_text || 
                    (question.metadataOverrides?.helperText) || 
                    (question.libraryDefaultMetadata?.helperText) || '';
    const placeholderText = placeholderOverride || placeholder || 
                          (question.metadataOverrides?.placeholder) || 
                          (question.libraryDefaultMetadata?.placeholder) || '';
    
    // Determine if required
    const required = isRequiredOverride !== null ? isRequiredOverride : 
                   isRequired || is_required || 
                   (question.metadataOverrides?.defaultRequired) || 
                   (question.libraryDefaultMetadata?.defaultRequired) || false;
    
    // Get field value and error state                   
    const value = formValues[fieldKey] || '';
    const error = errors[fieldKey];
    
    // Determine the options to use - ensure we always have options for radio/checkbox groups
    let fieldOptions = [];
    
    // Try all possible places where options could be defined
    if (optionsOverrides && optionsOverrides.length > 0) {
      fieldOptions = optionsOverrides;
    } else if (options && options.length > 0) {
      fieldOptions = options;
    } else if (libraryDefaultOptions && libraryDefaultOptions.length > 0) {
      fieldOptions = libraryDefaultOptions;
    } else if (question.optionsOverrides && question.optionsOverrides.length > 0) {
      fieldOptions = question.optionsOverrides;
    } else if (question.options && question.options.length > 0) {
      fieldOptions = question.options;
    } else if (question.libraryDefaultOptions && question.libraryDefaultOptions.length > 0) {
      fieldOptions = question.libraryDefaultOptions;
    }
    
    // Debug logging to help troubleshoot option rendering issues
    if (questionType === 'radio_group' || questionType === 'checkbox_group') {
      console.log(`PREVIEW: Field ${fieldKey} of type ${questionType}:`, {
        questionId: question.id || question.pageQuestionId,
        rawOptionsFields: {
          optionsOverrides: optionsOverrides || [],
          options: options || [],
          libraryDefaultOptions: libraryDefaultOptions || [],
          questionOptionsOverrides: question.optionsOverrides || [],
          questionOptions: question.options || [],
          questionLibraryDefaultOptions: question.libraryDefaultOptions || []
        },
        fieldOptions,
        questionData: question
      });
    }
    
    switch (questionType) {
      case 'textbox':
        return (
          <div className="mb-4">
            <Label htmlFor={fieldKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Input
              id={fieldKey}
              value={value}
              placeholder={placeholderText}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'textarea':
        return (
          <div className="mb-4">
            <Label htmlFor={fieldKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Textarea
              id={fieldKey}
              value={value}
              placeholder={placeholderText}
              onChange={(e) => handleInputChange(fieldKey, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'number':
        return (
          <div className="mb-4">
            <Label htmlFor={fieldKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Input
              id={fieldKey}
              type="number"
              value={value}
              placeholder={placeholderText}
              onChange={(e) => handleInputChange(fieldKey, e.target.value ? Number(e.target.value) : '')}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'checkbox_group':
        return (
          <div className="mb-4">
            <Label className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <div className="space-y-2">
              {fieldOptions.map((option: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${fieldKey}-${index}`}
                    checked={Array.isArray(formValues[fieldKey]) && formValues[fieldKey].includes(option.value)}
                    onCheckedChange={(checked) => {
                      const currentValue = Array.isArray(formValues[fieldKey]) ? [...formValues[fieldKey]] : [];
                      if (checked) {
                        handleInputChange(fieldKey, [...currentValue, option.value]);
                      } else {
                        handleInputChange(
                          fieldKey, 
                          currentValue.filter((v: string) => v !== option.value)
                        );
                      }
                    }}
                  />
                  <Label htmlFor={`${fieldKey}-${index}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'radio_group':
        return (
          <div className="mb-4">
            <Label className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            
            {/* Custom implementation of radio buttons to ensure they display properly */}
            <div className="space-y-2">
              {fieldOptions.map((option: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className={`h-4 w-4 rounded-full border ${value === option.value ? 'border-primary bg-primary' : 'border-gray-400'}`}
                    onClick={() => handleInputChange(fieldKey, option.value)}
                  >
                    {value === option.value && 
                      <div className="h-2 w-2 mx-auto mt-0.5 rounded-full bg-white" />
                    }
                  </div>
                  <span 
                    className="text-sm cursor-pointer" 
                    onClick={() => handleInputChange(fieldKey, option.value)}
                  >
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'dropdown':
        return (
          <div className="mb-4">
            <Label htmlFor={fieldKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Select
              value={value}
              onValueChange={(val) => handleInputChange(fieldKey, val)}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {fieldOptions.map((option: any, index: number) => (
                  <SelectItem key={index} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'date':
        return (
          <div className="mb-4">
            <Label htmlFor={fieldKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={fieldKey}
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground",
                    error && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), "PPP") : <span>Select a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date) => handleInputChange(fieldKey, date ? format(date, 'yyyy-MM-dd') : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );

      case 'matrix':
        return (
          <div className="mb-4">
            <Label className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <div className="p-3 border rounded-md bg-gray-50">
              <p className="text-sm text-center text-muted-foreground mb-1">
                Matrix questions will appear as a grid of options in the submitted form.
              </p>
              <p className="text-xs text-center text-muted-foreground">
                (Matrix question preview not available in the form builder)
              </p>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'hidden_calculation':
        // For hidden calculation fields, import the renderer
        // This is imported when needed rather than at the top to avoid circular dependencies
        const HiddenCalculationRenderer = require('../form-renderer/HiddenCalculationRenderer').default;
        
        // Render a UI preview in the form builder showing it's a calculation field
        return (
          <div className="mb-4">
            <div className="p-3 border rounded-md bg-blue-50 flex items-center gap-2">
              <span className="text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="6" x2="6" y1="9" y2="19" />
                  <line x1="10" x2="10" y1="9" y2="19" />
                  <line x1="14" x2="14" y1="9" y2="19" />
                  <line x1="18" x2="18" y1="9" y2="19" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700">Hidden Calculation Field</p>
                <p className="text-xs text-blue-700">
                  Formula: {metadata?.formula || "No formula defined"}
                </p>
                <p className="text-xs text-blue-600">
                  This calculation happens behind the scenes and isn't visible to users.
                </p>
              </div>
            </div>
            
            {/* Include the actual renderer component for the calculation to work */}
            <HiddenCalculationRenderer 
              questionKey={questionKey}
              metadata={metadata || {}}
            />
          </div>
        );
      
      default:
        return (
          <div className="mb-4">
            <Label className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <div className="p-3 border rounded-md bg-gray-50">
              <p className="text-sm text-center text-muted-foreground">
                Question type "{questionType}" is not fully supported in preview mode
              </p>
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {formData ? formData.formTitle || formData.form_title || 'Form Preview' : 'Form Preview'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 border rounded-md bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p>Loading form content...</p>
            </div>
          ) : sortedPages.length === 0 ? (
            <div className="text-center p-6">
              <p>This form has no pages or questions yet.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-1">
                  {currentPage.title || currentPage.pageTitle || `Page ${currentPageIndex + 1}`}
                </h2>
                {currentPage.description && (
                  <p className="text-gray-600">{currentPage.description}</p>
                )}
              </div>

              <form onSubmit={(e) => e.preventDefault()}>
                {currentPage.questions && currentPage.questions.length > 0 ? (
                  visibleQuestions.map((question) => (
                    <div key={question.id || question.pageQuestionId || question.questionKey} className="mb-6">
                      {renderField(question)}
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 border border-dashed rounded-md">
                    <p>No questions are available on this page.</p>
                  </div>
                )}

                <div className="flex justify-between mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousPage}
                    disabled={currentPageIndex === 0}
                  >
                    Previous
                  </Button>
                  
                  {currentPageIndex < sortedPages.length - 1 ? (
                    <Button type="button" onClick={goToNextPage}>
                      Next
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleSubmit}>
                      Submit
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
        
        <DialogFooter className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Preview Mode: No data will be submitted
          </div>
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FormPreview;