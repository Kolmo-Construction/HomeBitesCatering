// DietaryDashboard.tsx - Real-time dietary tracking sidebar/component

import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Heart, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Info
} from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";
import { 
  getDietaryInfoForItem, 
  getNutritionalSummary 
} from "../data/enhancedWeddingMenuData";
import { 
  dietPreferenceProfiles,
  getDietaryScore,
  DietPreferenceCategory 
} from "../data/dietaryInformation";

interface DietaryDashboardProps {
  isCollapsed?: boolean;
}

interface NutritionalTotals {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  itemCount: number;
}

export default function DietaryDashboard({ isCollapsed = false }: DietaryDashboardProps) {
  const { watch } = useFormContext<WeddingInquiryFormData>();
  
  const dietaryGuidance = watch("dietaryGuidance");
  const selectedMenuItems = watch("selectedMenuItems") || [];
  
  const primaryDietGoal = dietaryGuidance?.primaryDietGoal as DietPreferenceCategory;
  const dietaryRestrictions = dietaryGuidance?.dietaryRestrictions || [];
  const allergenConcerns = dietaryGuidance?.allergenConcerns || [];

  // Calculate nutritional totals from selected items
  const calculateNutritionalTotals = (): NutritionalTotals => {
    let totals = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      itemCount: 0
    };

    selectedMenuItems.forEach(itemId => {
      const dietaryInfo = getDietaryInfoForItem(itemId);
      if (dietaryInfo) {
        // Parse ranges and take average (e.g., "150-200" -> 175)
        const parseRange = (range: string): number => {
          const numbers = range.match(/\d+/g);
          if (numbers && numbers.length >= 2) {
            return (parseInt(numbers[0]) + parseInt(numbers[1])) / 2;
          } else if (numbers && numbers.length === 1) {
            return parseInt(numbers[0]);
          }
          return 0;
        };

        totals.totalCalories += parseRange(dietaryInfo.nutritional_info.calories_range_kcal);
        totals.totalProtein += parseRange(dietaryInfo.nutritional_info.protein_g_range);
        totals.totalCarbs += parseRange(dietaryInfo.nutritional_info.carbs_g_range);
        totals.totalFat += parseRange(dietaryInfo.nutritional_info.fat_g_range);
        totals.totalFiber += parseRange(dietaryInfo.nutritional_info.fiber_g_range);
        totals.itemCount++;
      }
    });

    return totals;
  };

  // Calculate compatibility score with chosen diet
  const calculateDietCompatibility = (): number => {
    if (!primaryDietGoal || selectedMenuItems.length === 0) return 0;

    const scores = selectedMenuItems.map(itemId => {
      const dietaryInfo = getDietaryInfoForItem(itemId);
      return dietaryInfo ? getDietaryScore(dietaryInfo, primaryDietGoal) : 0;
    });

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.min(100, (averageScore / 10) * 100); // Normalize to percentage
  };

  // Check for allergen conflicts
  const getAllergenConflicts = (): string[] => {
    const conflicts: string[] = [];
    
    selectedMenuItems.forEach(itemId => {
      const dietaryInfo = getDietaryInfoForItem(itemId);
      if (dietaryInfo) {
        dietaryInfo.allergen_alert.forEach(allergen => {
          allergenConcerns.forEach(concern => {
            if (allergen.includes(concern.replace("CONTAINS_", "")) && !conflicts.includes(allergen)) {
              conflicts.push(allergen);
            }
          });
        });
      }
    });

    return conflicts;
  };

  const nutritionalTotals = calculateNutritionalTotals();
  const compatibilityScore = calculateDietCompatibility();
  const allergenConflicts = getAllergenConflicts();
  const nutritionalSummary = getNutritionalSummary(selectedMenuItems);

  if (isCollapsed) {
    return (
      <div className="fixed top-20 right-4 z-50">
        <Card className="w-16 h-16 flex items-center justify-center bg-white shadow-lg">
          <div className="text-center">
            <div className="text-xs font-medium">{selectedMenuItems.length}</div>
            <div className="text-xs text-gray-500">items</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 space-y-4 max-h-screen overflow-y-auto">
      <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Target className="h-5 w-5 text-pink-500" />
        Dietary Dashboard
      </div>

      {/* Diet Goal Summary */}
      {primaryDietGoal && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-pink-500" />
              Your Diet Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="default" className="bg-pink-500">
                {dietPreferenceProfiles[primaryDietGoal]?.name}
              </Badge>
              <div className="text-xs text-gray-600">
                {dietPreferenceProfiles[primaryDietGoal]?.description}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compatibility Score */}
      {primaryDietGoal && selectedMenuItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Diet Compatibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Match Score</span>
                <span className="text-sm font-bold text-green-600">{Math.round(compatibilityScore)}%</span>
              </div>
              <Progress value={compatibilityScore} className="h-2" />
              <div className="text-xs text-gray-600">
                {compatibilityScore >= 80 && "Excellent match! Your selections align well with your goals."}
                {compatibilityScore >= 60 && compatibilityScore < 80 && "Good match with room for optimization."}
                {compatibilityScore >= 40 && compatibilityScore < 60 && "Fair match. Consider some adjustments."}
                {compatibilityScore < 40 && "Consider reviewing your selections for better alignment."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allergen Alerts */}
      {allergenConflicts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            <div className="font-medium text-red-800 mb-1">Allergen Alert!</div>
            <div className="text-sm text-red-700">
              {allergenConflicts.map(conflict => (
                <Badge key={conflict} variant="destructive" className="mr-1 mb-1 text-xs">
                  {conflict.replace(/CONTAINS_|_/g, " ").toLowerCase()}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Selections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-500" />
            Current Selections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-lg font-bold text-blue-600">{nutritionalTotals.itemCount}</div>
            <div className="text-xs text-gray-600">Menu items selected</div>
            
            {nutritionalTotals.itemCount > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium text-gray-700">Estimated Totals:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Calories:</span>
                    <div className="text-blue-600">{Math.round(nutritionalTotals.totalCalories)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Protein:</span>
                    <div className="text-green-600">{Math.round(nutritionalTotals.totalProtein)}g</div>
                  </div>
                  <div>
                    <span className="font-medium">Carbs:</span>
                    <div className="text-orange-600">{Math.round(nutritionalTotals.totalCarbs)}g</div>
                  </div>
                  <div>
                    <span className="font-medium">Fat:</span>
                    <div className="text-purple-600">{Math.round(nutritionalTotals.totalFat)}g</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dietary Flags Summary */}
      {nutritionalSummary.dietaryFlags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-500" />
              Dietary Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {nutritionalSummary.dietaryFlags.slice(0, 6).map(flag => (
                <Badge key={flag} variant="secondary" className="text-xs">
                  {flag.replace(/_/g, " ")}
                </Badge>
              ))}
              {nutritionalSummary.dietaryFlags.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{nutritionalSummary.dietaryFlags.length - 6} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      {primaryDietGoal && selectedMenuItems.length > 0 && compatibilityScore < 70 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
              <Info className="h-4 w-4" />
              Optimization Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-amber-700 space-y-1">
              {primaryDietGoal === "HIGH_PROTEIN" && (
                <div>• Look for items with 25g+ protein per serving</div>
              )}
              {primaryDietGoal === "LOW_CARB" && (
                <div>• Choose items with less than 15g carbs</div>
              )}
              {primaryDietGoal === "VEGAN" && (
                <div>• Ensure all items are plant-based</div>
              )}
              {primaryDietGoal === "HEART_HEALTHY" && (
                <div>• Focus on items with healthy fats and fiber</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}