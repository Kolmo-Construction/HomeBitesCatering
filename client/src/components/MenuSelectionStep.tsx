import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { themeMenuData } from '@/data/themeMenuInfo';
import { EventInquiryFormData } from '@/types/form-types';

// Move the MenuSelectionStep component to its own file to ensure proper hook usage
const MenuSelectionStep = ({ 
  selectedTheme,
  guestCount,
  onPrevious,
  onNext 
}: { 
  selectedTheme: string;
  guestCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { setValue } = useFormContext<EventInquiryFormData>();
  
  // Local state for selected theme
  const [currentTheme, setCurrentTheme] = useState(selectedTheme || "taste_of_italy");
  
  // Update form when theme changes
  useEffect(() => {
    setValue("requestedTheme", currentTheme);
  }, [currentTheme, setValue]);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Menu Selection</h2>
        <p className="text-2xl font-semibold text-primary mb-4">
          What would you like a quote for?
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {Object.keys(themeMenuData).map((themeKey) => {
          const theme = themeMenuData[themeKey as keyof typeof themeMenuData];
          return (
            <Card 
              key={themeKey}
              className={`
                overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg
                ${currentTheme === themeKey ? 'ring-4 ring-primary ring-offset-2' : ''}
              `}
              onClick={() => setCurrentTheme(themeKey)}
            >
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-2">{theme.title}</h3>
                <p className="text-gray-600 mb-4">{theme.description}</p>
                <div className="flex justify-end">
                  <Button 
                    type="button"
                    variant={currentTheme === themeKey ? "default" : "outline"}
                    size="sm"
                  >
                    {currentTheme === themeKey ? "Selected" : "Select This Menu"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="flex justify-between mt-8">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <Button 
          type="button" 
          onClick={onNext}
          className="flex items-center"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MenuSelectionStep;