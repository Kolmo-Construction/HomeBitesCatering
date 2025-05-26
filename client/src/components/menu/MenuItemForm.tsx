import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { insertMenuItemSchema } from "@shared/schema";
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
import { DollarSignIcon, X } from "lucide-react";

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
  
  // Set up the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: menuItem || {
      name: "",
      description: "",
      category: "",
      price: 0,
      upcharge: 0,
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

  // Create or update menu item mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // No need to convert price anymore as it's stored as decimal in the database
      const formattedValues = {
        ...values,
        // Keep null values as null, don't default to 0 for optional price
        price: values.price !== undefined && values.price !== null ? 
          values.price : null
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
