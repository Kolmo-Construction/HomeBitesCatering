import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, X, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Types
interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  isVegetarian: boolean | null;
  isVegan: boolean | null;
  isGlutenFree: boolean | null;
  isDairyFree: boolean | null;
  isNutFree: boolean | null;
}

interface MenuItemWithQuantity extends MenuItem {
  quantity: number;
}

interface MenuItemSelectorProps {
  menuItems: MenuItem[];
  selectedItems: MenuItemWithQuantity[];
  onAddItem: (id: string) => void;
}

interface MenuFilters {
  search: string;
  category: string;
  dietary: {
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isNutFree: boolean;
  };
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

export default function MenuItemSelector({ menuItems, selectedItems, onAddItem }: MenuItemSelectorProps) {
  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(menuItems.map(item => item.category))) as string[];
  }, [menuItems]);
  
  // Initialize filters
  const [filters, setFilters] = useState<MenuFilters>({
    search: "",
    category: "",
    dietary: {
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      isNutFree: false,
    }
  });
  
  // Filter menu items based on search, category, and dietary preferences
  const filteredMenuItems = useMemo(() => {
    if (!menuItems || menuItems.length === 0) return [];
    
    return menuItems.filter((item) => {
      // Search filter
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !(item.description && item.description.toLowerCase().includes(filters.search.toLowerCase()))) {
        return false;
      }
      
      // Category filter
      if (filters.category && item.category !== filters.category) {
        return false;
      }
      
      // Dietary filters
      if (filters.dietary.isVegetarian && !item.isVegetarian) return false;
      if (filters.dietary.isVegan && !item.isVegan) return false;
      if (filters.dietary.isGlutenFree && !item.isGlutenFree) return false;
      if (filters.dietary.isDairyFree && !item.isDairyFree) return false;
      if (filters.dietary.isNutFree && !item.isNutFree) return false;
      
      return true;
    });
  }, [menuItems, filters]);
  
  // Group filtered items by category
  const groupedFilteredItems = useMemo(() => {
    return filteredMenuItems.reduce((acc: Record<string, MenuItem[]>, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});
  }, [filteredMenuItems]);
  
  // Handler for search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value });
  };
  
  // Handler for category selection
  const handleCategoryChange = (value: string) => {
    // If "all" is selected, treat it as empty string for filtering logic
    const categoryValue = value === "all" ? "" : value;
    setFilters({ ...filters, category: categoryValue });
  };
  
  // Handler for dietary filter changes
  const handleDietaryChange = (key: keyof MenuFilters['dietary'], checked: boolean) => {
    setFilters({
      ...filters,
      dietary: {
        ...filters.dietary,
        [key]: checked
      }
    });
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilters({
      search: "",
      category: "",
      dietary: {
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isNutFree: false,
      }
    });
  };
  
  // Are any filters active?
  const hasActiveFilters = 
    filters.search !== "" || 
    filters.category !== "" || 
    Object.values(filters.dietary).some(v => v);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Search */}
          <div>
            <Label htmlFor="menu-item-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="menu-item-search"
                placeholder="Search menu items..."
                value={filters.search}
                onChange={handleSearchChange}
                className="pl-8"
              />
            </div>
          </div>
          
          {/* Category Filter */}
          <div>
            <Label htmlFor="menu-item-category">Category</Label>
            <Select value={filters.category} onValueChange={handleCategoryChange}>
              <SelectTrigger id="menu-item-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{getCategoryDisplayName(category)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Dietary Filters */}
        <div>
          <Label className="mb-2 block">Dietary Restrictions</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="menu-filter-isVegetarian" 
                checked={filters.dietary.isVegetarian}
                onCheckedChange={(checked) => handleDietaryChange('isVegetarian', checked as boolean)}
              />
              <label 
                htmlFor="menu-filter-isVegetarian" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Vegetarian
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="menu-filter-isVegan" 
                checked={filters.dietary.isVegan}
                onCheckedChange={(checked) => handleDietaryChange('isVegan', checked as boolean)}
              />
              <label 
                htmlFor="menu-filter-isVegan" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Vegan
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="menu-filter-isGlutenFree" 
                checked={filters.dietary.isGlutenFree}
                onCheckedChange={(checked) => handleDietaryChange('isGlutenFree', checked as boolean)}
              />
              <label 
                htmlFor="menu-filter-isGlutenFree" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Gluten-Free (GF)
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="menu-filter-isDairyFree" 
                checked={filters.dietary.isDairyFree}
                onCheckedChange={(checked) => handleDietaryChange('isDairyFree', checked as boolean)}
              />
              <label 
                htmlFor="menu-filter-isDairyFree" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Dairy-Free (DF)
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="menu-filter-isNutFree" 
                checked={filters.dietary.isNutFree}
                onCheckedChange={(checked) => handleDietaryChange('isNutFree', checked as boolean)}
              />
              <label 
                htmlFor="menu-filter-isNutFree" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Nut-Free (NF)
              </label>
            </div>
          </div>
        </div>
        
        {/* Reset Filters */}
        {hasActiveFilters && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={resetFilters} 
              size="sm"
              className="text-sm"
            >
              <X className="mr-1 h-3 w-3" /> Clear Filters
            </Button>
          </div>
        )}
        
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.search && (
              <Badge variant="secondary" className="px-3 py-1">
                Search: {filters.search}
                <button onClick={() => setFilters({...filters, search: ""})} className="ml-2">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {filters.category && (
              <Badge variant="secondary" className="px-3 py-1">
                Category: {getCategoryDisplayName(filters.category)}
                <button onClick={() => setFilters({...filters, category: ""})} className="ml-2">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {Object.entries(filters.dietary).map(([key, value]) => {
              if (!value) return null;
              
              const label = {
                isVegetarian: 'Vegetarian',
                isVegan: 'Vegan',
                isGlutenFree: 'Gluten-Free',
                isDairyFree: 'Dairy-Free',
                isNutFree: 'Nut-Free'
              }[key as keyof MenuFilters['dietary']];
              
              return (
                <Badge key={key} variant="secondary" className="px-3 py-1">
                  {label}
                  <button 
                    onClick={() => handleDietaryChange(key as keyof MenuFilters['dietary'], false)} 
                    className="ml-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Results count */}
      {hasActiveFilters && (
        <div className="text-sm text-gray-500 mb-2">
          Found {filteredMenuItems.length} item{filteredMenuItems.length !== 1 ? 's' : ''} 
          {filters.search ? ` matching "${filters.search}"` : ''}
          {filters.category ? ` in category "${getCategoryDisplayName(filters.category)}"` : ''}
          {Object.values(filters.dietary).some(v => v) ? ' with selected dietary restrictions' : ''}
        </div>
      )}
      
      {/* Menu Items By Category */}
      <div className="space-y-6">
        {Object.keys(groupedFilteredItems).length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500">
            No items found matching your filters. Try adjusting your search criteria.
          </div>
        ) : (
          Object.entries(groupedFilteredItems).map(([category, items]) => (
            <div key={category} className="rounded-md border p-4">
              <h3 className="font-medium mb-3">{getCategoryDisplayName(category)}</h3>
              <div className="space-y-2">
                {items.map((item) => {
                  const isSelected = selectedItems.some(selectedItem => selectedItem.id === item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3 border rounded-md flex justify-between items-center
                        ${isSelected ? 'bg-gray-100 border-gray-300' : 'bg-white hover:bg-gray-50'}`}
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                        <div className="text-sm text-gray-500 mt-1">
                          {item.price ? formatCurrency(Number(item.price)) : 'Price not set'}
                        </div>
                        <div className="flex mt-1 gap-1">
                          {item.isVegetarian && <Badge variant="outline" className="text-xs">Veg</Badge>}
                          {item.isVegan && <Badge variant="outline" className="text-xs">Vegan</Badge>}
                          {item.isGlutenFree && <Badge variant="outline" className="text-xs">GF</Badge>}
                          {item.isDairyFree && <Badge variant="outline" className="text-xs">DF</Badge>}
                          {item.isNutFree && <Badge variant="outline" className="text-xs">NF</Badge>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddItem(item.id.toString())}
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
          ))
        )}
      </div>
    </div>
  );
}