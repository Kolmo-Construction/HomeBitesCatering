import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Question } from './HelpButton';

interface SuggestionResponse {
  suggestion: string;
  examples?: string[];
  tips?: string[];
}

interface ContextualHelpSidebarProps {
  question: {
    questionText: string;
    questionType: string;
    questionKey: string;
    helpText?: string;
  };
  currentValue?: any;
  formValues?: Record<string, any>;
  isOpen: boolean;
  onClose: () => void;
}

const ContextualHelpSidebar: React.FC<ContextualHelpSidebarProps> = ({
  question,
  currentValue,
  formValues,
  isOpen,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && question) {
      fetchSuggestions();
    }
  }, [isOpen, question]);

  const fetchSuggestions = async () => {
    if (!question) return;
    
    setLoading(true);
    setSuggestions(null);
    setError(null);
    
    try {
      const response = await fetch('/api/suggestions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionType: question.questionType,
          questionText: question.questionText,
          currentValue: currentValue,
          formValues: formValues
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }
      
      const data = await response.json();
      if (data.success && data.suggestion) {
        setSuggestions(data.suggestion);
      } else {
        setError('Invalid response format from suggestion service');
      }
    } catch (err) {
      setError('Unable to load suggestions at this time. Please try again later.');
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 md:w-96 bg-white shadow-lg border-l z-50 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Help & Suggestions</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
        
        <Separator className="my-4" />
        
        <div className="mb-4">
          <h4 className="font-medium mb-2">Question</h4>
          <p className="text-sm">{question.questionText}</p>
          {question.helpText && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>{question.helpText}</p>
            </div>
          )}
        </div>
        
        <Separator className="my-4" />
        
        <div>
          <h4 className="font-medium mb-2">Suggestions</h4>
          
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          )}
          
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
              {error}
            </div>
          )}
          
          {suggestions && !loading && (
            <div className="space-y-4">
              <Card className="p-3 bg-blue-50">
                <p className="text-sm">{suggestions.suggestion}</p>
              </Card>
              
              {suggestions.examples && suggestions.examples.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Examples</h5>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {suggestions.examples.map((example, i) => (
                      <li key={i}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {suggestions.tips && suggestions.tips.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Tips</h5>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {suggestions.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextualHelpSidebar;