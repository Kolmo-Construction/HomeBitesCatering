import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Link } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import BadgeStatus from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";
import { Estimate } from "@shared/schema";
import { formatDate, formatCurrency } from "@/lib/utils";
import { EyeIcon, PenIcon, PlusIcon, TrashIcon, SendIcon } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EstimateList() {
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["/api/estimates"],
  });
  
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });
  
  const [estimateToDelete, setEstimateToDelete] = useState<Estimate | null>(null);
  const [estimateToSend, setEstimateToSend] = useState<Estimate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to get client name from ID
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/estimates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({
        title: "Estimate deleted",
        description: "The estimate has been deleted successfully."
      });
      setEstimateToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete estimate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Send estimate mutation
  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/estimates/${id}`, {
        status: "sent",
        sentAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({
        title: "Estimate sent",
        description: "The estimate has been sent to the client."
      });
      setEstimateToSend(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send estimate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (estimateToDelete) {
      deleteMutation.mutate(estimateToDelete.id);
    }
  };

  const handleSend = () => {
    if (estimateToSend) {
      sendMutation.mutate(estimateToSend.id);
    }
  };

  const columns: ColumnDef<Estimate>[] = [
    {
      accessorKey: "client",
      header: "Client",
      cell: ({ row }) => (
        <span className="font-medium text-neutral-900">
          {getClientName(row.original.clientId)}
        </span>
      ),
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
      accessorKey: "total",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.total / 100)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <BadgeStatus status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isEditable = row.original.status === "draft";
        const isSendable = row.original.status === "draft";
        
        return (
          <div className="flex items-center space-x-2">
            <Link href={`/estimates/${row.original.id}/view`}>
              <a className="text-primary-purple hover:text-primary-blue transition">
                <EyeIcon className="h-4 w-4" />
              </a>
            </Link>
            
            {isEditable && (
              <Link href={`/estimates/${row.original.id}/edit`}>
                <a className="text-primary-purple hover:text-primary-blue transition">
                  <PenIcon className="h-4 w-4" />
                </a>
              </Link>
            )}
            
            {isSendable && (
              <button 
                className="text-primary-purple hover:text-primary-blue transition"
                onClick={() => setEstimateToSend(row.original)}
              >
                <SendIcon className="h-4 w-4" />
              </button>
            )}
            
            {isEditable && (
              <button 
                className="text-red-500 hover:text-red-700 transition"
                onClick={() => setEstimateToDelete(row.original)}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Estimates</h1>
        <Link href="/estimates/new">
          <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
            <PlusIcon className="mr-1 h-4 w-4" />
            New Estimate
          </Button>
        </Link>
      </div>

      <DataTable 
        columns={columns} 
        data={estimates} 
        searchKey="client"
        loading={isLoading}
        emptyMessage="No estimates found. Create your first estimate to get started."
      />

      <AlertDialog open={!!estimateToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this estimate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEstimateToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!estimateToSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the estimate to the client. The status will be changed to "Sent".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEstimateToSend(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSend}
              className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
            >
              {sendMutation.isPending ? "Sending..." : "Send Estimate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
