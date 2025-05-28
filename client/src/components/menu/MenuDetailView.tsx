import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Edit, X, Eye, EyeOff } from 'lucide-react';

interface MenuDetailViewProps {
  menu: any;
  onUpdate?: () => void;
}

export default function MenuDetailView({ menu, onUpdate }: MenuDetailViewProps) {
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [itemsJson, setItemsJson] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all menu items for enrichment
  const { data: allMenuItems = [] } = useQuery({
    queryKey: ['/api/menu-items'],
  });

  // Parse and enrich menu items with full details
  const menuItemsWithDetails = useMemo(() => {
    if (!menu?.items) return [];
    
    try {
      const itemsData = typeof menu.items === 'string' 
        ? JSON.parse(menu.items) 
        : menu.items;
      
      if (!Array.isArray(itemsData)) return [];
      
      // Enrich with details from menu items database
      return itemsData.map((item: any) => {
        const menuItem = allMenuItems.find((mi: any) => mi.id === item.id);
        console.log(`Looking for menu item with ID: ${item.id}`, menuItem);
        return {
          id: item.id,
          quantity: item.quantity,
          name: menuItem?.name || `Unknown Item (${item.id})`,
          category: menuItem?.category || 'Unknown',
          price: menuItem?.price || 0,
          description: menuItem?.description || 'No description available',
          additional_dietary_metadata: menuItem?.additional_dietary_metadata,
          // Keep original structure for editing
          originalItem: item
        };
      });
    } catch (error) {
      console.error("Error parsing menu items:", error);
      return [];
    }
  }, [menu?.items, allMenuItems]);

  // Helper function to format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Helper function to calculate total price
  const calculateTotalPrice = () => {
    return menuItemsWithDetails.reduce((total, item) => {
      return total + (Number(item.price || 0) * item.quantity);
    }, 0);
  };

  // Initialize JSON editing with current items
  const handleStartEditing = () => {
    const currentItems = menuItemsWithDetails.map(item => item.originalItem);
    setItemsJson(JSON.stringify(currentItems, null, 2));
    setIsEditingItems(true);
  };

  // Mutation to update menu items
  const updateMenuMutation = useMutation({
    mutationFn: async (newItems: any) => {
      const response = await fetch(`/api/menus/${menu.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...menu,
          items: newItems
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update menu');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menus'] });
      setIsEditingItems(false);
      onUpdate?.();
      toast({
        title: "Success",
        description: "Menu items updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update menu items",
        variant: "destructive",
      });
    },
  });

  const handleSaveItems = () => {
    try {
      const parsedItems = JSON.parse(itemsJson);
      updateMenuMutation.mutate(parsedItems);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON format",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Menu Items</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowRawJson(!showRawJson)}
                variant="outline"
                size="sm"
              >
                {showRawJson ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showRawJson ? "Hide JSON" : "Show JSON"}
              </Button>
              <Button
                onClick={isEditingItems ? () => setIsEditingItems(false) : handleStartEditing}
                variant="outline"
                size="sm"
              >
                {isEditingItems ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                {isEditingItems ? "Cancel" : "Edit Items"}
              </Button>
            </div>
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
                <Button 
                  onClick={handleSaveItems}
                  disabled={updateMenuMutation.isPending}
                >
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
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No items in this menu</p>
                  <p className="text-sm text-gray-400">Add items using the menu builder to see them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Menu Items ({menuItemsWithDetails.length})</h4>
                    <p className="text-sm text-blue-700">
                      Total estimated cost: {formatPrice(calculateTotalPrice())} per person
                    </p>
                  </div>
                  
                  <div className="grid gap-4">
                    {menuItemsWithDetails.map((item, index) => (
                      <div key={`${item.id}-${index}`} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                              <span className="text-sm text-gray-500">
                                Qty: {item.quantity}
                              </span>
                              {item.price > 0 && (
                                <span className="text-sm font-medium text-green-600">
                                  {formatPrice(item.price)} each
                                </span>
                              )}
                            </div>
                            {item.description && item.description !== 'No description available' && (
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
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}