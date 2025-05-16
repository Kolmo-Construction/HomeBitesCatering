import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

import { PlusCircle, Trash2, Edit, Eye, Save, List, Plus, ArrowUp, ArrowDown, Check, X } from 'lucide-react';

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
    'file': 'File Upload'
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
  
  // Additional state for options
  const [questionOptions, setQuestionOptions] = useState<{ optionText: string; optionValue: string; order: number }[]>([]);
  
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
    queryFn: () => apiRequest('GET', '/api/admin/questionnaires/definitions')
  });

  const { data: pages, isLoading: isLoadingPages } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'pages'],
    queryFn: () => selectedDefinition ? apiRequest('GET', `/api/admin/questionnaires/definitions/${selectedDefinition}/pages`) : null,
    enabled: !!selectedDefinition
  });

  const { data: questions, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['/api/admin/questionnaires/pages', selectedPage, 'questions'],
    queryFn: () => selectedPage ? apiRequest('GET', `/api/admin/questionnaires/pages/${selectedPage}/questions`) : null,
    enabled: !!selectedPage
  });

  const { data: conditionalLogic, isLoading: isLoadingConditionalLogic } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'conditional-logic'],
    queryFn: () => selectedDefinition ? apiRequest('GET', `/api/admin/questionnaires/definitions/${selectedDefinition}/conditional-logic`) : null,
    enabled: !!selectedDefinition
  });

  // Get all questions for the selected definition (for conditional logic dropdown)
  const { data: allDefinitionQuestions } = useQuery({
    queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'all-questions'],
    queryFn: async () => {
      if (!selectedDefinition || !pages?.length) return [];
      
      // Fetch questions for each page
      const allQuestions = [];
      for (const page of pages) {
        const pageQuestions = await apiRequest('GET', `/api/admin/questionnaires/pages/${page.id}/questions`);
        if (pageQuestions) {
          allQuestions.push(...pageQuestions);
        }
      }
      return allQuestions;
    },
    enabled: !!selectedDefinition && !!pages?.length
  });

  // Mutations
  const createDefinitionMutation = useMutation({
    mutationFn: (data: z.infer<typeof definitionFormSchema>) => 
      apiRequest('POST', '/api/admin/questionnaires/definitions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions'] });
      setDefinitionDialogOpen(false);
      definitionForm.reset();
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
    mutationFn: (data: z.infer<typeof pageFormSchema>) => 
      apiRequest('POST', `/api/admin/questionnaires/definitions/${selectedDefinition}/pages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'pages'] });
      setPageDialogOpen(false);
      pageForm.reset();
      toast({
        title: "Success",
        description: "Page created successfully"
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

  const createQuestionMutation = useMutation({
    mutationFn: (data: z.infer<typeof questionFormSchema>) => {
      // Add options to the data if they exist
      if (questionOptions.length > 0 && (data.questionType === 'select' || data.questionType === 'radio' || data.questionType === 'checkbox')) {
        data.options = questionOptions;
      }
      return apiRequest('POST', `/api/admin/questionnaires/pages/${selectedPage}/questions`, data);
    },
    onSuccess: () => {
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
    mutationFn: (data: z.infer<typeof conditionalLogicFormSchema>) => 
      apiRequest('POST', `/api/admin/questionnaires/definitions/${selectedDefinition}/conditional-logic`, data),
    onSuccess: () => {
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

  const deleteDefinitionMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/questionnaires/definitions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions'] });
      setSelectedDefinition(null);
      toast({
        title: "Success",
        description: "Questionnaire definition deleted successfully"
      });
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/questionnaires/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questionnaires/definitions', selectedDefinition, 'pages'] });
      setSelectedPage(null);
      toast({
        title: "Success",
        description: "Page deleted successfully"
      });
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/questionnaires/questions/${id}`),
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
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/questionnaires/conditional-logic/${id}`),
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
    createPageMutation.mutate(data);
  };

  const onSubmitQuestion = (data: z.infer<typeof questionFormSchema>) => {
    createQuestionMutation.mutate(data);
  };

  const onSubmitConditionalLogic = (data: z.infer<typeof conditionalLogicFormSchema>) => {
    createConditionalLogicMutation.mutate(data);
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

  // Watch for question type changes to show/hide options
  const questionType = questionForm.watch("questionType");
  const showOptions = questionType === 'select' || questionType === 'radio' || questionType === 'checkbox';

  // Effect to set the initial order for new questions
  useEffect(() => {
    if (questions?.length) {
      questionForm.setValue('order', questions.length);
    } else {
      questionForm.setValue('order', 0);
    }
  }, [questions, questionForm]);

  // Effect to set the initial order for new pages
  useEffect(() => {
    if (pages?.length) {
      pageForm.setValue('order', pages.length);
    } else {
      pageForm.setValue('order', 0);
    }
  }, [pages, pageForm]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Questionnaire Builder</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="definitions">Questionnaire Definitions</TabsTrigger>
          <TabsTrigger value="pages" disabled={!selectedDefinition}>Pages</TabsTrigger>
          <TabsTrigger value="questions" disabled={!selectedPage}>Questions</TabsTrigger>
          <TabsTrigger value="conditionalLogic" disabled={!selectedDefinition}>Conditional Logic</TabsTrigger>
          <TabsTrigger value="preview" disabled={!selectedDefinition}>Preview</TabsTrigger>
        </TabsList>
        
        {/* Definitions Tab */}
        <TabsContent value="definitions">
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
                                <Textarea placeholder="Describe the purpose of this questionnaire" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={definitionForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Active Status
                                </FormLabel>
                                <FormDescription>
                                  Make this the active questionnaire that will be shown to users
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
              <CardDescription>
                Manage your questionnaire definitions here. Each definition can have multiple pages and questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDefinitions ? (
                <div className="text-center py-4">Loading definitions...</div>
              ) : !definitions?.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  No questionnaire definitions found. Create your first one!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {definitions.map((definition: any) => (
                      <TableRow key={definition.id} className={selectedDefinition === definition.id ? "bg-muted/50" : ""}>
                        <TableCell>{definition.versionName}</TableCell>
                        <TableCell>{definition.description}</TableCell>
                        <TableCell>
                          {definition.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedDefinition(definition.id)}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-500 border-red-500 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the questionnaire definition and all associated pages, questions, and conditional logic rules.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => deleteDefinitionMutation.mutate(definition.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pages Tab */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Pages</CardTitle>
                  <CardDescription>
                    {selectedDefinition ? (
                      <span>Managing pages for: <strong>{definitions?.find((d: any) => d.id === selectedDefinition)?.versionName}</strong></span>
                    ) : (
                      <span>Select a definition first</span>
                    )}
                  </CardDescription>
                </div>
                <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedDefinition}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Page
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Page</DialogTitle>
                      <DialogDescription>
                        Add a new page to your questionnaire.
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
                                <Input placeholder="e.g., Personal Information" {...field} />
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
                              <FormLabel>Display Order</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Order in which this page will appear in the questionnaire.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createPageMutation.isPending}>
                            {createPageMutation.isPending ? "Creating..." : "Create Page"}
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
                <div className="text-center py-4 text-muted-foreground">
                  Please select a questionnaire definition first.
                </div>
              ) : isLoadingPages ? (
                <div className="text-center py-4">Loading pages...</div>
              ) : !pages?.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  No pages found. Create your first page!
                </div>
              ) : (
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
                    {pages.map((page: any) => (
                      <TableRow key={page.id} className={selectedPage === page.id ? "bg-muted/50" : ""}>
                        <TableCell>{page.order}</TableCell>
                        <TableCell>{page.title}</TableCell>
                        <TableCell>
                          {/* We don't have question count here, would need to add a query */}
                          -
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedPage(page.id)}>
                              <List className="h-4 w-4 mr-1" /> Questions
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-500 border-red-500 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this page and all its questions.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => deletePageMutation.mutate(page.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    {selectedPage && pages ? (
                      <span>Managing questions for page: <strong>{pages.find((p: any) => p.id === selectedPage)?.title}</strong></span>
                    ) : (
                      <span>Select a page first</span>
                    )}
                  </CardDescription>
                </div>
                <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedPage}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Question
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Create Question</DialogTitle>
                      <DialogDescription>
                        Add a new question to your questionnaire page.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...questionForm}>
                      <form onSubmit={questionForm.handleSubmit(onSubmitQuestion)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={questionForm.control}
                            name="questionText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Question Text</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., What is your name?" {...field} />
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
                                  <Input placeholder="e.g., name" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Unique identifier used in submissions and logic
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
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
                                      <SelectValue placeholder="Select question type" />
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
                                    <SelectItem value="radio">Radio Buttons</SelectItem>
                                    <SelectItem value="checkbox">Checkboxes</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={questionForm.control}
                            name="order"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display Order</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Order in which this question will appear on the page.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={questionForm.control}
                            name="placeholderText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Placeholder Text</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Enter your full name" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Text shown in empty input fields
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={questionForm.control}
                            name="helpText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Help Text</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Please provide your legal name" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Explanatory text shown below the field
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={questionForm.control}
                          name="isRequired"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Required Question
                                </FormLabel>
                                <FormDescription>
                                  Make this question mandatory for users to answer
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
                        
                        {/* Options section for select, radio, checkbox */}
                        {showOptions && (
                          <div className="space-y-4 border rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-medium">Answer Options</h3>
                              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                                <Plus className="h-4 w-4 mr-1" /> Add Option
                              </Button>
                            </div>
                            
                            {questionOptions.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground">
                                No options added yet. Click "Add Option" to create options.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {questionOptions.map((option, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <Input
                                      placeholder="Option Text"
                                      value={option.optionText}
                                      onChange={(e) => updateOption(index, 'optionText', e.target.value)}
                                      className="flex-1"
                                    />
                                    <Input
                                      placeholder="Value"
                                      value={option.optionValue}
                                      onChange={(e) => updateOption(index, 'optionValue', e.target.value)}
                                      className="w-1/3"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeOption(index)}
                                      className="text-red-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <DialogFooter>
                          <Button type="submit" disabled={createQuestionMutation.isPending}>
                            {createQuestionMutation.isPending ? "Creating..." : "Create Question"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedPage ? (
                <div className="text-center py-4 text-muted-foreground">
                  Please select a page first.
                </div>
              ) : isLoadingQuestions ? (
                <div className="text-center py-4">Loading questions...</div>
              ) : !questions?.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  No questions found. Create your first question!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Question Text</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((question: any) => (
                      <TableRow key={question.id}>
                        <TableCell>{question.order}</TableCell>
                        <TableCell>{question.questionText}</TableCell>
                        <TableCell><code>{question.questionKey}</code></TableCell>
                        <TableCell><QuestionType value={question.questionType} /></TableCell>
                        <TableCell>{question.isRequired ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-500" />}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-500 border-red-500 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this question and its options.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => deleteQuestionMutation.mutate(question.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Conditional Logic Tab */}
        <TabsContent value="conditionalLogic">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Conditional Logic</CardTitle>
                  <CardDescription>
                    {selectedDefinition ? (
                      <span>Managing logic for: <strong>{definitions?.find((d: any) => d.id === selectedDefinition)?.versionName}</strong></span>
                    ) : (
                      <span>Select a definition first</span>
                    )}
                  </CardDescription>
                </div>
                <Dialog open={conditionalLogicDialogOpen} onOpenChange={setConditionalLogicDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedDefinition || !allDefinitionQuestions?.length}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Logic Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Conditional Logic Rule</DialogTitle>
                      <DialogDescription>
                        Set up conditions to show or hide questions based on user responses.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...conditionalLogicForm}>
                      <form onSubmit={conditionalLogicForm.handleSubmit(onSubmitConditionalLogic)} className="space-y-4">
                        <FormField
                          control={conditionalLogicForm.control}
                          name="triggerQuestionKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trigger Question</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select question" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {allDefinitionQuestions?.map((question: any) => (
                                    <SelectItem key={question.questionKey} value={question.questionKey}>
                                      {question.questionText} ({question.questionKey})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The question that will trigger this condition
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
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
                                      <SelectValue placeholder="Select condition" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="equals">Equals</SelectItem>
                                    <SelectItem value="not_equals">Does Not Equal</SelectItem>
                                    <SelectItem value="contains">Contains</SelectItem>
                                    <SelectItem value="starts_with">Starts With</SelectItem>
                                    <SelectItem value="ends_with">Ends With</SelectItem>
                                    <SelectItem value="greater_than">Greater Than</SelectItem>
                                    <SelectItem value="less_than">Less Than</SelectItem>
                                    <SelectItem value="is_answered">Is Answered</SelectItem>
                                    <SelectItem value="is_not_answered">Is Not Answered</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={conditionalLogicForm.control}
                            name="triggerValue"
                            render={({ field }) => {
                              const condition = conditionalLogicForm.watch("triggerCondition");
                              const needsValue = !['is_answered', 'is_not_answered'].includes(condition);
                              
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
                        </div>
                        
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
                                      <SelectValue placeholder="Select action" />
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
                                    {allDefinitionQuestions?.map((question: any) => (
                                      <SelectItem key={question.questionKey} value={question.questionKey}>
                                        {question.questionText} ({question.questionKey})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The question that will be affected by this rule
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <DialogFooter>
                          <Button type="submit" disabled={createConditionalLogicMutation.isPending}>
                            {createConditionalLogicMutation.isPending ? "Creating..." : "Create Rule"}
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
                <div className="text-center py-4 text-muted-foreground">
                  Please select a questionnaire definition first.
                </div>
              ) : isLoadingConditionalLogic ? (
                <div className="text-center py-4">Loading conditional logic rules...</div>
              ) : !conditionalLogic?.length ? (
                <div className="text-center py-4 text-muted-foreground">
                  No conditional logic rules found. Create your first rule!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trigger Question</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conditionalLogic.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.triggerQuestionKey}</TableCell>
                        <TableCell>{rule.triggerCondition}</TableCell>
                        <TableCell>{rule.triggerValue || '-'}</TableCell>
                        <TableCell>{rule.actionType}</TableCell>
                        <TableCell>{rule.targetQuestionKey}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-500 border-red-500 hover:bg-red-50">
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this conditional logic rule.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={() => deleteConditionalLogicMutation.mutate(rule.id)}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire Preview</CardTitle>
              <CardDescription>
                {selectedDefinition ? (
                  <span>Preview of: <strong>{definitions?.find((d: any) => d.id === selectedDefinition)?.versionName}</strong></span>
                ) : (
                  <span>Select a definition first</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  The preview functionality will be implemented soon. For now, you can test your questionnaire using the public API endpoints:
                </p>
                <div className="mt-4 text-left max-w-lg mx-auto">
                  <div className="bg-slate-100 p-4 rounded-md">
                    <h3 className="font-mono text-sm mb-2">GET /api/questionnaires/active</h3>
                    <p className="text-xs text-muted-foreground">Retrieves the active questionnaire with all pages and questions</p>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-md mt-2">
                    <h3 className="font-mono text-sm mb-2">POST /api/questionnaires/submit</h3>
                    <p className="text-xs text-muted-foreground">Submits a questionnaire response, creates a raw lead if applicable</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestionnaireBuilder;