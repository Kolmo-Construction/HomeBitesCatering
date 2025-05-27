import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import MenuItemList from "@/components/menu/MenuItemList";
import MenuItemForm from "@/components/menu/MenuItemForm";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function MenuItems() {
  const [location] = useLocation();
  const [mode, setMode] = useState<"list" | "new" | "edit" | "view">("list");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Extract mode and ID from location
  useEffect(() => {
    if (location === "/menu-items") {
      setMode("list");
      setSelectedItemId(null);
    } else if (location === "/menu-items/new") {
      setMode("new");
      setSelectedItemId(null);
    } else if (location.match(/^\/menu-items\/[^\/]+\/edit$/)) {
      setMode("edit");
      setSelectedItemId(location.split("/")[2]);
    } else if (location.match(/^\/menu-items\/[^\/]+$/)) {
      setMode("view");
      setSelectedItemId(location.split("/")[2]);
    }
  }, [location]);
  
  // Fetch menu item data if editing or viewing
  const { data: menuItem, isLoading } = useQuery({
    queryKey: ["/api/menu-items", selectedItemId],
    queryFn: async () => {
      const response = await fetch(`/api/menu-items/${selectedItemId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu item');
      }
      return response.json();
    },
    enabled: (mode === "edit" || mode === "view") && !!selectedItemId,
  });
  
  // Helper function to get category label
  const getCategoryLabel = (category: string) => {
    const categoryLabels: Record<string, string> = {
      appetizer: "Appetizer",
      entree: "Main Course",
      side: "Side",
      dessert: "Dessert",
      beverage: "Beverage"
    };
    return categoryLabels[category] || category;
  };
  
  // Render appropriate component based on mode
  if (mode === "list") {
    return <MenuItemList />;
  }
  
  if (mode === "new") {
    return <MenuItemForm />;
  }
  
  if ((mode === "edit" || mode === "view") && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
      </div>
    );
  }
  
  // Log menuItem data for debugging
  console.log("MenuItem data for edit mode:", menuItem);
  
  if (mode === "edit" && menuItem) {
    // Format price from cents to dollars before passing to form
    const formattedMenuItem = {
      ...menuItem,
      // If price is null, keep it as null to allow editing optional prices
      price: menuItem.price === null ? null : (typeof menuItem.price === 'number' ? menuItem.price : 0)
    };
    
    return <MenuItemForm menuItem={formattedMenuItem} isEditing={true} />;
  }
  
  if (mode === "view" && menuItem) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{menuItem.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
                  <p>{getCategoryLabel(menuItem.category)}</p>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Price Per Person</h3>
                  <p className="text-xl font-semibold">{menuItem.price ? formatCurrency(menuItem.price) : 'Price not set'}</p>
                </div>
                
                {menuItem.description && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                    <p className="text-gray-700">{menuItem.description}</p>
                  </div>
                )}
                
                {menuItem.ingredients && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Ingredients</h3>
                    <p className="text-gray-700">{menuItem.ingredients}</p>
                  </div>
                )}
              </div>
              
              <div>
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Dietary Information</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {menuItem.isVegetarian && (
                      <Badge variant="outline" className="bg-green-50">Vegetarian</Badge>
                    )}
                    {menuItem.isVegan && (
                      <Badge variant="outline" className="bg-green-50">Vegan</Badge>
                    )}
                    {menuItem.isGlutenFree && (
                      <Badge variant="outline" className="bg-yellow-50">Gluten-Free</Badge>
                    )}
                    {menuItem.isDairyFree && (
                      <Badge variant="outline" className="bg-blue-50">Dairy-Free</Badge>
                    )}
                    {menuItem.isNutFree && (
                      <Badge variant="outline" className="bg-orange-50">Nut-Free</Badge>
                    )}
                    {!menuItem.isVegetarian && !menuItem.isVegan && 
                     !menuItem.isGlutenFree && !menuItem.isDairyFree && 
                     !menuItem.isNutFree && (
                      <span className="text-gray-500">No special dietary information</span>
                    )}
                  </div>
                </div>
                
                {menuItem.image && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Image</h3>
                    <img 
                      src={menuItem.image} 
                      alt={menuItem.name} 
                      className="rounded-md mt-2 max-w-full h-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Menu Item Not Found</h2>
      <p className="text-gray-600">The menu item you're looking for doesn't exist or has been deleted.</p>
    </div>
  );
}
