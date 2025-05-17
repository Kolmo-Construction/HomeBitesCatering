import React from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface HelpContent {
  suggestion: string;
  examples: string[];
  tips: string[];
}

// Predefined help content for different question types
const helpContentMap: Record<string, HelpContent> = {
  // Text inputs
  text: {
    suggestion: "Please provide the requested information in the text field. Be as specific and accurate as possible.",
    examples: ["If asked for a name, enter your full name (e.g., 'John Smith')", "For a company, enter the full company name"],
    tips: ["Keep your answer concise and to the point", "Double-check for typos before submitting"]
  },
  
  // Email type
  email: {
    suggestion: "Please enter a valid email address that you check regularly. This will be used for communication about your event.",
    examples: ["example@domain.com", "first.last@company.org"],
    tips: ["Make sure to use the correct format with @ symbol", "Check for typos before submitting"]
  },
  
  // Phone number
  phone: {
    suggestion: "Please enter your phone number where we can reach you regarding your event details.",
    examples: ["(555) 123-4567", "555-123-4567"],
    tips: ["Include your area code", "Use a number where you can be reached during business hours"]
  },

  // Number input
  number: {
    suggestion: "Please enter the requested numeric value.",
    examples: ["For guest count, enter the total number of expected guests (e.g., 75)", "For budgets, enter a whole number without symbols"],
    tips: ["Use only digits, no spaces or special characters", "Make sure to be as accurate as possible"]
  },
  
  // Date input
  date: {
    suggestion: "Please select the appropriate date for your event.",
    examples: ["MM/DD/YYYY format", "Use the calendar picker for easy selection"],
    tips: ["Book early for popular dates", "Weekend dates often fill up quickly", "Some dates may have different pricing or availability"]
  },
  
  // Time input
  time: {
    suggestion: "Please select the appropriate time for your event.",
    examples: ["For start time, choose when you want guests to arrive", "For end time, consider setup and cleanup needs"],
    tips: ["Consider peak dining hours if relevant", "Allow buffer time for setup and cleanup", "Some venues have specific time constraints"]
  },
  
  // Multiline text
  textarea: {
    suggestion: "Please provide detailed information in the text area below. You can enter multiple lines of text.",
    examples: ["Describe any specific requests or special accommodations needed"],
    tips: ["Be as specific as possible", "Include all relevant details to help us prepare for your event"]
  },
  
  // Dropdown selection
  select: {
    suggestion: "Please select one option from the dropdown menu that best fits your needs.",
    examples: ["Choose the option that most closely matches your preference"],
    tips: ["Click or tap on the dropdown to see all available options", "Only one selection is allowed"]
  },
  
  // Name fields
  name: {
    suggestion: "Please enter your full name as it should appear on any documentation.",
    examples: ["John Smith", "Maria L. Rodriguez"],
    tips: ["Include first and last name", "Use the name you prefer to be addressed by"]
  },
  
  // Address fields
  address: {
    suggestion: "Please enter your complete address information.",
    examples: ["123 Main St, Apt 4, Anytown, ST 12345"],
    tips: ["Include apartment/suite numbers if applicable", "Double-check for accuracy to ensure proper delivery"]
  },
  
  // Radio buttons
  radio: {
    suggestion: "Please select one option from the available choices.",
    examples: ["Choose the package that best fits your event needs and budget"],
    tips: ["Only one option can be selected", "You can change your selection by clicking a different option"]
  },
  
  // Checkboxes
  checkbox: {
    suggestion: "Please select all options that apply to your needs.",
    examples: ["Select all the services you're interested in"],
    tips: ["You can select multiple options", "Click an option again to deselect it"]
  },
  
  // Toggle switch
  toggle: {
    suggestion: "Use the toggle switch to turn this option on or off.",
    examples: ["Toggle 'Yes' if you need this service, 'No' if you don't"],
    tips: ["The switch turns blue when enabled", "Toggling may reveal additional related fields", "Click or tap to change the setting"]
  },
  
  // Slider
  slider: {
    suggestion: "Drag the slider to select a value within the given range.",
    examples: ["Slide to indicate your preference from 1-10", "For budget questions, slide to your approximate budget"],
    tips: ["The value updates as you move the slider", "You can also click directly on the slider track to set a value", "Pay attention to the minimum and maximum values"]
  },
  
  // Incrementer (Step functions)
  incrementer: {
    suggestion: "Use the plus and minus buttons to adjust the value to your preference.",
    examples: ["Click + to increase the count, - to decrease it", "For guest count, adjust to your exact number"],
    tips: ["You can click multiple times to reach your desired value", "Some fields may have minimum or maximum limits"]
  },
  
  // Time picker
  time_picker: {
    suggestion: "Select the appropriate time using the dedicated time picker.",
    examples: ["For event start time, select when guests should arrive", "For meal service, choose your preferred dining time"],
    tips: ["Consider buffer time for setup and transitions", "Some time slots may be more popular than others"]
  },
  
  // Default for any other question types
  default: {
    suggestion: "Please provide the requested information for this field.",
    examples: ["Answer accurately and completely"],
    tips: ["Read the question carefully", "Provide all requested information"]
  }
};

