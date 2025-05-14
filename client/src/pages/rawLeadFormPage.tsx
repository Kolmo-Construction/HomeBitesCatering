import React from 'react';
import RawLeadForm from '@/components/rawLeads/RawLeadForm';

export default function RawLeadFormPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Add New Lead</h1>
      <RawLeadForm />
    </div>
  );
}