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
  price: z.coerce.number().int().positive("Price must be a positive number"),
  ingredients: z.string().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  isDairyFree: z.boolean().optional(),
  isNutFree: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MenuItemFormProps {
  menuItem?: FormValues;
  isEditing?: boolean;
  onCancel?: () => void;
}

export default function MenuItemForm({ menuItem, isEditing = false, onCancel }: MenuItemFormProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: menuItem || {
      name: "",
      description: "",
      category: "",
      price: 0,
      ingredients: "",
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      isNutFree: false,
    },
  });

  // Create or update menu item mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert price to cents for storage
      const formattedValues = {
        ...values,
        price: Math.round(values.price * 100)
      };
      
      if (isEditing && menuItem) {
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
  const formatPriceForEditing = (priceInCents: number) => {
    return priceInCents / 100;
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Person</FormLabel>
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
                          value={isEditing && typeof menuItem?.price === 'number' ? 
                            formatPriceForEditing(menuItem.price) : field.value}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
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
