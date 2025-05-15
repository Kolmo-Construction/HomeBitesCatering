import { useState, useMemo } from "react";
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
import MenuItemFilters, { MenuFilters } from "./MenuItemFilters";

export default function MenuItemList() {
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["/api/menu-items"],
    queryFn: async () => {
      const res = await fetch('/api/menu-items');
      if (!res.ok) throw new Error('Failed to fetch menu items');
      return res.json();
    }
  });
  
  const [filters, setFilters] = useState<MenuFilters>({
    search: "",
    category: "",
    dietary: {
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      isNutFree: false,
    }
  });
  
  // Filter menu items based on current filters
  const filteredMenuItems = useMemo(() => {
    if (!menuItems || menuItems.length === 0) return [];
    
    return menuItems.filter((item: MenuItem) => {
      // Search filter
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !(item.description && item.description.toLowerCase().includes(filters.search.toLowerCase()))) {
        return false;
      }
      
      // Category filter
      if (filters.category && item.category !== filters.category) {
        return false;
      }
      
      // Dietary filters
      if (filters.dietary.isVegetarian && !item.isVegetarian) return false;
      if (filters.dietary.isVegan && !item.isVegan) return false;
      if (filters.dietary.isGlutenFree && !item.isGlutenFree) return false;
      if (filters.dietary.isDairyFree && !item.isDairyFree) return false;
      if (filters.dietary.isNutFree && !item.isNutFree) return false;
      
      return true;
    });
  }, [menuItems, filters]);
  
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
      cell: ({ row }) => {
        // Handle numeric or null price
        const price = row.original.price;
        return <span>{price !== null && price !== undefined ? formatCurrency(Number(price)) : 'Not set'}</span>;
      },
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
          <Link to={`/menu-items/${row.original.id}`}>
            <div className="text-primary-purple hover:text-primary-blue transition cursor-pointer">
              <EyeIcon className="h-4 w-4" />
            </div>
          </Link>
          <Link to={`/menu-items/${row.original.id}/edit`}>
            <div className="text-primary-purple hover:text-primary-blue transition cursor-pointer">
              <PenIcon className="h-4 w-4" />
            </div>
          </Link>
          <button 
            className="text-red-500 hover:text-red-700 transition"
            onClick={() => setItemToDelete(row.original)}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-poppins text-2xl font-bold text-neutral-900">Menu Items</h1>
        <Link to="/menu-items/new">
          <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
            <PlusIcon className="mr-1 h-4 w-4" />
            New Menu Item
          </Button>
        </Link>
      </div>

      {/* Menu Item Filters */}
      <MenuItemFilters onFilterChange={setFilters} />
      
      {/* Results count when filters are active */}
      {(filters.search || filters.category || Object.values(filters.dietary).some(v => v)) && (
        <div className="mb-2 text-sm text-gray-500">
          Found {filteredMenuItems.length} item{filteredMenuItems.length !== 1 ? 's' : ''} 
          {filters.search ? ` matching "${filters.search}"` : ''}
          {filters.category ? ` in category "${filters.category}"` : ''}
          {Object.values(filters.dietary).some(v => v) ? ' with selected dietary restrictions' : ''}
        </div>
      )}

      <DataTable 
        columns={columns} 
        data={filteredMenuItems} 
        // We need to pass searchKey for the table, but we'll manage filtering ourselves
        searchKey="name"
        loading={isLoading}
        emptyMessage={
          Object.values(filters).some(v => !!v) || Object.values(filters.dietary).some(v => v)
            ? "No menu items found matching your filters. Try adjusting your search criteria."
            : "No menu items found. Create your first menu item to get started."
        }
      />

      {itemToDelete && (
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the menu item "{itemToDelete.name}". This action cannot be undone.
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
      )}
    </div>
  );
}
