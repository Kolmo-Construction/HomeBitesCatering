import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Eye, ChevronRight, ChevronDown, Save, CheckCircle2, XCircle, Copy } from 'lucide-react';

// Schema Validations
const definitionFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  versionName: z.string().min(1, { message: "Version name is required" }),
  eventType: z.enum(["corporate", "wedding", "engagement", "birthday", "private_party", "food_truck"]),
  isActive: z.boolean().default(true),
  isPublished: z.boolean().default(false)
});

const sectionFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  templateKey: z.string().min(1, { message: "Template key is required" })
});

const pageFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  order: z.number().int().positive()
});

const questionFormSchema = z.object({
  componentTypeId: z.number().int().positive(),
  text: z.string().min(1, { message: "Question text is required" }),
  helpText: z.string().optional(),
  placeholderText: z.string().optional(),
  isRequired: z.boolean().default(false),
  questionKey: z.string().min(1, { message: "Question key is required" }).regex(/^[a-z0-9_]+$/, { message: "Question key can only contain lowercase letters, numbers, and underscores" }),
  questionOrder: z.number().int().min(1)
});

const optionFormSchema = z.object({
  options: z.array(z.object({
    optionText: z.string().min(1, { message: "Option text is required" }),
    optionValue: z.string().min(1, { message: "Option value is required" }),
    order: z.number().int().positive()
  })).min(1, { message: "At least one option is required" })
});

const conditionalLogicFormSchema = z.object({
  triggerQuestionKey: z.string().min(1, { message: "Trigger question key is required" }),
  targetQuestionKey: z.string().min(1, { message: "Target question key is required" }),
  triggerCondition: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "in_list", "not_in_list", "is_empty", "is_not_empty"]),
  triggerValue: z.string().optional(),
  actionType: z.enum(["show_question", "hide_question", "require_question", "unrequire_question", "skip_to_page"])
});

