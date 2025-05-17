import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutritionSummaryProps {
  nutritionData: NutritionalInfo;
  guestCount?: number;
  detailed?: boolean;
}

const NutritionSummary: React.FC<NutritionSummaryProps> = ({ 
  nutritionData, 
  guestCount = 1,
  detailed = false 
}) => {
  // Calculate per-guest nutrition
  const perGuest = {
    calories: Math.round(nutritionData.calories / guestCount),
    protein: Math.round(nutritionData.protein / guestCount),
    carbs: Math.round(nutritionData.carbs / guestCount),
    fat: Math.round(nutritionData.fat / guestCount),
    fiber: Math.round(nutritionData.fiber / guestCount)
  };
  
  // Calculate macronutrient percentages
  const totalCalories = nutritionData.calories || 1; // Avoid division by zero
  
  const proteinPercentage = Math.round((nutritionData.protein * 4 / totalCalories) * 100);
  const carbsPercentage = Math.round((nutritionData.carbs * 4 / totalCalories) * 100);
  const fatPercentage = Math.round((nutritionData.fat * 9 / totalCalories) * 100);
  
  // Dietary insights for the selected menu
  const getDietaryInsights = () => {
    const insights = [];
    
    // Protein adequacy
    if (perGuest.protein < 15) {
      insights.push('Low protein per guest. Consider adding more protein-rich options.');
    } else if (perGuest.protein > 40) {
      insights.push('High protein menu, suitable for athletic events or fitness-focused groups.');
    }
    
    // Carb assessment
    if (carbsPercentage > 60) {
      insights.push('Carb-heavy menu. Consider balancing with more protein or vegetable options.');
    } else if (carbsPercentage < 30 && perGuest.carbs < 50) {
      insights.push('Low-carb menu, suitable for guests following keto or low-carb diets.');
    }
    
    // Fiber assessment
    if (perGuest.fiber < 5) {
      insights.push('Low fiber content. Consider adding more vegetables, fruits, or whole grains.');
    } else if (perGuest.fiber > 15) {
      insights.push('High fiber content, great for digestive health.');
    }
    
    // Balance assessment
    const isBalanced = proteinPercentage > 15 && proteinPercentage < 35 && 
                      carbsPercentage > 30 && carbsPercentage < 60 && 
                      fatPercentage > 20 && fatPercentage < 40;
    
    if (isBalanced) {
      insights.push('Well-balanced macronutrient profile, suitable for a general audience.');
    }
    
    return insights;
  };

  // If no nutrition data, show a placeholder
  if (nutritionData.calories === 0) {
    return (
      <Card className="bg-gray-50 border">
        <CardContent className="p-4 text-center">
          <p className="text-gray-500">Select menu items to view nutritional information</p>
        </CardContent>
      </Card>
    );
  }

  // Simplified view for non-detailed mode
  if (!detailed) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Total Calories:</span>
          <span>{nutritionData.calories} kcal</span>
        </div>
        
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium">Per Guest:</span>
          <span>{perGuest.calories} kcal</span>
        </div>
        
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">Protein: {proteinPercentage}%</span>
          <Progress value={proteinPercentage} className="h-2 w-[100px]" />
        </div>
        
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium">Carbs: {carbsPercentage}%</span>
          <Progress value={carbsPercentage} className="h-2 w-[100px]" />
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Fat: {fatPercentage}%</span>
          <Progress value={fatPercentage} className="h-2 w-[100px]" />
        </div>
      </div>
    );
  }

  // Detailed view
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium">Overall</h4>
          <div className="bg-white p-3 rounded-md border">
            <div className="flex justify-between mb-2">
              <span>Total Calories:</span>
              <span className="font-semibold">{nutritionData.calories} kcal</span>
            </div>
            <div className="flex justify-between">
              <span>Per Guest ({guestCount}):</span>
              <span className="font-semibold">{perGuest.calories} kcal</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Macronutrient Balance</h4>
          <div className="bg-white p-3 rounded-md border">
            <div className="flex justify-between items-center mb-2">
              <span>Protein: {proteinPercentage}%</span>
              <Progress value={proteinPercentage} className="h-2 w-[120px]" />
            </div>
            <div className="flex justify-between items-center mb-2">
              <span>Carbs: {carbsPercentage}%</span>
              <Progress value={carbsPercentage} className="h-2 w-[120px]" />
            </div>
            <div className="flex justify-between items-center">
              <span>Fat: {fatPercentage}%</span>
              <Progress value={fatPercentage} className="h-2 w-[120px]" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-white p-3 rounded-md border text-center">
          <div className="text-xl font-semibold">{perGuest.protein}g</div>
          <div className="text-sm text-gray-500">Protein per guest</div>
        </div>
        <div className="bg-white p-3 rounded-md border text-center">
          <div className="text-xl font-semibold">{perGuest.carbs}g</div>
          <div className="text-sm text-gray-500">Carbs per guest</div>
        </div>
        <div className="bg-white p-3 rounded-md border text-center">
          <div className="text-xl font-semibold">{perGuest.fat}g</div>
          <div className="text-sm text-gray-500">Fat per guest</div>
        </div>
        <div className="bg-white p-3 rounded-md border text-center">
          <div className="text-xl font-semibold">{perGuest.fiber}g</div>
          <div className="text-sm text-gray-500">Fiber per guest</div>
        </div>
      </div>
      
      {/* Dietary insights */}
      <div className="space-y-2">
        <h4 className="font-medium">Dietary Insights</h4>
        <div className="bg-white p-3 rounded-md border">
          <div className="space-y-2">
            {getDietaryInsights().length > 0 ? (
              getDietaryInsights().map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-600">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </div>
                  <p className="text-sm">{insight}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No specific dietary insights available for the current selection.</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Diet type badges */}
      <div className="pt-2">
        <div className="flex flex-wrap gap-2">
          {perGuest.carbs < 50 && nutritionData.calories > 0 && (
            <Badge variant="outline" className="bg-blue-50">Low Carb Friendly</Badge>
          )}
          {proteinPercentage > 30 && nutritionData.calories > 0 && (
            <Badge variant="outline" className="bg-blue-50">High Protein</Badge>
          )}
          {perGuest.fiber > 10 && nutritionData.calories > 0 && (
            <Badge variant="outline" className="bg-blue-50">High Fiber</Badge>
          )}
          {fatPercentage < 25 && nutritionData.calories > 0 && (
            <Badge variant="outline" className="bg-blue-50">Low Fat</Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionSummary;