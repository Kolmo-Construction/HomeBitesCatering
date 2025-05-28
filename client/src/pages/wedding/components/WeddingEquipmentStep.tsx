// src/pages/wedding/components/WeddingEquipmentStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { WeddingInquiryFormData } from "../types/weddingFormTypes";
import { weddingEquipmentCategories, WeddingEquipmentCategory } from "../data/weddingEquipmentData";

interface WeddingEquipmentStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingEquipmentStep: React.FC<WeddingEquipmentStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { watch, setValue, formState: { errors } } = useFormContext<WeddingInquiryFormData>();

  // Ensure equipment and its nested fields are initialized in the form state
  // This might be better done in WeddingInquiryForm.tsx defaultValues,
  // but this is a safeguard.
  const equipmentSelections = watch("equipment") || { furniture: {}, linens: {}, servingWare: {}, decor: {} };
   React.useEffect(() => {
    if (!watch("equipment")) {
      setValue("equipment", { furniture: {}, linens: {}, servingWare: {}, decor: {} });
    } else {
      const currentEquipment = watch("equipment");
      setValue("equipment", {
        furniture: currentEquipment.furniture || {},
        linens: currentEquipment.linens || {},
        servingWare: currentEquipment.servingWare || {},
        decor: (currentEquipment as any).decor || {}, // Cast if 'decor' isn't yet in the strict type
      });
    }
  }, [watch, setValue]);


  const getSelectionKeyForCategory = (categoryId: string): keyof WeddingInquiryFormData['equipment'] | undefined => {
    // This function maps the category ID from weddingEquipmentData.ts
    // to the corresponding key in WeddingInquiryFormData.equipment
    if (categoryId === "furniture" || categoryId === "tables" || categoryId === "chairs") {
      return "furniture";
    } else if (categoryId === "linens") {
      return "linens";
    } else if (categoryId === "servingWare") {
      return "servingWare";
    } else if (categoryId === "decor") { 
      // Assuming you add 'decor: Record<string, number>' to your WeddingInquiryFormData.equipment type
      return "decor" as any; // Cast as any if 'decor' is not yet in the strict type, but will be added
    }
    // Add more mappings if needed
    console.warn(`No mapping found for equipment category ID: ${categoryId}`);
    return undefined;
  };

  const handleQuantityChange = (categoryDataId: string, itemId: string, quantity: number) => {
    const selectionKey = getSelectionKeyForCategory(categoryDataId);
    if (!selectionKey) return;

    const currentEquipmentState = watch("equipment") || { furniture: {}, linens: {}, servingWare: {}, decor: {} };
    const newCategorySelections = { 
      ...(currentEquipmentState[selectionKey] || {}), 
      [itemId]: quantity >= 0 ? quantity : 0 
    };
    setValue(`equipment.${selectionKey}`, newCategorySelections, { shouldValidate: true });
  };

  const formatPrice = (price: number, unit?: string): string => {
    return `$${price.toFixed(2)}${unit ? ` per ${unit}` : ""}`;
  };

  const getQuantity = (categoryDataId: string, itemId: string): number => {
    const selectionKey = getSelectionKeyForCategory(categoryDataId);
    if (!selectionKey) return 0;
    const currentEquipmentState = watch("equipment");
    return currentEquipmentState?.[selectionKey]?.[itemId] || 0;
  };

  const calculateCategorySubtotal = (category: WeddingEquipmentCategory): number => {
    let total = 0;
    const selectionKey = getSelectionKeyForCategory(category.id);
    if (!selectionKey) return 0;

    const currentEquipmentState = watch("equipment");
    const categorySelections = currentEquipmentState?.[selectionKey];

    if (categorySelections) {
      category.items.forEach((item) => {
        const quantity = categorySelections[item.id] || 0;
        total += item.price * quantity;
      });
    }
    return total;
  };

  const calculateTotalEquipmentCost = (): number => {
    let total = 0;
    weddingEquipmentCategories.forEach(category => {
      total += calculateCategorySubtotal(category);
    });
    return total;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-3 text-pink-700 flex items-center justify-center">
          <Sparkles className="h-8 w-8 mr-3 text-pink-500" />
          Wedding Equipment Rental Selection
        </h2>
        <p className="text-lg text-gray-600">
          Select the equipment items you need for your wedding and specify the quantities.
        </p>
      </div>

      <div className="space-y-8 mb-8">
        {weddingEquipmentCategories.map((category) => (
            <Card key={category.id} className="overflow-hidden rounded-xl shadow-lg">
              <CardHeader className="bg-pink-50 p-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <CardTitle className="text-xl text-pink-700 mb-1 sm:mb-0">{category.name}</CardTitle>
                    <span className="text-md font-semibold text-pink-600">
                        Subtotal: ${calculateCategorySubtotal(category).toFixed(2)}
                    </span>
                </div>
                {category.description && <CardDescription className="text-sm text-gray-500 pt-1">{category.description}</CardDescription>}
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4">
                {category.items.map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatPrice(item.price, item.unit)}
                          {item.description && ` - ${item.description}`}
                        </p>
                      </div>
                      <div className="w-full sm:w-28">
                        <Input
                          type="number"
                          min="0"
                          aria-label={`Quantity for ${item.name}`}
                          value={getQuantity(category.id, item.id)}
                          onChange={(e) => 
                            handleQuantityChange(
                                category.id,
                                item.id,
                                parseInt(e.target.value) || 0
                            )
                          }
                          className="text-right h-9 text-sm"
                          placeholder="Qty"
                        />
                        {/* Basic error display placeholder, can be enhanced with react-hook-form errors */}
                        {/* errors?.equipment?.[getSelectionKeyForCategory(category.id) as any]?.[item.id] && (
                            <p className="text-xs text-red-500 mt-1">Invalid quantity.</p>
                         )*/}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="bg-pink-50 rounded-xl shadow-lg p-6 mb-8 sticky bottom-4 border border-pink-200">
        <div className="flex justify-between items-center text-xl font-bold">
          <span className="text-pink-700">Total Estimated Equipment Rental Cost:</span>
          <span className="text-pink-700">${calculateTotalEquipmentCost().toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-between mt-10">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          className="flex items-center px-6 py-3 text-lg"
        >
          <ChevronLeft className="mr-2 h-5 w-5" /> Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white"
        >
          Next <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeddingEquipmentStep;