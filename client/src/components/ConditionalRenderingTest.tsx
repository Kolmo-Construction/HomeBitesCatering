import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';

interface QuestionOption {
  id: number;
  optionText: string;
  optionValue: string;
  order: number;
}

interface Question {
  id: number;
  questionText: string;
  questionKey: string;
  questionType: string;
  isRequired: boolean;
  helpText?: string;
  dependsOn?: string;
  showIf?: string;
  options?: QuestionOption[];
}

// A simplified test component to verify conditional rendering
const ConditionalRenderingTest: React.FC = () => {
  const [formData, setFormData] = useState<Record<string, any>>({
    // Default values
    toggleField: false,
    sliderField: 0,
    incrementerField: 0
  });
  
  // Test cases for conditional rendering
  const testCases: Question[] = [
    {
      id: 1,
      questionText: "Toggle Field",
      questionKey: "toggleField",
      questionType: "toggle",
      isRequired: false,
      helpText: "This toggle controls the visibility of other fields"
    },
    {
      id: 2,
      questionText: "Text Field (shows when toggle is ON)",
      questionKey: "textField1",
      questionType: "text",
      isRequired: false,
      helpText: "This field should only appear when the toggle is ON",
      dependsOn: "toggleField",
      showIf: "true"
    },
    {
      id: 3,
      questionText: "Text Field (shows when toggle is OFF)",
      questionKey: "textField2",
      questionType: "text",
      isRequired: false,
      helpText: "This field should only appear when the toggle is OFF",
      dependsOn: "toggleField",
      showIf: "false"
    },
    {
      id: 4,
      questionText: "Slider Field",
      questionKey: "sliderField",
      questionType: "slider",
      isRequired: false,
      helpText: "This slider controls the visibility of other fields",
      options: [
        { id: 1, optionText: "0", optionValue: "min", order: 1 },
        { id: 2, optionText: "10", optionValue: "max", order: 2 },
        { id: 3, optionText: "1", optionValue: "step", order: 3 }
      ]
    },
    {
      id: 5,
      questionText: "Text Field (shows when slider is 5)",
      questionKey: "textField3",
      questionType: "text",
      isRequired: false,
      helpText: "This field should only appear when the slider is exactly 5",
      dependsOn: "sliderField",
      showIf: "5"
    },
    {
      id: 6,
      questionText: "Incrementer Field",
      questionKey: "incrementerField",
      questionType: "incrementer",
      isRequired: false,
      helpText: "This incrementer controls the visibility of other fields"
    },
    {
      id: 7,
      questionText: "Text Field (shows when incrementer is 3)",
      questionKey: "textField4",
      questionType: "text",
      isRequired: false,
      helpText: "This field should only appear when the incrementer is exactly 3",
      dependsOn: "incrementerField",
      showIf: "3"
    }
  ];

  // Function to check if a question should be visible based on dependencies
  const isQuestionVisible = (question: Question): boolean => {
    // If the question has no dependency, it's always visible
    if (!question.dependsOn || !question.showIf) {
      return true;
    }
    
    // Get the value of the field this question depends on
    const dependentValue = formData[question.dependsOn];
    
    // Log dependency information for debugging
    console.log(`Checking visibility for question: ${question.questionText}`);
    console.log(`  Depends on: ${question.dependsOn} with value: ${dependentValue} (${typeof dependentValue})`);
    console.log(`  Should show if: ${question.showIf} (${typeof question.showIf})`);
    
    // Handle undefined values - if the dependent field has no value yet, 
    // hide dependent questions
    if (dependentValue === undefined || dependentValue === null) {
      console.log(`  Result: Hidden (dependent value is undefined/null)`);
      return false;
    }
    
    const stringShowIf = String(question.showIf);
    let result = false;
    
    // Handle boolean values and toggle switches
    if (stringShowIf === 'true' || stringShowIf === 'false') {
      // Convert to proper boolean for comparison
      const boolShowIf = stringShowIf === 'true';
      
      // Check if dependent value is boolean or string representation of boolean
      if (typeof dependentValue === 'boolean') {
        result = dependentValue === boolShowIf;
        console.log(`  Result: ${result} (boolean comparison)`);
        return result;
      } else if (dependentValue === 'true' || dependentValue === 'false') {
        result = (dependentValue === 'true') === boolShowIf;
        console.log(`  Result: ${result} (string boolean comparison)`);
        return result;
      }
    }
    
    // For numeric values (sliders, incrementers, etc.)
    if (!isNaN(Number(stringShowIf))) {
      const numShowIf = Number(stringShowIf);
      
      if (typeof dependentValue === 'number') {
        result = dependentValue === numShowIf;
        console.log(`  Result: ${result} (number comparison)`);
        return result;
      } else if (!isNaN(Number(dependentValue))) {
        result = Number(dependentValue) === numShowIf;
        console.log(`  Result: ${result} (string number comparison)`);
        return result;
      }
    }
    
    // Default string comparison
    result = String(dependentValue) === stringShowIf;
    console.log(`  Result: ${result} (string comparison)`);
    return result;
  };
  
  // Handle field changes
  const handleInputChange = (questionKey: string, value: any) => {
    console.log(`Field changed: ${questionKey} = ${value} (${typeof value})`);
    setFormData(prev => ({ ...prev, [questionKey]: value }));
  };
  
  // Render fields based on their type
  const renderField = (question: Question) => {
    const { questionType, questionText, questionKey, helpText, options } = question;
    
    switch (questionType) {
      case 'toggle':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={questionKey}>
                {questionText}
              </Label>
              <Switch
                id={questionKey}
                checked={formData[questionKey] === true}
                onCheckedChange={(checked) => {
                  handleInputChange(questionKey, checked);
                }}
              />
            </div>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <div className="text-xs text-blue-500">
              Current value: {String(formData[questionKey])}
            </div>
          </div>
        );
        
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <Input 
              id={questionKey}
              type="text" 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
            />
          </div>
        );
        
      case 'slider':
        // Get slider metadata from options
        const sliderMin = options?.find((opt: any) => opt.optionValue === 'min')?.optionText || '0';
        const sliderMax = options?.find((opt: any) => opt.optionValue === 'max')?.optionText || '100';
        const sliderStep = options?.find((opt: any) => opt.optionValue === 'step')?.optionText || '1';
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor={questionKey}>
                {questionText}
              </Label>
              <span className="font-medium text-sm">
                {formData[questionKey]}
              </span>
            </div>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <Slider
              id={questionKey}
              min={Number(sliderMin)}
              max={Number(sliderMax)}
              step={Number(sliderStep)}
              value={[formData[questionKey]]}
              onValueChange={(value) => {
                handleInputChange(questionKey, value[0]);
              }}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{sliderMin}</span>
              <span>{sliderMax}</span>
            </div>
            <div className="text-xs text-blue-500">
              Current value: {formData[questionKey]}
            </div>
          </div>
        );
        
      case 'incrementer':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 rounded-r-none"
                onClick={() => {
                  const currentValue = Number(formData[questionKey] || 0);
                  if (currentValue > 0) {
                    handleInputChange(questionKey, currentValue - 1);
                  }
                }}
              >
                -
              </Button>
              <Input
                id={questionKey}
                type="number"
                className="h-8 rounded-none text-center w-16"
                value={formData[questionKey]}
                onChange={(e) => handleInputChange(questionKey, Number(e.target.value))}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 rounded-l-none"
                onClick={() => {
                  const currentValue = Number(formData[questionKey] || 0);
                  handleInputChange(questionKey, currentValue + 1);
                }}
              >
                +
              </Button>
            </div>
            <div className="text-xs text-blue-500">
              Current value: {formData[questionKey]}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Conditional Rendering Test</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-8">
          {testCases.map((question) => (
            // Only render the question if it should be visible based on dependencies
            isQuestionVisible(question) && (
              <div key={question.id} className="pb-4">
                {renderField(question)}
                {question.dependsOn && (
                  <div className="text-xs italic text-gray-500 mt-1">
                    This field depends on: {question.dependsOn} with condition: {question.showIf}
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      </CardContent>
      
      <CardFooter>
        <pre className="text-xs bg-gray-100 p-4 rounded w-full overflow-auto max-h-60">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </CardFooter>
    </Card>
  );
};

export default ConditionalRenderingTest;