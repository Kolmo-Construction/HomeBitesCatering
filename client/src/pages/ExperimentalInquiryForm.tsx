// client/src/pages/ExperimentalInquiryForm.tsx
import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { useLocation, useRoute, useParams, Route, Switch, Link } from 'wouter';
import { useForm, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { eventTypes, EventType } from '../data/eventOptions';
import { FormStep, EventInquiryFormData, defaultFormValues } from '../types';

// Lazy load step components
const EventTypeSelectionStep = lazy(() => import('../components/formSteps/EventTypeSelectionStep'));
const BasicInformationStep = lazy(() => import('../components/formSteps/BasicInformationStep'));
const EventDetailsStep = lazy(() => import('../components/formSteps/EventDetailsStep'));
const MenuSelectionStep = lazy(() => import('../components/formSteps/MenuSelectionStep'));
const AppetizersQuestionStep = lazy(() => import('../components/formSteps/AppetizersQuestionStep'));
const AppetizersStep = lazy(() => import('../components/formSteps/AppetizersStep'));
const DessertStep = lazy(() => import('../components/formSteps/DessertStep'));
const SpecialRequestsStep = lazy(() => import('../components/formSteps/SpecialRequestsStep'));
const ReviewStep = lazy(() => import('../components/formSteps/ReviewStep'));

// Loading component for Suspense
const StepLoader = () => (
  <div className="container mx-auto px-4 py-16 max-w-3xl">
    <div className="space-y-6">
      <Skeleton className="h-12 w-3/4 mx-auto" />
      <Skeleton className="h-6 w-2/3 mx-auto" />
      <div className="space-y-8 mt-12">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex justify-between pt-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  </div>
);

interface ExperimentalInquiryFormProps {
  initialEventType?: string;
}

/**
 * Experimental Inquiry Form
 * 
 * This is a refactored version of the inquiry form with:
 * 1. Event-specific routing (/experimental-inquiry/:eventType)
 * 2. Modular step components with lazy loading
 * 3. Separation of data from UI components
 */
const ExperimentalInquiryForm: React.FC<ExperimentalInquiryFormProps> = ({ initialEventType }) => {
  // Get URL path and initialize variables
  const [location] = useLocation();
  
  // Get event type from either route or prop
  let eventTypeFromUrl: EventType | undefined;
  
  // Extract event type from URL if available
  if (location.startsWith('/experimental-inquiry/')) {
    const pathSegments = location.split('/');
    if (pathSegments.length >= 3) {
      const typeFromPath = pathSegments[2];
      if (typeFromPath && eventTypes.some(e => e.type === typeFromPath)) {
        eventTypeFromUrl = typeFromPath as EventType;
      }
    }
  }
  
  // Fallback to the initialEventType prop if URL doesn't have a valid event type
  if (!eventTypeFromUrl && initialEventType) {
    // Verify that initialEventType is a valid EventType before using it
    if (eventTypes.some(e => e.type === initialEventType)) {
      eventTypeFromUrl = initialEventType as EventType;
    }
  }
  
  // Form state
  const [currentStep, setCurrentStep] = useState<FormStep>(
    eventTypeFromUrl ? FormStep.BASIC_INFORMATION : FormStep.EVENT_TYPE_SELECTION
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Validate event type
  const isValidEventType = (type: string | undefined): type is EventType => {
    if (!type) return false;
    return eventTypes.some(event => event.type === type);
  };
  
  // Setup form with default values
  const methods = useForm<EventInquiryFormData>({
    defaultValues: {
      ...defaultFormValues,
      eventType: isValidEventType(eventTypeFromUrl) ? eventTypeFromUrl : null
    }
  });
  
  const { watch, setValue, handleSubmit, formState } = methods;
  const selectedEventType = watch('eventType');
  
  // Set event type from URL parameter
  useEffect(() => {
    if (eventTypeFromUrl && isValidEventType(eventTypeFromUrl) && eventTypeFromUrl !== selectedEventType) {
      setValue('eventType', eventTypeFromUrl);
    }
  }, [eventTypeFromUrl, setValue, selectedEventType]);
  
  // Function to handle event type selection
  const handleSelectEventType = (type: EventType) => {
    setValue('eventType', type);
    
    // We need to both update the step AND redirect
    // First update the current step to basic information
    setCurrentStep(FormStep.BASIC_INFORMATION);
    
    // Use history.push instead of window.location for a smoother experience
    // that won't cause a full page reload
    window.history.pushState({}, '', `/experimental-inquiry/${type}`);
  };
  
  // Navigate to next step
  const goToNextStep = () => {
    switch (currentStep) {
      case FormStep.EVENT_TYPE_SELECTION:
        setCurrentStep(FormStep.BASIC_INFORMATION);
        break;
      case FormStep.BASIC_INFORMATION:
        setCurrentStep(FormStep.EVENT_DETAILS);
        break;
      case FormStep.EVENT_DETAILS:
        setCurrentStep(FormStep.MENU_SELECTION);
        break;
      case FormStep.MENU_SELECTION:
        setCurrentStep(FormStep.APPETIZERS_QUESTION);
        break;
      case FormStep.APPETIZERS_QUESTION:
        if (watch('wantsAppetizers')) {
          setCurrentStep(FormStep.APPETIZERS);
        } else {
          setCurrentStep(FormStep.DESSERT);
        }
        break;
      case FormStep.APPETIZERS:
        setCurrentStep(FormStep.DESSERT);
        break;
      case FormStep.DESSERT:
        setCurrentStep(FormStep.SPECIAL_REQUESTS);
        break;
      case FormStep.SPECIAL_REQUESTS:
        setCurrentStep(FormStep.REVIEW);
        break;
      default:
        break;
    }
    
    // Scroll to top when changing steps
    window.scrollTo(0, 0);
  };
  
  // Navigate to previous step
  const goToPreviousStep = () => {
    switch (currentStep) {
      case FormStep.BASIC_INFORMATION:
        setCurrentStep(FormStep.EVENT_TYPE_SELECTION);
        break;
      case FormStep.EVENT_DETAILS:
        setCurrentStep(FormStep.BASIC_INFORMATION);
        break;
      case FormStep.MENU_SELECTION:
        setCurrentStep(FormStep.EVENT_DETAILS);
        break;
      case FormStep.APPETIZERS_QUESTION:
        setCurrentStep(FormStep.MENU_SELECTION);
        break;
      case FormStep.APPETIZERS:
        setCurrentStep(FormStep.APPETIZERS_QUESTION);
        break;
      case FormStep.DESSERT:
        if (watch('wantsAppetizers')) {
          setCurrentStep(FormStep.APPETIZERS);
        } else {
          setCurrentStep(FormStep.APPETIZERS_QUESTION);
        }
        break;
      case FormStep.SPECIAL_REQUESTS:
        setCurrentStep(FormStep.DESSERT);
        break;
      case FormStep.REVIEW:
        setCurrentStep(FormStep.SPECIAL_REQUESTS);
        break;
      default:
        break;
    }
    
    // Scroll to top when changing steps
    window.scrollTo(0, 0);
  };
  
  // Handle form submission
  const onSubmit = async (data: EventInquiryFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Add API call here to submit form data
      console.log('Form submitted with data:', data);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsSubmitted(true);
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError('There was an error submitting your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render current step
  const renderCurrentStep = () => {
    if (isSubmitted) {
      return (
        <div className="container mx-auto px-4 py-16 max-w-xl text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3 text-gray-900">Thank You!</h2>
            <p className="text-lg text-gray-600 mb-6">
              Your event request has been submitted successfully. Our team will review your
              information and get back to you within 1-2 business days.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="mt-4"
            >
              Return to Home
            </Button>
          </div>
        </div>
      );
    }
    
    if (submitError) {
      return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(FormStep.REVIEW)}
            >
              Back to Review
            </Button>
            <Button 
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <Suspense fallback={<StepLoader />}>
        {currentStep === FormStep.EVENT_TYPE_SELECTION && (
          <EventTypeSelectionStep 
            onSelectEventType={handleSelectEventType}
            selectedEventType={selectedEventType}
          />
        )}
        
        {currentStep === FormStep.BASIC_INFORMATION && selectedEventType && (
          <BasicInformationStep 
            eventType={selectedEventType}
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
          />
        )}
        
        {currentStep === FormStep.EVENT_DETAILS && selectedEventType && (
          <EventDetailsStep 
            eventType={selectedEventType}
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
          />
        )}
        
        {currentStep === FormStep.MENU_SELECTION && (
          <MenuSelectionStep 
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
          />
        )}
        
        {currentStep === FormStep.APPETIZERS_QUESTION && (
          <AppetizersQuestionStep 
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
          />
        )}
        
        {currentStep === FormStep.APPETIZERS && (
          <AppetizersStep 
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
          />
        )}
        
        {currentStep === FormStep.DESSERT && (
          <DessertStep 
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
          />
        )}
        
        {currentStep === FormStep.SPECIAL_REQUESTS && (
          <SpecialRequestsStep 
            onPrevious={goToPreviousStep}
            onNext={goToNextStep}
          />
        )}
        
        {currentStep === FormStep.REVIEW && (
          <ReviewStep 
            onPrevious={goToPreviousStep}
            onSubmit={handleSubmit(onSubmit)}
          />
        )}
      </Suspense>
    );
  };
  
  // Experimental design badge
  const ExperimentalBadge = () => (
    <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg">
      EXPERIMENTAL VERSION
    </div>
  );
  
  // Progress bar
  const ProgressBar = () => {
    const steps = [
      FormStep.EVENT_TYPE_SELECTION,
      FormStep.BASIC_INFORMATION,
      FormStep.EVENT_DETAILS,
      FormStep.MENU_SELECTION,
      FormStep.APPETIZERS_QUESTION,
      FormStep.DESSERT,
      FormStep.SPECIAL_REQUESTS,
      FormStep.REVIEW
    ];
    
    // Skip appetizers step if not wanted
    if (currentStep !== FormStep.APPETIZERS && currentStep !== FormStep.APPETIZERS_QUESTION && !watch('wantsAppetizers')) {
      steps.splice(5, 1);
    }
    
    const currentIndex = steps.indexOf(currentStep);
    const progress = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md p-4 z-40">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {currentIndex + 1} of {steps.length}</span>
            <span className="text-sm text-gray-500">
              {progress.toFixed(0)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <ExperimentalBadge />
      
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {renderCurrentStep()}
        </form>
      </FormProvider>
      
      {!isSubmitted && <ProgressBar />}
    </div>
  );
};

export default ExperimentalInquiryForm;