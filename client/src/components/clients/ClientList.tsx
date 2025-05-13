import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Link } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Client } from "@shared/schema";
import { EyeIcon, PenIcon, PlusIcon, TrashIcon, FileIcon } from "lucide-react";
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

export default function ClientList() {
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["/api/clients"],
  });
  
  // Get estimates to show count per client
  const { data: estimates = [] } = useQuery({
    queryKey: ["/api/estimates"],
  });
  
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client deleted",
        description: "The client has been deleted successfully."
      });
      setClientToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete client: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (clientToDelete) {
      deleteMutation.mutate(clientToDelete.id);
    }
  };

  // Count estimates for each client
  const getEstimateCount = (clientId: number) => {
    return estimates.filter((estimate: any) => estimate.clientId === clientId).length;
  };

  const columns: ColumnDef<Client>[] = [
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
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => <span>{row.original.company || "—"}</span>,
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const client = row.original;
        if (!client.city && !client.state) return "—";
        return `${client.city || ""}${client.city && client.state ? ", " : ""}${client.state || ""}`;
      },
    },
    {
      accessorKey: "estimates",
      header: "Estimates",
      cell: ({ row }) => {
        const count = getEstimateCount(row.original.id);
        if (count === 0) return "—";
        
        return (
          <Link href={`/estimates?clientId=${row.original.id}`}>
            <a className="flex items-center text-primary-purple hover:text-primary-blue">
              <FileIcon className="h-4 w-4 mr-1" />
              <span>{count}</span>
            </a>
          </Link>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Link href={`/clients/${row.original.id}`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <EyeIcon className="h-4 w-4" />
            </a>
          </Link>
          <Link href={`/clients/${row.original.id}/edit`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <PenIcon className="h-4 w-4" />
            </a>
          </Link>
          <AlertDialogTrigger asChild>
            <button 
              className="text-red-500 hover:text-red-700 transition"
              onClick={() => setClientToDelete(row.original)}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Clients</h1>
        <Link href="/clients/new">
          <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
            <PlusIcon className="mr-1 h-4 w-4" />
            New Client
          </Button>
        </Link>
      </div>

      <DataTable 
        columns={columns} 
        data={clients} 
        searchKey="name"
        loading={isLoading}
        emptyMessage="No clients found. Create your first client to get started."
      />

      <AlertDialog>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the client "{clientToDelete?.firstName} {clientToDelete?.lastName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
