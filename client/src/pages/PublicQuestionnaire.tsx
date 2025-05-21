import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  CalendarHeart, 
  Building, 
  GlassWater, 
  Cake, 
  Truck, 
  Wine
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Define the event types
type EventType = 'wedding' | 'corporate' | 'engagement' | 'birthday' | 'food-truck' | 'mobile-bartending';

// Map event types to form keys
const eventFormKeys: Record<EventType, string> = {
  'wedding': 'wedding-questionnaire',
  'corporate': 'corporate-event',
  'engagement': 'engagement-event',
  'birthday': 'birthday-event',
  'food-truck': 'food-truck-event',
  'mobile-bartending': 'mobile-bartending',
};

// Define event card data
const eventTypes = [
  {
    id: 'wedding',
    title: 'Wedding',
    description: 'Let us cater your special day with elegant food service',
    icon: <CalendarHeart className="w-6 h-6" />,
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    id: 'corporate',
    title: 'Corporate Event',
    description: 'Professional catering for business meetings and events',
    icon: <Building className="w-6 h-6" />,
    gradient: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'engagement',
    title: 'Engagement',
    description: 'Celebrate your engagement with friends and family',
    icon: <GlassWater className="w-6 h-6" />,
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    id: 'birthday',
    title: 'Birthday',
    description: 'Make your birthday celebration extra special',
    icon: <Cake className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'food-truck',
    title: 'Food Truck',
    description: 'Mobile food service for any outdoor event',
    icon: <Truck className="w-6 h-6" />,
    gradient: 'from-emerald-500 to-green-600',
  },
  {
    id: 'mobile-bartending',
    title: 'Mobile Bartending',
    description: 'Professional bartending service at your location',
    icon: <Wine className="w-6 h-6" />,
    gradient: 'from-cyan-500 to-blue-600',
  },
];

// Types for form data
interface FormField {
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

interface FormPage {
  id: number;
  pageTitle: string;
  pageOrder: number;
  description?: string;
  questions: FormField[];
}

interface FormDefinition {
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
const DynamicFormField = ({ 
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

// This component displays the dynamically loaded form for the selected event type
const DynamicEventForm = ({ 
  eventType,
  onSubmitSuccess
}: { 
  eventType: EventType;
  onSubmitSuccess: () => void;
}) => {
  const event = eventTypes.find(event => event.id === eventType);
  const formKey = eventFormKeys[eventType];
  const [formStep, setFormStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Fetch the form definition for the selected event type
  const { data: formDefinition, isLoading, error } = useQuery({
    queryKey: [`/api/form-builder/forms`, formKey],
    queryFn: async () => {
      try {
        // First, fetch the form to get its ID
        const formsResponse = await fetch(`/api/form-builder/forms?formKey=${formKey}`);
        if (!formsResponse.ok) {
          throw new Error('Failed to fetch form');
        }
        
        const formsData = await formsResponse.json();
        if (!formsData.data || formsData.data.length === 0) {
          throw new Error(`No form found with key ${formKey}`);
        }
        
        const formId = formsData.data[0].id;
        
        // Then fetch the form with its pages and questions
        const formResponse = await fetch(`/api/form-builder/forms/${formId}`);
        if (!formResponse.ok) {
          throw new Error('Failed to fetch form details');
        }
        
        const formData = await formResponse.json();
        
        // Fetch pages for the form
        const pagesResponse = await fetch(`/api/form-builder/forms/${formId}/pages`);
        if (!pagesResponse.ok) {
          throw new Error('Failed to fetch form pages');
        }
        
        const pages = await pagesResponse.json();
        
        // Sort pages by pageOrder
        const sortedPages = [...pages].sort((a, b) => a.pageOrder - b.pageOrder);
        
        // For each page, fetch its questions
        const pagesWithQuestions = await Promise.all(sortedPages.map(async (page) => {
          const questionsResponse = await fetch(`/api/form-builder/pages/${page.id}/questions`);
          if (!questionsResponse.ok) {
            return { ...page, questions: [] };
          }
          
          const questions = await questionsResponse.json();
          
          // Sort questions by order
          const sortedQuestions = Array.isArray(questions) 
            ? [...questions].sort((a, b) => a.displayOrder - b.displayOrder)
            : [];
          
          return { ...page, questions: sortedQuestions };
        }));
        
        // Return the complete form definition
        return {
          ...formData,
          pages: pagesWithQuestions
        } as FormDefinition;
      } catch (error) {
        console.error('Error fetching form:', error);
        throw error;
      }
    },
    enabled: !!formKey,
  });

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
    }
  };
  
  const goToPreviousStep = () => {
    if (formStep > 0) {
      window.scrollTo(0, 0);
      setFormStep(formStep - 1);
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      // If not using a real backend, simulate success for demo
      // In production, you would post the data to your API
      
      // Format submission data
      const formattedData = {
        responses: formData,
        submitterInfo: {
          email: formData.email || '',
          name: formData.name || formData.fullName || '',
          phone: formData.phone || ''
        }
      };
      
      console.log('Submitting form data:', formattedData);
      
      // TODO: In production, uncomment this to submit to API
      /*
      const response = await fetch(`/api/forms/${formKey}/versions/1/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        throw new Error('Form submission failed');
      }
      */
      
      // Show success message
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg z-50 animate-fade-in-slide';
      toast.style.animationDuration = '0.5s';
      
      const flexContainer = document.createElement('div');
      flexContainer.className = 'flex items-center';
      
      const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      checkIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      checkIcon.setAttribute('class', 'h-6 w-6 mr-2 text-green-500');
      checkIcon.setAttribute('fill', 'none');
      checkIcon.setAttribute('viewBox', '0 0 24 24');
      checkIcon.setAttribute('stroke', 'currentColor');
      
      const checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      checkPath.setAttribute('stroke-linecap', 'round');
      checkPath.setAttribute('stroke-linejoin', 'round');
      checkPath.setAttribute('stroke-width', '2');
      checkPath.setAttribute('d', 'M5 13l4 4L19 7');
      
      checkIcon.appendChild(checkPath);
      
      const message = document.createElement('p');
      message.className = 'font-medium';
      message.textContent = `Your ${eventType} request has been submitted successfully! We'll contact you soon.`;
      
      flexContainer.appendChild(checkIcon);
      flexContainer.appendChild(message);
      toast.appendChild(flexContainer);
      
      document.body.appendChild(toast);
      
      // Remove toast after 5 seconds and reset form
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'opacity 0.5s, transform 0.5s';
        
        setTimeout(() => {
          document.body.removeChild(toast);
          // Reset form and return to event selection
          setFormData({});
          setFormStep(0);
          onSubmitSuccess();
        }, 500);
      }, 3000);
      
      return true;
    } catch (error) {
      console.error('Error submitting form:', error);
      return false;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p>Loading {event?.title} questionnaire...</p>
      </div>
    );
  }
  
