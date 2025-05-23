// client/src/components/form-steps/DessertsStep.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DessertItem, DessertLotSize, EventInquiryFormData } from "@/types/form-types";
import { dessertItems, dessertLotSizes } from "@/data/dessertData"; // For DessertMatrix

// Dessert Matrix component for selecting quantities
const DessertMatrix = ({
  item,
  onSelectionChange
}: {
  item: DessertItem;
  onSelectionChange: (itemId: string, quantity: DessertLotSize | null) => void;
}) => {
  const { watch } = useFormContext<EventInquiryFormData>();
  const dessertSelections = watch("dessertSelections");

  const currentSelection = dessertSelections?.[item.id] || null;

  const handleLotSelect = (lotSize: DessertLotSize) => {
    if (currentSelection === lotSize) {
      onSelectionChange(item.id, null); // Deselect
    } else {
      onSelectionChange(item.id, lotSize); // Select new
    }
  };

  return (
    <div className="mb-4 px-2 py-3 border-b border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <span className="font-medium text-gray-800">{item.name}</span>
          <div className="text-sm text-gray-500">${item.price.toFixed(2)} each</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {dessertLotSizes.map((lotSize) => (
          <Button
            key={`<span class="math-inline">\{item\.id\}\-</span>{lotSize}`}
            type="button"
            size="sm"
            variant={currentSelection === lotSize ? "default" : "outline"}
            onClick={() => handleLotSelect(lotSize)}
            className="px-2 py-1 h-auto text-xs"
          >
            {lotSize} pcs
            {currentSelection === lotSize &&
              <span className="ml-1 text-xs">
                (${(lotSize * item.price).toFixed(2)})
              </span>
            }
          </Button>
        ))}
      </div>
    </div>
  );
};

// Desserts step component
const DessertsStep = ({
  onPrevious,
  onNext
}: {
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { setValue, watch } = useFormContext<EventInquiryFormData>();
  const dessertSelections = watch("dessertSelections") || {}; // Ensure it's an object

  const handleDessertSelection = (itemId: string, quantity: DessertLotSize | null) => {
    const updatedSelections = { ...dessertSelections };
    if (quantity === null) {
      delete updatedSelections[itemId];
    } else {
      updatedSelections[itemId] = quantity;
    }
    setValue("dessertSelections", updatedSelections);
  };

  const calculateTotal = () => {
    return Object.entries(dessertSelections).reduce((total, [itemId, quantity]) => {
      const item = dessertItems.find(di => di.id === itemId);
      if (item && quantity) {
        return total + (item.price * (quantity as number)); // Cast quantity as number
      }
      return total;
    }, 0);
  };

  const selectedCount = Object.keys(dessertSelections).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3 text-gray-900">Dessert Selections</h2>
        <p className="text-lg text-gray-600">
          Choose your dessert options with quantities
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Dessert Options</h3>
          <p className="text-sm text-gray-600 mb-4">
            The dessert selections are offered with options for different quantities (36, 48, 72, 96, 144).
            Select the quantity for each dessert item you would like to include.
          </p>

          <div className="mt-6 border rounded-md divide-y">
            {dessertItems.map(item => (
              <DessertMatrix
                key={item.id}
                item={item}
                onSelectionChange={handleDessertSelection}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <div className="flex justify-between items-center">
            <span className="font-medium">Selected Items: {selectedCount}</span>
            <span className="font-medium">Total: ${calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button type="button" onClick={onPrevious} variant="outline">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <Button type="button" onClick={onNext}>
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default DessertsStep;