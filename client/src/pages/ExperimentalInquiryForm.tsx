import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, ChevronLeft, Check, Building, Phone,
  MapPin, Clock, Send, Users2, LayoutGrid, Radio, CircleOff, X,
  Info as InfoIcon, Truck as TruckIcon, Package as PackageIcon,
  Utensils as UtensilsIcon, Table as TableIcon,
  UtensilsCrossed as UtensilsCrossedIcon, GlassWater as GlassWaterIcon
} from "lucide-react";
import FoodTruckMenu from "@/components/FoodTruckMenu";
import { Helmet } from "react-helmet";
import { useForm, FormProvider, useFormContext, Controller } from "react-hook-form";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

// Import externalized types
import { 
  EventType, 
  FormStep, 
  DessertLotSize, 
  DessertItem, 
  EventInquiryFormData 
} from "@/types/form-types";

// Import externalized data
import { dessertItems, dessertLotSizes } from "@/data/dessertData";
import { eventTypes, mapUrlToEventType, validateEventType } from "@/data/event-types";
import { appetizerData } from "@/data/appetizerData";
import { horsDoeurvesData } from "@/data/horsDoeurvesInfo";
import { themeMenuData } from "@/data/themeMenuInfo";
import { breakfastMenuData } from "@/data/breakfastMenuData";

// Using EventInquiryFormData imported from form-types.ts

// Sandwich Factory menu data (static)
const sandwichFactoryData = {
  title: "Sandwich Factory - Catering Packages",
  description: "Select a package that suits your needs and customize your sandwich options",
  packages: [
    { 
      id: "bronze",
      name: "Bronze Package", 
      price: 13.00,
      description: "Includes: Meats, Cheeses, Veggies, & four condiments, White, multigrain, and whole wheat breads.",
      minGuestCount: 10
    },
    { 
      id: "silver",
      name: "Silver Package", 
      price: 18.00,
      description: "Includes: Meats, cheeses, veggies, & five condiments, White, Multigrain, and whole wheat breads, croissants, bagels, and two salads.",
      minGuestCount: 10
    },
    { 
      id: "gold",
      name: "Gold Package", 
      price: 23.00,
      description: "Includes Premium meats & cheeses, veggies, fruits & six condiments, White, multigrain, whole wheat sliced breads, croissants, bagels, and two salads.",
      minGuestCount: 10
    },
    { 
      id: "diamond",
      name: "Diamond Package", 
      price: 28.00,
      description: "Includes Premium meats & cheeses, veggies, & six condiments, White, multigrain, and whole wheat breads, croissants, bagels and rolls, three salads, and fresh fruit grazing board.",
      minGuestCount: 10
    }
  ],
  options: {
    meats: [
      "Smoked Turkey",
      "Black Forest Ham",
      "Pepperoni",
      "Salami",
      "Roast Beef",
      "Pastrami"
    ],
    cheeses: [
      "Cheddar Cheese",
      "Swiss Cheese",
      "Monterey Cheese",
      "Havarti",
      "Brie",
      "Gouda",
      "Cream Cheese"
    ],
    vegetables: [
      "Lettuce",
      "Tomato",
      "Onion",
      "Avocado",
      "Spinach",
      "Arugula",
      "Pickle",
      "Bell Pepper",
      "Cucumber",
      "Olives",
      "Sprouts"
    ],
    breads: [
      "Sourdough",
      "Rye",
      "Multigrain Bread",
      "Whole Wheat Bread",
      "White Bread",
      "Bagels",
      "Croissants",
      "Rolls"
    ],
    spreads: [
      "Classic Mayo",
      "Vegan Mayo",
      "Cranberry Mayo",
      "Stone Ground Mustard",
      "Dijon Mustard",
      "Vegan Cilantro jalapeño aioli",
      "Citrus Aioli",
      "Basil Aioli",
      "Horseradish Aioli",
      "Cranberry relish",
      "Classic Sweet Pickle Relish",
      "Balsamic Fig Relish",
      "Avocado Cilantro & Lime Spread",
      "Eggplant & Tahini Spread",
      "Pomegranate / pepper / walnut spread",
      "Lebanese garlic Spread (very garlicky)"
    ],
    salads: [
      "Kale Salad",
      "Greek Village Salad",
      "Italian Pasta Salad",
      "Tabouli Salad",
      "German Cucumber Salad",
      "Wedge Salad",
      "Classic Potato Salad",
      "Tossed Cobb",
      "Crunchy Asian Salad",
      "Caesar Salad",
      "Garden Salad",
      "Lebanese Bread Salad (Fattoush)"
    ]
  },
  limits: {
    bronze: {
      spreads: 4,
      salads: 0
    },
    silver: {
      spreads: 5,
      salads: 2
    },
    gold: {
      spreads: 6,
      salads: 2
    },
    diamond: {
      spreads: 6,
      salads: 3
    }
  }
};

