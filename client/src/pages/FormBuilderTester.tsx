import React from 'react';
import { Helmet } from 'react-helmet';
import UnifiedFormBuilderDemo from '@/components/UnifiedFormBuilderDemo';

const FormBuilderTester: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Helmet>
        <title>Form Builder API Tester - Home Bites</title>
        <meta name="description" content="Test the unified form builder API" />
      </Helmet>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Form Builder API Tester</h1>
      </div>
      
      <p className="text-muted-foreground mb-6">
        This page allows you to test the unified form builder API. You can create questionnaire definitions, 
        add pages and questions, and get full questionnaire structures using a single API endpoint with 
        different action parameters.
      </p>
      
      <UnifiedFormBuilderDemo />
    </div>
  );
};

export default FormBuilderTester;