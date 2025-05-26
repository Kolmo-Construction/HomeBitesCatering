// src/pages/wedding/components/WeddingProgressSidebar.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Users, 
  CheckCircle, 
  Circle, 
  Utensils, 
  Leaf, 
  Calendar,
  MapPin
} from "lucide-react";
import { WeddingInquiryFormData, WeddingFormStep } from "../types/weddingFormTypes";
import { weddingThemeMenuData } from "../data/weddingThemeMenuData";

interface WeddingProgressSidebarProps {
  currentStepKey: WeddingFormStep;
  allSteps: WeddingFormStep[];
}

const WeddingProgressSidebar: React.FC<WeddingProgressSidebarProps> = ({
  currentStepKey,
  allSteps,
}) => {
  const { watch } = useFormContext<WeddingInquiryFormData>();
  
  // Watch form values safely
  const formData = watch();
  const guestCount = formData.guestCount || 50;
  const requestedTheme = formData.requestedTheme;
  const selectedPackage = formData.menuSelections?.package;
  const selectedMenuItems = formData.menuSelections?.selectedItems || {};
  const serviceStyle = formData.serviceStyle;
  const eventDate = formData.eventDate;
  const venueName = formData.venueName;

  // Calculate progress
  const currentStepIndex = allSteps.indexOf(currentStepKey);
  const progressPercentage = ((currentStepIndex + 1) / allSteps.length) * 100;

  // Calculate menu cost
  const calculateMenuCost = () => {
    if (!requestedTheme || !selectedPackage) return 0;
    
    const themeData = weddingThemeMenuData[requestedTheme];
    if (!themeData) return 0;
    
    const packageData = themeData.packages.find(pkg => pkg.id === selectedPackage);
    if (!packageData) return 0;
    
    let baseCost = packageData.price * guestCount;
    
    // Add upcharges for selected items
    let upcharges = 0;
    Object.values(selectedMenuItems).flat().forEach(itemId => {
      if (typeof itemId === 'string') {
        // Find the item in theme categories
        Object.values(themeData.categories).forEach(category => {
          const item = category.items.find(item => item.id === itemId);
          if (item && item.upcharge) {
            upcharges += item.upcharge * guestCount;
          }
        });
      }
    });
    
    return baseCost + upcharges;
  };

  const totalCost = calculateMenuCost();

  // Get dietary information for selected items
  const getDietaryInfo = () => {
    const dietary = {
      vegetarian: 0,
      vegan: 0,
      glutenFree: 0,
      total: 0
    };

    // Count selected menu items
    Object.values(selectedMenuItems).flat().forEach(itemId => {
      if (typeof itemId === 'string') {
        dietary.total++;
        // Check for dietary indicators in item IDs
        if (itemId.includes('vegan') || requestedTheme === 'vegan_wedding') {
          dietary.vegan++;
          dietary.vegetarian++;
        }
        if (itemId.includes('vegetarian') || itemId.includes('veg_')) {
          dietary.vegetarian++;
        }
        if (itemId.includes('gluten_free') || itemId.includes('gf_')) {
          dietary.glutenFree++;
        }
      }
    });

    return dietary;
  };

  const dietaryInfo = getDietaryInfo();

  // Step definitions with descriptions
  const stepDefinitions = {
    basicInfo: { label: "Contact & Date", icon: Users },
    eventDetails: { label: "Venue & Details", icon: MapPin },
    serviceStyleSelection: { label: "Service Style", icon: Utensils },
    menuSelection: { label: "Menu Theme", icon: Utensils },
    appetizerQuestion: { label: "Appetizer Choice", icon: Circle },
    appetizers: { label: "Select Appetizers", icon: Circle },
    foodTruckMenu: { label: "Food Truck Menu", icon: Circle },
    sandwichFactoryMenu: { label: "Sandwich Menu", icon: Circle },
    breakfastMenu: { label: "Breakfast Menu", icon: Circle },
    dessertQuestion: { label: "Dessert Choice", icon: Circle },
    desserts: { label: "Select Desserts", icon: Circle },
    beverageQuestion: { label: "Beverage Choice", icon: Circle },
    nonAlcoholicBeverages: { label: "Non-Alcoholic", icon: Circle },
    alcoholicBeverages: { label: "Alcoholic", icon: Circle },
    equipmentQuestion: { label: "Equipment", icon: Circle },
    equipment: { label: "Select Equipment", icon: Circle },
    dietaryRestrictions: { label: "Dietary Needs", icon: Leaf },
    review: { label: "Review & Submit", icon: CheckCircle },
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 space-y-6 fixed left-0 top-0 h-full overflow-y-auto z-10">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Step {currentStepIndex + 1} of {allSteps.length}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-sm text-gray-600">
              {stepDefinitions[currentStepKey]?.label || "Current Step"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Event Summary */}
      {(eventDate || venueName || guestCount) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Event Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {eventDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{new Date(eventDate).toLocaleDateString()}</span>
                </div>
              )}
              {venueName && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{venueName}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>{guestCount} guests</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Cost Estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Guests:</span>
              <span className="font-medium">{guestCount}</span>
            </div>
            
            {selectedPackage && (
              <div className="flex justify-between">
                <span className="text-sm">Menu Package:</span>
                <span className="font-medium">${totalCost.toLocaleString()}</span>
              </div>
            )}
            
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Current Total:</span>
              <span className="text-green-600">${totalCost.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">
              *Estimate only. Final pricing may vary.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dietary Information */}
      {dietaryInfo.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-600" />
              Dietary Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dietaryInfo.vegan > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  <Leaf className="h-3 w-3" />
                  {dietaryInfo.vegan} Vegan Items
                </Badge>
              )}
              {dietaryInfo.vegetarian > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  <Leaf className="h-3 w-3" />
                  {dietaryInfo.vegetarian} Vegetarian Items
                </Badge>
              )}
              {dietaryInfo.glutenFree > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  <Utensils className="h-3 w-3" />
                  {dietaryInfo.glutenFree} Gluten-Free Items
                </Badge>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Based on {dietaryInfo.total} selected items
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Roadmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Completion Roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allSteps.map((step, index) => {
              const stepDef = stepDefinitions[step];
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const IconComponent = stepDef?.icon || Circle;
              
              return (
                <div
                  key={step}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isCurrent ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <IconComponent
                    className={`h-4 w-4 ${
                      isCompleted ? 'text-green-600' : 
                      isCurrent ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isCompleted ? 'text-green-600 line-through' :
                      isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'
                    }`}
                  >
                    {stepDef?.label || step}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Selections Summary */}
      {(requestedTheme || serviceStyle) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current Selections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {requestedTheme && (
                <div>
                  <span className="font-medium">Theme: </span>
                  <span className="text-gray-600">
                    {weddingThemeMenuData[requestedTheme]?.title || requestedTheme}
                  </span>
                </div>
              )}
              {selectedPackage && (
                <div>
                  <span className="font-medium">Package: </span>
                  <span className="text-gray-600">
                    {weddingThemeMenuData[requestedTheme]?.packages.find(pkg => pkg.id === selectedPackage)?.name}
                  </span>
                </div>
              )}
              {serviceStyle && (
                <div>
                  <span className="font-medium">Service: </span>
                  <span className="text-gray-600">{serviceStyle}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeddingProgressSidebar;