import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import JSONRequestTester from '@/components/JSONRequestTester';
import { ArrowLeft, RefreshCw, MoreHorizontal, Copy } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

import { PlusCircle, Trash2, Edit, Eye, Save, List, Plus, ArrowUp, ArrowDown, Check, X, Sparkles } from 'lucide-react';

// Import components
import AIQuestionGenerator from "@/components/AIQuestionGenerator";
import QuestionnairePreview from "@/components/QuestionnairePreview";

// Define schemas for the forms
const definitionFormSchema = z.object({
  versionName: z.string().min(1, "Version name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(false)
});

const pageFormSchema = z.object({
  title: z.string().min(1, "Page title is required"),
  order: z.number().int().nonnegative()
});

const questionFormSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionKey: z.string().min(1, "Question key is required"),
  questionType: z.string().min(1, "Question type is required"),
  order: z.number().int().nonnegative(),
  isRequired: z.boolean().default(false),
  placeholderText: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(
    z.object({
      optionText: z.string().min(1, "Option text is required"),
      optionValue: z.string().min(1, "Option value is required"),
      order: z.number().int().nonnegative()
    })
  ).optional(),
});

const conditionalLogicFormSchema = z.object({
  triggerQuestionKey: z.string().min(1, "Trigger question is required"),
  triggerCondition: z.string().min(1, "Condition is required"),
  triggerValue: z.string().optional(),
  actionType: z.string().min(1, "Action type is required"),
  targetQuestionKey: z.string().min(1, "Target question is required")
});

// QuestionType component
const QuestionType = ({ value }: { value: string }) => {
  const types: Record<string, string> = {
    'text': 'Text Input',
    'email': 'Email',
    'phone': 'Phone Number',
    'number': 'Number',
    'date': 'Date',
    'textarea': 'Multiline Text',
    'select': 'Dropdown',
    'radio': 'Radio Buttons',
    'checkbox': 'Checkboxes',
    'matrix': 'Matrix',
    'file': 'File Upload',
    'name': 'Full Name (First/Last)',
    'address': 'Address'
  };
  
  return <span>{types[value] || value}</span>;
};

// Main builder component
const QuestionnaireBuilder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("definitions");
  const [selectedDefinition, setSelectedDefinition] = useState<number | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  
  // Dialogs state
  const [definitionDialogOpen, setDefinitionDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [conditionalLogicDialogOpen, setConditionalLogicDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Additional state for options and matrix columns/rows
  const [questionOptions, setQuestionOptions] = useState<{ optionText: string; optionValue: string; order: number }[]>([]);
  const [matrixColumns, setMatrixColumns] = useState<{ columnText: string; columnKey: string; order: number }[]>([]);
  const [matrixRows, setMatrixRows] = useState<{ rowText: string; rowKey: string; order: number }[]>([]);
  
  // State for tracking which items are being edited
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [editingDefinitionId, setEditingDefinitionId] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");
  
  // State for questionnaire preview
  const [questionsMap, setQuestionsMap] = useState<Record<number, any[]>>({});
  
  // Function to load all questions for preview
  const loadAllQuestionsForPreview = async () => {
    if (!selectedDefinition || !pages || pages.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a questionnaire with pages first."
      });
      return false;
    }
    
    try {
      const questionsForAllPages: Record<number, any[]> = {};
      
      // For each page, load its questions
      for (const page of pages) {
        const response = await fetch(`/api/admin/questionnaires/pages/${page.id}/questions`);
        
        if (response.ok) {
          const pageQuestions = await response.json();
          if (Array.isArray(pageQuestions)) {
            // Also load options for each question that needs them
            for (let i = 0; i < pageQuestions.length; i++) {
              const question = pageQuestions[i];
              if (['select', 'radio', 'checkbox'].includes(question.questionType)) {
                const optionsResponse = await fetch(`/api/admin/questionnaires/questions/${question.id}/options`);
                if (optionsResponse.ok) {
                  const options = await optionsResponse.json();
                  pageQuestions[i].options = options;
                }
              }
            }
            questionsForAllPages[page.id] = pageQuestions;
          }
        }
      }
      
      setQuestionsMap(questionsForAllPages);
      return true;
    } catch (error) {
      console.error("Error loading questions for preview:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load all questions for preview."
      });
      return false;
    }
  }
  
  // Handle opening the preview dialog
  const handleOpenPreview = async () => {
    const success = await loadAllQuestionsForPreview();
    if (success) {
      setPreviewDialogOpen(true);
    }
  };
  const [editingConditionalLogicId, setEditingConditionalLogicId] = useState<number | null>(null);
  
  // Forms
  const definitionForm = useForm<z.infer<typeof definitionFormSchema>>({
    resolver: zodResolver(definitionFormSchema),
    defaultValues: {
      versionName: "",
      description: "",
      isActive: false
    }
  });

  const pageForm = useForm<z.infer<typeof pageFormSchema>>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      title: "",
      order: 0
    }
  });

  const questionForm = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      questionText: "",
      questionKey: "",
      questionType: "text",
      order: 0,
      isRequired: false,
      placeholderText: "",
      helpText: ""
    }
  });

  const conditionalLogicForm = useForm<z.infer<typeof conditionalLogicFormSchema>>({
    resolver: zodResolver(conditionalLogicFormSchema),
    defaultValues: {
      triggerQuestionKey: "",
      triggerCondition: "equals",
      triggerValue: "",
      actionType: "show_question",
      targetQuestionKey: ""
    }
  });

  // Queries
  const { data: definitions, isLoading: isLoadingDefinitions } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/questionnaires/definitions');
      const data = await response.json();
      console.log('Fetched questionnaire definitions:', data);
      return data;
    }
  });

  const { data: pages, isLoading: isLoadingPages } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'pages'],
    queryFn: async () => {
      if (!selectedDefinition) return null;
      const response = await apiRequest('GET', `/api/admin/questionnaires/definitions/${selectedDefinition}/pages`);
      return await response.json();
    },
    enabled: !!selectedDefinition
  });

  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['/api/admin/questionnaires/pages', selectedPage, 'questions'],
    queryFn: async () => {
      if (!selectedPage) return null;
      const response = await apiRequest('GET', `/api/admin/questionnaires/pages/${selectedPage}/questions`);
      return await response.json();
    },
    enabled: !!selectedPage
  });

  const { data: conditionalLogic, isLoading: isLoadingConditionalLogic } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'conditional-logic'],
    queryFn: async () => {
      if (!selectedDefinition) return null;
      const response = await apiRequest('GET', `/api/admin/questionnaires/definitions/${selectedDefinition}/conditional-logic`);
      return await response.json();
    },
    enabled: !!selectedDefinition
  });

  // Get all questions for the selected definition (for conditional logic dropdown)
  const { data: allDefinitionQuestions, isLoading: isLoadingAllQuestions } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'all-questions'],
    queryFn: async () => {
      if (!selectedDefinition || !pages) return [];
      
      const allQuestions = [];
      for (const page of pages) {
        const response = await apiRequest('GET', `/api/admin/questionnaires/pages/${page.id}/questions`);
        const pageQuestions = await response.json();
        if (pageQuestions) {
          allQuestions.push(...pageQuestions);
        }
      }
      return allQuestions;
    },
    enabled: !!selectedDefinition && Array.isArray(pages) && pages.length > 0
  });

  // Mutations
  const toggleDefinitionStatusMutation = useMutation({
    mutationFn: async ({ definitionId, isActive }: { definitionId: number, isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/questionnaires/definitions/${definitionId}/status`, { isActive });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions'] });
      
      toast({
        title: "Success",
        description: `Questionnaire ${data.definition.isActive ? 'activated' : 'deactivated'} successfully`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update questionnaire status",
        variant: "destructive"
      });
    }
  });
  
  const createDefinitionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof definitionFormSchema>) => {
      const response = await apiRequest('POST', '/api/admin/questionnaires/definitions', data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions'] });
      setDefinitionDialogOpen(false);
      definitionForm.reset();
      
      // Auto-select the newly created definition
      if (data && data.id) {
        setSelectedDefinition(data.id);
        setActiveTab("pages");
      }
      
      toast({
        title: "Success",
        description: "Questionnaire definition created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create questionnaire definition",
        variant: "destructive"
      });
    }
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pageFormSchema>) => {
      const response = await apiRequest('POST', `/api/admin/questionnaires/definitions/${selectedDefinition}/pages`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'pages'] });
      setPageDialogOpen(false);
      pageForm.reset();
      
      // Auto-select the newly created page
      if (data && data.id) {
        setSelectedPage(data.id);
        setActiveTab("questions");
      }
      
      toast({
        title: "Success",
        description: "Page created successfully. You can now add questions to this page."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create page",
        variant: "destructive"
      });
    }
  });
  
  const updatePageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof pageFormSchema> }) => {
      const response = await apiRequest('PUT', `/api/admin/questionnaires/definitions/${selectedDefinition}/pages/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'pages'] });
      setEditingPageId(null);
      setPageDialogOpen(false);
      pageForm.reset();
      
      toast({
        title: "Success",
        description: "Page updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update page",
        variant: "destructive"
      });
    }
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof questionFormSchema>) => {
      // Add options to the data if they exist
      const formData = { ...data };
      if (questionOptions.length > 0 && (data.questionType === 'select' || data.questionType === 'radio' || data.questionType === 'checkbox')) {
        formData.options = questionOptions;
      }
      
      // Include matrix columns and rows if it's a matrix question
      if (data.questionType === 'matrix') {
        // We'll add matrixColumns and matrixRows to the payload
        // The backend will handle storing these in the appropriate tables
        formData.matrixColumns = matrixColumns;
        formData.matrixRows = matrixRows;
      }
      
      const response = await apiRequest('POST', `/api/admin/questionnaires/pages/${selectedPage}/questions`, formData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/pages', selectedPage, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'all-questions'] });
      setQuestionOptions([]);
      setQuestionDialogOpen(false);
      questionForm.reset();
      
      toast({
        title: "Success",
        description: "Question created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create question",
        variant: "destructive"
      });
    }
  });

  const createConditionalLogicMutation = useMutation({
    mutationFn: async (data: z.infer<typeof conditionalLogicFormSchema>) => {
      const response = await apiRequest('POST', `/api/admin/questionnaires/definitions/${selectedDefinition}/conditional-logic`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'conditional-logic'] });
      setConditionalLogicDialogOpen(false);
      conditionalLogicForm.reset();
      
      toast({
        title: "Success",
        description: "Conditional logic rule created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create conditional logic rule",
        variant: "destructive"
      });
    }
  });
  
  const updateConditionalLogicMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof conditionalLogicFormSchema> }) => {
      const response = await apiRequest('PUT', `/api/admin/questionnaires/conditional-logic/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'conditional-logic'] });
      setEditingConditionalLogicId(null);
      setConditionalLogicDialogOpen(false);
      conditionalLogicForm.reset();
      
      toast({
        title: "Success",
        description: "Conditional logic rule updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update conditional logic rule",
        variant: "destructive"
      });
    }
  });

  const deleteDefinitionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/questionnaires/definitions/${id}`);
    },
    onSuccess: () => {
      // Clear all related states
      setSelectedDefinition(null);
      setSelectedPage(null);
      setEditingPageId(null);
      setEditingQuestionId(null);
      setEditingConditionalLogicId(null);
      
      // Set active tab back to definitions
      setActiveTab("definitions");
      
      // Invalidate all related queries to ensure proper cache updates
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions'] });
      
      toast({
        title: "Success",
        description: "Questionnaire definition deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete questionnaire definition",
        variant: "destructive"
      });
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/questionnaires/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'pages'] });
      setSelectedPage(null);
      toast({
        title: "Success",
        description: "Page deleted successfully"
      });
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      // Add options to the data if they exist
      const formData = { ...data };
      if (questionOptions.length > 0 && (data.questionType === 'select' || data.questionType === 'radio' || data.questionType === 'checkbox')) {
        formData.options = questionOptions;
      }
      
      // Include matrix columns and rows if it's a matrix question
      if (data.questionType === 'matrix') {
        formData.matrixColumns = matrixColumns;
        formData.matrixRows = matrixRows;
      }
      
      const response = await apiRequest('PUT', `/api/admin/questionnaires/questions/${id}`, formData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/pages', selectedPage, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'all-questions'] });
      setQuestionOptions([]);
      setEditingQuestionId(null);
      setQuestionDialogOpen(false);
      questionForm.reset();
      
      toast({
        title: "Success",
        description: "Question updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update question",
        variant: "destructive"
      });
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/questionnaires/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/pages', selectedPage, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'all-questions'] });
      toast({
        title: "Success",
        description: "Question deleted successfully"
      });
    }
  });

  const deleteConditionalLogicMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/questionnaires/conditional-logic/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'conditional-logic'] });
      toast({
        title: "Success",
        description: "Conditional logic rule deleted successfully"
      });
    }
  });

  // Form submission handlers
  const onSubmitDefinition = (data: z.infer<typeof definitionFormSchema>) => {
    createDefinitionMutation.mutate(data);
  };

  const onSubmitPage = (data: z.infer<typeof pageFormSchema>) => {
    if (editingPageId) {
      // If we're editing an existing page
      updatePageMutation.mutate({ id: editingPageId, data });
    } else {
      // If we're creating a new page
      createPageMutation.mutate(data);
    }
  };

  const onSubmitQuestion = (data: z.infer<typeof questionFormSchema>) => {
    if (editingQuestionId) {
      // Update existing question
      updateQuestionMutation.mutate({ id: editingQuestionId, data });
    } else {
      // Create new question
      createQuestionMutation.mutate(data);
    }
    
    // Reset matrix rows and columns on submission
    if (data.questionType === 'matrix') {
      setMatrixRows([]);
      setMatrixColumns([]);
    }
  };

  const onSubmitConditionalLogic = (data: z.infer<typeof conditionalLogicFormSchema>) => {
    if (editingConditionalLogicId) {
      // Update existing conditional logic rule
      updateConditionalLogicMutation.mutate({ id: editingConditionalLogicId, data });
    } else {
      // Create new conditional logic rule
      createConditionalLogicMutation.mutate(data);
    }
  };

  // Option management helpers
  const addOption = () => {
    setQuestionOptions([...questionOptions, {
      optionText: "",
      optionValue: "",
      order: questionOptions.length
    }]);
  };

  const updateOption = (index: number, field: 'optionText' | 'optionValue', value: string) => {
    const newOptions = [...questionOptions];
    newOptions[index][field] = value;
    setQuestionOptions(newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = [...questionOptions];
    newOptions.splice(index, 1);
    // Update the order property
    newOptions.forEach((opt, idx) => opt.order = idx);
    setQuestionOptions(newOptions);
  };

  // Matrix column management helpers
  const addMatrixColumn = () => {
    setMatrixColumns([...matrixColumns, {
      columnText: "",
      columnKey: "",
      order: matrixColumns.length
    }]);
  };

  const updateMatrixColumn = (index: number, field: 'columnText' | 'columnKey', value: string) => {
    const newColumns = [...matrixColumns];
    newColumns[index][field] = value;
    setMatrixColumns(newColumns);
  };

  const removeMatrixColumn = (index: number) => {
    const newColumns = [...matrixColumns];
    newColumns.splice(index, 1);
    // Update the order property
    newColumns.forEach((col, idx) => col.order = idx);
    setMatrixColumns(newColumns);
  };

  // Matrix row management helpers
  const addMatrixRow = () => {
    setMatrixRows([...matrixRows, {
      rowText: "",
      rowKey: "",
      order: matrixRows.length
    }]);
  };

  const updateMatrixRow = (index: number, field: 'rowText' | 'rowKey', value: string) => {
    const newRows = [...matrixRows];
    newRows[index][field] = value;
    setMatrixRows(newRows);
  };

  const removeMatrixRow = (index: number) => {
    const newRows = [...matrixRows];
    newRows.splice(index, 1);
    // Update the order property
    newRows.forEach((row, idx) => row.order = idx);
    setMatrixRows(newRows);
  };

  // Watch for question type changes to show/hide options
  const questionType = questionForm.watch("questionType");
  const showOptions = questionType === 'select' || questionType === 'radio' || questionType === 'checkbox';
  const showMatrix = questionType === 'matrix';

  // Effect to set the initial order for new questions
  useEffect(() => {
    if (questions && Array.isArray(questions) && questions.length > 0) {
      questionForm.setValue('order', questions.length);
    } else {
      questionForm.setValue('order', 0);
    }
  }, [questions, questionForm]);

  // Effect to set the initial order for new pages
  useEffect(() => {
    if (pages && Array.isArray(pages) && pages.length > 0) {
      pageForm.setValue('order', pages.length);
    } else {
      pageForm.setValue('order', 0);
    }
  }, [pages, pageForm]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Questionnaire Builder</h1>
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("definitions")} 
              className={`${activeTab === "definitions" 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} 
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Questionnaire Definitions
            </button>
            <button
              onClick={() => selectedDefinition && setActiveTab("pages")}
              disabled={!selectedDefinition}
              className={`${activeTab === "pages" 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} 
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${!selectedDefinition ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Pages
            </button>
            <button
              onClick={() => selectedPage && setActiveTab("questions")}
              disabled={!selectedPage}
              className={`${activeTab === "questions" 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} 
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${!selectedPage ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Questions
            </button>
            <button
              onClick={() => selectedDefinition && setActiveTab("conditionalLogic")}
              disabled={!selectedDefinition}
              className={`${activeTab === "conditionalLogic" 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} 
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${!selectedDefinition ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Conditional Logic
            </button>
            <button
              onClick={() => selectedDefinition && setActiveTab("preview")}
              disabled={!selectedDefinition}
              className={`${activeTab === "preview" 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} 
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${!selectedDefinition ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab("apiTester")}
              className={`${activeTab === "apiTester" 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} 
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              API Tester
            </button>
          </nav>
        </div>
        
        {/* Definitions Tab Content */}
        {activeTab === "definitions" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Questionnaire Definitions</CardTitle>
                <Dialog open={definitionDialogOpen} onOpenChange={setDefinitionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Definition
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Questionnaire Definition</DialogTitle>
                      <DialogDescription>
                        Add a new questionnaire definition to your system.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...definitionForm}>
                      <form onSubmit={definitionForm.handleSubmit(onSubmitDefinition)} className="space-y-4">
                        <FormField
                          control={definitionForm.control}
                          name="versionName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Version Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Catering Inquiry Form v1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={definitionForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the purpose of this questionnaire" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={definitionForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Active</FormLabel>
                                <FormDescription>
                                  Make this questionnaire available to clients
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createDefinitionMutation.isPending}>
                            {createDefinitionMutation.isPending ? "Creating..." : "Create Definition"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDefinitions ? (
                <div className="text-center py-4">Loading definitions...</div>
              ) : definitions && Array.isArray(definitions) && definitions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {definitions.map((def: any) => (
                      <TableRow 
                        key={def.id}
                        className={selectedDefinition === def.id ? "bg-primary/10" : ""}
                      >
                        <TableCell>
                          <div className="font-medium">{def.versionName}</div>
                        </TableCell>
                        <TableCell>{def.description || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            def.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {def.isActive ? "Active" : "Draft"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(def.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant={def.isActive ? "destructive" : "default"}
                              size="sm"
                              onClick={() => toggleDefinitionStatusMutation.mutate({ 
                                definitionId: def.id, 
                                isActive: !def.isActive 
                              })}
                              disabled={toggleDefinitionStatusMutation.isPending}
                            >
                              {def.isActive ? (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                            
                            <Button
                              variant="default" 
                              size="sm" 
                              onClick={() => {
                                setSelectedDefinition(def.id);
                                setActiveTab("pages");
                              }}
                            >
                              <List className="h-4 w-4 mr-1" />
                              Pages
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4 mr-1" />
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    // Clone the current definition
                                    const newVersion = {
                                      versionName: `${def.versionName} (Copy)`,
                                      description: def.description,
                                      isActive: false
                                    };
                                    
                                    createDefinitionMutation.mutate(newVersion, {
                                      onSuccess: (data) => {
                                        toast({
                                          title: "Questionnaire Cloned",
                                          description: "Created a new copy of the questionnaire definition",
                                        });
                                        
                                        // Select the new definition and navigate to its pages
                                        setSelectedDefinition(data.id);
                                        setActiveTab("pages");
                                      }
                                    });
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Clone Questionnaire
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => {
                                    // Fill form with current values for editing
                                    definitionForm.reset({
                                      versionName: def.versionName,
                                      description: def.description || "",
                                      isActive: def.isActive
                                    });
                                    setEditingDefinitionId(def.id);
                                    setDefinitionDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    // Show a confirmation dialog using the existing Alert Dialog
                                    const confirmDelete = window.confirm(
                                      `Are you absolutely sure you want to delete "${def.versionName}"? This action cannot be undone.`
                                    );
                                    
                                    if (confirmDelete) {
                                      deleteDefinitionMutation.mutate(def.id, {
                                        onSuccess: () => {
                                          toast({
                                            title: "Questionnaire Deleted",
                                            description: "The questionnaire has been successfully deleted.",
                                          });
                                        }
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questionnaire Definitions Yet</h3>
                  <p className="text-gray-600 mb-4">Create your first questionnaire definition to get started.</p>
                  <Button onClick={() => setDefinitionDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Definition
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Pages Tab Content */}
        {activeTab === "pages" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pages</CardTitle>
                <CardDescription>
                  {selectedDefinition && definitions ? (
                    <span>Managing pages for: <strong>{definitions.find((d: any) => d.id === selectedDefinition)?.versionName}</strong></span>
                  ) : (
                    <span>Select a definition first</span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!selectedDefinition || !pages || pages.length === 0}
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                  onClick={handleOpenPreview}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Form
                </Button>
                
                <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedDefinition}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Page
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingPageId ? "Edit Page" : "Add New Page"}</DialogTitle>
                      <DialogDescription>
                        {editingPageId ? "Modify this page's properties." : "Create a new page for your questionnaire."}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...pageForm}>
                      <form onSubmit={pageForm.handleSubmit(onSubmitPage)} className="space-y-4">
                        <FormField
                          control={pageForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Page Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Event Details" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={pageForm.control}
                          name="order"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                The order in which this page appears in the questionnaire.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createPageMutation.isPending || updatePageMutation.isPending}>
                            {editingPageId
                              ? (updatePageMutation.isPending ? "Updating..." : "Update Page")
                              : (createPageMutation.isPending ? "Creating..." : "Create Page")
                            }
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedDefinition ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Definition Selected</h3>
                  <p className="text-gray-600 mb-4">Select a questionnaire definition to manage its pages.</p>
                  <Button onClick={() => setActiveTab("definitions")}>
                    Go to Definitions
                  </Button>
                </div>
              ) : isLoadingPages ? (
                <div className="text-center py-4">Loading pages...</div>
              ) : pages && Array.isArray(pages) && pages.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.sort((a: any, b: any) => a.order - b.order).map((page: any) => (
                      <TableRow 
                        key={page.id}
                        className={selectedPage === page.id ? "bg-primary/10" : ""}
                      >
                        <TableCell>{page.order}</TableCell>
                        <TableCell>
                          <div className="font-medium">{page.title}</div>
                        </TableCell>
                        <TableCell>
                          {/* Ideally we'd show the count of questions, but for simplicity we'll leave it empty */}
                          —
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedPage(page.id);
                              setActiveTab("questions");
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Questions
                          </Button>
                          <Button
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              // Set up form values for the selected page
                              pageForm.reset({
                                title: page.title,
                                order: page.order
                              });
                              
                              // Set the current page being edited
                              setEditingPageId(page.id);
                              
                              // Open dialog
                              setPageDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              const confirmDelete = window.confirm(
                                `Are you sure you want to delete the page "${page.title}"? All questions on this page will also be deleted. This action cannot be undone.`
                              );
                              
                              if (confirmDelete) {
                                deletePageMutation.mutate(page.id, {
                                  onSuccess: () => {
                                    toast({
                                      title: "Page Deleted",
                                      description: "The page and its questions have been deleted."
                                    });
                                  }
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Pages Yet</h3>
                  <p className="text-gray-600 mb-4">Add your first page to get started.</p>
                  <Button onClick={() => setPageDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Questions Tab Content */}
        {activeTab === "questions" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    {selectedPage && pages ? (
                      <span>
                        Managing questions for page: <strong>{pages.find((p: any) => p.id === selectedPage)?.title}</strong>
                      </span>
                    ) : (
                      <span>Select a page first</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <AIQuestionGenerator 
                    disabled={!selectedPage} 
                    pageId={selectedPage} 
                    definitionId={selectedDefinition}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/pages', selectedPage, 'questions'] });
                    }}
                  />
                
                  <Dialog 
                    open={questionDialogOpen} 
                    onOpenChange={(open) => {
                      if (!open) {
                        // Reset form and editing state when dialog is closed
                        setEditingQuestionId(null);
                        questionForm.reset({
                          questionText: "",
                          questionKey: "",
                          questionType: "text",
                          order: 0,
                          isRequired: false,
                          placeholderText: "",
                          helpText: ""
                        });
                        setQuestionOptions([]);
                      }
                      setQuestionDialogOpen(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button disabled={!selectedPage}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingQuestionId ? "Edit Question" : "Add New Question"}</DialogTitle>
                        <DialogDescription>
                          {editingQuestionId ? "Modify this question's properties." : "Create a new question for this page."}
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...questionForm}>
                        <form onSubmit={questionForm.handleSubmit(onSubmitQuestion)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={questionForm.control}
                            name="questionText"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Question Text</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., What is your email address?" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={questionForm.control}
                            name="questionKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Question Key</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., email_address" {...field} />
                                </FormControl>
                                <FormDescription>
                                  A unique identifier for this question
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={questionForm.control}
                            name="questionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Question Type</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a question type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="text">Text Input</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="phone">Phone Number</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="textarea">Multiline Text</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                    <SelectItem value="name">Full Name (First/Last)</SelectItem>
                                    <SelectItem value="address">Address</SelectItem>
                                    <SelectItem value="radio">Radio Buttons</SelectItem>
                                    <SelectItem value="checkbox">Checkboxes</SelectItem>
                                    <SelectItem value="matrix">Matrix</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The type of input required for this question
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={questionForm.control}
                            name="order"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Order</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Display order on the page
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={questionForm.control}
                            name="placeholderText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Placeholder Text</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Enter your email..." {...field} value={field.value || ""} />
                                </FormControl>
                                <FormDescription>
                                  Optional placeholder text for the input
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={questionForm.control}
                            name="isRequired"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center gap-2 pt-8">
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel>Required Question</FormLabel>
                                </div>
                                <FormDescription>
                                  Toggle if this question must be answered
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={questionForm.control}
                            name="helpText"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Help Text</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Additional instructions for answering this question..."
                                    {...field}
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Optional help text to provide context or instructions
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Options section for select/radio/checkbox types */}
                        {showOptions && (
                          <div className="space-y-4 border p-4 rounded-md mt-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold">Options</h4>
                              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Option
                              </Button>
                            </div>
                            
                            {questionOptions.length === 0 ? (
                              <div className="text-center text-gray-500 py-2">No options added yet</div>
                            ) : (
                              <div className="space-y-3">
                                {questionOptions.map((option, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <Input
                                      placeholder="Option text"
                                      value={option.optionText}
                                      onChange={(e) => updateOption(index, 'optionText', e.target.value)}
                                      className="flex-1"
                                    />
                                    <Input
                                      placeholder="Option value"
                                      value={option.optionValue}
                                      onChange={(e) => updateOption(index, 'optionValue', e.target.value)}
                                      className="flex-1"
                                    />
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => removeOption(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Matrix question configuration */}
                        {showMatrix && (
                          <div className="space-y-6 border p-4 rounded-md mt-4">
                            <h4 className="font-semibold">Matrix Configuration</h4>
                            <p className="text-gray-500 text-sm mb-4">
                              A matrix question displays a grid of options where respondents can select responses for each row according to the column options.
                            </p>
                            
                            {/* Matrix Columns (represent the response options for each row) */}
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h5 className="font-medium">Matrix Columns (Response Options)</h5>
                                <Button type="button" variant="outline" size="sm" onClick={addMatrixColumn}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Column
                                </Button>
                              </div>
                              
                              {matrixColumns.length === 0 ? (
                                <div className="text-center text-gray-500 py-2">No columns added yet</div>
                              ) : (
                                <div className="space-y-3">
                                  {matrixColumns.map((column, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Input
                                        placeholder="Column text (e.g., 'Strongly Agree')"
                                        value={column.columnText}
                                        onChange={(e) => updateMatrixColumn(index, 'columnText', e.target.value)}
                                        className="flex-1"
                                      />
                                      <Input
                                        placeholder="Column key (e.g., 'strongly_agree')"
                                        value={column.columnKey}
                                        onChange={(e) => updateMatrixColumn(index, 'columnKey', e.target.value)}
                                        className="flex-1"
                                      />
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => removeMatrixColumn(index)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Matrix Rows (represent the statements or questions) */}
                            <div className="space-y-4 mt-6">
                              <div className="flex justify-between items-center">
                                <h5 className="font-medium">Matrix Rows (Statements)</h5>
                                <Button type="button" variant="outline" size="sm" onClick={addMatrixRow}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Row
                                </Button>
                              </div>
                              
                              {matrixRows.length === 0 ? (
                                <div className="text-center text-gray-500 py-2">No rows added yet</div>
                              ) : (
                                <div className="space-y-3">
                                  {matrixRows.map((row, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Input
                                        placeholder="Row text (e.g., 'The service was excellent')"
                                        value={row.rowText}
                                        onChange={(e) => updateMatrixRow(index, 'rowText', e.target.value)}
                                        className="flex-1"
                                      />
                                      <Input
                                        placeholder="Row key (e.g., 'service_quality')"
                                        value={row.rowKey}
                                        onChange={(e) => updateMatrixRow(index, 'rowKey', e.target.value)}
                                        className="flex-1"
                                      />
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => removeMatrixRow(index)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Matrix Preview */}
                            {matrixColumns.length > 0 && matrixRows.length > 0 && (
                              <div className="mt-6 space-y-2">
                                <h5 className="font-medium">Matrix Preview</h5>
                                <div className="border rounded-md overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Question
                                        </th>
                                        {matrixColumns.map((column, i) => (
                                          <th key={i} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {column.columnText || `Column ${i+1}`}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {matrixRows.map((row, i) => (
                                        <tr key={i}>
                                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {row.rowText || `Row ${i+1}`}
                                          </td>
                                          {matrixColumns.map((column, j) => (
                                            <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                              <div className="h-4 w-4 rounded-full border border-gray-300 mx-auto"></div>
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <DialogFooter>
                          <Button type="submit" disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}>
                            {editingQuestionId 
                              ? (updateQuestionMutation.isPending ? "Updating..." : "Update Question") 
                              : (createQuestionMutation.isPending ? "Creating..." : "Create Question")
                            }
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedPage ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Page Selected</h3>
                  <p className="text-gray-600 mb-4">Select a page to manage its questions.</p>
                  <Button onClick={() => setActiveTab("pages")}>
                    Go to Pages
                  </Button>
                </div>
              ) : isLoadingQuestions ? (
                <div className="text-center py-4">Loading questions...</div>
              ) : questions && Array.isArray(questions) && questions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.sort((a: any, b: any) => a.order - b.order).map((question: any) => (
                      <TableRow key={question.id}>
                        <TableCell>{question.order}</TableCell>
                        <TableCell>
                          <div className="font-medium">{question.questionText}</div>
                          {question.helpText && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{question.helpText}</div>
                          )}
                        </TableCell>
                        <TableCell><QuestionType value={question.questionType} /></TableCell>
                        <TableCell><code className="text-xs">{question.questionKey}</code></TableCell>
                        <TableCell>{question.isRequired ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              // Set up form values for the selected question
                              questionForm.reset({
                                questionText: question.questionText,
                                questionKey: question.questionKey,
                                questionType: question.questionType,
                                order: question.order,
                                isRequired: question.isRequired,
                                placeholderText: question.placeholderText || "",
                                helpText: question.helpText || ""
                              });
                              
                              // Set options if they exist
                              if (question.options && question.options.length > 0) {
                                setQuestionOptions(question.options);
                              } else {
                                setQuestionOptions([]);
                              }
                              
                              // Set the current question being edited
                              setEditingQuestionId(question.id);
                              
                              // Open dialog
                              setQuestionDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Question</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this question? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteQuestionMutation.mutate(question.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questions Yet</h3>
                  <p className="text-gray-600 mb-4">Add your first question to this page.</p>
                  <Button onClick={() => setQuestionDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Question
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Conditional Logic Tab Content */}
        {activeTab === "conditionalLogic" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Conditional Logic</CardTitle>
                  <CardDescription>
                    Managing logic for: <strong>{definitions?.find((d: any) => d.id === selectedDefinition)?.versionName}</strong>
                  </CardDescription>
                </div>
                <Dialog 
                  open={conditionalLogicDialogOpen} 
                  onOpenChange={(open) => {
                    if (!open) {
                      // Reset form and editing state when dialog is closed
                      setEditingConditionalLogicId(null);
                      conditionalLogicForm.reset({
                        triggerQuestionKey: "",
                        triggerCondition: "equals",
                        triggerValue: "",
                        actionType: "show_question",
                        targetQuestionKey: ""
                      });
                    }
                    setConditionalLogicDialogOpen(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button disabled={!allDefinitionQuestions || !Array.isArray(allDefinitionQuestions) || allDefinitionQuestions.length < 1}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Logic Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingConditionalLogicId ? "Edit Logic Rule" : "Create Conditional Logic Rule"}</DialogTitle>
                      <DialogDescription>
                        {editingConditionalLogicId 
                          ? "Update this conditional logic rule." 
                          : "Define behavior based on answers to questions."}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...conditionalLogicForm}>
                      <form onSubmit={conditionalLogicForm.handleSubmit(onSubmitConditionalLogic)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={conditionalLogicForm.control}
                            name="triggerQuestionKey"
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>If Question</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a trigger question" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {allDefinitionQuestions && Array.isArray(allDefinitionQuestions) && allDefinitionQuestions.map((q: any) => (
                                      <SelectItem key={q.questionKey} value={q.questionKey}>
                                        {q.questionText} ({q.questionKey})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The question that will trigger this rule
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={conditionalLogicForm.control}
                            name="triggerCondition"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Condition</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a condition" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="not_equals">Not Equals</SelectItem>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="not_contains">Doesn't Contain</SelectItem>
                                    <SelectItem value="starts_with">Starts With</SelectItem>
                                    <SelectItem value="ends_with">Ends With</SelectItem>
                                    <SelectItem value="greater_than">Greater Than</SelectItem>
                                    <SelectItem value="less_than">Less Than</SelectItem>
                                    <SelectItem value="is_answered">Is Answered</SelectItem>
                                    <SelectItem value="is_empty">Is Empty</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Only show value field for conditions that need a comparison value */}
                          {() => {
                            const condition = conditionalLogicForm.watch("triggerCondition");
                            const needsValue = !["is_answered", "is_empty"].includes(condition);
                            
                            return (
                              <FormField
                                control={conditionalLogicForm.control}
                                name="triggerValue"
                                render={({ field }) => {
                                  return (
                                    <FormItem>
                                      <FormLabel>Expected Value</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          disabled={!needsValue}
                                          placeholder={needsValue ? "Value to compare against" : "Not needed for this condition"}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
                              />
                            );
                          }}
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={conditionalLogicForm.control}
                              name="actionType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Action</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an action" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="show_question">Show Question</SelectItem>
                                      <SelectItem value="hide_question">Hide Question</SelectItem>
                                      <SelectItem value="require_question">Make Question Required</SelectItem>
                                      <SelectItem value="unrequire_question">Make Question Optional</SelectItem>
                                      <SelectItem value="skip_to_page">Skip to Page</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    The action to take when the condition is met
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={conditionalLogicForm.control}
                              name="targetQuestionKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Target Question</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select target question" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {allDefinitionQuestions && Array.isArray(allDefinitionQuestions) && allDefinitionQuestions
                                        .filter((q: any) => q.questionKey !== conditionalLogicForm.watch("triggerQuestionKey"))
                                        .map((q: any) => (
                                          <SelectItem key={q.questionKey} value={q.questionKey}>
                                            {q.questionText} ({q.questionKey})
                                          </SelectItem>
                                        ))
                                      }
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    The question affected by this rule
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button type="submit" disabled={createConditionalLogicMutation.isPending || updateConditionalLogicMutation.isPending}>
                            {editingConditionalLogicId
                              ? (updateConditionalLogicMutation.isPending ? "Updating..." : "Update Logic Rule")
                              : (createConditionalLogicMutation.isPending ? "Creating..." : "Create Logic Rule")
                            }
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedDefinition ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Definition Selected</h3>
                  <p className="text-gray-600 mb-4">Select a questionnaire definition to manage conditional logic.</p>
                  <Button onClick={() => setActiveTab("definitions")}>
                    Go to Definitions
                  </Button>
                </div>
              ) : isLoadingConditionalLogic ? (
                <div className="text-center py-4">Loading logic rules...</div>
              ) : !allDefinitionQuestions || !Array.isArray(allDefinitionQuestions) || allDefinitionQuestions.length === 0 ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questions Available</h3>
                  <p className="text-gray-600 mb-4">Add questions to your questionnaire before creating logic rules.</p>
                  <Button onClick={() => setActiveTab("pages")}>
                    Go to Pages
                  </Button>
                </div>
              ) : conditionalLogic && Array.isArray(conditionalLogic) && conditionalLogic.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>If Question</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Then</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conditionalLogic.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          {allDefinitionQuestions.find((q: any) => q.questionKey === rule.triggerQuestionKey)?.questionText || rule.triggerQuestionKey}
                        </TableCell>
                        <TableCell>
                          {rule.triggerCondition.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {rule.triggerValue || '—'}
                        </TableCell>
                        <TableCell>
                          {rule.actionType.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {allDefinitionQuestions.find((q: any) => q.questionKey === rule.targetQuestionKey)?.questionText || rule.targetQuestionKey}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              // Set up form values for the selected conditional logic rule
                              conditionalLogicForm.reset({
                                triggerQuestionKey: rule.triggerQuestionKey,
                                triggerCondition: rule.triggerCondition,
                                triggerValue: rule.triggerValue || "",
                                actionType: rule.actionType,
                                targetQuestionKey: rule.targetQuestionKey
                              });
                              
                              // Set the current rule being edited
                              setEditingConditionalLogicId(rule.id);
                              
                              // Open dialog
                              setConditionalLogicDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Logic Rule</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this conditional logic rule? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteConditionalLogicMutation.mutate(rule.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No conditional logic rules yet</h3>
                  <p className="text-gray-600 mb-4">Create your first logic rule.</p>
                  <Button onClick={() => setConditionalLogicDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create First Logic Rule
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* API Tester Tab Content */}
        {activeTab === "apiTester" && (
          <JSONRequestTester />
        )}
        
        {/* Preview Tab Content */}
        {activeTab === "preview" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    Preview your questionnaire as it will appear to users.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedDefinition && pages && pages.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <Button onClick={() => setActiveTab("definitions")} variant="outline" className="mr-2">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Return to Definitions
                    </Button>
                    <Button onClick={() => loadAllQuestionsForPreview()} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" /> Refresh Preview
                    </Button>
                  </div>
                  <QuestionnairePreview
                    definitionId={selectedDefinition}
                    pages={pages || []}
                    questionsMap={questionsMap}
                    onClose={() => setActiveTab("definitions")}
                  />
                </div>
              ) : (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questionnaire Selected</h3>
                  <p className="text-gray-600 mb-4">Please select a questionnaire definition to preview.</p>
                  <Button onClick={() => setActiveTab("definitions")}>
                    Return to Definitions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Questionnaire Preview</DialogTitle>
              <DialogDescription>
                This is how your questionnaire will appear to users. You can navigate through pages to test the experience.
              </DialogDescription>
            </DialogHeader>
            
            {selectedDefinition && (
              <QuestionnairePreview
                definitionId={selectedDefinition}
                pages={pages || []}
                questionsMap={questionsMap}
                onClose={() => setPreviewDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default QuestionnaireBuilder;