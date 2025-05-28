import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Edit, Save, X, Eye, EyeOff } from "lucide-react";

interface MenuDetailViewProps {
  menu: any;
  onEdit?: () => void;
}

interface MenuItemDetails {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  additional_dietary_metadata?: any;
}

export default function MenuDetailView({ menu, onEdit }: MenuDetailViewProps) {
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [itemsJson, setItemsJson] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch menu items for details
  const { data: allMenuItems = [] } = useQuery({
    queryKey: ["/api/menu-items"],
  }) as { data: any[] };

  // Parse menu items from JSONB
  const getMenuItemsWithDetails = () => {
    if (!menu?.items) return [];
    
    try {
      const itemsData = typeof menu.items === 'string' 
        ? JSON.parse(menu.items) 
        : menu.items;
      
      if (!Array.isArray(itemsData)) return [];
      
      // Enrich with details from menu items database
      return itemsData.map((item: any) => {
        const menuItem = allMenuItems.find((mi: any) => mi.id === item.id);
        return {
          id: item.id,
          quantity: item.quantity,
          name: menuItem?.name || `Item #${item.id}`,
          category: menuItem?.category || 'Unknown',
          price: menuItem?.price || 0,
          description: menuItem?.description,
          additional_dietary_metadata: menuItem?.additional_dietary_metadata,
          // Keep original structure for editing
          originalItem: item
        };
      });
    } catch (error) {
      console.error("Error parsing menu items:", error);
      return [];
    }
  };

  const menuItemsWithDetails = getMenuItemsWithDetails();

  // Initialize JSON editor with current items
  const initializeJsonEditor = () => {
    try {
      const itemsData = typeof menu.items === 'string' 
        ? JSON.parse(menu.items) 
        : menu.items;
      setItemsJson(JSON.stringify(itemsData, null, 2));
    } catch (error) {
      setItemsJson('[]');
    }
  };

  // Mutation for updating menu items
  const updateMenuMutation = useMutation({
    mutationFn: async (newItems: any[]) => {
      const res = await apiRequest("PATCH", `/api/menus/${menu.id}`, {
        items: newItems
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus", menu.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu updated",
        description: "Menu items have been updated successfully."
      });
      setIsEditingItems(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update menu: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle saving JSON changes
  const handleSaveJson = () => {
    try {
      const parsedItems = JSON.parse(itemsJson);
      if (!Array.isArray(parsedItems)) {
        throw new Error("Items must be an array");
      }
      
      // Validate structure
      parsedItems.forEach((item, index) => {
        if (!item.id || typeof item.quantity !== 'number') {
          throw new Error(`Item at index ${index} must have 'id' and 'quantity' fields`);
        }
      });

      updateMenuMutation.mutate(parsedItems);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: error instanceof Error ? error.message : "Please check your JSON syntax",
        variant: "destructive"
      });
    }
  };

  // Calculate total price per person
  const calculateTotalPrice = () => {
    return menuItemsWithDetails.reduce((total, item) => {
      return total + (Number(item.price || 0) * item.quantity);
    }, 0);
  };

  // Format price display
  const formatPrice = (price: any) => {
    const numPrice = Number(price || 0);
    return `$${numPrice.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Menu Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{menu.name}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{menu.type}</Badge>
              <span className="text-sm text-gray-500">
                {menuItemsWithDetails.length} items
              </span>
              <span className="text-sm font-medium">
                Total: {formatPrice(calculateTotalPrice())} per person
              </span>
            </div>
          </div>
          {onEdit && (
            <Button onClick={onEdit} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Menu
            </Button>
          )}
        </CardHeader>
        {menu.description && (
          <CardContent>
            <p className="text-gray-600">{menu.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Menu Items Display */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Menu Items</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowRawJson(!showRawJson)}
              variant="outline"
              size="sm"
            >
              {showRawJson ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showRawJson ? "Hide" : "Show"} JSON
            </Button>
            <Button
              onClick={() => {
                if (!isEditingItems) {
                  initializeJsonEditor();
                }
                setIsEditingItems(!isEditingItems);
              }}
              variant="outline"
              size="sm"
            >
              {isEditingItems ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              {isEditingItems ? "Cancel" : "Edit Items"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingItems ? (
            <div className="space-y-4">
              <Label htmlFor="items-json">Menu Items JSON</Label>
              <Textarea
                id="items-json"
                value={itemsJson}
                onChange={(e) => setItemsJson(e.target.value)}
                rows={15}
                className="font-mono text-sm"
                placeholder='[{"id": "item_id", "quantity": 1}]'
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveJson} disabled={updateMenuMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateMenuMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditingItems(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {showRawJson && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <Label className="text-sm font-medium">Raw JSONB Data:</Label>
                  <pre className="mt-2 text-xs font-mono overflow-x-auto">
                    {JSON.stringify(menu.items, null, 2)}
                  </pre>
                </div>
              )}
              
              {menuItemsWithDetails.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items in this menu</p>
              ) : (
                <div className="grid gap-4">
                  {menuItemsWithDetails.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{item.category}</Badge>
                            <span className="text-sm text-gray-500">
                              Quantity: {item.quantity}
                            </span>
                            <span className="text-sm font-medium">
                              {formatPrice(item.price)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                          )}
                          
                          {/* Dietary Information */}
                          {item.additional_dietary_metadata && (
                            <div className="mt-3 space-y-2">
                              {item.additional_dietary_metadata.dietary_flags_list && (
                                <div className="flex flex-wrap gap-1">
                                  {item.additional_dietary_metadata.dietary_flags_list.map((flag: string) => (
                                    <Badge key={flag} variant="outline" className="text-xs">
                                      {flag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {item.additional_dietary_metadata.guidance_for_customer_short && (
                                <p className="text-xs text-blue-600 italic">
                                  {item.additional_dietary_metadata.guidance_for_customer_short}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Subtotal: {formatPrice(Number(item.price || 0) * item.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}