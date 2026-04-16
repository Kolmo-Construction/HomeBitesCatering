import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarDays, 
  Users, 
  Clock, 
  MapPin, 
  Phone, 
  Mail,
  ChefHat,
  Utensils,
  DollarSign,
  FileText,
  Calendar,
  Settings,
  CheckCircle
} from 'lucide-react';
import { WeddingInquiryFormData } from './types/WeddingInquiryTypes';
import { WEDDING_FORM_STEPS, FORM_SECTIONS } from './config/FormConfiguration';
import { QuoteCalculator, QuoteBreakdown } from './components/QuoteCalculator';
import DietaryInfoPanel from '@/components/menu/DietaryInfoPanel';
import MenuBalanceCard from '@/components/menu/MenuBalanceCard';
import { useDietaryTracking } from '@/hooks/useDietaryTracking';

interface MenuTheme {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  categories: string[];
  allItems: any[];
}

// Tier pricing configuration
const TIER_PRICING = {
  bronze: 32,
  silver: 38,
  gold: 46,
  platinum: 55
};

export default function ComprehensiveWeddingInquiry() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<WeddingInquiryFormData>>({
    contactInfo: {} as any,
    eventDetails: {} as any,
    guestInfo: {} as any,
    serviceRequirements: {} as any,
    staffingNeeds: {} as any,
    equipmentNeeds: {} as any,
    menuSelections: { selectedItems: {} } as any,
    budgetInfo: {} as any,
    additionalServices: {} as any,
    timeline: {} as any
  });
  
  const [availableThemes, setAvailableThemes] = useState<MenuTheme[]>([]);
  const [selectedThemeData, setSelectedThemeData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});
  const [currentCost, setCurrentCost] = useState(0);
  const [quote, setQuote] = useState<QuoteBreakdown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dietary tracking for selected menu items
  const { selectedMenuItems, dietaryStats, nutritionalTotals, hasSelections } = useDietaryTracking(
    selectedItems,
    selectedThemeData
  );

  useEffect(() => {
    loadMenuThemes();
  }, []);

  const loadMenuThemes = async () => {
    try {
      // Import both the themes and the menusByTheme data
      const { allMenuItems } = await import('@/data/generated');
      const menuThemesModule = await import('@/data/generated/menuThemes.json');
      const menuThemes = (menuThemesModule as any).default || menuThemesModule;
      const menusByThemeModule = await import('@/data/generated/menusByTheme.json');
      
      console.log('Raw menuThemes data:', menuThemes);
      console.log('Raw menusByTheme data:', menusByThemeModule);
      console.log('All menu items:', allMenuItems);
      
      // Process the themes from menuThemes.json
      const themes = (menuThemes || []).map((theme: any) => {
        // Get the corresponding detailed data from menusByTheme.json
        const detailedThemeData = (menusByThemeModule as any)[theme.theme_key] || (menusByThemeModule as any).default?.[theme.theme_key];
        
        // Build itemsByCategory structure from the theme's categories
        const itemsByCategory: any = {};
        
        if (theme.categories && theme.categories.length > 0) {
          theme.categories.forEach((category: any) => {
            const categoryItems = (category.available_item_ids || []).map((itemId: string) => {
              return allMenuItems?.find((item: any) => item.id === itemId);
            }).filter(Boolean);
            
            itemsByCategory[category.category_key] = {
              title: category.display_title,
              description: category.description,
              items: categoryItems,
              selectionLimit: category.selection_limit,
              upchargeInfo: category.upcharge_info || {}
            };
          });
        }
        
        return {
          id: theme.theme_key || theme.id.toString(),
          name: theme.name,
          description: theme.description || `Experience authentic ${theme.name} cuisine`,
          itemCount: theme.itemCount || 0,
          categories: Object.keys(itemsByCategory),
          allItems: detailedThemeData?.allItems || [],
          itemsByCategory,
          tierPackages: {}
        };
      });
      
      console.log('Processed themes:', themes);
      setAvailableThemes(themes);
    } catch (error) {
      console.error('Error loading menu themes:', error);
    }
  };

  const selectTheme = (themeId: string) => {
    updateFormData('menuSelections', 'selectedTheme', themeId);
    const theme = availableThemes.find(t => t.id === themeId);
    setSelectedThemeData(theme);
    setSelectedItems({});
    setCurrentCost(0);
  };

  const selectTier = (tierId: string) => {
    updateFormData('menuSelections', 'selectedTier', tierId);
    calculateCurrentCost();
  };

  const toggleMenuItem = (category: string, itemId: string) => {
    const newSelectedItems = { ...selectedItems };
    if (!newSelectedItems[category]) {
      newSelectedItems[category] = [];
    }

    const itemIndex = newSelectedItems[category].indexOf(itemId);
    if (itemIndex > -1) {
      newSelectedItems[category].splice(itemIndex, 1);
    } else {
      newSelectedItems[category].push(itemId);
    }

    setSelectedItems(newSelectedItems);
    updateFormData('menuSelections', 'selectedItems', newSelectedItems);
    calculateCurrentCost();
  };

  const calculateCurrentCost = () => {
    const guestCount = formData.guestInfo?.totalGuests || 100;
    const selectedTier = formData.menuSelections?.selectedTier;
    
    if (!selectedTier) return;

    const tierPricing = {
      bronze: 32,
      silver: 38,
      gold: 46,
      platinum: 55
    };

    let baseCost = tierPricing[selectedTier as keyof typeof tierPricing] * guestCount;
    
    // Add upcharges for selected items
    let upcharges = 0;
    if (selectedThemeData && selectedItems) {
      Object.entries(selectedItems).forEach(([category, itemIds]) => {
        itemIds.forEach(itemId => {
          const item = selectedThemeData.allItems?.find((item: any) => item.id === itemId);
          if (item && item.upcharge > 0) {
            upcharges += item.upcharge * guestCount;
          }
        });
      });
    }

    setCurrentCost(baseCost + upcharges);
  };

  const calculateNutritionSummary = () => {
    if (!selectedThemeData || !selectedItems) return null;

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let itemCount = 0;

    Object.entries(selectedItems).forEach(([category, itemIds]) => {
      itemIds.forEach(itemId => {
        const item = selectedThemeData.allItems?.find((item: any) => item.id === itemId);
        if (item) {
          totalCalories += item.calories || 0;
          totalProtein += item.protein || 0;
          totalCarbs += item.carbs || 0;
          totalFat += item.fat || 0;
          itemCount++;
        }
      });
    });

    if (itemCount === 0) return null;

    return {
      avgCalories: Math.round(totalCalories / itemCount),
      avgProtein: Math.round(totalProtein / itemCount),
      avgCarbs: Math.round(totalCarbs / itemCount),
      avgFat: Math.round(totalFat / itemCount),
      totalItems: itemCount
    };
  };

  const updateFormData = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof WeddingInquiryFormData],
        [field]: value
      }
    }));
  };

  const getCurrentStepData = () => {
    return WEDDING_FORM_STEPS.find(step => step.id === currentStep);
  };

  const isStepValid = (stepId: number) => {
    // Temporarily disable validation for testing
    return true;
  };

  const nextStep = () => {
    if (currentStep < WEDDING_FORM_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateQuote = async () => {
    try {
      const { menusByTheme } = await import('@/data/generated');
      const calculator = new QuoteCalculator(formData as WeddingInquiryFormData, { menusByTheme });
      const calculatedQuote = calculator.calculateComprehensiveQuote();
      setQuote(calculatedQuote);
    } catch (error) {
      console.error('Error calculating quote:', error);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Calculate final quote
      await calculateQuote();
      
      // Submit form data
      const response = await fetch('/api/wedding-inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          quote,
          submittedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        alert('Your wedding inquiry has been submitted successfully! We will contact you within 24 hours with a detailed proposal.');
      } else {
        alert('There was an error submitting your inquiry. Please try again or contact us directly.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('There was an error submitting your inquiry. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContactInfoStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="primaryContact">Primary Contact Name *</Label>
          <Input
            id="primaryContact"
            value={formData.contactInfo?.primaryContact || ''}
            onChange={(e) => updateFormData('contactInfo', 'primaryContact', e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div>
          <Label htmlFor="partnerName">Partner/Spouse Name</Label>
          <Input
            id="partnerName"
            value={formData.contactInfo?.partnerName || ''}
            onChange={(e) => updateFormData('contactInfo', 'partnerName', e.target.value)}
            placeholder="Partner's full name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.contactInfo?.email || ''}
            onChange={(e) => updateFormData('contactInfo', 'email', e.target.value)}
            placeholder="your@email.com"
          />
        </div>
        <div>
          <Label htmlFor="phone">Primary Phone *</Label>
          <Input
            id="phone"
            value={formData.contactInfo?.phone || ''}
            onChange={(e) => updateFormData('contactInfo', 'phone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div>
        <Label>Preferred Contact Method *</Label>
        <RadioGroup
          value={formData.contactInfo?.preferredContactMethod || ''}
          onValueChange={(value) => updateFormData('contactInfo', 'preferredContactMethod', value)}
          className="flex flex-row space-x-6 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="email" id="contact-email" />
            <Label htmlFor="contact-email">Email</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="phone" id="contact-phone" />
            <Label htmlFor="contact-phone">Phone Call</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="text" id="contact-text" />
            <Label htmlFor="contact-text">Text Message</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            value={formData.contactInfo?.address || ''}
            onChange={(e) => updateFormData('contactInfo', 'address', e.target.value)}
            placeholder="123 Main Street"
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.contactInfo?.city || ''}
            onChange={(e) => updateFormData('contactInfo', 'city', e.target.value)}
            placeholder="Your city"
          />
        </div>
      </div>
    </div>
  );

  const renderEventDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="eventDate">Wedding Date *</Label>
          <Input
            id="eventDate"
            type="date"
            value={formData.eventDetails?.eventDate || ''}
            onChange={(e) => updateFormData('eventDetails', 'eventDate', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="eventTime">Reception Start Time *</Label>
          <Input
            id="eventTime"
            type="time"
            value={formData.eventDetails?.eventTime || ''}
            onChange={(e) => updateFormData('eventDetails', 'eventTime', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="eventDuration">Event Duration (hours) *</Label>
          <Input
            id="eventDuration"
            type="number"
            min="3"
            max="12"
            value={formData.eventDetails?.eventDuration || ''}
            onChange={(e) => updateFormData('eventDetails', 'eventDuration', parseInt(e.target.value))}
            placeholder="6"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="venue">Venue Name *</Label>
          <Input
            id="venue"
            value={formData.eventDetails?.venue || ''}
            onChange={(e) => updateFormData('eventDetails', 'venue', e.target.value)}
            placeholder="The Grand Ballroom, Private Estate, etc."
          />
        </div>
        <div>
          <Label htmlFor="venueAddress">Venue Address *</Label>
          <Input
            id="venueAddress"
            value={formData.eventDetails?.venueAddress || ''}
            onChange={(e) => updateFormData('eventDetails', 'venueAddress', e.target.value)}
            placeholder="Full venue address"
          />
        </div>
      </div>

      <div>
        <Label>Venue Type *</Label>
        <RadioGroup
          value={formData.eventDetails?.venueType || ''}
          onValueChange={(value) => updateFormData('eventDetails', 'venueType', value)}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="indoor" id="venue-indoor" />
            <Label htmlFor="venue-indoor">Indoor</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="outdoor" id="venue-outdoor" />
            <Label htmlFor="venue-outdoor">Outdoor</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mixed" id="venue-mixed" />
            <Label htmlFor="venue-mixed">Indoor/Outdoor</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="tent" id="venue-tent" />
            <Label htmlFor="venue-tent">Tented Event</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Venue Facilities</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasKitchen"
              checked={formData.eventDetails?.hasKitchenFacilities || false}
              onCheckedChange={(checked) => updateFormData('eventDetails', 'hasKitchenFacilities', checked)}
            />
            <Label htmlFor="hasKitchen">Full Kitchen Available</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasElectricity"
              checked={formData.eventDetails?.hasElectricity || false}
              onCheckedChange={(checked) => updateFormData('eventDetails', 'hasElectricity', checked)}
            />
            <Label htmlFor="hasElectricity">Reliable Electricity</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasWater"
              checked={formData.eventDetails?.hasWater || false}
              onCheckedChange={(checked) => updateFormData('eventDetails', 'hasWater', checked)}
            />
            <Label htmlFor="hasWater">Running Water</Label>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="accessLimitations">Access Limitations or Special Considerations</Label>
        <Textarea
          id="accessLimitations"
          value={formData.eventDetails?.accessLimitations || ''}
          onChange={(e) => updateFormData('eventDetails', 'accessLimitations', e.target.value)}
          placeholder="Stairs, narrow doorways, distance from parking, etc."
          className="mt-2"
        />
        <p className="text-sm text-gray-600 mt-1">Help us plan our setup by describing any access challenges</p>
      </div>
    </div>
  );

  const renderGuestInfoStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="totalGuests">Total Number of Guests *</Label>
          <Input
            id="totalGuests"
            type="number"
            min="10"
            value={formData.guestInfo?.totalGuests || ''}
            onChange={(e) => updateFormData('guestInfo', 'totalGuests', parseInt(e.target.value))}
            placeholder="100"
          />
        </div>
        <div>
          <Label htmlFor="adultGuests">Adult Guests *</Label>
          <Input
            id="adultGuests"
            type="number"
            value={formData.guestInfo?.adultGuests || ''}
            onChange={(e) => updateFormData('guestInfo', 'adultGuests', parseInt(e.target.value))}
            placeholder="85"
          />
        </div>
        <div>
          <Label htmlFor="childrenGuests">Children (under 12)</Label>
          <Input
            id="childrenGuests"
            type="number"
            min="0"
            value={formData.guestInfo?.childrenGuests || ''}
            onChange={(e) => updateFormData('guestInfo', 'childrenGuests', parseInt(e.target.value))}
            placeholder="15"
          />
        </div>
      </div>

      {(formData.guestInfo?.childrenGuests || 0) > 0 && (
        <div>
          <Label htmlFor="childrenAges">Children's Age Ranges</Label>
          <Input
            id="childrenAges"
            value={formData.guestInfo?.childrenAges || ''}
            onChange={(e) => updateFormData('guestInfo', 'childrenAges', e.target.value)}
            placeholder="5-8 years old, 2 infants"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expectedAttendance">Expected Attendance Rate</Label>
          <Select
            value={formData.guestInfo?.expectedAttendanceRate?.toString() || ''}
            onValueChange={(value) => updateFormData('guestInfo', 'expectedAttendanceRate', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select attendance rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="95">90-100% (most will attend)</SelectItem>
              <SelectItem value="85">80-90% (typical attendance)</SelectItem>
              <SelectItem value="75">70-80% (some may not attend)</SelectItem>
              <SelectItem value="65">60-70% (many uncertainties)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600 mt-1">Helps us plan food quantities more accurately</p>
        </div>
        <div>
          <Label htmlFor="vipGuests">VIP Guests Requiring Special Attention</Label>
          <Input
            id="vipGuests"
            type="number"
            min="0"
            value={formData.guestInfo?.vipGuests || ''}
            onChange={(e) => updateFormData('guestInfo', 'vipGuests', parseInt(e.target.value))}
            placeholder="0"
          />
          <p className="text-sm text-gray-600 mt-1">Elderly guests, dignitaries, or others needing special service</p>
        </div>
      </div>

      <div>
        <Label htmlFor="dietaryRestrictions">Guests with Dietary Restrictions</Label>
        <Input
          id="dietaryRestrictions"
          type="number"
          min="0"
          value={formData.guestInfo?.guestsWithDietaryRestrictions || ''}
          onChange={(e) => updateFormData('guestInfo', 'guestsWithDietaryRestrictions', parseInt(e.target.value))}
          placeholder="0"
          className="mb-2"
        />
        
        {(formData.guestInfo?.guestsWithDietaryRestrictions || 0) > 0 && (
          <div>
            <Label htmlFor="detailedDietaryNeeds">Detailed Dietary Requirements</Label>
            <Textarea
              id="detailedDietaryNeeds"
              value={formData.guestInfo?.detailedDietaryNeeds || ''}
              onChange={(e) => updateFormData('guestInfo', 'detailedDietaryNeeds', e.target.value)}
              placeholder="List specific allergies, restrictions, or special dietary needs"
              className="mt-2"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderServiceRequirementsStep = () => (
    <div className="space-y-6">
      <div>
        <Label>Preferred Service Style *</Label>
        <RadioGroup
          value={formData.serviceRequirements?.serviceStyle || ''}
          onValueChange={(value) => updateFormData('serviceRequirements', 'serviceStyle', value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="plated" id="service-plated" />
            <Label htmlFor="service-plated">Plated Service (formal sit-down)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="buffet" id="service-buffet" />
            <Label htmlFor="service-buffet">Buffet Service</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="family_style" id="service-family" />
            <Label htmlFor="service-family">Family Style (shared platters)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cocktail" id="service-cocktail" />
            <Label htmlFor="service-cocktail">Cocktail Reception (passed apps)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="stations" id="service-stations" />
            <Label htmlFor="service-stations">Food Stations</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mixed" id="service-mixed" />
            <Label htmlFor="service-mixed">Mixed Service Styles</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Type of Meal *</Label>
        <RadioGroup
          value={formData.serviceRequirements?.mealType || ''}
          onValueChange={(value) => updateFormData('serviceRequirements', 'mealType', value)}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="breakfast" id="meal-breakfast" />
            <Label htmlFor="meal-breakfast">Breakfast</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="brunch" id="meal-brunch" />
            <Label htmlFor="meal-brunch">Brunch</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lunch" id="meal-lunch" />
            <Label htmlFor="meal-lunch">Lunch</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="dinner" id="meal-dinner" />
            <Label htmlFor="meal-dinner">Dinner</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cocktail_reception" id="meal-cocktail" />
            <Label htmlFor="meal-cocktail">Cocktail Reception Only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="multi_course" id="meal-multicourse" />
            <Label htmlFor="meal-multicourse">Multi-Course Tasting</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cocktailHour"
            checked={formData.serviceRequirements?.cocktailHour || false}
            onCheckedChange={(checked) => updateFormData('serviceRequirements', 'cocktailHour', checked)}
          />
          <Label htmlFor="cocktailHour">Include cocktail hour before meal</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="lateNightSnacks"
            checked={formData.serviceRequirements?.lateNightSnacks || false}
            onCheckedChange={(checked) => updateFormData('serviceRequirements', 'lateNightSnacks', checked)}
          />
          <Label htmlFor="lateNightSnacks">Late night snacks/dessert service</Label>
        </div>
      </div>

      <div>
        <Label>Alcohol Service *</Label>
        <RadioGroup
          value={formData.serviceRequirements?.alcoholService || ''}
          onValueChange={(value) => updateFormData('serviceRequirements', 'alcoholService', value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="alcohol-none" />
            <Label htmlFor="alcohol-none">No alcohol</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="beer_wine" id="alcohol-beer-wine" />
            <Label htmlFor="alcohol-beer-wine">Beer and wine only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="full_bar" id="alcohol-full-bar" />
            <Label htmlFor="alcohol-full-bar">Full bar service</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="signature_cocktails" id="alcohol-signature" />
            <Label htmlFor="alcohol-signature">Signature cocktails + beer/wine</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="champagne_toast" id="alcohol-champagne" />
            <Label htmlFor="alcohol-champagne">Champagne toast only</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.serviceRequirements?.alcoholService !== 'none' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bartendingService"
              checked={formData.serviceRequirements?.bartendingService || false}
              onCheckedChange={(checked) => updateFormData('serviceRequirements', 'bartendingService', checked)}
            />
            <Label htmlFor="bartendingService">Professional bartending service needed</Label>
          </div>
          {formData.serviceRequirements?.bartendingService && (
            <div>
              <Label htmlFor="numberOfBartenders">Number of bartenders needed</Label>
              <Input
                id="numberOfBartenders"
                type="number"
                min="1"
                value={formData.serviceRequirements?.numberOfBartenders || ''}
                onChange={(e) => updateFormData('serviceRequirements', 'numberOfBartenders', parseInt(e.target.value))}
                placeholder="2"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderMenuSelectionStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Choose Your Cuisine Theme</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableThemes.map((theme) => (
            <Card 
              key={theme.id}
              className={`cursor-pointer transition-all ${
                formData.menuSelections?.selectedTheme === theme.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => selectTheme(theme.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{theme.name}</h4>
                  <Badge variant="secondary">{theme.itemCount} items</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{theme.description}</p>
                <div className="flex flex-wrap gap-1">
                  {theme.categories.slice(0, 3).map((category) => (
                    <Badge key={category} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                  {theme.categories.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{theme.categories.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {formData.menuSelections?.selectedTheme && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Select Your Package Tier</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'bronze', name: 'Bronze', price: 32, description: 'Essential selections' },
              { id: 'silver', name: 'Silver', price: 38, description: 'Popular choices' },
              { id: 'gold', name: 'Gold', price: 46, description: 'Premium options' },
              { id: 'platinum', name: 'Platinum', price: 55, description: 'Luxury experience' }
            ].map((tier) => (
              <Card 
                key={tier.id}
                className={`cursor-pointer transition-all ${
                  formData.menuSelections?.selectedTier === tier.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => selectTier(tier.id)}
              >
                <CardContent className="p-4 text-center">
                  <h4 className="font-semibold text-lg">{tier.name}</h4>
                  <div className="text-2xl font-bold text-blue-600 my-2">
                    ${tier.price}
                    <span className="text-sm text-gray-600">/person</span>
                  </div>
                  <p className="text-sm text-gray-600">{tier.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedThemeData && (
        <div>
          {formData.menuSelections?.selectedTier && (
            <>
              <h3 className="text-lg font-semibold mb-4">Customize Your Menu</h3>
              <div className="space-y-6">
                {Object.entries(selectedThemeData.itemsByCategory || {}).map(([category, items]: [string, any]) => (
              <div key={category}>
                <h4 className="font-semibold text-lg mb-3">{items.title || category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(items.items || []).map((item: any) => {
                    const isSelected = selectedItems[category]?.includes(item.id);
                    return (
                      <Card 
                        key={item.id}
                        className={`cursor-pointer transition-all ${
                          isSelected 
                            ? 'ring-2 ring-green-500 bg-green-50' 
                            : 'hover:shadow-md border-gray-200'
                        }`}
                        onClick={() => toggleMenuItem(category, item.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-sm">{item.name}</h5>
                            {item.upcharge > 0 && (
                              <Badge variant="outline" className="text-xs">
                                +${item.upcharge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                          
                          {/* Nutritional info */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.calories && (
                              <Badge variant="secondary" className="text-xs">
                                {item.calories} cal
                              </Badge>
                            )}
                            {item.protein && (
                              <Badge variant="secondary" className="text-xs">
                                {item.protein}g protein
                              </Badge>
                            )}
                          </div>
                          
                          {/* Dietary flags */}
                          <div className="flex flex-wrap gap-1">
                            {item.isVegetarian && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Vegetarian
                              </Badge>
                            )}
                            {item.isVegan && (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                                Vegan
                              </Badge>
                            )}
                            {item.isGlutenFree && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                                Gluten-Free
                              </Badge>
                            )}
                            {item.isDairyFree && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                Dairy-Free
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

              <div className="mt-6">
                <Label htmlFor="customizations">Menu Customizations or Special Requests</Label>
                <Textarea
                  id="customizations"
                  value={formData.menuSelections?.customizations || ''}
                  onChange={(e) => updateFormData('menuSelections', 'customizations', e.target.value)}
                  placeholder="Any specific menu items, preparations, or special requests..."
                  className="mt-2"
                />
              </div>
            </>
          )}

          {/* Menu Analysis Cards - Show once theme is selected */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dietary Information Panel */}
            <div>
              <DietaryInfoPanel selectedItems={selectedMenuItems} />
            </div>
            
            {/* Menu Balance Card */}
            <div>
              <MenuBalanceCard
                selectedItems={selectedItems}
                menuData={selectedThemeData}
                guestCount={formData.guestInfo?.totalGuests || 0}
                selectedTier={formData.menuSelections?.selectedTier || ''}
                basePricing={TIER_PRICING}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimelineStep = () => (
    <div className="space-y-6">

      <div>
        <Label>How far in advance are you planning?</Label>
        <RadioGroup
          value={formData.timeline?.howFarInAdvance || ''}
          onValueChange={(value) => updateFormData('timeline', 'howFarInAdvance', value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1-3months" id="timeline-13" />
            <Label htmlFor="timeline-13">1-3 months</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="3-6months" id="timeline-36" />
            <Label htmlFor="timeline-36">3-6 months</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="6-12months" id="timeline-612" />
            <Label htmlFor="timeline-612">6-12 months</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="over-year" id="timeline-year" />
            <Label htmlFor="timeline-year">Over a year</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Planning Stage</Label>
        <RadioGroup
          value={formData.timeline?.planningStage || ''}
          onValueChange={(value) => updateFormData('timeline', 'planningStage', value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="early" id="stage-early" />
            <Label htmlFor="stage-early">Early planning (just started)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mid" id="stage-mid" />
            <Label htmlFor="stage-mid">Mid-planning (venue booked)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="final" id="stage-final" />
            <Label htmlFor="stage-final">Final details (most vendors booked)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="last_minute" id="stage-lastminute" />
            <Label htmlFor="stage-lastminute">Last minute (urgent)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="otherVendorsBooked"
            checked={formData.timeline?.otherVendorsBooked || false}
            onCheckedChange={(checked) => updateFormData('timeline', 'otherVendorsBooked', checked)}
          />
          <Label htmlFor="otherVendorsBooked">Other vendors already booked</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="weddingPlanner"
            checked={formData.timeline?.weddingPlanner || false}
            onCheckedChange={(checked) => updateFormData('timeline', 'weddingPlanner', checked)}
          />
          <Label htmlFor="weddingPlanner">Working with a wedding planner</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="inspiration">Inspiration or Vision for Your Wedding</Label>
        <Textarea
          id="inspiration"
          value={formData.timeline?.inspiration || ''}
          onChange={(e) => updateFormData('timeline', 'inspiration', e.target.value)}
          placeholder="Tell us about your dream wedding, style preferences, or any special vision you have..."
          className="mt-2"
        />
      </div>
    </div>
  );

  const renderAdditionalServicesStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Additional Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cakeProvided"
              checked={formData.additionalServices?.cakeProvided || false}
              onCheckedChange={(checked) => updateFormData('additionalServices', 'cakeProvided', checked)}
            />
            <Label htmlFor="cakeProvided">Cake provided by caterer</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cakeServing"
              checked={formData.additionalServices?.cakeServing || false}
              onCheckedChange={(checked) => updateFormData('additionalServices', 'cakeServing', checked)}
            />
            <Label htmlFor="cakeServing">Cake cutting and serving</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="flowerArrangements"
              checked={formData.additionalServices?.flowerArrangements || false}
              onCheckedChange={(checked) => updateFormData('additionalServices', 'flowerArrangements', checked)}
            />
            <Label htmlFor="flowerArrangements">Table flower arrangements</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="photographyMeals"
              checked={formData.additionalServices?.photographyMeals || false}
              onCheckedChange={(checked) => updateFormData('additionalServices', 'photographyMeals', checked)}
            />
            <Label htmlFor="photographyMeals">Vendor/photographer meals</Label>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="vendorMeals">Number of vendor meals needed</Label>
        <Input
          id="vendorMeals"
          type="number"
          min="0"
          value={formData.additionalServices?.vendorMeals || ''}
          onChange={(e) => updateFormData('additionalServices', 'vendorMeals', parseInt(e.target.value))}
          placeholder="0"
        />
      </div>

      <div>
        <Label htmlFor="culturalRequirements">Cultural Requirements</Label>
        <Textarea
          id="culturalRequirements"
          value={formData.additionalServices?.culturalRequirements || ''}
          onChange={(e) => updateFormData('additionalServices', 'culturalRequirements', e.target.value)}
          placeholder="Any cultural traditions, customs, or specific requirements for your celebration..."
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="religiousRequirements">Religious Requirements</Label>
        <Textarea
          id="religiousRequirements"
          value={formData.additionalServices?.religiousRequirements || ''}
          onChange={(e) => updateFormData('additionalServices', 'religiousRequirements', e.target.value)}
          placeholder="Kosher, Halal, vegetarian requirements, or other religious considerations..."
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="specialRequests">Special Requests or Additional Information</Label>
        <Textarea
          id="specialRequests"
          value={formData.timeline?.specialRequests || ''}
          onChange={(e) => updateFormData('timeline', 'specialRequests', e.target.value)}
          placeholder="Anything else you'd like us to know about your special day..."
          className="mt-2"
        />
      </div>
    </div>
  );

  const renderQuoteSummary = () => {
    if (!quote) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Your Wedding Catering Quote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Menu Costs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Food cost per person:</span>
                    <span>${quote.menuCosts.foodCostPerPerson.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total food cost:</span>
                    <span>${quote.menuCosts.totalFoodCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Service & Staffing</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service cost:</span>
                    <span>${quote.serviceCosts.totalServiceCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Staffing cost:</span>
                    <span>${quote.staffingCosts.totalStaffingCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Equipment & Rentals</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Equipment rentals:</span>
                    <span>${quote.equipmentCosts.totalEquipmentCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Additional services:</span>
                    <span>${quote.additionalCosts.totalAdditionalCosts.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Final Total</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${quote.summary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({(quote.summary.taxRate * 100).toFixed(0)}%):</span>
                    <span>${quote.summary.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service charge ({(quote.summary.serviceCharge / quote.summary.subtotal * 100).toFixed(0)}%):</span>
                    <span>${quote.summary.serviceCharge.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${quote.summary.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600 font-medium">
                    <span>Per person:</span>
                    <span>${quote.summary.pricePerPerson.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderContactInfoStep();
      case 2: return renderEventDetailsStep();
      case 3: return renderGuestInfoStep();
      case 4: return renderServiceRequirementsStep();
      case 5: return <div className="text-center py-8">Staffing & Equipment needs section coming soon...</div>;
      case 6: return renderMenuSelectionStep();
      case 7: return renderTimelineStep();
      case 8: return renderAdditionalServicesStep();
      default: return null;
    }
  };

  const currentStepData = getCurrentStepData();
  const progressPercentage = (currentStep / WEDDING_FORM_STEPS.length) * 100;

  const nutritionSummary = calculateNutritionSummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Floating Cost & Nutrition Tracker */}
      {(currentCost > 0 || nutritionSummary) && (
        <div className="fixed top-20 right-4 w-80 z-50">
          <Card className="shadow-lg border-2 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Current Quote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentCost > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Estimated Total:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${currentCost.toLocaleString()}
                    </span>
                  </div>
                  {formData.guestInfo?.totalGuests && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Per person:</span>
                      <span>${(currentCost / formData.guestInfo.totalGuests).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <MenuBalanceCard
                  selectedItems={selectedItems}
                  menuData={selectedThemeData}
                  guestCount={formData.guestInfo?.totalGuests || 0}
                  selectedTier={formData.menuSelections?.selectedTier || ''}
                  basePricing={TIER_PRICING}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Wedding Catering Inquiry
            </h1>
            <p className="text-lg text-gray-600">
              Let's create the perfect menu for your special day
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep} of {WEDDING_FORM_STEPS.length}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Step indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2 overflow-x-auto">
              {WEDDING_FORM_STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                    step.id === currentStep
                      ? 'bg-blue-100 text-blue-700'
                      : step.id < currentStep
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {step.id < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-full ${
                        step.id === currentStep
                          ? 'bg-blue-500'
                          : step.id < currentStep
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentStep === 1 && <Mail className="h-5 w-5" />}
                {currentStep === 2 && <MapPin className="h-5 w-5" />}
                {currentStep === 3 && <Users className="h-5 w-5" />}
                {currentStep === 4 && <Utensils className="h-5 w-5" />}
                {currentStep === 5 && <Settings className="h-5 w-5" />}
                {currentStep === 6 && <ChefHat className="h-5 w-5" />}
                {currentStep === 7 && <DollarSign className="h-5 w-5" />}
                {currentStep === 8 && <FileText className="h-5 w-5" />}
                {currentStepData?.title}
              </CardTitle>
              <p className="text-gray-600">{currentStepData?.description}</p>
            </CardHeader>
            <CardContent>
              {renderCurrentStep()}
            </CardContent>
          </Card>

          {/* Quote display */}
          {currentStep === 8 && quote && renderQuoteSummary()}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            <div className="flex space-x-2">
              {currentStep < WEDDING_FORM_STEPS.length ? (
                <>
                  {currentStep === 7 && (
                    <Button
                      variant="outline"
                      onClick={calculateQuote}
                      disabled={!formData.menuSelections?.selectedTheme}
                    >
                      Calculate Quote
                    </Button>
                  )}
                  <Button
                    onClick={nextStep}
                    disabled={!isStepValid(currentStep)}
                  >
                    Next Step
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !isStepValid(currentStep)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}