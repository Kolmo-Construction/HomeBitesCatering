// DietaryDemo.tsx - Demo page to showcase the enhanced dietary information system

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  Leaf, 
  Shield, 
  Info,
  ChefHat,
  Utensils 
} from "lucide-react";

import { 
  italianWeddingMenuDietaryData, 
  appetizerDietaryData,
  getDietaryInfoForItem,
  getNutritionalSummary 
} from "./wedding/data/enhancedWeddingMenuData";
import { 
  dietPreferenceProfiles,
  getRecommendationsForDiet,
  DietPreferenceCategory 
} from "./wedding/data/dietaryInformation";

export default function DietaryDemo() {
  const [selectedDiet, setSelectedDiet] = useState<DietPreferenceCategory>("BALANCED");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const allMenuItems = Object.keys(italianWeddingMenuDietaryData);
  const recommendations = getRecommendationsForDiet(
    Object.values(italianWeddingMenuDietaryData), 
    selectedDiet, 
    3
  );

  const nutritionalSummary = getNutritionalSummary(selectedItems);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Enhanced Wedding Menu Dietary System
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore how our comprehensive dietary information helps guide customers to their perfect menu choices
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="menu-items">Menu Items</TabsTrigger>
          <TabsTrigger value="diet-guidance">Diet Guidance</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5 text-pink-500" />
                  Menu Items Enhanced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-pink-500 mb-2">
                  {Object.keys(italianWeddingMenuDietaryData).length + Object.keys(appetizerDietaryData).length}
                </div>
                <p className="text-gray-600">Items with complete nutritional data including calories, macros, and dietary flags</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-500" />
                  Diet Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500 mb-2">
                  {Object.keys(dietPreferenceProfiles).length}
                </div>
                <p className="text-gray-600">Different dietary preferences supported from balanced to keto, vegan to high-protein</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  Allergen Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500 mb-2">
                  12+
                </div>
                <p className="text-gray-600">Common allergens and dietary restrictions tracked for safe menu planning</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sample Enhanced Menu Item</CardTitle>
              <p className="text-sm text-gray-600">Example of the detailed information now available for each menu item</p>
            </CardHeader>
            <CardContent>
              {(() => {
                const sampleItem = italianWeddingMenuDietaryData["chicken_saltimbocca_w"];
                return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{sampleItem.item_name}</h3>
                      <p className="text-sm text-gray-600 italic">{sampleItem.origin}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Calories</div>
                        <div className="text-sm">{sampleItem.nutritional_info.calories_range_kcal}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Protein</div>
                        <div className="text-sm">{sampleItem.nutritional_info.protein_g_range}g</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Carbs</div>
                        <div className="text-sm">{sampleItem.nutritional_info.carbs_g_range}g</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">Fat</div>
                        <div className="text-sm">{sampleItem.nutritional_info.fat_g_range}g</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Dietary Flags: </span>
                        {sampleItem.dietary_flags.map(flag => (
                          <Badge key={flag} variant="secondary" className="mr-1">
                            {flag.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                      
                      <div>
                        <span className="font-medium">Perfect for: </span>
                        {sampleItem.diet_preference_fit.map(diet => (
                          <Badge key={diet} variant="outline" className="mr-1">
                            {dietPreferenceProfiles[diet]?.name || diet}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">Customer Guidance</div>
                      <div className="text-sm text-blue-800">{sampleItem.guidance_for_customer}</div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu-items" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allMenuItems.slice(0, 6).map(itemId => {
              const item = getDietaryInfoForItem(itemId);
              if (!item) return null;

              const isSelected = selectedItems.includes(itemId);
              
              return (
                <Card 
                  key={itemId} 
                  className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-pink-500' : 'hover:shadow-md'}`}
                  onClick={() => {
                    setSelectedItems(prev => 
                      prev.includes(itemId) 
                        ? prev.filter(id => id !== itemId)
                        : [...prev, itemId]
                    );
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{item.item_name}</CardTitle>
                    <p className="text-sm text-gray-600">{item.nutritional_info.calories_range_kcal}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        {item.dietary_flags.slice(0, 3).map(flag => (
                          <Badge key={flag} variant="secondary" className="mr-1 text-xs">
                            {flag.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{item.guidance_for_customer}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Selection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="font-medium">Items Selected</div>
                    <div className="text-2xl font-bold text-pink-500">{nutritionalSummary.totalItems}</div>
                  </div>
                  <div>
                    <div className="font-medium">Common Diets</div>
                    <div className="text-sm">
                      {Object.entries(nutritionalSummary.commonDietFits)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 2)
                        .map(([diet]) => (
                          <Badge key={diet} variant="outline" className="mr-1 text-xs">
                            {dietPreferenceProfiles[diet as DietPreferenceCategory]?.name || diet}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Dietary Flags</div>
                    <div className="text-xs">
                      {nutritionalSummary.dietaryFlags.slice(0, 3).map(flag => (
                        <Badge key={flag} variant="secondary" className="mr-1 text-xs">
                          {flag.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Allergens</div>
                    <div className="text-xs">
                      {nutritionalSummary.allergens.length > 0 ? (
                        nutritionalSummary.allergens.slice(0, 2).map(allergen => (
                          <Badge key={allergen} variant="destructive" className="mr-1 text-xs">
                            {allergen.replace(/CONTAINS_|_/g, " ").toLowerCase()}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="text-xs">No allergens</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="diet-guidance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Your Dietary Preference</CardTitle>
              <p className="text-sm text-gray-600">Choose your primary dietary goal to see personalized guidance</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(dietPreferenceProfiles).slice(0, 9).map(([key, profile]) => (
                  <Button
                    key={key}
                    variant={selectedDiet === key ? "default" : "outline"}
                    onClick={() => setSelectedDiet(key as DietPreferenceCategory)}
                    className="h-auto p-3 text-left flex-col items-start"
                  >
                    <div className="font-medium text-sm">{profile.name}</div>
                    <div className="text-xs opacity-70 mt-1">{profile.description}</div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Your Diet Profile: {dietPreferenceProfiles[selectedDiet].name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">{dietPreferenceProfiles[selectedDiet].description}</p>
                
                <div>
                  <div className="font-medium mb-2">Priority Nutrients:</div>
                  <div className="flex flex-wrap gap-2">
                    {dietPreferenceProfiles[selectedDiet].priority_nutrients.map(nutrient => (
                      <Badge key={nutrient} variant="secondary">
                        {nutrient}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-medium mb-2">Preferred Food Characteristics:</div>
                  <div className="flex flex-wrap gap-2">
                    {dietPreferenceProfiles[selectedDiet].prefer_flags.map(flag => (
                      <Badge key={flag} variant="outline">
                        {flag.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-pink-500" />
                Recommended for {dietPreferenceProfiles[selectedDiet].name}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Menu items that best match your dietary preferences
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((item, index) => (
                  <div key={item.item_name} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.item_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.guidance_for_customer}</p>
                        
                        <div className="mt-3 space-y-2">
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Calories:</span>
                              <div>{item.nutritional_info.calories_range_kcal}</div>
                            </div>
                            <div>
                              <span className="font-medium">Protein:</span>
                              <div>{item.nutritional_info.protein_g_range}g</div>
                            </div>
                            <div>
                              <span className="font-medium">Carbs:</span>
                              <div>{item.nutritional_info.carbs_g_range}g</div>
                            </div>
                            <div>
                              <span className="font-medium">Fat:</span>
                              <div>{item.nutritional_info.fat_g_range}g</div>
                            </div>
                          </div>

                          <div>
                            {item.dietary_flags.map(flag => (
                              <Badge key={flag} variant="secondary" className="mr-1 text-xs">
                                {flag.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        <Badge variant="default" className="bg-pink-500">
                          #{index + 1} Match
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}