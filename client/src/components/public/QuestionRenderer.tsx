import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface Question {
  id: number;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  fieldKey: string;
  metadata?: Record<string, any>;
  options?: QuestionOption[];
}

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

export function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const {
    questionText,
    questionType,
    isRequired,
    options = [],
    metadata = {},
  } = question;

  const handleSelectChange = (newValue: string) => {
    onChange(newValue);
  };

  const handleCheckboxChange = (option: QuestionOption, checked: boolean) => {
    // For checkboxes, we maintain an array of selected values
    const currentValues = Array.isArray(value) ? [...value] : [];
    
    if (checked) {
      // Add the value if it's not already in the array
      if (!currentValues.includes(option.value)) {
        onChange([...currentValues, option.value]);
      }
    } else {
      // Remove the value if it's in the array
      onChange(currentValues.filter(v => v !== option.value));
    }
  };

  const renderField = () => {
    switch (questionType) {
      case 'text':
        return (
          <Input
            type="text"
            id={`question-${question.id}`}
            placeholder={metadata.placeholder || ''}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
          />
        );
        
      case 'textarea':
        return (
          <Textarea
            id={`question-${question.id}`}
            placeholder={metadata.placeholder || ''}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
            rows={5}
          />
        );
        
      case 'select':
        return (
          <Select value={value || ''} onValueChange={handleSelectChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={metadata.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'radio':
        return (
          <RadioGroup
            value={value || ''}
            onValueChange={onChange}
            className="space-y-2 mt-2"
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem id={`radio-${option.value}`} value={option.value} />
                <Label htmlFor={`radio-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-3 mt-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`checkbox-${option.value}`}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)}
                />
                <Label htmlFor={`checkbox-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        );
        
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground"
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
                onSelect={(date) => onChange(date?.toISOString() || null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
        
      case 'email':
        return (
          <Input
            type="email"
            id={`question-${question.id}`}
            placeholder={metadata.placeholder || 'Email address'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
          />
        );
        
      case 'phone':
        return (
          <Input
            type="tel"
            id={`question-${question.id}`}
            placeholder={metadata.placeholder || 'Phone number'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            id={`question-${question.id}`}
            placeholder={metadata.placeholder || ''}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
            min={metadata.min}
            max={metadata.max}
            step={metadata.step || 1}
          />
        );
        
      case 'header':
        // Headers don't have input elements
        return null;
        
      case 'text_display':
        // Text display doesn't have input elements
        return (
          <div className="prose prose-sm max-w-none">
            {metadata.displayText && (
              <div dangerouslySetInnerHTML={{ __html: metadata.displayText }} />
            )}
          </div>
        );
        
      default:
        return (
          <Input
            type="text"
            id={`question-${question.id}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full"
          />
        );
    }
  };

  return (
    <div className="mb-6">
      {questionType !== 'header' && questionType !== 'text_display' ? (
        <Label 
          htmlFor={`question-${question.id}`} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {questionText}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>
      ) : questionType === 'header' ? (
        <h3 className="text-xl font-semibold mb-2 text-gray-900">{questionText}</h3>
      ) : null}
      
      {metadata.helperText && questionType !== 'header' && (
        <p className="text-sm text-gray-500 mb-2">{metadata.helperText}</p>
      )}
      
      {renderField()}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}