// src/pages/wedding/components/WeddingSandwichFactoryMenuStep.tsx
import React, { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  WeddingInquiryFormData,
  SandwichPackageIdType,
  SelectedGlutenFreeDetails,
  // Assuming GlutenFreeOptionIdType is also exported from your types, or handled by SelectedGlutenFreeDetails['id']
} from "../types/weddingFormTypes"; // Ensure this path is correct
import {
  sandwichFactoryDataNew, // Using the new data structure we defined
  // Types below are used for iterating/typing within the component, matching data structure
  // SandwichPackageDefinition,
  // SandwichComponentItem,
  // GlutenFreeOptionDefinition
} from "../data/weddingSandwichFactoryData"; // Ensure this path is correct

// Import UI components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface WeddingSandwichFactoryMenuStepProps {
  onPrevious: () => void;
  onNext: () => void;
  guestCount: number; // Retained as per existing structure, useful for potential cost estimations
}

const WeddingSandwichFactoryMenuStep: React.FC<
  WeddingSandwichFactoryMenuStepProps
> = ({ onPrevious, onNext, guestCount }) => {
  const {
    control,
    watch,
    setValue,
    getValues,
    trigger, // For manually triggering validation
    formState: { errors },
  } = useFormContext<WeddingInquiryFormData>();

  const [currentSubStage, setCurrentSubStage] = useState<
    "packageSelection" | "packageCustomization"
  >("packageSelection");

  const selectedPackageId = watch(
    "sandwichFactorySelections.package"
  ) as SandwichPackageIdType;

  // Initialize selections if not present, aligning with WeddingFormTypes
  useEffect(() => {
    const currentSelections = getValues("sandwichFactorySelections");
    if (!currentSelections?.selectedSpreads) {
      setValue("sandwichFactorySelections.selectedSpreads", []);
    }
    if (!currentSelections?.selectedSalads) {
      setValue("sandwichFactorySelections.selectedSalads", []);
    }
    if (!currentSelections?.glutenFreeOption || !currentSelections?.glutenFreeOption.id) {
      setValue("sandwichFactorySelections.glutenFreeOption", { id: "none", quantity: 0, pricePerPerson: 0 });
    }
    if (currentSelections?.notes === undefined) {
        setValue("sandwichFactorySelections.notes", "");
    }
    if (currentSelections?.package === undefined) {
        setValue("sandwichFactorySelections.package", ""); // Initialize with empty string if no package selected
    }
  }, [setValue, getValues]);


  const selectedPkgDetails = React.useMemo(() => {
    if (!selectedPackageId) return null;
    return sandwichFactoryDataNew.packages.find(
      (p) => p.id === selectedPackageId
    );
  }, [selectedPackageId]);

  const handlePackageChange = (packageId: SandwichPackageIdType | "") => {
    setValue("sandwichFactorySelections.package", packageId);
    // Reset dependent selections when package changes
    setValue("sandwichFactorySelections.selectedSpreads", []);
    setValue("sandwichFactorySelections.selectedSalads", []);
    setValue("sandwichFactorySelections.glutenFreeOption", { id: "none", quantity: 0, pricePerPerson: 0 });
    // Notes are usually kept
  };

  const handleNextSubStage = async () => {
    const packageIsValid = await trigger("sandwichFactorySelections.package");
    if (packageIsValid && selectedPackageId && selectedPackageId !== "") {
      setCurrentSubStage("packageCustomization");
    } else {
      // Ensure error message for package selection is displayed if not already
      if(!getValues("sandwichFactorySelections.package")) {
        setValue("sandwichFactorySelections.package", "", { shouldValidate: true });
      }
    }
  };

  // Component for Stage 1: Package Selection
  const PackageSelectionStage = () => (
    <CardContent className="space-y-6 pt-6">
      <div className="text-center">
        <CardTitle className="text-2xl font-bold text-pink-600">
          Sandwich Factory - Choose a package
        </CardTitle>
        <CardDescription className="mt-2">
          Please select one of our catering packages below. You will be able to
          customize your selections on the next page.
        </CardDescription>
      </div>

      <FormField
        control={control}
        name="sandwichFactorySelections.package"
        rules={{ required: "Please select a package." }}
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormControl>
              <RadioGroup
                onValueChange={(value) => {
                  field.onChange(value as SandwichPackageIdType);
                  handlePackageChange(value as SandwichPackageIdType);
                }}
                value={field.value || ""}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {sandwichFactoryDataNew.packages.map((pkg) => (
                  <FormItem
                    key={pkg.id}
                    className={`flex items-start space-x-3 p-4 border rounded-lg hover:bg-pink-50 transition-colors cursor-pointer ${field.value === pkg.id ? "bg-pink-100 border-pink-400 ring-2 ring-pink-500" : "border-gray-200"}`}
                    onClick={() => {
                        field.onChange(pkg.id);
                        handlePackageChange(pkg.id);
                    }}
                  >
                    <FormControl>
                      <RadioGroupItem value={pkg.id} id={`pkg-${pkg.id}`} />
                    </FormControl>
                    <div className="w-full">
                      <Label
                        htmlFor={`pkg-${pkg.id}`}
                        className="font-semibold text-gray-800 cursor-pointer block text-lg"
                      >
                        {pkg.name}
                      </Label>
                      <p className="text-sm font-medium text-pink-600 my-1">
                        ${pkg.pricePerPerson.toFixed(2)} per person
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pkg.description}
                      </p>
                    </div>
                  </FormItem>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage /> {/* Shows error if no package selected and submit is attempted */}
          </FormItem>
        )}
      />
      <div className="flex justify-between mt-10">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="flex items-center px-6 py-3 text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button
          type="button"
          onClick={handleNextSubStage}
          disabled={!selectedPackageId || selectedPackageId === ""}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </CardContent>
  );

  // Component for Stage 2: Package Customization
  const PackageCustomizationStage = () => {
    if (!selectedPkgDetails) {
      return (
        <CardContent className="space-y-6 pt-6 text-center">
          <p className="text-red-600 font-semibold">Error: No package selected or package details are missing.</p>
          <Button onClick={() => setCurrentSubStage("packageSelection")} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" /> Go Back to Package Selection
          </Button>
        </CardContent>
      );
    }

    const currentSelectedSpreads = watch("sandwichFactorySelections.selectedSpreads") || [];
    const currentSelectedSalads = watch("sandwichFactorySelections.selectedSalads") || [];
    const selectedGFOption = watch("sandwichFactorySelections.glutenFreeOption") || { id: "none", quantity: 0, pricePerPerson: 0 };


    const handleMultiCheckboxChange = (
      fieldName: "selectedSpreads" | "selectedSalads",
      itemId: string,
      limit: number
    ) => {
      const currentValues: string[] = getValues(`sandwichFactorySelections.${fieldName}`) || [];
      let newValues: string[];

      if (currentValues.includes(itemId)) {
        newValues = currentValues.filter((id) => id !== itemId);
      } else {
        if (currentValues.length < limit) {
          newValues = [...currentValues, itemId];
        } else {
          alert(`You can select a maximum of ${limit} ${fieldName === "selectedSpreads" ? "spreads" : "salads"}.`);
          return; // Prevent update if limit exceeded
        }
      }
      setValue(`sandwichFactorySelections.${fieldName}`, newValues, { shouldValidate: true });
    };

    const handleGFOptionRadioChange = (optionId: SelectedGlutenFreeDetails['id']) => {
        const optionDetails = sandwichFactoryDataNew.glutenFreeOptions.find(opt => opt.id === optionId);
        const currentGFQuantity = getValues("sandwichFactorySelections.glutenFreeOption.quantity") || 0;

        setValue("sandwichFactorySelections.glutenFreeOption", {
            id: optionId,
            pricePerPerson: optionDetails?.pricePerPerson || 0,
            // Keep quantity if switching between priced options, reset if moving to/from 'none'
            quantity: (optionId && optionId !== 'none') ? (selectedGFOption.id === optionId ? currentGFQuantity : 0) : 0,
        }, { shouldValidate: true });
        trigger("sandwichFactorySelections.glutenFreeOption.quantity"); // Validate quantity
    };


    return (
      <CardContent className="space-y-8 pt-6">
        <div className="text-center">
          <CardTitle className="text-2xl font-bold text-pink-600">
            Sandwich Factory - {selectedPkgDetails.name}
          </CardTitle>
          <CardDescription className="mt-1 font-semibold text-pink-700">
            ${selectedPkgDetails.pricePerPerson.toFixed(2)} per person
          </CardDescription>
          <p className="text-sm text-center text-gray-600 mt-3">
            Please make your selections for the {selectedPkgDetails.name} below. The indicated number of choices for spreads and salads are included in your package price.
          </p>
        </div>

        <div className="space-y-4 p-4 border rounded-md bg-slate-50 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Included Items Overview:</h3>
            <div>
                <h4 className="font-semibold text-gray-700">Meats:</h4>
                <p className="text-sm text-muted-foreground ml-4">{selectedPkgDetails.meatsList.join(", ")}</p>
            </div>
            <div>
                <h4 className="font-semibold text-gray-700 mt-2">Cheeses:</h4>
                <p className="text-sm text-muted-foreground ml-4">{selectedPkgDetails.cheesesList.join(", ")}</p>
            </div>
            <div>
                <h4 className="font-semibold text-gray-700 mt-2">Veggies:</h4>
                <p className="text-sm text-muted-foreground ml-4">
                    {selectedPkgDetails.veggiesList.join(", ")}
                    {selectedPkgDetails.veggiesNote && <span className="italic"> ({selectedPkgDetails.veggiesNote})</span>}
                </p>
            </div>
            <div>
                <h4 className="font-semibold text-gray-700 mt-2">Breads:</h4>
                <p className="text-sm text-muted-foreground ml-4">{selectedPkgDetails.breadsList.join(", ")}</p>
            </div>
            {selectedPkgDetails.drinksIncluded && selectedPkgDetails.drinksIncluded.length > 0 && (
                 <div>
                    <h4 className="font-semibold text-gray-700 mt-2">Drinks:</h4>
                    <p className="text-sm text-muted-foreground ml-4">{selectedPkgDetails.drinksIncluded.join(", ")}</p>
                </div>
            )}
        </div>

        <FormField
          control={control}
          name="sandwichFactorySelections.selectedSpreads"
          render={() => ( // Field prop not directly used for checkbox group value, handled by watch/setValue
            <FormItem className="p-4 border rounded-md shadow-sm">
              <FormLabel className="text-lg font-semibold text-gray-700">
                Sandwich Spreads - Choose {selectedPkgDetails.spreadLimit}
              </FormLabel>
              <ScrollArea className="h-48 mt-2">
                <div className="space-y-2 pr-2">
                  {sandwichFactoryDataNew.spreadsMasterList.map((item) => (
                    <FormItem
                      key={item.id}
                      className="flex flex-row items-center space-x-3 p-2.5 border rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <FormControl>
                        <Checkbox
                          id={`spread-${item.id}`}
                          checked={currentSelectedSpreads.includes(item.id)}
                          onCheckedChange={() => handleMultiCheckboxChange("selectedSpreads", item.id, selectedPkgDetails.spreadLimit)}
                          disabled={
                            !currentSelectedSpreads.includes(item.id) &&
                            currentSelectedSpreads.length >= selectedPkgDetails.spreadLimit
                          }
                        />
                      </FormControl>
                      <Label htmlFor={`spread-${item.id}`} className="text-sm font-medium text-gray-700 cursor-pointer flex-grow">
                        {item.name}
                      </Label>
                    </FormItem>
                  ))}
                </div>
              </ScrollArea>
              <FormMessage>{errors.sandwichFactorySelections?.selectedSpreads?.message}</FormMessage>
            </FormItem>
          )}
        />

         <FormField
          control={control}
          name="sandwichFactorySelections.selectedSalads"
          render={() => (
            <FormItem className="p-4 border rounded-md shadow-sm">
              <FormLabel className="text-lg font-semibold text-gray-700">
                Salads - Pick {selectedPkgDetails.saladLimit}
              </FormLabel>
              <ScrollArea className="h-48 mt-2">
                <div className="space-y-2 pr-2">
                  {sandwichFactoryDataNew.saladsMasterList.map((item) => (
                    <FormItem
                      key={item.id}
                      className="flex flex-row items-center space-x-3 p-2.5 border rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <FormControl>
                        <Checkbox
                          id={`salad-${item.id}`}
                          checked={currentSelectedSalads.includes(item.id)}
                          onCheckedChange={() => handleMultiCheckboxChange("selectedSalads", item.id, selectedPkgDetails.saladLimit)}
                          disabled={
                            !currentSelectedSalads.includes(item.id) &&
                            currentSelectedSalads.length >= selectedPkgDetails.saladLimit
                          }
                        />
                      </FormControl>
                      <Label htmlFor={`salad-${item.id}`} className="text-sm font-medium text-gray-700 cursor-pointer flex-grow">
                        {item.name}
                      </Label>
                    </FormItem>
                  ))}
                </div>
              </ScrollArea>
              <FormMessage>{errors.sandwichFactorySelections?.selectedSalads?.message}</FormMessage>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="sandwichFactorySelections.glutenFreeOption.id" // Control the ID part of the object
          render={({ field }) => (
            <FormItem className="p-4 border rounded-md shadow-sm">
              <FormLabel className="text-lg font-semibold text-gray-700">
                Do you want to add Gluten Free Bread?
              </FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value: SelectedGlutenFreeDetails['id']) => {
                    field.onChange(value); // Update the form state for the ID
                    handleGFOptionRadioChange(value); // Handle price and quantity logic
                  }}
                  value={field.value || 'none'} // Default to 'none' if null/undefined
                  className="mt-2 space-y-2"
                >
                  {sandwichFactoryDataNew.glutenFreeOptions.map((option) => (
                    <FormItem
                      key={option.id}
                      className="flex items-center space-x-3"
                    >
                      <FormControl>
                        <RadioGroupItem
                          value={option.id}
                          id={`gf-option-${option.id}`}
                        />
                      </FormControl>
                      <Label
                        htmlFor={`gf-option-${option.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {option.name}
                        {option.pricePerPerson > 0 &&
                          ` ($${option.pricePerPerson.toFixed(2)} pp)`}
                      </Label>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage>{errors.sandwichFactorySelections?.glutenFreeOption?.id?.message || errors.sandwichFactorySelections?.glutenFreeOption?.message}</FormMessage>
            </FormItem>
          )}
        />

        {selectedGFOption.id && selectedGFOption.id !== 'none' && (
          <FormField
            control={control}
            name="sandwichFactorySelections.glutenFreeOption.quantity"
            rules={{
                min: { value: 0, message: "Quantity cannot be negative." },
                validate: value => {
                    if (selectedGFOption.id && selectedGFOption.id !== 'none') {
                        return (parseInt(String(value), 10) || 0) > 0 || "Quantity must be greater than 0 if a GF option is selected.";
                    }
                    return true;
                }
            }}
            render={({ field: { onChange, ...fieldProps } }) => ( // Destructure onChange to customize
              <FormItem className="p-4 border rounded-md bg-slate-50 shadow-sm">
                <FormLabel htmlFor="gf-quantity" className="text-gray-700 font-medium">
                  Enter Amount (pp) for {sandwichFactoryDataNew.glutenFreeOptions.find(opt => opt.id === selectedGFOption.id)?.name}
                </FormLabel>
                <FormControl>
                  <Input
                    id="gf-quantity"
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-32 mt-1"
                    {...fieldProps}
                    value={fieldProps.value || 0} // Ensure value is controlled
                    onChange={e => {
                        const numValue = parseInt(e.target.value, 10);
                        onChange(isNaN(numValue) ? 0 : numValue); // Pass number or 0
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={control}
          name="sandwichFactorySelections.notes"
          render={({ field }) => (
            <FormItem className="p-4 border rounded-md shadow-sm">
              <FormLabel className="text-lg font-semibold text-gray-700">
                Comments, Customizations & Special Requests
              </FormLabel>
              <FormDescription className="text-sm">
                Please list any comments, customizations, or special requests. If
                there is a dietary restriction, please be sure to include it here.
              </FormDescription>
              <FormControl>
                <Textarea
                  placeholder="Enter your special requests here..."
                  className="min-h-[100px] mt-1"
                  {...field}
                  value={field.value || ""} // Ensure controlled component
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between mt-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentSubStage("packageSelection")}
            className="flex items-center px-6 py-3 text-lg"
          >
            <ChevronLeft className="mr-2 h-5 w-5" /> Back to Packages
          </Button>
          <Button
            type="button"
            onClick={async () => { // Ensure all relevant fields are validated before proceeding
                let allValid = true;
                if (selectedGFOption.id && selectedGFOption.id !== 'none') {
                    allValid = await trigger("sandwichFactorySelections.glutenFreeOption.quantity");
                }
                // Add other validations if needed for spreads/salads (e.g., min 1 if limit > 0 and required)
                if (allValid) {
                    onNext(); // Calls main form's onNext
                }
            }}
            className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
          >
            {/* Changed text to "Next Step" as per original component, can be "Get Quote" or "Submit" if this is the final step of this flow */}
            Next Step <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    );
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-pink-200">
      <CardHeader className="bg-pink-50 rounded-t-lg">
          {/* Header can be dynamic based on stage if needed, or a general one */}
          <CardTitle className="text-3xl font-bold text-center text-pink-700">
            Wedding Sandwich Factory
          </CardTitle>
      </CardHeader>
      {currentSubStage === "packageSelection" ? (
        <PackageSelectionStage />
      ) : (
        <PackageCustomizationStage />
      )}
    </Card>
  );
};

export default WeddingSandwichFactoryMenuStep;