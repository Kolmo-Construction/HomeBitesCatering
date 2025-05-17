import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import NutritionChart from './nutrition/NutritionChart';
import NutritionSummary from './nutrition/NutritionSummary';
import MenuItemCard from './nutrition/MenuItemCard';

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
        
        setQuestionnaire(data.questionnaire);
        
        // Initialize the menu items if there are food-related questions
        initializeMenuItems(data.questionnaire);
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
    const newErrors: Record<string, string> = {};
    
    currentPage.questions.forEach(question => {
      // Skip validation if question is not visible due to conditional logic
      if (!isQuestionVisible(question.questionKey)) {
        return;
      }
      
      if (question.isRequired) {
        const value = formData[question.questionKey];
        
        if (value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
          newErrors[question.questionKey] = 'This field is required';
        }
      }
    });
    
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    switch (condition) {
      case 'equals':
        return value === compareValue;
      case 'not_equals':
        return value !== compareValue;
      case 'contains':
        return Array.isArray(value) ? value.includes(compareValue) : String(value).includes(compareValue);
      case 'not_contains':
        return Array.isArray(value) ? !value.includes(compareValue) : !String(value).includes(compareValue);
      case 'is_empty':
        return value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
      case 'is_not_empty':
        return value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);
      default:
        return false;
    }
  };
  
  // Navigate to the next page
  const goToNextPage = () => {
    if (!questionnaire) return;
    
    if (validateCurrentPage()) {
      // Check if there's a skip rule that should be applied
      const skipToPageId = getSkipToPageId();
      
      if (skipToPageId) {
        // Find the index of the page to skip to
        const pageIndex = questionnaire.pages.findIndex(page => page.id === skipToPageId);
        if (pageIndex !== -1) {
          setCurrentPageIndex(pageIndex);
          window.scrollTo(0, 0);
          return;
        }
      }
      
      // Otherwise, go to the next page
      setCurrentPageIndex(prevIndex => prevIndex + 1);
      window.scrollTo(0, 0);
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
                          
                          if (valueIndex === -1) {
                            currentValues.push(option.optionValue);
                          } else {
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
        
      case 'info_text':
        return (
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium">{questionText}</h3>
            {helpText && <div className="text-gray-700 mt-2 prose prose-sm max-w-none">{helpText}</div>}
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

  // No questionnaire found
  if (!questionnaire) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <h2 className="text-2xl font-bold mb-2">Questionnaire Not Found</h2>
        <p className="text-gray-600 mb-4">The requested questionnaire could not be found.</p>
        <Button onClick={() => setLocation('/')}>Return to Home</Button>
      </div>
    );
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