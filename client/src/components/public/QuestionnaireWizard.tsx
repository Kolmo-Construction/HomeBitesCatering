import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Helmet } from 'react-helmet';
import { QuestionRenderer } from './QuestionRenderer';
import { PageTransition } from './PageTransition';

// Types
interface EventType {
  id: string;
  title: string;
  description: string;
  image: string;
  formKey: string;
}

interface WizardProps {
  eventType: EventType;
  onBack: () => void;
}

export function QuestionnaireWizard({ eventType, onBack }: WizardProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // Fetch form structure from API based on eventType.formKey
  const { data: formDefinition, isLoading } = useQuery({
    queryKey: [`/api/form-builder/public/forms/${eventType.formKey}`],
    queryFn: async () => {
      // This will be replaced with actual form API integration
      // For now, returning a mock form structure
      return {
        id: 1,
        formKey: eventType.formKey,
        formTitle: `${eventType.title} Questionnaire`,
        pages: [
          {
            id: 1,
            pageTitle: 'Basic Information',
            pageOrder: 1,
            description: 'Let\'s start with some basic details about you and your event.',
            questions: [
              {
                id: 1,
                questionText: 'Your Name',
                questionType: 'full_name',
                isRequired: true,
                fieldKey: 'client_name'
              },
              {
                id: 2,
                questionText: 'Email Address',
                questionType: 'email',
                isRequired: true,
                fieldKey: 'email'
              },
              {
                id: 3,
                questionText: 'Phone Number',
                questionType: 'phone',
                isRequired: true,
                fieldKey: 'phone'
              }
            ]
          },
          {
            id: 2,
            pageTitle: 'Event Details',
            pageOrder: 2,
            description: 'Tell us about your event.',
            questions: [
              {
                id: 4,
                questionText: 'Event Date',
                questionType: 'datetime',
                isRequired: true,
                fieldKey: 'event_date'
              },
              {
                id: 5,
                questionText: 'Expected Number of Guests',
                questionType: 'number',
                isRequired: true,
                fieldKey: 'guest_count'
              },
              {
                id: 6,
                questionText: 'Event Location',
                questionType: 'address',
                isRequired: true,
                fieldKey: 'event_location'
              }
            ]
          },
          {
            id: 3,
            pageTitle: 'Catering Preferences',
            pageOrder: 3,
            description: 'Help us understand your catering needs.',
            questions: [
              {
                id: 7,
                questionText: 'Service Style',
                questionType: 'radio_group',
                isRequired: true,
                fieldKey: 'service_style',
                options: [
                  { label: 'Buffet', value: 'buffet' },
                  { label: 'Family Style', value: 'family' },
                  { label: 'Plated Service', value: 'plated' },
                  { label: 'Food Stations', value: 'stations' }
                ]
              },
              {
                id: 8,
                questionText: 'Dietary Restrictions',
                questionType: 'checkbox_group',
                isRequired: false,
                fieldKey: 'dietary_restrictions',
                options: [
                  { label: 'Vegetarian', value: 'vegetarian' },
                  { label: 'Vegan', value: 'vegan' },
                  { label: 'Gluten-Free', value: 'gluten_free' },
                  { label: 'Dairy-Free', value: 'dairy_free' },
                  { label: 'Nut Allergies', value: 'nut_allergies' },
                  { label: 'Other (Please specify)', value: 'other' }
                ]
              }
            ]
          }
        ]
      };
    }
  });
  
  // Set up form methods with react-hook-form
  const formMethods = useForm({
    mode: 'onChange'
    // Add Zod resolver when we have a schema
  });
  
  // Current page of the form
  const currentPage = formDefinition?.pages[currentPageIndex];
  
  // Navigation functions
  const goToNextPage = () => {
    if (formDefinition && currentPageIndex < formDefinition.pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    } else {
      // If we're on the first page and go back, return to event selection
      onBack();
    }
  };
  
  // Handle form submission
  const onSubmit = formMethods.handleSubmit(async (data) => {
    console.log('Form data submitted:', data);
    // Here we would submit the data to the backend
    // And show a success screen
  });
  
  // Calculate progress percentage
  const progressPercentage = formDefinition 
    ? ((currentPageIndex + 1) / formDefinition.pages.length) * 100 
    : 0;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your questionnaire...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <Helmet>
        <title>{formDefinition?.formTitle || 'Catering Questionnaire'} | At Home Bites</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        {/* Event type indicator */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={goToPrevPage}
            className="flex items-center mr-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="flex items-center">
            <div 
              className="w-10 h-10 rounded-full bg-cover bg-center mr-3"
              style={{ backgroundImage: `url(${eventType.image})` }}
            ></div>
            <div>
              <p className="text-sm text-gray-500">Event Type:</p>
              <h2 className="font-medium">{eventType.title}</h2>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Progress</span>
            <span>{currentPageIndex + 1} of {formDefinition?.pages.length}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <FormProvider {...formMethods}>
          <form onSubmit={onSubmit}>
            <Card className="p-6 shadow-lg mb-8">
              <AnimatePresence mode="wait">
                <PageTransition key={currentPageIndex}>
                  {currentPage && (
                    <div>
                      <h1 className="text-2xl font-bold mb-2">{currentPage.pageTitle}</h1>
                      <p className="text-gray-600 mb-6">{currentPage.description}</p>
                      
                      <div className="space-y-8">
                        {currentPage.questions.map((question) => (
                          <QuestionRenderer
                            key={question.id}
                            question={question}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </PageTransition>
              </AnimatePresence>
            </Card>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevPage}
              >
                Previous
              </Button>
              
              {currentPageIndex < (formDefinition?.pages.length || 0) - 1 ? (
                <Button
                  type="button"
                  onClick={goToNextPage}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                >
                  Submit Questionnaire
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}