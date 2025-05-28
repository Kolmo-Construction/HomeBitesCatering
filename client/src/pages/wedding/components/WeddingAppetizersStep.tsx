// src/pages/wedding/components/WeddingAppetizersStep.tsx
import React, { useEffect, useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { 
    WeddingInquiryFormData, 
    LotSize, // Ensure LotSize is exported from your types or data file
    // SelectedHorsDoeuvreItemDetails // Not directly used here, but for context
} from "../types/weddingFormTypes";
import {
  weddingHorsDoeuvresData,
  HorsDoeuvresItem,      
  SpreadItem,       
} from "../data/weddingHorsDoeurvesData"; 

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Info as InfoIcon } from "lucide-react";
import { FormField, FormControl, FormDescription, FormLabel, FormMessage, FormItem } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WeddingAppetizersStepProps {
  onPrevious: () => void;
  onNext: () => void;
}

const WeddingAppetizersStep: React.FC<WeddingAppetizersStepProps> = ({
  onPrevious,
  onNext,
}) => {
  const { control, watch, setValue, getValues } = useFormContext<WeddingInquiryFormData>();

  const currentSelections = watch("horsDoeurvesSelections");
  const guestCount = watch("guestCount") || 0; // Default to 0 if guestCount is not yet set

  const [estimatedTotalCost, setEstimatedTotalCost] = useState(0);

  useEffect(() => {
    let total = 0;
    if (currentSelections?.categories) {
      Object.values(currentSelections.categories).forEach(category => {
        if (category?.items) {
          Object.values(category.items).forEach(item => {
            if (item && typeof item.price === 'number' && typeof item.quantity === 'number') {
              total += item.price * item.quantity;
            }
          });
        }
      });
    }
    if (currentSelections?.spreads?.isPackageSelected && weddingHorsDoeuvresData.spreadsPackage) {
      total += weddingHorsDoeuvresData.spreadsPackage.pricePerPerson * guestCount;
    }
    setEstimatedTotalCost(total);
  }, [currentSelections, guestCount]);

  const handleLotSizeChange = (
    categoryKey: string,
    itemKey: string, // This is item.id
    itemName: string,
    itemPricePerPiece: number,
    selectedLotSizeString: string | null 
  ) => {
    const newQuantity = selectedLotSizeString ? parseInt(selectedLotSizeString) as LotSize : null;

    const categoriesPath = 'horsDoeurvesSelections.categories';
    const currentCategories = getValues(categoriesPath) || {};
    // Deep clone to avoid issues with RHF state updates
    const updatedCategories = JSON.parse(JSON.stringify(currentCategories)); 

    if (!updatedCategories[categoryKey]) {
      updatedCategories[categoryKey] = { items: {} };
    }
    if (!updatedCategories[categoryKey].items) { // Should be redundant if above line works
        updatedCategories[categoryKey].items = {};
    }

    if (newQuantity === null) { 
      delete updatedCategories[categoryKey].items[itemKey];
      if (Object.keys(updatedCategories[categoryKey].items).length === 0) {
        delete updatedCategories[categoryKey]; 
      }
    } else {
      updatedCategories[categoryKey].items[itemKey] = {
        name: itemName,
        price: itemPricePerPiece, 
        quantity: newQuantity,
      };
    }
    setValue(categoriesPath, updatedCategories, { shouldValidate: true });
  };

  const handleSpreadSelectionChange = (spreadId: string, checked: boolean) => {
    const selectedItemsPath = 'horsDoeurvesSelections.spreads.selectedItems';
    const currentSelectedSpreads = getValues(selectedItemsPath) || [];
    const limit = weddingHorsDoeuvresData.spreadsPackage?.selectionLimit || 3;
    let newSelectedSpreads: string[];

    if (checked) {
      if (currentSelectedSpreads.length < limit) {
        newSelectedSpreads = [...currentSelectedSpreads, spreadId];
      } else {
        newSelectedSpreads = currentSelectedSpreads; 
         // Consider adding user feedback if they try to exceed the limit
        alert(`You can select a maximum of ${limit} spreads.`);
        return; // Prevent checking the box if limit is reached
      }
    } else {
      newSelectedSpreads = currentSelectedSpreads.filter(id => id !== spreadId);
    }
    setValue(selectedItemsPath, newSelectedSpreads, { shouldValidate: true });
  };

  const handleSpreadsPackageToggle = (checked: boolean) => {
      setValue("horsDoeurvesSelections.spreads.isPackageSelected", checked);
      if (!checked) {
          setValue("horsDoeurvesSelections.spreads.selectedItems", []);
      }
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-pink-600">
          Hors d'Oeuvres Selection
        </CardTitle>
        <CardDescription className="text-center">
          Choose your service style, then select from our curated list of hors d'oeuvres.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <FormField
          control={control}
          name="horsDoeurvesSelections.serviceStyle"
          defaultValue="stationary"
          render={({ field }) => (
            <FormItem className="p-4 border rounded-md bg-slate-50">
              <FormLabel className="text-lg font-semibold text-gray-800">Service Style</FormLabel>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value || "stationary"} className="flex flex-col sm:flex-row gap-4 mt-2">
                  <FormItem className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-100 flex-1 cursor-pointer">
                    <RadioGroupItem value="stationary" id="hd-stationary" />
                    <Label htmlFor="hd-stationary" className="font-normal cursor-pointer w-full">Stationary Display</Label>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-100 flex-1 cursor-pointer">
                    <RadioGroupItem value="passed" id="hd-passed" />
                    <Label htmlFor="hd-passed" className="font-normal cursor-pointer w-full">Passed by Servers</Label>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs defaultValue={Object.keys(weddingHorsDoeuvresData.categories)[0] || (weddingHorsDoeuvresData.spreadsPackage ? "spreads" : "")} className="w-full">
          <ScrollArea className="whitespace-nowrap rounded-md border">
            <TabsList className="inline-flex h-auto p-1 bg-slate-100">
              {Object.entries(weddingHorsDoeuvresData.categories).map(([categoryKey, categoryDetails]) => (
                <TabsTrigger key={categoryKey} value={categoryKey} className="text-sm px-3 py-1.5 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
                  {categoryDetails.name}
                </TabsTrigger>
              ))}
              {weddingHorsDoeuvresData.spreadsPackage && (
                <TabsTrigger value="spreads" className="text-sm px-3 py-1.5 data-[state=active]:bg-pink-100 data-[state=active]:text-pink-700">
                  {weddingHorsDoeuvresData.spreadsPackage.name}
                </TabsTrigger>
              )}
            </TabsList>
          </ScrollArea>

          {Object.entries(weddingHorsDoeuvresData.categories).map(([categoryKey, categoryData]) => (
            <TabsContent key={categoryKey} value={categoryKey} className="mt-4">
              <CardDescription className="mb-2">{categoryData.description}</CardDescription>
              {categoryData.defaultLotOfferingNote && <p className="text-xs text-muted-foreground mb-4">{categoryData.defaultLotOfferingNote}</p>}
              <ScrollArea className="h-[450px] rounded-md border p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Item</TableHead>
                      <TableHead className="text-right w-[15%]">Price/Each</TableHead>
                      <TableHead className="text-center w-[25%]">Select Lot Size</TableHead>
                      <TableHead className="text-right w-[15%]">Item Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryData.items.map((item: HorsDoeuvresItem) => {
                      const currentItemSelection = currentSelections?.categories?.[categoryKey]?.items?.[item.id];
                      const itemSubtotal = currentItemSelection && typeof currentItemSelection.price === 'number' && typeof currentItemSelection.quantity === 'number'
                                            ? currentItemSelection.price * currentItemSelection.quantity 
                                            : 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.name}
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                            {item.notes && <p className="text-xs text-blue-600">{item.notes}</p>}
                          </TableCell>
                          <TableCell className="text-right">${item.pricePerPiece.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={currentItemSelection?.quantity?.toString() || "0"}
                              onValueChange={(value) => handleLotSizeChange(categoryKey, item.id, item.name, item.pricePerPiece, value === "0" ? null : value)}
                            >
                              <SelectTrigger className="w-[120px] mx-auto text-xs h-8">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">None</SelectItem>
                                {item.availableLotSizes.map((size) => (
                                  <SelectItem key={size} value={size.toString()}>{size} pieces</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right font-medium">${itemSubtotal.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          ))}

          {weddingHorsDoeuvresData.spreadsPackage && (
            <TabsContent value="spreads" className="mt-4">
              <Card className="p-4">
                <CardHeader className="p-2">
                    <CardTitle>{weddingHorsDoeuvresData.spreadsPackage.name}</CardTitle>
                    <CardDescription>{weddingHorsDoeuvresData.spreadsPackage.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-md font-semibold text-gray-700">
                        Price: ${weddingHorsDoeuvresData.spreadsPackage.pricePerPerson.toFixed(2)} per person
                        {guestCount > 0 && ` (for ${guestCount} guests: $${(weddingHorsDoeuvresData.spreadsPackage.pricePerPerson * guestCount).toFixed(2)})`}
                    </p>
                    <FormField
                        control={control}
                        name="horsDoeurvesSelections.spreads.isPackageSelected"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 my-3 bg-slate-50">
                                <FormControl>
                                    <Checkbox
                                        checked={!!field.value} // Ensure boolean
                                        onCheckedChange={(checked) => {
                                            field.onChange(!!checked); // Ensure boolean
                                            handleSpreadsPackageToggle(!!checked);
                                        }}
                                        id="spreads-package-toggle"
                                    />
                                </FormControl>
                                <Label htmlFor="spreads-package-toggle" className="font-medium cursor-pointer text-gray-700">
                                    Add Spreads Package to my order
                                </Label>
                            </FormItem>
                        )}
                    />

                {watch("horsDoeurvesSelections.spreads.isPackageSelected") && (
                    <>
                        <p className="text-sm text-muted-foreground">Select {weddingHorsDoeuvresData.spreadsPackage.selectionLimit} spreads from the list below:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                            {weddingHorsDoeuvresData.spreadsPackage.items.map((spread: SpreadItem) => (
                            <FormField
                                key={spread.id}
                                control={control}
                                name="horsDoeurvesSelections.spreads.selectedItems"
                                render={() => (
                                <FormItem className="flex flex-row items-center space-x-2 p-2 border rounded-md hover:bg-slate-100 transition-colors">
                                    <FormControl>
                                    <Checkbox
                                        checked={currentSelections?.spreads?.selectedItems?.includes(spread.id)}
                                        onCheckedChange={(checked) => handleSpreadSelectionChange(spread.id, !!checked)}
                                        disabled={
                                            !(currentSelections?.spreads?.selectedItems?.includes(spread.id)) &&
                                            (currentSelections?.spreads?.selectedItems?.length || 0) >= (weddingHorsDoeuvresData.spreadsPackage?.selectionLimit || 3)
                                        }
                                        id={`spread-${spread.id}`}
                                    />
                                    </FormControl>
                                    <Label htmlFor={`spread-${spread.id}`} className="font-normal cursor-pointer w-full text-sm">{spread.name}</Label>
                                </FormItem>
                                )}
                            />
                            ))}
                        </div>
                        <FormMessage>
                            { (watch('horsDoeurvesSelections.spreads.selectedItems')?.length || 0) > (weddingHorsDoeuvresData.spreadsPackage?.selectionLimit || 0) &&
                                `Please select no more than ${weddingHorsDoeuvresData.spreadsPackage.selectionLimit} spreads.`}
                        </FormMessage>
                    </>
                )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <div className="mt-10 pt-6 border-t border-gray-300">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Total Estimated Appetizer Cost:</h3>
                <p className="text-2xl font-bold text-pink-700">${estimatedTotalCost.toFixed(2)}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-right">
                This subtotal is an estimate and does not include service fees, labor, or taxes. Final pricing will be detailed in your proposal.
            </p>
        </div>

        <div className="flex justify-between mt-10">
          <Button type="button" variant="outline" onClick={onPrevious} className="flex items-center px-6 py-3 text-lg">
            <ChevronLeft className="mr-2 h-5 w-5" /> Back
          </Button>
          <Button type="button" onClick={onNext} className="flex items-center bg-pink-600 hover:bg-pink-700 px-6 py-3 text-lg text-white">
            Next <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeddingAppetizersStep;