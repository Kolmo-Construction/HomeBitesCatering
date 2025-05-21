import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  CalendarHeart, 
  Building, 
  GlassWater, 
  Cake, 
  Truck, 
  Wine,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { FormRenderer, FormDefinition } from "@/components/form-renderer/FormRenderer";

// Define the event types
type EventType = 'wedding' | 'corporate' | 'engagement' | 'birthday' | 'food-truck' | 'mobile-bartending';

// Event type metadata
const eventTypeInfo = {
  'wedding': {
    title: 'Wedding',
    icon: <CalendarHeart className="w-8 h-8" />,
    gradient: 'from-rose-500 to-pink-600',
  },
  'corporate': {
    title: 'Corporate Event',
    icon: <Building className="w-8 h-8" />,
    gradient: 'from-blue-600 to-indigo-700',
  },
  'engagement': {
    title: 'Engagement',
    icon: <GlassWater className="w-8 h-8" />,
    gradient: 'from-purple-500 to-violet-600',
  },
  'birthday': {
    title: 'Birthday',
    icon: <Cake className="w-8 h-8" />,
    gradient: 'from-amber-500 to-orange-600',
  },
  'food-truck': {
    title: 'Food Truck',
    icon: <Truck className="w-8 h-8" />,
    gradient: 'from-emerald-500 to-green-600',
  },
  'mobile-bartending': {
    title: 'Mobile Bartending',
    icon: <Wine className="w-8 h-8" />,
    gradient: 'from-cyan-500 to-blue-600',
  }
};

export default function PublicQuestionnaireView() {
  const { formKey } = useParams();
  const [, navigate] = useLocation();
  const [submissionComplete, setSubmissionComplete] = useState(false);
  
  // Extract event type from the form key if possible
  const eventType = Object.keys(eventTypeInfo).find(type => 
    formKey?.toLowerCase().includes(type)
  ) as EventType | undefined;
  
  // Fetch the resolved form definition
  const { data: formDefinition, isLoading, error } = useQuery({
    queryKey: ['/api/public/questionnaires', formKey],
    queryFn: async () => {
      try {
        // Fetch the fully resolved form definition for public viewing
        const response = await fetch(`/api/public/questionnaires/${formKey}`);
        if (!response.ok) {
          throw new Error('Failed to fetch questionnaire');
        }
        
        return await response.json() as FormDefinition;
      } catch (error) {
        console.error('Error fetching questionnaire:', error);
        throw error;
      }
    },
    enabled: !!formKey,
  });

  // Mutation for submitting the form
  const submitMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      const response = await fetch(`/api/public/questionnaires/${formKey}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responses: formData }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit questionnaire');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setSubmissionComplete(true);
      window.scrollTo(0, 0);
      toast({
        title: "Submission Successful",
        description: "Your questionnaire has been submitted successfully. We'll be in touch soon!",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "There was a problem submitting your questionnaire. Please try again.",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (formData: Record<string, any>) => {
    submitMutation.mutate(formData);
  };

  // Determine header element based on event type
  const headerElement = eventType && formDefinition ? (
    <div className={`p-6 rounded-lg bg-gradient-to-r ${eventTypeInfo[eventType].gradient} text-white flex items-center`}>
      <div className="rounded-full p-3 bg-white/20 mr-4">
        {eventTypeInfo[eventType].icon}
      </div>
      <div>
        <h2 className="text-2xl font-bold">{formDefinition.formTitle || eventTypeInfo[eventType].title}</h2>
        <p className="opacity-80">{formDefinition.description || `Please provide details about your ${eventTypeInfo[eventType].title.toLowerCase()}`}</p>
      </div>
    </div>
  ) : null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-24 rounded-lg bg-gray-200"></div>
            <div className="h-6 w-1/2 rounded bg-gray-200"></div>
            <div className="space-y-4">
              <div className="h-4 rounded bg-gray-200"></div>
              <div className="h-12 rounded bg-gray-200"></div>
              <div className="h-4 rounded bg-gray-200"></div>
              <div className="h-12 rounded bg-gray-200"></div>
              <div className="h-4 rounded bg-gray-200"></div>
              <div className="h-12 rounded bg-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !formDefinition) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto bg-red-50 p-6 rounded-lg border border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Sorry, we encountered a problem</h2>
          <p className="text-gray-700">
            We're experiencing issues loading this questionnaire. Please try again or contact us directly at <a href="mailto:info@catering.com" className="font-medium underline">info@catering.com</a>.
          </p>
          <Button 
            className="mt-4"
            variant="outline"
            onClick={() => navigate('/questionnaire')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event Selection
          </Button>
        </div>
      </div>
    );
  }

  // Show success state after submission
  if (submissionComplete) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 p-8 rounded-lg border border-green-200 text-center"
          >
            <div className="mb-4 flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Thank You!</h2>
            <p className="text-gray-700 mb-6">
              Your questionnaire has been submitted successfully. Our team will review your information
              and get back to you shortly to discuss your {eventType ? eventTypeInfo[eventType].title.toLowerCase() : 'event'} catering needs.
            </p>
            <p className="text-gray-700 mb-8">
              If you have any questions in the meantime, please don't hesitate to reach out to us at{' '}
              <a href="mailto:info@catering.com" className="font-medium text-primary">info@catering.com</a>.
            </p>
            <Button onClick={() => navigate('/questionnaire')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event Selection
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Render the form
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <FormRenderer 
          formDefinition={formDefinition}
          onSubmit={handleSubmit}
          headerElement={headerElement}
          isSubmitting={submitMutation.isPending}
          submitButtonText="Submit Questionnaire"
          className="bg-white p-6 rounded-lg shadow-sm"
        />
      </div>
    </div>
  );
}