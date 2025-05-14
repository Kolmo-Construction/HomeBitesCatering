import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BadgePriorityProps {
  priority: string;
  children?: ReactNode;
}

export default function BadgePriority({ priority, children }: BadgePriorityProps) {
  const priorityConfig: Record<string, { color: string; label: string }> = {
    hot: { color: "bg-red-100 text-red-800 border-red-300", label: "Hot" },
    high: { color: "bg-orange-100 text-orange-800 border-orange-300", label: "High" },
    medium: { color: "bg-blue-100 text-blue-800 border-blue-300", label: "Medium" },
    low: { color: "bg-green-100 text-green-800 border-green-300", label: "Low" },
    
    // Default priority
    default: { color: "bg-neutral-100 text-neutral-800", label: priority }
  };

  const config = priorityConfig[priority] || priorityConfig.default;

  return (
    <Badge className={cn("px-2 py-1 font-normal rounded-full", config.color)}>
      {children || config.label}
    </Badge>
  );
}