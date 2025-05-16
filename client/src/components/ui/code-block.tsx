import React from 'react';
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  language?: string;
  value: string;
  className?: string;
}

export const CodeBlockWithCopy: React.FC<CodeBlockProps> = ({ language = 'javascript', value, className = '' }) => {
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className={`relative rounded-md bg-slate-950 ${className}`}>
      <pre className="overflow-x-auto p-4 text-sm text-slate-50">
        <code>{value}</code>
      </pre>
      <Button 
        variant="ghost" 
        size="sm" 
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700"
        onClick={copyToClipboard}
      >
        Copy
      </Button>
    </div>
  );
};

export default CodeBlockWithCopy;