import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Link } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import BadgeStatus from "@/components/ui/badge-status";
import BadgePriority from "@/components/ui/badge-priority";
import { Button } from "@/components/ui/button";
import { Opportunity } from "../../types/opportunity";
import { formatDate } from "@/lib/utils";
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
    queryKey: ["/api/opportunities"],
    queryFn: async () => {
      const res = await fetch('/api/opportunities');
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      return res.json();
    }
  });
  
  const filteredOpportunities = priorityFilter 
    ? opportunities.filter((opp: Opportunity) => opp.priority === priorityFilter) 
    : opportunities;

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
      cell: ({ row }) => <BadgePriority priority={row.original.priority || "medium"} />,
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

  const handlePriorityChange = (value: string) => {
    setPriorityFilter(value === "all" ? null : value);
  };

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
      
      <div className="flex items-center space-x-2 mb-4">
        <div className="flex items-center">
          <FilterIcon className="h-4 w-4 mr-2 text-gray-500" />
          <span className="text-sm font-medium">Filter by:</span>
        </div>
        <Select onValueChange={handlePriorityChange} defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="hot">Hot Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredOpportunities} 
        searchKey="name"
        loading={isLoading}
        emptyMessage="No opportunities found. Create your first opportunity to get started."
      />
    </div>
  );
}