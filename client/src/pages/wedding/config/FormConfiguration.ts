// Dynamic form configuration system for wedding inquiries
import { FormStep, QuestionSection, FormQuestion, WeddingInquiryFormData } from '../types/WeddingInquiryTypes';

export const WEDDING_FORM_STEPS: FormStep[] = [
  {
    id: 1,
    title: "Contact & Basic Information",
    description: "Tell us about you and your partner",
    fields: ['contactInfo'],
    isRequired: true,
    validation: (data) => !!(data.contactInfo?.primaryContact && data.contactInfo?.email && data.contactInfo?.phone)
  },
  {
    id: 2,
    title: "Event Details & Venue",
    description: "When and where is your special day?",
    fields: ['eventDetails'],
    isRequired: true,
    validation: (data) => !!(data.eventDetails?.eventDate && data.eventDetails?.venue)
  },
  {
    id: 3,
    title: "Guest Information",
    description: "Help us understand your guest list",
    fields: ['guestInfo'],
    isRequired: true,
    validation: (data) => !!(data.guestInfo?.totalGuests && data.guestInfo?.totalGuests > 0)
  },
  {
    id: 4,
    title: "Service Style & Requirements",
    description: "What type of dining experience do you envision?",
    fields: ['serviceRequirements'],
    isRequired: true
  },
  {
    id: 5,
    title: "Staffing & Equipment Needs",
    description: "Let's plan the logistics",
    fields: ['staffingNeeds', 'equipmentNeeds'],
    isRequired: false
  },
  {
    id: 6,
    title: "Menu Selection",
    description: "Choose your cuisine and customize your menu",
    fields: ['menuSelections'],
    isRequired: true
  },
  {
    id: 7,
    title: "Budget & Timeline",
    description: "Help us create the perfect proposal",
    fields: ['budgetInfo', 'timeline'],
    isRequired: false
  },
  {
    id: 8,
    title: "Additional Services",
    description: "Any special requests or cultural considerations?",
    fields: ['additionalServices'],
    isRequired: false
  }
];

