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
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
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
            <a className="text-primary-purple hover:text-primary-blue transition">
              <EyeIcon className="h-4 w-4" />
            </a>
          </Link>
          <Link href={`/estimates/${row.original.id}/edit`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <PenIcon className="h-4 w-4" />
            </a>
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
          <a className="text-sm text-primary-purple hover:underline">View All</a>
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
