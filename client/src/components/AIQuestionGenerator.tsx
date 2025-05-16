import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AIQuestionGeneratorProps {
  disabled?: boolean;
  pageId: number | null;
  definitionId: number | null;
  onSuccess?: () => void;
}

const AIQuestionGenerator: React.FC<AIQuestionGeneratorProps> = ({ 
  disabled = false, 
  pageId, 
  definitionId,
  onSuccess
}) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  // AI content generation
  const generateMutation = useMutation({
    mutationFn: async (promptText: string) => {
      if (!pageId || !definitionId) {
        throw new Error('Page and definition must be selected');
      }
      
      const response = await apiRequest('POST', '/api/admin/questionnaires/ai-generate', {
        prompt: promptText,
        questionnaireContext: {
          definitionId,
          pageId
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate content');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      toast({
        title: "Content generated",
        description: "AI has generated content based on your prompt",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate content",
        variant: "destructive",
      });
    }
  });

  // Import generated content
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!pageId || !definitionId || !generatedContent) {
        throw new Error('No content to import');
      }
      
      // Process each question in the generated content
      const questions = generatedContent.pages?.[0]?.questions || [];
      const importPromises = questions.map(async (question: any) => {
        // Map the AI-generated question to the format expected by the API
        const questionData: any = {
          questionText: question.questionText,
          questionKey: question.questionKey,
          questionType: question.questionType,
          isRequired: question.isRequired || false,
          order: question.order || 0,
          helpText: question.helpText || "",
          placeholderText: question.placeholderText || ""
        };
        
        // Only include options for appropriate question types
        if (question.options && ['select', 'radio', 'checkbox'].includes(question.questionType)) {
          questionData.options = question.options;
        }
        
        // Only include matrix data for matrix question type
        if (question.questionType === 'matrix') {
          if (question.matrixColumns) questionData.matrixColumns = question.matrixColumns;
          if (question.matrixRows) questionData.matrixRows = question.matrixRows;
        }
        
        const response = await apiRequest('POST', `/api/admin/questionnaires/pages/${pageId}/questions`, questionData);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to import question');
        }
        
        return response.json();
      });
      
      // Create array to store all operations (questions + conditional logic)
      const allOperations = [Promise.all(importPromises)];
      
      // Process conditional logic rules if they exist
      if (generatedContent.conditionalLogic && Array.isArray(generatedContent.conditionalLogic) && generatedContent.conditionalLogic.length > 0) {
        const conditionalLogicPromises = generatedContent.conditionalLogic.map(async (rule: any) => {
          const ruleData = {
            triggerQuestionKey: rule.triggerQuestionKey,
            triggerCondition: rule.triggerCondition,
            triggerValue: rule.triggerValue,
            actionType: rule.actionType,
            targetQuestionKey: rule.targetQuestionKey
          };
          
          const response = await apiRequest('POST', `/api/admin/questionnaires/definitions/${definitionId}/conditional-logic`, ruleData);
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to import conditional logic rule');
          }
          
          return response.json();
        });
        
        allOperations.push(Promise.all(conditionalLogicPromises));
      }
      
      // Wait for all operations to complete
      return Promise.all(allOperations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/pages', pageId, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', definitionId, 'all-questions'] });
      
      setOpen(false);
      setPrompt('');
      setGeneratedContent(null);
      
      toast({
        title: "Questions imported",
        description: "AI-generated questions have been added to your page",
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import questions",
        variant: "destructive",
      });
    }
  });

  const handleGenerateContent = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please provide a description of what you want to generate",
        variant: "destructive",
      });
      return;
    }
    
    generateMutation.mutate(prompt);
  };

  const handleImportContent = () => {
    if (!generatedContent) {
      toast({
        title: "No content",
        description: "Please generate content first",
        variant: "destructive",
      });
      return;
    }
    
    importMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled || !pageId}>
          <Sparkles className="mr-2 h-4 w-4" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI-Assisted Question Generation</DialogTitle>
          <DialogDescription>
            Describe the questions you want to create, and our AI will generate them for you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea 
            id="ai-prompt" 
            placeholder="Example: Create questions about catering preferences, dietary restrictions, and event details for a wedding reception"
            className="min-h-[100px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generateMutation.isPending}
          />
          {generatedContent && (
            <div className="mt-4 border rounded-md p-4 bg-slate-50">
              <h4 className="text-sm font-medium mb-2">Generated Content Preview</h4>
              <pre className="text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {JSON.stringify(generatedContent, null, 2)}
              </pre>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" onClick={handleGenerateContent} disabled={!prompt.trim() || generateMutation.isPending}>
            {generateMutation.isPending ? (
              <>Generating...</>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
          {generatedContent && (
            <Button type="button" onClick={handleImportContent} disabled={importMutation.isPending}>
              {importMutation.isPending ? 'Importing...' : 'Import Questions'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIQuestionGenerator;