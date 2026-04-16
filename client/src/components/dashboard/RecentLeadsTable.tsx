import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import BadgeStatus from "@/components/ui/badge-status";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Opportunity } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { PenIcon } from "lucide-react";
import { Link } from "wouter";

export default function RecentLeadsTable() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error('Failed to fetch leads');
      return res.json();
    }
  });

  // Get only the most recent 4 leads
  const recentLeads = [...leads].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(0, 4);

  const columns: ColumnDef<Opportunity>[] = [
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => {
        const lead = row.original;
        const initials = `${lead.firstName.charAt(0)}${lead.lastName.charAt(0)}`;
        
        // Generate a color based on name for the avatar
        const colors = ["bg-primary-purple", "bg-primary-blue", "bg-accent", "bg-green-500"];
        const colorIndex = (lead.firstName.charCodeAt(0) + lead.lastName.charCodeAt(0)) % colors.length;
        
        return (
          <div className="flex items-center">
            <Avatar className={`h-8 w-8 ${colors[colorIndex]} text-white flex items-center justify-center`}>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <div className="text-sm font-medium text-neutral-900">
                {lead.firstName} {lead.lastName}
              </div>
              <div className="text-xs text-neutral-500">{lead.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "eventType",
      header: "Event Type",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-700">{row.original.eventType}</span>
      ),
    },
    {
      accessorKey: "eventDate",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-700">
          {row.original.eventDate ? formatDate(new Date(row.original.eventDate)) : "TBD"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <BadgeStatus status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Link href={`/leads/${row.original.id}`}>
          <div className="text-primary-purple hover:text-primary-blue transition cursor-pointer">
            <PenIcon className="h-4 w-4" />
          </div>
        </Link>
      ),
    },
  ];

  return (
    <div className="bg-white p-5 rounded-lg shadow col-span-1 lg:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-poppins text-lg font-semibold text-neutral-900">Recent Leads</h2>
        <Link href="/leads">
          <div className="text-sm text-primary-purple hover:underline cursor-pointer">View All</div>
        </Link>
      </div>
      
      <DataTable 
        columns={columns} 
        data={recentLeads} 
        loading={isLoading}
        emptyMessage="No leads found. Create your first lead to get started."
      />
    </div>
  );
}
