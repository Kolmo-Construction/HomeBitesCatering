// client/src/components/form-steps/SandwichFactoryMenuStep.tsx
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { 
  Form, // Assuming 'Form' itself is not used directly, but FormField and its parts are
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"; // These are from shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { EventInquiryFormData } from "@/types/form-types"; // Adjust path as needed
import { sandwichFactoryData } from "@/data/sandwichFactoryData"; // Import the externalized data

const SandwichFactoryMenuStep = ({
  guestCount, // guestCount is passed as a prop but not directly used in the original snippet. Kept for signature.
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

  const [selectedOptions, setSelectedOptions] = useState<{
    meats: string[];
    cheeses: string[];
    vegetables: string[];
    breads: string[];
    spreads: string[];
    salads: string[];
  }>({
    meats: [],
    cheeses: [],
    vegetables: [],
    breads: [],
    spreads: [],
    salads: []
  });

  const packageLimits = selectedPackage ? sandwichFactoryData.limits[selectedPackage as keyof typeof sandwichFactoryData.limits] : null;

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    const currentSelections = watch("sandwichFactorySelections") || {};
    setValue("sandwichFactorySelections", {
      ...currentSelections, // Preserve existing notes or other fields
      package: packageId,
      // Resetting options specific to the package
      meats: [], 
      cheeses: [],
      vegetables: [],
      breads: [],
      spreads: [],
      salads: [] 
      // wantsGlutenFreeBread and glutenFreeBreadCount are handled via FormField, so not reset here unless intended
    });
    setSelectedOptions({ // Reset local state for UI tracking
      meats: [], cheeses: [], vegetables: [], breads: [], spreads: [], salads: []
    });
    setActiveTab("options");
  };

  const handleOptionSelection = (category: keyof typeof selectedOptions, option: string) => {
    setSelectedOptions(prev => {
      const currentCategorySelections = [...prev[category]];
      const index = currentCategorySelections.indexOf(option);
      const limit = packageLimits ?
        (category === 'spreads' ? packageLimits.spreads :
         category === 'salads' ? packageLimits.salads : 0) : 0;

      if (index >= 0) {
        currentCategorySelections.splice(index, 1);
      } else {
        if (limit === 0 || currentCategorySelections.length < limit) {
          currentCategorySelections.push(option);
        }
      }

      // Ensure sandwichFactorySelections exists in the form state before setting a nested property
      const currentFormSandwichSelections = watch("sandwichFactorySelections") || { package: selectedPackage, wantsGlutenFreeBread: false };
      setValue("sandwichFactorySelections", {
        ...currentFormSandwichSelections,
        [category]: currentCategorySelections
      });

      return {
        ...prev,
        [category]: currentCategorySelections
      };
    });
  };

  const getRemainingSelections = (category: keyof typeof selectedOptions) => {
    if (!packageLimits) return 0;
    const limit = category === 'spreads' ? packageLimits.spreads :
                 category === 'salads' ? packageLimits.salads : 0;
    if (limit === 0) return null; // Unlimited
    const currentCount = selectedOptions[category]?.length || 0;
    return limit - currentCount;
  };

  const renderPackageCards = () => (
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

  const renderOptionSelection = (category: keyof typeof selectedOptions, options: string[]) => {
    const remaining = getRemainingSelections(category);
    const currentSelections = selectedOptions[category];
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
                id={`<span class="math-inline">\{category\}\-</span>{option}`}
                checked={currentSelections.includes(option)}
                onCheckedChange={() => handleOptionSelection(category, option)}
                disabled={remaining === 0 && !currentSelections.includes(option)}
              />
              <label
                htmlFor={`<span class="math-inline">\{category\}\-</span>{option}`}
                className={`text-sm ${remaining === 0 && !currentSelections.includes(option) ? 'text-gray-400' : ''}`}
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const isSelectionComplete = () => {
    if (!selectedPackage) return false;
    if (packageLimits) {
      if (packageLimits.spreads > 0 && selectedOptions.spreads.length < packageLimits.spreads) return false;
      if (packageLimits.salads > 0 && selectedOptions.salads.length < packageLimits.salads) return false;
    }
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
                              // Optionally, ensure glutenFreeBreadCount exists when wantsGlutenFreeBread is true
                              if (checked && !watch("sandwichFactorySelections.glutenFreeBreadCount")) {
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
                              value={field.value || ''} // Ensure input is controlled
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the number of gluten-free breads needed
                          </FormDescription>
                          <FormMessage />
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
                            value={field.value || ''} // Ensure textarea is controlled
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

export default SandwichFactoryMenuStep;