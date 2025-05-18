import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { 
  PlusCircle, 
  FileText, 
  ArrowLeft, 
  GripVertical, 
  Trash2, 
  Settings,
  Eye,
  Save
} from "lucide-react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Schema for form page definition
const formPageSchema = z.object({
  title: z.string().min(1, "Page title is required"),
  description: z.string().optional(),
});

// Page Component for the sortable page list
const SortablePage = ({ page, isSelected, onSelect, provided }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-2 mb-2 rounded-md cursor-pointer ${
        isSelected ? "bg-primary-50 border border-primary-200" : "bg-white border border-gray-200"
      }`}
      onClick={() => onSelect(page)}
    >
      <div className="mr-2 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <div className="flex-1 truncate">
        <p className="font-medium text-sm">{page.title}</p>
        {page.description && (
          <p className="text-xs text-gray-500 truncate">{page.description}</p>
        )}
      </div>
    </div>
  );
};

// Question Component for the sortable question list
const SortableQuestion = ({ question, isSelected, onSelect, provided }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getQuestionTypeLabel = (type) => {
    const typeMap = {
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
    
    return typeMap[type] || type;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center p-3 mb-2 rounded-md cursor-pointer ${
        isSelected ? "bg-primary-50 border border-primary-200" : "bg-white border border-gray-200"
      }`}
      onClick={() => onSelect(question)}
    >
      <div className="mr-2 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <p className="font-medium text-sm">{question.displayText || question.display_text}</p>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
            {getQuestionTypeLabel(question.questionType || question.question_type)}
          </span>
        </div>
        {question.helperText && (
          <p className="text-xs text-gray-500">{question.helperText}</p>
        )}
        <div className="flex items-center mt-1 text-xs">
          {(question.isRequired || question.is_required) && (
            <span className="text-red-500 mr-2">Required</span>
          )}
          {(question.isHidden || question.is_hidden) && (
            <span className="text-gray-500 mr-2">Hidden</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Page Form Dialog
const PageFormDialog = ({ 
  isOpen, 
  onOpenChange, 
  initialData = null, 
  onSave 
}) => {
  const form = useForm({
    resolver: zodResolver(formPageSchema),
    defaultValues: initialData ? {
      title: initialData.title || "",
      description: initialData.description || "",
    } : {
      title: "",
      description: "",
    }
  });

  const handleSubmit = async (data) => {
    try {
      await onSave(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving page:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Page" : "Create New Page"}</DialogTitle>
          <DialogDescription>
            {initialData 
              ? "Update the details for this page." 
              : "Create a new page for your form."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Basic Information" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="A brief description of this page..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
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

// Question Settings Panel
const QuestionSettingsPanel = ({ question, onSave, onDelete }) => {
  // Initialize form for question settings
  const questionSettingsSchema = z.object({
    displayText: z.string().min(1, "Question text is required"),
    isRequired: z.boolean().optional(),
    isHidden: z.boolean().optional(),
    helperText: z.string().optional(),
    placeholder: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(questionSettingsSchema),
    defaultValues: {
      displayText: question?.displayText || question?.display_text || "",
      isRequired: question?.isRequired || question?.is_required || false,
      isHidden: question?.isHidden || question?.is_hidden || false,
      helperText: question?.helperText || question?.helper_text || "",
      placeholder: question?.placeholder || "",
    }
  });

  const handleSubmit = async (data) => {
    try {
      await onSave(data);
      toast({
        title: "Question updated",
        description: "The question settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem updating the question",
      });
    }
  };

  if (!question) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div className="p-6">
          <p className="text-muted-foreground">Select a question to edit its settings</p>
        </div>
      </div>
    );
  }

  const getQuestionTypeLabel = (type) => {
    const typeMap = {
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
    
    return typeMap[type] || type;
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Question Settings</h3>
          <p className="text-sm text-muted-foreground">
            {getQuestionTypeLabel(question.questionType || question.question_type)}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="displayText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question Text</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="isRequired"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Required</FormLabel>
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
            
            <FormField
              control={form.control}
              name="isHidden"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Hidden</FormLabel>
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
          </div>
          
          <FormField
            control={form.control}
            name="helperText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Helper Text</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="placeholder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placeholder</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
};

// Main Form Editor Component
export default function FormEditor() {
  const { formId } = useParams();
  const [, navigate] = useLocation();
  
  // State for panels
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [activeLibraryTab, setActiveLibraryTab] = useState("pages");
  
  // Dialog states
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editPageData, setEditPageData] = useState(null);
  
  // DnD states
  const [activeDragId, setActiveDragId] = useState(null);
  const [activeEntity, setActiveEntity] = useState(null);
  
  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch form data
  const { data: formData, isLoading: isFormLoading } = useQuery({
    queryKey: ['/api/form-builder/forms', formId],
    queryFn: async () => {
      const response = await fetch(`/api/form-builder/forms/${formId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch form');
      }
      return await response.json();
    },
  });

  // Fetch form pages
  const { data: pagesData, isLoading: isPagesLoading } = useQuery({
    queryKey: ['/api/form-builder/forms', formId, 'pages'],
    queryFn: async () => {
      const response = await fetch(`/api/form-builder/forms/${formId}/pages`);
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }
      return await response.json();
    },
  });

  // Fetch questions for the selected page
  const { data: questionsData, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ['/api/form-builder/pages', selectedPage?.id, 'questions'],
    queryFn: async () => {
      if (!selectedPage) return { data: [] };
      
      const response = await fetch(`/api/form-builder/pages/${selectedPage.id}/questions`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      return await response.json();
    },
    enabled: !!selectedPage,
  });

  // Fetch library questions for adding to the form
  const { data: libraryQuestionsData, isLoading: isLibraryLoading } = useQuery({
    queryKey: ['/api/form-builder/library-questions'],
    queryFn: async () => {
      const response = await fetch('/api/form-builder/library-questions');
      if (!response.ok) {
        throw new Error('Failed to fetch library questions');
      }
      return await response.json();
    },
  });

  // Set first page as selected when pages are loaded
  useEffect(() => {
    if (pagesData?.data?.length > 0 && !selectedPage) {
      setSelectedPage(pagesData.data[0]);
    }
  }, [pagesData, selectedPage]);

  // Mutations for pages
  const createPageMutation = useMutation({
    mutationFn: async (pageData) => {
      const response = await fetch(`/api/form-builder/forms/${formId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create page');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms', formId, 'pages'] });
      toast({
        title: "Page created",
        description: "The page has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem creating the page",
      });
    }
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ pageId, pageData }) => {
      const response = await fetch(`/api/form-builder/pages/${pageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update page');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms', formId, 'pages'] });
      toast({
        title: "Page updated",
        description: "The page has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem updating the page",
      });
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId) => {
      const response = await fetch(`/api/form-builder/pages/${pageId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete page');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms', formId, 'pages'] });
      setSelectedPage(null);
      toast({
        title: "Page deleted",
        description: "The page has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem deleting the page",
      });
    }
  });

  // Mutations for questions
  const addQuestionMutation = useMutation({
    mutationFn: async ({ pageId, libraryQuestionId, displayOrder }) => {
      const response = await fetch(`/api/form-builder/pages/${pageId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          library_question_id: libraryQuestionId,
          display_order: displayOrder,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add question');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/pages', selectedPage?.id, 'questions'] });
      toast({
        title: "Question added",
        description: "The question has been added to the page.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem adding the question",
      });
    }
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ pageId, questionId, questionData }) => {
      const response = await fetch(`/api/form-builder/pages/${pageId}/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_text_override: questionData.displayText,
          is_required_override: questionData.isRequired,
          is_hidden_override: questionData.isHidden,
          helper_text_override: questionData.helperText,
          placeholder_override: questionData.placeholder,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update question');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/pages', selectedPage?.id, 'questions'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem updating the question",
      });
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async ({ pageId, questionId }) => {
      const response = await fetch(`/api/form-builder/pages/${pageId}/questions/${questionId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete question');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/pages', selectedPage?.id, 'questions'] });
      setSelectedQuestion(null);
      toast({
        title: "Question removed",
        description: "The question has been removed from the page.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem removing the question",
      });
    }
  });

  // Handle page operations
  const handleCreatePage = () => {
    setEditPageData(null);
    setPageDialogOpen(true);
  };

  const handleEditPage = (page) => {
    setEditPageData(page);
    setPageDialogOpen(true);
  };

  const handleSavePage = async (pageData) => {
    if (editPageData) {
      await updatePageMutation.mutateAsync({
        pageId: editPageData.id,
        pageData,
      });
    } else {
      const newPage = await createPageMutation.mutateAsync(pageData);
      if (newPage) {
        setSelectedPage(newPage);
      }
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm("Are you sure you want to delete this page? All questions on this page will also be removed.")) {
      return;
    }
    
    await deletePageMutation.mutateAsync(pageId);
  };

  // Handle question operations
  const handleAddQuestionFromLibrary = async (libraryQuestion) => {
    if (!selectedPage) {
      toast({
        variant: "destructive",
        title: "No page selected",
        description: "Please select a page first to add questions.",
      });
      return;
    }
    
    // Get the next display order
    const nextOrder = questionsData?.data?.length 
      ? Math.max(...questionsData.data.map(q => q.displayOrder || q.display_order)) + 1 
      : 1;
    
    await addQuestionMutation.mutateAsync({
      pageId: selectedPage.id,
      libraryQuestionId: libraryQuestion.id,
      displayOrder: nextOrder,
    });
  };

  const handleUpdateQuestion = async (questionData) => {
    if (!selectedPage || !selectedQuestion) return;
    
    await updateQuestionMutation.mutateAsync({
      pageId: selectedPage.id,
      questionId: selectedQuestion.id,
      questionData,
    });
  };

  const handleDeleteQuestion = async () => {
    if (!selectedPage || !selectedQuestion) return;
    
    if (!window.confirm("Are you sure you want to remove this question from the page?")) {
      return;
    }
    
    await deleteQuestionMutation.mutateAsync({
      pageId: selectedPage.id,
      questionId: selectedQuestion.id,
    });
  };

  // Handle drag and drop
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveDragId(active.id);
    
    // Determine what's being dragged
    const draggedItem = pagesData?.data?.find(p => p.id === active.id) || 
                        questionsData?.data?.find(q => q.id === active.id) ||
                        libraryQuestionsData?.data?.find(q => q.id === active.id);
    
    setActiveEntity(draggedItem);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveEntity(null);
    
    if (!over) return;
    
    // Handle page reordering
    if (activeLibraryTab === "pages" && active.id !== over.id) {
      // TODO: Implement page reordering with the API
    }
    
    // Handle question reordering
    if (activeLibraryTab === "library" && active.id !== over.id) {
      // TODO: Implement question reordering with the API
    }
  };

  // Handle library question drop onto page
  const handleDragOver = (event) => {
    const { active, over } = event;
    
    // Check if dragging a library question over the questions container
    if (activeLibraryTab === "library" && over?.id === "questions-container" && active?.id) {
      // Find the library question being dragged
      const libraryQuestion = libraryQuestionsData?.data?.find(q => q.id === active.id);
      if (libraryQuestion) {
        handleAddQuestionFromLibrary(libraryQuestion);
      }
    }
  };

  // Calculate display values
  const pages = pagesData?.data || [];
  const questions = questionsData?.data || [];
  const libraryQuestions = libraryQuestionsData?.data || [];
  const formTitle = formData?.formTitle || formData?.form_title || "Form Editor";

  // If form is not found
  if (!isFormLoading && !formData) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/admin/form-builder/forms")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Button>
        </div>
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Form Not Found</h2>
          <p className="text-muted-foreground mb-4">The form you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate("/admin/form-builder/forms")}>
            Go to Form Manager
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/form-builder/forms")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-xl font-bold">{formTitle}</h1>
            {formData?.status && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                formData.status === "published" ? "bg-green-100 text-green-800" :
                formData.status === "draft" ? "bg-amber-100 text-amber-800" :
                formData.status === "template" ? "bg-blue-100 text-blue-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content - 3 panel layout */}
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Pages & Library */}
          <div className="w-72 border-r bg-gray-50 flex flex-col">
            <Tabs value={activeLibraryTab} onValueChange={setActiveLibraryTab} className="flex-1 flex flex-col">
              <div className="p-4 border-b">
                <TabsList className="w-full">
                  <TabsTrigger value="pages" className="flex-1">Pages</TabsTrigger>
                  <TabsTrigger value="library" className="flex-1">Library</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="pages" className="flex-1 flex flex-col">
                <div className="flex justify-between items-center p-4 pb-2">
                  <h3 className="font-medium">Form Pages</h3>
                  <Button size="sm" variant="ghost" onClick={handleCreatePage}>
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {isPagesLoading ? (
                    <div className="flex justify-center p-4">
                      <p>Loading pages...</p>
                    </div>
                  ) : pages.length === 0 ? (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">No pages yet</p>
                      <Button size="sm" onClick={handleCreatePage}>
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Create First Page
                      </Button>
                    </div>
                  ) : (
                    <SortableContext items={pages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {pages.map(page => (
                        <div key={page.id} className="relative group">
                          <SortablePage
                            page={page}
                            isSelected={selectedPage?.id === page.id}
                            onSelect={() => setSelectedPage(page)}
                          />
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPage(page);
                              }}
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-red-500" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePage(page.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </SortableContext>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="library" className="flex-1 flex flex-col">
                <div className="flex justify-between items-center p-4 pb-2">
                  <h3 className="font-medium">Question Library</h3>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => navigate("/admin/form-builder/question-library")}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                </div>
                
                <div className="px-4 pb-2">
                  <Input 
                    placeholder="Search questions..." 
                    size="sm"
                    className="text-sm"
                  />
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {isLibraryLoading ? (
                    <div className="flex justify-center p-4">
                      <p>Loading questions...</p>
                    </div>
                  ) : libraryQuestions.length === 0 ? (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-sm text-muted-foreground">No questions in library</p>
                    </div>
                  ) : (
                    <div>
                      {libraryQuestions.map(question => (
                        <div
                          key={question.id}
                          className="p-3 mb-2 rounded-md border border-gray-200 bg-white cursor-move"
                          draggable
                          onDragStart={() => {
                            setActiveDragId(question.id);
                            setActiveEntity(question);
                          }}
                          onClick={() => handleAddQuestionFromLibrary(question)}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-medium text-sm">{question.defaultText || question.default_text}</p>
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {getQuestionTypeLabel(question.questionType || question.question_type)}
                            </span>
                          </div>
                          {(question.helperText || question.helper_text) && (
                            <p className="text-xs text-gray-500 truncate">{question.helperText || question.helper_text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Center Panel - Current Page Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b p-4">
              <h2 className="font-semibold">
                {selectedPage 
                  ? `Editing: ${selectedPage.title}` 
                  : "Select a page to edit"
                }
              </h2>
              {selectedPage?.description && (
                <p className="text-sm text-muted-foreground">{selectedPage.description}</p>
              )}
            </div>
            
            <div className="flex-1 overflow-auto p-6" id="questions-container">
              {!selectedPage ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="max-w-md p-6">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No page selected</h3>
                    <p className="text-muted-foreground mb-4">
                      Select a page from the left panel or create a new one to start building your form.
                    </p>
                    <Button onClick={handleCreatePage}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create New Page
                    </Button>
                  </div>
                </div>
              ) : isQuestionsLoading ? (
                <div className="flex justify-center p-8">
                  <p>Loading questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="max-w-md p-6 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">No questions on this page yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Drag questions from the Question Library panel to add them to this page.
                    </p>
                  </div>
                </div>
              ) : (
                <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                  {questions.map(question => (
                    <SortableQuestion
                      key={question.id}
                      question={question}
                      isSelected={selectedQuestion?.id === question.id}
                      onSelect={() => setSelectedQuestion(question)}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>
          
          {/* Right Panel - Question Settings */}
          <div className="w-80 border-l bg-gray-50">
            <QuestionSettingsPanel
              question={selectedQuestion}
              onSave={handleUpdateQuestion}
              onDelete={handleDeleteQuestion}
            />
          </div>
          
          {/* Drag Overlay */}
          <DragOverlay>
            {activeDragId && activeEntity && (
              activeLibraryTab === "pages" ? (
                <div className="p-2 mb-2 rounded-md bg-white border border-primary-500 shadow-md opacity-80">
                  <p className="font-medium text-sm">{activeEntity.title}</p>
                  {activeEntity.description && (
                    <p className="text-xs text-gray-500 truncate">{activeEntity.description}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 mb-2 rounded-md bg-white border border-primary-500 shadow-md opacity-80">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium text-sm">
                      {activeEntity.displayText || activeEntity.display_text || activeEntity.defaultText || activeEntity.default_text}
                    </p>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {activeEntity.questionType || activeEntity.question_type}
                    </span>
                  </div>
                </div>
              )
            )}
          </DragOverlay>
        </div>
      </DndContext>
      
      {/* Page Dialog */}
      <PageFormDialog
        isOpen={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        initialData={editPageData}
        onSave={handleSavePage}
      />
    </div>
  );
}

// Switch Component - shadcn UI doesn't have a Switch component in the default setup, so we'll create a simple one
const Switch = ({ checked, onCheckedChange }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className={`peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-input"
      }`}
      onClick={() => onCheckedChange(!checked)}
    >
      <span
        data-state={checked ? "checked" : "unchecked"}
        className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};