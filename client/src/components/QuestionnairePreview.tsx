import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Question = {
  id: number;
  questionText: string;
  questionKey: string;
  questionType: string;
  isRequired: boolean;
  helpText?: string;
  placeholderText?: string;
  order: number;
  options?: {
    id: number;
    optionText: string;
    optionValue: string;
    order: number;
  }[];
};

type Page = {
  id: number;
  title: string;
  description?: string;
  order: number;
};

type PreviewProps = {
  definitionId: number;
  pages: Page[];
  questionsMap: Record<number, Question[]>;
  onClose: () => void;
};

const QuestionnairePreview: React.FC<PreviewProps> = ({ 
  definitionId, 
  pages, 
  questionsMap, 
  onClose 
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sortedPages = [...pages].sort((a, b) => a.order - b.order);
  const currentPage = sortedPages[currentPageIndex];
  
  const handleInputChange = (questionKey: string, value: any) => {
    setFormData({ ...formData, [questionKey]: value });
    
    // Clear error for this field if it exists
    if (errors[questionKey]) {
      const newErrors = { ...errors };
      delete newErrors[questionKey];
      setErrors(newErrors);
    }
  };

  const validatePage = () => {
    const newErrors: Record<string, string> = {};
    const currentQuestions = questionsMap[currentPage.id] || [];
    
    currentQuestions.forEach(question => {
      // Skip validation for unsupported question types in preview mode
      const unsupportedTypes = ['name', 'address', 'matrix', 'file']; 
      if (unsupportedTypes.includes(question.questionType)) {
        // Auto-populate with dummy data for preview navigation
        if (question.isRequired && !formData[question.questionKey]) {
          handleInputChange(question.questionKey, `preview_data_for_${question.questionKey}`);
        }
        return;
      }
      
      if (question.isRequired) {
        const value = formData[question.questionKey];
        if (value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
          newErrors[question.questionKey] = 'This field is required';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    const isValid = validatePage();
    
    // Even if not valid, we want to allow proceeding in preview mode
    if (isValid || Object.keys(errors).length === 0) {
      setCurrentPageIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    } else {
      // Add a small delay and try again - this helps with unsupported fields
      setTimeout(() => {
        console.log("Retrying navigation with validation bypass");
        setCurrentPageIndex(prev => prev + 1);
        window.scrollTo(0, 0);
      }, 100);
    }
  };

  const handlePrevious = () => {
    setCurrentPageIndex(prev => prev - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = () => {
    // Always succeed in preview mode
    validatePage();
    alert('Preview complete! In production, this form would be submitted with the collected data.');
  };

  const renderQuestion = (question: Question) => {
    const { questionType, questionText, questionKey, helpText, isRequired, placeholderText, options } = question;
    
    const errorMessage = errors[questionKey];
    
    switch (questionType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey} className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <Input 
              id={questionKey}
              type={questionType === 'email' ? 'email' : 'text'} 
              placeholder={placeholderText || ''} 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={errorMessage ? 'border-red-500' : ''}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey} className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <Input 
              id={questionKey}
              type="number" 
              placeholder={placeholderText || ''} 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={errorMessage ? 'border-red-500' : ''}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey} className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <Textarea 
              id={questionKey}
              placeholder={placeholderText || ''} 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={errorMessage ? 'border-red-500' : ''}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey} className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <Select 
              value={formData[questionKey] || ''} 
              onValueChange={(value) => handleInputChange(questionKey, value)}
            >
              <SelectTrigger 
                id={questionKey}
                className={errorMessage ? 'border-red-500' : ''}
              >
                <SelectValue placeholder={placeholderText || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {options?.sort((a, b) => a.order - b.order).map((option) => (
                  <SelectItem key={option.id} value={option.optionValue}>
                    {option.optionText}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'radio':
        return (
          <div className="space-y-2">
            <Label className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <RadioGroup 
              value={formData[questionKey] || ''} 
              onValueChange={(value) => handleInputChange(questionKey, value)}
              className="space-y-1"
            >
              {options?.sort((a, b) => a.order - b.order).map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.optionValue} id={`${questionKey}-${option.id}`} />
                  <Label htmlFor={`${questionKey}-${option.id}`}>{option.optionText}</Label>
                </div>
              ))}
            </RadioGroup>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-2">
            <Label className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <div className="space-y-2">
              {options?.sort((a, b) => a.order - b.order).map((option) => {
                const checkboxValues = formData[questionKey] || [];
                return (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`${questionKey}-${option.id}`} 
                      checked={checkboxValues.includes(option.optionValue)}
                      onCheckedChange={(checked) => {
                        const currentValues = [...(formData[questionKey] || [])];
                        if (checked) {
                          if (!currentValues.includes(option.optionValue)) {
                            currentValues.push(option.optionValue);
                          }
                        } else {
                          const index = currentValues.indexOf(option.optionValue);
                          if (index > -1) {
                            currentValues.splice(index, 1);
                          }
                        }
                        handleInputChange(questionKey, currentValues);
                      }}
                    />
                    <Label htmlFor={`${questionKey}-${option.id}`}>{option.optionText}</Label>
                  </div>
                );
              })}
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey} className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <Input 
              id={questionKey}
              type="date" 
              value={formData[questionKey] || ''}
              onChange={(e) => handleInputChange(questionKey, e.target.value)}
              className={errorMessage ? 'border-red-500' : ''}
            />
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
        );
        
      case 'info_text':
        return (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">{questionText}</h3>
            {helpText && <p className="text-gray-700">{helpText}</p>}
          </div>
        );
        
      case 'address':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey} className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <div className="p-3 border rounded bg-blue-50">
              <p className="text-sm text-blue-600">
                Address input is not fully supported in preview mode. <br />
                <small className="text-blue-500">You can still proceed with the form preview.</small>
              </p>
            </div>
          </div>
        );
      
      case 'name':
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey} className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <div className="p-3 border rounded bg-blue-50">
              <p className="text-sm text-blue-600">
                Name input is not fully supported in preview mode. <br />
                <small className="text-blue-500">You can still proceed with the form preview.</small>
              </p>
            </div>
          </div>
        );
        
      case 'matrix':
        return (
          <div className="space-y-2">
            <Label className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <div className="p-3 border rounded bg-blue-50">
              <p className="text-sm text-blue-600">
                Matrix question type is not supported in preview mode. <br />
                <small className="text-blue-500">You can still proceed with the form preview.</small>
              </p>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={questionKey} className={cn(isRequired && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
              {questionText}
            </Label>
            {helpText && <p className="text-sm text-gray-500">{helpText}</p>}
            <div className="p-3 border rounded bg-blue-50">
              <p className="text-sm text-blue-600">
                {`Question type "${questionType}" is not fully supported in preview mode.`} <br />
                <small className="text-blue-500">You can still proceed with the form preview.</small>
              </p>
            </div>
          </div>
        );
    }
  };

  if (!currentPage) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Questionnaire Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No pages found for this questionnaire.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onClose}>Close Preview</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{currentPage.title}</CardTitle>
            {currentPage.description && (
              <p className="text-sm text-gray-500 mt-1">{currentPage.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-1 text-sm">
            <span className="font-medium">Page {currentPageIndex + 1}</span>
            <span className="text-gray-500">of {sortedPages.length}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${((currentPageIndex + 1) / sortedPages.length) * 100}%` }}
          ></div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {(questionsMap[currentPage.id] || [])
            .sort((a, b) => a.order - b.order)
            .map((question) => (
              <div key={question.id} className="pb-4">
                {renderQuestion(question)}
              </div>
            ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div>
          {currentPageIndex > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
          
          {currentPageIndex < sortedPages.length - 1 ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              Submit
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default QuestionnairePreview;