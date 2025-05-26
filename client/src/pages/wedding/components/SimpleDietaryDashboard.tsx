// SimpleDietaryDashboard.tsx - Compact dietary tracking for top placement

import React from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle 
} from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";

export default function SimpleDietaryDashboard() {
  const { watch } = useFormContext<WeddingInquiryFormData>();
  
  const dietaryGuidance = watch("dietaryGuidance");
  const allFormData = watch();
  
  // Count selected items and get detailed tracking
  const selectionAnalysis = React.useMemo(() => {
    let count = 0;
    const selectedItems: string[] = [];
    
    // Check if a wedding package is selected
    if (allFormData.menuSelections?.selectedPackage) {
      count += 1;
      selectedItems.push(`Package: ${allFormData.menuSelections.selectedPackage}`);
    }
    
    // Check appetizers/hors d'oeuvres
    if (allFormData.horsDoeurvesSelections?.categories) {
      Object.entries(allFormData.horsDoeurvesSelections.categories).forEach(([categoryName, category]) => {
        if (category?.items) {
          Object.entries(category.items).forEach(([itemName, itemData]) => {
            if (itemData && typeof itemData === 'object' && 'quantity' in itemData) {
              count += 1;
              selectedItems.push(`${categoryName}: ${itemName}`);
            }
          });
        }
      });
    }
    
    // Check desserts
    if (allFormData.dessertSelections) {
      Object.entries(allFormData.dessertSelections).forEach(([key, value]) => {
        if (value === true) {
          count += 1;
          selectedItems.push(`Dessert: ${key}`);
        }
      });
    }
    
    // Check beverages
    if (allFormData.beverageSelections) {
      Object.entries(allFormData.beverageSelections).forEach(([key, value]) => {
        if (value === true) {
          count += 1;
          selectedItems.push(`Beverage: ${key}`);
        }
      });
    }
    
    return { count, selectedItems };
  }, [allFormData]);

  const primaryDietGoal = dietaryGuidance?.primaryDietGoal;
  
  if (!primaryDietGoal) {
    return (
      <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
        <CardContent className="p-4">
          <div className="text-center text-gray-600">
            Complete the dietary preferences step to see personalized tracking
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock compatibility score based on selections (you can enhance this)
  const compatibilityScore = selectionAnalysis.count > 0 ? 75 : 0;

  return (
    <Card className="bg-white border-pink-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-pink-500" />
            <span className="font-semibold text-gray-900">Dietary Tracking</span>
          </div>
          {selectionAnalysis.count > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {selectionAnalysis.count} item{selectionAnalysis.count > 1 ? 's' : ''} selected
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Diet Goal */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Your Goal</div>
            <Badge variant="outline" className="bg-pink-50">
              {primaryDietGoal.replace(/_/g, " ")}
            </Badge>
          </div>
          
          {/* Compatibility Score */}
          {selectionAnalysis.count > 0 && (
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Compatibility</div>
              <div className="flex items-center gap-2">
                <Progress value={compatibilityScore} className="flex-1 h-2" />
                <span className="text-sm font-medium text-green-600">{compatibilityScore}%</span>
              </div>
            </div>
          )}
          
          {/* Status */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            {selectionAnalysis.count === 0 ? (
              <div className="text-xs text-gray-500">Start selecting items</div>
            ) : (
              <div className="flex items-center justify-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">Tracking active</span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time feedback */}
        {selectionAnalysis.count > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-800">
              <strong>Great progress!</strong> Your selections are being tracked for {primaryDietGoal.replace(/_/g, " ").toLowerCase()} compatibility.
            </div>
            {/* Debug: Show what's being tracked */}
            <div className="mt-2 text-xs text-gray-600">
              <strong>Currently tracking:</strong>
              <ul className="list-disc list-inside mt-1">
                {selectionAnalysis.selectedItems.slice(0, 3).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
                {selectionAnalysis.selectedItems.length > 3 && (
                  <li>...and {selectionAnalysis.selectedItems.length - 3} more items</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}