// BreakfastMenuStep component
const BreakfastMenuStep = ({ 
  onPrevious, 
  onNext,
  guestCount
}: { 
  onPrevious: () => void;
  onNext: () => void;
  guestCount: number;
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();
  const [selectedMenuType, setSelectedMenuType] = useState<string>("");
  const breakfastSelections = watch("breakfastMenuSelections") || {};
  
  // Initialize the breakfastMenuSelections if they're not already set
  useEffect(() => {
    if (!breakfastSelections.menuType) {
      setValue("breakfastMenuSelections", { 
        menuType: "", 
        grab_and_go_bites: [], 
        grab_and_go_snacks: [], 
        grab_and_go_beverages: [],
        continental_staples: [],
        continental_beverages: []
      });
    } else {
      setSelectedMenuType(breakfastSelections.menuType);
    }
  }, [breakfastSelections.menuType, setValue]);

  // Handle menu type selection
  const handleMenuTypeSelect = (type: string) => {
    setSelectedMenuType(type);
    setValue("breakfastMenuSelections.menuType", type);
  };

  // Handle item selection for grab and go menu (with quantity)
  const handleGrabAndGoItemSelect = (sectionId: string, itemId: string, quantity: number) => {
    const sectionKey = `grab_and_go_${sectionId}` as keyof typeof breakfastSelections;
    const currentSelections = breakfastSelections[sectionKey] as Array<{id: string, quantity: number}> || [];
    const existingIndex = currentSelections.findIndex(item => item.id === itemId);
    
    if (quantity > 0) {
      if (existingIndex >= 0) {
        // Update quantity of existing item
        const newSelections = [...currentSelections];
        newSelections[existingIndex] = { id: itemId, quantity };
        setValue(`breakfastMenuSelections.${sectionKey}`, newSelections);
      } else {
        // Add new item
        setValue(`breakfastMenuSelections.${sectionKey}`, [...currentSelections, { id: itemId, quantity }]);
      }
    } else {
      // Remove item if quantity is 0
      if (existingIndex >= 0) {
        const newSelections = [...currentSelections];
        newSelections.splice(existingIndex, 1);
        setValue(`breakfastMenuSelections.${sectionKey}`, newSelections);
      }
    }
  };

  // Handle item selection for other menu types (single/multi-select)
  const handleItemSelect = (sectionId: string, itemId: string, isMultiple: boolean, isSelected: boolean) => {
    const sectionKey = sectionId as keyof typeof breakfastSelections;
    const currentSelections = Array.isArray(breakfastSelections[sectionKey]) 
      ? [...breakfastSelections[sectionKey] as string[]] 
      : [];
    
    if (isMultiple) {
      // Multi-select logic
      if (isSelected) {
        if (!currentSelections.includes(itemId)) {
          setValue(`breakfastMenuSelections.${sectionKey}`, [...currentSelections, itemId]);
        }
      } else {
        setValue(`breakfastMenuSelections.${sectionKey}`, 
          currentSelections.filter(id => id !== itemId)
        );
      }
    } else {
      // Single-select logic (radio button)
      setValue(`breakfastMenuSelections.${sectionKey}`, itemId);
    }
  };

  // Get quantity for a grab and go item
  const getItemQuantity = (sectionId: string, itemId: string): number => {
    const sectionKey = `grab_and_go_${sectionId}` as keyof typeof breakfastSelections;
    const selections = breakfastSelections[sectionKey] as Array<{id: string, quantity: number}> || [];
    const item = selections.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };

  // Check if an item is selected (for non-grab-and-go sections)
  const isItemSelected = (sectionId: string, itemId: string): boolean => {
    const sectionKey = sectionId as keyof typeof breakfastSelections;
    const selections = breakfastSelections[sectionKey];
    
    if (!selections) return false;
    
    if (Array.isArray(selections)) {
      return selections.includes(itemId);
    } else {
      return selections === itemId;
    }
  };

  // Calculate if form is valid based on menu type requirements
  const isFormValid = () => {
    if (!selectedMenuType) return false;
    
    switch (selectedMenuType) {
      case "grab_and_go":
        // At least one item must be selected
        const bites = breakfastSelections.grab_and_go_bites || [];
        const snacks = breakfastSelections.grab_and_go_snacks || [];
        const beverages = breakfastSelections.grab_and_go_beverages || [];
        return bites.length > 0 || snacks.length > 0 || beverages.length > 0;
        
      case "continental":
        // Must have 3 staples and 2 beverages
        const staples = breakfastSelections.continental_staples || [];
        const continentalBevs = breakfastSelections.continental_beverages || [];
        return staples.length >= 3 && continentalBevs.length >= 2;
        
      case "american":
        // Check if all required fields are selected
        return !!breakfastSelections.eggs && 
               (breakfastSelections.meats || []).length >= 2 &&
               !!breakfastSelections.potatoes &&
               !!breakfastSelections.breads &&
               !!breakfastSelections.sides &&
               (breakfastSelections.beverages || []).length >= 2;
        
      case "full_monty":
        // Check if all required sections have at least one selection
        return !!breakfastSelections.serviceStyle &&
               (breakfastSelections.breakfast_meats || []).length > 0 &&
               (breakfastSelections.breads || []).length > 0 &&
               (breakfastSelections.sweet_selections || []).length > 0 &&
               (breakfastSelections.savory_selections || []).length > 0 &&
               (breakfastSelections.sides_selections || []).length > 0 &&
               (breakfastSelections.beverages || []).length > 0;
               
      default:
        return false;
    }
  };

  // Render menu type selection cards
  const renderMenuTypeSelection = () => {
    return (
      <>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Breakfast/Brunch</h2>
          <p className="text-lg text-gray-600">
            {breakfastMenuData.description}
          </p>
          <p className="mt-4 text-lg font-medium text-gray-800">
            What Type of Breakfast do you want a quote for?
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {breakfastMenuData.menuTypes.map((menuType) => (
            <Card 
              key={menuType.id}
              className={`
                overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
                ${selectedMenuType === menuType.id ? 'ring-4 ring-primary ring-offset-2' : ''}
              `}
              onClick={() => handleMenuTypeSelect(menuType.id)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{menuType.name}</h3>
                  {selectedMenuType === menuType.id && (
                    <Check className="h-6 w-6 text-primary" />
                  )}
                </div>
                <p className="text-gray-600 mb-4">{menuType.description}</p>
                {menuType.minGuestCount > 0 && (
                  <p className="text-sm text-gray-500">
                    Minimum order: {menuType.minGuestCount} guests
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  };

  // Render the specific menu based on selected type
  const renderSelectedMenu = () => {
    const selectedMenu = breakfastMenuData.menuTypes.find(menu => menu.id === selectedMenuType);
    if (!selectedMenu) return null;

    return (
      <>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">{selectedMenu.name}</h2>
          <p className="text-lg text-gray-600">
            {selectedMenu.description}
          </p>
          <Button 
            variant="outline" 
            onClick={() => setSelectedMenuType("")}
            className="mt-4"
          >
            Choose a Different Breakfast Type
          </Button>
        </div>
        
        {selectedMenu.sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-semibold mb-2">{section.name}</h3>
            <p className="text-gray-600 mb-4">{section.description}</p>
            
            {/* Grab and Go sections with quantity inputs */}
            {selectedMenu.id === "grab_and_go" && section.id.startsWith("grab_and_go_") && (
              <div className="space-y-4">
                {section.items.map((item) => {
                  const quantity = getItemQuantity(section.id.replace("grab_and_go_", ""), item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleGrabAndGoItemSelect(
                            section.id.replace("grab_and_go_", ""), 
                            item.id, 
                            Math.max(0, quantity - 1)
                          )}
                        >
                          <span>-</span>
                        </Button>
                        <span className="mx-3 w-8 text-center">{quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleGrabAndGoItemSelect(
                            section.id.replace("grab_and_go_", ""), 
                            item.id, 
                            quantity + 1
                          )}
                        >
                          <span>+</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Single-select sections (radio buttons) */}
            {section.selectType === "single" && (
              <RadioGroup
                value={breakfastSelections[section.id as keyof typeof breakfastSelections] || ""}
                onValueChange={(value) => handleItemSelect(section.id, value, false, true)}
                className="space-y-3"
              >
                {section.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <RadioGroupItem value={item.id} id={`${section.id}-${item.id}`} />
                    <Label htmlFor={`${section.id}-${item.id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium">{item.name}</span>
                      {item.price > 0 && (
                        <span className="ml-2 text-sm text-gray-500">${item.price.toFixed(2)}</span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {/* Multi-select sections (checkboxes) with selection limits */}
            {section.selectType !== "single" && !section.id.startsWith("grab_and_go_") && (
              <div className="space-y-3">
                {section.selectLimit && (
                  <p className="text-sm italic text-gray-600 mb-2">
                    {section.required ? "Required: " : ""}
                    {section.selectLimit === 1 
                      ? "Choose 1 option" 
                      : `Choose up to ${section.selectLimit} options`
                    }
                  </p>
                )}
                
                {section.items.map((item) => {
                  const isSelected = isItemSelected(section.id, item.id);
                  const selections = breakfastSelections[section.id as keyof typeof breakfastSelections] || [];
                  const selectionCount = Array.isArray(selections) ? selections.length : 0;
                  const isLimitReached = section.selectLimit ? selectionCount >= section.selectLimit : false;
                  const disabled = isLimitReached && !isSelected;
                  
                  return (
                    <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Checkbox 
                        id={`${section.id}-${item.id}`}
                        checked={isSelected}
                        disabled={disabled}
                        onCheckedChange={(checked) => 
                          handleItemSelect(section.id, item.id, true, !!checked)
                        }
                      />
                      <Label htmlFor={`${section.id}-${item.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">{item.name}</span>
                        {item.price > 0 && (
                          <span className="ml-2 text-sm text-gray-500">${item.price.toFixed(2)}</span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        
        {/* Special requests / notes */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Special Requests</h3>
          <FormField
            control={control}
            name="breakfastMenuSelections.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional notes or dietary restrictions</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please enter any special requests, dietary restrictions, or additional information here."
                    className="h-24"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {!selectedMenuType ? renderMenuTypeSelection() : renderSelectedMenu()}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center bg-primary"
          disabled={selectedMenuType !== "" && !isFormValid()}
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// DessertQuestionStep component
const DessertQuestionStep = ({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  const wantsDesserts = watch("wantsDesserts");
  
  // Handle dessert selection
  const handleDessertSelection = (value: boolean) => {
    setValue("wantsDesserts", value);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Desserts</h2>
        <p className="text-lg text-gray-600">
          Would you like to add any desserts to your event menu?
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsDesserts ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleDessertSelection(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Check className={`h-16 w-16 ${wantsDesserts ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Yes</h3>
              <p className="text-gray-600">I would like to add desserts to my event menu.</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsDesserts === false ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleDessertSelection(false)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <X className={`h-16 w-16 ${wantsDesserts === false ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">No</h3>
              <p className="text-gray-600">I don't need desserts for this event.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center bg-primary"
          disabled={wantsDesserts === undefined}
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// SandwichFactoryMenuStep component
const SandwichFactoryMenuStep = ({
  guestCount,
  onPrevious,
  onNext
}: {
  guestCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("packages");
  
  // Initialize selected options state
  const [selectedOptions, setSelectedOptions] = useState({
    meats: [] as string[],
    cheeses: [] as string[],
    vegetables: [] as string[],
    breads: [] as string[],
    spreads: [] as string[],
    salads: [] as string[]
  });
  
  // Get current package limits
  const packageLimits = selectedPackage ? sandwichFactoryData.limits[selectedPackage as keyof typeof sandwichFactoryData.limits] : null;
  
  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    
    // Initialize sandwichFactorySelections if it doesn't exist
    if (!watch("sandwichFactorySelections")) {
      setValue("sandwichFactorySelections", {
        package: packageId,
        meats: [],
        cheeses: [],
        vegetables: [],
        breads: [],
        spreads: [],
        salads: [],
        wantsGlutenFreeBread: false
      });
    } else {
      // Update just the package selection
      setValue("sandwichFactorySelections.package", packageId);
    }
    
    // Reset selections when changing packages
    setSelectedOptions({
      meats: [],
      cheeses: [],
      vegetables: [],
      breads: [],
      spreads: [],
      salads: []
    });
    
    // Move to options tab after selecting a package
    setActiveTab("options");
  };
  
  // Handle option selection for each category
  const handleOptionSelection = (category: string, option: string) => {
    setSelectedOptions(prev => {
      const currentSelections = [...prev[category as keyof typeof prev]];
      const index = currentSelections.indexOf(option);
      
      // Check if we're at the limit for this category
      const limit = packageLimits ? 
        (category === 'spreads' ? packageLimits.spreads : 
         category === 'salads' ? packageLimits.salads : 0) : 0;
      
      if (index >= 0) {
        // Remove item if already selected
        currentSelections.splice(index, 1);
      } else {
        // Add item if under limit
        if (limit === 0 || currentSelections.length < limit) {
          currentSelections.push(option);
        }
      }
      
      // Make sure we have the sandwich factory selections object initialized
      if (!watch("sandwichFactorySelections")) {
        setValue("sandwichFactorySelections", {
          package: selectedPackage,
          meats: [],
          cheeses: [],
          vegetables: [],
          breads: [],
          spreads: [],
          salads: [],
          wantsGlutenFreeBread: false
        });
      }
      
      // Update form data with new selections
      setValue(`sandwichFactorySelections.${category}`, currentSelections);
      
      return {
        ...prev,
        [category]: currentSelections
      };
    });
  };
  
  // Calculate remaining selections for each category
  const getRemainingSelections = (category: string) => {
    if (!packageLimits) return 0;
    const limit = category === 'spreads' ? packageLimits.spreads :
                 category === 'salads' ? packageLimits.salads : 0;
    
    if (limit === 0) return null; // Unlimited
    
    const currentCount = selectedOptions[category as keyof typeof selectedOptions]?.length || 0;
    return limit - currentCount;
  };
  
  // Render the package cards
  const renderPackageCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {sandwichFactoryData.packages.map(pkg => (
          <Card 
            key={pkg.id}
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${selectedPackage === pkg.id ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handlePackageSelect(pkg.id)}
          >
            <CardHeader className="bg-primary/5 pb-2">
              <CardTitle className="flex justify-between items-center">
                <span>{pkg.name}</span>
                <span className="text-primary font-bold">${pkg.price.toFixed(2)}/person</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-sm">
              <p className="mb-2">{pkg.description}</p>
              <p className="text-xs text-muted-foreground">Minimum {pkg.minGuestCount} guests</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Render option checkboxes for each category
  const renderOptionSelection = (category: string, options: string[]) => {
    const remaining = getRemainingSelections(category);
    const selections = selectedOptions[category as keyof typeof selectedOptions];
    
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium capitalize">{category}</h3>
          {remaining !== null && (
            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
              {remaining} remaining
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {options.map(option => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${category}-${option}`}
                checked={selections.includes(option)}
                onCheckedChange={() => handleOptionSelection(category, option)}
                disabled={remaining === 0 && !selections.includes(option)}
              />
              <label
                htmlFor={`${category}-${option}`}
                className={`text-sm ${remaining === 0 && !selections.includes(option) ? 'text-gray-400' : ''}`}
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Check if all required selections are made
  const isSelectionComplete = () => {
    if (!selectedPackage) return false;
    
    // Check if required selections meet the package limits
    if (packageLimits) {
      if (packageLimits.spreads > 0 && selectedOptions.spreads.length < packageLimits.spreads) {
        return false;
      }
      if (packageLimits.salads > 0 && selectedOptions.salads.length < packageLimits.salads) {
        return false;
      }
    }
    
    // Require at least one item from meats, cheeses, vegetables, breads
    return selectedOptions.meats.length > 0 &&
           selectedOptions.cheeses.length > 0 &&
           selectedOptions.vegetables.length > 0 &&
           selectedOptions.breads.length > 0;
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Sandwich Factory Menu</h2>
        <p className="text-lg text-gray-600">
          Select your sandwich package and customize your options
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="options" disabled={!selectedPackage}>Menu Options</TabsTrigger>
          </TabsList>
          
          <TabsContent value="packages">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Select a Catering Package</h3>
              {renderPackageCards()}
            </div>
          </TabsContent>
          
          <TabsContent value="options">
            {selectedPackage && (
              <div>
                <div className="mb-4 p-3 bg-primary/5 rounded-md">
                  <h3 className="font-medium mb-1">
                    Selected Package: {sandwichFactoryData.packages.find(p => p.id === selectedPackage)?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {sandwichFactoryData.packages.find(p => p.id === selectedPackage)?.description}
                  </p>
                </div>
                
                <div className="space-y-6">
                  {renderOptionSelection('meats', sandwichFactoryData.options.meats)}
                  {renderOptionSelection('cheeses', sandwichFactoryData.options.cheeses)}
                  {renderOptionSelection('vegetables', sandwichFactoryData.options.vegetables)}
                  {renderOptionSelection('breads', sandwichFactoryData.options.breads)}
                  {renderOptionSelection('spreads', sandwichFactoryData.options.spreads)}
                  {packageLimits && packageLimits.salads > 0 && (
                    renderOptionSelection('salads', sandwichFactoryData.options.salads)
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <FormField
                    control={control}
                    name="sandwichFactorySelections.wantsGlutenFreeBread"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked) {
                                setValue("sandwichFactorySelections.glutenFreeBreadCount", 1);
                              }
                            }}
                            id="gluten-free-option"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel htmlFor="gluten-free-option">
                            Add gluten-free bread option (+$0.50 per person)
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {watch("sandwichFactorySelections.wantsGlutenFreeBread") && (
                    <FormField
                      control={control}
                      name="sandwichFactorySelections.glutenFreeBreadCount"
                      render={({ field }) => (
                        <FormItem className="mb-4 ml-8">
                          <FormLabel>How many gluten-free breads?</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the number of gluten-free breads needed
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <div className="mt-6">
                  <FormField
                    control={control}
                    name="sandwichFactorySelections.notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requests or Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any special requests or dietary notes for your order"
                            className="min-h-[100px]"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
          disabled={!isSelectionComplete()}
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Experimental Form Header component
const PublicFormHeader = () => {
  return (
    <div className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-6 mb-8">
      <div className="container mx-auto">
        <h1 className="text-5xl font-extrabold mb-4 text-center">Home Bites Catering Services</h1>
        <p className="text-xl text-center max-w-2xl mx-auto">
          <span className="bg-white/20 px-2 py-1 rounded">EXPERIMENTAL VERSION</span> - Exceptional cuisine for extraordinary moments
        </p>
      </div>
    </div>
  );
};

// Progress bar component
const FormProgressBar = ({ 
  currentStep, 
  totalSteps,
  completedSteps = []
}: { 
  currentStep: number;
  totalSteps: number;
  completedSteps?: string[];
}) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {Math.floor((currentStep / totalSteps) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

// Step 1: Event Type Selection Component
const EventTypeSelectionStep = ({ 
  onSelectEventType, 
  selectedEventType 
}: { 
  onSelectEventType: (type: EventType) => void;
  selectedEventType: EventType | null;
}) => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold tracking-tight mb-3 text-gray-900">
          Let's Plan Your Perfect Event
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Select the type of event you're planning, and we'll customize our services to match your vision.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {eventTypes.map((event) => (
          <EventTypeCard 
            key={event.type}
            event={event}
            onSelect={() => onSelectEventType(event.type)}
            isSelected={selectedEventType === event.type}
          />
        ))}
      </div>
    </div>
  );
};

// Component for individual event type cards
function EventTypeCard({ 
  event, 
  onSelect, 
  isSelected 
}: { 
  event: typeof eventTypes[0]; 
  onSelect: () => void; 
  isSelected: boolean;
}) {
  return (
    <Card 
      className={`
        overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 
        ${isSelected ? 'ring-4 ring-primary ring-offset-2 scale-105' : ''}
      `}
      onClick={onSelect}
    >
      <div className={`bg-gradient-to-r ${event.gradient} p-8 text-white text-center`}>
        {event.icon}
        <h3 className="text-2xl font-bold mb-1">{event.type}</h3>
      </div>
      <CardContent className="p-6">
        <p className="text-gray-600 text-lg mb-4">{event.description}</p>
        <Button 
          className="w-full mt-2 py-6 text-lg transition-all duration-300"
          variant={isSelected ? "default" : "outline"}
          size="lg"
        >
          {isSelected ? "Selected" : "Select This Event"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Step 2: Basic Information Form Component
const BasicInformationStep = ({ 
  eventType,
  onPrevious,
  onNext 
}: { 
  eventType: EventType;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, formState: { errors, isValid } } = useFormContext<EventInquiryFormData>();
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Basic Information</h2>
        <p className="text-lg text-gray-600">
          Let's get to know you and your {eventType.toLowerCase()} event
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6 flex items-center justify-center bg-gray-100 py-3 rounded-md">
          <div className={`inline-flex items-center px-4 py-2 rounded-md bg-primary/10 border border-primary/20`}>
            <span className="text-primary font-medium">{eventType}</span>
          </div>
        </div>
        
        {/* Company Name - Only show for Corporate events */}
        {eventType === "Corporate" && (
          <div className="mb-6">
            <FormField
              control={control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        
        {/* Contact Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={control}
            name="contactName.firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="contactName.lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Email and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            control={control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address*</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="(123) 456-7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Billing Address */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Billing Address</h3>
          
          <div className="space-y-4">
            <FormField
              control={control}
              name="billingAddress.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address*</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="billingAddress.street2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address Line 2</FormLabel>
                  <FormControl>
                    <Input placeholder="Apt, Suite, Unit, etc. (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name="billingAddress.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City*</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="billingAddress.state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province*</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="billingAddress.zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal/Zip Code*</FormLabel>
                    <FormControl>
                      <Input placeholder="Zip Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        
        {/* Event Date */}
        <div className="mb-6">
          <FormField
            control={control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Date*</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Dessert Matrix component for selecting quantities
const DessertMatrix = ({ 
  item, 
  onSelectionChange
}: { 
  item: DessertItem;
  onSelectionChange: (itemId: string, quantity: DessertLotSize | null) => void;
}) => {
  const { watch } = useFormContext<EventInquiryFormData>();
  const dessertSelections = watch("dessertSelections");
  
  // Get the current selection
  const currentSelection = dessertSelections[item.id] || null;
  
  const handleLotSelect = (lotSize: DessertLotSize) => {
    if (currentSelection === lotSize) {
      // Deselect if already selected
      onSelectionChange(item.id, null);
    } else {
      // Select new lot size
      onSelectionChange(item.id, lotSize);
    }
  };
  
  return (
    <div className="mb-4 px-2 py-3 border-b border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <span className="font-medium text-gray-800">{item.name}</span>
          <div className="text-sm text-gray-500">${item.price.toFixed(2)} each</div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-3">
        {dessertLotSizes.map((lotSize) => (
          <Button
            key={`${item.id}-${lotSize}`}
            type="button"
            size="sm"
            variant={currentSelection === lotSize ? "default" : "outline"}
            onClick={() => handleLotSelect(lotSize)}
            className="px-2 py-1 h-auto text-xs"
          >
            {lotSize} pcs
            {currentSelection === lotSize && 
              <span className="ml-1 text-xs">
                (${(lotSize * item.price).toFixed(2)})
              </span>
            }
          </Button>
        ))}
      </div>
    </div>
  );
};

// Desserts step component
const DietaryRestrictionsStep = ({ 
  onPrevious,
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch } = useFormContext<EventInquiryFormData>();
  
  // Common allergies and dietary restrictions
  const commonDietaryRestrictions = [
    { id: "vegetarian", label: "Vegetarian" },
    { id: "vegan", label: "Vegan" },
    { id: "gluten_free", label: "Gluten Free" },
    { id: "dairy_free", label: "Dairy Free" },
    { id: "nut_free", label: "Nut Free" },
    { id: "shellfish_allergy", label: "Shellfish Allergy" },
    { id: "kosher", label: "Kosher" },
    { id: "halal", label: "Halal" }
  ];
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Dietary Restrictions</h2>
        <p className="text-lg text-gray-600">
          Let us know about any dietary requirements or food allergies
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Common Dietary Restrictions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select any dietary restrictions that apply to your guests. This helps us prepare appropriate menu options.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {commonDietaryRestrictions.map((restriction) => (
              <FormField
                key={restriction.id}
                control={control}
                name={`dietaryRestrictions.${restriction.id}`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">
                        {restriction.label}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
          
          <div className="mt-6">
            <h4 className="text-lg font-medium mb-2">Guest Count for Dietary Restrictions</h4>
            <p className="text-sm text-gray-600 mb-4">
              For each selected restriction, please specify how many guests require this option.
            </p>
            
            <div className="space-y-4">
              {commonDietaryRestrictions.map((restriction) => {
                // Only show count field if restriction is selected
                const isSelected = watch(`dietaryRestrictions.${restriction.id}`);
                
                if (!isSelected) return null;
                
                return (
                  <FormField
                    key={`${restriction.id}-count`}
                    control={control}
                    name={`dietaryCount.${restriction.id}`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="font-medium">
                            {restriction.label} Count:
                          </FormLabel>
                          <div className="w-24">
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                className="text-right"
                              />
                            </FormControl>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Food Allergies</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please specify any food allergies or intolerances that we should be aware of.
          </p>
          
          <FormField
            control={control}
            name="dietaryNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dietary Notes & Food Allergies</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Please provide details about any dietary restrictions, food allergies, or special requirements (e.g., number of vegetarian meals needed, severe allergies, etc.)"
                    className="min-h-[150px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-between mt-8">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          <Button 
            type="button" 
            onClick={onNext}
            className="flex items-center"
          >
            Review Your Inquiry <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const DessertsStep = ({ 
  onPrevious,
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { setValue, watch } = useFormContext<EventInquiryFormData>();
  const dessertSelections = watch("dessertSelections");
  
  // Handle selection of a dessert item with a specific quantity
  const handleDessertSelection = (itemId: string, quantity: DessertLotSize | null) => {
    // If quantity is null, remove the item
    if (quantity === null) {
      const updatedSelections = { ...dessertSelections };
      delete updatedSelections[itemId];
      setValue("dessertSelections", updatedSelections);
    } else {
      // Otherwise update with the new quantity
      setValue("dessertSelections", {
        ...dessertSelections,
        [itemId]: quantity
      });
    }
  };
  
  // Calculate total based on selections
  const calculateTotal = () => {
    return Object.entries(dessertSelections || {}).reduce((total, [itemId, quantity]) => {
      const item = dessertItems.find(item => item.id === itemId);
      if (item && quantity) {
        return total + (item.price * quantity);
      }
      return total;
    }, 0);
  };
  
  // Count selected items
  const selectedCount = Object.keys(dessertSelections || {}).length;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Dessert Selections</h2>
        <p className="text-lg text-gray-600">
          Choose your dessert options with quantities
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Dessert Options</h3>
          <p className="text-sm text-gray-600 mb-4">
            The dessert selections are offered with options for different quantities (36, 48, 72, 96, 144). 
            Select the quantity for each dessert item you would like to include.
          </p>
          
          <div className="mt-6 border rounded-md divide-y">
            {dessertItems.map(item => (
              <DessertMatrix
                key={item.id}
                item={item}
                onSelectionChange={handleDessertSelection}
              />
            ))}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <div className="flex justify-between items-center">
            <span className="font-medium">Selected Items: {selectedCount}</span>
            <span className="font-medium">Total: ${calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button type="button" onClick={onPrevious} variant="outline">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <Button type="button" onClick={onNext}>
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Using appetizer data externalized to appetizerData.ts file

// Step 3: Event Details & Venue Form Component
const EventDetailsStep = ({ 
  eventType,
  onPrevious,
  onNext 
}: { 
  eventType: EventType;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, formState: { errors, isValid } } = useFormContext<EventInquiryFormData>();
  
  // Watch values to conditionally show fields
  const venueSecured = watch("venueSecured");
  const hasCocktailHour = watch("hasCocktailHour");
  const hasMainCourse = watch("hasMainCourse");
  const serviceStyle = watch("serviceStyle"); // We're keeping the field name as serviceStyle for compatibility
  
  // Service type options
  const serviceTypeOptions = [
    { value: "catering_buffet", label: "Catering Buffet" },
    { value: "breakfast_brunch", label: "Breakfast/Brunch Buffet" },
    { value: "sandwich_factory", label: "Sandwich Factory Buffet" },
    { value: "family_style", label: "Family Style" },
    { value: "plated_dinner", label: "Plated Dinner" },
    { value: "cocktail_party", label: "Cocktail - Appetizers Only" },
    { value: "food_truck", label: "Food Truck" },
  ];
  
  // Theme options
  const themeOptions = [
    { value: "taco_fiesta", label: "Taco Fiesta" },
    { value: "american_bbq", label: "American BBQ" },
    { value: "taste_of_greece", label: "A Taste of Greece" },
    { value: "kebab_party", label: "Kebab Party" },
    { value: "taste_of_italy", label: "A Taste of Italy" },
    { value: "sandwich_factory", label: "Sandwich Factory" },
    { value: "custom_menu", label: "Custom Menu" },
    { value: "hors_doeuvres", label: "Hor d'oeuvres only (Cocktail party)" },
  ];
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Event Details & Venue</h2>
        <p className="text-lg text-gray-600">
          Tell us more about your venue and event timing
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Venue Information */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Venue Information</h3>
          
          <FormField
            control={control}
            name="venueSecured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Have you secured a venue?</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          {venueSecured && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 space-y-4">
              <FormField
                control={control}
                name="venueName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter venue name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Venue Location */}
              <div className="space-y-4">
                <h4 className="text-md font-medium">Venue Location</h4>
                
                <FormField
                  control={control}
                  name="venueLocation.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="venueLocation.street2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt, Suite, Unit, etc. (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={control}
                    name="venueLocation.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="venueLocation.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="venueLocation.zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal/Zip Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Zip Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Event Schedule */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Event Schedule</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={control}
              name="eventStartTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Start Time</FormLabel>
                  <FormControl>
                    <Input placeholder="HH:MM AM/PM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name="eventEndTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event End Time</FormLabel>
                  <FormControl>
                    <Input placeholder="HH:MM AM/PM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Wedding-specific timing fields */}
          {eventType === "Wedding" && (
            <div className="border rounded-md p-4 mb-4 bg-gray-50">
              <h4 className="text-md font-medium mb-3">Wedding Ceremony Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField
                  control={control}
                  name="ceremonyStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ceremony Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="ceremonyEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ceremony End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={control}
                name="setupBeforeCeremony"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 mb-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set-up before Ceremony start time?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          )}
          
          {/* Cocktail Hour */}
          <FormField
            control={control}
            name="hasCocktailHour"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Cocktail Hour</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          {hasCocktailHour && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="cocktailStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cocktail/Appetizer Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="cocktailEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cocktail/Appetizer End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          
          {/* Main Course Service */}
          <FormField
            control={control}
            name="hasMainCourse"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Main Course Service</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          {hasMainCourse && (
            <div className="ml-4 border-l-2 border-primary/30 pl-4 py-2 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name="foodServiceStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Service Start Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={control}
                  name="foodServiceEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food Service End Time</FormLabel>
                      <FormControl>
                        <Input placeholder="HH:MM AM/PM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Guest Count and Service Style */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Service Details</h3>
          
          <FormField
            control={control}
            name="guestCount"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Guest Count</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="Number of guests" 
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="serviceStyle"
            render={({ field }) => (
              <FormItem className="mb-6">
                <FormLabel className="text-lg font-medium mb-3">Service Type</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceTypeOptions.map((option) => (
                    <Card 
                      key={option.value}
                      className={`
                        transition-all duration-200 hover:shadow-md cursor-pointer
                        ${field.value === option.value ? 'border-2 border-primary shadow-md' : 'border border-gray-200'}
                      `}
                      onClick={() => field.onChange(option.value)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          {option.value === 'food_truck' && <TruckIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'catering_buffet' && <UtensilsIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'breakfast_brunch' && <Clock className="h-6 w-6 text-primary" />}
                          {option.value === 'sandwich_factory' && <UtensilsIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'family_style' && <TableIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'plated_dinner' && <UtensilsIcon className="h-6 w-6 text-primary" />}
                          {option.value === 'cocktail_party' && <GlassWaterIcon className="h-6 w-6 text-primary" />}
                        </div>
                        <div className={`font-medium ${field.value === option.value ? 'text-primary' : 'text-gray-700'}`}>
                          {option.label}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Service fee notes */}
          {serviceStyle === "buffet_full" && (
            <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Service Fee Note - Full Service:</strong> A 20% service fee will be applied for Buffet Full Service. This includes professional servers, complete setup and breakdown, and premium service throughout your event.
              </p>
            </div>
          )}
          
          {serviceStyle === "buffet_standard" && (
            <div className="p-4 mb-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Service Fee Note - Standard Service:</strong> A 15% service fee will be applied for Buffet Standard Service. This includes basic setup, food service assistance, and cleanup of service areas.
              </p>
            </div>
          )}
          
          {/* Service duration and labor hours fields removed as requested */}
        </div>
        
        {/* Service Style Section - Extra Guidance */}
        <div className="mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <h4 className="text-amber-800 font-medium mb-2 flex items-center">
              <InfoIcon className="h-5 w-5 mr-2" /> 
              Next Steps
            </h4>
            <p className="text-sm text-amber-700">
              After completing these details, you'll be able to select your menu options in the next step.
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Menu data imported from themeMenuInfo.ts

// Defining Hors d'oeuvres component properties for each step
const horsDoeurvesComponentData = {
  serviceStyles: [
    { id: "stationary", name: "Stationary buffet" },
    { id: "passed", name: "Passed" }
  ],
  // Using the existing horsDoeurvesData for actual food items
  categories: [
    {
      id: "tea_sandwiches",
      name: "Tea Sandwiches",
      description: "Offered in lots of 48",
      lotSizes: [36, 48, 96, 144],
      items: [
        { id: "pate", name: "Pate with pickled veg", price: 1.95 },
        { id: "cream_cheese_shrimp", name: "Cream Cheese and Shrimp", price: 2.50 },
        { id: "blt", name: "BLT - (Bacon Lettuce & Tomato)", price: 1.95 },
        { id: "caprese", name: "Caprese (Mozzarella, Tomato, & Basil)", price: 1.95 },
        { id: "gravlax", name: "Gravlax, Cream Cheese & Cucumber", price: 2.75 },
        { id: "prosciutto_fig", name: "Prosciutto-Fig", price: 2.75 },
        { id: "crab_salad", name: "Crab Salad", price: 3.00 },
        { id: "chicken_cranberry", name: "Chicken Cranberry", price: 2.00 },
        { id: "miso_egg", name: "Miso egg salad", price: 2.25 }
      ]
    },
    {
      id: "shooters",
      name: "Shooters",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 96, 144],
      items: [
        { id: "chicken_satay", name: "Chicken Satay", price: 2.45 },
        { id: "greek_village", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.25 },
        { id: "gazpacho", name: "Gazpacho with shrimp", price: 2.75 },
        { id: "cucumber_jalapeno", name: "Chilled Cucumber/Jalapeno with shrimp", price: 2.75 },
        { id: "bloody_mary", name: "Bloody Mary with lobster (non-alcoholic)", price: 4.75 },
        { id: "beet_vichyssoise", name: "Roasted beet Vichyssoise with green bean", price: 2.45 },
        { id: "peach_soup", name: "Chilled peach soup with Gravlax", price: 2.75 },
        { id: "avocado_soup", name: "Chilled avocado soup with crab and pico", price: 3.75 }
      ]
    },
    {
      id: "mini_skewers",
      name: "Mini Skewers",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 96, 144],
      items: [
        { id: "korean_pork", name: "Korean BBQ pork belly", price: 2.75 },
        { id: "greek_village_skewer", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.25 },
        { id: "chicken_teriyaki", name: "Chicken Teriyaki", price: 2.75 },
        { id: "moroccan_flank", name: "Grilled Moroccan style Flank steak", price: 2.75 },
        { id: "med_shrimp", name: "Mediterranean style shrimp", price: 2.75 },
        { id: "caprese_skewer", name: "Caprese - Tomato, Basil and Mozzarella - cold", price: 2.25 },
        { id: "prosciutto_melon", name: "Prosciutto, Melon and Basil - cold", price: 2.75 },
        { id: "tofu_hoisin", name: "Tofu with Hoisin plum sauce", price: 2.25 },
        { id: "antipasto", name: "Antipasto Bites", price: 2.75 }
      ]
    },
    {
      id: "canapes",
      name: "Canapes",
      description: "Offered in lots of 48",
      lotSizes: [48, 96, 144],
      items: [
        { id: "watermelon_radish", name: "Watermelon radish chips with apple chutney", price: 2.75 },
        { id: "greek_village_canape", name: "Greek Village - Tomato, feta, cucumber and olive", price: 2.75 },
        { id: "french_onion", name: "French onion tartlets with Gruyere and dill", price: 2.75 },
        { id: "pear_camembert", name: "Pear and Camembert tartlet", price: 2.75 },
        { id: "med_shrimp_canape", name: "Mediterranean style shrimp", price: 2.75 },
        { id: "miso_maple", name: "Miso maple deviled eggs", price: 2.75 },
        { id: "beet_chips", name: "Beet chips with goat cheese and asparagus tips", price: 2.75 },
        { id: "vegan_bruschetta", name: "Vegan Bruschetta with olive tapenade and mint coulis", price: 2.75 }
      ]
    },
    {
      id: "vol_au_vents",
      name: "Vol au vents",
      description: "Offered in lots of 24",
      lotSizes: [24, 48, 96],
      items: [
        { id: "gravlax_cream", name: "Gravlax with cream cheese", price: 3.00 },
        { id: "spinach_feta", name: "Spinach, feta and leek", price: 3.00 },
        { id: "chicken_teriyaki_vol", name: "Chicken Teriyaki", price: 3.00 },
        { id: "melted_brie", name: "Melted Brie with cranberry relish", price: 3.50 },
        { id: "curried_chicken", name: "Curried chicken salad", price: 3.00 },
        { id: "tuna_tartare", name: "Tuna tartare", price: 3.75 },
        { id: "brie_walnut", name: "Brie with walnuts and mushrooms", price: 3.25 },
        { id: "pulled_pork", name: "Pulled pork with prunes and apple", price: 3.25 }
      ]
    }
  ]
};

// Matrix-style Hors d'oeuvres component
const HorsDoeurvesMatrix = ({ 
  category, 
  onSelectionChange
}: { 
  category: {
    id: string;
    name: string;
    description: string;
    lotSizes: number[];
    items: Array<{
      id: string;
      name: string;
      price: number;
    }>
  }; 
  onSelectionChange: (itemId: string, quantity: number | null) => void;
}) => {
  const { watch } = useFormContext<EventInquiryFormData>();
  const horsDoeurvesSelections = watch("horsDoeurvesSelections");
  
  // Get selected quantity for an item
  const getSelectedQuantity = (itemId: string): number | null => {
    if (!horsDoeurvesSelections || !horsDoeurvesSelections.categories || 
        !horsDoeurvesSelections.categories[category.id] || 
        !horsDoeurvesSelections.categories[category.id].items) {
      return null;
    }
    
    return horsDoeurvesSelections.categories[category.id].items[itemId]?.quantity || null;
  };
  
  // Clear a selection
  const clearSelection = (itemId: string) => {
    onSelectionChange(itemId, null);
  };
  
  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold mb-2">{category.name} - {category.description}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left w-1/3">Item</th>
              {category.lotSizes.map((size: number) => (
                <th key={size} className="p-2 border text-center">{size}</th>
              ))}
              <th className="p-2 border text-center">Clear Choice</th>
            </tr>
          </thead>
          <tbody>
            {category.items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-2 border">
                  {item.name} (${item.price.toFixed(2)} each)
                </td>
                {category.lotSizes.map((size: number) => (
                  <td key={size} className="p-2 border text-center">
                    <div 
                      className={`w-6 h-6 rounded-full border mx-auto cursor-pointer flex items-center justify-center
                        ${getSelectedQuantity(item.id) === size ? 'bg-primary border-primary' : 'border-gray-300'}`}
                      onClick={() => onSelectionChange(item.id, size)}
                    >
                      {getSelectedQuantity(item.id) === size && <div className="w-3 h-3 rounded-full bg-white"></div>}
                    </div>
                  </td>
                ))}
                <td className="p-2 border text-center">
                  <div 
                    className={`w-6 h-6 rounded-full border mx-auto cursor-pointer flex items-center justify-center
                      ${getSelectedQuantity(item.id) === null ? 'bg-gray-200 border-gray-400' : 'border-gray-300'}`}
                    onClick={() => clearSelection(item.id)}
                  >
                    {getSelectedQuantity(item.id) === null && <div className="w-3 h-3 rounded-full bg-white"></div>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Total: ${calculateCategoryTotal(category, horsDoeurvesSelections).toFixed(2)}
        </p>
      </div>
    </div>
  );
};

// Helper function to calculate total for a category
const calculateCategoryTotal = (category: any, selections: any): number => {
  if (!selections || !selections.categories || !selections.categories[category.id]) {
    return 0;
  }
  
  let total = 0;
  const categorySelections = selections.categories[category.id].items || {};
  
  Object.keys(categorySelections).forEach(itemId => {
    const item = category.items.find((i: any) => i.id === itemId);
    const quantity = categorySelections[itemId].quantity;
    
    if (item && quantity) {
      total += item.price * quantity;
    }
  });
  
  return total;
};

// Step 5: Appetizers Question Step
const AppetizersQuestionStep = ({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue } = useFormContext<EventInquiryFormData>();
  const wantsAppetizers = watch("wantsAppetizers");
  
  // Handle appetizer selection
  const handleAppetizerSelection = (value: boolean) => {
    setValue("wantsAppetizers", value);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Appetizers</h2>
        <p className="text-lg text-gray-600">
          Would you like to add any appetizers to your quote?
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsAppetizers ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleAppetizerSelection(true)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <Check className={`h-16 w-16 ${wantsAppetizers ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Yes</h3>
              <p className="text-gray-600">I would like to add appetizers to my event.</p>
            </CardContent>
          </Card>
          
          <Card 
            className={`
              overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
              ${wantsAppetizers === false ? 'ring-4 ring-primary ring-offset-2' : ''}
            `}
            onClick={() => handleAppetizerSelection(false)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4 flex justify-center">
                <X className={`h-16 w-16 ${wantsAppetizers === false ? 'text-primary' : 'text-gray-300'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-2">No</h3>
              <p className="text-gray-600">I don't need appetizers for this event.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Step 6: Appetizers & Hors d'oeuvres Selection Component
const AppetizersStep = ({ 
  onPrevious,
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();
  
  // Get form values
  const appetizerService = watch("appetizerService");
  const appetizers = watch("appetizers");
  const horsDoeurvesSelections = watch("horsDoeurvesSelections");
  
  // Make sure we have the horsDoeurvesSelections structure initialized
  useEffect(() => {
    // Initialize horsDoeurvesSelections with empty structure if needed
    if (!horsDoeurvesSelections || !horsDoeurvesSelections.categories) {
      setValue("horsDoeurvesSelections", {
        serviceStyle: horsDoeurvesSelections?.serviceStyle || "stationary",
        categories: {}
      });
    }
    
    // We don't modify requestedTheme here to avoid navigation issues
  }, []);
  
  // Initialize appetizers structure if needed
  const initializeCategory = (categoryId: string) => {
    if (!appetizers[categoryId]) {
      setValue(`appetizers.${categoryId}`, []);
    }
  };

  // Handle service style selection
  const handleServiceStyleChange = (value: string) => {
    setValue("appetizerService", value as "stationary" | "passed");
  };
  
  // Initialize horsDoeurvesSelections if needed
  const initializeHorsDoeurvesSelections = () => {
    if (!horsDoeurvesSelections) {
      setValue("horsDoeurvesSelections", {
        serviceStyle: "stationary",
        categories: {}
      });
    }
  };
  
  // Handle Hors d'oeuvres service style selection
  const handleHorsDoeurvesServiceStyleChange = (value: string) => {
    initializeHorsDoeurvesSelections();
    setValue("horsDoeurvesSelections.serviceStyle", value as "stationary" | "passed");
  };
  
  // Handle matrix selection for hors d'oeuvres
  const handleHorsDoeurvesItemSelection = (categoryId: string, itemId: string, quantity: number | null) => {
    initializeHorsDoeurvesSelections();
    
    // Make sure the category exists
    if (!horsDoeurvesSelections?.categories?.[categoryId]) {
      setValue(`horsDoeurvesSelections.categories.${categoryId}`, {
        items: {}
      });
    }
    
    if (quantity === null) {
      // Clear selection
      if (horsDoeurvesSelections?.categories?.[categoryId]?.items?.[itemId]) {
        const updatedItems = { ...horsDoeurvesSelections.categories[categoryId].items };
        delete updatedItems[itemId];
        setValue(`horsDoeurvesSelections.categories.${categoryId}.items`, updatedItems);
      }
    } else {
      // Set selection
      const item = horsDoeurvesData.categories
        .find(cat => cat.id === categoryId)?.items
        .find(item => item.id === itemId);
        
      if (item) {
        setValue(`horsDoeurvesSelections.categories.${categoryId}.items.${itemId}`, {
          name: item.name,
          price: item.price,
          quantity
        });
      }
    }
  };
  
  // Get the selected quantity for an item in the matrix
  const getSelectedQuantity = (categoryId: string, itemId: string): number | null => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items?.[itemId]) {
      return null;
    }
    return horsDoeurvesSelections.categories[categoryId].items[itemId].quantity;
  };
  
  // Calculate total for specific hors d'oeuvres category
  const calculateCategoryTotal = (categoryId: string): number => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items) {
      return 0;
    }
    
    let categoryTotal = 0;
    const category = horsDoeurvesData.categories.find(c => c.id === categoryId);
    const items = horsDoeurvesSelections.categories[categoryId].items;
    
    // For per-person pricing (like charcuterie)
    if (category?.perPersonPricing) {
      const guestCount = watch("guestCount") || 0;
      
      Object.keys(items).forEach(itemId => {
        const item = items[itemId];
        if (item && item.price) {
          categoryTotal += item.price * guestCount;
        }
      });
    } 
    // For item-based pricing (standard options)
    else {
      Object.keys(items).forEach(itemId => {
        const item = items[itemId];
        if (item && item.quantity && item.price) {
          categoryTotal += item.price * item.quantity;
        }
      });
    }
    
    return categoryTotal;
  };
  
  // Count all selected items in a category
  const getCategorySelectionCount = (categoryId: string): number => {
    if (!horsDoeurvesSelections?.categories?.[categoryId]?.items) {
      return 0;
    }
    
    return Object.keys(horsDoeurvesSelections.categories[categoryId].items).length;
  };
  
  // Calculate total for all hors d'oeuvres
  const calculateHorsDoeurvesTotal = (): number => {
    if (!horsDoeurvesSelections || !horsDoeurvesSelections.categories) {
      return 0;
    }
    
    let total = 0;
    
    // Calculate total for each category
    Object.keys(horsDoeurvesSelections.categories).forEach(categoryId => {
      total += calculateCategoryTotal(categoryId);
    });
    
    // Add passed service surcharge if applicable
    if (horsDoeurvesSelections.serviceStyle === "passed") {
      const guestCount = watch("guestCount") || 0;
      total += 5 * guestCount; // $5 per guest surcharge
    }
    
    return total;
  };
  
  // Handle appetizer quantity change
  const handleQuantityChange = (categoryId: string, itemId: string, itemName: string, quantity: number) => {
    // Make sure the category exists
    if (!appetizers[categoryId]) {
      setValue(`appetizers.${categoryId}`, []);
    }
    
    // Find if the item already exists
    const existingItems = appetizers[categoryId] || [];
    const existingItemIndex = existingItems.findIndex(item => item.name === itemName);
    
    if (quantity === 0) {
      // Remove item if quantity is 0
      if (existingItemIndex !== -1) {
        const newItems = [...existingItems];
        newItems.splice(existingItemIndex, 1);
        setValue(`appetizers.${categoryId}`, newItems);
      }
    } else {
      // Update or add item
      if (existingItemIndex !== -1) {
        // Update existing item
        const newItems = [...existingItems];
        newItems[existingItemIndex] = { name: itemName, quantity };
        setValue(`appetizers.${categoryId}`, newItems);
      } else {
        // Add new item
        setValue(`appetizers.${categoryId}`, [...existingItems, { name: itemName, quantity }]);
      }
    }
  };
  
  // Get quantity for an item
  const getItemQuantity = (categoryId: string, itemName: string): number => {
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) {
      return 0;
    }
    
    const item = appetizers[categoryId].find(item => item && item.name === itemName);
    return item ? item.quantity : 0;
  };
  
  // Handle spread selection
  const handleSpreadSelection = (itemId: string, itemName: string, isSelected: boolean) => {
    const categoryId = "spreads";
    initializeCategory(categoryId);
    
    const spreadsCategory = appetizerData.categories.find(cat => cat.id === categoryId);
    if (!spreadsCategory) return;
    
    const existingItems = appetizers[categoryId] || [];
    const existingItemIndex = existingItems.findIndex(item => item.name === itemName);
    
    if (isSelected) {
      // Check if we're at the selection limit
      if (existingItems.length >= spreadsCategory.selectLimit && existingItemIndex === -1) {
        return; // At limit, don't add
      }
      
      // Add item with default quantity of 1 (will be updated later with serving size)
      if (existingItemIndex === -1) {
        setValue(`appetizers.${categoryId}`, [...existingItems, { name: itemName, quantity: 1 }]);
      }
    } else {
      // Remove item
      if (existingItemIndex !== -1) {
        const newItems = [...existingItems];
        newItems.splice(existingItemIndex, 1);
        setValue(`appetizers.${categoryId}`, newItems);
      }
    }
  };
  
  // Handle spread serving size change
  const handleSpreadServingSizeChange = (servingSize: number) => {
    const categoryId = "spreads";
    const existingItems = appetizers[categoryId] || [];
    
    // Update quantity for all selected spreads
    const updatedItems = existingItems.map(item => ({
      ...item,
      quantity: servingSize
    }));
    
    setValue(`appetizers.${categoryId}`, updatedItems);
  };
  
  // Check if a spread is selected
  const isSpreadSelected = (itemName: string): boolean => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) return false;
    
    return appetizers[categoryId].some(item => item && item.name === itemName);
  };
  
  // Count selected spreads
  const getSelectedSpreadsCount = (): number => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId])) return 0;
    
    return appetizers[categoryId].length;
  };
  
  // Get the spreads serving size
  const getSpreadsServingSize = (): number => {
    const categoryId = "spreads";
    if (!appetizers || !appetizers[categoryId] || !Array.isArray(appetizers[categoryId]) || appetizers[categoryId].length === 0) {
      return 24; // Default to first serving size
    }
    
    // All spreads have the same quantity/serving size
    return appetizers[categoryId][0].quantity || 24;
  };
  
  // Check if spreads selection limit is reached
  const isSpreadsLimitReached = (): boolean => {
    const categoryId = "spreads";
    const spreadsCategory = appetizerData.categories.find(cat => cat.id === categoryId);
    if (!spreadsCategory) return false;
    
    const selectedCount = getSelectedSpreadsCount();
    return selectedCount >= (spreadsCategory.selectLimit || 3);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Hors d'oeuvres</h2>
        <p className="text-lg text-gray-600">
          Select appetizers to enhance your event
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* General Notes and Instructions */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-lg font-medium mb-2">General Notes for Hors d'oeuvres:</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>When selecting a service style, there is a minimum $5.00 per guest surcharge for "Passed" service, depending on the number of guests and service duration.</li>
            <li>Items are offered in specific lot sizes as indicated for each category.</li>
            <li>Click the radio buttons to select the quantity for each item you want.</li>
          </ul>
        </div>
        
        {/* Service Style Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Service Style</h3>
          
          <RadioGroup 
            value={horsDoeurvesSelections?.serviceStyle || "stationary"} 
            onValueChange={handleHorsDoeurvesServiceStyleChange}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stationary" id="stationary-buffet" />
              <Label htmlFor="stationary-buffet">Stationary buffet</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passed" id="passed-service" />
              <Label htmlFor="passed-service">Passed by Servers</Label>
            </div>
          </RadioGroup>
          
          {horsDoeurvesSelections?.serviceStyle === "passed" && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> Passed service includes a minimum $5.00 per guest surcharge for additional service staff.
              </p>
            </div>
          )}
        </div>
        
        {/* Matrix Selection for Hors d'oeuvres */}
        <div className="space-y-12">
          {horsDoeurvesData.categories.map((category) => {
            // Special handling for spreads which uses a different UI
            if (category.id === "spreads") {
              // Calculate selectedCount at a higher scope level to fix the scoping issue
              const currentSpreadsCategorySelections = horsDoeurvesSelections?.categories?.[category.id]?.items;
              const selectedCountForSpreads = currentSpreadsCategorySelections ? 
                Object.keys(currentSpreadsCategorySelections).length : 0;
                
              return (
                <div key={category.id} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.description}</p>
                      <p className="text-sm text-gray-500 mt-1">Select up to {category.selectLimit} options ({selectedCountForSpreads} selected)</p>
                    </div>
                    {category.basePrice && (
                      <div className="text-lg font-medium">${category.basePrice.toFixed(2)} <span className="text-sm text-gray-500">per person</span></div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {category.items.map((item) => {
                      const isSelected = currentSpreadsCategorySelections?.[item.id] !== undefined;
                      const isAtLimit = selectedCountForSpreads >= (category.selectLimit || 3) && !isSelected;
                      
                      return (
                        <div key={item.id} className="relative">
                          <label className={`
                            flex items-center p-3 border rounded-md cursor-pointer
                            ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}
                            ${isAtLimit ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
                          `}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked === "indeterminate") return;
                                if (checked) {
                                  if (selectedCountForSpreads < (category.selectLimit || 3)) {
                                    handleHorsDoeurvesItemSelection(category.id, item.id, category.servingSizes?.[0] || 24);
                                  }
                                } else {
                                  handleHorsDoeurvesItemSelection(category.id, item.id, null);
                                }
                              }}
                              disabled={isAtLimit}
                              className="mr-3"
                            />
                            <div className="font-medium">{item.name}</div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Serving Size Selection for spreads */}
                  {selectedCountForSpreads > 0 && category.servingSizes && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-md">
                      <h4 className="font-medium mb-2">Select serving size:</h4>
                      <RadioGroup 
                        value={String(
                          currentSpreadsCategorySelections?.[
                            Object.keys(currentSpreadsCategorySelections || {})[0]
                          ]?.quantity || category.servingSizes[0]
                        )} 
                        onValueChange={(value) => {
                          const quantity = Number(value);
                          // Update all selected items with the same quantity
                          if (currentSpreadsCategorySelections) {
                            Object.keys(currentSpreadsCategorySelections).forEach(itemId => {
                              handleHorsDoeurvesItemSelection(category.id, itemId, quantity);
                            });
                          }
                        }}
                        className="flex flex-wrap gap-4"
                      >
                        {category.servingSizes.map((size) => (
                          <div key={size} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(size)} id={`serving-${category.id}-${size}`} />
                            <Label htmlFor={`serving-${category.id}-${size}`}>{size} servings</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            }
            
            // Matrix-style selection for other hors d'oeuvres categories
            return (
              <div key={category.id} className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
                
                {/* Card-Based Item Selection with Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <Card key={item.id} className="mb-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>
                          ${item.price.toFixed(2)} each. {category.description || `Offered in lots of ${category.lotSizes.join(', ')}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`quantity-${category.id}-${item.id}`} className="text-base">Quantity:</Label>
                          <Controller
                            name={`horsDoeurvesSelections.categories.${category.id}.items.${item.id}.quantity`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                onValueChange={(value) => {
                                  const newQuantity = value === "0" ? null : parseInt(value, 10);
                                  handleHorsDoeurvesItemSelection(category.id, item.id, newQuantity);
                                }}
                                value={getSelectedQuantity(category.id, item.id)?.toString() || "0"}
                              >
                                <SelectTrigger className="w-[150px]" id={`quantity-${category.id}-${item.id}`}>
                                  <SelectValue placeholder="Select quantity" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">None</SelectItem>
                                  {category.lotSizes.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        
                        {/* Display item total dynamically */}
                        {getSelectedQuantity(category.id, item.id) && (
                          <div className="mt-3 text-sm font-semibold text-right">
                            Item Total: $
                            {(
                              item.price * getSelectedQuantity(category.id, item.id)
                            ).toFixed(2)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Display total for this category */}
                {horsDoeurvesSelections?.categories?.[category.id]?.items && 
                 Object.keys(horsDoeurvesSelections.categories[category.id].items).length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                      <span className="font-medium">
                        Category Total: ${calculateCategoryTotal(category.id).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Total for all selections */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Total for Hors d'oeuvres</h3>
              <div className="text-xl font-bold text-primary">
                ${calculateHorsDoeurvesTotal().toFixed(2)}
              </div>
            </div>
            
            {horsDoeurvesSelections?.serviceStyle === "passed" && (
              <div className="mt-2 text-sm text-gray-600">
                Includes ${(5 * (watch("guestCount") || 0)).toFixed(2)} service charge for passed service
              </div>
            )}
          </div>
        </div>
        
        {/* Traditional Appetizers Section Header */}
        <div className="mt-12 mb-6 border-t pt-8">
          <h3 className="text-xl font-semibold mb-2">Traditional Appetizers</h3>
          <p className="text-gray-600">You can also select from our traditional appetizer options below:</p>
        </div>
        
        {/* Traditional Appetizer Categories */}
        <div className="space-y-10">
          {appetizerData.categories.map((category) => {
            // Special handling for spreads
            if (category.id === "spreads") {
              return (
                <div key={category.id} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.note} ({getSelectedSpreadsCount()} of {category.selectLimit} selected)</p>
                    </div>
                    <div className="text-lg font-medium">${category.basePrice.toFixed(2)} <span className="text-sm text-gray-500">per person</span></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="relative">
                        <label className={`
                          flex items-center p-3 border rounded-md cursor-pointer
                          ${isSpreadSelected(item.name) ? 'border-primary bg-primary/5' : 'border-gray-200'}
                          ${(!isSpreadSelected(item.name) && isSpreadsLimitReached()) ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
                        `}>
                          <Checkbox
                            checked={isSpreadSelected(item.name)}
                            onCheckedChange={(checked) => {
                              if (checked === "indeterminate") return;
                              handleSpreadSelection(item.id, item.name, !!checked);
                            }}
                            disabled={!isSpreadSelected(item.name) && isSpreadsLimitReached()}
                            className="mr-3"
                          />
                          <div className="font-medium">{item.name}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  {/* Serving Size Selection - only show if some spreads are selected */}
                  {getSelectedSpreadsCount() > 0 && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-md">
                      <h4 className="font-medium mb-2">Select serving size:</h4>
                      <RadioGroup 
                        value={String(getSpreadsServingSize())} 
                        onValueChange={(value) => handleSpreadServingSizeChange(Number(value))}
                        className="flex flex-wrap gap-4"
                      >
                        {category.servingSizes.map((size) => (
                          <div key={size} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(size)} id={`serving-${size}`} />
                            <Label htmlFor={`serving-${size}`}>{size} servings</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              );
            }
            
            // Regular appetizer categories
            return (
              <div key={category.id} className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.note}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {category.items.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-md">
                      <div className="mb-2 md:mb-0">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">${item.price.toFixed(2)} each</div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Label htmlFor={`qty-${category.id}-${item.id}`} className="text-sm whitespace-nowrap">
                          Quantity:
                        </Label>
                        
                        <Select
                          defaultValue="0"
                          value={String(getItemQuantity(category.id, item.name) || 0)}
                          onValueChange={(value) => handleQuantityChange(category.id, item.id, item.name, Number(value))}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Qty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            {category.lotSizes?.map((size) => (
                              <SelectItem key={size} value={String(size)}>
                                {size}
                              </SelectItem>
                            )) || (
                              <SelectItem value="24">24</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        
                        {getItemQuantity(category.id, item.name) > 0 && (
                          <div className="text-sm font-medium">
                            Total: ${(item.price * getItemQuantity(category.id, item.name)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Step 4: Menu Selection Component
const MenuSelectionStep = ({ 
  selectedTheme,
  guestCount,
  onPrevious,
  onNext 
}: { 
  selectedTheme: string;
  guestCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  // Add missing import
  const { useState, useEffect } = React;
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();
  const [selectedActualCategory, setSelectedActualCategory] = useState<string | null>(null);
  
  // Watch the selected packages (theme-specific)
  const selectedPackages = watch("selectedPackages") || {};
  const selectedPackage = selectedPackages[selectedTheme];
  const menuSelections = watch("menuSelections");
  
  // Initialize selectedPackages if it doesn't exist
  useEffect(() => {
    if (!selectedPackages) {
      setValue("selectedPackages", {});
    }
  }, [selectedPackages, setValue]);
  
  // Set hors d'oeuvres as the theme if no other theme is selected
  useEffect(() => {
    if (!selectedTheme || selectedTheme === "") {
      setValue("requestedTheme", "hors_doeuvres");
    }
  }, [selectedTheme, setValue]);
  
  // Display available menu themes for selection - define outside useEffect
  const handleThemeSelection = (theme: string) => {
    setValue("requestedTheme", theme);
  };
  
  // Get the theme menu data if theme is selected
  const themeData = selectedTheme ? themeMenuData[selectedTheme as keyof typeof themeMenuData] : null;
  
  // Show available menu themes instead of error message
  if (!themeData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Menu Selection</h2>
          <p className="text-2xl font-semibold text-primary mb-4">
            What would you like a quote for?
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Object.keys(themeMenuData).map((themeKey) => (
            <Card 
              key={themeKey}
              className={`
                overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
                ${selectedTheme === themeKey ? 'ring-4 ring-primary ring-offset-2' : ''}
              `}
              onClick={() => handleThemeSelection(themeKey)}
            >
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-2">{themeMenuData[themeKey as keyof typeof themeMenuData].title}</h3>
                <p className="text-gray-600 mb-4">{themeMenuData[themeKey as keyof typeof themeMenuData].description}</p>
                <div className="flex justify-end">
                  <Button 
                    variant={selectedTheme === themeKey ? "default" : "outline"}
                    size="sm"
                  >
                    {selectedTheme === themeKey ? "Selected" : "Select This Menu"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-between mt-8">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    );
  }
  
  // Get category selection limits based on the selected package
  const getCategoryLimits = (categoryKey: string) => {
    if (!selectedPackage || !themeData.categories[categoryKey as keyof typeof themeData.categories]) {
      return 0;
    }
    
    const category = themeData.categories[categoryKey as keyof typeof themeData.categories];
    return category.limits?.[selectedPackage as keyof typeof category.limits] || 0;
  };
  
  // Check if a category is available for the selected package
  const isCategoryAvailable = (categoryKey: string) => {
    return getCategoryLimits(categoryKey) > 0;
  };
  
  // Get quantity for an item in the menu selections
  const getItemQuantity = (categoryKey: string, itemId: string): number => {
    if (!menuSelections || !menuSelections[categoryKey]) {
      return 0;
    }
    
    const selectedItems = menuSelections[categoryKey];
    const item = selectedItems.find(item => item.id === itemId);
    return item ? (item.quantity || 1) : 0;
  };
  
  // Count selected items in a category
  const getSelectedCount = (categoryKey: string) => {
    if (!menuSelections || !menuSelections[categoryKey]) {
      return 0;
    }
    return Array.isArray(menuSelections[categoryKey]) 
      ? menuSelections[categoryKey].length 
      : 0;
  };
  
  // Check if selection limit is reached for a category
  const isSelectionLimitReached = (categoryKey: string) => {
    const limit = getCategoryLimits(categoryKey);
    const count = getSelectedCount(categoryKey);
    return count >= limit;
  };
  
  // Handle selection of an item in a category
  const handleItemSelection = (categoryKey: string, itemId: string, isSelected: boolean, quantity: number = 1) => {
    // Make sure menuSelections[categoryKey] is initialized as an array
    const currentSelections = Array.isArray(menuSelections?.[categoryKey]) 
      ? [...menuSelections[categoryKey]] 
      : [];
    
    // Find if item already exists
    const existingItemIndex = currentSelections.findIndex(item => 
      typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
    );
    
    if (isSelected) {
      if (existingItemIndex >= 0) {
        // Update existing item with new quantity
        currentSelections[existingItemIndex] = {
          ...currentSelections[existingItemIndex],
          id: itemId,
          quantity: quantity
        };
      } else {
        // Add new item if not at limit
        if (!isSelectionLimitReached(categoryKey)) {
          currentSelections.push({ id: itemId, quantity: quantity });
        }
      }
    } else {
      // Remove item
      if (existingItemIndex >= 0) {
        currentSelections.splice(existingItemIndex, 1);
      }
    }
    
    setValue(`menuSelections.${categoryKey}`, currentSelections);
  };
  
  // Removed duplicate useEffect
  
  // Check if an item is selected
  const isItemSelected = (categoryKey: string, itemId: string) => {
    if (!menuSelections || !menuSelections[categoryKey]) {
      return false;
    }
    
    const selectedItems = menuSelections[categoryKey];
    return selectedItems.some(item => 
      typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
    );
  };
  
  // Handle Custom Menu selection differently
  if (selectedTheme === "custom_menu") {
    // We've moved the selectedActualCategory useState to the top of the component
    
    const handleActualCategorySelect = (categoryKey: string) => {
      setSelectedActualCategory(categoryKey);
    };
    
    const handleCustomItemSelection = (categoryKey: string, itemId: string, isSelected: boolean) => {
      // Initialize array if it doesn't exist
      const currentSelections = Array.isArray(menuSelections?.[categoryKey]) 
        ? [...menuSelections[categoryKey]] 
        : [];
      
      if (isSelected) {
        // Check if item already exists
        const existingItemIndex = currentSelections.findIndex(item => 
          typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
        );
        
        if (existingItemIndex === -1) {
          // Add new item
          currentSelections.push({ id: itemId, quantity: 1 });
        }
      } else {
        // Remove item
        const existingItemIndex = currentSelections.findIndex(item => 
          typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
        );
        
        if (existingItemIndex >= 0) {
          currentSelections.splice(existingItemIndex, 1);
        }
      }
      
      setValue(`menuSelections.${categoryKey}`, currentSelections);
    };
    
    const isCustomItemSelected = (categoryKey: string, itemId: string) => {
      if (!menuSelections || !menuSelections[categoryKey]) {
        return false;
      }
      
      const selectedItems = menuSelections[categoryKey];
      return selectedItems.some(item => 
        typeof item === 'object' && item !== null && 'id' in item && item.id === itemId
      );
    };
    
    // Get the theme data for custom_menu
    const customMenuData = themeMenuData.custom_menu;
    
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-gray-900">{customMenuData.title}</h2>
          <p className="text-2xl font-semibold text-primary mb-4">
            What would you like a quote for?
          </p>
          <p className="text-lg text-gray-600">{customMenuData.description}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Main Category Selection */}
          {!selectedActualCategory ? (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Select a Cuisine Category</h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose which cuisine style you'd like to select from first. You can add more items from different categories later.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {Object.keys(customMenuData.categories).map((categoryKey) => {
                  const categoryDetails = customMenuData.categories[categoryKey];
                  if (!categoryDetails) return null; // Should not happen if data is well-formed
                  return (
                    <div
                      key={categoryKey}
                      className="border rounded-md p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => handleActualCategorySelect(categoryKey)}
                    >
                      <h4 className="text-lg font-medium mb-2">{categoryDetails.title}</h4>
                      <p className="text-sm text-gray-600">{categoryDetails.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // STAGE 2: Display items for the selectedActualCategory
            <div>
              <div className="flex items-center mb-6">
                <button
                  className="text-primary hover:underline flex items-center mr-2"
                  onClick={() => setSelectedActualCategory(null)} // Go back to category list
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back to Categories
                </button>
                <span className="text-gray-500">→</span>
                <span className="ml-2 font-medium">
                  {customMenuData.categories[selectedActualCategory]?.title}
                </span>
              </div>

              <h3 className="text-xl font-semibold mb-4">
                {customMenuData.categories[selectedActualCategory]?.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {customMenuData.categories[selectedActualCategory]?.description}
              </p>

              <div className="grid grid-cols-1 gap-3 mt-4">
                {customMenuData.categories[selectedActualCategory]?.items?.map((item) => {
                  if (!item) return null;
                  const isSelected = isCustomItemSelected(selectedActualCategory, item.id);
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-md p-3 cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-primary/30'
                      }`}
                      onClick={() => handleCustomItemSelection(selectedActualCategory, item.id, !isSelected)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.upcharge > 0 ? (
                            <span className="text-amber-600 text-sm ml-2">
                              (+${item.upcharge.toFixed(2)} upcharge per person)
                            </span>
                          ) : null}
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-primary text-white' : 'border border-gray-300'
                        }`}>
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Summary of all selected items */}
              <div className="mb-8 p-4 bg-gray-50 rounded-md">
                <h4 className="text-md font-semibold mb-2">Your Selections</h4>
                <div className="space-y-2">
                  {Object.keys(menuSelections || {}).map(categoryKey => {
                    const categoryItems = menuSelections[categoryKey];
                    if (!Array.isArray(categoryItems) || categoryItems.length === 0) return null;
                    
                    // Find category name for display
                    const categoryName = customMenuData.categories[categoryKey]?.title || categoryKey;
                    
                    return (
                      <div key={categoryKey} className="pl-2 border-l-2 border-primary/30">
                        <h5 className="font-medium text-sm">{categoryName}:</h5>
                        <ul className="list-disc list-inside ml-2">
                          {categoryItems.map(item => {
                            if (typeof item !== 'object' || !item || !('id' in item)) return null;
                            // Find the item name from the menu data
                            const menuItem = customMenuData.categories[categoryKey]?.items.find(
                              menuItem => menuItem.id === item.id
                            );
                            return (
                              <li key={item.id} className="text-sm text-gray-600">
                                {menuItem?.name || item.id}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                  
                  {/* Show message if nothing selected */}
                  {Object.keys(menuSelections || {}).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No items selected yet</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 p-4 bg-gray-50 rounded-md">
                <span className="text-sm">
                  Current category selections: {
                    Object.keys(menuSelections || {})
                      .filter(key => selectedActualCategory && key === selectedActualCategory)
                      .reduce((total, key) => {
                        const selections = menuSelections[key];
                        return total + (Array.isArray(selections) ? selections.length : 0);
                      }, 0)
                  }
                </span>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedActualCategory(null)}
                >
                  Choose Another Category
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            className="flex items-center"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          <Button 
            type="button" 
            onClick={onNext}
            className="flex items-center"
          >
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }
  
  // For other menu themes, use the original implementation
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">{themeData.title}</h2>
        <p className="text-2xl font-semibold text-primary mb-4">
          What would you like a quote for?
        </p>
        <p className="text-lg text-gray-600">
          Select your preferred package and menu items
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Package Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Select a Package</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {themeData.packages && themeData.packages.map((pkg) => (
              <div key={pkg.id}>
                {pkg.minGuestCount > 0 && guestCount < pkg.minGuestCount ? (
                  // Disabled package with warning
                  <div className="border border-gray-200 rounded-md p-4 opacity-60 cursor-not-allowed">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-medium text-gray-500">{pkg.name}</h4>
                      <span className="text-lg font-semibold text-gray-500">${pkg.price} / person</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{pkg.description}</p>
                    <div className="flex items-center text-amber-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">
                        Minimum {pkg.minGuestCount} guests required for this package
                      </span>
                    </div>
                  </div>
                ) : (
                  // Active package
                  <div 
                    className={`border rounded-md p-4 cursor-pointer transition-all duration-200 ${
                      selectedPackage === pkg.id 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                    onClick={() => setValue(`selectedPackages.${selectedTheme}`, pkg.id)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-medium">{pkg.name}</h4>
                      <span className="text-lg font-semibold">${pkg.price} / person</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                    <div className="flex justify-end">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        selectedPackage === pkg.id 
                          ? 'bg-primary text-white' 
                          : 'border border-gray-300'
                      }`}>
                        {selectedPackage === pkg.id && <Check className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Food Categories - Only show if a package is selected */}
        {selectedPackage && (
          <div className="space-y-8">
            {/* Map through available categories */}
            {Object.entries(themeData.categories).map(([categoryKey, category]) => {
              // Skip categories not available for this package
              if (!isCategoryAvailable(categoryKey)) return null;
              
              const selectionLimit = getCategoryLimits(categoryKey);
              const selectedCount = getSelectedCount(categoryKey);
              
              return (
                <div key={categoryKey} className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{category.title}</h3>
                    <div className="text-sm font-medium px-3 py-1 bg-gray-100 rounded-full">
                      {selectedCount} of {selectionLimit} selected
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.items.map((item) => {
                      // Special handling for add-ons with quantity input in Sandwich Factory
                      if (categoryKey === 'add_ons' && 'quantityInput' in themeData && themeData.quantityInput) {
                        return (
                          <div key={item.id} className="relative">
                            <div className="p-3 border rounded-md border-gray-200 hover:border-primary/50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium">{item.name}</div>
                              </div>
                              <div className="flex items-center mt-2">
                                <Label htmlFor={`qty-${categoryKey}-${item.id}`} className="text-sm mr-2">
                                  Amount:
                                </Label>
                                <Input
                                  id={`qty-${categoryKey}-${item.id}`}
                                  type="number"
                                  min="0"
                                  className="w-20 text-right"
                                  value={getItemQuantity(categoryKey, item.id) || ""}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    if (value > 0) {
                                      handleItemSelection(categoryKey, item.id, true, value);
                                    } else {
                                      handleItemSelection(categoryKey, item.id, false);
                                    }
                                  }}
                                />
                                {item.upcharge > 0 && getItemQuantity(categoryKey, item.id) > 0 && (
                                  <div className="ml-4 text-sm font-medium">
                                    Total: ${(item.upcharge * getItemQuantity(categoryKey, item.id)).toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Regular checkbox selections for other categories
                        return (
                          <div key={item.id} className="relative">
                            <label className={`
                              flex items-center justify-between p-3 border rounded-md
                              ${isItemSelected(categoryKey, item.id) ? 'border-primary bg-primary/5' : 'border-gray-200'}
                              ${(!isItemSelected(categoryKey, item.id) && isSelectionLimitReached(categoryKey)) 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'cursor-pointer hover:border-primary/50'}
                            `}>
                              <div className="flex items-start">
                                <Checkbox
                                  checked={isItemSelected(categoryKey, item.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked === "indeterminate") return;
                                    handleItemSelection(categoryKey, item.id, !!checked);
                                  }}
                                  disabled={!isItemSelected(categoryKey, item.id) && isSelectionLimitReached(categoryKey)}
                                  className="mr-3 mt-0.5"
                                />
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  {item.upcharge > 0 && (
                                    <div className="text-sm text-amber-600">+${item.upcharge.toFixed(2)} per person</div>
                                  )}
                                </div>
                              </div>
                            </label>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {!selectedPackage && (
          <div className="text-center p-8 bg-gray-50 rounded-md">
            <p className="text-gray-500">Please select a package above to view food options.</p>
          </div>
        )}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Main component
// Using validateEventType imported from event-types.tsx

// Using imported mapUrlToEventType from event-types.tsx

export default function ExperimentalInquiryForm({ initialEventType = "" }: { initialEventType?: string }) {
  // For navigation after event type selection
  const navigate = (path: string) => {
    window.location.href = path;
  };

  // Map the URL parameter to a valid event type
  const mappedEventType = initialEventType ? mapUrlToEventType(initialEventType) : null;
  
  // If we're at the landing page without an event type, only show event type selection
  if (!initialEventType && !mappedEventType) {
    return (
      <>
        <Helmet>
          <title>EXPERIMENTAL - Event Inquiry | Home Bites Catering Services</title>
          <meta name="description" content="Experimental version - Select your event type and get a personalized catering quote. We offer services for weddings, corporate events, birthdays, and more special occasions." />
        </Helmet>
        
        <div className="min-h-screen bg-gray-50 pb-12">
          <div className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-6 mb-8">
            <div className="container mx-auto">
              <h1 className="text-5xl font-extrabold mb-4 text-center">Home Bites Catering Services</h1>
              <p className="text-xl text-center max-w-2xl mx-auto">
                <span className="bg-white/20 px-2 py-1 rounded">EXPERIMENTAL VERSION</span> - Exceptional cuisine for extraordinary moments
              </p>
            </div>
          </div>
          
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight mb-3 text-gray-900">
                Let's Plan Your Perfect Event
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Select the type of event you're planning, and we'll customize our services to match your vision.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {eventTypes.map((event) => (
                <Card 
                  key={event.type}
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                  onClick={() => navigate(`/experimental-inquiry/${event.type.toLowerCase().replace(/ /g, '-')}`)}
                >
                  <div className={`bg-gradient-to-r ${event.gradient} p-8 text-white text-center`}>
                    {event.icon}
                    <h3 className="text-2xl font-bold mb-1">{event.type}</h3>
                  </div>
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-lg mb-4">{event.description}</p>
                    <Button 
                      className="w-full mt-2 py-6 text-lg transition-all duration-300"
                      variant="outline"
                      size="lg"
                    >
                      Select This Event
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // If we have an event type, continue with the full form
  const methods = useForm<EventInquiryFormData>({
    defaultValues: {
      eventType: mappedEventType,
      billingAddress: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
      },
      contactName: {
        firstName: "",
        lastName: "",
      },
      email: "",
      phone: "",
      eventDate: "",
      hasPromoCode: false,
      venueSecured: false,
      hasCocktailHour: false,
      hasMainCourse: true,
      guestCount: 50,
      serviceStyle: "",
      requestedTheme: "",
      selectedPackages: {}, // Theme-specific package selections
      menuSelections: {
        proteins: [],
        sides: [],
        salads: [],
        salsas: [],
        desserts: [],
        addons: []
      },
      wantsAppetizers: true,
      // Initialize with empty arrays for each category
      appetizers: {
        tea_sandwiches: [],
        shooters: [],
        canapes: [],
        spreads: []
      },
      appetizerService: "stationary", // Default service style
      // Initialize horsDoeurvesSelections with empty structure
      horsDoeurvesSelections: {
        serviceStyle: "stationary",
        categories: {}
      },
      dietaryRestrictions: {
        vegetarian: false,
        vegan: false,
        gluten_free: false,
        dairy_free: false,
        nut_free: false,
        shellfish_allergy: false,
        kosher: false,
        halal: false
      },
      dietaryCount: {
        vegetarian: 0,
        vegan: 0,
        gluten_free: 0,
        dairy_free: 0,
        nut_free: 0,
        shellfish_allergy: 0,
        kosher: 0,
        halal: 0
      },
      dietaryNotes: "",
      dessertSelections: {},
      servingAlcohol: [],
      additionalCocktails: false,
      barEquipment: {},
      nonAlcoholicBeverages: {},
      tableWaterService: false,
      equipment: {
        furniture: {},
        linens: {},
        servingWare: {}
      }
    }
  });
  
  // Get form state
  const { watch, setValue } = methods;
  const eventType = watch("eventType");
  const requestedTheme = watch("requestedTheme");
  const guestCount = watch("guestCount");
  
  // State for tracking the current step
  // If a valid event type was mapped from the URL, start at the basicInfo step
  const [currentStep, setCurrentStep] = useState<FormStep>(
    mappedEventType ? "basicInfo" : "eventType"
  );
  
  // Calculate step number and total steps
  const steps: FormStep[] = [
    "eventType", 
    "basicInfo", 
    "eventDetails", 
    "menuSelection", // Keep menuSelection as step 4 (for regular themes)
    "appetizerQuestion", // New step to ask if user wants appetizers
    "appetizers",    // Only show if user wants appetizers
    "foodTruckMenu", // Food Truck menu step (will be conditionally shown)
    "sandwichFactoryMenu", // Sandwich Factory menu step (will be conditionally shown)
    "breakfastMenu", // Breakfast/Brunch menu step (will be conditionally shown)
    "dessertQuestion", // Ask if user wants desserts
    "desserts",      // Only show if user wants desserts
    "beverages",
    "equipment",
    "dietaryRestrictions", // Added new step for dietary restrictions
    "review"
  ];
  
  const currentStepNumber = steps.indexOf(currentStep) + 1;
  const totalSteps = steps.length;
  
  // Handler for event type selection
  const handleEventTypeSelect = (type: EventType) => {
    setValue("eventType", type);
    setCurrentStep("basicInfo");
  };
  
  // Navigation handlers
  const handlePrevious = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1];
      
      // If currently on menuSelection and going back to eventDetails
      if (currentStep === "menuSelection" && previousStep === "eventDetails") {
        setValue("requestedTheme", ""); // Clear the selected theme
        setValue("selectedPackages", {}); // Clear any selected packages
        // Optionally, clear general menuSelections if they shouldn't persist across theme changes
        setValue("menuSelections", {
          proteins: [], sides: [], salads: [], salsas: [], desserts: [], addons: []
        });
      }
      
      setCurrentStep(previousStep);
    }
  };
  
  const handleNext = () => {
    const currentIndex = steps.indexOf(currentStep);
    const currentFormTheme = watch("requestedTheme"); // Get current theme
    const wantsAppetizers = watch("wantsAppetizers"); // Get appetizer preference
    const serviceStyle = watch("serviceStyle"); // Get service style for Food Truck detection
    
    if (currentIndex < steps.length - 1) {
      let nextStep = steps[currentIndex + 1];
      
      // Handle special navigation based on current step and theme selection
      if (currentStep === "eventDetails") {
        console.log("Service style selected:", serviceStyle);
        // If Food Truck is selected as service style, go directly to Food Truck menu
        if (serviceStyle === "food_truck") {
          const foodTruckIndex = steps.indexOf("foodTruckMenu");
          if (foodTruckIndex > -1) {
            nextStep = "foodTruckMenu";
          } else {
            nextStep = "menuSelection";
          }
        } 
        // If Sandwich Factory is selected as service style, go to Sandwich Factory menu
        else if (serviceStyle === "sandwich_factory") {
          setValue("requestedTheme", "sandwich_factory");
          const sandwichFactoryIndex = steps.indexOf("sandwichFactoryMenu");
          if (sandwichFactoryIndex > -1) {
            nextStep = "sandwichFactoryMenu";
          } else {
            nextStep = "menuSelection"; // Fallback if sandwich factory step isn't found
          }
        }
        // If Breakfast/Brunch is selected as service style, go to Breakfast Menu
        else if (serviceStyle === "breakfast_brunch") {
          setValue("requestedTheme", "breakfast_brunch");
          const breakfastMenuIndex = steps.indexOf("breakfastMenu");
          if (breakfastMenuIndex > -1) {
            nextStep = "breakfastMenu";
          } else {
            nextStep = "menuSelection"; // Fallback if breakfast menu step isn't found
          }
        }
        else {
          // For other service styles, go to menuSelection
          nextStep = "menuSelection";
        }
      } else if (currentStep === "menuSelection") {
        // If hors_doeuvres is selected, skip appetizerQuestion and go directly to appetizers
        if (currentFormTheme === "hors_doeuvres") {
          // Find the index of appetizers step
          const appetizersIndex = steps.indexOf("appetizers");
          if (appetizersIndex > -1) {
            nextStep = "appetizers";
          }
        }
        // For all other themes, proceed normally to appetizerQuestion
      } else if (currentStep === "appetizerQuestion") {
        // Check if this is Cocktail - Appetizers Only service type
        if (serviceStyle === "cocktail_party") {
          // Always go to appetizers for Cocktail - Appetizers Only service type
          const appetizersIndex = steps.indexOf("appetizers");
          if (appetizersIndex > -1) {
            nextStep = "appetizers";
          }
        } else if (!wantsAppetizers) {
          // Skip the appetizers step if user doesn't want appetizers (for other service types)
          
          // If Food Truck is selected, go to the Food Truck menu step
          if (serviceStyle === "food_truck") {
            const foodTruckIndex = steps.indexOf("foodTruckMenu");
            if (foodTruckIndex > -1) {
              nextStep = "foodTruckMenu";
            }
          } else {
            // For other service styles, go directly to desserts
            const dessertsIndex = steps.indexOf("desserts");
            if (dessertsIndex > -1) {
              nextStep = "desserts";
            }
          }
        }
      } else if (currentStep === "appetizers") {
        // After appetizers, check if Food Truck menu should be shown
        if (serviceStyle === "food_truck") {
          const foodTruckIndex = steps.indexOf("foodTruckMenu");
          if (foodTruckIndex > -1) {
            nextStep = "foodTruckMenu";
          }
        }
      } else if (currentStep === "sandwichFactoryMenu" || currentStep === "foodTruckMenu") {
        // After Sandwich Factory or Food Truck menu, go to dessert question
        const dessertQuestionIndex = steps.indexOf("dessertQuestion");
        if (dessertQuestionIndex > -1) {
          nextStep = "dessertQuestion";
        }
      } else if (currentStep === "dessertQuestion") {
        // Check if user wants desserts
        const wantsDesserts = watch("wantsDesserts");
        
        if (wantsDesserts) {
          // If user wants desserts, go to desserts step
          const dessertsIndex = steps.indexOf("desserts");
          if (dessertsIndex > -1) {
            nextStep = "desserts";
          }
        } else {
          // If user doesn't want desserts, skip to beverages step
          const beveragesIndex = steps.indexOf("beverages");
          if (beveragesIndex > -1) {
            nextStep = "beverages";
          }
        }
      }
      
      setCurrentStep(nextStep);
    }
  };
  
  return (
    <>
      <Helmet>
        <title>EXPERIMENTAL - Event Inquiry | Home Bites Catering Services</title>
        <meta name="description" content="Experimental version - Tell us about your event and get a personalized catering quote. We offer services for weddings, corporate events, birthdays, and more special occasions." />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 pb-12">
        <PublicFormHeader />
        
        <FormProvider {...methods}>
          <Form {...methods}>
            <form noValidate className="space-y-8">
              {/* Progress bar - only show after event type selection */}
              {currentStep !== "eventType" && (
                <div className="container mx-auto px-4 max-w-3xl">
                  <FormProgressBar 
                    currentStep={currentStepNumber} 
                    totalSteps={totalSteps} 
                  />
                </div>
              )}
              
              {/* Step content */}
              {currentStep === "eventType" && (
                <EventTypeSelectionStep
                  onSelectEventType={handleEventTypeSelect}
                  selectedEventType={eventType}
                />
              )}
              
              {currentStep === "basicInfo" && eventType && (
                <BasicInformationStep
                  eventType={eventType}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "eventDetails" && eventType && (
                <EventDetailsStep
                  eventType={eventType}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "menuSelection" && eventType && (
                <MenuSelectionStep
                  selectedTheme={requestedTheme}
                  guestCount={guestCount}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "appetizerQuestion" && eventType && (
                <AppetizersQuestionStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "appetizers" && eventType && (
                <AppetizersStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "foodTruckMenu" && eventType && (
                <FoodTruckMenu
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onSkipDessert={() => {
                    // If user doesn't want desserts, skip to beverages step
                    const nextStepIndex = steps.indexOf("beverages");
                    setCurrentStep(steps[nextStepIndex]);
                  }}
                />
              )}
              
              {currentStep === "sandwichFactoryMenu" && eventType && (
                <SandwichFactoryMenuStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  guestCount={watch("guestCount") || 0}
                />
              )}
              
              {currentStep === "breakfastMenu" && eventType && (
                <BreakfastMenuStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  guestCount={watch("guestCount") || 0}
                />
              )}
              
              {currentStep === "dessertQuestion" && eventType && (
                <DessertQuestionStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "desserts" && eventType && (
                <DessertsStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {currentStep === "dietaryRestrictions" && eventType && (
                <DietaryRestrictionsStep
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              )}
              
              {/* Additional steps will be rendered here */}
              {/* We've implemented multiple steps of the form */}
              
              {currentStep !== "eventType" && 
               currentStep !== "basicInfo" && 
               currentStep !== "eventDetails" &&
               currentStep !== "menuSelection" &&
               currentStep !== "appetizerQuestion" &&
               currentStep !== "appetizers" &&
               currentStep !== "desserts" &&
               currentStep !== "dietaryRestrictions" && (
                <div className="container mx-auto px-4 max-w-3xl text-center py-12">
                  <h2 className="text-2xl font-bold">Step {currentStepNumber} - {currentStep}</h2>
                  <p className="text-gray-600 mt-4">This step is under construction...</p>
                  
                  <div className="flex justify-between mt-8">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handlePrevious}
                      className="flex items-center"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    
                    <Button 
                      type="button" 
                      onClick={handleNext}
                      className="flex items-center"
                    >
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </FormProvider>
      </div>
    </>
  );
}