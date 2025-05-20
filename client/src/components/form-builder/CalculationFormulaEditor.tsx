import React, { useState, useEffect } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { extractQuestionReferences } from '../../lib/calculation-utils';

interface CalculationFormulaEditorProps {
  formula: string;
  dataType: 'number' | 'currency' | 'percentage';
  precision: number;
  prefix?: string;
  suffix?: string;
  description?: string;
  availableQuestions: Array<{ key: string; text: string }>;
  onChange: (values: {
    formula: string;
    dataType: 'number' | 'currency' | 'percentage';
    precision: number;
    prefix?: string;
    suffix?: string;
    description?: string;
  }) => void;
}

const CalculationFormulaEditor: React.FC<CalculationFormulaEditorProps> = ({
  formula,
  dataType,
  precision,
  prefix,
  suffix,
  description,
  availableQuestions,
  onChange,
}) => {
  const [localFormula, setLocalFormula] = useState(formula);
  const [localDataType, setLocalDataType] = useState<'number' | 'currency' | 'percentage'>(dataType);
  const [localPrecision, setLocalPrecision] = useState(precision);
  const [localPrefix, setLocalPrefix] = useState(prefix || '');
  const [localSuffix, setLocalSuffix] = useState(suffix || '');
  const [localDescription, setLocalDescription] = useState(description || '');
  const [referencedQuestions, setReferencedQuestions] = useState<string[]>([]);

  // Update referenced questions when formula changes
  useEffect(() => {
    setReferencedQuestions(extractQuestionReferences(localFormula));
  }, [localFormula]);

  // Apply changes when any value changes
  useEffect(() => {
    onChange({
      formula: localFormula,
      dataType: localDataType,
      precision: localPrecision,
      prefix: localPrefix || undefined,
      suffix: localSuffix || undefined,
      description: localDescription || undefined,
    });
  }, [localFormula, localDataType, localPrecision, localPrefix, localSuffix, localDescription, onChange]);

  // Insert a question reference into the formula
  const insertQuestionReference = (questionKey: string) => {
    setLocalFormula((prev) => prev + ` {${questionKey}}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculation Formula</CardTitle>
        <CardDescription>
          Create a formula to calculate values using other form fields.
          Use {'{question_key}'} syntax to reference other questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="formula">Formula</Label>
          <Textarea
            id="formula"
            value={localFormula}
            onChange={(e) => setLocalFormula(e.target.value)}
            placeholder="Example: {question_1} + {question_2} * 5"
            className="font-mono"
          />
        </div>
        
        <div>
          <Label>Available Questions</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {availableQuestions.map((q) => (
              <Button
                key={q.key}
                variant="outline"
                size="sm"
                onClick={() => insertQuestionReference(q.key)}
                title={q.text}
              >
                {q.key}
              </Button>
            ))}
          </div>
        </div>
        
        {referencedQuestions.length > 0 && (
          <div>
            <Label>Referenced Questions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {referencedQuestions.map((key) => {
                const question = availableQuestions.find((q) => q.key === key);
                return (
                  <Badge key={key} variant="secondary">
                    {key}: {question?.text || 'Unknown Question'}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dataType">Data Type</Label>
            <Select
              value={localDataType}
              onValueChange={(value: 'number' | 'currency' | 'percentage') => setLocalDataType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
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
              value={localPrecision}
              onChange={(e) => setLocalPrecision(parseInt(e.target.value) || 0)}
            />
          </div>
          
          {localDataType === 'number' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="prefix">Prefix</Label>
                <Input
                  id="prefix"
                  value={localPrefix}
                  onChange={(e) => setLocalPrefix(e.target.value)}
                  placeholder="e.g. $"
                />
              </div>
              <div>
                <Label htmlFor="suffix">Suffix</Label>
                <Input
                  id="suffix"
                  value={localSuffix}
                  onChange={(e) => setLocalSuffix(e.target.value)}
                  placeholder="e.g. %"
                />
              </div>
            </div>
          )}
        </div>
        
        <div>
          <Label htmlFor="description">Description (Internal Only)</Label>
          <Textarea
            id="description"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            placeholder="Describe what this calculation does"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CalculationFormulaEditor;