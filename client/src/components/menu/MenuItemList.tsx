import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Link } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { PenIcon, PlusIcon, EyeIcon, TrashIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

export default function MenuItemList() {
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["/api/menu-items"],
  });
  
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/menu-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Menu item deleted",
        description: "The menu item has been deleted successfully."
      });
      setItemToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete menu item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const columns: ColumnDef<MenuItem>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium text-neutral-900">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const categoryLabels: Record<string, string> = {
          appetizer: "Appetizer",
          entree: "Main Course",
          side: "Side",
          dessert: "Dessert",
          beverage: "Beverage"
        };
        
        return <span>{categoryLabels[row.original.category] || row.original.category}</span>;
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <span>{formatCurrency(row.original.price / 100)}</span>,
    },
    {
      accessorKey: "dietary",
      header: "Dietary",
      cell: ({ row }) => {
        const item = row.original;
        const dietaryTags = [];
        
        if (item.isVegetarian) dietaryTags.push("Vegetarian");
        if (item.isVegan) dietaryTags.push("Vegan");
        if (item.isGlutenFree) dietaryTags.push("GF");
        if (item.isDairyFree) dietaryTags.push("DF");
        if (item.isNutFree) dietaryTags.push("NF");
        
        return (
          <div className="flex flex-wrap gap-1">
            {dietaryTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
            {dietaryTags.length === 0 && "—"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Link href={`/menu-items/${row.original.id}`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <EyeIcon className="h-4 w-4" />
            </a>
          </Link>
          <Link href={`/menu-items/${row.original.id}/edit`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <PenIcon className="h-4 w-4" />
            </a>
          </Link>
          <AlertDialogTrigger asChild>
            <button 
              className="text-red-500 hover:text-red-700 transition"
              onClick={() => setItemToDelete(row.original)}
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
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Menu Items</h1>
        <Link href="/menu-items/new">
          <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
            <PlusIcon className="mr-1 h-4 w-4" />
            New Menu Item
          </Button>
        </Link>
      </div>

      <DataTable 
        columns={columns} 
        data={menuItems} 
        searchKey="name"
        loading={isLoading}
        emptyMessage="No menu items found. Create your first menu item to get started."
      />

      <AlertDialog>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the menu item "{itemToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
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
