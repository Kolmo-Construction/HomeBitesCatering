import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QuestionRenderer, type Question } from './QuestionRenderer';
import { PageTransition } from './PageTransition';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';

// Types for the form structure
interface EventType {
  id: string;
  title: string;
  description: string;
  image: string;
  formKey: string;
}

interface FormPage {
  id: number;
  title: string;
  key: string;
  pageOrder: number;
  questions: Question[];
}

interface Rule {
  id: number;
  triggerQuestionId: number;
  conditionType: string;
  conditionValue: string;
  actionType: string;
  targets: {
    targetType: string;
    targetId: number;
  }[];
}

interface FormDefinition {
  form: {
    id: number;
    key: string;
    title: string;
    description: string;
    version: number;
  };
  pages: FormPage[];
  rules: Rule[];
}

interface WizardProps {
  eventType: EventType;
  onBack: () => void;
}

export function QuestionnaireWizard({ eventType, onBack }: WizardProps) {
  // State for wizard
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const [formDefinition, setFormDefinition] = useState<FormDefinition | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);

  const queryClient = useQueryClient();

  // Fetch form definition
  useEffect(() => {
    const fetchForm = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/form-builder/public/forms/${eventType.formKey}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch form: ${response.statusText}`);
        }
        
        const data = await response.json();
        setFormDefinition(data);
      } catch (error) {
        console.error('Error fetching form:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchForm();
  }, [eventType.formKey]);
  
  // Handle answer changes
  const handleAnswerChange = (questionId: number, fieldKey: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    
    // Clear error when user provides an answer
    if (errors[fieldKey]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldKey];
        return updated;
      });
    }
    
    // Process conditional logic rules
    if (formDefinition) {
      processConditionalLogic(questionId, fieldKey, value);
    }
  };
  
  // Process conditional logic rules
  const processConditionalLogic = (questionId: number, fieldKey: string, value: any) => {
    if (!formDefinition) return;
    
    // Find rules that are triggered by this question
    const relevantRules = formDefinition.rules.filter(
      rule => rule.triggerQuestionId === questionId
    );
    
    relevantRules.forEach(rule => {
      let conditionMet = false;
      
      // Evaluate the condition
      switch (rule.conditionType) {
        case 'equals':
          conditionMet = value === rule.conditionValue;
          break;
        case 'not_equals':
          conditionMet = value !== rule.conditionValue;
          break;
        case 'contains':
          conditionMet = Array.isArray(value) && value.includes(rule.conditionValue);
          break;
        case 'does_not_contain':
          conditionMet = !Array.isArray(value) || !value.includes(rule.conditionValue);
          break;
        case 'is_filled':
          conditionMet = !!value && (!Array.isArray(value) || value.length > 0);
          break;
        case 'is_not_filled':
          conditionMet = !value || (Array.isArray(value) && value.length === 0);
          break;
        default:
          break;
      }
      
      // Apply the action if condition is met
      if (conditionMet) {
        applyRuleAction(rule);
      }
    });
  };
  
  // Apply rule actions
  const applyRuleAction = (rule: Rule) => {
    // Implementation for rule actions (e.g., show/hide questions, skip to page)
    // This would update the visibility state of questions or pages
    console.log('Applying rule action:', rule.actionType);
    
    // Example implementation for "skip_to_page" action
    if (rule.actionType === 'skip_to_page') {
      const targetPage = rule.targets.find(t => t.targetType === 'page')?.targetId;
      if (targetPage) {
        const targetPageIndex = formDefinition?.pages.findIndex(p => p.id === targetPage) || 0;
        if (targetPageIndex >= 0) {
          setTransitionDirection('next');
          setCurrentPageIndex(targetPageIndex);
        }
      }
    }
  };
  
  // Navigate to the next page
  const goToNextPage = () => {
    if (!formDefinition) return;
    
    // Validate current page before proceeding
    const currentPage = formDefinition.pages[currentPageIndex];
    const requiredQuestions = currentPage.questions.filter(q => q.isRequired);
    const newErrors: Record<string, string> = {};
    
    requiredQuestions.forEach(question => {
      const answer = answers[question.fieldKey];
      const isAnswered = answer !== undefined && answer !== null && answer !== '';
      
      if (!isAnswered) {
        newErrors[question.fieldKey] = 'This field is required';
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    if (currentPageIndex < formDefinition.pages.length - 1) {
      setTransitionDirection('next');
      setCurrentPageIndex(currentPageIndex + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };
  
  // Navigate to the previous page
  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setTransitionDirection('prev');
      setCurrentPageIndex(currentPageIndex - 1);
      window.scrollTo(0, 0);
    } else {
      onBack();
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!formDefinition) return;
    
    try {
      setIsSubmitting(true);
      
      // Prepare submission data
      const submissionData = {
        formKey: formDefinition.form.key,
        formVersion: formDefinition.form.version,
        answers: Object.entries(answers).map(([fieldKey, value]) => ({
          fieldKey,
          value
        })),
        submitterInfo: {
          eventTypeId: eventType.id,
          contactDetails: {
            // Extract contact details from answers
            email: answers['email'] || '',
            phone: answers['phone'] || '',
            name: answers['fullName'] || ''
          }
        }
      };
      
      // Submit the form
      const response = await fetch('/api/form-builder/public/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit form: ${response.statusText}`);
      }
      
      // Show success message and reset form
      setSubmissionComplete(true);
      
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities'] });
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({
        submit: 'Failed to submit the form. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-center">Loading questionnaire...</p>
      </div>
    );
  }
  
  // Error state
  if (!formDefinition) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <p className="text-lg text-center text-red-500 mb-4">
          Sorry, we couldn't load the questionnaire. Please try again.
        </p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }
  
  // Success state after submission
  if (submissionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-full max-w-xl text-center">
          <div className="bg-green-100 rounded-full p-3 inline-flex mb-6">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
          <p className="text-lg mb-6">
            Your responses have been submitted successfully. We'll be in touch soon!
          </p>
          <Button onClick={onBack} className="mx-auto">Return to Home</Button>
        </div>
      </div>
    );
  }
  
  // Current page to display
  const currentPage = formDefinition.pages[currentPageIndex];
  const isLastPage = currentPageIndex === formDefinition.pages.length - 1;
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Form header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">{formDefinition.form.title}</h1>
        <p className="text-gray-600">{formDefinition.form.description}</p>
      </div>
      
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${((currentPageIndex + 1) / formDefinition.pages.length) * 100}%` }}
          />
        </div>
        <p className="text-right text-sm mt-1 text-gray-600">
          Page {currentPageIndex + 1} of {formDefinition.pages.length}
        </p>
      </div>
      
      {/* Page content with transition */}
      <Card className="mb-8 p-6 shadow-md">
        <PageTransition direction={transitionDirection} isActive={true}>
          <div key={`page-${currentPage.id}`}>
            <h2 className="text-xl font-semibold mb-6">{currentPage.title}</h2>
            
            {currentPage.questions.map(question => (
              <QuestionRenderer
                key={question.id}
                question={question}
                value={answers[question.fieldKey] || ''}
                onChange={(value) => handleAnswerChange(question.id, question.fieldKey, value)}
                error={errors[question.fieldKey]}
              />
            ))}
          </div>
        </PageTransition>
      </Card>
      
      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousPage}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {currentPageIndex === 0 ? 'Back to Events' : 'Previous'}
        </Button>
        
        <Button
          onClick={goToNextPage}
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              {isLastPage ? 'Submit' : 'Next'}
              {!isLastPage && <ArrowRight className="h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
      
      {/* General submission error */}
      {errors.submit && (
        <p className="mt-4 text-center text-red-500">{errors.submit}</p>
      )}
    </div>
  );
}