import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Search, FileEdit } from "lucide-react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

// Form definition schema for creating/editing forms
const formDefinitionSchema = z.object({
  formTitle: z.string().min(1, "Title is required"),
  formKey: z.string().min(1, "Form key is required").regex(/^[a-z0-9_-]+$/, "Form key can only contain lowercase letters, numbers, underscores and hyphens"),
  description: z.string().optional(),
  status: z.enum(["template", "draft", "published", "archived"])
});

// Status badge component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    published: "bg-green-100 text-green-800",
    draft: "bg-amber-100 text-amber-800",
    template: "bg-blue-100 text-blue-800",
    archived: "bg-gray-100 text-gray-800"
  };

  const style = statusStyles[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Form Definition Dialog
const FormDefinitionDialog = ({ 
  isOpen, 
  onOpenChange, 
  initialData = null, 
  onSave 
}) => {
  const form = useForm({
    resolver: zodResolver(formDefinitionSchema),
    defaultValues: initialData ? {
      formTitle: initialData.formTitle || initialData.form_title || "",
      formKey: initialData.formKey || initialData.form_key || "",
      description: initialData.description || "",
      status: initialData.status || "draft"
    } : {
      formTitle: "",
      formKey: "",
      description: "",
      status: "draft"
    }
  });

  const handleSubmit = async (data) => {
    try {
      await onSave(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving form:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Form" : "Create New Form"}</DialogTitle>
          <DialogDescription>
            {initialData 
              ? "Update the details for this form." 
              : "Create a new form that can be used to collect information from users."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="formTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Wedding Questionnaire" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="formKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Key</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="E.g., wedding-questionnaire" 
                      {...field} 
                      onChange={(e) => {
                        // Auto-convert to lowercase with hyphens
                        const value = e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, '-')
                          .replace(/[^a-z0-9_-]/g, '');
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="A brief description of this form..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default function FormManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [location, navigate] = useLocation();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  
  // Fetch forms with search, status filter and pagination
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/form-builder/forms', page, pageSize, searchQuery, statusFilter],
    queryFn: async () => {
      try {
        // Create query string
        let queryStr = `page=${page}&pageSize=${pageSize}`;
        
        if (searchQuery) {
          queryStr += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        if (statusFilter && statusFilter !== 'all') {
          queryStr += `&status=${encodeURIComponent(statusFilter)}`;
        }
        
        const response = await fetch(`/api/form-builder/forms?${queryStr}`);
        if (!response.ok) {
          throw new Error("Failed to fetch forms");
        }
        
        const result = await response.json();
        
        // Ensure we always have the expected structure
        return {
          data: result.data || [],
          pagination: result.pagination || {
            page: 1,
            pageSize,
            total: (result.data || []).length,
            totalPages: 1
          }
        };
      } catch (error) {
        console.error("Error fetching forms:", error);
        throw error;
      }
    }
  });

  const handleCreateNew = () => {
    setEditFormData(null);
    setDialogOpen(true);
  };

  const handleEditForm = (form) => {
    setEditFormData(form);
    setDialogOpen(true);
  };

  const handleSaveForm = async (formData) => {
    try {
      const method = editFormData ? 'PUT' : 'POST';
      const url = editFormData 
        ? `/api/form-builder/forms/${editFormData.id}` 
        : '/api/form-builder/forms';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form_title: formData.formTitle,
          form_key: formData.formKey,
          description: formData.description,
          status: formData.status
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save form");
      }

      toast({
        title: editFormData ? "Form updated" : "Form created",
        description: editFormData 
          ? "The form has been updated successfully." 
          : "The form has been created successfully.",
      });

      // Refetch the forms list
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms'] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem saving the form",
      });
      throw error;
    }
  };

  const handleEditStructure = (formId) => {
    navigate(`/admin/form-builder/forms/${formId}/edit`);
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/form-builder/forms/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Failed to delete form");
      }

      toast({
        title: "Form deleted",
        description: "The form has been deleted successfully.",
      });

      // Refetch the forms list
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms'] });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem deleting the form",
      });
    }
  };

  // Safe access to ensure we avoid undefined errors
  const forms = data?.data || [];
  const pagination = data?.pagination || { page: 1, pageSize, total: 0, totalPages: 1 };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Form Builder</CardTitle>
            <CardDescription>
              Create and manage forms for your questionnaires
            </CardDescription>
          </div>
          <Button onClick={handleCreateNew} className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Form
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search forms..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1); // Reset to first page on new search
                  }
                }}
              />
            </div>
            <div className="w-64">
              <Select 
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1); // Reset to first page on new filter
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Title</TableHead>
                  <TableHead>Form Key</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : forms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No forms found.
                    </TableCell>
                  </TableRow>
                ) : (
                  forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        <button
                          className="text-blue-600 hover:underline focus:outline-none"
                          onClick={() => handleEditStructure(form.id)}
                        >
                          {form.formTitle || form.form_title}
                        </button>
                      </TableCell>
                      <TableCell>{form.formKey || form.form_key}</TableCell>
                      <TableCell>{form.version || 1}</TableCell>
                      <TableCell>
                        <StatusBadge status={form.status} />
                      </TableCell>
                      <TableCell>
                        {form.createdAt && new Date(form.createdAt).toISOString() !== 'Invalid Date' 
                          ? format(new Date(form.createdAt), 'MMM d, yyyy')
                          : form.created_at && new Date(form.created_at).toISOString() !== 'Invalid Date'
                            ? format(new Date(form.created_at), 'MMM d, yyyy')
                            : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditStructure(form.id)}>
                              <FileEdit className="mr-2 h-4 w-4" />
                              Design Form
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditForm(form)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteForm(form.id)}
                              className="text-red-600 hover:text-red-800 focus:text-red-800"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {pagination.total > 0 ? (
                <>
                  Showing {Math.min((page - 1) * pageSize + 1, pagination.total)} to {Math.min(page * pageSize, pagination.total)} of {pagination.total} entries
                </>
              ) : (
                <>No entries found</>
              )}
            </div>
            {pagination.total > 0 && pagination.totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Form Definition Dialog */}
      <FormDefinitionDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editFormData}
        onSave={handleSaveForm}
      />
    </div>
  );
}