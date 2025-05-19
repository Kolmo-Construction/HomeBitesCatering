import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';

interface QuestionOption {
  label: string;
  value: string;
}

interface Question {
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
}

export function QuestionRenderer({ question }: QuestionRendererProps) {
  const { control } = useFormContext();

  const getPlaceholder = () => {
    return question.metadata?.placeholder || 'Type here...';
  };

  const getHelperText = () => {
    return question.metadata?.helper || '';
  };

  // Render different input types based on question type
  const renderQuestionInput = () => {
    switch(question.questionType) {
      case 'text':
        return (
          <FormField
            control={control}
            name={question.fieldKey}
            rules={{ required: question.isRequired }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={getPlaceholder()} />
                </FormControl>
                {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'textarea':
        return (
          <FormField
            control={control}
            name={question.fieldKey}
            rules={{ required: question.isRequired }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder={getPlaceholder()} />
                </FormControl>
                {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'email':
        return (
          <FormField
            control={control}
            name={question.fieldKey}
            rules={{ 
              required: question.isRequired,
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              }
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder={getPlaceholder()} />
                </FormControl>
                {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'phone':
        return (
          <FormField
            control={control}
            name={question.fieldKey}
            rules={{ required: question.isRequired }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" placeholder={getPlaceholder()} />
                </FormControl>
                {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'number':
        return (
          <FormField
            control={control}
            name={question.fieldKey}
            rules={{ required: question.isRequired }}
            render={({ field: { onChange, onBlur, value, ref, name } }) => (
              <FormItem>
                <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                    name={name}
                    type="number"
                    placeholder={getPlaceholder()}
                  />
                </FormControl>
                {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'datetime':
        return (
          <FormField
            control={control}
            name={question.fieldKey}
            rules={{ required: question.isRequired }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" />
                </FormControl>
                {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'date':
        return (
          <FormField
            control={control}
            name={question.fieldKey}
            rules={{ required: question.isRequired }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'radio':
        return (
          <FormField
            control={control}
            name={question.fieldKey}
            rules={{ required: question.isRequired }}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    {question.options?.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`${question.fieldKey}-${option.value}`} />
                        <Label htmlFor={`${question.fieldKey}-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'checkbox':
        return (
          <div className="space-y-3">
            <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
            {question.options?.map(option => (
              <FormField
                key={option.value}
                control={control}
                name={`${question.fieldKey}.${option.value}`}
                render={({ field }) => (
                  <FormItem key={option.value} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        {option.label}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            ))}
            {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
          </div>
        );
        
      case 'header':
        return (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{question.questionText}</h2>
            {getHelperText() && <p className="text-gray-600 mt-2">{getHelperText()}</p>}
          </div>
        );
        
      case 'info_text':
        return (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-2">{question.questionText}</h3>
              {getHelperText() && <p className="text-gray-700">{getHelperText()}</p>}
            </div>
          </div>
        );
        
      // Implement other question types as needed (full_name, address, etc.)
      case 'full_name':
        const placeholders = getPlaceholder()?.split(';') || ['First name', 'Last name'];
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name={`${question.fieldKey}_first`}
              rules={{ required: question.isRequired }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={placeholders[0]} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`${question.fieldKey}_last`}
              rules={{ required: question.isRequired }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={placeholders[1]} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        
      case 'address':
        const addressPlaceholders = getPlaceholder()?.split(';') || [
          'Street Address', 'Street Address Line 2', 'City', 'State / Province', 'Postal / Zip Code'
        ];
        
        return (
          <div className="space-y-4">
            <FormLabel>{question.questionText}{question.isRequired && <span className="text-red-500">*</span>}</FormLabel>
            
            <FormField
              control={control}
              name={`${question.fieldKey}_street`}
              rules={{ required: question.isRequired }}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder={addressPlaceholders[0]} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={control}
              name={`${question.fieldKey}_street2`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder={addressPlaceholders[1]} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name={`${question.fieldKey}_city`}
                rules={{ required: question.isRequired }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} placeholder={addressPlaceholders[2]} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name={`${question.fieldKey}_state`}
                rules={{ required: question.isRequired }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} placeholder={addressPlaceholders[3]} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={control}
              name={`${question.fieldKey}_zip`}
              rules={{ required: question.isRequired }}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} placeholder={addressPlaceholders[4]} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {getHelperText() && <FormDescription>{getHelperText()}</FormDescription>}
          </div>
        );
        
      default:
        return (
          <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-md">
            <p className="text-yellow-800">Question type "{question.questionType}" is not supported yet.</p>
          </div>
        );
    }
  };

  return (
    <div className="question-wrapper">
      {renderQuestionInput()}
    </div>
  );
}