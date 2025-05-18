import React from 'react';
import { useToast } from '@/hooks/use-toast';
import QuestionnaireCreator from '@/components/QuestionnaireCreator';

export default function QuestionnaireBuilder() {
  const { toast } = useToast();
  
  return (
    <div className="container mx-auto">
      <QuestionnaireCreator />
    </div>
  );
}