// Get help content based on question type and key
const getHelpContent = (questionType: string, questionKey: string): HelpContent => {
  // Special handling for specific questions based on questionKey if needed
  if (questionKey === 'discount_code' || questionKey === 'promo_code') {
    return {
      suggestion: "If you have a promo code or discount code, please toggle this option to enter it.",
      examples: ["Select 'Yes' if you have a code to enter, 'No' if you don't"],
      tips: ["Discount codes are case-sensitive", "Enter the code exactly as it appears on your promotional material"]
    };
  }
  
  if (questionKey === 'guest_count' || questionKey === 'attendees' || questionKey === 'number_of_guests') {
    return {
      suggestion: "Please indicate the total number of guests expected to attend your event.",
      examples: ["For a party of 50 people, enter '50'"],
      tips: ["Include all attendees in your count", "Be as accurate as possible to ensure proper preparation"]
    };
  }
  
  if (questionKey === 'has_promo_code') {
    return {
      suggestion: "Please indicate whether you have a promotional code to apply to your order.",
      examples: ["Toggle to 'Yes' if you have a code, 'No' if you don't"],
      tips: ["If you select 'Yes', you'll be prompted to enter your code", "You can always change this selection later"]
    };
  }
  
  if (questionKey === 'budget' || questionKey === 'budget_range') {
    return {
      suggestion: "Please indicate your approximate budget for this event.",
      examples: ["Use the slider to select a value that matches your budget expectations"],
      tips: ["This helps us tailor recommendations to your needs", "Remember this is an estimate and can be adjusted later"]
    };
  }
  
  // Return predefined content based on question type, or default if not found
  return helpContentMap[questionType] || helpContentMap.default;
};

interface ContextualHelpSidebarProps {
  question: {
    questionText: string;
    questionType: string;
    questionKey: string;
    helpText?: string;
  };
  currentValue?: any;
  formValues?: Record<string, any>;
  isOpen: boolean;
  onClose: () => void;
}

const ContextualHelpSidebar: React.FC<ContextualHelpSidebarProps> = ({
  question,
  isOpen,
  onClose
}) => {
  // Get deterministic help content based on the question type and key
  const helpContent = getHelpContent(question.questionType, question.questionKey);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 z-40" 
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* Mobile-first design with slide-in sidebar */}
      <div 
        className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm md:max-w-md bg-white shadow-lg z-50 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Help & Instructions</h3>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close help">
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
          
          <Separator className="my-3" />
          
          <div className="mb-3">
            <h4 className="font-medium mb-2">Question</h4>
            <p className="text-sm">{question.questionText}</p>
            {question.helpText && (
              <div className="mt-2 text-sm text-muted-foreground">
                <p>{question.helpText}</p>
              </div>
            )}
          </div>
          
          <Separator className="my-3" />
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Instructions</h4>
              <Card className="p-3 bg-blue-50">
                <p className="text-sm">{helpContent.suggestion}</p>
              </Card>
            </div>
            
            {helpContent.examples.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Examples</h5>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {helpContent.examples.map((example, i) => (
                    <li key={i}>{example}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {helpContent.tips.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Tips</h5>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {helpContent.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextualHelpSidebar;