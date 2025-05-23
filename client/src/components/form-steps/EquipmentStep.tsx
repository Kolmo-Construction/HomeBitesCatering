// client/src/components/form-steps/EquipmentStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EventInquiryFormData } from "@/types/form-types";
import { equipmentCategories } from "@/data/equipmentData";

export default function EquipmentStep({ 
  onPrevious, 
  onNext 
}: { 
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { watch, setValue } = useFormContext<EventInquiryFormData>();
  const equipmentSelections = watch("equipment") || { furniture: {}, linens: {}, servingWare: {} };
  
  // Handle quantity change
  const handleQuantityChange = (categoryId: string, itemId: string, quantity: number) => {
    const newEquipment = { ...equipmentSelections };
    
    if (categoryId === "furniture") {
      newEquipment.furniture = { ...newEquipment.furniture, [itemId]: quantity };
    } else if (categoryId === "linens") {
      newEquipment.linens = { ...newEquipment.linens, [itemId]: quantity };
    } else if (categoryId === "servingWare") {
      newEquipment.servingWare = { ...newEquipment.servingWare, [itemId]: quantity };
    }
    
    setValue("equipment", newEquipment);
  };
  
  // Format price to display as currency
  const formatPrice = (price: number, unit?: string): string => {
    return `$${price.toFixed(2)}${unit ? ` per ${unit}` : ''}`;
  };
  
  // Get selected quantity for an item
  const getQuantity = (categoryId: string, itemId: string): number => {
    if (categoryId === "furniture") {
      return equipmentSelections.furniture[itemId] || 0;
    } else if (categoryId === "linens") {
      return equipmentSelections.linens[itemId] || 0;
    } else if (categoryId === "servingWare") {
      return equipmentSelections.servingWare[itemId] || 0;
    }
    return 0;
  };
  
  // Calculate subtotal for a category
  const calculateCategorySubtotal = (categoryId: string): number => {
    const category = equipmentCategories.find(cat => cat.id === categoryId);
    if (!category) return 0;
    
    return category.items.reduce((total, item) => {
      const quantity = getQuantity(categoryId, item.id);
      return total + (item.price * quantity);
    }, 0);
  };
  
  // Calculate total for all equipment
  const calculateTotal = (): number => {
    return equipmentCategories
      .filter(cat => ["furniture", "linens", "servingWare"].includes(cat.id))
      .reduce((total, category) => {
        return total + calculateCategorySubtotal(category.id);
      }, 0);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Equipment Rental Selection</h2>
        <p className="text-lg text-gray-600">
          Select the equipment items you need and specify the quantities.
        </p>
      </div>
      
      <div className="space-y-6 mb-8">
        {equipmentCategories
          .filter(category => ["furniture", "linens", "servingWare"].includes(category.id))
          .map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex justify-between items-center">
                <span>{category.name}</span>
                <span className="text-sm font-normal text-primary">
                  Subtotal: ${calculateCategorySubtotal(category.id).toFixed(2)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {category.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-md">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{formatPrice(item.price, item.unit)}</p>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        value={getQuantity(category.id, item.id) || ""}
                        onChange={(e) => handleQuantityChange(
                          category.id, 
                          item.id, 
                          parseInt(e.target.value) || 0
                        )}
                        className="text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Total Equipment Rental</span>
          <span className="text-primary">${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
      
      {/* Navigation Buttons */}
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
          className="flex items-center bg-primary"
        >
          Continue <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}