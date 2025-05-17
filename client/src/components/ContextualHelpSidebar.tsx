import React, { useState, useEffect } from 'react';
import { Lightbulb, X, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [basicHelp, setBasicHelp] = useState<string>('');
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch basic help for this question type when the question changes
  useEffect(() => {
    if (!isOpen || !question) return;
    
    const fetchBasicHelp = async () => {
      try {
        const response = await fetch(`/api/suggestions/help/${question.questionType}`);
        if (response.ok) {
          const data = await response.json();
          setBasicHelp(data.helpText || '');
        }
      } catch (err) {
        console.error('Error fetching basic help:', err);
      }
    };
    
    fetchBasicHelp();
  }, [question, isOpen]);
  
  // Fetch AI suggestions when the sidebar is opened or question changes
  useEffect(() => {
    if (!isOpen || !question) return;
    
    const fetchSuggestions = async () => {
      setLoading(true);
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
            currentValue,
            formValues,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        
        const data = await response.json();
        if (data.success && data.suggestion) {
          setSuggestion(data.suggestion);
        } else {
          setError(data.message || 'No suggestions available');
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setError('Unable to generate suggestions at this time.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuggestions();
  }, [question, currentValue, isOpen]);
  
  // Function to refresh suggestions
  const refreshSuggestions = () => {
    setLoading(true);
    setError(null);
    
    fetch('/api/suggestions/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionType: question.questionType,
        questionText: question.questionText,
        currentValue,
        formValues,
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to refresh suggestions');
        }
        return response.json();
      })
      .then(data => {
        if (data.success && data.suggestion) {
          setSuggestion(data.suggestion);
          toast({
            title: "Suggestions refreshed",
            description: "New AI suggestions are now available.",
          });
        } else {
          setError(data.message || 'No new suggestions available');
        }
      })
      .catch(err => {
        console.error('Error refreshing suggestions:', err);
        setError('Unable to refresh suggestions at this time.');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to refresh suggestions.",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  // Function to send feedback about the suggestion
  const sendFeedback = (helpful: boolean) => {
    toast({
      title: helpful ? "Thanks for the feedback!" : "We'll improve our suggestions",
      description: helpful 
        ? "We're glad you found this helpful." 
        : "Thanks for letting us know. We'll work to improve our suggestions.",
    });
  };
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="fixed right-0 top-0 z-50 h-full w-80 bg-white shadow-lg border-l border-gray-200 overflow-y-auto transition-transform duration-300 transform translate-x-0">
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center">
          <Lightbulb className="h-5 w-5 text-amber-500 mr-2" />
          <h2 className="text-lg font-semibold">Help & Suggestions</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Question</h3>
          <p className="mt-1 text-base font-medium">{question.questionText}</p>
        </div>
        
        <Separator />
        
        {/* Basic help section */}
        <div>
          <h3 className="text-sm font-medium text-gray-500">General Guidance</h3>
          <p className="mt-1 text-sm">{basicHelp || "Provide a clear and accurate response."}</p>
        </div>
        
        <Separator />
        
        {/* AI suggestions section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-500">AI Suggestions</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshSuggestions} 
              disabled={loading}
              className="h-8 px-2"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
          
          {loading ? (
            <Card className="border border-gray-200">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <p className="text-sm text-red-500">{error}</p>
              </CardContent>
            </Card>
          ) : suggestion ? (
            <div className="space-y-3">
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <p className="text-sm">{suggestion.suggestion}</p>
                </CardContent>
              </Card>
              
              {suggestion.examples && suggestion.examples.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Examples</h4>
                  <ul className="text-sm space-y-1 pl-5 list-disc">
                    {suggestion.examples.map((example, i) => (
                      <li key={i}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {suggestion.tips && suggestion.tips.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Tips</h4>
                  <ul className="text-sm space-y-1 pl-5 list-disc">
                    {suggestion.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => sendFeedback(false)}
                  className="h-8"
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Not helpful
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => sendFeedback(true)}
                  className="h-8"
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Helpful
                </Button>
              </div>
            </div>
          ) : (
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">No suggestions available.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextualHelpSidebar;