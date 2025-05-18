import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

// Types for questionnaire data
type Question = {
  id: number;
  questionText: string;
  questionKey: string;
  questionType: string;
  isRequired: boolean;
  helpText?: string;
  options?: Array<{
    id: number;
    optionText: string;
    optionValue: string;
  }>;
};

type Section = {
  id: number;
  title: string;
  description?: string;
  questions: Question[];
};

type Page = {
  id: number;
  title: string;
  description?: string;
  order: number;
  sections: Section[];
};

type Questionnaire = {
  id: number;
  name: string;
  versionName: string;
  description?: string;
  eventType: string;
  pages: Page[];
};

// Simulate fetching a questionnaire - in a real app, this would come from API
const fetchQuestionnaire = async (id: number): Promise<Questionnaire> => {
  // This is mock data for demonstration - would be replaced with real API call
  return {
    id: 1,
    name: "Corporate Event Questionnaire",
    versionName: "v1.0",
    description: "Questionnaire for all corporate events",
    eventType: "corporate",
    pages: [
      {
        id: 1,
        title: "Basic Information",
        description: "Please provide basic information about your event",
        order: 0,
        sections: [
          {
            id: 1,
            title: "Event Details",
            description: "Tell us about your event",
            questions: [
              {
                id: 1,
                questionText: "What is the name of your event?",
                questionKey: "event_name",
                questionType: "text",
                isRequired: true,
                helpText: "Please enter the full name of your event"
              },
              {
                id: 2,
                questionText: "What date will your event take place?",
                questionKey: "event_date",
                questionType: "date",
                isRequired: true
              },
              {
                id: 3,
                questionText: "How many attendees do you expect?",
                questionKey: "attendee_count",
                questionType: "number",
                isRequired: true,
                helpText: "Please provide your best estimate"
              }
            ]
          }
        ]
      },
      {
        id: 2,
        title: "Catering Details",
        description: "Please provide information about your catering needs",
        order: 1,
        sections: [
          {
            id: 2,
            title: "Menu Preferences",
            description: "Tell us about your menu preferences",
            questions: [
              {
                id: 4,
                questionText: "What type of meal service would you prefer?",
                questionKey: "meal_service",
                questionType: "radio",
                isRequired: true,
                options: [
                  { id: 1, optionText: "Buffet", optionValue: "buffet" },
                  { id: 2, optionText: "Plated", optionValue: "plated" },
                  { id: 3, optionText: "Family Style", optionValue: "family_style" },
                  { id: 4, optionText: "Food Stations", optionValue: "food_stations" }
                ]
              },
              {
                id: 5,
                questionText: "Please select dietary restrictions we should be aware of:",
                questionKey: "dietary_restrictions",
                questionType: "checkbox",
                isRequired: false,
                options: [
                  { id: 5, optionText: "Vegetarian", optionValue: "vegetarian" },
                  { id: 6, optionText: "Vegan", optionValue: "vegan" },
                  { id: 7, optionText: "Gluten-Free", optionValue: "gluten_free" },
                  { id: 8, optionText: "Dairy-Free", optionValue: "dairy_free" },
                  { id: 9, optionText: "Nut Allergies", optionValue: "nut_allergies" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 3,
        title: "Contact Information",
        description: "Please provide your contact details",
        order: 2,
        sections: [
          {
            id: 3,
            title: "Contact Details",
            description: "How can we reach you?",
            questions: [
              {
                id: 6,
                questionText: "Your Full Name",
                questionKey: "submitter_name",
                questionType: "text",
                isRequired: true
              },
              {
                id: 7,
                questionText: "Your Email Address",
                questionKey: "submitter_email",
                questionType: "email",
                isRequired: true
              },
              {
                id: 8,
                questionText: "Your Phone Number",
                questionKey: "submitter_phone",
                questionType: "text",
                isRequired: false
              },
              {
                id: 9,
                questionText: "Any additional notes or special requests?",
                questionKey: "additional_notes",
                questionType: "textarea",
                isRequired: false
              }
            ]
          }
        ]
      }
    ]
  };
};

export default function QuestionnaireSubmit() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formResponses, setFormResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch questionnaire on component mount
  useEffect(() => {
    const loadQuestionnaire = async () => {
      try {
        // In a real app, would get ID from URL params
        const data = await fetchQuestionnaire(1);
        setQuestionnaire(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading questionnaire:', error);
        toast({
          title: "Error",
          description: "Failed to load questionnaire. Please try again later.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    loadQuestionnaire();
  }, [toast]);
  
  // Handle input changes for any question type
  const handleInputChange = (questionKey: string, value: any) => {
    setFormResponses(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };
  
  // Handle checkbox changes (multiple selection)
  const handleCheckboxChange = (questionKey: string, optionValue: string, checked: boolean) => {
    setFormResponses(prev => {
      const currentValues = Array.isArray(prev[questionKey]) ? prev[questionKey] : [];
      
      if (checked) {
        return {
          ...prev,
          [questionKey]: [...currentValues, optionValue]
        };
      } else {
        return {
          ...prev,
          [questionKey]: currentValues.filter(v => v !== optionValue)
        };
      }
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!questionnaire) return;
    
    setSubmitting(true);
    
    // Check for required fields
    let missingRequiredFields = false;
    let firstMissingField = '';
    
    questionnaire.pages.forEach(page => {
      page.sections.forEach(section => {
        section.questions.forEach(question => {
          if (question.isRequired && 
              (formResponses[question.questionKey] === undefined || 
               formResponses[question.questionKey] === null || 
               formResponses[question.questionKey] === "")) {
            missingRequiredFields = true;
            if (!firstMissingField) {
              firstMissingField = question.questionText;
            }
          }
        });
      });
    });
    
    if (missingRequiredFields) {
      toast({
        title: "Missing Required Fields",
        description: `Please complete all required fields. Missing: ${firstMissingField}`,
        variant: "destructive"
      });
      setSubmitting(false);
      return;
    }
    
    // In a real app, this would send data to the API
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Build the submission data from form responses
      const submissionData = {
        definitionId: questionnaire.id,
        eventType: questionnaire.eventType,
        ...formResponses,
        // Extract contact info from responses
        submitterName: formResponses.submitter_name,
        submitterEmail: formResponses.submitter_email,
        submitterPhone: formResponses.submitter_phone,
        eventDate: formResponses.event_date
      };
      
      console.log('Submitting questionnaire data:', submissionData);
      
      // Success notification
      toast({
        title: "Submission Successful",
        description: "Thank you! Your questionnaire has been submitted successfully."
      });
      
      // Redirect to thank you page
      setTimeout(() => {
        setLocation('/submission-complete');
      }, 2000);
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      toast({
        title: "Submission Failed",
        description: "There was a problem submitting your questionnaire. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Navigate to next/previous page
  const goToNextPage = () => {
    if (questionnaire && currentPage < questionnaire.pages.length - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };
  
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };
  
  // Check if current page has all required fields filled
  const isCurrentPageValid = () => {
    if (!questionnaire) return false;
    
    const page = questionnaire.pages[currentPage];
    let isValid = true;
    
    page.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.isRequired && 
            (formResponses[question.questionKey] === undefined || 
             formResponses[question.questionKey] === null || 
             formResponses[question.questionKey] === "")) {
          isValid = false;
        }
      });
    });
    
    return isValid;
  };
  
  // Render question based on its type
  const renderQuestion = (question: Question) => {
    const value = formResponses[question.questionKey];
    
    switch (question.questionType) {
      case 'text':
      case 'email':
        return (
          <Input
            id={`question-${question.id}`}
            type={question.questionType}
            value={value || ''}
            onChange={e => handleInputChange(question.questionKey, e.target.value)}
            placeholder={question.helpText}
          />
        );
        
      case 'textarea':
        return (
          <textarea
            id={`question-${question.id}`}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={value || ''}
            onChange={e => handleInputChange(question.questionKey, e.target.value)}
            placeholder={question.helpText}
            rows={4}
          />
        );
        
      case 'number':
        return (
          <Input
            id={`question-${question.id}`}
            type="number"
            value={value || ''}
            onChange={e => handleInputChange(question.questionKey, e.target.value)}
            placeholder={question.helpText}
          />
        );
        
      case 'date':
        return (
          <Input
            id={`question-${question.id}`}
            type="date"
            value={value || ''}
            onChange={e => handleInputChange(question.questionKey, e.target.value)}
          />
        );
        
      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`option-${option.id}`}
                  name={`question-${question.id}`}
                  value={option.optionValue}
                  checked={value === option.optionValue}
                  onChange={() => handleInputChange(question.questionKey, option.optionValue)}
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor={`option-${option.id}`}>{option.optionText}</Label>
              </div>
            ))}
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`option-${option.id}`}
                  checked={Array.isArray(value) && value.includes(option.optionValue)}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange(question.questionKey, option.optionValue, !!checked)
                  }
                />
                <Label htmlFor={`option-${option.id}`}>{option.optionText}</Label>
              </div>
            ))}
          </div>
        );
        
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={value => handleInputChange(question.questionKey, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map(option => (
                <SelectItem key={option.id} value={option.optionValue}>
                  {option.optionText}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      default:
        return <div>Unsupported question type: {question.questionType}</div>;
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading Questionnaire...</h2>
          <p>Please wait while we prepare your questionnaire.</p>
        </div>
      </div>
    );
  }
  
  if (!questionnaire) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Questionnaire Not Found</CardTitle>
            <CardDescription>
              We couldn't load the requested questionnaire. Please try again later or contact support.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation('/')}>Return Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const currentPageData = questionnaire.pages[currentPage];
  const isLastPage = currentPage === questionnaire.pages.length - 1;
  
  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{questionnaire.name}</h1>
        {questionnaire.description && (
          <p className="text-gray-600">{questionnaire.description}</p>
        )}
      </header>
      
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-2">
          Page {currentPage + 1} of {questionnaire.pages.length}
        </div>
        
        <div className="w-full bg-gray-200 h-2 rounded-full mb-2">
          <div 
            className="bg-primary h-full rounded-full"
            style={{ width: `${((currentPage + 1) / questionnaire.pages.length) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{currentPageData.title}</CardTitle>
          {currentPageData.description && (
            <CardDescription>{currentPageData.description}</CardDescription>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {currentPageData.sections.map(section => (
              <div key={section.id} className="mb-8">
                <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                {section.description && (
                  <p className="text-sm text-muted-foreground mb-4">{section.description}</p>
                )}
                
                <div className="space-y-6">
                  {section.questions.map(question => (
                    <div key={question.id} className="space-y-2">
                      <Label 
                        htmlFor={`question-${question.id}`}
                        className="flex items-baseline"
                      >
                        {question.questionText}
                        {question.isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      
                      {renderQuestion(question)}
                      
                      {question.helpText && !['text', 'email'].includes(question.questionType) && (
                        <p className="text-sm text-muted-foreground">{question.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              
              {isLastPage ? (
                <Button 
                  type="submit" 
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Questionnaire'}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goToNextPage}
                  disabled={!isCurrentPageValid()}
                >
                  Next
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}