export const FORM_SECTIONS: QuestionSection[] = [
  {
    id: 'contactInfo',
    title: 'Contact Information',
    description: 'Primary contact details for planning your event',
    questions: [
      {
        id: 'primaryContact',
        type: 'text',
        label: 'Primary Contact Name',
        required: true,
        placeholder: 'Your full name'
      },
      {
        id: 'partnerName',
        type: 'text',
        label: 'Partner/Spouse Name',
        required: false,
        placeholder: 'Partner\'s full name'
      },
      {
        id: 'email',
        type: 'text',
        label: 'Email Address',
        required: true,
        placeholder: 'your@email.com'
      },
      {
        id: 'phone',
        type: 'text',
        label: 'Primary Phone',
        required: true,
        placeholder: '(555) 123-4567'
      },
      {
        id: 'alternatePhone',
        type: 'text',
        label: 'Alternate Phone',
        required: false,
        placeholder: '(555) 987-6543'
      },
      {
        id: 'preferredContactMethod',
        type: 'radio',
        label: 'Preferred Contact Method',
        required: true,
        options: [
          { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Phone Call' },
          { value: 'text', label: 'Text Message' }
        ]
      },
      {
        id: 'address',
        type: 'text',
        label: 'Street Address',
        required: false,
        placeholder: '123 Main Street'
      },
      {
        id: 'city',
        type: 'text',
        label: 'City',
        required: false,
        placeholder: 'Your city'
      },
      {
        id: 'state',
        type: 'text',
        label: 'State',
        required: false,
        placeholder: 'CA'
      },
      {
        id: 'zipCode',
        type: 'text',
        label: 'ZIP Code',
        required: false,
        placeholder: '12345'
      }
    ]
  },
  {
    id: 'eventDetails',
    title: 'Event Details',
    description: 'When and where will your celebration take place?',
    questions: [
      {
        id: 'eventDate',
        type: 'date',
        label: 'Wedding Date',
        required: true
      },
      {
        id: 'eventTime',
        type: 'time',
        label: 'Reception Start Time',
        required: true
      },
      {
        id: 'ceremonyTime',
        type: 'time',
        label: 'Ceremony Time (if applicable)',
        required: false
      },
      {
        id: 'venue',
        type: 'text',
        label: 'Venue Name',
        required: true,
        placeholder: 'The Grand Ballroom, Private Estate, etc.'
      },
      {
        id: 'venueAddress',
        type: 'text',
        label: 'Venue Address',
        required: true,
        placeholder: 'Full venue address'
      },
      {
        id: 'venueType',
        type: 'radio',
        label: 'Venue Type',
        required: true,
        options: [
          { value: 'indoor', label: 'Indoor' },
          { value: 'outdoor', label: 'Outdoor' },
          { value: 'mixed', label: 'Indoor/Outdoor Mix' },
          { value: 'tent', label: 'Tented Event' }
        ]
      },
      {
        id: 'hasKitchenFacilities',
        type: 'radio',
        label: 'Does the venue have kitchen facilities?',
        required: true,
        options: [
          { value: 'true', label: 'Yes, full kitchen' },
          { value: 'false', label: 'No kitchen available' },
          { value: 'limited', label: 'Limited prep space only' }
        ]
      },
      {
        id: 'hasElectricity',
        type: 'checkbox',
        label: 'Venue has reliable electricity',
        required: false
      },
      {
        id: 'hasWater',
        type: 'checkbox',
        label: 'Venue has running water',
        required: false
      },
      {
        id: 'accessLimitations',
        type: 'textarea',
        label: 'Access limitations or special considerations',
        required: false,
        placeholder: 'Stairs, narrow doorways, distance from parking, etc.',
        helpText: 'Help us plan our setup by describing any access challenges'
      },
      {
        id: 'setupTime',
        type: 'time',
        label: 'Earliest setup time allowed',
        required: false
      },
      {
        id: 'breakdownTime',
        type: 'time',
        label: 'Latest breakdown time required',
        required: false
      },
      {
        id: 'eventDuration',
        type: 'number',
        label: 'Event duration (hours)',
        required: true,
        placeholder: '6'
      }
    ]
  },
  {
    id: 'guestInfo',
    title: 'Guest Information',
    description: 'Tell us about your guest list to ensure we prepare appropriately',
    questions: [
      {
        id: 'totalGuests',
        type: 'number',
        label: 'Total number of guests',
        required: true,
        placeholder: '100'
      },
      {
        id: 'adultGuests',
        type: 'number',
        label: 'Number of adult guests',
        required: true,
        placeholder: '85'
      },
      {
        id: 'childrenGuests',
        type: 'number',
        label: 'Number of children (under 12)',
        required: false,
        placeholder: '15'
      },
      {
        id: 'childrenAges',
        type: 'text',
        label: 'Children\'s age ranges',
        required: false,
        placeholder: '5-8 years old, 2 infants',
        conditionalDisplay: (data) => (data.guestInfo?.childrenGuests || 0) > 0
      },
      {
        id: 'expectedAttendanceRate',
        type: 'select',
        label: 'Expected attendance rate',
        required: false,
        options: [
          { value: '95', label: '90-100% (most will attend)' },
          { value: '85', label: '80-90% (typical attendance)' },
          { value: '75', label: '70-80% (some may not attend)' },
          { value: '65', label: '60-70% (many uncertainties)' }
        ],
        helpText: 'Helps us plan food quantities more accurately'
      },
      {
        id: 'vipGuests',
        type: 'number',
        label: 'VIP guests requiring special attention',
        required: false,
        placeholder: '0',
        helpText: 'Elderly guests, dignitaries, or others needing special service'
      },
      {
        id: 'guestsWithDietaryRestrictions',
        type: 'number',
        label: 'Guests with dietary restrictions',
        required: false,
        placeholder: '0'
      },
      {
        id: 'detailedDietaryNeeds',
        type: 'textarea',
        label: 'Detailed dietary requirements',
        required: false,
        placeholder: 'List specific allergies, restrictions, or special dietary needs',
        conditionalDisplay: (data) => (data.guestInfo?.guestsWithDietaryRestrictions || 0) > 0
      }
    ]
  },
  {
    id: 'serviceRequirements',
    title: 'Service Style & Requirements',
    description: 'How would you like your meal served?',
    questions: [
      {
        id: 'serviceStyle',
        type: 'radio',
        label: 'Preferred service style',
        required: true,
        options: [
          { value: 'plated', label: 'Plated Service (formal sit-down)' },
          { value: 'buffet', label: 'Buffet Service' },
          { value: 'family_style', label: 'Family Style (shared platters)' },
          { value: 'cocktail', label: 'Cocktail Reception (passed apps)' },
          { value: 'stations', label: 'Food Stations' },
          { value: 'mixed', label: 'Mixed Service Styles' }
        ]
      },
      {
        id: 'mealType',
        type: 'radio',
        label: 'Type of meal',
        required: true,
        options: [
          { value: 'breakfast', label: 'Breakfast' },
          { value: 'brunch', label: 'Brunch' },
          { value: 'lunch', label: 'Lunch' },
          { value: 'dinner', label: 'Dinner' },
          { value: 'cocktail_reception', label: 'Cocktail Reception Only' },
          { value: 'multi_course', label: 'Multi-Course Tasting Menu' }
        ]
      },
      {
        id: 'numberOfCourses',
        type: 'select',
        label: 'Number of courses',
        required: false,
        options: [
          { value: '3', label: '3 Courses' },
          { value: '4', label: '4 Courses' },
          { value: '5', label: '5 Courses' },
          { value: '6', label: '6+ Courses' }
        ],
        conditionalDisplay: (data) => data.serviceRequirements?.mealType === 'multi_course'
      },
      {
        id: 'cocktailHour',
        type: 'checkbox',
        label: 'Include cocktail hour before meal',
        required: false
      },
      {
        id: 'cocktailDuration',
        type: 'select',
        label: 'Cocktail hour duration',
        required: false,
        options: [
          { value: '60', label: '1 hour' },
          { value: '90', label: '1.5 hours' },
          { value: '120', label: '2 hours' }
        ],
        conditionalDisplay: (data) => data.serviceRequirements?.cocktailHour
      },
      {
        id: 'lateNightSnacks',
        type: 'checkbox',
        label: 'Late night snacks/dessert service',
        required: false
      },
      {
        id: 'alcoholService',
        type: 'radio',
        label: 'Alcohol service',
        required: true,
        options: [
          { value: 'none', label: 'No alcohol' },
          { value: 'beer_wine', label: 'Beer and wine only' },
          { value: 'full_bar', label: 'Full bar service' },
          { value: 'signature_cocktails', label: 'Signature cocktails + beer/wine' },
          { value: 'champagne_toast', label: 'Champagne toast only' }
        ]
      },
      {
        id: 'bartendingService',
        type: 'checkbox',
        label: 'Professional bartending service needed',
        required: false,
        conditionalDisplay: (data) => data.serviceRequirements?.alcoholService !== 'none'
      },
      {
        id: 'numberOfBartenders',
        type: 'number',
        label: 'Number of bartenders needed',
        required: false,
        placeholder: '2',
        conditionalDisplay: (data) => data.serviceRequirements?.bartendingService
      }
    ]
  }
];

// Function to get available menu themes from database
export const getAvailableMenuThemes = async () => {
  try {
    const { menusByTheme } = await import('@/data/generated');
    return Object.entries(menusByTheme || {}).map(([key, theme]: [string, any]) => ({
      id: key,
      name: theme.name,
      description: theme.description || `Experience authentic ${theme.name} cuisine`,
      itemCount: theme.totalItemCount || theme.allItems?.length || 0,
      categories: Object.keys(theme.itemsByCategory || {}),
      allItems: theme.allItems || []
    }));
  } catch (error) {
    console.error('Error loading menu themes:', error);
    return [];
  }
};

// Function to dynamically update form based on new menu additions
export const refreshMenuData = async () => {
  // This would trigger a regeneration of menu data from the database
  try {
    const response = await fetch('/api/regenerate-menu-data', { method: 'POST' });
    if (response.ok) {
      // Reload the page or update the menu data in memory
      window.location.reload();
    }
  } catch (error) {
    console.error('Error refreshing menu data:', error);
  }
};

// Configuration for extensibility
export const FORM_CONFIG = {
  // Allow dynamic addition of new question sections
  customSections: [] as QuestionSection[],
  
  // Allow dynamic addition of new form steps
  customSteps: [] as FormStep[],
  
  // Configuration flags
  enableDynamicMenuLoading: true,
  enableCustomQuestions: true,
  enableConditionalLogic: true,
  
  // API endpoints for extensibility
  endpoints: {
    menuData: '/api/menu-themes',
    customQuestions: '/api/custom-questions',
    formSubmission: '/api/wedding-inquiries'
  }
};