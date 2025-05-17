import React from 'react';
import ConditionalRenderingTest from '@/components/ConditionalRenderingTest';

const ConditionalRenderingTestPage: React.FC = () => {
  return (
    <div className="py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Conditional Rendering Test Page</h1>
      <p className="text-gray-600 max-w-3xl mx-auto mb-8 text-center">
        This page tests the conditional rendering functionality in the questionnaire system.
        Toggle switches, sliders, and incrementers control the visibility of other fields.
      </p>
      
      <ConditionalRenderingTest />
    </div>
  );
};

export default ConditionalRenderingTestPage;