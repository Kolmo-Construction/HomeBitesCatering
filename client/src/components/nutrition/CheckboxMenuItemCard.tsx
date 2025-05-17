import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface CheckboxMenuItemProps {
  menuItem: {
    id: number;
    name: string;
    nutrition: NutritionalInfo;
  };
  isSelected: boolean;
  isDisabled?: boolean; // Add disabled state for when selection limit is reached
  onClick: () => void;
}

const CheckboxMenuItemCard: React.FC<CheckboxMenuItemProps> = ({ 
  menuItem, 
  isSelected,
  isDisabled = false,
  onClick 
}) => {
  // Generate a background color based on the menu item's nutritional values
  const getBackgroundColor = () => {
    const { protein, carbs, fat } = menuItem.nutrition;
    
    // Higher protein = more purple tint
    // Higher carbs = more green tint
    // Higher fat = more yellow tint
    
    if (protein > carbs && protein > fat) {
      return 'bg-purple-50';
    } else if (carbs > protein && carbs > fat) {
      return 'bg-green-50';
    } else if (fat > protein && fat > carbs) {
      return 'bg-yellow-50';
    } else {
      return 'bg-gray-50';
    }
  };
  
  // Quick nutrition badge
  const QuickNutritionBadge = () => {
    const { calories, protein, carbs, fat } = menuItem.nutrition;
    
    let badge = '';
    
    if (protein > 15 && protein/(protein+carbs+fat) > 0.3) {
      badge = 'High Protein';
    } else if (carbs < 10) {
      badge = 'Low Carb';
    } else if (fat < 5) {
      badge = 'Low Fat';
    }
    
    if (!badge) return null;
    
    return (
      <div className="absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full bg-white bg-opacity-90 font-medium">
        {badge}
      </div>
    );
  };
  
  return (
    <motion.div
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      onClick={!isDisabled ? onClick : undefined}
      className={cn(
        'relative overflow-hidden rounded-lg border p-4 transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200',
        !isDisabled ? 'cursor-pointer hover:border-gray-300' : 'cursor-not-allowed opacity-60',
        getBackgroundColor()
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      
      {/* Quick nutrition badge */}
      <QuickNutritionBadge />
      
      {/* Content */}
      <div className={cn("pt-1", isSelected && "pl-4")}>
        <h3 className="font-medium mb-1">{menuItem.name}</h3>
        
        <div className="mt-2 flex flex-col space-y-1">
          <div className="text-sm flex justify-between">
            <span className="text-gray-500">Calories:</span>
            <span className="font-medium">{menuItem.nutrition.calories}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Protein:</span>
              <span>{menuItem.nutrition.protein}g</span>
            </div>
            <div className="flex justify-between">
              <span>Carbs:</span>
              <span>{menuItem.nutrition.carbs}g</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Fat:</span>
              <span>{menuItem.nutrition.fat}g</span>
            </div>
            <div className="flex justify-between">
              <span>Fiber:</span>
              <span>{menuItem.nutrition.fiber}g</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CheckboxMenuItemCard;