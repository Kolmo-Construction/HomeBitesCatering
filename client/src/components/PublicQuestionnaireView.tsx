import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Minus, HelpCircle, Lightbulb } from 'lucide-react';
import HelpButton from './HelpButton';
import ContextualHelpSidebar from './ContextualHelpSidebar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import NutritionChart from '@/components/nutrition/NutritionChart';
import NutritionSummary from '@/components/nutrition/NutritionSummary';
import MenuItemCard from '@/components/nutrition/MenuItemCard';

// Types for the nutritional data
interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface MenuItemNutrition {
  id: number;
  name: string;
  nutrition: NutritionalInfo;
  isSelected: boolean;
}

// Types for the questionnaire structure
type QuestionOption = {
  id: number;
  optionText: string;
  optionValue: string;
  order: number;
  relatedMenuItemId?: number;
};

type Question = {
  id: number;
  questionText: string;
  questionKey: string;
  questionType: string;
  isRequired: boolean;
  helpText?: string;
  placeholderText?: string;
  order: number;
  options?: QuestionOption[];
  matrixColumns?: {
    id: number;
    columnText: string;
    columnKey: string;
    order: number;
  }[];
  validationRules?: {
    min?: number;
    max?: number;
    step?: number;
    exactCount?: number;
    minCount?: number;
    maxCount?: number;
    [key: string]: any;
  };
};

type Page = {
  id: number;
  title: string;
  description?: string;
  order: number;
  questions: Question[];
};

type ConditionalLogic = {
  id: number;
  triggerQuestionKey: string;
  triggerCondition: string;
  triggerValue: string;
  actionType: string;
  targetQuestionKey?: string;
  targetPageId?: number;
  targetOptionValue?: string;
};

type QuestionnaireDefinition = {
  id: number;
  versionName: string;
  description?: string;
  isActive: boolean;
};

type Questionnaire = {
  definition: QuestionnaireDefinition;
  pages: Page[];
  conditionalLogic: ConditionalLogic[];
};

