import { toast as sonnerToast } from '@/components/ui/toast';

type ToastProps = {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
};

export function useToast() {
  function toast({
    title,
    description,
    action,
    variant = 'default',
    duration = 5000,
  }: ToastProps) {
    sonnerToast({
      title,
      description,
      action,
      variant,
      duration,
    });
  }

  return { toast };
}