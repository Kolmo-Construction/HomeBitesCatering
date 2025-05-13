import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BadgeStatusProps {
  status: string;
  children?: ReactNode;
}

export default function BadgeStatus({ status, children }: BadgeStatusProps) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    // Lead statuses
    new: { color: "bg-yellow-100 text-yellow-800", label: "New" },
    contacted: { color: "bg-blue-100 text-blue-800", label: "Contacted" },
    qualified: { color: "bg-green-100 text-green-800", label: "Qualified" },
    "in-contact": { color: "bg-blue-100 text-blue-800", label: "In Contact" },
    proposal: { color: "bg-purple-100 text-purple-800", label: "Proposal" },
    booked: { color: "bg-green-100 text-green-800", label: "Booked" },
    archived: { color: "bg-neutral-100 text-neutral-800", label: "Archived" },
    
    // Estimate statuses
    draft: { color: "bg-yellow-100 text-yellow-800", label: "Draft" },
    sent: { color: "bg-blue-100 text-blue-800", label: "Sent" },
    viewed: { color: "bg-purple-100 text-purple-800", label: "Viewed" },
    accepted: { color: "bg-green-100 text-green-800", label: "Accepted" },
    declined: { color: "bg-red-100 text-red-800", label: "Declined" },
    
    // Event statuses
    confirmed: { color: "bg-green-100 text-green-800", label: "Confirmed" },
    "in-progress": { color: "bg-blue-100 text-blue-800", label: "In Progress" },
    completed: { color: "bg-purple-100 text-purple-800", label: "Completed" },
    cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
    
    // Default status
    default: { color: "bg-neutral-100 text-neutral-800", label: status }
  };

  const config = statusConfig[status] || statusConfig.default;

  return (
    <Badge className={cn("px-2 py-1 font-normal rounded-full", config.color)}>
      {children || config.label}
    </Badge>
  );
}
