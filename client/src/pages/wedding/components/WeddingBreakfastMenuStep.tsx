// src/pages/wedding/components/WeddingBreakfastMenuStep.tsx
import React from "react";
import { useFormContext, Controller, useFieldArray } from "react-hook-form";
import { WeddingInquiryFormData } from "../types/weddingFormTypes";
// UPDATED IMPORT:
import { weddingBreakfastMenuData, BreakfastMenuType, GrabAndGoItem, MenuItem } from "../data/weddingBreakfastMenuData"; 

// Import UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface WeddingBreakfastMenuStepProps {
  onPrevious: () => void;
  onNext: () => void;
  guestCount: number;
}

const WeddingBreakfastMenuStep: React.FC<WeddingBreakfastMenuStepProps> = ({
  onPrevious,
  onNext,
  guestCount,
}) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<WeddingInquiryFormData>();

  const selectedMenuType = watch("breakfastMenuSelections.menuType") as BreakfastMenuType | undefined;

  const handleMenuTypeChange = (value: BreakfastMenuType) => {
    setValue("breakfastMenuSelections.menuType", value);
    // Reset other breakfast selections 
    setValue("breakfastMenuSelections.serviceStyle", undefined);
    setValue("breakfastMenuSelections.grab_and_go_bites", []);
    setValue("breakfastMenuSelections.grab_and_go_snacks", []);
    setValue("breakfastMenuSelections.grab_and_go_beverages", []);
    setValue("breakfastMenuSelections.continental_staples", []);
    setValue("breakfastMenuSelections.continental_beverages", []);
    setValue("breakfastMenuSelections.eggs", undefined);
    setValue("breakfastMenuSelections.meats", []);
    setValue("breakfastMenuSelections.potatoes", undefined);
    setValue("breakfastMenuSelections.breads", undefined);
    setValue("breakfastMenuSelections.sweet_selections", []);
    setValue("breakfastMenuSelections.savory_selections", []);
    setValue("breakfastMenuSelections.sides_selections", []);
    setValue("breakfastMenuSelections.beverages", []);
  };

  // UPDATED REFERENCE:
  const menuDetails = selectedMenuType ? weddingBreakfastMenuData.menuTypes[selectedMenuType] : null;

  // ... (renderGrabAndGoCategory, renderMultiSelectItemCategory, renderSingleSelectItemCategory functions remain the same)
  const renderGrabAndGoCategory = (
    categoryKey: "grab_and_go_bites" | "grab_and_go_snacks" | "grab_and_go_beverages",
    items: GrabAndGoItem[],
    categoryName: string
  ) => {
    const { fields, append, remove, update } = useFieldArray({
      control,
      name: `breakfastMenuSelections.${categoryKey}`,
    });

    React.useEffect(() => {
        const currentFieldIds = fields.map(f => f.id);
        items.forEach(item => {
            // @ts-ignore
            if (!fields.find(f => f.itemId === item.id)) {
                // @ts-ignore
                append({ itemId: item.id, id: item.id, name: item.name, quantity: 0, price: item.price });
            }
        });
    }, [items, fields, append]);


    return (
      <div className="mb-4 p-4 border rounded-md" key={categoryKey}>
        <h4 className="text-md font-semibold mb-2 text-gray-700">{categoryName}</h4>
        <p className="text-sm text-gray-500 mb-2">Select quantities (typically {guestCount} pieces total for {guestCount} guests, adjust as needed).</p>
        <div className="space-y-3">
          {/* @ts-ignore */}
          {fields.map((field, index) => {
            const itemData = items.find(i => i.id === field.itemId);
            if (!itemData) return null;
            return (
                <div key={field.id} className="flex items-center justify-between space-x-2 p-2 border rounded-md">
                    <Label htmlFor={`grab-ngo-${categoryKey}-${itemData.id}`} className="text-sm font-medium text-gray-700">
                    {itemData.name} {typeof itemData.price === 'number' ? `(+$${itemData.price.toFixed(2)} each)` : ''}
                    </Label>
                    <Controller
                    control={control}
                    name={`breakfastMenuSelections.${categoryKey}.${index}.quantity`}
                    defaultValue={0}
                    render={({ field: quantityField }) => (
                        <Input
                        id={`grab-ngo-${categoryKey}-${itemData.id}`}
                        type="number"
                        min="0"
                        className="w-20 text-right"
                        {...quantityField}
                        onChange={e => quantityField.onChange(parseInt(e.target.value, 10) || 0)}
                        />
                    )}
                    />
                </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMultiSelectItemCategory = (
    categoryKey: keyof WeddingInquiryFormData['breakfastMenuSelections'],
    items: MenuItem[],
    categoryName: string,
    limit?: number,
    description?: string
  ) => {
    const currentSelections = watch(`breakfastMenuSelections.${categoryKey}`) as string[] || [];
    const effectiveLimit = limit ?? items.length;

    return (
      <div className="mb-4 p-4 border rounded-md" key={categoryKey}>
        <h4 className="text-md font-semibold mb-2 text-gray-700">{categoryName}</h4>
        <p className="text-sm text-gray-500 mb-2">{description || `Select up to ${effectiveLimit}`}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {items.map((item) => (
            <FormField
              key={item.id}
              control={control}
              // @ts-ignore
              name={`breakfastMenuSelections.${categoryKey}`}
              render={({ field }) => ( 
                <FormItem className="flex flex-row items-center space-x-2 p-2 border rounded-md hover:bg-gray-50 transition-colors">
                  <Checkbox
                    id={`bfast-${String(categoryKey)}-${item.id}`}
                    checked={currentSelections.includes(item.id)}
                    onCheckedChange={(checked) => {
                      const newSelections = checked
                        ? [...currentSelections, item.id]
                        : currentSelections.filter((id) => id !== item.id);
                      if (newSelections.length <= effectiveLimit) {
                        setValue(`breakfastMenuSelections.${categoryKey}` as any, newSelections, { shouldValidate: true });
                      }
                    }}
                    // @ts-ignore
                    disabled={!field.value?.includes(item.id) && currentSelections.length >= effectiveLimit && !currentSelections.includes(item.id)}
                  />
                  <Label htmlFor={`bfast-${String(categoryKey)}-${item.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                    {item.name}
                    {typeof item.upcharge === 'number' ? <span className="text-xs text-muted-foreground ml-1">(+${item.upcharge.toFixed(2)})</span> : ""}
                  </Label>
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderSingleSelectItemCategory = (
    categoryKey: keyof WeddingInquiryFormData['breakfastMenuSelections'],
    items: MenuItem[],
    categoryName: string,
    description?: string
  ) => {
    return (
        <FormField
            control={control}
            // @ts-ignore
            name={`breakfastMenuSelections.${categoryKey}`}
            render={({ field }) => (
            <FormItem className="mb-4 p-4 border rounded-md">
                <FormLabel className="text-md font-semibold text-gray-700">{categoryName}</FormLabel>
                {description && <FormDescription>{description}</FormDescription>}
                <Select 
                  onValueChange={field.onChange} 
                  // @ts-ignore
                  defaultValue={field.value as string | undefined}
                >
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder={`Select ${categoryName.toLowerCase()}`} />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                        {item.name}
                        {typeof item.upcharge === 'number' ? ` (+ $${item.upcharge.toFixed(2)})` : ''}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />
    );
  };


  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-pink-600">
          Wedding Breakfast/Brunch Menu
        </CardTitle>
        <CardDescription className="text-center">
          Choose your preferred breakfast or brunch style and customize your selections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="breakfastMenuSelections.menuType"
          rules={{ required: "Please select a menu type." }}
          render={({ field }) => (
            <FormItem className="space-y-3 p-4 border rounded-md">
              <FormLabel className="text-lg font-semibold text-gray-800">Select Menu Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => handleMenuTypeChange(value as BreakfastMenuType)}
                  defaultValue={field.value}
                  className="flex flex-col space-y-2"
                >
                  {/* UPDATED REFERENCE: */}
                  {Object.keys(weddingBreakfastMenuData.menuTypes).map((typeKey) => {
                    const typeDetails = weddingBreakfastMenuData.menuTypes[typeKey as BreakfastMenuType];
                    return (
                      <FormItem key={typeKey} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-pink-50 transition-colors">
                        <FormControl>
                          <RadioGroupItem value={typeKey} id={`menu-type-${typeKey}`} />
                        </FormControl>
                        <Label htmlFor={`menu-type-${typeKey}`} className="font-medium text-gray-700 cursor-pointer w-full">
                           <div className="flex justify-between items-center">
                                <span>
                                  {typeDetails.name} - Starting at $
                                  {typeof typeDetails.basePricePerPerson === 'number' 
                                    ? typeDetails.basePricePerPerson.toFixed(2) 
                                    : 'N/A'}{' '}
                                  per person
                                </span>
                           </div>
                           <p className="text-sm text-muted-foreground">{typeDetails.description}</p>
                        </Label>
                      </FormItem>
                    );
                  })}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedMenuType && menuDetails && (
          <>
            {menuDetails.serviceStyles && menuDetails.serviceStyles.length > 0 && (
                 <FormField
                    control={control}
                    name="breakfastMenuSelections.serviceStyle"
                    rules={{ required: "Please select a service style." }}
                    render={({ field }) => (
                    <FormItem className="mb-4 p-4 border rounded-md">
                        <FormLabel className="text-md font-semibold text-gray-700">Service Style</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          // @ts-ignore
                          defaultValue={field.value}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select service style" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {menuDetails.serviceStyles?.map(style => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name} 
                              {typeof style.upcharge === 'number' ? ` (+${style.upcharge.toFixed(2)})` : ''}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            {selectedMenuType === "grab_and_go" && menuDetails.categories.grab_and_go_bites &&
              renderGrabAndGoCategory("grab_and_go_bites", menuDetails.categories.grab_and_go_bites.items, "Bites")
            }
            {selectedMenuType === "grab_and_go" && menuDetails.categories.grab_and_go_snacks &&
              renderGrabAndGoCategory("grab_and_go_snacks", menuDetails.categories.grab_and_go_snacks.items, "Snacks")
            }
            {selectedMenuType === "grab_and_go" && menuDetails.categories.grab_and_go_beverages &&
              renderGrabAndGoCategory("grab_and_go_beverages", menuDetails.categories.grab_and_go_beverages.items, "Beverages")
            }

            {selectedMenuType === "continental" && menuDetails.categories.staples &&
              renderMultiSelectItemCategory("continental_staples", menuDetails.categories.staples.items, "Continental Staples", menuDetails.categories.staples.limit, menuDetails.categories.staples.description)
            }
            {selectedMenuType === "continental" && menuDetails.categories.beverages &&
              renderMultiSelectItemCategory("beverages", menuDetails.categories.beverages.items, "Beverages", menuDetails.categories.beverages.limit, menuDetails.categories.beverages.description)
            }

            {selectedMenuType === "american_breakfast" && menuDetails.categories.eggs &&
              renderSingleSelectItemCategory("eggs", menuDetails.categories.eggs.items, "Egg Preparation", menuDetails.categories.eggs.description)
            }
            {selectedMenuType === "american_breakfast" && menuDetails.categories.meats &&
              renderMultiSelectItemCategory("meats", menuDetails.categories.meats.items, "Meats", menuDetails.categories.meats.limit, menuDetails.categories.meats.description)
            }
            {selectedMenuType === "american_breakfast" && menuDetails.categories.potatoes &&
              renderSingleSelectItemCategory("potatoes", menuDetails.categories.potatoes.items, "Potatoes", menuDetails.categories.potatoes.description)
            }
             {selectedMenuType === "american_breakfast" && menuDetails.categories.breads &&
              renderSingleSelectItemCategory("breads", menuDetails.categories.breads.items, "Breads", menuDetails.categories.breads.description)
            }
            {selectedMenuType === "american_breakfast" && menuDetails.categories.beverages &&
              renderMultiSelectItemCategory("beverages", menuDetails.categories.beverages.items, "Beverages", menuDetails.categories.beverages.limit, menuDetails.categories.beverages.description)
            }

            {selectedMenuType === "full_monty_plated_brunch" && menuDetails.categories.sweet_selections &&
              renderMultiSelectItemCategory("sweet_selections", menuDetails.categories.sweet_selections.items, "Sweet Selections", menuDetails.categories.sweet_selections.limit, menuDetails.categories.sweet_selections.description)
            }
            {selectedMenuType === "full_monty_plated_brunch" && menuDetails.categories.savory_selections &&
              renderMultiSelectItemCategory("savory_selections", menuDetails.categories.savory_selections.items, "Savory Selections", menuDetails.categories.savory_selections.limit, menuDetails.categories.savory_selections.description)
            }
            {selectedMenuType === "full_monty_plated_brunch" && menuDetails.categories.sides_selections &&
              renderMultiSelectItemCategory("sides_selections", menuDetails.categories.sides_selections.items, "Sides", menuDetails.categories.sides_selections.limit, menuDetails.categories.sides_selections.description)
            }
            {selectedMenuType === "full_monty_plated_brunch" && menuDetails.categories.beverages &&
              renderMultiSelectItemCategory("beverages", menuDetails.categories.beverages.items, "Beverages", menuDetails.categories.beverages.limit, menuDetails.categories.beverages.description)
            }
          </>
        )}

        <div className="p-4 border rounded-md">
          <FormField
            control={control}
            name="breakfastMenuSelections.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-semibold text-gray-800">Additional Notes for Breakfast/Brunch</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any specific requests, dietary adjustments for the entire breakfast/brunch, or timing considerations..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between mt-8">
          <Button type="button" variant="outline" onClick={onPrevious}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button type="button" onClick={onNext} className="bg-pink-500 hover:bg-pink-600">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeddingBreakfastMenuStep;