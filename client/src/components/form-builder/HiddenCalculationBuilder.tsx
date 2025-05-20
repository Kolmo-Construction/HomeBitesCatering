import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { extractQuestionReferences } from '../../lib/calculation-utils';

interface HiddenCalculationBuilderProps {
  initialFormula?: string;
  initialDataType?: 'number' | 'currency' | 'percentage';
  initialPrecision?: number;
  initialFormatOptions?: {
    prefix?: string;
    suffix?: string;
  };
  initialDescription?: string;
  availableQuestions: Array<{ key: string; text: string }>;
  onSave: (data: {
    formula: string;
    dataType: 'number' | 'currency' | 'percentage';
    precision: number;
    formatOptions?: {
      prefix?: string;
      suffix?: string;
    };
    description?: string;
  }) => void;
}

const HiddenCalculationBuilder: React.FC<HiddenCalculationBuilderProps> = ({
  initialFormula = '',
  initialDataType = 'number',
  initialPrecision = 2,
  initialFormatOptions = {},
  initialDescription = '',
  availableQuestions,
  onSave
}) => {
  const [formula, setFormula] = useState(initialFormula);
  const [dataType, setDataType] = useState<'number' | 'currency' | 'percentage'>(initialDataType);
  const [precision, setPrecision] = useState(initialPrecision);
  const [prefix, setPrefix] = useState(initialFormatOptions?.prefix || '');
  const [suffix, setSuffix] = useState(initialFormatOptions?.suffix || '');
  const [description, setDescription] = useState(initialDescription);
  
  // Extract and validate question references
  const referencedKeys = extractQuestionReferences(formula);
  const invalidRefs = referencedKeys.filter(
    key => !availableQuestions.some(q => q.key === key)
  );
  
  const handleSave = () => {
    if (invalidRefs.length > 0) {
      // Don't allow saving with invalid references
      alert(`Invalid question references: ${invalidRefs.join(', ')}`);
      return;
    }
    
    onSave({
      formula,
      dataType,
      precision,
      formatOptions: {
        prefix: prefix || undefined,
        suffix: suffix || undefined,
      },
      description: description || undefined,
    });
  };
  
  // Insert a question reference at the cursor position
  const insertQuestion = (questionKey: string) => {
    setFormula(prev => prev + ` {${questionKey}}`);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Hidden Calculation Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="formula">Formula</Label>
          <Textarea
            id="formula"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="Enter calculation formula, e.g. {question1} + {question2} * 5"
            className="font-mono min-h-[100px]"
          />
          {invalidRefs.length > 0 && (
            <div className="text-red-500 text-sm">
              Invalid references: {invalidRefs.join(', ')}
            </div>
          )}
          <p className="text-sm text-gray-500">
            Use {'{question_key}'} syntax to reference other questions' values.
          </p>
        </div>
        
        <div>
          <Label>Available Questions</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {availableQuestions.map((q) => (
              <Button
                key={q.key}
                variant="outline"
                size="sm"
                onClick={() => insertQuestion(q.key)}
                title={q.text}
              >
                {q.key}
              </Button>
            ))}
          </div>
        </div>
        
        {referencedKeys.length > 0 && (
          <div>
            <Label>Referenced Questions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {referencedKeys.map((key) => {
                const question = availableQuestions.find((q) => q.key === key);
                const isValid = !!question;
                
                return (
                  <Badge
                    key={key}
                    variant={isValid ? "secondary" : "destructive"}
                  >
                    {key}: {isValid ? question.text : 'Unknown Question'}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dataType">Data Type</Label>
            <Select
              value={dataType}
              onValueChange={(value: 'number' | 'currency' | 'percentage') => setDataType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="precision">Decimal Places</Label>
            <Input
              id="precision"
              type="number"
              min={0}
              max={10}
              value={precision}
              onChange={(e) => setPrecision(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="prefix">Prefix</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder={dataType === 'currency' ? '$' : ''}
            />
          </div>
          
          <div>
            <Label htmlFor="suffix">Suffix</Label>
            <Input
              id="suffix"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder={dataType === 'percentage' ? '%' : ''}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="description">Internal Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this calculation do? (Not shown to users)"
          />
        </div>
        
        <Button onClick={handleSave} className="w-full">
          Save Hidden Calculation
        </Button>
      </CardContent>
    </Card>
  );
};

export default HiddenCalculationBuilder;