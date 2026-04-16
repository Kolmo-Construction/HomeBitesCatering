import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Link } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import BadgeStatus from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Opportunity } from "../../types/opportunity";
import { formatDate, cn } from "@/lib/utils";
import { PenIcon, PlusIcon, FilterIcon, SparklesIcon } from "lucide-react";
import { useCanEditRecord, useIsStaff } from "@/hooks/usePermissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Pipeline stage groupings
const STAGE_GROUPS: Record<string, string[]> = {
  all: [],
  new: ["new"],
  active: ["contacted", "qualified", "proposal"],
  won: ["booked"],
  archived: ["archived"],
};

export default function OpportunityList() {
  const isStaff = useIsStaff();
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");

  const { data: allOpportunities = [], isLoading } = useQuery({
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

  // Filter by pipeline stage
  const opportunities = useMemo(() => {
    const statuses = STAGE_GROUPS[stageFilter];
    if (!statuses || statuses.length === 0) return allOpportunities;
    return allOpportunities.filter((opp: Opportunity) => statuses.includes(opp.status));
  }, [allOpportunities, stageFilter]);

  // Count per stage for tab badges
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allOpportunities.length, new: 0, active: 0, won: 0, archived: 0 };
    allOpportunities.forEach((opp: Opportunity) => {
      if (STAGE_GROUPS.new.includes(opp.status)) counts.new++;
      else if (STAGE_GROUPS.active.includes(opp.status)) counts.active++;
      else if (STAGE_GROUPS.won.includes(opp.status)) counts.won++;
      else if (STAGE_GROUPS.archived.includes(opp.status)) counts.archived++;
    });
    return counts;
  }, [allOpportunities]);

  const columns: ColumnDef<Opportunity>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link href={`/opportunities/${row.original.id}`}>
          <a className="hover:text-primary-purple transition cursor-pointer">
            <div>
              <div className="font-medium text-neutral-900">
                {row.original.firstName} {row.original.lastName}
              </div>
              <div className="text-xs text-neutral-500">{row.original.email}</div>
            </div>
          </a>
        </Link>
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
      cell: ({ row }) => {
        const canEdit = useCanEditRecord(row.original.createdBy);

        return (
          <div className="flex items-center space-x-2">
            {canEdit && (
              <Link href={`/opportunities/${row.original.id}/edit`}>
                <a className="text-primary-purple hover:text-primary-blue transition">
                  <PenIcon className="h-4 w-4" />
                </a>
              </Link>
            )}
          </div>
        );
      },
    },
  ], []);

  // Priority filtering is now handled directly through the API query

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Opportunities</h1>
        {isStaff && (
          <Link href="/opportunities/new">
            <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
              <PlusIcon className="mr-1 h-4 w-4" />
              New Opportunity
            </Button>
          </Link>
        )}
      </div>

      {/* Pipeline stage tabs */}
      <Tabs value={stageFilter} onValueChange={setStageFilter} className="w-full">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            All <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{stageCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-1.5">
            New <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{stageCounts.new}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1.5">
            Active <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{stageCounts.active}</Badge>
          </TabsTrigger>
          <TabsTrigger value="won" className="gap-1.5">
            Won <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{stageCounts.won}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5">
            Archived <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{stageCounts.archived}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <FilterIcon className="h-4 w-4 mr-2 text-gray-500" />
          <span className="text-sm font-medium">Priority:</span>
        </div>
        <Select
          value={priorityFilter || 'all'}
          onValueChange={(value) => setPriorityFilter(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All priorities" />
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