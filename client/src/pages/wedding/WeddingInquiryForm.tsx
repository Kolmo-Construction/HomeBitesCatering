import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Users, MapPin, Clock, Utensils, Info, ChevronRight, ChevronLeft } from "lucide-react";

// Import the generated menu data from the database
import { menusByTheme, allMenuItems } from "@/data/generated";

interface CustomerInquiryData {
  // Basic Information
  customerName: string;
  email: string;
  phone: string;
  
  // Event Details
  eventDate: string;
  eventTime: string;
  venue: string;
  guestCount: number;
  
  // Menu Selection
  selectedTheme: string;
  selectedTier: string;
  selectedItems: Record<string, string[]>;
  
  // Additional Requirements
  dietaryRestrictions: string;
  specialRequests: string;
}

const TIER_PACKAGES = {
  bronze: {
    name: "Bronze Package",
    price: 32,
    description: "Classic selections with essential menu items",
    limits: { mains: 2, sides: 3, appetizers: 1, desserts: 1 }
  },
  silver: {
    name: "Silver Package", 
    price: 38,
    description: "Enhanced experience with additional choices",
    limits: { mains: 3, sides: 4, appetizers: 2, desserts: 1 }
  },
  gold: {
    name: "Gold Package",
    price: 46, 
    description: "Premium celebration with full menu access",
    limits: { mains: 4, sides: 5, appetizers: 2, desserts: 2 }
  },
  platinum: {
    name: "Platinum Package",
    price: 55,
    description: "Ultimate experience with unlimited selections",
    limits: { mains: 6, sides: 6, appetizers: 3, desserts: 2 }
  }
};

const WeddingInquiryForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({});

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CustomerInquiryData>();

  const guestCount = watch("guestCount") || 50;

  // Get available themes from database
  const availableThemes = Object.entries(menusByTheme).map(([key, theme]) => ({
    id: key,
    name: theme.name,
    description: theme.description || `Experience authentic ${theme.name} cuisine`,
    itemCount: theme.totalItemCount || theme.allItems?.length || 0
  }));

  // Get items for selected theme organized by category
  const getThemeItems = (themeKey: string) => {
    if (!themeKey || !menusByTheme[themeKey]) return {};
    
    const themeItems = menusByTheme[themeKey].allItems || [];
    
    return {
      mains: themeItems.filter(item => 
        item.category?.toLowerCase().includes('main') ||
        item.category?.toLowerCase().includes('entree') ||
        item.category?.toLowerCase().includes('protein')
      ),
      sides: themeItems.filter(item =>
        item.category?.toLowerCase().includes('side') ||
        item.category?.toLowerCase().includes('vegetable')
      ),
      appetizers: themeItems.filter(item =>
        item.category?.toLowerCase().includes('appetizer') ||
        item.category?.toLowerCase().includes('meze')
      ),
      desserts: themeItems.filter(item =>
        item.category?.toLowerCase().includes('dessert')
      )
    };
  };

  const organizedItems = getThemeItems(selectedTheme);

  const handleItemToggle = (category: string, itemId: string) => {
    if (!selectedTier) return;
    
    const tier = TIER_PACKAGES[selectedTier as keyof typeof TIER_PACKAGES];
    const limit = tier.limits[category as keyof typeof tier.limits];
    const currentItems = selectedItems[category] || [];
    
    if (currentItems.includes(itemId)) {
      setSelectedItems(prev => ({
        ...prev,
        [category]: currentItems.filter(id => id !== itemId)
      }));
    } else if (currentItems.length < limit) {
      setSelectedItems(prev => ({
        ...prev,
        [category]: [...currentItems, itemId]
      }));
    }
  };

  const onSubmit = (data: CustomerInquiryData) => {
    const inquiryData = {
      ...data,
      selectedTheme,
      selectedTier,
      selectedItems,
      totalPrice: selectedTier ? TIER_PACKAGES[selectedTier as keyof typeof TIER_PACKAGES].price * guestCount : 0
    };
    
    console.log("Customer Inquiry Submitted:", inquiryData);
    // Here you would send the data to your backend
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Your Name *</Label>
                  <Input
                    id="customerName"
                    {...register("customerName", { required: "Name is required" })}
                    placeholder="Full name"
                  />
                  {errors.customerName && (
                    <p className="text-sm text-red-600">{errors.customerName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", { required: "Email is required" })}
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="guestCount">Number of Guests *</Label>
                  <Input
                    id="guestCount"
                    type="number"
                    {...register("guestCount", { required: "Guest count is required", min: 1 })}
                    placeholder="50"
                  />
                  {errors.guestCount && (
                    <p className="text-sm text-red-600">{errors.guestCount.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventDate">Event Date *</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    {...register("eventDate", { required: "Event date is required" })}
                  />
                  {errors.eventDate && (
                    <p className="text-sm text-red-600">{errors.eventDate.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="eventTime">Event Time</Label>
                  <Input
                    id="eventTime"
                    type="time"
                    {...register("eventTime")}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="venue">Venue/Location</Label>
                <Input
                  id="venue"
                  {...register("venue")}
                  placeholder="Event venue or address"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Choose Your Cuisine Theme</h2>
              <p className="text-gray-600">Select from our authentic menu themes</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableThemes.map((theme) => (
                <Card
                  key={theme.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTheme === theme.id ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {theme.name}
                      <Badge variant="outline">{theme.itemCount} items</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{theme.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Select Your Package Tier</h2>
              <p className="text-gray-600">Choose the perfect package for your event</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(TIER_PACKAGES).map(([tierId, tier]) => (
                <Card
                  key={tierId}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTier === tierId ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => setSelectedTier(tierId)}
                >
                  <CardHeader className="text-center">
                    <CardTitle>{tier.name}</CardTitle>
                    <div className="text-2xl font-bold text-blue-600">${tier.price}</div>
                    <div className="text-sm text-gray-500">per person</div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
                    <div className="space-y-1 text-xs">
                      <div>Mains: {tier.limits.mains}</div>
                      <div>Sides: {tier.limits.sides}</div>
                      <div>Appetizers: {tier.limits.appetizers}</div>
                      <div>Desserts: {tier.limits.desserts}</div>
                    </div>
                    <div className="mt-4 text-lg font-semibold">
                      Total: ${(tier.price * guestCount).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        if (!selectedTheme || !selectedTier) {
          return <div>Please select a theme and tier first.</div>;
        }

        const tier = TIER_PACKAGES[selectedTier as keyof typeof TIER_PACKAGES];

        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Customize Your Menu</h2>
              <p className="text-gray-600">
                {menusByTheme[selectedTheme]?.name} - {tier.name}
              </p>
            </div>

            {Object.entries(organizedItems).map(([category, items]) => {
              if (!items.length) return null;
              
              const limit = tier.limits[category as keyof typeof tier.limits];
              const selected = selectedItems[category] || [];
              
              return (
                <Card key={category} className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                      <Badge variant="outline">{selected.length}/{limit}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item: any) => {
                        const isSelected = selected.includes(item.id);
                        const canSelect = selected.length < limit || isSelected;
                        
                        return (
                          <div
                            key={item.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "border-blue-500 bg-blue-50"
                                : canSelect
                                ? "border-gray-200 hover:border-gray-300"
                                : "border-gray-100 opacity-50 cursor-not-allowed"
                            }`}
                            onClick={() => canSelect && handleItemToggle(category, item.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox checked={isSelected} disabled={!canSelect} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium">{item.name}</h5>
                                  {item.nutritionalHighlights && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                                          <Info className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>{item.name}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-3">
                                          <p className="text-sm">{item.description}</p>
                                          {item.nutritionalHighlights && (
                                            <div>
                                              <h4 className="font-medium mb-2">Nutritional Info</h4>
                                              <div className="grid grid-cols-2 gap-2 text-sm">
                                                {item.nutritionalHighlights.calories && (
                                                  <div>Calories: {item.nutritionalHighlights.calories.min}-{item.nutritionalHighlights.calories.max}</div>
                                                )}
                                                {item.nutritionalHighlights.protein && (
                                                  <div>Protein: {item.nutritionalHighlights.protein.min}-{item.nutritionalHighlights.protein.max}g</div>
                                                )}
                                                {item.nutritionalHighlights.carbs && (
                                                  <div>Carbs: {item.nutritionalHighlights.carbs.min}-{item.nutritionalHighlights.carbs.max}g</div>
                                                )}
                                                {item.nutritionalHighlights.fat && (
                                                  <div>Fat: {item.nutritionalHighlights.fat.min}-{item.nutritionalHighlights.fat.max}g</div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          {item.dietaryFlags && item.dietaryFlags.length > 0 && (
                                            <div>
                                              <h4 className="font-medium mb-2">Dietary Info</h4>
                                              <div className="flex flex-wrap gap-1">
                                                {item.dietaryFlags.map((flag: string) => (
                                                  <Badge key={flag} variant="secondary" className="text-xs">
                                                    {flag}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{item.description}</p>
                                {item.dietaryFlags && item.dietaryFlags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.dietaryFlags.slice(0, 2).map((flag: string) => (
                                      <Badge key={flag} variant="secondary" className="text-xs">
                                        {flag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );

      case 5:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Additional Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dietaryRestrictions">Dietary Restrictions or Allergies</Label>
                <Textarea
                  id="dietaryRestrictions"
                  {...register("dietaryRestrictions")}
                  placeholder="Please list any allergies, dietary restrictions, or special dietary needs..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="specialRequests">Special Requests or Notes</Label>
                <Textarea
                  id="specialRequests"
                  {...register("specialRequests")}
                  placeholder="Any additional requests, setup requirements, or special considerations..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return watch("customerName") && watch("email") && watch("guestCount") && watch("eventDate");
      case 2:
        return selectedTheme;
      case 3:
        return selectedTier;
      case 4:
        return Object.keys(selectedItems).length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <div className="text-sm text-gray-600">
              Step {currentStep} of 5
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {renderStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 max-w-4xl mx-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedToNext()}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="flex items-center gap-2">
                Submit Inquiry
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default WeddingInquiryForm;