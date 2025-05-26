// EnhancedMenuItemCard.tsx - Menu item with dietary information and recommendations

import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Leaf, 
  Shield, 
  AlertTriangle, 
  Star,
  Plus,
  Check
} from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";
import { getDietaryInfoForItem, getDietaryScore } from "../data/enhancedWeddingMenuData";
import { DietPreferenceCategory } from "../data/dietaryInformation";

interface EnhancedMenuItemCardProps {
  itemId: string;
  itemName: string;
  itemDescription?: string;
  upcharge?: number;
  isSelected: boolean;
  onToggle: () => void;
}

export default function EnhancedMenuItemCard({
  itemId,
  itemName,
  itemDescription,
  upcharge = 0,
  isSelected,
  onToggle
}: EnhancedMenuItemCardProps) {
  const { watch } = useFormContext<WeddingInquiryFormData>();
  
  const dietaryGuidance = watch("dietaryGuidance");
  const primaryDietGoal = dietaryGuidance?.primaryDietGoal as DietPreferenceCategory;
  
  const dietaryInfo = getDietaryInfoForItem(itemId);
  
  // Calculate compatibility score if diet goal is set
  const compatibilityScore = primaryDietGoal && dietaryInfo 
    ? getDietaryScore(dietaryInfo, primaryDietGoal) 
    : 0;
    
  // Determine recommendation level
  const getRecommendationLevel = (score: number) => {
    if (score >= 8) return { level: "excellent", color: "text-green-600", icon: Star };
    if (score >= 5) return { level: "good", color: "text-blue-600", icon: Heart };
    if (score >= 3) return { level: "fair", color: "text-yellow-600", icon: Shield };
    return { level: "poor", color: "text-gray-500", icon: AlertTriangle };
  };
  
  const recommendation = getRecommendationLevel(compatibilityScore);
  const RecommendationIcon = recommendation.icon;

  return (
    <Card className={`transition-all cursor-pointer ${
      isSelected 
        ? 'ring-2 ring-pink-500 bg-pink-50' 
        : 'hover:shadow-md hover:border-gray-300'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {itemName}
              {upcharge > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +${upcharge}
                </Badge>
              )}
            </CardTitle>
            {itemDescription && (
              <p className="text-sm text-gray-600 mt-1">{itemDescription}</p>
            )}
          </div>
          
          <Button
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className="ml-2"
          >
            {isSelected ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Selected
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      {dietaryInfo && (
        <CardContent className="space-y-3">
          {/* Nutritional Quick Stats */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-700">Calories</div>
              <div className="text-sm">{dietaryInfo.nutritional_info.calories_range_kcal}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-700">Protein</div>
              <div className="text-sm text-green-600">{dietaryInfo.nutritional_info.protein_g_range}g</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-700">Carbs</div>
              <div className="text-sm text-orange-600">{dietaryInfo.nutritional_info.carbs_g_range}g</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-700">Fat</div>
              <div className="text-sm text-purple-600">{dietaryInfo.nutritional_info.fat_g_range}g</div>
            </div>
          </div>

          {/* Diet Compatibility */}
          {primaryDietGoal && (
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <RecommendationIcon className={`h-4 w-4 ${recommendation.color}`} />
                <span className="text-sm font-medium">
                  {compatibilityScore >= 8 && "Excellent match"}
                  {compatibilityScore >= 5 && compatibilityScore < 8 && "Good match"}
                  {compatibilityScore >= 3 && compatibilityScore < 5 && "Fair match"}
                  {compatibilityScore < 3 && "Consider alternatives"}
                </span>
              </div>
              <div className={`text-xs ${recommendation.color}`}>
                {Math.round((compatibilityScore / 10) * 100)}% fit
              </div>
            </div>
          )}

          {/* Dietary Flags */}
          <div className="flex flex-wrap gap-1">
            {dietaryInfo.dietary_flags.slice(0, 4).map(flag => (
              <Badge key={flag} variant="secondary" className="text-xs">
                {flag.replace(/_/g, " ")}
              </Badge>
            ))}
            {dietaryInfo.dietary_flags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{dietaryInfo.dietary_flags.length - 4}
              </Badge>
            )}
          </div>

          {/* Allergen Warnings */}
          {dietaryInfo.allergen_alert.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div className="text-xs text-red-700">
                <span className="font-medium">Allergen Alert: </span>
                {dietaryInfo.allergen_alert.slice(0, 2).map(allergen => (
                  <span key={allergen} className="mr-1">
                    {allergen.replace(/CONTAINS_|_/g, " ").toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Customer Guidance */}
          <div className="text-xs text-gray-600 italic p-2 bg-blue-50 rounded">
            "{dietaryInfo.guidance_for_customer}"
          </div>
        </CardContent>
      )}
    </Card>
  );
}