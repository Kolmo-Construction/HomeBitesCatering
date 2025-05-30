// src/pages/wedding/components/DatabaseMenuThemesStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";
import { generatedMenusByTheme } from "../data/generatedMenuData";

interface DatabaseMenuThemesStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const DatabaseMenuThemesStep: React.FC<DatabaseMenuThemesStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { setValue, watch } = useFormContext<WeddingInquiryFormData>();
  
  const selectedTheme = watch("requestedTheme");

  const handleThemeSelection = (themeKey: string) => {
    setValue("requestedTheme", themeKey);
    setValue("selectedPackages", {});
    setValue("menuSelections", {
      proteins: [],
      sides: [],
      salads: [],
      salsas: [],
      desserts: [],
      addons: []
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Database Menu Themes</h2>
        <p className="text-2xl font-semibold text-pink-600 mb-4">
          Choose From Our Curated Restaurant-Quality Menus
        </p>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          These menus are built from our comprehensive database with detailed nutritional information and dietary options.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {Object.entries(generatedMenusByTheme).map(([themeKey, theme]) => (
          <Card
            key={themeKey}
            className={`overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 rounded-lg ${
              selectedTheme === themeKey ? "ring-4 ring-pink-500 ring-offset-2 scale-105" : "border-gray-200"
            }`}
            onClick={() => handleThemeSelection(themeKey)}
          >
            <CardHeader className="bg-gray-50 p-4">
              <CardTitle className="text-xl font-semibold text-gray-800">{theme.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4 text-sm">
                {theme.description || `Experience authentic ${theme.name} cuisine with ${theme.totalItemCount} menu items.`}
              </p>
              <div className="text-xs text-gray-500 mb-3">
                {theme.totalItemCount} menu items available
              </div>
              <Button
                variant={selectedTheme === themeKey ? "default" : "outline"}
                size="sm"
                className={`w-full ${
                  selectedTheme === themeKey 
                    ? 'bg-pink-600 hover:bg-pink-700' 
                    : 'text-pink-600 border-pink-600 hover:bg-pink-50'
                }`}
              >
                {selectedTheme === themeKey ? "Selected Theme" : "Select This Theme"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Show selected theme details */}
      {selectedTheme && generatedMenusByTheme[selectedTheme] && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">
            {generatedMenusByTheme[selectedTheme].name} - Menu Preview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedMenusByTheme[selectedTheme].allItems.slice(0, 6).map((item) => (
              <div key={item.id} className="border rounded-lg p-3">
                <h4 className="font-medium text-sm">{item.name}</h4>
                <p className="text-xs text-gray-600 mt-1">{item.category}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.isVegetarian && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Vegetarian
                    </span>
                  )}
                  {item.isVegan && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Vegan
                    </span>
                  )}
                  {item.isGlutenFree && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Gluten Free
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {generatedMenusByTheme[selectedTheme].allItems.length > 6 && (
            <p className="text-sm text-gray-500 mt-4">
              ...and {generatedMenusByTheme[selectedTheme].allItems.length - 6} more items
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between mt-10">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious} 
          className="flex items-center px-6 py-3 text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button 
          type="button" 
          onClick={onNext} 
          disabled={!selectedTheme}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white disabled:bg-gray-300"
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default DatabaseMenuThemesStep;