// Main component
const PublicQuestionnaireView: React.FC = () => {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/questionnaire/:id');
  
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Help sidebar state
  const [helpSidebarOpen, setHelpSidebarOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // List of question types that should display help buttons
  // You can customize this list to control exactly which question types get help
  const questionsWithHelp = [
    'text',             // Show help for text fields
    'textarea',         // Show help for longer text fields
    'date',             // Show help for date fields
    'time',             // Show help for time fields
    'time_picker',      // Show help for time picker
    'address',          // Show help for address fields
    'select',           // Show help for dropdown selections
    'toggle',           // Show help for toggle switch (Yes/No) fields
    'radio',            // Show help for radio options
    'checkbox_group',   // Show help for checkbox groups
    'name',             // Show help for name fields
    'phone',            // Show help for phone fields
    'slider',           // Show help for sliders
    'incrementer',      // Show help for incrementers
    'matrix'            // Show help for matrix questions
  ];
  
  // Option to only show help icons for questions that actually have help text
  const showHelpOnlyWhenHelpTextExists = true;
  
  // Nutrition tracking state
  const [selectedMenuItems, setSelectedMenuItems] = useState<MenuItemNutrition[]>([]);
  const [nutritionSummary, setNutritionSummary] = useState<NutritionalInfo>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  });
  
  // Fetch the questionnaire data
  useEffect(() => {
    const fetchQuestionnaire = async () => {
      try {
        setLoading(true);
        const definitionId = params?.id || 'active';
        
        // Use the active endpoint if no specific ID is provided
        const endpoint = definitionId === 'active' 
          ? '/api/questionnaires/active'
          : `/api/questionnaires/${definitionId}`;
        
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Questionnaire not found. Please check the URL and try again.');
          }
          throw new Error('Failed to load questionnaire. Please try again later.');
        }
        
        const data = await response.json();
        
        if (!data.success || !data.questionnaire) {
          throw new Error(data.message || 'Failed to load questionnaire data.');
        }
        
        // Log the raw data structure to understand it better
        console.log('Raw questionnaire data:', JSON.stringify(data.questionnaire.pages[0], null, 2));
        
        // Transform the data structure to match our component expectations
        const transformedQuestionnaire = {
          definition: data.questionnaire.definition,
          pages: data.questionnaire.pages.map((pageData: any) => ({
            id: pageData.page.id,
            title: pageData.page.title,
            description: pageData.page.description,
            order: pageData.page.order,
            questions: pageData.questions.map((q: any) => ({
              id: q.question.id,
              questionText: q.question.questionText,
              questionKey: q.question.questionKey,
              questionType: q.question.questionType,
              isRequired: q.question.isRequired,
              helpText: q.question.helpText,
              placeholderText: q.question.placeholderText,
              order: q.question.order,
              options: q.options,
              matrixColumns: q.matrixColumns
            }))
          })),
          conditionalLogic: data.questionnaire.conditionalLogic || []
        };
        
        setQuestionnaire(transformedQuestionnaire);
        
        // Initialize the menu items if there are food-related questions
        initializeMenuItems(transformedQuestionnaire);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        toast({
          variant: "destructive",
          title: "Error",
          description: err instanceof Error ? err.message : 'Failed to load questionnaire'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuestionnaire();
  }, [params?.id, toast]);
  
  // Function to initialize menu items from questionnaire data
  const initializeMenuItems = (questionnaire: Questionnaire) => {
    if (!questionnaire) return;
    
    // Find all questions with related menu items
    const menuItemOptions: QuestionOption[] = [];
    
    questionnaire.pages.forEach(page => {
      page.questions.forEach(question => {
        if (question.options) {
          question.options.forEach(option => {
            if (option.relatedMenuItemId) {
              menuItemOptions.push(option);
            }
          });
        }
      });
    });
    
    // For this demo, we'll create sample nutritional data
    // In a real implementation, this would come from the database
    if (menuItemOptions.length > 0) {
      // Fetch actual menu items with nutritional data
      fetchMenuItemsWithNutrition(menuItemOptions.map(o => o.relatedMenuItemId).filter(Boolean) as number[]);
    }
  };
  
  // Function to fetch menu items with nutritional information
  const fetchMenuItemsWithNutrition = async (menuItemIds: number[]) => {
    if (menuItemIds.length === 0) return;
    
    try {
      // In a real implementation, this would be an API call to get nutritional data
      // For demo purposes, we'll generate sample data
      const sampleMenuItems: MenuItemNutrition[] = menuItemIds.map((id, index) => ({
        id,
        name: `Menu Item ${id}`,
        nutrition: {
          calories: 100 + Math.floor(Math.random() * 400),
          protein: 5 + Math.floor(Math.random() * 25),
          carbs: 10 + Math.floor(Math.random() * 50),
          fat: 2 + Math.floor(Math.random() * 20),
          fiber: 1 + Math.floor(Math.random() * 8)
        },
        isSelected: false
      }));
      
      setSelectedMenuItems(sampleMenuItems);
      
      // In a production environment, you would fetch the actual menu items:
      /*
      const response = await fetch(`/api/menu-items?ids=${menuItemIds.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedMenuItems(data.menuItems.map((item: any) => ({
          ...item,
          isSelected: false
        })));
      }
      */
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };
  
  // Update nutrition summary when selected items change
  useEffect(() => {
    const summary = selectedMenuItems
      .filter(item => item.isSelected)
      .reduce((acc, item) => {
        return {
          calories: acc.calories + item.nutrition.calories,
          protein: acc.protein + item.nutrition.protein,
          carbs: acc.carbs + item.nutrition.carbs,
          fat: acc.fat + item.nutrition.fat,
          fiber: acc.fiber + item.nutrition.fiber
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    
    setNutritionSummary(summary);
  }, [selectedMenuItems]);
  
  const toggleMenuItemSelection = (itemId: number) => {
    setSelectedMenuItems(prevItems =>
      prevItems.map(item => 
        item.id === itemId ? { ...item, isSelected: !item.isSelected } : item
      )
    );
    
    // Update the form data for this menu item
    const option = findOptionByMenuItemId(itemId);
    if (option) {
      const question = findQuestionByOptionId(option.id);
      if (question) {
        // Handle different question types differently
        if (question.questionType === 'checkbox_group') {
          // For checkbox groups, toggle the value in an array
          const currentValues = [...(formData[question.questionKey] || [])];
          const optionValueIndex = currentValues.indexOf(option.optionValue);
          
          if (optionValueIndex === -1) {
            // Add the value if not present
            currentValues.push(option.optionValue);
          } else {
            // Remove the value if already present
            currentValues.splice(optionValueIndex, 1);
          }
          
          handleInputChange(question.questionKey, currentValues);
        } else if (question.questionType === 'radio' || question.questionType === 'select') {
          // For radio or select, set the value directly
          handleInputChange(question.questionKey, option.optionValue);
        }
      }
    }
  };
  
  // Helper function to find question option by menu item ID
  const findOptionByMenuItemId = (menuItemId: number): QuestionOption | undefined => {
    if (!questionnaire) return undefined;
    
    for (const page of questionnaire.pages) {
      for (const question of page.questions) {
        if (question.options) {
          const option = question.options.find(opt => opt.relatedMenuItemId === menuItemId);
          if (option) return option;
        }
      }
    }
    return undefined;
  };
  
  // Helper function to find question by option ID
  const findQuestionByOptionId = (optionId: number): Question | undefined => {
    if (!questionnaire) return undefined;
    
    for (const page of questionnaire.pages) {
      for (const question of page.questions) {
        if (question.options) {
          const option = question.options.find(opt => opt.id === optionId);
          if (option) return question;
        }
      }
    }
    return undefined;
  };
  
  // Update form data when input changes
  const handleInputChange = (questionKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [questionKey]: value
    }));
    
    // Clear validation error for this field if it exists
    if (validationErrors[questionKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionKey];
        return newErrors;
      });
    }
  };
  
  // Validate the current page
  const validateCurrentPage = (): boolean => {
    if (!questionnaire) return false;
    
    const currentPage = questionnaire.pages[currentPageIndex];
    console.log(`Validating page ${currentPageIndex} (${currentPage.title})`);
    
    const newErrors: Record<string, string> = {};
    
    currentPage.questions.forEach(question => {
      // Skip validation if question is not visible due to conditional logic
      if (!isQuestionVisible(question.questionKey)) {
        console.log(`Skipping validation for hidden question: ${question.questionKey}`);
        return;
      }
      
      // Log the current form data for this question
      console.log(`Question ${question.questionKey} (${question.questionType}), value:`, formData[question.questionKey], "required:", question.isRequired);
      
      // Get validation rules for the question (if any)
      const validationRules = question.validationRules || {};
      
      // First check if the question is required
      if (question.isRequired) {
        const value = formData[question.questionKey];
        
        // Special handling for different question types
        let isEmpty = false;
        
        if (question.questionType === 'toggle') {
          // For toggle type, false is a valid value and should not trigger required error
          isEmpty = value === undefined || value === null;
        } else if (question.questionType === 'slider') {
          // For slider type, 0 is a valid value
          isEmpty = value === undefined || value === null;
        } else {
          // Standard check for other types
          isEmpty = value === undefined || value === '' || value === null || 
            (Array.isArray(value) && value.length === 0);
        }
        
        if (isEmpty) {
          console.log(`Validation error for ${question.questionKey}: This field is required`);
          newErrors[question.questionKey] = 'This field is required';
        }
      }
      
      // Check specific validations based on question type
      if (question.questionType === 'checkbox' || question.questionType === 'checkbox_group') {
        const values = formData[question.questionKey] || [];
        
        // Check if there's an exact count requirement
        if (validationRules.exactCount !== undefined && values.length !== validationRules.exactCount) {
          console.log(`Validation error for ${question.questionKey}: You must select exactly ${validationRules.exactCount} options`);
          newErrors[question.questionKey] = `Please select exactly ${validationRules.exactCount} options`;
        }
        
        // Check minimum count
        if (validationRules.minCount !== undefined && values.length < validationRules.minCount) {
          console.log(`Validation error for ${question.questionKey}: You must select at least ${validationRules.minCount} options`);
          newErrors[question.questionKey] = `Please select at least ${validationRules.minCount} options`;
        }
        
        // Check maximum count
        if (validationRules.maxCount !== undefined && values.length > validationRules.maxCount) {
          console.log(`Validation error for ${question.questionKey}: You can select at most ${validationRules.maxCount} options`);
          newErrors[question.questionKey] = `Please select no more than ${validationRules.maxCount} options`;
        }
      }
    });
    
    console.log("Validation errors:", newErrors);
    setValidationErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log(`Page validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
    return isValid;
  };
  
  // Check if a question should be visible based on conditional logic
  const isQuestionVisible = (questionKey: string): boolean => {
    if (!questionnaire) return true;
    
    // Find rules that target this question
    const rules = questionnaire.conditionalLogic.filter(rule => 
      (rule.actionType === 'show_question' || rule.actionType === 'hide_question') && 
      rule.targetQuestionKey === questionKey
    );
    
    if (rules.length === 0) return true;
    
    // Evaluate each rule
    for (const rule of rules) {
      const triggerValue = formData[rule.triggerQuestionKey];
      const condition = evaluateCondition(triggerValue, rule.triggerCondition, rule.triggerValue);
      
      if (condition) {
        // If condition is met and action is hide_question, hide it
        if (rule.actionType === 'hide_question') return false;
        // If condition is met and action is show_question, show it
        if (rule.actionType === 'show_question') return true;
      } else {
        // If condition is not met and action is show_question, hide it
        if (rule.actionType === 'show_question') return false;
      }
    }
    
    // Default to visible
    return true;
  };
  
  // Helper function to evaluate conditional logic
  const evaluateCondition = (value: any, condition: string, compareValue: string): boolean => {
    console.log(`Evaluating condition: [${value}] (${typeof value}) ${condition} [${compareValue}] (${typeof compareValue})`);
    
    // Normalize booleans and boolean-like strings for toggle switches
    let normalizedValue = value;
    let normalizedCompareValue = compareValue;
    
    // First, convert any boolean values to strings
    if (typeof normalizedValue === 'boolean') {
      normalizedValue = String(normalizedValue);
    }
    
    // Handle special case for toggle switches (stored as 'true'/'false' strings)
    if (normalizedCompareValue === 'true' || normalizedCompareValue === 'false') {
      // If comparing with 'true'/'false', normalize all boolean-like values
      if (normalizedValue === true || normalizedValue === 'true') {
        normalizedValue = 'true';
      } else if (normalizedValue === false || normalizedValue === 'false') {
        normalizedValue = 'false';
      }
    }
    
    console.log(`Normalized values for comparison: [${normalizedValue}] ${condition} [${normalizedCompareValue}]`);
    
    let result = false;
    
    switch (condition) {
      case 'equals':
        result = String(normalizedValue) === String(normalizedCompareValue);
        break;
      case 'not_equals':
        result = String(normalizedValue) !== String(normalizedCompareValue);
        break;
      case 'contains':
        result = Array.isArray(normalizedValue) 
          ? normalizedValue.includes(normalizedCompareValue) 
          : String(normalizedValue).includes(String(normalizedCompareValue));
        break;
      case 'not_contains':
        result = Array.isArray(normalizedValue) 
          ? !normalizedValue.includes(normalizedCompareValue) 
          : !String(normalizedValue).includes(String(normalizedCompareValue));
        break;
      case 'is_empty':
        result = normalizedValue === undefined || normalizedValue === '' || 
          normalizedValue === false || normalizedValue === 'false' || 
          (Array.isArray(normalizedValue) && normalizedValue.length === 0);
        break;
      case 'is_not_empty':
        result = normalizedValue !== undefined && normalizedValue !== '' && 
          normalizedValue !== false && normalizedValue !== 'false' && 
          !(Array.isArray(normalizedValue) && normalizedValue.length === 0);
        break;
      case 'greater_than':
        result = Number(normalizedValue) > Number(normalizedCompareValue);
        break;
      case 'less_than':
        result = Number(normalizedValue) < Number(normalizedCompareValue);
        break;
      default:
        result = false;
    }
    
    console.log(`Condition result: ${result}`);
    return result;
  };
  
  // Navigate to the next page
  const goToNextPage = () => {
    if (!questionnaire) return;
    
    // Get the current page for debugging
    const currentPage = questionnaire.pages[currentPageIndex];
    console.log(`Attempting to navigate from page ${currentPageIndex} (${currentPage.title})`);
    
    // Check if this is the last page
    const isLastPage = currentPageIndex >= questionnaire.pages.length - 1;
    if (isLastPage) {
      console.log("This is the last page, submitting form instead of navigating");
      handleSubmit();
      return;
    }
    
    if (validateCurrentPage()) {
      // Check if there's a skip rule that should be applied
      const skipToPageId = getSkipToPageId();
      
      if (skipToPageId) {
        // Find the index of the page to skip to
        const pageIndex = questionnaire.pages.findIndex(page => page.id === skipToPageId);
        if (pageIndex !== -1) {
          console.log(`Skipping to page ${pageIndex} (${questionnaire.pages[pageIndex].title})`);
          setCurrentPageIndex(pageIndex);
          window.scrollTo(0, 0);
          return;
        }
      }
      
      // Otherwise, go to the next page
      const nextPageIndex = currentPageIndex + 1;
      console.log(`Moving to next page ${nextPageIndex} (${questionnaire.pages[nextPageIndex].title})`);
      setCurrentPageIndex(nextPageIndex);
      window.scrollTo(0, 0);
    } else {
      console.log("Page validation failed, not navigating");
    }
  };
  
  // Check if there's a skip rule that should be applied
  const getSkipToPageId = (): number | undefined => {
    if (!questionnaire) return undefined;
    
    // Find all skip_to_page rules
    const skipRules = questionnaire.conditionalLogic.filter(rule => 
      rule.actionType === 'skip_to_page' && rule.targetPageId
    );
    
    // Evaluate each rule
    for (const rule of skipRules) {
      const triggerValue = formData[rule.triggerQuestionKey];
      if (evaluateCondition(triggerValue, rule.triggerCondition, rule.triggerValue)) {
        return rule.targetPageId;
      }
    }
    
    return undefined;
  };
  
  // Navigate to the previous page
  const goToPreviousPage = () => {
    setCurrentPageIndex(prevIndex => Math.max(0, prevIndex - 1));
    window.scrollTo(0, 0);
  };
  
  // Submit the form
  const handleSubmit = async () => {
    if (!questionnaire) return;
    
    // Validate the current page first
    if (!validateCurrentPage()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare submission data
      const submissionData = {
        definitionId: questionnaire.definition.id,
        status: 'submitted',
        submittedData: formData,
        clientIdentifier: `session-${Date.now()}` // In a real app, use a proper session ID
      };
      
      // Submit the data to the API
      const response = await fetch('/api/questionnaires/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit questionnaire');
      }
      
      // Handle successful submission
      setSubmitted(true);
      toast({
        title: "Success!",
        description: "Your questionnaire has been submitted successfully. We'll be in touch soon!",
      });
      
      // Redirect to a thank you page
      setTimeout(() => {
        setLocation('/thank-you');
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting form:', err);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: err instanceof Error ? err.message : 'Failed to submit the form. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Render a question based on its type
  const renderQuestion = (question: Question) => {
    // Skip rendering if the question is not visible due to conditional logic
    if (!isQuestionVisible(question.questionKey)) {
      return null;
    }
    
    const { 
      questionText, 
      questionKey, 
      questionType, 
      isRequired, 
      helpText, 
      placeholderText, 
      options 
    } = question;
    
    // Function to open the help sidebar for this question
    const openHelpForQuestion = () => {
      setCurrentQuestion(question);
      setHelpSidebarOpen(true);
    };
    
    const errorMessage = validationErrors[questionKey];
    const hasMenuItems = options?.some(option => option.relatedMenuItemId);
    
    // If this question has menu items, add a nutritional analysis section
    const nutritionSection = hasMenuItems ? (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-md font-medium mb-2">Nutritional Analysis</h4>
        <NutritionSummary 
          nutritionData={nutritionSummary} 
          guestCount={formData['guest_count'] || 1} 
        />
      </div>
    ) : null;
    
    switch (questionType) {
      case 'text':
      case 'email':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label 
                htmlFor={questionKey} 
                className={cn(
                  "text-base font-medium",
                  isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
                )}
              >
                {questionText}
              </Label>
              {/* Only show help button for configured question types AND when help text exists (if configured) */}
              {questionsWithHelp.includes(questionType) && 
               (!showHelpOnlyWhenHelpTextExists || (question.helpText && question.helpText.trim() !== '')) && (
                <HelpButton question={question} onOpenHelp={openHelpForQuestion} />
              )}
            </div>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <Input 
              id={questionKey}
              type={questionType === 'email' ? 'email' : 'text'} 
              placeholder={placeholderText || ''} 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={cn(
                "w-full", 
                errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
              )}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'phone':
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-input">
              <span className="pl-3 text-gray-500">📞</span>
              <Input 
                id={questionKey}
                type="tel" 
                placeholder={placeholderText || "(123) 456-7890"} 
                value={formData[questionKey] || ''}
                onChange={(e) => {
                  // Auto-format the phone number as user types
                  const input = e.target.value;
                  // Only keep digits
                  const digitsOnly = input.replace(/\D/g, '');
                  
                  let formattedNumber = '';
                  // Format according to North American number format
                  if (digitsOnly.length <= 3) {
                    formattedNumber = digitsOnly;
                  } else if (digitsOnly.length <= 6) {
                    formattedNumber = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
                  } else {
                    formattedNumber = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
                  }
                  
                  handleInputChange(questionKey, formattedNumber);
                }}
                className={cn(
                  'border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
                  errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
                )}
              />
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'number':
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <Input 
              id={questionKey}
              type="number" 
              placeholder={placeholderText || ''} 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={cn(
                "w-full", 
                errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
              )}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'textarea':
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <Textarea 
              id={questionKey}
              placeholder={placeholderText || ''} 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={cn(
                "min-h-[120px]", 
                errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
              )}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <Select 
              value={formData[questionKey] || ''} 
              onValueChange={(value) => handleInputChange(questionKey, value)}
            >
              <SelectTrigger 
                id={questionKey}
                className={cn(
                  errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
                )}
              >
                <SelectValue placeholder={placeholderText || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {options?.sort((a, b) => a.order - b.order).map((option) => (
                  <SelectItem key={option.id} value={option.optionValue}>
                    {option.optionText}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
            {nutritionSection}
          </div>
        );
        
      case 'radio':
        return (
          <div className="space-y-2">
            <div className={cn(
              "text-base font-medium",
              isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
            )}>
              {questionText}
            </div>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            
            {hasMenuItems ? (
              // Special rendering for menu item radio options
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {options?.sort((a, b) => a.order - b.order).map((option) => {
                  const menuItem = option.relatedMenuItemId 
                    ? selectedMenuItems.find(item => item.id === option.relatedMenuItemId)
                    : undefined;
                    
                  if (menuItem) {
                    return (
                      <MenuItemCard
                        key={option.id}
                        menuItem={menuItem}
                        isSelected={formData[questionKey] === option.optionValue}
                        onClick={() => {
                          handleInputChange(questionKey, option.optionValue);
                          toggleMenuItemSelection(menuItem.id);
                        }}
                      />
                    );
                  }
                  
                  // Fallback for non-menu item options
                  return (
                    <div 
                      key={option.id} 
                      className={cn(
                        "flex items-center space-x-2 p-4 border rounded-lg cursor-pointer transition-colors",
                        formData[questionKey] === option.optionValue 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-gray-50"
                      )}
                      onClick={() => handleInputChange(questionKey, option.optionValue)}
                    >
                      <RadioGroupItem 
                        value={option.optionValue} 
                        id={`${questionKey}-${option.id}`}
                        checked={formData[questionKey] === option.optionValue}
                      />
                      <Label htmlFor={`${questionKey}-${option.id}`}>{option.optionText}</Label>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Standard radio options
              <RadioGroup 
                value={formData[questionKey] || ''} 
                onValueChange={(value) => handleInputChange(questionKey, value)}
                className="space-y-2"
              >
                {options?.sort((a, b) => a.order - b.order).map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.optionValue} id={`${questionKey}-${option.id}`} />
                    <Label htmlFor={`${questionKey}-${option.id}`}>{option.optionText}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
            {nutritionSection}
          </div>
        );
        
      case 'checkbox_group':
        return (
          <div className="space-y-2">
            <div className={cn(
              "text-base font-medium",
              isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
            )}>
              {questionText}
            </div>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            
            {hasMenuItems ? (
              // Special rendering for menu item checkbox options
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {options?.sort((a, b) => a.order - b.order).map((option) => {
                  const menuItem = option.relatedMenuItemId 
                    ? selectedMenuItems.find(item => item.id === option.relatedMenuItemId)
                    : undefined;
                    
                  if (menuItem) {
                    const values = formData[questionKey] || [];
                    const isChecked = values.includes(option.optionValue);
                    
                    return (
                      <MenuItemCard
                        key={option.id}
                        menuItem={menuItem}
                        isSelected={isChecked}
                        isCheckbox={true}
                        onClick={() => {
                          const currentValues = [...(formData[questionKey] || [])];
                          const valueIndex = currentValues.indexOf(option.optionValue);
                          
                          // If we're adding a new value (not currently selected)
                          if (valueIndex === -1) {
                            // Check if this is a question with selection limits
                            const hasSelectionLimit = questionText.includes('exactly') || 
                                questionText.includes('Choose');
                            
                            // Extract the max selections from the question text
                            const chooseNMatch = questionText.match(/Choose (\d+)/i);
                            const exactSelectionsMatch = questionText.match(/Select exactly (\d+)/i);
                            const textLimitMatch = chooseNMatch || exactSelectionsMatch;
                            const textLimit = textLimitMatch ? parseInt(textLimitMatch[1]) : null;
                            
                            // Check for validation rules in the question data
                            const validationRules = question.validationRules || {};
                            const exactCount = validationRules.exactCount;
                            const maxCount = validationRules.maxCount;
                            
                            // Determine the effective limit
                            const effectiveLimit = exactCount || textLimit || maxCount;
                            
                            // Check if adding would exceed the maximum selections
                            if (effectiveLimit && currentValues.length >= effectiveLimit) {
                              // Show toast notification for limit reached
                              toast({
                                title: "Selection limit reached",
                                description: `You can only select ${effectiveLimit} options for this question.`,
                                variant: "destructive"
                              });
                              return; // Don't update selection
                            }
                            // If within limits, add the value
                            currentValues.push(option.optionValue);
                          } else {
                            // Always allow removing a selection
                            currentValues.splice(valueIndex, 1);
                          }
                          
                          handleInputChange(questionKey, currentValues);
                          toggleMenuItemSelection(menuItem.id);
                        }}
                      />
                    );
                  }
                  
                  // Fallback for non-menu item options
                  return (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`${questionKey}-${option.id}`}
                        checked={(formData[questionKey] || []).includes(option.optionValue)}
                        onCheckedChange={(checked) => {
                          const currentValues = [...(formData[questionKey] || [])];
                          
                          // Check if this is a question with selection limits
                          const hasSelectionLimit = questionText.includes('exactly') && 
                              (questionText.includes('Choose 3') || questionText.includes('Choose 2'));
                          
                          // Extract the max selections from the question text
                          const maxSelectionsMatch = questionText.match(/Choose (\d+)/);
                          const maxSelections = maxSelectionsMatch ? parseInt(maxSelectionsMatch[1]) : null;
                          
                          if (checked) {
                            // If trying to add a new selection
                            if (!currentValues.includes(option.optionValue)) {
                              // Check for validation rules in the question data
                              const validationRules = question.validationRules || {};
                              const exactCount = validationRules.exactCount;
                              const minCount = validationRules.minCount;
                              const maxCount = validationRules.maxCount;
                              
                              // Parse exact selection requirements from the help text as fallback
                              const exactSelectionsMatch = questionText.match(/Select exactly (\d+)/);
                              const exactSelections = exactSelectionsMatch ? parseInt(exactSelectionsMatch[1]) : null;
                              
                              // Check if adding would exceed the maximum selections needed
                              if ((hasSelectionLimit && maxSelections && currentValues.length >= maxSelections) ||
                                  (exactSelections && currentValues.length >= exactSelections) ||
                                  (exactCount && currentValues.length >= exactCount) ||
                                  (maxCount && currentValues.length >= maxCount)) {
                                // Determine the limit based on which rule matched
                                const limit = exactCount || exactSelections || maxCount || maxSelections;
                                // If max selections reached, show toast notification
                                toast({
                                  title: "Selection limit reached",
                                  description: `You can only select ${limit} options for this question.`,
                                  variant: "destructive"
                                });
                                return; // Don't update the form data
                              }
                              // If within limit, add the selection
                              currentValues.push(option.optionValue);
                            }
                          } else {
                            // If unchecking, always allow removing selections
                            const index = currentValues.indexOf(option.optionValue);
                            if (index > -1) {
                              currentValues.splice(index, 1);
                            }
                          }
                          handleInputChange(questionKey, currentValues);
                        }}
                      />
                      <Label htmlFor={`${questionKey}-${option.id}`}>{option.optionText}</Label>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Standard checkbox options
              <div className="space-y-2">
                {options?.sort((a, b) => a.order - b.order).map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${questionKey}-${option.id}`}
                      checked={(formData[questionKey] || []).includes(option.optionValue)}
                      onCheckedChange={(checked) => {
                        const currentValues = [...(formData[questionKey] || [])];
                        if (checked) {
                          if (!currentValues.includes(option.optionValue)) {
                            currentValues.push(option.optionValue);
                          }
                        } else {
                          const index = currentValues.indexOf(option.optionValue);
                          if (index > -1) {
                            currentValues.splice(index, 1);
                          }
                        }
                        handleInputChange(questionKey, currentValues);
                      }}
                    />
                    <Label htmlFor={`${questionKey}-${option.id}`}>{option.optionText}</Label>
                  </div>
                ))}
              </div>
            )}
            
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
            {nutritionSection}
          </div>
        );
        
      case 'date':
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <Input 
              id={questionKey}
              type="date" 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={cn(
                errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
              )}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'time':
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <Input 
              id={questionKey}
              type="time" 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={cn(
                errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
              )}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'time_picker':
        // Enhanced time picker with hours, minutes, AM/PM
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            
            <div className="flex flex-wrap gap-2 items-center">
              {/* Hour selector */}
              <div className="space-y-1">
                <Label htmlFor={`${questionKey}-hour`} className="text-xs">Hour</Label>
                <Select
                  value={(formData[questionKey]?.hour || "").toString()}
                  onValueChange={(value) => {
                    const currentValue = formData[questionKey] || {};
                    handleInputChange(questionKey, {
                      ...currentValue,
                      hour: value
                    });
                  }}
                >
                  <SelectTrigger id={`${questionKey}-hour`} className="w-[80px]">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 12}, (_, i) => i + 1).map(hour => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Minute selector */}
              <div className="space-y-1">
                <Label htmlFor={`${questionKey}-minute`} className="text-xs">Minute</Label>
                <Select
                  value={(formData[questionKey]?.minute || "").toString()}
                  onValueChange={(value) => {
                    const currentValue = formData[questionKey] || {};
                    handleInputChange(questionKey, {
                      ...currentValue,
                      minute: value
                    });
                  }}
                >
                  <SelectTrigger id={`${questionKey}-minute`} className="w-[80px]">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {["00", "15", "30", "45"].map(minute => (
                      <SelectItem key={minute} value={minute}>
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* AM/PM selector */}
              <div className="space-y-1">
                <Label htmlFor={`${questionKey}-period`} className="text-xs">AM/PM</Label>
                <Select
                  value={formData[questionKey]?.period || ""}
                  onValueChange={(value) => {
                    const currentValue = formData[questionKey] || {};
                    handleInputChange(questionKey, {
                      ...currentValue,
                      period: value
                    });
                  }}
                >
                  <SelectTrigger id={`${questionKey}-period`} className="w-[80px]">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'toggle':
        // Toggle switch for Yes/No questions
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label 
                htmlFor={questionKey} 
                className={cn(
                  "text-base font-medium",
                  isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
                )}
              >
                {questionText}
              </Label>
              {questionsWithHelp.includes(questionType) && 
               (!showHelpOnlyWhenHelpTextExists || (question.helpText && question.helpText.trim() !== '')) && (
                <HelpButton question={question} onOpenHelp={openHelpForQuestion} />
              )}
            </div>
            {helpText && <p className="text-sm text-muted-foreground mb-2">{helpText}</p>}
            <div className="flex items-center space-x-2">
              <Switch
                id={questionKey}
                checked={formData[questionKey] === 'true' || formData[questionKey] === true}
                onCheckedChange={(checked) => {
                  // Store toggle value as string 'true'/'false' for consistent conditional logic
                  handleInputChange(questionKey, String(checked));
                  console.log(`Toggle ${questionKey} changed to: ${checked} (${typeof checked}), stored as: ${String(checked)}`);
                }}
              />
              <Label
                htmlFor={questionKey}
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {placeholderText || (formData[questionKey] === 'true' || formData[questionKey] === true ? 'Yes' : 'No')}
              </Label>
            </div>
            {errorMessage && <p className="text-sm text-red-500 mt-1">{errorMessage}</p>}
          </div>
        );
        
      case 'incrementer':
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            
            <div className="flex items-center h-10 w-full max-w-[200px]">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-r-none h-full"
                onClick={() => {
                  const currentValue = parseInt(formData[questionKey] || '0');
                  if (currentValue > 0) {
                    handleInputChange(questionKey, currentValue - 1);
                  }
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                id={questionKey}
                type="number"
                min="0"
                className="h-full text-center rounded-none border-x-0"
                value={formData[questionKey] || '0'}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0) {
                    handleInputChange(questionKey, value);
                  }
                }}
              />
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-l-none h-full"
                onClick={() => {
                  const currentValue = parseInt(formData[questionKey] || '0');
                  handleInputChange(questionKey, currentValue + 1);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'info_text':
        return (
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium">{questionText}</h3>
            {helpText && <div className="text-gray-700 mt-2 prose prose-sm max-w-none">{helpText}</div>}
          </div>
        );
        
      case 'matrix':
        // Matrix/Grid question type
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border bg-muted"></th>
                    {question.matrixColumns?.map((column) => (
                      <th key={column.id} className="p-2 border bg-muted text-center">
                        {column.columnText}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {options?.map((option) => (
                    <tr key={option.id}>
                      <td className="p-2 border">{option.optionText}</td>
                      {question.matrixColumns?.map((column) => {
                        const inputId = `${questionKey}_${option.id}_${column.id}`;
                        const matrixValues = formData[questionKey] || {};
                        const isChecked = matrixValues[option.optionValue] === column.columnKey;
                        
                        return (
                          <td key={column.id} className="p-2 border text-center">
                            <RadioGroupItem 
                              value={column.columnKey}
                              id={inputId}
                              checked={isChecked}
                              onClick={() => {
                                const updatedMatrixValues = {
                                  ...(formData[questionKey] || {}),
                                  [option.optionValue]: column.columnKey
                                };
                                handleInputChange(questionKey, updatedMatrixValues);
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'file_upload':
        // File upload question type
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <div className="flex items-center justify-center w-full">
              <label 
                htmlFor={questionKey}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                  </svg>
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">SVG, PNG, JPG or PDF (MAX. 10MB)</p>
                </div>
                <input 
                  id={questionKey} 
                  type="file" 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // For the demo, we're just storing the file name
                      // In a real app, you'd handle the file upload
                      handleInputChange(questionKey, file.name);
                    }
                  }}
                />
              </label>
            </div>
            {formData[questionKey] && (
              <p className="text-sm text-primary">Selected file: {formData[questionKey]}</p>
            )}
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'rating':
        // Rating question type (1-5 stars)
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleInputChange(questionKey, value)}
                  className={cn(
                    "p-1.5 rounded-full transition-colors",
                    parseInt(formData[questionKey]) >= value
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-yellow-200"
                  )}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-8 h-8"
                  >
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
            {formData[questionKey] && (
              <p className="text-sm text-primary">Your rating: {formData[questionKey]} star(s)</p>
            )}
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'slider':
        // Slider question type - get min, max, step from validation rules or use defaults
        const defaultValue = 50;
        const sliderRules = question.validationRules || {};
        const min = sliderRules.min !== undefined ? sliderRules.min : 0;
        const max = sliderRules.max !== undefined ? sliderRules.max : 100;
        const step = sliderRules.step !== undefined ? sliderRules.step : 1;
        
        // Initialize value if not set
        if (formData[questionKey] === undefined) {
          setTimeout(() => {
            handleInputChange(questionKey, defaultValue);
          }, 0);
        }
        
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <div className="pt-4 pb-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{min}</span>
                <span>{max}</span>
              </div>
              <input 
                id={questionKey}
                type="range" 
                min={min} 
                max={max} 
                step={step}
                value={formData[questionKey] !== undefined ? formData[questionKey] : defaultValue} 
                onChange={(e) => handleInputChange(questionKey, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-center mt-2">
                <span className="text-sm font-medium">
                  {formData[questionKey] !== undefined ? formData[questionKey] : defaultValue}
                </span>
              </div>
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'address':
        // Address input field
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <div className="space-y-3">
              <div>
                <Label htmlFor={`${questionKey}-street`} className="text-sm">Street Address</Label>
                <Input 
                  id={`${questionKey}-street`}
                  type="text"
                  placeholder="123 Main St" 
                  value={formData[`${questionKey}-street`] || ''}
                  onChange={(e) => {
                    // Update the individual field
                    handleInputChange(`${questionKey}-street`, e.target.value);
                    
                    // Combine all address fields into one object for the main field
                    const addressData = {
                      street: e.target.value,
                      city: formData[`${questionKey}-city`] || '',
                      state: formData[`${questionKey}-state`] || '',
                      zip: formData[`${questionKey}-zip`] || '',
                    };
                    
                    // Update the main field with the combined address
                    handleInputChange(questionKey, addressData);
                  }}
                  className={cn(
                    errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`${questionKey}-city`} className="text-sm">City</Label>
                  <Input 
                    id={`${questionKey}-city`}
                    type="text"
                    placeholder="Cityville" 
                    value={formData[`${questionKey}-city`] || ''}
                    onChange={(e) => {
                      handleInputChange(`${questionKey}-city`, e.target.value);
                      
                      const addressData = {
                        street: formData[`${questionKey}-street`] || '',
                        city: e.target.value,
                        state: formData[`${questionKey}-state`] || '',
                        zip: formData[`${questionKey}-zip`] || '',
                      };
                      
                      handleInputChange(questionKey, addressData);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor={`${questionKey}-state`} className="text-sm">State</Label>
                  <Input 
                    id={`${questionKey}-state`}
                    type="text"
                    placeholder="CA" 
                    value={formData[`${questionKey}-state`] || ''}
                    onChange={(e) => {
                      handleInputChange(`${questionKey}-state`, e.target.value);
                      
                      const addressData = {
                        street: formData[`${questionKey}-street`] || '',
                        city: formData[`${questionKey}-city`] || '',
                        state: e.target.value,
                        zip: formData[`${questionKey}-zip`] || '',
                      };
                      
                      handleInputChange(questionKey, addressData);
                    }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`${questionKey}-zip`} className="text-sm">ZIP Code</Label>
                <Input 
                  id={`${questionKey}-zip`}
                  type="text"
                  placeholder="90210" 
                  value={formData[`${questionKey}-zip`] || ''}
                  onChange={(e) => {
                    handleInputChange(`${questionKey}-zip`, e.target.value);
                    
                    const addressData = {
                      street: formData[`${questionKey}-street`] || '',
                      city: formData[`${questionKey}-city`] || '',
                      state: formData[`${questionKey}-state`] || '',
                      zip: e.target.value,
                    };
                    
                    handleInputChange(questionKey, addressData);
                  }}
                  className="w-full md:w-1/3"
                />
              </div>
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'name':
        // Name input with first and last name
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`${questionKey}-first`} className="text-sm">First Name</Label>
                <Input 
                  id={`${questionKey}-first`}
                  type="text"
                  placeholder="John" 
                  value={formData[`${questionKey}-first`] || ''}
                  onChange={(e) => {
                    // Update the individual field
                    handleInputChange(`${questionKey}-first`, e.target.value);
                    
                    // Combine first and last name for the main field
                    const fullName = {
                      first: e.target.value,
                      last: formData[`${questionKey}-last`] || ''
                    };
                    
                    // Update the main field with the combined name
                    handleInputChange(questionKey, fullName);
                  }}
                  className={cn(
                    errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
                  )}
                />
              </div>
              <div>
                <Label htmlFor={`${questionKey}-last`} className="text-sm">Last Name</Label>
                <Input 
                  id={`${questionKey}-last`}
                  type="text"
                  placeholder="Smith" 
                  value={formData[`${questionKey}-last`] || ''}
                  onChange={(e) => {
                    handleInputChange(`${questionKey}-last`, e.target.value);
                    
                    const fullName = {
                      first: formData[`${questionKey}-first`] || '',
                      last: e.target.value
                    };
                    
                    handleInputChange(questionKey, fullName);
                  }}
                  className={cn(
                    errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''
                  )}
                />
              </div>
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      default:
        return (
          <div className="space-y-2">
            <Label 
              htmlFor={questionKey} 
              className={cn(
                "text-base font-medium",
                isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500'
              )}
            >
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
            <div className="p-3 border rounded-md bg-gray-50">
              <p className="text-sm text-gray-500">
                This question type is not fully supported yet.
              </p>
            </div>
          </div>
        );
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-16 h-16 border-t-4 border-primary border-solid rounded-full animate-spin mb-4"></div>
        <h2 className="text-2xl font-bold mb-2">Loading Questionnaire</h2>
        <p className="text-gray-600">Please wait while we prepare your form...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-16 h-16 text-red-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Error Loading Questionnaire</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  // No questionnaire found - Show a demo questionnaire instead
  if (!questionnaire) {
    // For demo purposes, create a sample questionnaire structure
    const demoQuestionnaire: Questionnaire = {
      definition: {
        id: 9999,
        versionName: "Demo Version",
        description: "This is a demo questionnaire to showcase the nutritional features.",
        isActive: true
      },
      pages: [
        {
          id: 1,
          title: "Event Information",
          description: "Tell us about your upcoming event",
          order: 1,
          questions: [
            {
              id: 1,
              questionText: "What type of event are you planning?",
              questionKey: "event_type",
              questionType: "select",
              isRequired: true,
              order: 1,
              options: [
                { id: 1, optionText: "Wedding", optionValue: "wedding", order: 1 },
                { id: 2, optionText: "Corporate Event", optionValue: "corporate", order: 2 },
                { id: 3, optionText: "Birthday Party", optionValue: "birthday", order: 3 },
                { id: 4, optionText: "Other", optionValue: "other", order: 4 }
              ]
            },
            {
              id: 2,
              questionText: "Approximately how many guests will attend?",
              questionKey: "guest_count",
              questionType: "number",
              isRequired: true,
              helpText: "This helps us calculate per-person nutrition values",
              order: 2
            },
            {
              id: 3,
              questionText: "When is your event date?",
              questionKey: "event_date",
              questionType: "date",
              isRequired: true,
              order: 3
            }
          ]
        },
        {
          id: 2,
          title: "Menu Selection",
          description: "Select items for your catering menu",
          order: 2,
          questions: [
            {
              id: 4,
              questionText: "Select your appetizers (select all that apply)",
              questionKey: "appetizers",
              questionType: "checkbox_group",
              isRequired: true,
              order: 1,
              options: [
                { 
                  id: 5, 
                  optionText: "Bruschetta", 
                  optionValue: "bruschetta", 
                  order: 1,
                  relatedMenuItemId: 101
                },
                { 
                  id: 6, 
                  optionText: "Stuffed Mushrooms", 
                  optionValue: "stuffed_mushrooms", 
                  order: 2,
                  relatedMenuItemId: 102
                },
                { 
                  id: 7, 
                  optionText: "Spinach Artichoke Dip", 
                  optionValue: "spinach_dip", 
                  order: 3,
                  relatedMenuItemId: 103
                },
                { 
                  id: 8, 
                  optionText: "Shrimp Cocktail", 
                  optionValue: "shrimp_cocktail", 
                  order: 4,
                  relatedMenuItemId: 104
                }
              ]
            },
            {
              id: 5,
              questionText: "Select your main course",
              questionKey: "main_course",
              questionType: "radio",
              isRequired: true,
              order: 2,
              options: [
                { 
                  id: 9, 
                  optionText: "Grilled Salmon", 
                  optionValue: "salmon", 
                  order: 1,
                  relatedMenuItemId: 201
                },
                { 
                  id: 10, 
                  optionText: "Chicken Marsala", 
                  optionValue: "chicken_marsala", 
                  order: 2,
                  relatedMenuItemId: 202
                },
                { 
                  id: 11, 
                  optionText: "Beef Tenderloin", 
                  optionValue: "beef_tenderloin", 
                  order: 3,
                  relatedMenuItemId: 203
                },
                { 
                  id: 12, 
                  optionText: "Vegetarian Pasta", 
                  optionValue: "vegetarian_pasta", 
                  order: 4,
                  relatedMenuItemId: 204
                }
              ]
            },
            {
              id: 6,
              questionText: "Select your side dishes (select all that apply)",
              questionKey: "sides",
              questionType: "checkbox_group",
              isRequired: true,
              order: 3,
              options: [
                { 
                  id: 13, 
                  optionText: "Roasted Vegetables", 
                  optionValue: "roasted_vegetables", 
                  order: 1,
                  relatedMenuItemId: 301
                },
                { 
                  id: 14, 
                  optionText: "Garlic Mashed Potatoes", 
                  optionValue: "mashed_potatoes", 
                  order: 2,
                  relatedMenuItemId: 302
                },
                { 
                  id: 15, 
                  optionText: "Wild Rice Pilaf", 
                  optionValue: "rice_pilaf", 
                  order: 3,
                  relatedMenuItemId: 303
                },
                { 
                  id: 16, 
                  optionText: "Garden Salad", 
                  optionValue: "garden_salad", 
                  order: 4,
                  relatedMenuItemId: 304
                }
              ]
            }
          ]
        },
        {
          id: 3,
          title: "Dietary Restrictions",
          description: "Help us accommodate any special dietary needs",
          order: 3,
          questions: [
            {
              id: 7,
              questionText: "Do you need any of the following dietary options? (select all that apply)",
              questionKey: "dietary_restrictions",
              questionType: "checkbox_group",
              isRequired: false,
              order: 1,
              options: [
                { id: 17, optionText: "Vegetarian", optionValue: "vegetarian", order: 1 },
                { id: 18, optionText: "Vegan", optionValue: "vegan", order: 2 },
                { id: 19, optionText: "Gluten-Free", optionValue: "gluten_free", order: 3 },
                { id: 20, optionText: "Dairy-Free", optionValue: "dairy_free", order: 4 },
                { id: 21, optionText: "Nut-Free", optionValue: "nut_free", order: 5 }
              ]
            },
            {
              id: 8,
              questionText: "Additional dietary information or allergies we should be aware of",
              questionKey: "dietary_notes",
              questionType: "textarea",
              isRequired: false,
              order: 2
            }
          ]
        },
        {
          id: 4,
          title: "Contact Information",
          description: "How can we reach you with your custom quote?",
          order: 4,
          questions: [
            {
              id: 9,
              questionText: "Your Name",
              questionKey: "name",
              questionType: "text",
              isRequired: true,
              order: 1
            },
            {
              id: 10,
              questionText: "Email Address",
              questionKey: "email",
              questionType: "email",
              isRequired: true,
              order: 2
            },
            {
              id: 11,
              questionText: "Phone Number",
              questionKey: "phone",
              questionType: "phone",
              isRequired: true,
              order: 3
            },
            {
              id: 12,
              questionText: "Additional Information or Special Requests",
              questionKey: "additional_info",
              questionType: "textarea",
              isRequired: false,
              order: 4
            }
          ]
        }
      ],
      conditionalLogic: []
    };
    
    setQuestionnaire(demoQuestionnaire);
    
    // Initialize demo menu items
    const demoMenuItems: MenuItemNutrition[] = [
      {
        id: 101,
        name: "Bruschetta",
        nutrition: {
          calories: 120,
          protein: 3,
          carbs: 15,
          fat: 6,
          fiber: 2
        },
        isSelected: false
      },
      {
        id: 102,
        name: "Stuffed Mushrooms",
        nutrition: {
          calories: 180,
          protein: 5,
          carbs: 12,
          fat: 12,
          fiber: 3
        },
        isSelected: false
      },
      {
        id: 103,
        name: "Spinach Artichoke Dip",
        nutrition: {
          calories: 210,
          protein: 7,
          carbs: 18,
          fat: 14,
          fiber: 4
        },
        isSelected: false
      },
      {
        id: 104,
        name: "Shrimp Cocktail",
        nutrition: {
          calories: 90,
          protein: 18,
          carbs: 4,
          fat: 1,
          fiber: 0
        },
        isSelected: false
      },
      {
        id: 201,
        name: "Grilled Salmon",
        nutrition: {
          calories: 367,
          protein: 34,
          carbs: 0,
          fat: 25,
          fiber: 0
        },
        isSelected: false
      },
      {
        id: 202,
        name: "Chicken Marsala",
        nutrition: {
          calories: 320,
          protein: 28,
          carbs: 16,
          fat: 18,
          fiber: 1
        },
        isSelected: false
      },
      {
        id: 203,
        name: "Beef Tenderloin",
        nutrition: {
          calories: 420,
          protein: 42,
          carbs: 2,
          fat: 28,
          fiber: 0
        },
        isSelected: false
      },
      {
        id: 204,
        name: "Vegetarian Pasta",
        nutrition: {
          calories: 350,
          protein: 12,
          carbs: 62,
          fat: 8,
          fiber: 6
        },
        isSelected: false
      },
      {
        id: 301,
        name: "Roasted Vegetables",
        nutrition: {
          calories: 120,
          protein: 3,
          carbs: 22,
          fat: 3,
          fiber: 7
        },
        isSelected: false
      },
      {
        id: 302,
        name: "Garlic Mashed Potatoes",
        nutrition: {
          calories: 210,
          protein: 4,
          carbs: 35,
          fat: 8,
          fiber: 3
        },
        isSelected: false
      },
      {
        id: 303,
        name: "Wild Rice Pilaf",
        nutrition: {
          calories: 180,
          protein: 5,
          carbs: 37,
          fat: 2,
          fiber: 4
        },
        isSelected: false
      },
      {
        id: 304,
        name: "Garden Salad",
        nutrition: {
          calories: 80,
          protein: 2,
          carbs: 12,
          fat: 3,
          fiber: 6
        },
        isSelected: false
      }
    ];
    
    setSelectedMenuItems(demoMenuItems);
    
    // Clear loading state for demo
    setLoading(false);
    
    return null; // The render logic will continue after the state updates
  }

  // Success state (after submission)
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-16 h-16 text-green-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
        <p className="text-gray-600 mb-4">Your questionnaire has been submitted successfully.</p>
        <p className="text-gray-600 mb-6">We'll be in touch with you soon!</p>
        <Button onClick={() => setLocation('/')}>Return to Home</Button>
      </div>
    );
  }

  // Current page to display
  const currentPage = questionnaire.pages[currentPageIndex];
  const showPrevButton = currentPageIndex > 0;
  const isLastPage = currentPageIndex === questionnaire.pages.length - 1;
  const progress = ((currentPageIndex + 1) / questionnaire.pages.length) * 100;

  // Main questionnaire view
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {currentQuestion && (
        <ContextualHelpSidebar
          question={currentQuestion}
          currentValue={formData[currentQuestion.questionKey]}
          formValues={formData}
          isOpen={helpSidebarOpen}
          onClose={() => setHelpSidebarOpen(false)}
        />
      )}
      
      <motion.div
        key={`page-${currentPageIndex}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center mb-2">
              <CardTitle className="text-2xl">{currentPage.title}</CardTitle>
              <span className="text-sm text-gray-500">
                Page {currentPageIndex + 1} of {questionnaire.pages.length}
              </span>
            </div>
            {currentPage.description && (
              <CardDescription className="text-base">{currentPage.description}</CardDescription>
            )}
            <Progress value={progress} className="h-2 mt-4" />
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Show nutrition summary if we have selected items */}
            {selectedMenuItems.some(item => item.isSelected) && (
              <div className="mb-6 p-5 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-medium mb-4">Your Menu Selection Summary</h3>
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="summary">Nutrition Summary</TabsTrigger>
                    <TabsTrigger value="chart">Nutrition Chart</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="py-4">
                    <NutritionSummary 
                      nutritionData={nutritionSummary} 
                      guestCount={formData['guest_count'] || 1}
                      detailed={true}
                    />
                  </TabsContent>
                  <TabsContent value="chart" className="py-4">
                    <NutritionChart 
                      nutritionData={nutritionSummary}
                      height={300}
                    />
                  </TabsContent>
                </Tabs>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Selected Items:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedMenuItems
                      .filter(item => item.isSelected)
                      .map(item => (
                        <div key={item.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span>{item.name}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
            
            {/* Render questions */}
            {currentPage.questions
              .sort((a, b) => a.order - b.order)
              .map((question) => (
                <div key={question.id} className="mb-6 last:mb-0">
                  {renderQuestion(question)}
                </div>
              ))}
          </CardContent>
          
          <CardFooter className="pt-4 flex justify-between">
            <div>
              {showPrevButton && (
                <Button 
                  variant="outline" 
                  onClick={goToPreviousPage}
                  disabled={submitting}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
              )}
            </div>
            
            {isLastPage ? (
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="px-8"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            ) : (
              <Button onClick={goToNextPage} disabled={submitting}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default PublicQuestionnaireView;