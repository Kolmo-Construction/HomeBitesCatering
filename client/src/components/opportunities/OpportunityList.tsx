import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Link } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import BadgeStatus from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Opportunity } from "../../types/opportunity";
import { formatDate, cn } from "@/lib/utils";
import { EyeIcon, PenIcon, PlusIcon, FilterIcon } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function OpportunityList() {
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["/api/opportunities", { priority: priorityFilter }],
    queryFn: async ({ queryKey }) => {
      const params = queryKey[1] as Record<string, string | null>;
      const searchParams = new URLSearchParams();
      
      if (params.priority) {
        searchParams.append('priority', params.priority);
      }
      
      const queryString = searchParams.toString();
      const url = queryString ? `/api/opportunities?${queryString}` : '/api/opportunities';
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      return res.json();
    }
  });

  const columns: ColumnDef<Opportunity>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-neutral-900">
            {row.original.firstName} {row.original.lastName}
          </div>
          <div className="text-xs text-neutral-500">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <span>{row.original.phone || "—"}</span>,
    },
    {
      accessorKey: "eventType",
      header: "Event Type",
      cell: ({ row }) => <span>{row.original.eventType}</span>,
    },
    {
      accessorKey: "eventDate",
      header: "Event Date",
      cell: ({ row }) => (
        <span>
          {row.original.eventDate
            ? formatDate(new Date(row.original.eventDate))
            : "—"}
        </span>
      ),
    },
    {
      accessorKey: "opportunitySource",
      header: "Source",
      cell: ({ row }) => <span>{row.original.opportunitySource || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <BadgeStatus status={row.original.status} />,
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.original.priority || "medium";
        let badgeClass = "";
        let textColor = "text-white"; // Default text color for badges

        switch (priority) {
          case 'hot':
            badgeClass = "bg-red-600 hover:bg-red-700"; // More intense red for hot
            break;
          case 'high':
            badgeClass = "bg-orange-500 hover:bg-orange-600";
            break;
          case 'medium':
            badgeClass = "bg-yellow-500 hover:bg-yellow-600";
            textColor = "text-gray-800"; // Darker text for yellow bg
            break;
          case 'low':
            badgeClass = "bg-blue-500 hover:bg-blue-600";
            break;
          default:
            badgeClass = "bg-gray-400 hover:bg-gray-500";
        }
        
        return (
          <Badge className={cn("capitalize px-2.5 py-1 text-xs font-semibold", badgeClass, textColor)}>
            {priority}
          </Badge>
        );
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Link href={`/opportunities/${row.original.id}`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <EyeIcon className="h-4 w-4" />
            </a>
          </Link>
          <Link href={`/opportunities/${row.original.id}/edit`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <PenIcon className="h-4 w-4" />
            </a>
          </Link>
        </div>
      ),
    },
  ];

  // Priority filtering is now handled directly through the API query

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Opportunities</h1>
        <Link href="/opportunities/new">
          <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
            <PlusIcon className="mr-1 h-4 w-4" />
            New Opportunity
          </Button>
        </Link>
      </div>
      
      <div className="flex items-center py-4 gap-2">
        <div className="flex items-center">
          <FilterIcon className="h-4 w-4 mr-2 text-gray-500" />
          <span className="text-sm font-medium">Filter by:</span>
        </div>
        <Select 
          value={priorityFilter || 'all'} 
          onValueChange={(value) => setPriorityFilter(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable 
        columns={columns} 
        data={opportunities} 
        searchKey="name"
        loading={isLoading}
        emptyMessage="No opportunities found. Create your first opportunity to get started."
      />
    </div>
  );
}