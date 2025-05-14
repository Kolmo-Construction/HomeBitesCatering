import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import BadgeStatus from "@/components/ui/badge-status";
import { Estimate } from "@shared/schema";
import { formatDate, formatCurrency } from "@/lib/utils";
import { EyeIcon, PenIcon } from "lucide-react";
import { Link } from "wouter";

export default function RecentEstimatesTable() {
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["/api/estimates"],
    queryFn: async () => {
      const res = await fetch('/api/estimates');
      if (!res.ok) throw new Error('Failed to fetch estimates');
      return res.json();
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    }
  });

  // Get only the most recent 3 estimates
  const recentEstimates = [...estimates].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }).slice(0, 3);

  // Helper to get client name from ID
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  const columns: ColumnDef<Estimate>[] = [
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-900">
          {getClientName(row.original.clientId)}
        </span>
      ),
    },
    {
      accessorKey: "eventDate",
      header: "Event Date",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-700">
          {row.original.eventDate ? formatDate(new Date(row.original.eventDate)) : "TBD"}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: "Amount",
      cell: ({ row }) => (
        <span className="text-sm text-neutral-700">
          {formatCurrency(row.original.total / 100)}
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
        <div className="flex items-center space-x-2">
          <Link href={`/estimates/${row.original.id}/view`}>
            <div className="text-primary-purple hover:text-primary-blue transition cursor-pointer">
              <EyeIcon className="h-4 w-4" />
            </div>
          </Link>
          <Link href={`/estimates/${row.original.id}/edit`}>
            <div className="text-primary-purple hover:text-primary-blue transition cursor-pointer">
              <PenIcon className="h-4 w-4" />
            </div>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white p-5 rounded-lg shadow col-span-1 lg:col-span-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-poppins text-lg font-semibold text-neutral-900">Recent Estimates</h2>
        <Link href="/estimates">
          <div className="text-sm text-primary-purple hover:underline cursor-pointer">View All</div>
        </Link>
      </div>
      
      <DataTable 
        columns={columns} 
        data={recentEstimates} 
        loading={isLoading} 
        emptyMessage="No estimates found. Create your first estimate to get started."
      />
    </div>
  );
}
