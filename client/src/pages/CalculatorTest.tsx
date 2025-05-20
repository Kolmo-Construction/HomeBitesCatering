import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A simple test component for demonstrating the hidden calculation feature
 */
export default function CalculatorTest() {
  // State for our input values
  const [quantity, setQuantity] = useState<number>(1);
  const [pricePerUnit, setPricePerUnit] = useState<number>(10);
  
  // State for the calculation result
  const [totalCost, setTotalCost] = useState<number>(10);

  // Update the calculation whenever inputs change
  useEffect(() => {
    // This is where our calculation happens
    // In the form system, this would be handled by the hidden_calculation field
    const calculatedTotal = quantity * pricePerUnit;
    setTotalCost(calculatedTotal);
  }, [quantity, pricePerUnit]);

  // Format as currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Calculator Test</CardTitle>
          <CardDescription>
            This demonstrates how the hidden calculation feature works
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pricePerUnit">Price Per Unit</Label>
            <Input
              id="pricePerUnit"
              type="number"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(Number(e.target.value))}
              min={0.01}
              step={0.01}
            />
          </div>
          
          <div className="border border-dashed border-gray-300 p-3 rounded-md bg-gray-50">
            <div className="text-sm text-gray-500 mb-1">Hidden Calculation (Not visible to users)</div>
            <code className="block p-2 bg-gray-100 rounded text-sm font-mono">
              {`{quantity} * {price_per_unit}`}
            </code>
          </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 border-t">
          <div className="w-full flex justify-between items-center">
            <span className="font-medium">Total Cost:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </CardFooter>
      </Card>
      
      <div className="mt-8 bg-white p-4 rounded-md shadow">
        <h3 className="text-lg font-medium mb-2">How It Works</h3>
        <p className="mb-4">
          In a real form, the calculation happens behind the scenes in a hidden field.
          Users would only see the inputs and possibly the result (if you choose to display it).
        </p>
        <div className="bg-gray-100 p-3 rounded-md">
          <p className="text-sm font-medium mb-1">Calculation Formula:</p>
          <code className="text-sm font-mono">{'{'} quantity {'}'} * {'{'} price_per_unit {'}'}</code>
          <p className="mt-4 text-sm font-medium mb-1">In the Form System:</p>
          <ul className="list-disc ml-5 text-sm">
            <li>The formula uses the question_key in curly braces to reference other fields</li>
            <li>Calculations update in real-time as users fill out the form</li>
            <li>Results can be formatted as numbers, currency, percentages, etc.</li>
            <li>Hidden calculation fields are included in form submissions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}