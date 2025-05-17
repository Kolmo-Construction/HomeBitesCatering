import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Question {
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
}

interface HelpButtonProps {
  question: Question;
  onOpenHelp: (question: Question) => void;
}

const HelpButton: React.FC<HelpButtonProps> = ({ question, onOpenHelp }) => {
  return (
    <Button 
      type="button" 
      variant="ghost" 
      size="sm" 
      onClick={() => onOpenHelp(question)}
      className="h-8 w-8 p-0 ml-2 flex-shrink-0"
      title="Get help with this question"
    >
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
};

export default HelpButton;