export default function QuestionnaireBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State Management
  const [activeTab, setActiveTab] = useState("definitions");
  const [selectedDefinition, setSelectedDefinition] = useState<number | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  
  const [definitionDialogOpen, setDefinitionDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [conditionalLogicDialogOpen, setConditionalLogicDialogOpen] = useState(false);
  
  const [editingDefinitionId, setEditingDefinitionId] = useState<number | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [editingConditionalLogicId, setEditingConditionalLogicId] = useState<number | null>(null);
  
  // Forms
  const definitionForm = useForm<z.infer<typeof definitionFormSchema>>({
    resolver: zodResolver(definitionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      versionName: "v1.0",
      eventType: "corporate",
      isActive: true,
      isPublished: false
    }
  });
  
  const sectionForm = useForm<z.infer<typeof sectionFormSchema>>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      templateKey: ""
    }
  });
  
  const pageForm = useForm<z.infer<typeof pageFormSchema>>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      title: "",
      description: "",
      order: 1
    }
  });
  
  const questionForm = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      componentTypeId: 1,
      text: "",
      helpText: "",
      placeholderText: "",
      isRequired: false,
      questionKey: "",
      questionOrder: 1
    }
  });
  
  const optionsForm = useForm({
    resolver: zodResolver(optionFormSchema),
    defaultValues: {
      options: [{ optionText: "", optionValue: "", order: 1 }]
    }
  });
  
  const conditionalLogicForm = useForm<z.infer<typeof conditionalLogicFormSchema>>({
    resolver: zodResolver(conditionalLogicFormSchema),
    defaultValues: {
      triggerQuestionKey: "",
      targetQuestionKey: "",
      triggerCondition: "equals",
      triggerValue: "",
      actionType: "show_question"
    }
  });
  
  // Queries
  const { data: componentTypes, isLoading: isLoadingComponentTypes } = useQuery({
    queryKey: ['/api/questionnaires/component-types'],
    queryFn: async () => {
      const response = await fetch('/api/questionnaires/component-types');
      return await response.json();
    },
    enabled: activeTab === "questions" || questionDialogOpen
  });
  
  const { data: definitions, isLoading: isLoadingDefinitions } = useQuery({
    queryKey: ['/api/questionnaires/definitions'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'listDefinitions'
      });
      return await response.json();
    }
  });
  
  const { data: sections, isLoading: isLoadingSections } = useQuery({
    queryKey: ['/api/questionnaires/sections'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'listSections'
      });
      return await response.json();
    },
    enabled: activeTab === "sections" || pageDialogOpen
  });
  
  const { data: pages, isLoading: isLoadingPages } = useQuery({
    queryKey: ['/api/questionnaires/definitions', selectedDefinition, 'pages'],
    queryFn: async () => {
      if (!selectedDefinition) return { pages: [] };
      
      // For this demo, we'll retrieve the full questionnaire to get pages
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'getFullQuestionnaire',
        data: {
          definitionId: selectedDefinition
        }
      });
      const data = await response.json();
      return { pages: data.questionnaire?.pages || [] };
    },
    enabled: !!selectedDefinition && (activeTab === "pages" || activeTab === "preview")
  });
  
  const { data: allSectionQuestions, isLoading: isLoadingAllSectionQuestions } = useQuery({
    queryKey: ['/api/questionnaires/sections', selectedSection, 'questions'],
    queryFn: async () => {
      if (!selectedSection) return { questions: [] };
      
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'listQuestions',
        data: {
          sectionId: selectedSection
        }
      });
      return await response.json();
    },
    enabled: !!selectedSection && (activeTab === "questions" || questionDialogOpen)
  });
  
  const { data: allDefinitionQuestions, isLoading: isLoadingAllDefinitionQuestions } = useQuery({
    queryKey: ['/api/questionnaires/definitions', selectedDefinition, 'all-questions'],
    queryFn: async () => {
      if (!selectedDefinition) return [];
      
      // For this demo, we'll collect all questions from all pages and sections
      const fullQuestionnaireResponse = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'getFullQuestionnaire',
        data: { definitionId: selectedDefinition }
      });
      
      const fullQuestionnaire = await fullQuestionnaireResponse.json();
      
      if (!fullQuestionnaire.success) {
        return [];
      }
      
      const questionnaire = fullQuestionnaire.questionnaire;
      const allQuestions: any[] = [];
      
      questionnaire.pages.forEach((page: any) => {
        page.sections.forEach((section: any) => {
          section.questions.forEach((question: any) => {
            allQuestions.push({
              id: question.id,
              questionKey: question.questionKey,
              questionText: question.text,
              componentTypeId: question.componentTypeId
            });
          });
        });
      });
      
      return allQuestions;
    },
    enabled: !!selectedDefinition && (activeTab === "conditional-logic" || conditionalLogicDialogOpen)
  });
  
  const { data: conditionalLogic, isLoading: isLoadingConditionalLogic } = useQuery({
    queryKey: ['/api/questionnaires/definitions', selectedDefinition, 'conditional-logic'],
    queryFn: async () => {
      if (!selectedDefinition) return [];
      
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'listConditionalLogic',
        data: { 
          definitionId: selectedDefinition 
        }
      });
      
      const data = await response.json();
      return data.conditionalLogic || [];
    },
    enabled: !!selectedDefinition && activeTab === "conditional-logic"
  });
  
  // Mutations
  const createDefinitionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof definitionFormSchema>) => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'createDefinition',
        data
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires/definitions'] });
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
  
  const createSectionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sectionFormSchema>) => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'createSection',
        data
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires/sections'] });
      setSectionDialogOpen(false);
      sectionForm.reset();
      
      toast({
        title: "Success",
        description: "Section created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create section",
        variant: "destructive"
      });
    }
  });
  
  const createPageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pageFormSchema>) => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'addPage',
        data: {
          ...data,
          definitionId: selectedDefinition
        }
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires/definitions', selectedDefinition, 'pages'] });
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
  
  const addSectionToPageMutation = useMutation({
    mutationFn: async (data: { pageId: number, sectionId: number, sectionOrder: number }) => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionToPage',
        data
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires/definitions', selectedDefinition, 'pages'] });
      
      toast({
        title: "Success",
        description: "Section added to page successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add section to page",
        variant: "destructive"
      });
    }
  });
  
  const createQuestionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof questionFormSchema>) => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'addSectionQuestions',
        data: {
          sectionId: selectedSection,
          questions: [data]
        }
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires/sections', selectedSection, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires/definitions', selectedDefinition, 'all-questions'] });
      setQuestionDialogOpen(false);
      questionForm.reset();
      
      // If the question needs options, open the options dialog automatically
      const questionType = componentTypes?.componentTypes.find(
        (ct: any) => ct.id === questionForm.getValues().componentTypeId
      );
      
      if (questionType && ["radio", "checkbox", "select", "multi_select"].includes(questionType.typeKey)) {
        setEditingQuestion(data.questions[0]);
        setOptionsDialogOpen(true);
      } else {
        toast({
          title: "Success",
          description: "Question added successfully"
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add question",
        variant: "destructive"
      });
    }
  });
  
  const addQuestionOptionsMutation = useMutation({
    mutationFn: async (data: { questionId: number, options: any[] }) => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'addQuestionOptions',
        data
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires/sections', selectedSection, 'questions'] });
      setOptionsDialogOpen(false);
      optionsForm.reset({
        options: [{ optionText: "", optionValue: "", order: 1 }]
      });
      
      toast({
        title: "Success",
        description: "Question options added successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add question options",
        variant: "destructive"
      });
    }
  });
  
  const createConditionalLogicMutation = useMutation({
    mutationFn: async (data: z.infer<typeof conditionalLogicFormSchema>) => {
      const response = await apiRequest('POST', '/api/questionnaires/builder', {
        action: 'addConditionalLogic',
        data: {
          ...data,
          definitionId: selectedDefinition
        }
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/questionnaires/definitions', selectedDefinition, 'conditional-logic'] });
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
  
  // Form Submissions
  const onSubmitDefinition = (data: z.infer<typeof definitionFormSchema>) => {
    if (editingDefinitionId) {
      // Handle update (not implemented in this demo)
      toast({
        title: "Update not implemented",
        description: "This demo doesn't support updating definitions yet"
      });
    } else {
      createDefinitionMutation.mutate(data);
    }
  };
  
  const onSubmitSection = (data: z.infer<typeof sectionFormSchema>) => {
    if (editingSectionId) {
      // Handle update (not implemented in this demo)
      toast({
        title: "Update not implemented",
        description: "This demo doesn't support updating sections yet"
      });
    } else {
      createSectionMutation.mutate(data);
    }
  };
  
  const onSubmitPage = (data: z.infer<typeof pageFormSchema>) => {
    if (editingPageId) {
      // Handle update (not implemented in this demo)
      toast({
        title: "Update not implemented",
        description: "This demo doesn't support updating pages yet"
      });
    } else {
      createPageMutation.mutate(data);
    }
  };
  
  const onSubmitQuestion = (data: z.infer<typeof questionFormSchema>) => {
    if (editingQuestionId) {
      // Handle update (not implemented in this demo)
      toast({
        title: "Update not implemented",
        description: "This demo doesn't support updating questions yet"
      });
    } else {
      createQuestionMutation.mutate(data);
    }
  };
  
  const onSubmitOptions = (data: any) => {
    if (!editingQuestion) return;
    
    addQuestionOptionsMutation.mutate({
      questionId: editingQuestion.id,
      options: data.options
    });
  };
  
  const onSubmitConditionalLogic = (data: z.infer<typeof conditionalLogicFormSchema>) => {
    if (editingConditionalLogicId) {
      // Handle update (not implemented in this demo)
      toast({
        title: "Update not implemented",
        description: "This demo doesn't support updating conditional logic yet"
      });
    } else {
      createConditionalLogicMutation.mutate(data);
    }
  };
  
  // UI Helpers
  const addOptionField = () => {
    const currentOptions = optionsForm.getValues().options;
    const newOrder = currentOptions.length + 1;
    
    optionsForm.setValue('options', [
      ...currentOptions,
      { optionText: "", optionValue: "", order: newOrder }
    ]);
  };
  
  const removeOptionField = (index: number) => {
    const currentOptions = optionsForm.getValues().options;
    if (currentOptions.length <= 1) return;
    
    const newOptions = currentOptions.filter((_, i) => i !== index);
    
    // Update order of remaining options
    newOptions.forEach((option, idx) => {
      option.order = idx + 1;
    });
    
    optionsForm.setValue('options', newOptions);
  };
  
  const handleAddSectionToPage = (pageId: number, pageTitle: string) => {
    if (!sections?.sections?.length) {
      toast({
        title: "No sections available",
        description: "Please create a section first",
        variant: "destructive"
      });
      return;
    }
    
    // For simplicity, use a prompt to select section
    // In a real app, you'd use a proper UI component
    const sectionId = prompt(`Select a section ID to add to page "${pageTitle}":\n${
      sections.sections.map((s: any) => `ID ${s.id}: ${s.title}`).join('\n')
    }`);
    
    if (!sectionId) return;
    
    const parsedSectionId = parseInt(sectionId);
    
    if (isNaN(parsedSectionId)) {
      toast({
        title: "Invalid section ID",
        description: "Please enter a valid section ID",
        variant: "destructive"
      });
      return;
    }
    
    // Get current sections on this page to determine order
    const page = pages?.pages.find((p: any) => p.id === pageId);
    const currentSections = page?.sections || [];
    const newOrder = currentSections.length + 1;
    
    addSectionToPageMutation.mutate({
      pageId,
      sectionId: parsedSectionId,
      sectionOrder: newOrder
    });
  };
  
  const handlePreviewQuestionnaire = () => {
    if (!selectedDefinition) {
      toast({
        title: "No questionnaire selected",
        description: "Please select a questionnaire to preview",
        variant: "destructive"
      });
      return;
    }
    
    setActiveTab("preview");
  };
  
  // Reset forms when dialogs close
  useEffect(() => {
    if (!definitionDialogOpen) {
      setEditingDefinitionId(null);
      definitionForm.reset();
    }
  }, [definitionDialogOpen]);
  
  useEffect(() => {
    if (!sectionDialogOpen) {
      setEditingSectionId(null);
      sectionForm.reset();
    }
  }, [sectionDialogOpen]);
  
  useEffect(() => {
    if (!pageDialogOpen) {
      setEditingPageId(null);
      pageForm.reset();
    }
  }, [pageDialogOpen]);
  
  useEffect(() => {
    if (!questionDialogOpen) {
      setEditingQuestionId(null);
      questionForm.reset();
    }
  }, [questionDialogOpen]);
  
  useEffect(() => {
    if (!optionsDialogOpen) {
      setEditingQuestion(null);
      optionsForm.reset({
        options: [{ optionText: "", optionValue: "", order: 1 }]
      });
    }
  }, [optionsDialogOpen]);
  
  useEffect(() => {
    // When selecting a new questionnaire definition, reset related states
    setSelectedPage(null);
    setSelectedSection(null);
  }, [selectedDefinition]);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Questionnaire Builder</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="definitions">Definitions</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="pages" disabled={!selectedDefinition}>Pages</TabsTrigger>
          <TabsTrigger value="questions" disabled={!selectedSection}>Questions</TabsTrigger>
          <TabsTrigger value="conditional-logic" disabled={!selectedDefinition}>Logic Rules</TabsTrigger>
          <TabsTrigger value="preview" disabled={!selectedDefinition}>Preview</TabsTrigger>
        </TabsList>
        
        {/* Questionnaire Definitions Tab */}
        <TabsContent value="definitions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Questionnaire Definitions</CardTitle>
                <CardDescription>Manage your questionnaire definitions</CardDescription>
              </div>
              <Button onClick={() => setDefinitionDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Definition
              </Button>
              
              {/* Create Definition Dialog */}
              <Dialog open={definitionDialogOpen} onOpenChange={setDefinitionDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Questionnaire Definition</DialogTitle>
                    <DialogDescription>
                      Create a new questionnaire definition for a specific event type.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...definitionForm}>
                    <form onSubmit={definitionForm.handleSubmit(onSubmitDefinition)} className="space-y-4">
                      <FormField
                        control={definitionForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Corporate Event Questionnaire" {...field} />
                            </FormControl>
                            <FormDescription>
                              A descriptive name for this questionnaire
                            </FormDescription>
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
                                placeholder="This questionnaire collects details for corporate events"
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              A brief description of this questionnaire's purpose
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={definitionForm.control}
                        name="versionName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Version Name</FormLabel>
                            <FormControl>
                              <Input placeholder="v1.0" {...field} />
                            </FormControl>
                            <FormDescription>
                              Version identifier for this questionnaire
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={definitionForm.control}
                        name="eventType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an event type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="corporate">Corporate Event</SelectItem>
                                <SelectItem value="wedding">Wedding</SelectItem>
                                <SelectItem value="engagement">Engagement</SelectItem>
                                <SelectItem value="birthday">Birthday</SelectItem>
                                <SelectItem value="private_party">Private Party</SelectItem>
                                <SelectItem value="food_truck">Food Truck</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The type of event this questionnaire is for
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex space-x-4">
                        <FormField
                          control={definitionForm.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Switch 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange} 
                                />
                              </FormControl>
                              <FormLabel>Active</FormLabel>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={definitionForm.control}
                          name="isPublished"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Switch 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange} 
                                />
                              </FormControl>
                              <FormLabel>Published</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createDefinitionMutation.isPending}>
                          {createDefinitionMutation.isPending ? "Creating..." : "Create Definition"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingDefinitions ? (
                <div className="text-center py-4">Loading definitions...</div>
              ) : !definitions || !definitions.definitions?.length ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questionnaire Definitions</h3>
                  <p className="text-gray-600 mb-4">Create your first questionnaire definition to get started.</p>
                  <Button onClick={() => setDefinitionDialogOpen(true)}>
                    Create Definition
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {definitions.definitions.map((definition: any) => (
                      <TableRow 
                        key={definition.id} 
                        className={selectedDefinition === definition.id ? "bg-muted/50" : ""}
                      >
                        <TableCell className="font-medium">{definition.name}</TableCell>
                        <TableCell className="capitalize">{definition.eventType.replace('_', ' ')}</TableCell>
                        <TableCell>{definition.versionName}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {definition.isActive ? (
                              <span className="flex items-center text-green-600">
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Active
                              </span>
                            ) : (
                              <span className="flex items-center text-gray-500">
                                <XCircle className="h-4 w-4 mr-1" /> Inactive
                              </span>
                            )}
                            {definition.isPublished && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Published</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedDefinition(definition.id)}
                            >
                              {selectedDefinition === definition.id ? "Selected" : "Select"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewQuestionnaire()}
                              disabled={selectedDefinition !== definition.id}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
        
        {/* Reusable Sections Tab */}
        <TabsContent value="sections">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Reusable Sections</CardTitle>
                <CardDescription>Create and manage reusable section templates</CardDescription>
              </div>
              <Button onClick={() => setSectionDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Section
              </Button>
              
              {/* Create Section Dialog */}
              <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Section Template</DialogTitle>
                    <DialogDescription>
                      Create a reusable section that can be added to multiple questionnaires.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...sectionForm}>
                    <form onSubmit={sectionForm.handleSubmit(onSubmitSection)} className="space-y-4">
                      <FormField
                        control={sectionForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Contact Information" {...field} />
                            </FormControl>
                            <FormDescription>
                              A descriptive title for this section
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={sectionForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Basic contact details for the client"
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              A brief description of this section's purpose
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={sectionForm.control}
                        name="templateKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Key</FormLabel>
                            <FormControl>
                              <Input placeholder="contact_information" {...field} />
                            </FormControl>
                            <FormDescription>
                              A unique identifier for this template (use snake_case)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createSectionMutation.isPending}>
                          {createSectionMutation.isPending ? "Creating..." : "Create Section"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingSections ? (
                <div className="text-center py-4">Loading sections...</div>
              ) : !sections || !sections.sections?.length ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Sections</h3>
                  <p className="text-gray-600 mb-4">Create your first section template to get started.</p>
                  <Button onClick={() => setSectionDialogOpen(true)}>
                    Create Section
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Template Key</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.sections.map((section: any) => (
                      <TableRow 
                        key={section.id}
                        className={selectedSection === section.id ? "bg-muted/50" : ""}
                      >
                        <TableCell className="font-medium">{section.title}</TableCell>
                        <TableCell className="font-mono text-sm">{section.templateKey}</TableCell>
                        <TableCell className="max-w-md truncate">{section.description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSection(section.id)}
                            >
                              {selectedSection === section.id ? "Selected" : "Select"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSectionId(section.id);
                                sectionForm.reset({
                                  title: section.title,
                                  description: section.description || "",
                                  templateKey: section.templateKey
                                });
                                setSectionDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Questionnaire Pages</CardTitle>
                <CardDescription>
                  {selectedDefinition 
                    ? `Manage pages for: ${definitions?.definitions?.find((d: any) => d.id === selectedDefinition)?.name}`
                    : "Select a questionnaire definition first"}
                </CardDescription>
              </div>
              <Button onClick={() => setPageDialogOpen(true)} disabled={!selectedDefinition}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Page
              </Button>
              
              {/* Create Page Dialog */}
              <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Questionnaire Page</DialogTitle>
                    <DialogDescription>
                      Add a new page to the selected questionnaire.
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
                              <Input placeholder="Event Details" {...field} />
                            </FormControl>
                            <FormDescription>
                              A descriptive title for this page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pageForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Basic details about the event"
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              A brief description of this page's content
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pageForm.control}
                        name="order"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Page Order</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormDescription>
                              The order in which this page appears in the questionnaire
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createPageMutation.isPending}>
                          {createPageMutation.isPending ? "Creating..." : "Add Page"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!selectedDefinition ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questionnaire Selected</h3>
                  <p className="text-gray-600 mb-4">Select a questionnaire to manage its pages.</p>
                  <Button onClick={() => setActiveTab("definitions")}>
                    Go to Definitions
                  </Button>
                </div>
              ) : isLoadingPages ? (
                <div className="text-center py-4">Loading pages...</div>
              ) : !pages || !pages.pages || !pages.pages.length ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Pages Created</h3>
                  <p className="text-gray-600 mb-4">Add your first page to this questionnaire.</p>
                  <Button onClick={() => setPageDialogOpen(true)}>
                    Add Page
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {pages.pages.map((page: any) => (
                    <div 
                      key={page.id} 
                      className={`border rounded-lg p-4 ${selectedPage === page.id ? "border-primary" : ""}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-medium flex items-center">
                            <span className="bg-slate-200 text-slate-700 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-xs">
                              {page.order}
                            </span>
                            {page.title}
                          </h3>
                          <p className="text-gray-500 text-sm">{page.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPage(page.id)}
                          >
                            {selectedPage === page.id ? "Selected" : "Select"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddSectionToPage(page.id, page.title)}
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Add Section
                          </Button>
                        </div>
                      </div>
                      
                      {/* Sections in this page */}
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-gray-500 flex items-center">
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Sections in this page
                        </h4>
                        
                        {!page.sections || !page.sections.length ? (
                          <div className="py-2 px-4 border border-dashed rounded text-center text-gray-500 text-sm">
                            No sections added to this page yet
                          </div>
                        ) : (
                          <div className="space-y-2 pl-4">
                            {page.sections.map((pageSection: any) => (
                              <div 
                                key={pageSection.id} 
                                className="flex justify-between items-center p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <span className="font-medium text-sm">{pageSection.title}</span>
                                  <p className="text-xs text-gray-500">{pageSection.templateKey}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSection(pageSection.id);
                                    setActiveTab("questions");
                                  }}
                                >
                                  Manage Questions
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Section Questions</CardTitle>
                <CardDescription>
                  {selectedSection 
                    ? `Manage questions for section: ${sections?.sections?.find((s: any) => s.id === selectedSection)?.title}`
                    : "Select a section first"}
                </CardDescription>
              </div>
              <Button onClick={() => setQuestionDialogOpen(true)} disabled={!selectedSection}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Question
              </Button>
              
              {/* Create Question Dialog */}
              <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add Question</DialogTitle>
                    <DialogDescription>
                      Add a new question to the selected section.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...questionForm}>
                    <form onSubmit={questionForm.handleSubmit(onSubmitQuestion)} className="space-y-4">
                      <FormField
                        control={questionForm.control}
                        name="componentTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question Type</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a question type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingComponentTypes ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : (
                                  componentTypes?.componentTypes?.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.displayName}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The type of input for this question
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={questionForm.control}
                        name="text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Question Text</FormLabel>
                            <FormControl>
                              <Input placeholder="What is your full name?" {...field} />
                            </FormControl>
                            <FormDescription>
                              The text displayed to the user
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={questionForm.control}
                          name="helpText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Help Text</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Please provide your first and last name" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Additional guidance for the user
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
                              <FormLabel>Placeholder</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="John Doe" 
                                  {...field} 
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Example text shown in the field
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={questionForm.control}
                          name="questionKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Key</FormLabel>
                              <FormControl>
                                <Input placeholder="full_name" {...field} />
                              </FormControl>
                              <FormDescription>
                                Unique identifier for this question
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={questionForm.control}
                          name="questionOrder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Order</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormDescription>
                                Display order in the section
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
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Required Question</FormLabel>
                              <FormDescription>
                                User must answer this question to proceed
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createQuestionMutation.isPending}>
                          {createQuestionMutation.isPending ? "Creating..." : "Add Question"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              {/* Question Options Dialog */}
              <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Add Question Options</DialogTitle>
                    <DialogDescription>
                      Add options for the {editingQuestion?.text} question.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...optionsForm}>
                    <form onSubmit={optionsForm.handleSubmit(onSubmitOptions)} className="space-y-4">
                      {optionsForm.watch('options').map((_, index) => (
                        <div key={index} className="flex items-end space-x-2">
                          <FormField
                            control={optionsForm.control}
                            name={`options.${index}.optionText`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Option Text</FormLabel>
                                <FormControl>
                                  <Input placeholder="Yes" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={optionsForm.control}
                            name={`options.${index}.optionValue`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                  <Input placeholder="yes" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={optionsForm.control}
                            name={`options.${index}.order`}
                            render={({ field }) => (
                              <FormItem className="w-20">
                                <FormLabel>Order</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || index + 1)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeOptionField(index)}
                            className="mb-[2px]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOptionField}
                        className="mt-2"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                      
                      <DialogFooter>
                        <Button type="submit" disabled={addQuestionOptionsMutation.isPending}>
                          {addQuestionOptionsMutation.isPending ? "Saving..." : "Save Options"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!selectedSection ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Section Selected</h3>
                  <p className="text-gray-600 mb-4">Select a section to manage its questions.</p>
                  <Button onClick={() => setActiveTab("sections")}>
                    Go to Sections
                  </Button>
                </div>
              ) : isLoadingAllSectionQuestions ? (
                <div className="text-center py-4">Loading questions...</div>
              ) : !allSectionQuestions || !allSectionQuestions.questions || !allSectionQuestions.questions.length ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questions Added</h3>
                  <p className="text-gray-600 mb-4">Add your first question to this section.</p>
                  <Button onClick={() => setQuestionDialogOpen(true)}>
                    Add Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {allSectionQuestions.questions.map((question: any) => {
                    // Find component type name
                    const componentType = componentTypes?.componentTypes?.find((ct: any) => ct.id === question.componentTypeId);
                    
                    return (
                      <div 
                        key={question.id} 
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-medium flex items-center">
                              <span className="bg-slate-200 text-slate-700 rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 text-xs">
                                {question.order || "-"}
                              </span>
                              {question.text}
                              {question.isRequired && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </h3>
                            {question.helpText && (
                              <p className="text-gray-500 text-sm">{question.helpText}</p>
                            )}
                            <div className="mt-1 flex space-x-4 text-xs">
                              <span className="font-mono bg-slate-100 px-2 py-1 rounded">
                                {question.questionKey}
                              </span>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {componentType?.displayName || "Unknown Type"}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingQuestion(question);
                                setOptionsDialogOpen(true);
                              }}
                              disabled={!["radio", "checkbox", "select", "multi_select"].includes(componentType?.typeKey || "")}
                            >
                              Manage Options
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingQuestionId(question.id);
                                questionForm.reset({
                                  componentTypeId: question.componentTypeId,
                                  text: question.text,
                                  helpText: question.helpText || "",
                                  placeholderText: question.placeholderText || "",
                                  isRequired: question.isRequired,
                                  questionKey: question.questionKey,
                                  questionOrder: question.order
                                });
                                setQuestionDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Question options if applicable */}
                        {question.options && question.options.length > 0 && (
                          <div className="mt-4 pl-8">
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Options:</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {question.options.map((option: any) => (
                                <div key={option.id} className="flex items-center space-x-2 text-sm">
                                  <span className="bg-gray-200 text-gray-800 rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">
                                    {option.order}
                                  </span>
                                  <span>{option.optionText}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="font-mono text-xs">{option.optionValue}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Conditional Logic Tab */}
        <TabsContent value="conditional-logic">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Conditional Logic Rules</CardTitle>
                <CardDescription>
                  {selectedDefinition 
                    ? `Manage logic rules for: ${definitions?.definitions?.find((d: any) => d.id === selectedDefinition)?.name}`
                    : "Select a questionnaire definition first"}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setConditionalLogicDialogOpen(true)} 
                  disabled={!selectedDefinition || !allDefinitionQuestions || allDefinitionQuestions.length < 2}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Logic Rule
                </Button>
              </div>
              
              {/* Create Conditional Logic Dialog */}
              <Dialog open={conditionalLogicDialogOpen} onOpenChange={setConditionalLogicDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Create Conditional Logic Rule</DialogTitle>
                    <DialogDescription>
                      Define a rule to show, hide, or require questions based on conditions.
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a condition" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="equals">Equals</SelectItem>
                                  <SelectItem value="not_equals">Does Not Equal</SelectItem>
                                  <SelectItem value="contains">Contains</SelectItem>
                                  <SelectItem value="greater_than">Greater Than</SelectItem>
                                  <SelectItem value="less_than">Less Than</SelectItem>
                                  <SelectItem value="is_empty">Is Empty</SelectItem>
                                  <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                How to evaluate the question's answer
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={conditionalLogicForm.control}
                          name="triggerValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Value</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="yes" 
                                  {...field} 
                                  value={field.value || ""}
                                  disabled={['is_empty', 'is_not_empty'].includes(conditionalLogicForm.watch('triggerCondition'))}
                                />
                              </FormControl>
                              <FormDescription>
                                The value to compare against
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={conditionalLogicForm.control}
                          name="actionType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Action</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an action" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="show_question">Show Question</SelectItem>
                                  <SelectItem value="hide_question">Hide Question</SelectItem>
                                  <SelectItem value="require_question">Make Required</SelectItem>
                                  <SelectItem value="unrequire_question">Make Optional</SelectItem>
                                  <SelectItem value="skip_to_page">Skip to Page</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                What happens when the condition is met
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
                                disabled={conditionalLogicForm.watch('actionType') === 'skip_to_page'}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a target question" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {allDefinitionQuestions && Array.isArray(allDefinitionQuestions) && allDefinitionQuestions
                                    .filter((q: any) => q.questionKey !== conditionalLogicForm.watch('triggerQuestionKey'))
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
                      
                      <DialogFooter>
                        <Button type="submit" disabled={createConditionalLogicMutation.isPending}>
                          {createConditionalLogicMutation.isPending ? "Creating..." : "Create Logic Rule"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!selectedDefinition ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questionnaire Selected</h3>
                  <p className="text-gray-600 mb-4">Select a questionnaire to manage its logic rules.</p>
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
                        <TableCell className="font-medium">
                          {allDefinitionQuestions.find((q: any) => q.questionKey === rule.triggerQuestionKey)?.questionText || rule.triggerQuestionKey}
                        </TableCell>
                        <TableCell>
                          {rule.triggerCondition.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {rule.triggerValue || '—'}
                        </TableCell>
                        <TableCell>
                          {{
                            'show_question': 'Show',
                            'hide_question': 'Hide',
                            'require_question': 'Make Required',
                            'unrequire_question': 'Make Optional',
                            'skip_to_page': 'Skip to Page'
                          }[rule.actionType] || rule.actionType}
                        </TableCell>
                        <TableCell>
                          {allDefinitionQuestions.find((q: any) => q.questionKey === rule.targetQuestionKey)?.questionText || rule.targetQuestionKey}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Set up form with current values
                              setEditingConditionalLogicId(rule.id);
                              conditionalLogicForm.reset({
                                triggerQuestionKey: rule.triggerQuestionKey,
                                targetQuestionKey: rule.targetQuestionKey,
                                triggerCondition: rule.triggerCondition as any,
                                triggerValue: rule.triggerValue || '',
                                actionType: rule.actionType as any
                              });
                              setConditionalLogicDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Logic Rules Created</h3>
                  <p className="text-gray-600 mb-4">Add your first conditional logic rule to control how questions behave.</p>
                  <Button 
                    onClick={() => setConditionalLogicDialogOpen(true)}
                    disabled={allDefinitionQuestions.length < 2}
                  >
                    Create Logic Rule
                  </Button>
                  {allDefinitionQuestions.length < 2 && (
                    <p className="text-yellow-600 text-sm mt-4">You need at least 2 questions to create conditional logic</p>
                  )}
                </div>
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
                {selectedDefinition 
                  ? `Preview of: ${definitions?.definitions?.find((d: any) => d.id === selectedDefinition)?.name}`
                  : "Select a questionnaire to preview"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedDefinition ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Questionnaire Selected</h3>
                  <p className="text-gray-600 mb-4">Select a questionnaire to preview it.</p>
                  <Button onClick={() => setActiveTab("definitions")}>
                    Go to Definitions
                  </Button>
                </div>
              ) : isLoadingPages ? (
                <div className="text-center py-4">Loading questionnaire preview...</div>
              ) : !pages || !pages.pages || !pages.pages.length ? (
                <div className="text-center py-10 border rounded-md">
                  <h3 className="text-lg font-semibold mb-2">No Pages Created</h3>
                  <p className="text-gray-600 mb-4">Add pages to your questionnaire to see a preview.</p>
                  <Button onClick={() => setActiveTab("pages")}>
                    Go to Pages
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-2xl font-bold">
                      {definitions?.definitions?.find((d: any) => d.id === selectedDefinition)?.name}
                    </h2>
                    <div className="flex space-x-2">
                      <Button variant="outline">
                        <Save className="h-4 w-4 mr-2" />
                        Save as Template
                      </Button>
                      <Button>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Publish
                      </Button>
                    </div>
                  </div>
                  
                  {/* Pages Tabs */}
                  <Tabs defaultValue={pages.pages[0]?.id.toString()}>
                    <TabsList className="mb-4">
                      {pages.pages.map((page: any, index: number) => (
                        <TabsTrigger key={page.id} value={page.id.toString()}>
                          {index + 1}. {page.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {pages.pages.map((page: any) => (
                      <TabsContent key={page.id} value={page.id.toString()}>
                        <div className="border rounded-lg p-6">
                          <h3 className="text-xl font-semibold mb-1">{page.title}</h3>
                          {page.description && (
                            <p className="text-gray-600 mb-6">{page.description}</p>
                          )}
                          
                          {!page.sections || !page.sections.length ? (
                            <div className="py-4 text-center text-gray-500">
                              No sections added to this page
                            </div>
                          ) : (
                            <div className="space-y-8">
                              {page.sections.map((section: any) => (
                                <div key={section.id} className="border-t pt-6">
                                  <h4 className="text-lg font-medium mb-4">{section.title}</h4>
                                  
                                  {!section.questions || !section.questions.length ? (
                                    <div className="py-2 text-center text-gray-500">
                                      No questions added to this section
                                    </div>
                                  ) : (
                                    <div className="space-y-6">
                                      {section.questions.map((question: any) => {
                                        // Determine which input type to render based on componentTypeId
                                        let inputComponent = null;
                                        const componentType = componentTypes?.componentTypes?.find(
                                          (ct: any) => ct.id === question.componentTypeId
                                        )?.typeKey;
                                        
                                        switch (componentType) {
                                          case 'text':
                                            inputComponent = (
                                              <Input 
                                                placeholder={question.placeholderText || ''} 
                                                disabled
                                              />
                                            );
                                            break;
                                          case 'textarea':
                                            inputComponent = (
                                              <Textarea 
                                                placeholder={question.placeholderText || ''} 
                                                disabled
                                              />
                                            );
                                            break;
                                          case 'radio':
                                            inputComponent = (
                                              <div className="space-y-2">
                                                {question.options?.map((option: any) => (
                                                  <div key={option.id} className="flex items-center">
                                                    <input 
                                                      type="radio" 
                                                      name={`preview_${question.id}`}
                                                      id={`preview_${question.id}_${option.id}`}
                                                      className="mr-2"
                                                      disabled
                                                    />
                                                    <label htmlFor={`preview_${question.id}_${option.id}`}>
                                                      {option.optionText}
                                                    </label>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                            break;
                                          case 'checkbox':
                                          case 'checkbox_group':
                                            inputComponent = (
                                              <div className="space-y-2">
                                                {question.options?.map((option: any) => (
                                                  <div key={option.id} className="flex items-center">
                                                    <Checkbox 
                                                      id={`preview_${question.id}_${option.id}`}
                                                      className="mr-2"
                                                      disabled
                                                    />
                                                    <label 
                                                      htmlFor={`preview_${question.id}_${option.id}`}
                                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                      {option.optionText}
                                                    </label>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                            break;
                                          case 'select':
                                            inputComponent = (
                                              <Select disabled>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select an option" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {question.options?.map((option: any) => (
                                                    <SelectItem key={option.id} value={option.optionValue}>
                                                      {option.optionText}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            );
                                            break;
                                          default:
                                            inputComponent = (
                                              <div className="p-2 border border-dashed rounded text-center text-gray-500">
                                                {componentType || 'Unknown'} input
                                              </div>
                                            );
                                        }
                                        
                                        return (
                                          <div key={question.id} className="space-y-2">
                                            <div className="flex items-start">
                                              <Label className="flex-1">
                                                {question.text}
                                                {question.isRequired && (
                                                  <span className="text-red-500 ml-1">*</span>
                                                )}
                                              </Label>
                                              
                                              {/* Conditional status indicator */}
                                              {question.conditionalLogic && question.conditionalLogic.length > 0 && (
                                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                  Conditional
                                                </span>
                                              )}
                                            </div>
                                            
                                            {question.helpText && (
                                              <p className="text-gray-500 text-sm">{question.helpText}</p>
                                            )}
                                            
                                            <div>{inputComponent}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="mt-8 pt-4 border-t flex justify-between">
                            <Button variant="outline" disabled={pages.pages.indexOf(page) === 0}>
                              &larr; Previous
                            </Button>
                            <Button disabled={pages.pages.indexOf(page) === pages.pages.length - 1}>
                              Next &rarr;
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}