import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { insertMenuItemSchema, type AdditionalDietaryMetadata, type NutritionalRange } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSignIcon, X, Plus, Minus } from "lucide-react";

// Extend the menu item schema with validation
const formSchema = insertMenuItemSchema.extend({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().nonnegative("Price must be a non-negative number").optional(),
  upcharge: z.coerce.number().nonnegative("Upcharge must be a non-negative number").optional(),
  ingredients: z.string().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  isDairyFree: z.boolean().optional(),
  isNutFree: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MenuItemFormProps {
  menuItem?: FormValues & { id?: string };
  isEditing?: boolean;
  onCancel?: () => void;
}

export default function MenuItemForm({ menuItem, isEditing = false, onCancel }: MenuItemFormProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for combined name/description format
  const [useCombinedFormat, setUseCombinedFormat] = useState(false);
  const [combinedNameDesc, setCombinedNameDesc] = useState("");
  
  // State for advanced dietary metadata
  const [showAdvancedDietary, setShowAdvancedDietary] = useState(false);
  const [dietaryFlags, setDietaryFlags] = useState<string[]>([]);
  const [allergenAlerts, setAllergenAlerts] = useState<string[]>([]);
  const [nutritionalHighlights, setNutritionalHighlights] = useState<Record<string, Partial<NutritionalRange>>>({});
  const [suitableForDiets, setSuitableForDiets] = useState<string[]>([]);
  const [preparationNotes, setPreparationNotes] = useState("");
  const [customerGuidance, setCustomerGuidance] = useState("");
  const [availableLotSizes, setAvailableLotSizes] = useState<number[]>([]);
  
  // Set up the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: menuItem ? {
      ...menuItem,
      price: menuItem.price ?? undefined, // Convert null to undefined for form handling
      upcharge: menuItem.upcharge ?? undefined,
    } : {
      name: "",
      description: "",
      category: "",
      price: undefined,
      upcharge: undefined,
      ingredients: "",
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      isNutFree: false,
    },
  });
  
  // Function to process combined format
  const processCombinedFormat = (value: string) => {
    setCombinedNameDesc(value);
    
    // Split by first colon
    const colonIndex = value.indexOf(':');
    if (colonIndex > 0) {
      const name = value.substring(0, colonIndex).trim();
      const description = value.substring(colonIndex + 1).trim();
      
      form.setValue("name", name);
      form.setValue("description", description);
    }
  };

  // Load existing dietary metadata when editing
  useEffect(() => {
    if (isEditing && menuItem?.additional_dietary_metadata) {
      const metadata = menuItem.additional_dietary_metadata;
      
      // Load existing values
      if (metadata.dietary_flags_list) setDietaryFlags(metadata.dietary_flags_list);
      if (metadata.allergen_alert_list) setAllergenAlerts(metadata.allergen_alert_list);
      if (metadata.nutritional_highlights) setNutritionalHighlights(metadata.nutritional_highlights);
      if (metadata.suitable_for_diet_preferences) setSuitableForDiets(metadata.suitable_for_diet_preferences);
      if (metadata.key_preparation_notes) setPreparationNotes(metadata.key_preparation_notes);
      if (metadata.guidance_for_customer_short) setCustomerGuidance(metadata.guidance_for_customer_short);
      if (metadata.available_lot_sizes) setAvailableLotSizes(metadata.available_lot_sizes);
    }
  }, [isEditing, menuItem]);

  // Create or update menu item mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Build the additional dietary metadata
      const additionalDietaryMetadata: AdditionalDietaryMetadata = {
        dietary_flags_list: dietaryFlags.length > 0 ? dietaryFlags : undefined,
        allergen_alert_list: allergenAlerts.length > 0 ? allergenAlerts : undefined,
        nutritional_highlights: Object.keys(nutritionalHighlights || {}).length > 0 ? nutritionalHighlights : undefined,
        key_preparation_notes: preparationNotes || undefined,
        suitable_for_diet_preferences: suitableForDiets.length > 0 ? suitableForDiets : undefined,
        guidance_for_customer_short: customerGuidance || undefined,
        available_lot_sizes: availableLotSizes.length > 0 ? availableLotSizes : undefined,
      };

      const formattedValues = {
        ...values,
        // Keep null values as null, don't default to 0 for optional price
        price: values.price !== undefined && values.price !== null ? 
          values.price : null,
        upcharge: values.upcharge !== undefined && values.upcharge !== null ? 
          values.upcharge : null,
        additional_dietary_metadata: Object.values(additionalDietaryMetadata).some(v => v !== undefined) ? 
          additionalDietaryMetadata : null
      };
      
      if (isEditing && menuItem?.id) {
        // Update existing menu item
        const res = await apiRequest("PATCH", `/api/menu-items/${menuItem.id}`, formattedValues);
        return res.json();
      } else {
        // Create new menu item
        const res = await apiRequest("POST", "/api/menu-items", formattedValues);
        return res.json();
      }
    },
    onSuccess: () => {
      // Invalidate menu items query to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      
      // Show success message and redirect
      toast({
        title: isEditing ? "Menu item updated" : "Menu item created",
        description: isEditing 
          ? "The menu item has been updated successfully." 
          : "The new menu item has been created successfully.",
      });
      
      // Navigate back to menu items list
      navigate("/menu-items");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} menu item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  // Helper to convert price from cents to dollars for editing
  // No need to format price anymore as it's now stored as a decimal in the database
  const formatPriceForEditing = (price: number | null) => {
    return price;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{isEditing ? "Edit Menu Item" : "New Menu Item"}</CardTitle>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox 
                  id="combined-format"
                  checked={useCombinedFormat}
                  onCheckedChange={(checked) => setUseCombinedFormat(checked as boolean)}
                />
                <label 
                  htmlFor="combined-format" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Use combined name and description format (e.g., "Asian Street Fries: Fries topped with sauce")
                </label>
              </div>
              
              {useCombinedFormat ? (
                <div className="mb-4">
                  <Textarea 
                    placeholder="Enter menu item in format: Name: Description"
                    value={combinedNameDesc}
                    onChange={(e) => processCombinedFormat(e.target.value)}
                    rows={3}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Everything before the colon (:) will be used as the name, and everything after will be the description.
                  </p>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Menu item name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => {
                  const [isCustomCategory, setIsCustomCategory] = useState(false);
                  const [customCategory, setCustomCategory] = useState("");
                  
                  // Set custom category mode if the value doesn't match predefined ones
                  useEffect(() => {
                    if (field.value && !["appetizer", "entree", "side", "dessert", "beverage"].includes(field.value)) {
                      setIsCustomCategory(true);
                      setCustomCategory(field.value);
                    }
                  }, [field.value]);
                  
                  return (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      {!isCustomCategory ? (
                        <>
                          <Select 
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setIsCustomCategory(true);
                                setCustomCategory("");
                              } else {
                                field.onChange(value);
                              }
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="appetizer">Appetizers</SelectItem>
                              <SelectItem value="entree">Main Courses</SelectItem>
                              <SelectItem value="side">Sides</SelectItem>
                              <SelectItem value="dessert">Desserts</SelectItem>
                              <SelectItem value="beverage">Beverages</SelectItem>
                              <SelectItem value="custom">Add New Category...</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <FormControl>
                            <Input 
                              placeholder="Enter custom category" 
                              value={customCategory}
                              onChange={(e) => {
                                setCustomCategory(e.target.value);
                                field.onChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setIsCustomCategory(false);
                              field.onChange("");
                            }}
                          >
                            Back to Preset Categories
                          </Button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price <span className="text-sm text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          className="pl-8" 
                          {...field}
                          value={field.value ?? ""}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">For standalone items (appetizers, desserts, equipment rental).</p>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="upcharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Upcharge <span className="text-sm text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          className="pl-8" 
                          {...field}
                          value={field.value ?? ""}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">Additional cost when added to wedding packages.</p>
                  </FormItem>
                )}
              />
            </div>
            
            {!useCombinedFormat && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Item description"
                        className="resize-none" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingredients</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="List of ingredients"
                      className="resize-none" 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Dietary Notes</FormLabel>
              <div className="flex flex-wrap gap-4 mt-2">
                <FormField
                  control={form.control}
                  name="isVegetarian"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-neutral-700 cursor-pointer">
                        Vegetarian
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isVegan"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-neutral-700 cursor-pointer">
                        Vegan
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isGlutenFree"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-neutral-700 cursor-pointer">
                        Gluten-Free
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isDairyFree"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-neutral-700 cursor-pointer">
                        Dairy-Free
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isNutFree"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-neutral-700 cursor-pointer">
                        Nut-Free
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Advanced Dietary Metadata Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Advanced Dietary Information</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedDietary(!showAdvancedDietary)}
                >
                  {showAdvancedDietary ? "Hide" : "Show"} Advanced Options
                </Button>
              </div>
              
              {showAdvancedDietary && (
                <div className="space-y-6 border rounded-lg p-4 bg-gray-50">
                  {/* Dietary Flags */}
                  <div>
                    <FormLabel>Dietary Flags</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["HIGH_PROTEIN", "LOW_CARB", "LOW_FAT", "HIGH_FIBER", "KETO_FRIENDLY", "PALEO_FRIENDLY"].map((flag) => (
                        <Button
                          key={flag}
                          type="button"
                          variant={dietaryFlags.includes(flag) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setDietaryFlags(prev => 
                              prev.includes(flag) 
                                ? prev.filter(f => f !== flag)
                                : [...prev, flag]
                            );
                          }}
                        >
                          {flag.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Allergen Alerts */}
                  <div>
                    <FormLabel>Allergen Alerts</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["CONTAINS_NUTS", "CONTAINS_SOY", "CONTAINS_EGGS", "MAY_CONTAIN_NUTS", "CONTAINS_SHELLFISH", "CONTAINS_FISH"].map((allergen) => (
                        <Button
                          key={allergen}
                          type="button"
                          variant={allergenAlerts.includes(allergen) ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => {
                            setAllergenAlerts(prev => 
                              prev.includes(allergen) 
                                ? prev.filter(a => a !== allergen)
                                : [...prev, allergen]
                            );
                          }}
                        >
                          {allergen.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Nutritional Highlights */}
                  <div>
                    <FormLabel>Nutritional Highlights</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {[
                        { key: "calories", defaultUnit: "kcal" },
                        { key: "protein", defaultUnit: "g" },
                        { key: "fat", defaultUnit: "g" },
                        { key: "carbs", defaultUnit: "g" },
                        { key: "fiber", defaultUnit: "g" },
                        { key: "sodium", defaultUnit: "mg" },
                        { key: "sugar", defaultUnit: "g" }
                      ].map(({ key: nutrient, defaultUnit }) => (
                        <div key={nutrient} className="space-y-2 border rounded p-3">
                          <h4 className="font-medium capitalize">{nutrient}</h4>
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="number"
                              placeholder="Min"
                              value={nutritionalHighlights[nutrient]?.min || ""}
                              onChange={(e) => {
                                const value = e.target.value ? Number(e.target.value) : undefined;
                                setNutritionalHighlights(prev => ({
                                  ...prev,
                                  [nutrient]: {
                                    min: value,
                                    max: prev[nutrient]?.max,
                                    unit: prev[nutrient]?.unit || ""
                                  }
                                }));
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Max"
                              value={nutritionalHighlights[nutrient]?.max || ""}
                              onChange={(e) => {
                                const value = e.target.value ? Number(e.target.value) : undefined;
                                setNutritionalHighlights(prev => ({
                                  ...prev,
                                  [nutrient]: {
                                    min: prev[nutrient]?.min,
                                    max: value,
                                    unit: prev[nutrient]?.unit || ""
                                  }
                                }));
                              }}
                            />
                            <Input
                              placeholder={`Unit (${defaultUnit})`}
                              value={nutritionalHighlights[nutrient]?.unit || defaultUnit}
                              onChange={(e) => {
                                setNutritionalHighlights(prev => ({
                                  ...prev,
                                  [nutrient]: {
                                    min: prev[nutrient]?.min,
                                    max: prev[nutrient]?.max,
                                    unit: e.target.value
                                  }
                                }));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Suitable for Diet Preferences */}
                  <div>
                    <FormLabel>Suitable for Diet Preferences</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["KETO", "PALEO", "MEDITERRANEAN", "LOW_SODIUM", "DIABETIC_FRIENDLY", "HEART_HEALTHY"].map((diet) => (
                        <Button
                          key={diet}
                          type="button"
                          variant={suitableForDiets.includes(diet) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setSuitableForDiets(prev => 
                              prev.includes(diet) 
                                ? prev.filter(d => d !== diet)
                                : [...prev, diet]
                            );
                          }}
                        >
                          {diet.replace(/_/g, ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Preparation Notes */}
                  <div>
                    <FormLabel>Key Preparation Notes</FormLabel>
                    <Textarea
                      placeholder="e.g., Pan-seared, contains white wine, served at room temperature"
                      value={preparationNotes}
                      onChange={(e) => setPreparationNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  {/* Customer Guidance */}
                  <div>
                    <FormLabel>Guidance for Customer</FormLabel>
                    <Textarea
                      placeholder="e.g., Great choice for a light, healthy meal. Perfect for outdoor events."
                      value={customerGuidance}
                      onChange={(e) => setCustomerGuidance(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Available Lot Sizes */}
                  <div>
                    <FormLabel>Available Lot Sizes</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {availableLotSizes.map((size, index) => (
                          <div key={index} className="flex items-center gap-2 bg-white border rounded px-3 py-2">
                            <span className="text-sm">{size} pieces</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAvailableLotSizes(prev => prev.filter((_, i) => i !== index));
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Enter lot size (e.g., 24)"
                          className="w-32"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const value = parseInt((e.target as HTMLInputElement).value);
                              if (value > 0 && !availableLotSizes.includes(value)) {
                                setAvailableLotSizes(prev => [...prev, value].sort((a, b) => a - b));
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                            const value = parseInt(input?.value || '');
                            if (value > 0 && !availableLotSizes.includes(value)) {
                              setAvailableLotSizes(prev => [...prev, value].sort((a, b) => a - b));
                              if (input) input.value = '';
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Add quantity options for catering orders (e.g., 24, 48, 72 pieces)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <CardFooter className="px-0 pb-0 pt-6 flex justify-end space-x-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : (isEditing ? "Update Item" : "Save Item")}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
