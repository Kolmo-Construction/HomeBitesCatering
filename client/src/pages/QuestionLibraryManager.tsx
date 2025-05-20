import React, { useState, useMemo } from "react";
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
import { getQuestionTypeLabel } from "@shared/form-utils";

export default function QuestionLibraryManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [location, navigate] = useLocation();
  
  // Fetch all questions without pagination to ensure we get everything
  const fetchAllQuestions = async () => {
    try {
      let queryStr = `pageSize=1000`; // Request a large number to get all questions
      
      if (categoryFilter) {
        queryStr += `&category=${encodeURIComponent(categoryFilter)}`;
      }
      
      const response = await fetch(`/api/form-builder/library-questions?${queryStr}`);
      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }
      
      const result = await response.json();
      
      return {
        data: result.data || [],
        pagination: {
          page: 1,
          pageSize: 1000,
          total: (result.data || []).length,
          totalPages: 1
        }
      };
    } catch (error) {
      console.error("Error fetching questions:", error);
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 1
        }
      };
    }
  };

  // Fetch all library questions
  const { data: allData, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/form-builder/library-questions', 'all', categoryFilter],
    queryFn: fetchAllQuestions
  });
  
  // Filter questions based on search query
  const allFilteredItems = useMemo(() => {
    if (!allData?.data) return [];
    
    if (!searchQuery.trim()) {
      return allData.data;
    }
    
    const lowerCaseQuery = searchQuery.toLowerCase().trim();
    return allData.data.filter(item => 
      (item.libraryQuestionKey && item.libraryQuestionKey.toLowerCase().includes(lowerCaseQuery)) ||
      (item.defaultText && item.defaultText.toLowerCase().includes(lowerCaseQuery)) ||
      (item.category && item.category.toLowerCase().includes(lowerCaseQuery))
    );
  }, [allData, searchQuery]);
  
  // Apply pagination to filtered results
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return allFilteredItems.slice(startIndex, startIndex + pageSize);
  }, [allFilteredItems, page, pageSize]);
  
  // Create data object with correct pagination info
  const data = useMemo(() => ({
    data: paginatedItems,
    pagination: {
      page,
      pageSize,
      total: allFilteredItems.length,
      totalPages: Math.ceil(allFilteredItems.length / pageSize)
    }
  }), [paginatedItems, page, pageSize, allFilteredItems.length]);

  const handleCreateNew = () => {
    navigate("/admin/form-builder/question-library/new");
  };

  const handleEdit = (questionId) => {
    navigate(`/admin/form-builder/question-library/${questionId}/edit`);
  };

  const handleDelete = async (questionId) => {
    try {
      const response = await fetch(`/api/form-builder/library-questions/${questionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error("Failed to delete question");
      }

      toast({
        title: "Question deleted",
        description: "The question has been deleted successfully.",
      });

      // Refetch the questions list
      refetch();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete question",
      });
    }
  };

  // Using the shared getQuestionTypeLabel function from form-utils

  if (isError) {
    return (
      <Card className="mt-6 mx-auto max-w-7xl">
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <h3 className="text-lg font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">Failed to load question library. Please try again.</p>
            <Button className="mt-4" onClick={() => refetch()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safe access to ensure we avoid undefined errors
  const questions = data?.data || [];
  const pagination = data?.pagination || { page: 1, pageSize, total: 0, totalPages: 1 };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] overflow-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sticky top-0 bg-card z-10">
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
                  setCategory(e.target.value);
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
                ) : questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No questions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        {question.libraryQuestionKey || question.library_question_key || '—'}
                      </TableCell>
                      <TableCell>{question.defaultText || question.default_text || '—'}</TableCell>
                      <TableCell>{getQuestionTypeLabel(question.questionType || question.question_type)}</TableCell>
                      <TableCell>{question.category || '—'}</TableCell>
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
    </div>
  );
}