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

// Sortable item component
function SortableMenuItem({ 
  item, 
  onQuantityChange, 
  onRemove
}: { 
  item: MenuItemWithQuantity; 
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
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
        <div className="text-sm text-gray-500">
          {formatCurrency(item.price / 100)} • {item.category}
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
      
      // If items is an array, map it to the required format
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
  
  // Get all menu items
  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery({
    queryKey: ["/api/menu-items"],
  });
  
  // Update selected items with additional data from menu items when available
  useEffect(() => {
    if (isEditing && menu && menu.items && menuItems.length > 0) {
      console.log("Updating selected items with menu item details");
      const updatedItems = getMenuItems().map((item: MenuItemWithQuantity) => {
        // Try to find matching menu item to get additional details
        const menuItem = menuItems.find((mi: any) => mi.id === item.id);
        if (menuItem) {
          return {
            ...item,
            name: menuItem.name || item.name,
            price: menuItem.price || item.price,
            category: menuItem.category || item.category
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
          // items are handled separately in the selectedItems state
        }
      : {
          name: "",
          description: "",
          type: "standard",
          items: [],
        },
  });
  
  // Mutation for creating/updating menu
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Format items for API
      const formattedItems = selectedItems.map(item => ({
        id: item.id,
        quantity: item.quantity
      }));
      
      const payload = {
        ...values,
        items: formattedItems
      };
      
      if (isEditing && menu) {
        const res = await apiRequest("PATCH", `/api/menus/${menu.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/menus", payload);
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
  const handleQuantityChange = (id: number, quantity: number) => {
    setSelectedItems(items => 
      items.map(item => 
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };
  
  // Handle remove item
  const handleRemoveItem = (id: number) => {
    setSelectedItems(items => items.filter(item => item.id !== id));
  };
  
  // Handle add item
  const handleAddItem = (id: string) => {
    const selectedId = parseInt(id, 10);
    const itemExists = selectedItems.some(item => item.id === selectedId);
    
    if (itemExists) {
      toast({
        title: "Item already added",
        description: "This item is already in the menu. You can adjust the quantity instead.",
        variant: "destructive"
      });
      return;
    }
    
    const itemToAdd = menuItems.find((item: any) => item.id === selectedId);
    if (itemToAdd) {
      setSelectedItems([
        ...selectedItems,
        {
          id: itemToAdd.id,
          name: itemToAdd.name,
          price: itemToAdd.price,
          quantity: 1,
          category: itemToAdd.category
        }
      ]);
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
    
    // Format data for submission
    const formData = {
      ...values,
      // Stringify items array for database storage since the schema uses jsonb
      items: JSON.stringify(selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price, 
        quantity: item.quantity,
        category: item.category
      })))
    };

    console.log("Submitting menu data:", formData);
    mutation.mutate(formData);
  };
  
  // Group menu items by category for selection
  const groupedMenuItems = menuItems.reduce((acc: any, item: any) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
  
  // Category labels
  const categoryLabels: Record<string, string> = {
    appetizer: "Appetizers",
    entree: "Main Courses",
    side: "Sides",
    dessert: "Desserts",
    beverage: "Beverages"
  };
  
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menu Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select menu type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                            <SelectItem value="seasonal">Seasonal</SelectItem>
                          </SelectContent>
                        </Select>
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
                          placeholder="Menu description"
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              <div className="space-y-6">
                {Object.entries(groupedMenuItems).map(([category, items]: [string, any]) => (
                  <div key={category}>
                    <h3 className="font-medium mb-2">{categoryLabels[category] || category}</h3>
                    <div className="space-y-2">
                      {items.map((item: any) => {
                        const isSelected = selectedItems.some(selectedItem => selectedItem.id === item.id);
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`p-3 border rounded-md flex justify-between items-center
                              ${isSelected ? 'bg-gray-100 border-gray-300' : 'bg-white hover:bg-gray-50'}`}
                          >
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-500">{formatCurrency(item.price / 100)}</div>
                              <div className="flex mt-1 gap-1">
                                {item.isVegetarian && <Badge variant="outline" className="text-xs">Veg</Badge>}
                                {item.isVegan && <Badge variant="outline" className="text-xs">Vegan</Badge>}
                                {item.isGlutenFree && <Badge variant="outline" className="text-xs">GF</Badge>}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddItem(item.id.toString())}
                              disabled={isSelected}
                            >
                              {isSelected ? (
                                <span className="text-sm text-gray-500">Added</span>
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