  if (error || !formDefinition) {
    // Fallback to a default form if the API fails (optional)
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-700">
              We're experiencing issues loading the {event?.title} questionnaire. Please try again or contact us directly at <a href="mailto:info@catering.com" className="font-medium underline">info@catering.com</a>.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  const currentPage = formPages[formStep] || { questions: [] };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header with event type icon and title */}
      <div className={`p-6 rounded-lg bg-gradient-to-r ${event?.gradient} text-white flex items-center`}>
        <div className="rounded-full p-3 bg-white/20 mr-4">
          {event?.icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{formDefinition.formTitle || event?.title}</h2>
          <p className="opacity-80">{formDefinition.description || `Please provide details about your ${event?.title.toLowerCase()}`}</p>
        </div>
      </div>
      
      {/* Progress indicators */}
      {formPages.length > 1 && (
        <div className="flex justify-between mb-4">
          {formPages.map((page, index) => (
            <div key={index} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                  ${index === formStep ? 'bg-primary text-white' : 
                    index < formStep ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}
              >
                {index < formStep ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`ml-2 hidden sm:inline-block text-sm ${index === formStep ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {page.pageTitle}
              </span>
              {index < formPages.length - 1 && (
                <div className={`w-12 h-1 mx-1 ${index < formStep ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Form fields for current step */}
      <motion.div
        key={`form-step-${formStep}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="p-6 border rounded-lg bg-card shadow-sm"
      >
        <h3 className="text-xl font-semibold mb-4">{currentPage.pageTitle}</h3>
        {currentPage.description && (
          <p className="text-gray-600 mb-6">{currentPage.description}</p>
        )}
        
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {currentPage.questions?.length > 0 ? (
            currentPage.questions.map((question) => (
              <DynamicFormField
                key={question.id}
                question={question}
                value={formData[question.questionKey]}
                onChange={handleFieldChange}
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No questions available on this page.</p>
          )}
        </motion.div>
        
        <div className="flex justify-between mt-8 pt-4 border-t">
          {formStep > 0 ? (
            <Button variant="outline" onClick={goToPreviousStep}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Back
            </Button>
          ) : (
            <div></div>
          )}
          
          {formStep < formPages.length - 1 ? (
            <Button onClick={goToNextStep}>
              Continue
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Button>
          ) : (
            <Button 
              className={`bg-gradient-to-r ${event?.gradient} hover:opacity-90`}
              onClick={handleSubmit}
            >
              Submit {event?.title} Request
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function PublicQuestionnaire() {
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);

  // Handle card selection
  const handleSelectEvent = (eventId: EventType) => {
    setSelectedEvent(eventId);
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">Event Catering Services</h1>
      <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
        Select your event type below and fill out our questionnaire to receive a customized catering quote for your special occasion.
      </p>

      {!selectedEvent ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ 
            duration: 0.5,
            staggerChildren: 0.1 
          }}
        >
          {eventTypes.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelectEvent(event.id as EventType)}
            >
              <div className={`p-6 bg-gradient-to-r ${event.gradient} text-white`}>
                <div className="rounded-full w-12 h-12 bg-white/20 flex items-center justify-center mb-4">
                  {event.icon}
                </div>
                <h2 className="text-xl font-bold mb-2">{event.title}</h2>
                <p className="opacity-90">{event.description}</p>
              </div>
              <div className="p-4 bg-white flex justify-between items-center">
                <span className="text-sm text-gray-500">Fill out questionnaire</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div>
          <button 
            onClick={() => setSelectedEvent(null)}
            className="mb-8 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back to event selection
          </button>
          
          <DynamicEventForm 
            eventType={selectedEvent} 
            onSubmitSuccess={() => setSelectedEvent(null)}
          />
        </div>
      )}
    </div>
  );
}