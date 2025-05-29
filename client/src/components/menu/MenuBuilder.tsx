import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GripVertical, X, Plus, Save, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { insertMenuSchema } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import MenuItemSelector from "./MenuItemSelector";

// Define the menu item with quantity
interface MenuItemWithQuantity {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

// Schema for the form
const formSchema = insertMenuSchema.extend({
  name: z.string().min(1, "Menu name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Menu type is required"),
  theme_key: z.string().optional(),
  package_id: z.string().optional(),
  package_name: z.string().optional(),
  items: z.array(z.object({
    id: z.number(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MenuBuilderProps {
  menu?: any;
  isEditing?: boolean;
}

// Format category display name (for custom categories)
const getCategoryDisplayName = (categoryKey: string): string => {
  const categoryLabels: Record<string, string> = {
    appetizer: "Appetizers",
    entree: "Main Courses",
    side: "Sides",
    dessert: "Desserts",
    beverage: "Beverages"
  };
  
  if (categoryLabels[categoryKey]) {
    return categoryLabels[categoryKey];
  }
  
  // For custom categories, capitalize first letter of each word
  return categoryKey
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Sortable item component
function SortableMenuItem({ 
  item, 
  onQuantityChange, 
  onRemove
}: { 
  item: MenuItemWithQuantity; 
  onQuantityChange: (id: string | number, quantity: number) => void;
  onRemove: (id: string | number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center gap-2 bg-white p-3 border rounded-md mb-2"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <div className="flex-1">
        <div className="font-medium">{item.name}</div>
        <div className="text-sm text-gray-500 mb-1">
          {formatCurrency(item.price / 100)} • {getCategoryDisplayName(item.category)}
        </div>
        
        {/* Enhanced metadata display */}
        <div className="text-xs text-gray-600 space-y-1">
          {(item as any).description && (
            <div className="italic">{(item as any).description}</div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {(item as any).origin && (
              <Badge variant="outline" className="text-xs">
                Origin: {(item as any).origin}
              </Badge>
            )}
            
            {(item as any).calories && (
              <Badge variant="outline" className="text-xs">
                {(item as any).calories} cal
              </Badge>
            )}
            
            {(item as any).protein && (
              <Badge variant="outline" className="text-xs">
                {(item as any).protein}g protein
              </Badge>
            )}
            
            {(item as any).carbs && (
              <Badge variant="outline" className="text-xs">
                {(item as any).carbs}g carbs
              </Badge>
            )}
          </div>
          
          {/* Dietary flags */}
          <div className="flex flex-wrap gap-1">
            {(item as any).isVegetarian && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                Vegetarian
              </Badge>
            )}
            {(item as any).isVegan && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                Vegan
              </Badge>
            )}
            {(item as any).isGlutenFree && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                Gluten-Free
              </Badge>
            )}
            {(item as any).isDairyFree && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                Dairy-Free
              </Badge>
            )}
            {(item as any).isNutFree && (
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                Nut-Free
              </Badge>
            )}
          </div>
          
          {/* Allergens warning */}
          {(item as any).allergens && (item as any).allergens.length > 0 && (
            <div className="text-xs text-red-600">
              ⚠️ Contains: {(item as any).allergens.join(', ')}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={item.quantity}
          onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value))}
          className="w-16 text-center"
          min={1}
        />
        <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

export default function MenuBuilder({ menu, isEditing = false }: MenuBuilderProps) {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // For debugging
  console.log("Menu data in MenuBuilder:", menu);
  
  // Parse menu items from JSON if needed
  const getMenuItems = () => {
    if (!menu || !menu.items) return [];
    
    try {
      // Parse items if it's a string, otherwise use as is
      const itemsData = typeof menu.items === 'string' 
        ? JSON.parse(menu.items) 
        : menu.items;
        
      console.log("Parsed menu items:", itemsData);
      
      // Handle the new theme-based structure with categories
      if (itemsData.categories && Array.isArray(itemsData.categories)) {
        const allItemIds: string[] = [];
        
        // Extract all item IDs from all categories
        itemsData.categories.forEach((category: any) => {
          if (category.available_item_ids && Array.isArray(category.available_item_ids)) {
            allItemIds.push(...category.available_item_ids);
          }
        });
        
        // Convert to MenuItemWithQuantity format
        // We'll set quantity to 1 for now since the theme structure doesn't store quantities
        const parsedItems = allItemIds.map((itemId: string) => ({
          id: itemId,
          name: itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Convert ID to display name
          price: 0, // Will be populated when menu items are loaded
          quantity: 1,
          category: 'standard'
        }));
        
        console.log("Parsed menu items from categories:", parsedItems);
        return parsedItems;
      }
      
      // Handle legacy array format
      if (Array.isArray(itemsData)) {
        // We need to look up additional data from the menuItems list
        return itemsData.map((item: any) => ({
          id: item.id,
          name: item.name || `Item #${item.id}`, // Fallback name
          price: item.price || 0,
          quantity: item.quantity || 1,
          category: item.category || 'standard'
        }));
      }
      
      return [];
    } catch (error) {
      console.error("Error parsing menu items:", error);
      return [];
    }
  };

  // State for selected items
  const [selectedItems, setSelectedItems] = useState<MenuItemWithQuantity[]>(getMenuItems());
  
  // Debug log to see what selectedItems contains
  useEffect(() => {
    console.log("Selected items state updated:", selectedItems);
  }, [selectedItems]);
  
  // Get all menu items
  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery({
    queryKey: ["/api/menu-items"],
  }) as { data: any[], isLoading: boolean };
  
  // Update selected items with additional data from menu items when available
  useEffect(() => {
    if (isEditing && menu && menu.items && menuItems.length > 0) {
      console.log("Updating selected items with menu item details");
      const updatedItems = getMenuItems().map((item: MenuItemWithQuantity) => {
        // Try to find matching menu item to get additional details
        // Handle both string and numeric IDs
        const menuItem = menuItems.find((mi: any) => 
          mi.id === item.id || mi.id.toString() === item.id.toString()
        );
        if (menuItem) {
          return {
            ...item,
            name: menuItem.name || item.name,
            price: menuItem.price || item.price,
            category: menuItem.category || item.category,
            description: menuItem.description,
            origin: menuItem.origin,
            calories: menuItem.calories,
            protein: menuItem.protein,
            carbs: menuItem.carbs,
            fat: menuItem.fat,
            fiber: menuItem.fiber,
            sugar: menuItem.sugar,
            sodium: menuItem.sodium,
            isVegetarian: menuItem.isVegetarian,
            isVegan: menuItem.isVegan,
            isGlutenFree: menuItem.isGlutenFree,
            isDairyFree: menuItem.isDairyFree,
            isNutFree: menuItem.isNutFree,
            allergens: menuItem.allergens,
            spiceLevel: menuItem.spiceLevel,
            prepTime: menuItem.prepTime,
            servingSize: menuItem.servingSize
          };
        }
        return item;
      });
      setSelectedItems(updatedItems);
    }
  }, [menu, menuItems, isEditing]);
  
  // Set up form with appropriate default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: menu 
      ? {
          name: menu.name || "",
          description: menu.description || "",
          type: menu.type || "standard",
          theme_key: menu.theme_key || `custom_${menu.name?.toLowerCase().replace(/\s+/g, '_') || 'menu'}`,
          package_id: menu.package_id || `custom_package_${Date.now()}`,
          package_name: menu.package_name || "",
          // items are handled separately in the selectedItems state
        }
      : {
          name: "",
          description: "",
          type: "standard",
          theme_key: "",
          package_id: "",
          package_name: "",
          items: [],
        },
  });
  
  // Mutation for creating/updating menu
  const mutation = useMutation({
    mutationFn: async (values: {
      name: string;
      type: string;
      description?: string;
      items: { id: number; quantity: number }[];
    }) => {
      if (isEditing && menu) {
        const res = await apiRequest("PATCH", `/api/menus/${menu.id}`, values);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/menus", values);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: isEditing ? "Menu updated" : "Menu created",
        description: isEditing 
          ? "The menu has been updated successfully." 
          : "The new menu has been created successfully."
      });
      navigate("/menus");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} menu: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setSelectedItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  // Handle quantity change
  const handleQuantityChange = (id: string | number, quantity: number) => {
    setSelectedItems(items => 
      items.map(item => 
        item.id.toString() === id.toString() ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };
  
  // Handle remove item
  const handleRemoveItem = (id: string | number) => {
    setSelectedItems(items => items.filter(item => item.id.toString() !== id.toString()));
  };
  
  // Handle add item
  const handleAddItem = (id: string) => {
    console.log('Adding item with ID:', id, 'Type:', typeof id);
    console.log('Available menu items:', menuItems.map(item => ({ id: item.id, name: item.name })));
    
    const itemExists = selectedItems.some(item => item.id.toString() === id);
    
    if (itemExists) {
      toast({
        title: "Item already added",
        description: "This item is already in the menu. You can adjust the quantity instead.",
        variant: "destructive"
      });
      return;
    }
    
    const itemToAdd = menuItems.find((item: any) => item.id === id);
    console.log('Found item to add:', itemToAdd);
    
    if (itemToAdd) {
      const priceValue = itemToAdd.price ? Number(itemToAdd.price) * 100 : 0; // Convert to cents
      setSelectedItems([
        ...selectedItems,
        {
          id: itemToAdd.id,
          name: itemToAdd.name,
          price: priceValue,
          quantity: 1,
          category: itemToAdd.category
        }
      ]);
      
      toast({
        title: "Item added",
        description: `${itemToAdd.name} has been added to the menu.`,
      });
    } else {
      console.error('Item not found with ID:', id);
      toast({
        title: "Error",
        description: "Could not find the selected menu item.",
        variant: "destructive"
      });
    }
  };
  
  // Calculate total menu price per person
  const calculateTotalPrice = () => {
    return selectedItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please add at least one item to the menu.",
        variant: "destructive"
      });
      return;
    }
    
    // Format data for submission with proper types for Drizzle
    const formData = {
      ...values,
      // Map to the required format for the API
      items: selectedItems.map(item => ({
        id: item.id,
        quantity: item.quantity
      }))
    };

    console.log("Submitting menu data:", formData);
    mutation.mutate(formData);
  };
  
  // We no longer need this - MenuItemSelector handles grouping internally
  // Kept for reference
  /*
  const groupedMenuItems = menuItems.reduce((acc: any, item: any) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
  */
  
  // Use the getCategoryDisplayName function defined above
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Menu" : "Create New Menu"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menu Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Menu name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => {
                      const [isCustomMenuType, setIsCustomMenuType] = useState(false);
                      const [customMenuType, setCustomMenuType] = useState("");
                      
                      // Set custom menu type mode if the value doesn't match predefined ones
                      useEffect(() => {
                        if (field.value && !["standard", "custom", "seasonal", "form_builder"].includes(field.value)) {
                          setIsCustomMenuType(true);
                          setCustomMenuType(field.value);
                        }
                      }, [field.value]);
                      
                      return (
                        <FormItem>
                          <FormLabel>Menu Type</FormLabel>
                          {!isCustomMenuType ? (
                            <>
                              <Select 
                                onValueChange={(value) => {
                                  if (value === "add_custom") {
                                    setIsCustomMenuType(true);
                                    setCustomMenuType("");
                                  } else {
                                    field.onChange(value);
                                  }
                                }} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select menu type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                  <SelectItem value="seasonal">Seasonal</SelectItem>
                                  <SelectItem value="form_builder">Form Builder</SelectItem>
                                  <SelectItem value="add_custom">Add New Menu Type...</SelectItem>
                                </SelectContent>
                              </Select>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <FormControl>
                                <Input 
                                  placeholder="Enter custom menu type" 
                                  value={customMenuType}
                                  onChange={(e) => {
                                    setCustomMenuType(e.target.value);
                                    field.onChange(e.target.value);
                                  }}
                                />
                              </FormControl>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setIsCustomMenuType(false);
                                  field.onChange("");
                                }}
                              >
                                Back to Preset Menu Types
                              </Button>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
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
                          placeholder="Menu description"
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Form Builder UI - Show when type is "form_builder" */}
                {form.watch("type") === "form_builder" ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Menu Package Structure Builder</h3>
                    <p className="text-sm text-gray-600">Configure your menu package with complete JSONB structure according to MenuPackageStructure schema.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Theme Key */}
                      <FormField
                        control={form.control}
                        name="theme_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Theme Key</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., lebanese_cuisine"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                              />
                            </FormControl>
                            <p className="text-xs text-gray-500 mt-1">Unique theme identifier (e.g., "lebanese_cuisine")</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Package ID */}
                      <FormField
                        control={form.control}
                        name="package_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Package ID</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., lebanese_fiesta_deluxe_v1"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                              />
                            </FormControl>
                            <p className="text-xs text-gray-500 mt-1">Unique package identifier</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Package Name */}
                      <FormField
                        control={form.control}
                        name="package_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Package Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Lebanese Fiesta Deluxe Package"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                }}
                              />
                            </FormControl>
                            <p className="text-xs text-gray-500 mt-1">Display name for the package</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Price Per Person */}
                      <div>
                        <FormLabel>Price Per Person ($)</FormLabel>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="e.g., 65.00"
                          defaultValue="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Base price per person</p>
                      </div>
                      
                      {/* Min Guest Count */}
                      <div>
                        <FormLabel>Minimum Guest Count</FormLabel>
                        <Input 
                          type="number"
                          placeholder="e.g., 25"
                          defaultValue="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum number of guests required</p>
                      </div>
                      
                      {/* Customizable Toggle */}
                      <div className="flex items-center space-x-3">
                        <FormLabel>Customizable Package</FormLabel>
                        <input 
                          type="checkbox"
                          defaultChecked={true}
                          className="rounded"
                        />
                        <p className="text-xs text-gray-500">Allow clients to modify selections</p>
                      </div>
                    </div>
                    
                    {/* Package Description */}
                    <div>
                      <FormLabel>Package Description</FormLabel>
                      <Textarea 
                        rows={4}
                        placeholder="Detailed description of your menu package including what's included, dietary options, service style, etc."
                        defaultValue={`Custom menu: ${form.watch("name") || 'Untitled Package'}`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Rich description for client-facing displays</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Package Structure Preview</h4>
                      <p className="text-sm text-green-700">Your form data will generate a complete MenuPackageStructure with organized categories and all the details above.</p>
                    </div>
                    
                    {/* Menu Items Selection for Form Builder */}
                    <div>
                      <h3 className="text-lg font-medium mb-2">Menu Items Selection</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Select items to include in your package. They will be automatically organized by category.
                      </p>
                      
                      {selectedItems.length === 0 ? (
                        <div className="border border-dashed rounded-md p-6 text-center">
                          <p className="text-gray-500">
                            No items added yet. Use the panel on the right to add items.
                          </p>
                        </div>
                      ) : (
                        <DndContext 
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={selectedItems.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {selectedItems.map(item => (
                              <SortableMenuItem
                                key={item.id}
                                item={item}
                                onQuantityChange={handleQuantityChange}
                                onRemove={handleRemoveItem}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      )}
                      
                      <div className="mt-4 text-right text-lg">
                        <span className="font-medium">Total per person:</span>{" "}
                        <span className="font-bold">{formatCurrency(calculateTotalPrice() / 100)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Standard Menu Items UI - Show for other types
                <div>
                  <h3 className="text-lg font-medium mb-2">Menu Items</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop to reorder items. Adjust quantities as needed.
                  </p>
                  
                  {selectedItems.length === 0 ? (
                    <div className="border border-dashed rounded-md p-6 text-center">
                      <p className="text-gray-500">
                        No items added yet. Use the panel on the right to add items.
                      </p>
                    </div>
                  ) : (
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedItems.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {selectedItems.map(item => (
                          <SortableMenuItem
                            key={item.id}
                            item={item}
                            onQuantityChange={handleQuantityChange}
                            onRemove={handleRemoveItem}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                  
                  <div className="mt-4 text-right text-lg">
                    <span className="font-medium">Total per person:</span>{" "}
                    <span className="font-bold">{formatCurrency(calculateTotalPrice() / 100)}</span>
                  </div>
                </div>
                )}
                
                <CardFooter className="px-0 pt-4 flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/menus")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
                    disabled={mutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {mutation.isPending ? "Saving..." : "Save Menu"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Available Items</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMenuItems ? (
              <div className="text-center py-4">Loading items...</div>
            ) : (
              <div className="max-h-[700px] overflow-y-auto pr-2">
                {/* Use the new MenuItemSelector component with search and filtering */}
                <MenuItemSelector 
                  menuItems={menuItems.map(item => ({
                    ...item,
                    isVegetarian: item.isVegetarian || false,
                    isVegan: item.isVegan || false,
                    isGlutenFree: item.isGlutenFree || false,
                    isDairyFree: item.isDairyFree || false,
                    isNutFree: item.isNutFree || false,
                    description: item.description || '',
                  }))}
                  selectedItems={selectedItems.map(item => ({
                    ...item,
                    description: '',
                    isVegetarian: false,
                    isVegan: false, 
                    isGlutenFree: false,
                    isDairyFree: false,
                    isNutFree: false
                  }))}
                  onAddItem={handleAddItem}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
