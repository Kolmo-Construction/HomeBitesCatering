import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Menu } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { PlusIcon, EyeIcon, PenIcon, TrashIcon } from "lucide-react";
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
  const [location] = useLocation();
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
  });
  
  // Fetch selected menu data
  const { data: selectedMenu, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["/api/menus", selectedMenuId],
    enabled: (mode === "edit" || mode === "view") && !!selectedMenuId,
  });
  
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
      accessorKey: "itemCount",
      header: "Items",
      cell: ({ row }) => {
        const items = JSON.parse(row.original.items);
        return <span>{items.length} items</span>;
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
          <Link href={`/menus/${row.original.id}`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <EyeIcon className="h-4 w-4" />
            </a>
          </Link>
          <Link href={`/menus/${row.original.id}/edit`}>
            <a className="text-primary-purple hover:text-primary-blue transition">
              <PenIcon className="h-4 w-4" />
            </a>
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
          <Link href="/menus/new">
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
        
        <AlertDialog>
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
  
  if (mode === "edit" && selectedMenu) {
    return (
      <div>
        <h1 className="font-poppins text-2xl font-bold text-neutral-900 mb-6">Edit Menu</h1>
        <MenuBuilder menu={selectedMenu} isEditing={true} />
      </div>
    );
  }
  
  if (mode === "view" && selectedMenu) {
    // Get menu items details
    const menuItemsDetails = [];
    if (selectedMenu.items) {
      const items = typeof selectedMenu.items === 'string' 
        ? JSON.parse(selectedMenu.items) 
        : selectedMenu.items;
        
      for (const item of items) {
        const menuItem = menuItems.find((mi: any) => mi.id === item.id);
        if (menuItem) {
          menuItemsDetails.push({
            ...menuItem,
            quantity: item.quantity
          });
        }
      }
    }
    
    // Calculate total menu price
    const totalPrice = menuItemsDetails.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
    
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-poppins text-2xl font-bold text-neutral-900">{selectedMenu.name}</h1>
          <Link href={`/menus/${selectedMenu.id}/edit`}>
            <Button variant="outline">
              <PenIcon className="mr-2 h-4 w-4" />
              Edit Menu
            </Button>
          </Link>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>Menu Details</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Last updated on {formatDate(new Date(selectedMenu.updatedAt))}
                </p>
              </div>
              <Badge>
                {selectedMenu.type.charAt(0).toUpperCase() + selectedMenu.type.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {selectedMenu.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-gray-700">{selectedMenu.description}</p>
              </div>
            )}
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-3">Menu Items</h3>
              
              <div className="bg-gray-50 rounded-md p-4">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItemsDetails.map((item) => {
                      const categoryLabels: Record<string, string> = {
                        appetizer: "Appetizer",
                        entree: "Main Course",
                        side: "Side",
                        dessert: "Dessert",
                        beverage: "Beverage"
                      };
                      
                      return (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="py-3 px-3">
                            <div className="font-medium">{item.name}</div>
                            <div className="flex mt-1 flex-wrap gap-1">
                              {item.isVegetarian && <Badge variant="outline" className="text-xs">Veg</Badge>}
                              {item.isVegan && <Badge variant="outline" className="text-xs">Vegan</Badge>}
                              {item.isGlutenFree && <Badge variant="outline" className="text-xs">GF</Badge>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">{categoryLabels[item.category] || item.category}</td>
                          <td className="py-3 px-3 text-center">{item.quantity}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency(item.price / 100)}</td>
                          <td className="py-3 px-3 text-right">{formatCurrency((item.price * item.quantity) / 100)}</td>
                        </tr>
                      );
                    })}
                    
                    <tr className="bg-gray-100">
                      <td colSpan={4} className="py-3 px-3 text-right font-semibold">
                        Total Per Person:
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {formatCurrency(totalPrice / 100)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Menu Not Found</h2>
      <p className="text-gray-600">The menu you're looking for doesn't exist or has been deleted.</p>
    </div>
  );
}
