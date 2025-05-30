// src/pages/DatabaseMenuDemo.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { generatedMenusByTheme } from "@/pages/wedding/data/generatedMenuData";

const DatabaseMenuDemo = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3 text-gray-900">Database Menu Themes</h1>
        <p className="text-xl text-gray-600 mb-4">
          Generated from your menu database with complete nutritional information
        </p>
        <p className="text-lg text-gray-500">
          Total themes: {Object.keys(generatedMenusByTheme).length}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.entries(generatedMenusByTheme).map(([themeKey, theme]) => (
          <Card key={themeKey} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-800">{theme.name}</CardTitle>
                  <p className="text-gray-600 mt-1">Theme Key: {themeKey}</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {theme.totalItemCount} items
                </Badge>
              </div>
              {theme.description && (
                <p className="text-gray-700 mt-3">{theme.description}</p>
              )}
            </CardHeader>
            
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Sample Menu Items</h3>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {theme.allItems.slice(0, 8).map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      {item.price > 0 && (
                        <span className="text-sm text-green-600 font-medium">${item.price.toFixed(2)}</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.isVegetarian && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Vegetarian
                        </Badge>
                      )}
                      {item.isVegan && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Vegan
                        </Badge>
                      )}
                      {item.isGlutenFree && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Gluten Free
                        </Badge>
                      )}
                      {item.isDairyFree && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          Dairy Free
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Category: {item.category}
                    </div>
                    
                    {item.allergens && item.allergens.length > 0 && (
                      <div className="mt-2 text-xs text-red-600">
                        ⚠️ {item.allergens.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
                
                {theme.allItems.length > 8 && (
                  <div className="text-center py-4 text-gray-500 italic">
                    ...and {theme.allItems.length - 8} more items
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(generatedMenusByTheme).length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No database menu themes found.</div>
          <div className="text-gray-400 text-sm mt-2">
            Run the menu data generation script to populate this data.
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseMenuDemo;