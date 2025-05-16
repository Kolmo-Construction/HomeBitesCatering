import React from 'react';
import { Check, Clipboard } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'json' }) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-muted rounded-md">
      {language && (
        <div className="absolute top-2 right-2 flex">
          <div className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">
            {language}
          </div>
        </div>
      )}
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-16 p-2 rounded-md transition-colors hover:bg-muted-foreground/20"
        title="Copy to clipboard"
      >
        {copied ? <Check size={16} /> : <Clipboard size={16} />}
      </button>
      <pre className="p-4 text-sm overflow-x-auto">
        <code className="text-sm">{code}</code>
      </pre>
    </div>
  );
};