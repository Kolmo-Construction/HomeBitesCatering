import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

// Define the Question type
export interface Question {
  id: number;
  questionText: string;
  questionType: string;
  fieldKey: string;
  isRequired: boolean;
  isHidden?: boolean;
  metadata?: {
    placeholder?: string;
    helperText?: string;
    displayText?: string;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: any;
    validationRule?: string;
    length?: number;
  };
  options?: {
    label: string;
    value: string;
  }[];
}

// Props for the QuestionRenderer component
interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  // Skip rendering if question is hidden
  if (question.isHidden) {
    return null;
  }

  // Helper to generate the helper text
  const getHelperText = () => {
    const helperText = question.metadata?.helperText || '';
    const required = question.isRequired ? ' (Required)' : '';
    return `${helperText}${required}`;
  };

  // Generate error message display
  const renderError = () => {
    if (!error) return null;
    return <p className="text-sm text-red-500 mt-1">{error}</p>;
  };

  // Renders different question types
  switch (question.questionType) {
    case 'header':
      return (
        <div className="mb-6">
          <h2 className="text-xl font-bold">{question.questionText}</h2>
          {question.metadata?.helperText && (
            <p className="text-gray-600 mt-1">{question.metadata.helperText}</p>
          )}
        </div>
      );

    case 'text_display':
      return (
        <div className="mb-6">
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: question.metadata?.displayText || question.questionText }}
          />
        </div>
      );

    case 'textbox':
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label htmlFor={question.fieldKey}>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={question.fieldKey}
              type="text"
              placeholder={question.metadata?.placeholder}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    case 'textarea':
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label htmlFor={question.fieldKey}>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={question.fieldKey}
              placeholder={question.metadata?.placeholder}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={error ? 'border-red-500' : ''}
              rows={5}
            />
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    case 'email':
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label htmlFor={question.fieldKey}>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={question.fieldKey}
              type="email"
              placeholder={question.metadata?.placeholder || 'email@example.com'}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    case 'phone':
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label htmlFor={question.fieldKey}>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={question.fieldKey}
              type="tel"
              placeholder={question.metadata?.placeholder || '(123) 456-7890'}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    case 'number':
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label htmlFor={question.fieldKey}>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={question.fieldKey}
              type="number"
              placeholder={question.metadata?.placeholder}
              value={value ?? ''}
              min={question.metadata?.min}
              max={question.metadata?.max}
              step={question.metadata?.step || 1}
              onChange={(e) => onChange(e.target.valueAsNumber || null)}
              className={error ? 'border-red-500' : ''}
            />
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );
      
    case 'date':
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label htmlFor={question.fieldKey}>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground",
                    error ? 'border-red-500' : ''
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={onChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    case 'checkbox_group':
      if (!question.options || question.options.length === 0) {
        return (
          <div className="mb-6">
            <p className="text-red-500">Error: No options provided for checkbox group.</p>
          </div>
        );
      }
      
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {question.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.fieldKey}-${option.value}`}
                    checked={Array.isArray(value) && value.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (!Array.isArray(value)) {
                        // Initialize as array if not already
                        onChange(checked ? [option.value] : []);
                      } else if (checked) {
                        // Add to array
                        onChange([...value, option.value]);
                      } else {
                        // Remove from array
                        onChange(value.filter((v: string) => v !== option.value));
                      }
                    }}
                  />
                  <Label
                    htmlFor={`${question.fieldKey}-${option.value}`}
                    className="text-sm font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    case 'radio_group':
      if (!question.options || question.options.length === 0) {
        return (
          <div className="mb-6">
            <p className="text-red-500">Error: No options provided for radio group.</p>
          </div>
        );
      }
      
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={value || ''}
              onValueChange={onChange}
            >
              <div className="space-y-2">
                {question.options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${question.fieldKey}-${option.value}`} />
                    <Label
                      htmlFor={`${question.fieldKey}-${option.value}`}
                      className="text-sm font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    case 'dropdown':
      if (!question.options || question.options.length === 0) {
        return (
          <div className="mb-6">
            <p className="text-red-500">Error: No options provided for dropdown.</p>
          </div>
        );
      }
      
      return (
        <div className="mb-6">
          <div className="space-y-2">
            <Label htmlFor={question.fieldKey}>
              {question.questionText}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={onChange}
            >
              <SelectTrigger id={question.fieldKey} className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    case 'toggle':
      return (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={question.fieldKey}>
                {question.questionText}
                {question.isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {question.metadata?.helperText && (
                <p className="text-sm text-gray-500">{question.metadata.helperText}</p>
              )}
            </div>
            <Switch
              id={question.fieldKey}
              checked={value || false}
              onCheckedChange={onChange}
            />
          </div>
          {renderError()}
        </div>
      );

    case 'slider':
      const min = question.metadata?.min || 0;
      const max = question.metadata?.max || 100;
      const step = question.metadata?.step || 1;
      
      return (
        <div className="mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor={question.fieldKey}>
                {question.questionText}
                {question.isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              <span className="text-sm font-medium">{value || min}</span>
            </div>
            <Slider
              id={question.fieldKey}
              min={min}
              max={max}
              step={step}
              value={[value || min]}
              onValueChange={(values) => onChange(values[0])}
              className={error ? 'border-red-500' : ''}
            />
            {getHelperText() && <p className="text-sm text-gray-500">{getHelperText()}</p>}
            {renderError()}
          </div>
        </div>
      );

    // Add additional question types as needed
      
    default:
      return (
        <div className="mb-6">
          <p className="text-yellow-600">
            Unsupported question type: {question.questionType}
          </p>
        </div>
      );
  }
}