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
              
              return {
                ...page,
                questions: questionsData
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
    if (!question.conditionalLogic) return true;
    
    const { targetQuestionKey, operator, value } = question.conditionalLogic;
    const targetValue = formValues[targetQuestionKey];
    
    switch (operator) {
      case 'equals':
        return targetValue === value;
      case 'notEquals':
        return targetValue !== value;
      case 'contains':
        return Array.isArray(targetValue) && targetValue.includes(value);
      case 'notContains':
        return !Array.isArray(targetValue) || !targetValue.includes(value);
      case 'greaterThan':
        return Number(targetValue) > Number(value);
      case 'lessThan':
        return Number(targetValue) < Number(value);
      default:
        return true;
    }
  };

  // Filter questions based on conditional logic
  const visibleQuestions = (currentPage.questions || [])
    .filter(q => isQuestionVisible(q))
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

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
    const { 
      questionKey, 
      questionType, 
      displayText, 
      display_text,
      helperText, 
      helper_text,
      placeholder, 
      isRequired, 
      is_required,
      options = []
    } = question;

    const questionText = displayText || display_text || '';
    const helpText = helperText || helper_text || '';
    const required = isRequired || is_required || false;
    const value = formValues[questionKey] || '';
    const error = errors[questionKey];
    
    switch (questionType) {
      case 'textbox':
        return (
          <div className="mb-4">
            <Label htmlFor={questionKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Input
              id={questionKey}
              value={value}
              placeholder={placeholder}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'textarea':
        return (
          <div className="mb-4">
            <Label htmlFor={questionKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Textarea
              id={questionKey}
              value={value}
              placeholder={placeholder}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'number':
        return (
          <div className="mb-4">
            <Label htmlFor={questionKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Input
              id={questionKey}
              type="number"
              value={value}
              placeholder={placeholder}
              onChange={(e) => handleInputChange(questionKey, e.target.value ? Number(e.target.value) : '')}
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
              {(options || []).map((option: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${questionKey}-${index}`}
                    checked={Array.isArray(formValues[questionKey]) && formValues[questionKey].includes(option.value)}
                    onCheckedChange={(checked) => {
                      const currentValue = Array.isArray(formValues[questionKey]) ? [...formValues[questionKey]] : [];
                      if (checked) {
                        handleInputChange(questionKey, [...currentValue, option.value]);
                      } else {
                        handleInputChange(
                          questionKey, 
                          currentValue.filter((v: string) => v !== option.value)
                        );
                      }
                    }}
                  />
                  <Label htmlFor={`${questionKey}-${index}`} className="cursor-pointer">
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
            <RadioGroup
              value={value}
              onValueChange={(val) => handleInputChange(questionKey, val)}
              className="space-y-2"
            >
              {(options || []).map((option: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${questionKey}-${option.value}`} />
                  <Label htmlFor={`${questionKey}-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      case 'dropdown':
        return (
          <div className="mb-4">
            <Label htmlFor={questionKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Select
              value={value}
              onValueChange={(val) => handleInputChange(questionKey, val)}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {(options || []).map((option: any, index: number) => (
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
            <Label htmlFor={questionKey} className="block mb-1">
              {questionText} {required && <span className="text-red-500">*</span>}
            </Label>
            {helpText && <p className="text-sm text-gray-500 mb-1">{helpText}</p>}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id={questionKey}
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
                  onSelect={(date) => handleInputChange(questionKey, date ? format(date, 'yyyy-MM-dd') : null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        );
        
      default:
        return (
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Question type "{questionType}" is not supported in preview mode
            </p>
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