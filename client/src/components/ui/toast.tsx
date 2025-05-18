import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export type ToastProps = {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
};

export function toast({
  title,
  description,
  action,
  variant = 'default',
  duration = 5000,
}: ToastProps) {
  return sonnerToast[variant === 'destructive' ? 'error' : variant === 'success' ? 'success' : 'info']
  (title, {
    description,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
    duration,
  });
}

export function Toaster() {
  return (
    <SonnerToaster 
      position="bottom-right"
      expand={false}
      richColors
      closeButton
    />
  );
}