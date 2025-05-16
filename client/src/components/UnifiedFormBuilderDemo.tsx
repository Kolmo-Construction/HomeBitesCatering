import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const UnifiedFormBuilderDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('builder');
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [requestBody, setRequestBody] = useState('');
  const [responseData, setResponseData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState('create-definition');
  const { toast } = useToast();

  // Template examples for different actions
  const templates = {
    'create-definition': JSON.stringify({
      action: 'createDefinition',
      data: {
        title: 'Catering Inquiry Form',
        description: 'A form to collect information about catering inquiries',
        status: 'draft',
        version: '1.0',
        versionName: 'catering-inquiry-v1'
      }
    }, null, 2),
    'add-page': JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 1, // Replace with actual definition ID
        title: 'Customer Information',
        description: 'Please provide your contact information',
        order: 1
      }
    }, null, 2),
    'add-questions': JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 1, // Replace with actual page ID
        questions: [
          {
            questionText: 'What is your name?',
            questionKey: 'customer_name',
            questionType: 'text',
            isRequired: true,
            order: 1,
            helpText: 'Please enter your full name'
          },
          {
            questionText: 'Email Address',
            questionKey: 'email',
            questionType: 'email',
            isRequired: true,
            order: 2,
            helpText: 'We will use this to contact you'
          }
        ]
      }
    }, null, 2),
    'update-page': JSON.stringify({
      action: 'updatePage',
      data: {
        pageId: 1, // Replace with actual page ID
        title: 'Contact Information',
        description: 'Updated description for contact information page'
      }
    }, null, 2),
    'update-question': JSON.stringify({
      action: 'updateQuestion',
      data: {
        questionId: 1, // Replace with actual question ID
        questionText: 'Updated question text',
        isRequired: false,
        helpText: 'Updated help text'
      }
    }, null, 2),
    'delete-page': JSON.stringify({
      action: 'deletePage',
      data: {
        pageId: 1 // Replace with actual page ID
      }
    }, null, 2),
    'delete-question': JSON.stringify({
      action: 'deleteQuestion',
      data: {
        questionId: 1 // Replace with actual question ID
      }
    }, null, 2),
    'add-conditional-logic': JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 1, // Replace with actual definition ID
        sourceQuestionId: 1, // Question ID that triggers the condition
        targetQuestionId: 2, // Question ID to show/hide based on condition
        condition: 'equals',
        value: 'Yes',
        action: 'show'
      }
    }, null, 2),
    'update-conditional-logic': JSON.stringify({
      action: 'updateConditionalLogic',
      data: {
        ruleId: 1, // Replace with actual rule ID
        condition: 'not_equals',
        value: 'No',
        action: 'hide'
      }
    }, null, 2),
    'delete-conditional-logic': JSON.stringify({
      action: 'deleteConditionalLogic',
      data: {
        ruleId: 1 // Replace with actual rule ID
      }
    }, null, 2),
    'get-full-questionnaire': JSON.stringify({
      action: 'getFullQuestionnaire',
      data: {
        definitionId: 1 // Replace with actual definition ID
      }
    }, null, 2),
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const handleActionTabChange = (value: string) => {
    setActiveActionTab(value);
    setRequestBody(templates[value as keyof typeof templates] || '');
  };

  const handleSendRequest = async () => {
    try {
      setIsLoading(true);
      
      if (!requestBody.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Request body cannot be empty",
        });
        setIsLoading(false);
        return;
      }

      let parsedBody;
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Invalid JSON",
          description: "Please check your JSON format",
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/questionnaires/builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const responseJson = await response.json();
      setResponseData(JSON.stringify(responseJson, null, 2));

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "API Error",
          description: responseJson.message || "Something went wrong",
        });
      } else {
        toast({
          title: "Success",
          description: "Request processed successfully",
        });
      }
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: "Unable to send request to the server",
      });
      setResponseData(JSON.stringify({ error: "Failed to send request" }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  // Home Bites 2025 Quotation Form full implementation
  const homeBitesForm = {
    // Form Definition
    definition: JSON.stringify({
      action: 'createDefinition',
      data: {
        title: 'Home Bites 2025 Quotation Form',
        description: 'Complete catering quotation form for Home Bites Catering Services',
        status: 'draft',
        version: '1.0',
        versionName: 'home-bites-quotation-2025'
      }
    }, null, 2),

    // Page 1: Basic Information
    page1: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 18, // Using the definitionId from our created form (18)
        title: 'Event Information',
        description: 'Tell us about your event',
        order: 1
      }
    }, null, 2),

    // Page 1 Welcome Header
    page1Header: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 1, // Will be replaced with actual page ID after page creation
        questions: [
          {
            questionText: 'Home Bites Catering - 2025 Quotation Form',
            questionKey: 'welcome_header',
            questionType: 'info_text',
            order: 1,
            isRequired: false,
            helpText: `At Home Bites, we understand that every occasion is unique. We've designed our "Themed Menus" to provide a variety of options to suit all your different needs. We also offer an exciting food truck option for smaller parties with a menu that has something for everyone. Our food is simple, approachable, affordable, and most importantly, prepared with love and care.`
          }
        ]
      }
    }, null, 2),

    // Event Type Question
    eventTypeQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 1,
        questions: [
          {
            questionText: 'Event Type',
            questionKey: 'event_type',
            questionType: 'radio',
            order: 2,
            isRequired: true,
            helpText: 'Please select the type of event you are planning'
          }
        ]
      }
    }, null, 2),

    // Event Type Options
    eventTypeOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 2, // Replace with actual question ID after creation
        options: [
          {
            optionText: 'Corporate Event',
            optionValue: 'corporate',
            order: 1
          },
          {
            optionText: 'Wedding',
            optionValue: 'wedding',
            order: 2
          },
          {
            optionText: 'Birthday',
            optionValue: 'birthday',
            order: 3
          },
          {
            optionText: 'Engagement',
            optionValue: 'engagement',
            order: 4
          },
          {
            optionText: 'Other Private Party',
            optionValue: 'other_private',
            order: 5
          },
          {
            optionText: 'Food Truck',
            optionValue: 'food_truck',
            order: 6
          }
        ]
      }
    }, null, 2),

    // Page 2: Contact Information
    page2: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 18,
        title: 'Contact Information',
        description: 'Please provide your contact details',
        order: 2
      }
    }, null, 2),

    // Contact Information Questions
    contactInfoQuestions: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 2,
        questions: [
          {
            questionText: 'Your Name',
            questionKey: 'customer_name',
            questionType: 'name',
            order: 1,
            isRequired: true
          },
          {
            questionText: 'Email Address',
            questionKey: 'email',
            questionType: 'email',
            order: 2,
            isRequired: true,
            helpText: 'We will use this to send you your quotation'
          },
          {
            questionText: 'Phone Number',
            questionKey: 'phone',
            questionType: 'phone',
            order: 3,
            isRequired: true,
            helpText: 'We may need to call you to discuss your requirements'
          },
          {
            questionText: 'Company Name',
            questionKey: 'company_name',
            questionType: 'text',
            order: 4,
            isRequired: false,
            helpText: 'If this is a corporate event'
          },
          {
            questionText: 'Billing Address',
            questionKey: 'billing_address',
            questionType: 'address',
            order: 5,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Page 3: Event Details
    page3: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 18,
        title: 'Event Details',
        description: 'Tell us more about your event',
        order: 3
      }
    }, null, 2),

    // Event Details Questions
    eventDetailsQuestions: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 3,
        questions: [
          {
            questionText: 'Event Date',
            questionKey: 'event_date',
            questionType: 'date',
            order: 1,
            isRequired: true
          },
          {
            questionText: 'Number of Guests',
            questionKey: 'guest_count',
            questionType: 'number',
            order: 2,
            isRequired: true,
            helpText: 'Approximate number of guests expected'
          },
          {
            questionText: 'Have you secured a venue?',
            questionKey: 'venue_secured',
            questionType: 'radio',
            order: 3,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Venue Secured Options
    venueSecuredOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 13, // Replace with actual question ID
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, null, 2),

    // Venue Questions
    venueQuestions: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 3,
        questions: [
          {
            questionText: 'Venue Name',
            questionKey: 'venue_name',
            questionType: 'text',
            order: 4,
            isRequired: true,
            placeholderText: 'Enter the name of your venue'
          },
          {
            questionText: 'Venue Location',
            questionKey: 'venue_location',
            questionType: 'address',
            order: 5,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Event Timing Questions
    eventTimingQuestions: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 3,
        questions: [
          {
            questionText: 'Event Start Time',
            questionKey: 'event_start_time',
            questionType: 'time',
            order: 6,
            isRequired: true
          },
          {
            questionText: 'Event End Time',
            questionKey: 'event_end_time',
            questionType: 'time',
            order: 7,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Wedding Specific Questions
    weddingQuestions: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 3,
        questions: [
          {
            questionText: 'Ceremony Start Time',
            questionKey: 'ceremony_start_time',
            questionType: 'time',
            order: 8,
            isRequired: true
          },
          {
            questionText: 'Ceremony End Time',
            questionKey: 'ceremony_end_time',
            questionType: 'time',
            order: 9,
            isRequired: true
          },
          {
            questionText: 'Setup before Ceremony?',
            questionKey: 'setup_before_ceremony',
            questionType: 'radio',
            order: 10,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Setup Before Ceremony Options
    setupBeforeCeremonyOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 19, // Replace with actual question ID
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, null, 2),

    // Cocktail Hour Questions
    cocktailHourQuestions: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 3,
        questions: [
          {
            questionText: 'Would you like a cocktail hour?',
            questionKey: 'cocktail_hour',
            questionType: 'radio',
            order: 11,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Cocktail Hour Options
    cocktailHourOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 20, // Replace with actual question ID
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, null, 2),

    // Cocktail Hour Timing
    cocktailHourTiming: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 3,
        questions: [
          {
            questionText: 'Cocktail Hour Start Time',
            questionKey: 'cocktail_start_time',
            questionType: 'time',
            order: 12,
            isRequired: true
          },
          {
            questionText: 'Cocktail Hour End Time',
            questionKey: 'cocktail_end_time',
            questionType: 'time',
            order: 13,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Page 4: Food Service
    page4: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 18,
        title: 'Food Service Preferences',
        description: 'Tell us about your food service preferences',
        order: 4
      }
    }, null, 2),

    // Service Style Question
    serviceStyleQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 4,
        questions: [
          {
            questionText: 'Service Style',
            questionKey: 'service_style',
            questionType: 'radio',
            order: 1,
            isRequired: true,
            helpText: 'Select the service style that best suits your event'
          }
        ]
      }
    }, null, 2),

    // Service Style Options
    serviceStyleOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 23, // Replace with actual question ID
        options: [
          {
            optionText: 'Buffet Standard',
            optionValue: 'buffet_standard',
            order: 1
          },
          {
            optionText: 'Buffet Premium',
            optionValue: 'buffet_premium',
            order: 2
          },
          {
            optionText: 'Plated',
            optionValue: 'plated',
            order: 3
          },
          {
            optionText: 'Family Style',
            optionValue: 'family_style',
            order: 4
          },
          {
            optionText: 'Food Station',
            optionValue: 'food_station',
            order: 5
          }
        ]
      }
    }, null, 2),

    // Food Service Timing
    foodServiceTiming: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 4,
        questions: [
          {
            questionText: 'Food Service Start Time',
            questionKey: 'food_service_start',
            questionType: 'time',
            order: 2,
            isRequired: true
          },
          {
            questionText: 'Food Service End Time',
            questionKey: 'food_service_end',
            questionType: 'time',
            order: 3,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Page 5: Menu Selection
    page5: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 18,
        title: 'Menu Selection',
        description: 'Select your preferred menu',
        order: 5
      }
    }, null, 2),

    // Menu Type Question
    menuTypeQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 5,
        questions: [
          {
            questionText: 'Menu Theme',
            questionKey: 'menu_theme',
            questionType: 'radio',
            order: 1,
            isRequired: true,
            helpText: 'Select your preferred menu theme'
          }
        ]
      }
    }, null, 2),

    // Menu Type Options
    menuTypeOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 26, // Replace with actual question ID
        options: [
          {
            optionText: 'Taco Fiesta',
            optionValue: 'taco_fiesta',
            order: 1
          },
          {
            optionText: 'American BBQ',
            optionValue: 'american_bbq',
            order: 2
          },
          {
            optionText: 'Italian Pasta',
            optionValue: 'italian_pasta',
            order: 3
          },
          {
            optionText: 'Mediterranean',
            optionValue: 'mediterranean',
            order: 4
          },
          {
            optionText: 'Asian',
            optionValue: 'asian',
            order: 5
          }
        ]
      }
    }, null, 2),

    // Page 6: Taco Fiesta Menu
    page6: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 1,
        title: 'Taco Fiesta Menu Options',
        description: 'Customize your Taco Fiesta menu',
        order: 6
      }
    }, null, 2),

    // Package Level
    tacoPackageQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 6,
        questions: [
          {
            questionText: 'Package Level',
            questionKey: 'taco_package_level',
            questionType: 'radio',
            order: 1,
            isRequired: true,
            helpText: 'Select your preferred package level'
          }
        ]
      }
    }, null, 2),

    // Package Options
    tacoPackageOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 28, // Replace with actual question ID
        options: [
          {
            optionText: 'Bronze (Choose 3 Proteins, 2 Sides, 3 Salsas)',
            optionValue: 'bronze',
            order: 1
          },
          {
            optionText: 'Silver (Choose 4 Proteins, 3 Sides, 4 Salsas)',
            optionValue: 'silver',
            order: 2
          },
          {
            optionText: 'Gold (Choose 5 Proteins, 4 Sides, 5 Salsas)',
            optionValue: 'gold',
            order: 3
          }
        ]
      }
    }, null, 2),

    // Protein Selection
    tacoProteinQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 6,
        questions: [
          {
            questionText: 'Protein Selection',
            questionKey: 'taco_proteins',
            questionType: 'checkbox',
            order: 2,
            isRequired: true,
            helpText: 'Select your desired protein options (number allowed depends on package)'
          }
        ]
      }
    }, null, 2),

    // Protein Options
    tacoProteinOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 29, // Replace with actual question ID
        options: [
          {
            optionText: 'Carne Asada (Grilled Steak)',
            optionValue: 'carne_asada',
            order: 1
          },
          {
            optionText: 'Pollo Asado (Grilled Chicken)',
            optionValue: 'pollo_asado',
            order: 2
          },
          {
            optionText: 'Carnitas (Slow Cooked Pork)',
            optionValue: 'carnitas',
            order: 3
          },
          {
            optionText: 'Al Pastor (Marinated Pork)',
            optionValue: 'al_pastor',
            order: 4
          },
          {
            optionText: 'Barbacoa (Slow Cooked Beef)',
            optionValue: 'barbacoa',
            order: 5
          },
          {
            optionText: 'Chorizo (Mexican Sausage)',
            optionValue: 'chorizo',
            order: 6
          },
          {
            optionText: 'Pescado (Fish)',
            optionValue: 'pescado',
            order: 7
          },
          {
            optionText: 'Camarones (Shrimp)',
            optionValue: 'camarones',
            order: 8
          },
          {
            optionText: 'Vegetarian (Grilled Vegetables)',
            optionValue: 'vegetarian',
            order: 9
          }
        ]
      }
    }, null, 2),

    // Side Selection Question
    tacoSidesQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 6,
        questions: [
          {
            questionText: 'Side Selection',
            questionKey: 'taco_sides',
            questionType: 'checkbox',
            order: 3,
            isRequired: true,
            helpText: 'Select your desired side options (number allowed depends on package)'
          }
        ]
      }
    }, null, 2),

    // Side Options
    tacoSideOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 30, // Replace with actual question ID
        options: [
          {
            optionText: 'Mexican Rice',
            optionValue: 'mexican_rice',
            order: 1
          },
          {
            optionText: 'Black Beans',
            optionValue: 'black_beans',
            order: 2
          },
          {
            optionText: 'Refried Beans',
            optionValue: 'refried_beans',
            order: 3
          },
          {
            optionText: 'Elote (Mexican Street Corn)',
            optionValue: 'elote',
            order: 4
          },
          {
            optionText: 'Mexican Ceasar Salad',
            optionValue: 'mexican_caesar',
            order: 5
          },
          {
            optionText: 'Chips & Guacamole',
            optionValue: 'chips_guacamole',
            order: 6
          }
        ]
      }
    }, null, 2),

    // Salsa Selection Question
    tacoSalsaQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 6,
        questions: [
          {
            questionText: 'Salsa Selection',
            questionKey: 'taco_salsas',
            questionType: 'checkbox',
            order: 4,
            isRequired: true,
            helpText: 'Select your desired salsa options (number allowed depends on package)'
          }
        ]
      }
    }, null, 2),

    // Salsa Options
    tacoSalsaOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 31, // Replace with actual question ID
        options: [
          {
            optionText: 'Pico de Gallo',
            optionValue: 'pico_de_gallo',
            order: 1
          },
          {
            optionText: 'Salsa Verde (Mild)',
            optionValue: 'salsa_verde',
            order: 2
          },
          {
            optionText: 'Salsa Roja (Medium)',
            optionValue: 'salsa_roja',
            order: 3
          },
          {
            optionText: 'Chipotle Salsa (Medium-Hot)',
            optionValue: 'chipotle_salsa',
            order: 4
          },
          {
            optionText: 'Habanero Salsa (Hot)',
            optionValue: 'habanero_salsa',
            order: 5
          },
          {
            optionText: 'Mango Salsa (Sweet)',
            optionValue: 'mango_salsa',
            order: 6
          }
        ]
      }
    }, null, 2),

    // Similar pages for other menu types would follow...
    // For brevity, I'm including just one example menu type (Taco Fiesta)

    // Page 12: Dessert Options
    page12: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 1,
        title: 'Dessert Options',
        description: 'Add desserts to your menu',
        order: 12
      }
    }, null, 2),

    // Dessert Question
    dessertQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 12,
        questions: [
          {
            questionText: 'Would you like to add desserts?',
            questionKey: 'add_desserts',
            questionType: 'radio',
            order: 1,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Dessert Options
    dessertOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 55, // Replace with actual question ID
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, null, 2),

    // Dessert Selection
    dessertSelection: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 12,
        questions: [
          {
            questionText: 'Select Desserts',
            questionKey: 'dessert_selection',
            questionType: 'checkbox',
            order: 2,
            isRequired: true,
            helpText: 'Select the desserts you would like to add ($5.00 per person per dessert)'
          }
        ]
      }
    }, null, 2),

    // Dessert Selection Options
    dessertSelectionOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 56, // Replace with actual question ID
        options: [
          {
            optionText: 'Churros with Chocolate Sauce',
            optionValue: 'churros',
            order: 1
          },
          {
            optionText: 'Assorted Cookies Platter',
            optionValue: 'cookies',
            order: 2
          },
          {
            optionText: 'Chocolate Brownie Bites',
            optionValue: 'brownies',
            order: 3
          },
          {
            optionText: 'Mini Cupcakes Assortment',
            optionValue: 'cupcakes',
            order: 4
          },
          {
            optionText: 'Fresh Fruit Platter',
            optionValue: 'fruit',
            order: 5
          }
        ]
      }
    }, null, 2),

    // Page 13: Beverage Options
    page13: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 1,
        title: 'Beverage Options',
        description: 'Add beverages to your menu',
        order: 13
      }
    }, null, 2),

    // Beverage Question
    beverageQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 13,
        questions: [
          {
            questionText: 'Would you like to add beverages?',
            questionKey: 'add_beverages',
            questionType: 'radio',
            order: 1,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Beverage Options
    beverageOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 58, // Replace with actual question ID
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, null, 2),

    // Beverage Package
    beveragePackage: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 13,
        questions: [
          {
            questionText: 'Beverage Package',
            questionKey: 'beverage_package',
            questionType: 'radio',
            order: 2,
            isRequired: true,
            helpText: 'Select your preferred beverage package'
          }
        ]
      }
    }, null, 2),

    // Beverage Package Options
    beveragePackageOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 59, // Replace with actual question ID
        options: [
          {
            optionText: 'Non-Alcoholic Package (Water, Soda, Juice) - $3.00 per person',
            optionValue: 'non_alcoholic',
            order: 1
          },
          {
            optionText: 'Beer & Wine Package - $10.00 per person',
            optionValue: 'beer_wine',
            order: 2
          },
          {
            optionText: 'Full Bar Package - $15.00 per person',
            optionValue: 'full_bar',
            order: 3
          }
        ]
      }
    }, null, 2),

    // Page 14: Additional Services
    page14: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 18,
        title: 'Additional Services',
        description: 'Select any additional services you may need',
        order: 14
      }
    }, null, 2),

    // Staff Services
    staffServices: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 14,
        questions: [
          {
            questionText: 'Would you like to add service staff?',
            questionKey: 'add_staff',
            questionType: 'radio',
            order: 1,
            isRequired: true,
            helpText: 'Our staff will help serve, clean up, and ensure your event runs smoothly'
          }
        ]
      }
    }, null, 2),

    // Staff Services Options
    staffServicesOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 61, // Replace with actual question ID
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, null, 2),

    // Staff Hours
    staffHours: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 14,
        questions: [
          {
            questionText: 'How many hours of service do you need?',
            questionKey: 'staff_hours',
            questionType: 'number',
            order: 2,
            isRequired: true,
            helpText: 'Staff is $30 per staff member per hour (minimum 4 hours)'
          },
          {
            questionText: 'How many staff members do you need?',
            questionKey: 'staff_count',
            questionType: 'number',
            order: 3,
            isRequired: true,
            helpText: 'We recommend 1 staff member per 25 guests'
          }
        ]
      }
    }, null, 2),

    // Rental Items
    rentalItems: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 14,
        questions: [
          {
            questionText: 'Do you need any rental items?',
            questionKey: 'need_rentals',
            questionType: 'radio',
            order: 4,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Rental Items Options
    rentalItemsOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 64, // Replace with actual question ID
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, null, 2),

    // Rental Item Selection
    rentalItemSelection: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 14,
        questions: [
          {
            questionText: 'Select Rental Items',
            questionKey: 'rental_items',
            questionType: 'checkbox',
            order: 5,
            isRequired: true,
            helpText: 'Select the rental items you would like to add'
          }
        ]
      }
    }, null, 2),

    // Rental Items Options
    rentalItemSelectionOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 65, // Replace with actual question ID
        options: [
          {
            optionText: 'Tables - $10.00 each',
            optionValue: 'tables',
            order: 1
          },
          {
            optionText: 'Chairs - $2.50 each',
            optionValue: 'chairs',
            order: 2
          },
          {
            optionText: 'Linens - $10.00 each',
            optionValue: 'linens',
            order: 3
          },
          {
            optionText: 'China Place Settings - $5.00 per person',
            optionValue: 'china',
            order: 4
          },
          {
            optionText: 'Glassware - $3.00 per person',
            optionValue: 'glassware',
            order: 5
          },
          {
            optionText: 'Silverware - $3.00 per person',
            optionValue: 'silverware',
            order: 6
          }
        ]
      }
    }, null, 2),

    // Page 15: Special Requests
    page15: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 18,
        title: 'Special Requests & Dietary Needs',
        description: 'Tell us about any special requests or dietary restrictions',
        order: 15
      }
    }, null, 2),

    // Dietary Restrictions Question
    dietaryRestrictionsQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 15,
        questions: [
          {
            questionText: 'Do you have any dietary restrictions or allergies we should know about?',
            questionKey: 'dietary_restrictions',
            questionType: 'checkbox',
            order: 1,
            isRequired: false,
            helpText: 'Select all that apply'
          }
        ]
      }
    }, null, 2),

    // Dietary Restrictions Options
    dietaryRestrictionsOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 67, // Replace with actual question ID
        options: [
          {
            optionText: 'Vegetarian',
            optionValue: 'vegetarian',
            order: 1
          },
          {
            optionText: 'Vegan',
            optionValue: 'vegan',
            order: 2
          },
          {
            optionText: 'Gluten-Free',
            optionValue: 'gluten_free',
            order: 3
          },
          {
            optionText: 'Dairy-Free',
            optionValue: 'dairy_free',
            order: 4
          },
          {
            optionText: 'Nut Allergies',
            optionValue: 'nut_allergies',
            order: 5
          },
          {
            optionText: 'Shellfish Allergies',
            optionValue: 'shellfish_allergies',
            order: 6
          }
        ]
      }
    }, null, 2),

    // Special Requests Text
    specialRequestsText: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 15,
        questions: [
          {
            questionText: 'Any other special requests or notes you would like to share with us?',
            questionKey: 'special_requests',
            questionType: 'textarea',
            order: 2,
            isRequired: false,
            helpText: 'Please provide any additional information that would help us better serve you'
          }
        ]
      }
    }, null, 2),

    // Page 16: Final Page
    page16: JSON.stringify({
      action: 'addPage',
      data: {
        definitionId: 18,
        title: 'Review & Submit',
        description: 'Review your information and submit your quotation request',
        order: 16
      }
    }, null, 2),

    // Final Notes
    finalNotes: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 16,
        questions: [
          {
            questionText: 'Thank You!',
            questionKey: 'final_info',
            questionType: 'info_text',
            order: 1,
            isRequired: false,
            helpText: `Thank you for completing our Home Bites 2025 Quotation Form. Our team will review your information and get back to you with a detailed quote within 48 hours. If you have any questions in the meantime, please contact us at info@homebites.com or call (555) 123-4567.`
          }
        ]
      }
    }, null, 2),

    // Promo Code Question
    promoCodeQuestion: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 16,
        questions: [
          {
            questionText: 'Do you have a promotional code?',
            questionKey: 'has_promo_code',
            questionType: 'radio',
            order: 2,
            isRequired: true
          }
        ]
      }
    }, null, 2),

    // Promo Code Options
    promoCodeOptions: JSON.stringify({
      action: 'addQuestionOptions',
      data: {
        questionId: 71, // Replace with actual question ID
        options: [
          {
            optionText: 'Yes',
            optionValue: 'yes',
            order: 1
          },
          {
            optionText: 'No',
            optionValue: 'no',
            order: 2
          }
        ]
      }
    }, null, 2),

    // Promo Code Entry
    promoCodeEntry: JSON.stringify({
      action: 'addQuestions',
      data: {
        pageId: 16,
        questions: [
          {
            questionText: 'Enter your promotional code',
            questionKey: 'promo_code',
            questionType: 'text',
            order: 3,
            isRequired: false,
            placeholderText: 'Enter code here'
          }
        ]
      }
    }, null, 2),

    // Conditional Logic Examples
    // Show company name only for corporate events
    corporateEventCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'event_type',
        triggerCondition: 'equals',
        triggerValue: 'corporate',
        targetType: 'question',
        targetKey: 'company_name',
        action: 'show'
      }
    }, null, 2),

    // Show ceremony questions only for wedding events
    weddingEventCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'event_type',
        triggerCondition: 'equals',
        triggerValue: 'wedding',
        targetType: 'question',
        targetKey: 'ceremony_start_time',
        action: 'show'
      }
    }, null, 2),

    // Show venue name and location only if venue is secured
    venueSecuredCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'venue_secured',
        triggerCondition: 'equals',
        triggerValue: 'yes',
        targetType: 'question',
        targetKey: 'venue_name',
        action: 'show'
      }
    }, null, 2),

    // Show cocktail hour timing questions only if cocktail hour is selected
    cocktailHourCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'cocktail_hour',
        triggerCondition: 'equals',
        triggerValue: 'yes',
        targetType: 'question',
        targetKey: 'cocktail_start_time',
        action: 'show'
      }
    }, null, 2),

    // Show taco fiesta menu page only if that menu is selected
    tacoFiestaMenuCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'menu_theme',
        triggerCondition: 'equals',
        triggerValue: 'taco_fiesta',
        targetType: 'page',
        targetKey: '6',
        action: 'show'
      }
    }, null, 2),

    // Show dessert selection only if adding desserts
    dessertCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'add_desserts',
        triggerCondition: 'equals',
        triggerValue: 'yes',
        targetType: 'question',
        targetKey: 'dessert_selection',
        action: 'show'
      }
    }, null, 2),

    // Show beverage package only if adding beverages
    beverageCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'add_beverages',
        triggerCondition: 'equals',
        triggerValue: 'yes',
        targetType: 'question',
        targetKey: 'beverage_package',
        action: 'show'
      }
    }, null, 2),

    // Show staff hours only if adding staff
    staffCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'add_staff',
        triggerCondition: 'equals',
        triggerValue: 'yes',
        targetType: 'question',
        targetKey: 'staff_hours',
        action: 'show'
      }
    }, null, 2),

    // Show rental items selection only if adding rentals
    rentalsCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'need_rentals',
        triggerCondition: 'equals',
        triggerValue: 'yes',
        targetType: 'question',
        targetKey: 'rental_items',
        action: 'show'
      }
    }, null, 2),

    // Show promo code entry only if has promo code
    promoCodeCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'has_promo_code',
        triggerCondition: 'equals',
        triggerValue: 'yes',
        targetType: 'question',
        targetKey: 'promo_code',
        action: 'show'
      }
    }, null, 2),

    // Skip to food truck menu for food truck events
    foodTruckSkipCondition: JSON.stringify({
      action: 'addConditionalLogic',
      data: {
        definitionId: 18,
        triggerQuestionKey: 'event_type',
        triggerCondition: 'equals',
        triggerValue: 'food_truck',
        targetType: 'page',
        targetKey: '20',
        action: 'skip'
      }
    }, null, 2)
  };

  const handleExampleSelect = (exampleKey: string) => {
    setSelectedExample(exampleKey);
    setRequestBody(homeBitesForm[exampleKey as keyof typeof homeBitesForm]);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="builder">API Builder</TabsTrigger>
          <TabsTrigger value="home-bites">Home Bites 2025 Form</TabsTrigger>
        </TabsList>
        
        <TabsContent value="builder" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Unified Form Builder API</CardTitle>
              <CardDescription>
                Use this tool to test the unified form builder API with different actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeActionTab} className="w-full" onValueChange={handleActionTabChange}>
                <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
                  <TabsTrigger value="create-definition">Create Definition</TabsTrigger>
                  <TabsTrigger value="add-page">Add Page</TabsTrigger>
                  <TabsTrigger value="add-questions">Add Questions</TabsTrigger>
                  <TabsTrigger value="update-page">Update Page</TabsTrigger>
                  <TabsTrigger value="update-question">Update Question</TabsTrigger>
                  <TabsTrigger value="delete-question">Delete Question</TabsTrigger>
                </TabsList>
                <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
                  <TabsTrigger value="delete-page">Delete Page</TabsTrigger>
                  <TabsTrigger value="add-conditional-logic">Add Logic</TabsTrigger>
                  <TabsTrigger value="update-conditional-logic">Update Logic</TabsTrigger>
                  <TabsTrigger value="delete-conditional-logic">Delete Logic</TabsTrigger>
                  <TabsTrigger value="get-full-questionnaire">Get Questionnaire</TabsTrigger>
                </TabsList>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Request</h3>
                    <Textarea 
                      placeholder="Enter JSON request body"
                      className="font-mono h-[400px]"
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                    />
                    <Button 
                      className="mt-4" 
                      onClick={handleSendRequest}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending...' : 'Send Request'}
                    </Button>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Response</h3>
                    <Textarea 
                      placeholder="Response will appear here"
                      className="font-mono h-[400px] bg-gray-50"
                      value={responseData}
                      readOnly
                    />
                  </div>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="home-bites" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Home Bites 2025 Quotation Form</CardTitle>
              <CardDescription>
                Complete implementation of the Home Bites 2025 Quotation Form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  This is the complete implementation of the Home Bites 2025 Quotation Form 
                  based on the PDF specification. The form contains 16 pages with comprehensive 
                  questions covering all aspects of catering service, including event details, 
                  menu selection, and special services.
                </p>
                <p className="text-gray-700 mb-4">
                  To implement this form, select each component below and click the "Load to API Builder" 
                  button. This will populate the request in the API Builder tab. Then switch to the API 
                  Builder tab and click "Send Request" to create each part of the form.
                </p>
                <p className="text-gray-700 mb-4 font-medium">
                  For a proper implementation, follow the sequence of components in the order they are presented.
                </p>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="form-definition">
                  <AccordionTrigger>1. Form Definition</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Form Definition</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Create the form definition as the container for all pages and questions
                      </p>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.definition}
                      </pre>
                      <Button 
                        className="mt-3"
                        onClick={() => handleExampleSelect('definition')}
                      >
                        Load to API Builder
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="basic-information">
                  <AccordionTrigger>2. Basic Information Page</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Page 1: Event Information</h4>
                      <p className="text-sm text-gray-600 mb-2">Create the first page</p>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page1}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page1')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Welcome Header</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page1Header}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page1Header')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Event Type Question</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.eventTypeQuestion}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('eventTypeQuestion')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Event Type Options</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.eventTypeOptions}
                      </pre>
                      <Button 
                        className="mt-3"
                        onClick={() => handleExampleSelect('eventTypeOptions')}
                      >
                        Load to API Builder
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="contact-information">
                  <AccordionTrigger>3. Contact Information Page</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Page 2: Contact Information</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page2}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page2')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Contact Information Questions</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.contactInfoQuestions}
                      </pre>
                      <Button 
                        className="mt-3"
                        onClick={() => handleExampleSelect('contactInfoQuestions')}
                      >
                        Load to API Builder
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="event-details">
                  <AccordionTrigger>4. Event Details Page</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Page 3: Event Details</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page3}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page3')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Event Details Questions</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.eventDetailsQuestions}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('eventDetailsQuestions')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Venue Questions</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.venueQuestions}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('venueQuestions')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Event Timing Questions</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.eventTimingQuestions}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('eventTimingQuestions')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Wedding Specific Questions</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.weddingQuestions}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('weddingQuestions')}
                      >
                        Load to API Builder
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="food-service">
                  <AccordionTrigger>5. Food Service Page</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Page 4: Food Service</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page4}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page4')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Service Style Question</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.serviceStyleQuestion}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('serviceStyleQuestion')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Service Style Options</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.serviceStyleOptions}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('serviceStyleOptions')}
                      >
                        Load to API Builder
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="menu-selection">
                  <AccordionTrigger>6. Menu Selection Pages</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Page 5: Menu Selection</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page5}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page5')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Menu Type Question</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.menuTypeQuestion}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('menuTypeQuestion')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Menu Type Options</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.menuTypeOptions}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('menuTypeOptions')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Page 6: Taco Fiesta Menu</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page6}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page6')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Taco Package Question</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.tacoPackageQuestion}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('tacoPackageQuestion')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Taco Protein Selection</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.tacoProteinQuestion}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('tacoProteinQuestion')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <p className="text-sm text-gray-600 italic mb-4">
                        Note: The complete form would include similar pages for each menu type
                        (American BBQ, Italian Pasta, Mediterranean, Asian). For brevity, only the Taco Fiesta menu is fully shown.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="additional-services">
                  <AccordionTrigger>7. Additional Services Pages</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Page 12: Dessert Options</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page12}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page12')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Page 13: Beverage Options</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page13}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page13')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Page 14: Additional Services</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page14}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page14')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Staff Services</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.staffServices}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('staffServices')}
                      >
                        Load to API Builder
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="final-pages">
                  <AccordionTrigger>8. Final Pages</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Page 15: Special Requests</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page15}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page15')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Page 16: Review & Submit</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.page16}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('page16')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Final Notes</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.finalNotes}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('finalNotes')}
                      >
                        Load to API Builder
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="conditional-logic">
                  <AccordionTrigger>9. Conditional Logic Rules</AccordionTrigger>
                  <AccordionContent>
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-md font-medium mb-2">Wedding Event Condition</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.weddingEventCondition}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('weddingEventCondition')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Corporate Event Condition</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.corporateEventCondition}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('corporateEventCondition')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Venue Secured Condition</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.venueSecuredCondition}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('venueSecuredCondition')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <h4 className="text-md font-medium mb-2">Menu Type Condition</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                        {homeBitesForm.tacoFiestaMenuCondition}
                      </pre>
                      <Button 
                        className="mt-3 mb-4"
                        onClick={() => handleExampleSelect('tacoFiestaMenuCondition')}
                      >
                        Load to API Builder
                      </Button>
                      
                      <p className="text-sm text-gray-600 italic mb-4">
                        Note: The complete form includes many more conditional logic rules to control 
                        the visibility and flow between questions and pages based on user responses.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              {selectedExample && (
                <div className="mt-6 bg-gray-50 p-4 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Selected Example</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    The selected example has been loaded to the API Builder. Switch to the API Builder tab to send the request.
                  </p>
                  <Button onClick={() => setActiveTab('builder')}>
                    Go to API Builder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedFormBuilderDemo;