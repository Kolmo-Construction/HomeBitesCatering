import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Menu } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { PlusIcon, EyeIcon, PenIcon, TrashIcon, ArrowLeft } from "lucide-react";
import MenuDetailView from "@/components/menu/MenuDetailView";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import MenuBuilder from "@/components/menu/MenuBuilder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Menus() {
  const [location, navigate] = useLocation();
  const [mode, setMode] = useState<"list" | "new" | "edit" | "view">("list");
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract mode and ID from location
  useEffect(() => {
    if (location === "/menus") {
      setMode("list");
      setSelectedMenuId(null);
    } else if (location === "/menus/new") {
      setMode("new");
      setSelectedMenuId(null);
    } else if (location.match(/^\/menus\/\d+\/edit$/)) {
      setMode("edit");
      setSelectedMenuId(parseInt(location.split("/")[2], 10));
    } else if (location.match(/^\/menus\/\d+$/)) {
      setMode("view");
      setSelectedMenuId(parseInt(location.split("/")[2], 10));
    }
  }, [location]);
  
  // Fetch menus data
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["/api/menus"],
    enabled: mode === "list",
  }) as { data: any[], isLoading: boolean };
  
  // Fetch selected menu data
  const { data: selectedMenu, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["/api/menus", selectedMenuId],
    queryFn: async () => {
      const response = await fetch(`/api/menus/${selectedMenuId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch menu');
      }
      return response.json();
    },
    enabled: (mode === "edit" || mode === "view") && !!selectedMenuId,
  });
  
  // Debug selected menu data
  console.log("Selected menu data:", selectedMenu);
  
  // Fetch menu items for reference
  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/menu-items"],
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/menus/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menus"] });
      toast({
        title: "Menu deleted",
        description: "The menu has been deleted successfully."
      });
      setMenuToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete menu: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleDelete = () => {
    if (menuToDelete) {
      deleteMutation.mutate(menuToDelete.id);
    }
  };
  
  // Menu list table columns
  const columns: ColumnDef<Menu>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium text-neutral-900">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const typeLabels: Record<string, string> = {
          standard: "Standard",
          custom: "Custom",
          seasonal: "Seasonal"
        };
        return <span>{typeLabels[row.original.type] || row.original.type}</span>;
      },
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => {
        const menuItemsData = row.original.items;
        let count = 0;

        if (menuItemsData) {
          let parsedItems;
          try {
            parsedItems = typeof menuItemsData === 'string'
              ? JSON.parse(menuItemsData)
              : menuItemsData;

            if (Array.isArray(parsedItems)) {
              // Handles simple array format: [{id: "...", type: "..."}, ...]
              count = parsedItems.length;
            } else if (parsedItems && Array.isArray(parsedItems.categories)) {
              // Handles MenuPackageStructure: sum of available_item_ids in all categories
              parsedItems.categories.forEach((category: any) => {
                if (Array.isArray(category.available_item_ids)) {
                  count += category.available_item_ids.length;
                }
              });
            }
          } catch (error) {
            console.error("Error parsing menu items for count:", error, menuItemsData);
            return <span>Error</span>;
          }
        }
        return <span>{count} items</span>;
      },
    },
    {
      accessorKey: "updated",
      header: "Last Updated",
      cell: ({ row }) => <span>{formatDate(new Date(row.original.updatedAt))}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Link to={`/menus/${row.original.id}`}>
            <div className="text-primary-purple hover:text-primary-blue transition cursor-pointer">
              <EyeIcon className="h-4 w-4" />
            </div>
          </Link>
          <Link to={`/menus/${row.original.id}/edit`}>
            <div className="text-primary-purple hover:text-primary-blue transition cursor-pointer">
              <PenIcon className="h-4 w-4" />
            </div>
          </Link>
          <button 
            className="text-red-500 hover:text-red-700 transition"
            onClick={() => setMenuToDelete(row.original)}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
  
  // Render appropriate component based on mode
  if (mode === "list") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="font-poppins text-2xl font-bold text-neutral-900">Menus</h1>
          <Link to="/menus/new">
            <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
              <PlusIcon className="mr-1 h-4 w-4" />
              Create Menu
            </Button>
          </Link>
        </div>
        
        <DataTable 
          columns={columns} 
          data={menus} 
          searchKey="name"
          loading={isLoading}
          emptyMessage="No menus found. Create your first menu to get started."
        />
        
        {menuToDelete && (
          <AlertDialog open={!!menuToDelete} onOpenChange={(open) => !open && setMenuToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the menu "{menuToDelete?.name}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setMenuToDelete(null)}>Cancel</AlertDialogCancel>
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
  
  if (mode === "new") {
    return (
      <div>
        <h1 className="font-poppins text-2xl font-bold text-neutral-900 mb-6">Create New Menu</h1>
        <MenuBuilder />
      </div>
    );
  }
  
  if ((mode === "edit" || mode === "view") && isLoadingMenu) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-purple"></div>
      </div>
    );
  }
  
  if (mode === "edit") {
    if (!selectedMenu) {
      return (
        <div className="max-w-3xl mx-auto py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Menu not found</h2>
          <p className="text-gray-500 mb-6">The menu you are trying to edit could not be found.</p>
          <Button onClick={() => navigate("/menus")}>Back to Menus</Button>
        </div>
      );
    }
    
    console.log("Rendering edit mode with menu data:", selectedMenu);
    
    return (
      <div>
        <h1 className="font-poppins text-2xl font-bold text-neutral-900 mb-6">Edit Menu</h1>
        <MenuBuilder menu={selectedMenu} isEditing={true} />
      </div>
    );
  }
  
  if (mode === "view" && selectedMenu) {
    
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/menus">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Menus
            </Button>
          </Link>
        </div>
        
        <MenuDetailView 
          menu={selectedMenu} 
          onEdit={() => window.location.href = `/menus/${selectedMenu.id}/edit`}
        />
      </div>
    );
  }
  
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h2>
    </div>
  );
}
