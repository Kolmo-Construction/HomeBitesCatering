import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type MenuFilters = {
  search: string;
  category: string;
  dietary: {
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isNutFree: boolean;
  };
};

interface MenuItemFiltersProps {
  onFilterChange: (filters: MenuFilters) => void;
}

export default function MenuItemFilters({ onFilterChange }: MenuItemFiltersProps) {
  // Query to get all unique categories from the API
  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/menu-items"],
    queryFn: async () => {
      const res = await fetch('/api/menu-items');
      if (!res.ok) throw new Error('Failed to fetch menu items');
      return res.json();
    }
  });
  
  // Extract unique categories from menu items
  const categories = Array.from(new Set(menuItems.map((item: any) => item.category))) as string[];
  
  // Initialize filters state
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
  
  // Update parent component when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);
  
  // Handler for search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value });
  };
  
  // Handler for category selection
  const handleCategoryChange = (value: string) => {
    setFilters({ ...filters, category: value });
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
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Search */}
        <div>
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="search"
              placeholder="Search menu items..."
              value={filters.search}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
        </div>
        
        {/* Category Filter */}
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={filters.category} onValueChange={handleCategoryChange}>
            <SelectTrigger id="category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Reset Button */}
        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={resetFilters} 
            disabled={!hasActiveFilters}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </div>
      </div>
      
      {/* Dietary Filters */}
      <div className="mt-4">
        <Label className="mb-2 block">Dietary Restrictions</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isVegetarian" 
              checked={filters.dietary.isVegetarian}
              onCheckedChange={(checked) => handleDietaryChange('isVegetarian', checked as boolean)}
            />
            <label 
              htmlFor="isVegetarian" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Vegetarian
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isVegan" 
              checked={filters.dietary.isVegan}
              onCheckedChange={(checked) => handleDietaryChange('isVegan', checked as boolean)}
            />
            <label 
              htmlFor="isVegan" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Vegan
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isGlutenFree" 
              checked={filters.dietary.isGlutenFree}
              onCheckedChange={(checked) => handleDietaryChange('isGlutenFree', checked as boolean)}
            />
            <label 
              htmlFor="isGlutenFree" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Gluten-Free (GF)
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isDairyFree" 
              checked={filters.dietary.isDairyFree}
              onCheckedChange={(checked) => handleDietaryChange('isDairyFree', checked as boolean)}
            />
            <label 
              htmlFor="isDairyFree" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Dairy-Free (DF)
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isNutFree" 
              checked={filters.dietary.isNutFree}
              onCheckedChange={(checked) => handleDietaryChange('isNutFree', checked as boolean)}
            />
            <label 
              htmlFor="isNutFree" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Nut-Free (NF)
            </label>
          </div>
        </div>
      </div>
      
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
              Category: {filters.category}
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
  );
}