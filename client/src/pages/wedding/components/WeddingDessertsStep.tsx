// src/pages/wedding/components/WeddingDessertsStep.tsx
import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { 
  WeddingInquiryFormData, 
  DessertItem as WeddingDessertItemType, // Type for individual dessert items
  DessertLotSize as WeddingDessertLotSizeType // Type for lot sizes
} from "../types/weddingFormTypes"; // Assuming these types are correctly defined here

// Import data from the wedding-specific data file
// This path assumes WeddingDessertsStep.tsx is in client/src/pages/wedding/components/
// and weddingDessertData.ts is in client/src/pages/wedding/data/
import { 
  dessertItems as weddingDessertItemsDataSource, 
  dessertLotSizes as weddingDessertLotSizesDataSource 
} from "../data/weddingDessertData"; 
// Alternatively, if your @ alias is set to client/src/:
// import { dessertItems as weddingDessertItemsDataSource, dessertLotSizes as weddingDessertLotSizesDataSource } from "@/pages/wedding/data/weddingDessertData";


// Import UI components (ensure these paths are correct for your project)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface WeddingDessertsStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

// Ensure the imported data aligns with the expected types
const dessertItems: WeddingDessertItemType[] = weddingDessertItemsDataSource.map(item => ({
  id: item.id,
  name: item.name,
  price: item.price,
  // Add any other fields if WeddingDessertItemType has them and item provides them
}));

const dessertLotSizes: WeddingDessertLotSizeType[] = weddingDessertLotSizesDataSource;

const WeddingDessertsStep: React.FC<WeddingDessertsStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { control, watch, formState: { errors } } = useFormContext<WeddingInquiryFormData>();

  // Watching the entire dessertSelections object to calculate total
  const dessertSelections = watch("dessertSelections") || {};

  // Calculate total selected desserts
  const totalSelectedDesserts = Object.values(dessertSelections).reduce(
    (acc: number, quantity: unknown) => acc + (Number(quantity) || 0),
    0
  );

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="bg-pink-50 rounded-t-lg">
        <CardTitle className="text-3xl font-bold text-center text-pink-700">
          Sweet Endings: Dessert Selections
        </CardTitle>
        <CardDescription className="text-center text-pink-600 text-md pt-1">
          Choose your delightful desserts for the wedding celebration. 
          Items are typically ordered by the piece. Please note available lot sizes.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <ScrollArea className="h-[450px] w-full p-1 border rounded-lg bg-white">
          <div className="space-y-4 p-4">
            {dessertItems.map((item) => (
              <Controller
                key={item.id}
                name={`dessertSelections.${item.id}`} // Field name like dessertSelections.petit_fours
                control={control}
                defaultValue={0} // Default quantity to 0
                rules={{ min: { value: 0, message: "Quantity cannot be negative." } }}
                render={({ field }) => (
                  <FormItem className="p-4 border rounded-lg shadow-sm hover:bg-pink-50 transition-colors duration-150 ease-in-out">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="mb-3 md:mb-0 md:flex-grow">
                        <FormLabel htmlFor={item.id} className="text-lg font-semibold text-gray-800 block">
                          {item.name}
                        </FormLabel>
                        <p className="text-sm text-gray-600">
                          Price: ${item.price.toFixed(2)} per piece
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Suggested lot sizes: {dessertLotSizes.join(', ')} pieces.
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        <Label htmlFor={item.id} className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Quantity:
                        </Label>
                        <FormControl>
                          <Input
                            id={item.id}
                            type="number"
                            min="0"
                            className="w-28 text-right border-gray-300 focus:border-pink-500 focus:ring-pink-500 rounded-md"
                            {...field}
                            value={field.value || 0} // Ensure input displays 0 if value is null/undefined
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              field.onChange(isNaN(val) || val < 0 ? 0 : val);
                            }}
                            onBlur={field.onBlur} // Important for validation trigger
                          />
                        </FormControl>
                      </div>
                    </div>
                    {/* Accessing nested errors can be tricky with TypeScript's default `errors` type.
                      You might need to cast or use a helper if you have a complex validation schema.
                      For simple min rule, this might work or require casting `errors.dessertSelections`
                    */}
                    {errors.dessertSelections && (errors.dessertSelections as any)[item.id] && (
                      <FormMessage className="mt-2 text-xs text-red-600">
                        {(errors.dessertSelections as any)[item.id]?.message}
                      </FormMessage>
                    )}
                  </FormItem>
                )}
              />
            ))}
          </div>
        </ScrollArea>

        <div className="mt-6 p-4 bg-pink-100 rounded-lg text-pink-800 border border-pink-200">
          <p className="text-md font-semibold">
            Total Selected Dessert Pieces: {totalSelectedDesserts}
          </p>
          {dessertLotSizes.length > 0 && (
            <p className="text-sm mt-1">
              Reminder: Please consider available lot sizes ({dessertLotSizes.join(', ')}) when finalizing quantities for efficient order processing.
            </p>
          )}
        </div>

        <div className="flex justify-between mt-10">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious} 
            className="py-3 px-6 border-pink-500 text-pink-500 hover:bg-pink-50"
          >
            <ChevronLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <Button 
            type="button" 
            onClick={onNext} 
            className="py-3 px-6 bg-pink-600 hover:bg-pink-700 text-white"
          >
            Next <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeddingDessertsStep;