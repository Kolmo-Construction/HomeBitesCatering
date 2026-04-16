// client/src/components/form-steps/BreakfastMenuStep.tsx
import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
// Shadcn/ui specific FormField, aliased to avoid confusion if RHF's FormField was ever imported directly elsewhere
import { 
  FormControl as ShadFormControl, // Renamed to avoid conflict if original FormControl was from RHF
  FormField as ShadFormField, 
  FormItem as ShadFormItem, 
  FormLabel as ShadFormLabel, 
  FormMessage as ShadFormMessage 
} from "@/components/ui/form";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Check as CheckIcon } from "lucide-react"; // Aliased Check icon

import { EventInquiryFormData } from "@/types/form-types"; // Adjust path as needed
import { breakfastMenuData } from "@/data/breakfastMenuData"; // Adjust path as needed

const BreakfastMenuStep = ({
  onPrevious,
  onNext,
  guestCount // guestCount prop might not be directly used in this component's logic based on original, but kept for signature consistency
}: {
  onPrevious: () => void;
  onNext: () => void;
  guestCount: number;
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<EventInquiryFormData>();
  const [selectedMenuType, setSelectedMenuType] = useState<string>("");
  const breakfastSelections = watch("breakfastMenuSelections") || {} as NonNullable<EventInquiryFormData['breakfastMenuSelections']>;

  useEffect(() => {
    if (!breakfastSelections.menuType) {
      setValue("breakfastMenuSelections", {
        menuType: "",
        grab_and_go_bites: [],
        grab_and_go_snacks: [],
        grab_and_go_beverages: [],
        continental_staples: [],
        continental_beverages: [],
        // Ensure all possible keys for breakfastSelections are initialized if needed by other logic
        eggs: undefined,
        meats: [],
        potatoes: undefined,
        breads: undefined, 
        sides: undefined,
        beverages: [],
        serviceStyle: undefined,
        breakfast_meats: [],
        sweet_selections: [],
        savory_selections: [],
        sides_selections: [],
        notes: ""
      });
    } else {
      setSelectedMenuType(breakfastSelections.menuType);
    }
  }, [breakfastSelections.menuType, setValue]);

  const handleMenuTypeSelect = (type: string) => {
    setSelectedMenuType(type);
    setValue("breakfastMenuSelections.menuType", type);
    // Optionally reset other selections when menu type changes
  };

  const handleGrabAndGoItemSelect = (sectionId: string, itemId: string, quantity: number) => {
    const sectionKey = `grab_and_go_${sectionId}` as keyof NonNullable<EventInquiryFormData['breakfastMenuSelections']>;
    const currentSelections = ((breakfastSelections as any)[sectionKey] as Array<{id: string, quantity: number}>) || [];
    const existingIndex = currentSelections.findIndex(item => item.id === itemId);

    let newSelections = [...currentSelections];

    if (quantity > 0) {
      if (existingIndex >= 0) {
        newSelections[existingIndex] = { id: itemId, quantity };
      } else {
        newSelections.push({ id: itemId, quantity });
      }
    } else {
      if (existingIndex >= 0) {
        newSelections.splice(existingIndex, 1);
      }
    }
    setValue(`breakfastMenuSelections.${sectionKey}` as any, newSelections as any);
  };

  const handleItemSelect = (sectionId: string, itemId: string, isMultiple: boolean, isSelected: boolean) => {
    const sectionKey = sectionId as keyof NonNullable<EventInquiryFormData['breakfastMenuSelections']>;
    const currentSelectionsRaw = (breakfastSelections as any)[sectionKey];

    let currentSelections: string[] = [];
    if (Array.isArray(currentSelectionsRaw)) {
        currentSelections = [...currentSelectionsRaw as string[]];
    } else if (typeof currentSelectionsRaw === 'string' && isMultiple) {
        currentSelections = [currentSelectionsRaw];
    }


    if (isMultiple) {
      if (isSelected) {
        if (!currentSelections.includes(itemId)) {
          setValue(`breakfastMenuSelections.${sectionKey}` as any, [...currentSelections, itemId] as any);
        }
      } else {
        setValue(`breakfastMenuSelections.${sectionKey}` as any, currentSelections.filter(id => id !== itemId) as any);
      }
    } else {
      setValue(`breakfastMenuSelections.${sectionKey}` as any, itemId as any);
    }
  };

  const getItemQuantity = (sectionId: string, itemId: string): number => {
    const sectionKey = `grab_and_go_${sectionId}` as keyof NonNullable<EventInquiryFormData['breakfastMenuSelections']>;
    const selections = ((breakfastSelections as any)[sectionKey] as Array<{id: string, quantity: number}>) || [];
    const item = selections.find((item: {id: string, quantity: number}) => item.id === itemId);
    return item ? item.quantity : 0;
  };

  const isItemSelected = (sectionId: string, itemId: string): boolean => {
    const sectionKey = sectionId as keyof NonNullable<EventInquiryFormData['breakfastMenuSelections']>;
    const selections = (breakfastSelections as any)[sectionKey];
    if (!selections) return false;
    if (Array.isArray(selections)) {
      return (selections as string[]).includes(itemId);
    } else {
      return selections === itemId;
    }
  };

  const isFormValid = () => {
    if (!selectedMenuType) return false;
    const currentSelections = breakfastSelections; // Use a local var for easier access

    switch (selectedMenuType) {
      case "grab_and_go":
        const bites = currentSelections.grab_and_go_bites || [];
        const snacks = currentSelections.grab_and_go_snacks || [];
        const beverages = currentSelections.grab_and_go_beverages || [];
        return bites.length > 0 || snacks.length > 0 || beverages.length > 0;
      case "continental":
        const staples = currentSelections.continental_staples || [];
        const continentalBevs = currentSelections.continental_beverages || [];
        return staples.length >= 3 && continentalBevs.length >= 2;
      case "american":
        return !!currentSelections.eggs &&
               (currentSelections.meats || []).length >= 2 &&
               !!currentSelections.potatoes &&
               !!currentSelections.breads &&
               !!currentSelections.sides &&
               (currentSelections.beverages || []).length >= 2;
      case "full_monty":
        return !!currentSelections.serviceStyle &&
               (currentSelections.breakfast_meats || []).length > 0 &&
               (Array.isArray(currentSelections.breads) ? currentSelections.breads.length > 0 : !!currentSelections.breads) && // Handle if breads can be string
               (currentSelections.sweet_selections || []).length > 0 &&
               (currentSelections.savory_selections || []).length > 0 &&
               (currentSelections.sides_selections || []).length > 0 &&
               (currentSelections.beverages || []).length > 0;
      default:
        return false;
    }
  };

  const renderMenuTypeSelection = () => (
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
                  <CheckIcon className="h-6 w-6 text-primary" />
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

        {selectedMenu.sections.map((section: any) => (
          <div key={section.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-semibold mb-2">{section.name}</h3>
            <p className="text-gray-600 mb-4">{section.description}</p>

            {/* Grab and Go sections with quantity inputs */}
            {selectedMenu.id === "grab_and_go" && section.id.startsWith("grab_and_go_") && (
              <div className="space-y-4">
                {section.items.map((item: { id: string; name: string; price: number }) => {
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
                value={(breakfastSelections as any)[section.id] as string || ""}
                onValueChange={(value) => handleItemSelect(section.id, value, false, true)}
                className="space-y-3"
              >
                {section.items.map((item: { id: string; name: string; price: number }) => (
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

                {section.items.map((item: { id: string; name: string; price: number }) => {
                  const isSelected = isItemSelected(section.id, item.id);
                  const selections = (breakfastSelections as any)[section.id] || [];
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
          <ShadFormField
            control={control}
            name="breakfastMenuSelections.notes"
            render={({ field }) => (
              <ShadFormItem>
                <ShadFormLabel>Additional notes or dietary restrictions</ShadFormLabel>
                <ShadFormControl>
                  <Textarea
                    placeholder="Please enter any special requests, dietary restrictions, or additional information here."
                    className="h-24"
                    {...field}
                    value={field.value || ''} // Ensure value is controlled
                  />
                </ShadFormControl>
                <ShadFormMessage />
              </ShadFormItem>
            )}
          />
        </div>
      </>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {!selectedMenuType ? renderMenuTypeSelection() : renderSelectedMenu()}
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

export default BreakfastMenuStep;