// DietaryDemo.tsx - Demo page to showcase the enhanced dietary information system

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  Leaf, 
  Wheat, 
  AlertTriangle,
  TrendingUp,
  Users,
  CheckCircle
} from "lucide-react";

import { allMenuItems } from "@/data/generated";

export default function DietaryDemo() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const menuItemsList = allMenuItems || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Dietary Information Demo</h1>
        <p className="text-xl text-gray-600">
          Explore our comprehensive nutritional and dietary information system
        </p>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Menu Items</TabsTrigger>
          <TabsTrigger value="dietary">Dietary Filters</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItemsList.slice(0, 12).map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  
                  {item.dietaryFlags && item.dietaryFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.dietaryFlags.slice(0, 3).map(flag => (
                        <Badge key={flag} variant="secondary" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {item.nutritionalHighlights && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {item.nutritionalHighlights.calories && (
                        <div>Calories: {item.nutritionalHighlights.calories.min}-{item.nutritionalHighlights.calories.max}</div>
                      )}
                      {item.nutritionalHighlights.protein && (
                        <div>Protein: {item.nutritionalHighlights.protein.min}-{item.nutritionalHighlights.protein.max}g</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dietary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-green-600" />
                  Vegetarian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {menuItemsList.filter(item => item.isVegetarian).length}
                </p>
                <p className="text-sm text-gray-600">items available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  Vegan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {menuItemsList.filter(item => item.isVegan).length}
                </p>
                <p className="text-sm text-gray-600">items available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wheat className="h-5 w-5 text-amber-600" />
                  Gluten-Free
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">
                  {menuItemsList.filter(item => item.isGlutenFree).length}
                </p>
                <p className="text-sm text-gray-600">items available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  Dairy-Free
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                  {menuItemsList.filter(item => item.isDairyFree).length}
                </p>
                <p className="text-sm text-gray-600">items available</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nutrition" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nutritional Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Our menu items include comprehensive nutritional information including calories, 
                macronutrients, and dietary compatibility data sourced directly from our database.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <h4 className="font-medium">Detailed Macros</h4>
                  <p className="text-sm text-gray-600">Protein, carbs, fat, fiber</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                  <h4 className="font-medium">Allergen Alerts</h4>
                  <p className="text-sm text-gray-600">Complete allergen information</p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <h4 className="font-medium">Diet Compatibility</h4>
                  <p className="text-sm text-gray-600">Matches specific dietary needs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}