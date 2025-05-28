// DietaryGuidanceStep.tsx - Helps customers select their dietary preferences

import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  ChevronRight, 
  Heart,
  Leaf,
  Shield,
  Zap,
  Target,
  Info
} from "lucide-react";

import { WeddingInquiryFormData } from "../types/weddingFormTypes";
import { 
  DietPreferenceCategory, 
  dietPreferenceProfiles,
  DietaryFlag,
  AllergenAlert 
} from "../data/dietaryInformation";

interface DietaryGuidanceStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

interface DietaryPreferences {
  primaryDietGoal: DietPreferenceCategory | "";
  secondaryDietGoals: DietPreferenceCategory[];
  dietaryRestrictions: DietaryFlag[];
  allergenConcerns: AllergenAlert[];
  customNotes: string;
}

const dietGoalIcons = {
  BALANCED: Heart,
  HIGH_PROTEIN: Zap,
  CARB_HEAVY: Target,
  LOW_FAT: Shield,
  LOW_SUGAR: Shield,
  MEDITERRANEAN: Leaf,
  PLANT_BASED: Leaf,
  KETO: Zap,
  WEIGHT_MANAGEMENT: Target,
  ATHLETIC_PERFORMANCE: Zap
};

function DietaryGuidanceStep({ onPrevious, onNext }: DietaryGuidanceStepProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<WeddingInquiryFormData>();
  
  const [localPreferences, setLocalPreferences] = useState<DietaryPreferences>({
    primaryDietGoal: "",
    secondaryDietGoals: [],
    dietaryRestrictions: [],
    allergenConcerns: [],
    customNotes: ""
  });

  const handlePrimaryDietChange = (diet: DietPreferenceCategory) => {
    setLocalPreferences(prev => ({
      ...prev,
      primaryDietGoal: diet
    }));
    setValue("dietaryGuidance.primaryDietGoal", diet);
  };

  const handleSecondaryDietToggle = (diet: DietPreferenceCategory) => {
    setLocalPreferences(prev => {
      const updated = prev.secondaryDietGoals.includes(diet)
        ? prev.secondaryDietGoals.filter(d => d !== diet)
        : [...prev.secondaryDietGoals, diet];
      
      setValue("dietaryGuidance.secondaryDietGoals", updated);
      return { ...prev, secondaryDietGoals: updated };
    });
  };

  const handleDietaryRestrictionToggle = (restriction: DietaryFlag) => {
    setLocalPreferences(prev => {
      const updated = prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction];
      
      setValue("dietaryGuidance.dietaryRestrictions", updated);
      return { ...prev, dietaryRestrictions: updated };
    });
  };

  const handleAllergenToggle = (allergen: AllergenAlert) => {
    setLocalPreferences(prev => {
      const updated = prev.allergenConcerns.includes(allergen)
        ? prev.allergenConcerns.filter(a => a !== allergen)
        : [...prev.allergenConcerns, allergen];
      
      setValue("dietaryGuidance.allergenConcerns", updated);
      return { ...prev, allergenConcerns: updated };
    });
  };

  const commonDietaryRestrictions: DietaryFlag[] = [
    "VEGAN", "VEGETARIAN", "DAIRY_FREE", "EGG_FREE", "GLUTEN_FREE", 
    "NUT_FREE", "SOY_FREE", "LOW_SODIUM", "DIABETIC_FRIENDLY"
  ];

  const commonAllergens: AllergenAlert[] = [
    "CONTAINS_NUTS", "CONTAINS_GLUTEN", "CONTAINS_DAIRY", 
    "CONTAINS_EGGS", "CONTAINS_SHELLFISH", "CONTAINS_FISH"
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Dietary Preferences & Guidance
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Help us curate the perfect menu for your wedding guests by sharing your dietary goals and any restrictions we should consider.
        </p>
      </div>

      {/* Primary Diet Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-pink-500" />
            Primary Dietary Goal
          </CardTitle>
          <p className="text-sm text-gray-600">
            What's your main nutritional focus for the wedding menu?
          </p>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={localPreferences.primaryDietGoal}
            onValueChange={(value) => handlePrimaryDietChange(value as DietPreferenceCategory)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {Object.entries(dietPreferenceProfiles).map(([key, profile]) => {
              const IconComponent = dietGoalIcons[key as DietPreferenceCategory];
              return (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 flex-1">
                    <IconComponent className="h-4 w-4 text-pink-500" />
                    <div>
                      <div className="font-medium">{profile.name}</div>
                      <div className="text-xs text-gray-500">{profile.description}</div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Secondary Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-pink-500" />
            Additional Dietary Considerations
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select any additional dietary goals that are important to you (optional)
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(dietPreferenceProfiles)
              .filter(([key]) => key !== localPreferences.primaryDietGoal)
              .map(([key, profile]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    localPreferences.secondaryDietGoals.includes(key as DietPreferenceCategory)
                      ? "border-pink-500 bg-pink-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleSecondaryDietToggle(key as DietPreferenceCategory)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={localPreferences.secondaryDietGoals.includes(key as DietPreferenceCategory)}
                      readOnly
                    />
                    <div className="text-sm font-medium">{profile.name}</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Dietary Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-pink-500" />
            Dietary Restrictions
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select any dietary restrictions we should accommodate
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {commonDietaryRestrictions.map((restriction) => (
              <div
                key={restriction}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  localPreferences.dietaryRestrictions.includes(restriction)
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleDietaryRestrictionToggle(restriction)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={localPreferences.dietaryRestrictions.includes(restriction)}
                    readOnly
                  />
                  <div className="text-sm font-medium">
                    {restriction.replace(/_/g, " ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Allergen Concerns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-red-500" />
            Allergen Concerns
          </CardTitle>
          <p className="text-sm text-gray-600">
            Please indicate any allergens we must avoid in your menu
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {commonAllergens.map((allergen) => (
              <div
                key={allergen}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  localPreferences.allergenConcerns.includes(allergen)
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleAllergenToggle(allergen)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={localPreferences.allergenConcerns.includes(allergen)}
                    readOnly
                  />
                  <div className="text-sm font-medium">
                    {allergen.replace(/CONTAINS_|_/g, " ").toLowerCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {(localPreferences.primaryDietGoal || localPreferences.dietaryRestrictions.length > 0) && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Your Dietary Profile Summary:</div>
              {localPreferences.primaryDietGoal && (
                <div>
                  <Badge variant="default" className="mr-2">
                    Primary Goal: {dietPreferenceProfiles[localPreferences.primaryDietGoal].name}
                  </Badge>
                </div>
              )}
              {localPreferences.dietaryRestrictions.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Restrictions: </span>
                  {localPreferences.dietaryRestrictions.map((restriction, index) => (
                    <Badge key={restriction} variant="secondary" className="mr-1">
                      {restriction.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-sm text-gray-600 mt-2">
                Based on your preferences, we'll highlight the best menu options for you in the next steps.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600"
        >
          Continue to Menu Selection
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default DietaryGuidanceStep;