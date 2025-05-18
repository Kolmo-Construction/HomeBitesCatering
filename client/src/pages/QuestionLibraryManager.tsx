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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, MoreHorizontal, PlusCircle, Search } from "lucide-react";
import { useLocation } from "wouter";

export default function QuestionLibraryManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [, navigate] = useLocation();

  // Fetch library questions with search, category filter and pagination
  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/form-builder/library-questions', page, pageSize, searchQuery, categoryFilter],
    queryFn: async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());
        
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        
        if (categoryFilter) {
          params.append('category', categoryFilter);
        }
        
        const response = await fetch(`/api/form-builder/library-questions?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching questions:", error);
        return { data: [], pagination: { page: 1, pageSize, total: 0, totalPages: 0 } };
      }
    }
  });

  const handleCreateNew = () => {
    navigate("/admin/form-builder/question-library/new");
  };

  const handleEdit = (questionId: number) => {
    navigate(`/admin/form-builder/question-library/${questionId}/edit`);
  };

  const handleDelete = async (questionId: number) => {
    try {
      const response = await fetch(`/api/form-builder/library-questions/${questionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete question');
      }

      toast({
        title: "Question deleted",
        description: "The question has been deleted successfully.",
      });

      // Refetch the questions list
      window.location.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete question",
      });
    }
  };

  // Get the question type display label
  const getQuestionTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'textbox': 'Text Field',
      'textarea': 'Text Area',
      'number': 'Number',
      'email': 'Email',
      'phone': 'Phone',
      'checkbox_group': 'Checkboxes',
      'radio_group': 'Radio Buttons',
      'dropdown': 'Dropdown',
      'date': 'Date',
      'datetime': 'Date & Time',
      'matrix': 'Matrix',
      'address': 'Address',
      'header': 'Header',
      'text_display': 'Display Text',
      'image_upload': 'Image Upload',
      'file_upload': 'File Upload',
      'signature_pad': 'Signature Pad',
      'rating_scale': 'Rating Scale',
      'slider': 'Slider',
      'toggle_switch': 'Toggle Switch',
      'full_name': 'Full Name',
    };
    
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isError) {
    return (
      <Card className="mt-6 mx-auto max-w-7xl">
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <h3 className="text-lg font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">Failed to load question library. Please try again.</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Question Library</CardTitle>
            <CardDescription>
              Manage reusable question templates for your forms
            </CardDescription>
          </div>
          <Button onClick={handleCreateNew} className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Question
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search questions..."
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
              <Input
                placeholder="Filter by category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1); // Reset to first page on new filter
                }}
              />
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question Key</TableHead>
                  <TableHead>Question Text</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : !data || !data.data || data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No questions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((question: any) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        {question.library_question_key}
                      </TableCell>
                      <TableCell>{question.default_text}</TableCell>
                      <TableCell>{getQuestionTypeLabel(question.question_type)}</TableCell>
                      <TableCell>{question.category || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(question.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this question?')) {
                                  handleDelete(question.id);
                                }
                              }}
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
          
          {data && data.pagination && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.pagination.total)} of {data.pagination.total} entries
              </div>
              <Pagination
                currentPage={page}
                totalPages={data.pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}