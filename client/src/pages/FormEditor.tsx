import { useState, useEffect, useMemo } from "react";
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
  FormDescription,
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
  Save,
  Search,
  X,
  Loader2
} from "lucide-react";
import FormPreview from "@/components/form-builder/FormPreview";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { questionTypeLabels, getQuestionTypeLabel } from "@shared/form-utils";

// Schema for form page definition
const formPageSchema = z.object({
  pageTitle: z.string().min(1, "Page title is required"),
  description: z.string().optional(),
  pageOrder: z.number().optional(),
});

// Page Component for the sortable page list
const SortablePage = ({ page, isSelected, onSelect, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: page.id || 'temp-id' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // For debugging - log the page object
  console.log("SortablePage rendered with page:", page);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 p-3 mb-2 rounded-md ${
        isSelected ? "bg-primary-50 border border-primary-200" : "bg-white border border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="truncate cursor-pointer" onClick={() => onSelect(page)}>
        <p className="font-medium text-sm">{page.pageTitle || page.title || `Page ${page.pageOrder + 1}`}</p>
        {page.description && (
          <p className="text-xs text-gray-500 truncate">{page.description}</p>
        )}
      </div>
      
      <div className="flex items-center justify-end gap-2">
        {onEdit && (
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 px-2 flex items-center gap-1 bg-white" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(page);
            }}
          >
            <Settings className="h-4 w-4" />
            <span>Edit</span>
          </Button>
        )}
        {onDelete && (
          <Button 
            variant="destructive" 
            size="icon"
            className="h-7 w-7 bg-red-500 hover:bg-red-600 text-white" 
            onClick={(e) => {
              e.stopPropagation();
              console.log("Delete button clicked for page ID:", page.id);
              if (page.id) {
                onDelete(page.id);
              } else {
                console.error("Cannot delete page: No page ID found");
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Could not delete page: No page ID found",
                });
              }
            }}
            title="Delete page"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Using shared question type labels imported from form-utils

// Question Component for the sortable question list
const SortableQuestion = ({ question, isSelected, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id || 'temp-question-id' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Using the shared getQuestionTypeLabel utility function

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
      pageTitle: initialData.pageTitle || initialData.title || "",
      description: initialData.description || "",
    } : {
      pageTitle: "",
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
              name="pageTitle"
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

// Enhanced Question Settings Panel for supporting all overrides
const QuestionSettingsPanel = ({ question, onSave, onDelete }) => {
  // Get the library question data to show base properties
  const { data: libraryQuestion, isLoading: isLibraryQuestionLoading } = useQuery({
    queryKey: ['/api/form-builder/library-questions', question?.libraryQuestionId],
    queryFn: async () => {
      if (!question?.libraryQuestionId) return null;
      const response = await fetch(`/api/form-builder/library-questions/${question.libraryQuestionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch library question details');
      }
      return await response.json();
    },
    enabled: !!question?.libraryQuestionId,
  });

  // Initialize tabs for organizing the settings
  const [activeTab, setActiveTab] = useState("basic");
  
  // Get form and page data directly from props/state for conditional logic
  const formIdFromParams = useParams().formId;
  
  // Get all questions from all pages for conditional logic
  const { data: allFormQuestionsData } = useQuery({
    queryKey: ['/api/form-builder/forms', formIdFromParams, 'all-questions'],
    queryFn: async () => {
      if (!formIdFromParams) return [];
      
      // Flatten the array of all page questions
      const allQuestions = [];
      
      // Fetch the form first to get pages
      const formResponse = await fetch(`/api/form-builder/forms/${formIdFromParams}`);
      if (!formResponse.ok) return [];
      
      const formData = await formResponse.json();
      
      // Fetch pages for this form
      const pagesResponse = await fetch(`/api/form-builder/forms/${formIdFromParams}/pages`);
      if (!pagesResponse.ok) return [];
      
      const pagesData = await pagesResponse.json();
      
      // Collect questions from each page
      for (const page of pagesData || []) {
        const response = await fetch(`/api/form-builder/pages/${page.id}/questions`);
        if (!response.ok) continue;
        
        const pageQuestions = await response.json();
        if (Array.isArray(pageQuestions)) {
          allQuestions.push(...pageQuestions.map(q => ({
            ...q,
            pageTitle: page.pageTitle || page.title
          })));
        }
      }
      
      return allQuestions;
    },
    enabled: !!formIdFromParams
  });
  
  // Get existing rules for this question
  const { data: questionRules, isLoading: isRulesLoading } = useQuery({
    queryKey: ['/api/form-builder/questions', question?.id, 'rules'],
    queryFn: async () => {
      if (!question?.id) return [];
      const response = await fetch(`/api/form-builder/questions/${question.id}/rules`);
      if (!response.ok) {
        return [];
      }
      return await response.json();
    },
    enabled: !!question?.id
  });
  
  // State for managing rules
  const [rules, setRules] = useState([]);
  
  // Initialize rules when data is loaded
  useEffect(() => {
    if (questionRules) {
      setRules(questionRules);
    }
  }, [questionRules]);
  
  // Initialize form for question settings with all override fields
  const questionSettingsSchema = z.object({
    // Basic overrides
    displayTextOverride: z.string().min(1, "Question text is required"),
    isRequiredOverride: z.boolean().optional(),
    isHiddenOverride: z.boolean().optional(),
    helperTextOverride: z.string().optional(),
    placeholderOverride: z.string().optional(),
    // Advanced overrides - will be handled based on question type
    metadataOverrides: z.any().optional(),
    optionsOverrides: z.any().optional(),
  });

  // Extract question type for conditional fields
  const questionType = question?.questionType || question?.question_type || 
                      libraryQuestion?.questionType || libraryQuestion?.question_type;
  
  // Extract existing overrides or use defaults
  const defaultOptionsOverrides = question?.optionsOverrides || question?.options_overrides || [];
  const defaultMetadataOverrides = question?.metadataOverrides || question?.metadata_overrides || {};

  // Initialize the form with existing overrides or library question defaults
  const form = useForm({
    resolver: zodResolver(questionSettingsSchema),
    defaultValues: {
      displayTextOverride: question?.displayTextOverride || question?.display_text_override || 
                          libraryQuestion?.defaultText || libraryQuestion?.default_text || "",
      isRequiredOverride: question?.isRequiredOverride || question?.is_required_override || false,
      isHiddenOverride: question?.isHiddenOverride || question?.is_hidden_override || false,
      helperTextOverride: question?.helperTextOverride || question?.helper_text_override || 
                         libraryQuestion?.helperText || libraryQuestion?.helper_text || "",
      placeholderOverride: question?.placeholderOverride || question?.placeholder_override || 
                          libraryQuestion?.placeholder || "",
      metadataOverrides: defaultMetadataOverrides,
      optionsOverrides: defaultOptionsOverrides,
    }
  });

  // Initialize state for choice-based question options
  const [options, setOptions] = useState([]);
  
  // Load options for choice-based questions when library question data is available
  useEffect(() => {
    if (libraryQuestion && ['checkbox_group', 'radio_group', 'dropdown'].includes(questionType)) {
      const libraryOptions = libraryQuestion.defaultOptions || libraryQuestion.default_options || [];
      const existingOverrides = question?.optionsOverrides || question?.options_overrides || [];
      
      // If the question has overrides set, use them; otherwise use library options
      const hasOverrides = existingOverrides && existingOverrides.length > 0;
      
      if (hasOverrides) {
        // When we have overrides, we need to ensure all library options are represented
        // First, include all existing overrides
        let mergedOptions = [...existingOverrides];
        
        // Then add any library options that don't have an override
        libraryOptions.forEach(libOption => {
          if (!mergedOptions.some(override => override.value === libOption.value)) {
            mergedOptions.push(libOption);
          }
        });
        
        setOptions(mergedOptions);
        form.setValue('optionsOverrides', mergedOptions);
      } else {
        // No overrides, use library options directly
        setOptions(libraryOptions);
        form.setValue('optionsOverrides', []); // Empty array means no overrides
      }
    }
  }, [libraryQuestion, questionType, form]);

  // Handle form submission with all overrides
  const handleSubmit = async (data) => {
    try {
      // Handle options overrides for choice-based questions
      if (['checkbox_group', 'radio_group', 'dropdown'].includes(questionType)) {
        // Only include options as overrides if they have been explicitly overridden
        // An empty array means "no overrides", whereas undefined means "not applicable"
        if (form.getValues("optionsOverrides")?.length > 0) {
          data.optionsOverrides = options; // Use current options state
        } else {
          data.optionsOverrides = []; // Empty array to clear any existing overrides
        }
      }
      
      // Save the main question data first
      await onSave(data);
      
      // Now save the conditional logic rules separately
      if (rules.length > 0 && question?.id) {
        try {
          // First delete existing rules
          await fetch(`/api/form-builder/questions/${question.id}/rules`, {
            method: 'DELETE',
          });
          
          // Then save the new rules
          for (const rule of rules) {
            if (rule.sourceQuestionId && rule.conditionType && rule.actionType) {
              // Create the rule with our updated API schema format
              const ruleResponse = await fetch(`/api/form-builder/questions/${question.id}/rules`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  sourceQuestionId: rule.sourceQuestionId,
                  conditionType: rule.conditionType,
                  conditionValue: rule.conditionType === 'is_answered' || rule.conditionType === 'is_not_answered' 
                    ? null 
                    : (rule.conditionValue || ""),
                  actionType: rule.actionType
                }),
              });
              
              console.log("Rule created:", await ruleResponse.json());
            }
          }
        } catch (ruleError) {
          console.error("Error saving rules:", ruleError);
          // Continue execution - we don't want to fail the whole save if rules fail
        }
      }
      
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

  // Show loading state when fetching library question
  if (isLibraryQuestionLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Loading question details...</p>
        </div>
      </div>
    );
  }

  // Show placeholder when no question is selected
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
      'hidden_calculation': 'Hidden Calculation',
    };
    
    return typeMap[type] || type;
  };

  // Handle adding a new option for choice-based questions
  const handleAddOption = () => {
    // Only allow adding if we have active overrides
    if (!form.getValues("optionsOverrides")?.length) {
      return;
    }
    
    const newOption = {
      label: '',
      value: `option_${options.length + 1}`,
      isSelected: false
    };
    
    const newOptions = [...options, newOption];
    setOptions(newOptions);
    
    // Update form value
    form.setValue("optionsOverrides", newOptions);
  };

  // Handle removing an option
  const handleRemoveOption = (index) => {
    // Only allow removing if we have active overrides
    if (!form.getValues("optionsOverrides")?.length) {
      return;
    }
    
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
    
    // Update form value
    form.setValue("optionsOverrides", newOptions);
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Question Settings</h3>
          <p className="text-sm text-muted-foreground">
            {getQuestionTypeLabel(questionType)}
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
      
      {/* Original library question info for reference */}
      {libraryQuestion && (
        <div className="mb-4 p-3 bg-gray-50 border rounded-md">
          <p className="text-sm font-medium">Library Question Reference</p>
          <p className="text-xs text-muted-foreground mb-1">ID: {libraryQuestion.id}</p>
          <p className="text-xs text-muted-foreground mb-1">Key: {libraryQuestion.libraryQuestionKey || libraryQuestion.library_question_key}</p>
          <p className="text-xs text-muted-foreground">Default Text: {libraryQuestion.defaultText || libraryQuestion.default_text}</p>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger 
            value="options" 
            disabled={!['checkbox_group', 'radio_group', 'dropdown'].includes(questionType)}
          >
            Options
          </TabsTrigger>
          <TabsTrigger 
            value="rules"
            disabled={questionType === 'header' || questionType === 'text_display'}
          >
            Rules
          </TabsTrigger>
          <TabsTrigger 
            value="advanced"
            disabled={questionType === 'header' || questionType === 'text_display'}
          >
            Advanced
          </TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Basic Tab Content */}
            <TabsContent value="basic" className="space-y-4">
              <FormField
                control={form.control}
                name="displayTextOverride"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Question Text Override</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormLabel htmlFor="override-display-text" className="text-xs text-muted-foreground">
                          Override
                        </FormLabel>
                        <Switch 
                          id="override-display-text" 
                          checked={field.value !== libraryQuestion?.defaultText && field.value !== libraryQuestion?.default_text}
                          onCheckedChange={(checked) => {
                            if (!checked) {
                              // Reset to library value
                              form.setValue("displayTextOverride", libraryQuestion?.defaultText || libraryQuestion?.default_text || "");
                            }
                          }}
                        />
                      </div>
                    </div>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-1">Original:</span> 
                      <span className="text-xs font-medium">{libraryQuestion?.defaultText || libraryQuestion?.default_text}</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isRequiredOverride"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Required</FormLabel>
                        <FormDescription className="text-xs">
                          Original: {libraryQuestion?.isRequired || libraryQuestion?.is_required ? "Yes" : "No"}
                        </FormDescription>
                      </div>
                      <div className="flex flex-col items-end">
                        <FormControl>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={field.value === true}
                              onChange={() => form.setValue("isRequiredOverride", !field.value)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isHiddenOverride"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Hidden</FormLabel>
                        <FormDescription className="text-xs">
                          Original: {libraryQuestion?.isHidden || libraryQuestion?.is_hidden ? "Yes" : "No"}
                        </FormDescription>
                      </div>
                      <div className="flex flex-col items-end">
                        <FormControl>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={field.value === true}
                              onChange={() => form.setValue("isHiddenOverride", !field.value)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="helperTextOverride"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Helper Text Override</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormLabel className="text-xs text-muted-foreground">
                          Override
                        </FormLabel>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={field.value !== (libraryQuestion?.helperText || libraryQuestion?.helper_text)}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                // Reset to library value
                                form.setValue("helperTextOverride", libraryQuestion?.helperText || libraryQuestion?.helper_text || "");
                              }
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                    <FormControl>
                      <Input 
                        {...field} 
                        disabled={!field.value && !field.value !== (libraryQuestion?.helperText || libraryQuestion?.helper_text)}
                      />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-1">Original:</span> 
                      <span className="text-xs font-medium">{libraryQuestion?.helperText || libraryQuestion?.helper_text || "None"}</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="placeholderOverride"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Placeholder Override</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormLabel className="text-xs text-muted-foreground">
                          Override
                        </FormLabel>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={field.value !== libraryQuestion?.placeholder}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                // Reset to library value
                                form.setValue("placeholderOverride", libraryQuestion?.placeholder || "");
                              }
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                    <FormControl>
                      <Input 
                        {...field}
                        disabled={!field.value && field.value === libraryQuestion?.placeholder}
                      />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-1">Original:</span> 
                      <span className="text-xs font-medium">{libraryQuestion?.placeholder || "None"}</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            
            {/* Options Tab for choice-based questions */}
            <TabsContent value="options" className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Question Options</h3>
                  <div className="flex items-center space-x-2">
                    <FormLabel className="text-xs text-muted-foreground">
                      Override Options
                    </FormLabel>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        disabled={libraryQuestion?.questionType === "matrix"}
                        checked={form.getValues("optionsOverrides")?.length > 0}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            // Reset to library options
                            const libraryOptions = libraryQuestion?.defaultOptions || 
                                                 libraryQuestion?.default_options || [];
                            setOptions([...libraryOptions]); // Create a new array to trigger state update
                            form.setValue("optionsOverrides", []);
                          } else {
                            // When enabling overrides, use current options as a starting point
                            // This preserves the order and any existing customizations
                            const libraryOptions = libraryQuestion?.defaultOptions || 
                                                 libraryQuestion?.default_options || [];
                            form.setValue("optionsOverrides", [...libraryOptions]);
                          }
                        }}
                      />
                      <div className={`w-11 h-6 ${libraryQuestion?.questionType === "matrix" ? 'bg-gray-300' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${libraryQuestion?.questionType === "matrix" ? 'opacity-50' : ''}`}></div>
                    </label>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddOption}
                  disabled={!form.getValues("optionsOverrides")?.length > 0 || libraryQuestion?.questionType === "matrix"}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
              
              {/* Original library options for reference */}
              {libraryQuestion && (libraryQuestion?.defaultOptions || libraryQuestion?.default_options)?.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 border rounded-md">
                  <p className="text-sm font-medium mb-2">Original Library Options</p>
                  <div className="space-y-1">
                    {(libraryQuestion?.defaultOptions || libraryQuestion?.default_options || []).map((option, i) => (
                      <div key={i} className="flex text-xs">
                        <span className="font-medium mr-2">{i + 1}.</span>
                        <span className="font-medium">{option.label}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span className="text-muted-foreground">{option.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex items-end gap-2 p-3 border rounded-md">
                    <div className="flex-1">
                      <FormLabel htmlFor={`option-label-${index}`} className="text-xs">Label</FormLabel>
                      <Input
                        id={`option-label-${index}`}
                        value={option.label}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[index].label = e.target.value;
                          setOptions(newOptions);
                          
                          // Update form value if options overrides are active
                          if (form.getValues("optionsOverrides")?.length > 0) {
                            form.setValue("optionsOverrides", newOptions);
                          }
                        }}
                        className="mb-1"
                        placeholder="Option Text"
                        disabled={!form.getValues("optionsOverrides")?.length > 0}
                      />
                    </div>
                    <div className="flex-1">
                      <FormLabel htmlFor={`option-value-${index}`} className="text-xs">Value</FormLabel>
                      <Input
                        id={`option-value-${index}`}
                        value={option.value}
                        onChange={(e) => {
                          const newOptions = [...options];
                          newOptions[index].value = e.target.value;
                          setOptions(newOptions);
                          
                          // Update form value if options overrides are active
                          if (form.getValues("optionsOverrides")?.length > 0) {
                            form.setValue("optionsOverrides", newOptions);
                          }
                        }}
                        className="mb-1"
                        placeholder="option_value"
                        disabled={!form.getValues("optionsOverrides")?.length}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveOption(index)}
                      className="text-red-500"
                      disabled={!form.getValues("optionsOverrides")?.length}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {options.length === 0 && (
                  <div className="text-center p-4 border border-dashed rounded-md">
                    <p className="text-sm text-muted-foreground">No options defined yet</p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddOption}
                      className="mt-2"
                      disabled={!form.getValues("optionsOverrides")?.length}
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add First Option
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Rules Tab for conditional logic */}
            <TabsContent value="rules" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Conditional Display Rules</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Set up conditions for when this question should appear or be hidden based on answers to other questions.
                </p>
                
                {rules.length === 0 ? (
                  <div className="text-center p-4 border border-dashed rounded-md">
                    <p className="text-sm text-muted-foreground">No rules defined yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add a rule to show or hide this question based on responses to other questions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule, idx) => (
                      <Card key={idx} className="p-3 relative">
                        <Button
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="absolute right-2 top-2 h-6 w-6"
                          onClick={() => {
                            const updatedRules = [...rules];
                            updatedRules.splice(idx, 1);
                            setRules(updatedRules);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        
                        <div className="grid gap-3 grid-cols-1">
                          <div>
                            <label className="text-xs font-medium">Source Question</label>
                            <Select
                              value={rule.sourceQuestionId?.toString() || ""}
                              onValueChange={(value) => {
                                const updatedRules = [...rules];
                                updatedRules[idx].sourceQuestionId = parseInt(value);
                                // Clear condition value since question changed
                                updatedRules[idx].conditionValue = "";
                                setRules(updatedRules);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select question" />
                              </SelectTrigger>
                              <SelectContent>
                                {(allFormQuestionsData || [])
                                  .filter(q => q.id !== question?.id) // Don't show current question
                                  .map(q => (
                                    <SelectItem key={q.id} value={q.id.toString()}>
                                      {q.displayTextOverride || q.libraryDefaultText || 'Question ' + q.id}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium">Condition</label>
                            <Select
                              value={rule.conditionType || ""}
                              onValueChange={(value) => {
                                const updatedRules = [...rules];
                                updatedRules[idx].conditionType = value;
                                setRules(updatedRules);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Does not equal</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="not_contains">Does not contain</SelectItem>
                                <SelectItem value="is_answered">Is answered</SelectItem>
                                <SelectItem value="is_not_answered">Is not answered</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {rule.conditionType && 
                           rule.conditionType !== 'is_answered' && 
                           rule.conditionType !== 'is_not_answered' && (
                            <div>
                              <label className="text-xs font-medium">Value</label>
                              <Input
                                value={rule.conditionValue || ""}
                                placeholder="Enter value"
                                onChange={(e) => {
                                  const updatedRules = [...rules];
                                  updatedRules[idx].conditionValue = e.target.value;
                                  setRules(updatedRules);
                                }}
                              />
                            </div>
                          )}
                          
                          <div>
                            <label className="text-xs font-medium">Action</label>
                            <Select
                              value={rule.actionType || ""}
                              onValueChange={(value) => {
                                const updatedRules = [...rules];
                                updatedRules[idx].actionType = value;
                                setRules(updatedRules);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select action" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="show">Show this question</SelectItem>
                                <SelectItem value="hide">Hide this question</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setRules([
                      ...rules, 
                      {
                        sourceQuestionId: null,
                        conditionType: "",
                        conditionValue: "",
                        actionType: "show"
                      }
                    ]);
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </TabsContent>
            
            {/* Advanced Tab for metadata overrides */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Advanced Settings</h3>
                <p className="text-sm text-muted-foreground">
                  These settings allow you to customize the behavior and appearance of this question instance.
                </p>
                
                {/* Render different UI based on question type */}
                {questionType === 'matrix' && (
                  <div className="border rounded-md p-3">
                    <p className="text-sm font-medium mb-2">Matrix Configuration</p>
                    <p className="text-xs text-muted-foreground">
                      Matrix configuration overrides will be available in a future update.
                    </p>
                  </div>
                )}
                
                {questionType === 'hidden_calculation' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Calculation Formula</p>
                    <div>
                      <FormLabel className="text-xs">Formula</FormLabel>
                      <Textarea
                        placeholder="Enter calculation formula, e.g. {question1} + {question2} * 5"
                        className="font-mono"
                        value={form.watch('metadataOverrides')?.formula || ''}
                        onChange={(e) => {
                          const currentOverrides = form.getValues('metadataOverrides') || {};
                          form.setValue('metadataOverrides', {
                            ...currentOverrides,
                            formula: e.target.value
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use {'{question_key}'} to reference other question values
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormLabel className="text-xs">Data Type</FormLabel>
                        <Select
                          value={form.watch('metadataOverrides')?.dataType || 'number'}
                          onValueChange={(value) => {
                            const currentOverrides = form.getValues('metadataOverrides') || {};
                            form.setValue('metadataOverrides', {
                              ...currentOverrides,
                              dataType: value
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="currency">Currency</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <FormLabel className="text-xs">Decimal Places</FormLabel>
                        <Input 
                          type="number" 
                          min="0"
                          max="10"
                          placeholder="2"
                          value={form.watch('metadataOverrides')?.precision || '2'}
                          onChange={(e) => {
                            const currentOverrides = form.getValues('metadataOverrides') || {};
                            form.setValue('metadataOverrides', {
                              ...currentOverrides,
                              precision: parseInt(e.target.value) || 0
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormLabel className="text-xs">Prefix (optional)</FormLabel>
                        <Input 
                          placeholder="e.g. $"
                          value={form.watch('metadataOverrides')?.formatOptions?.prefix || ''}
                          onChange={(e) => {
                            const currentOverrides = form.getValues('metadataOverrides') || {};
                            form.setValue('metadataOverrides', {
                              ...currentOverrides,
                              formatOptions: {
                                ...currentOverrides?.formatOptions,
                                prefix: e.target.value
                              }
                            });
                          }}
                        />
                      </div>
                      
                      <div>
                        <FormLabel className="text-xs">Suffix (optional)</FormLabel>
                        <Input 
                          placeholder="e.g. %"
                          value={form.watch('metadataOverrides')?.formatOptions?.suffix || ''}
                          onChange={(e) => {
                            const currentOverrides = form.getValues('metadataOverrides') || {};
                            form.setValue('metadataOverrides', {
                              ...currentOverrides,
                              formatOptions: {
                                ...currentOverrides?.formatOptions,
                                suffix: e.target.value
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <FormLabel className="text-xs">Description (Internal Only)</FormLabel>
                      <Textarea
                        placeholder="Describe what this calculation does"
                        value={form.watch('metadataOverrides')?.description || ''}
                        onChange={(e) => {
                          const currentOverrides = form.getValues('metadataOverrides') || {};
                          form.setValue('metadataOverrides', {
                            ...currentOverrides,
                            description: e.target.value
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {['number', 'rating_scale', 'slider'].includes(questionType) && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Numeric Constraints</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormLabel className="text-xs">Minimum Value</FormLabel>
                        <Input 
                          type="number" 
                          placeholder="Minimum"
                          value={form.watch('metadataOverrides')?.min || ''}
                          onChange={(e) => {
                            const currentOverrides = form.getValues('metadataOverrides') || {};
                            form.setValue('metadataOverrides', {
                              ...currentOverrides,
                              min: e.target.value ? Number(e.target.value) : undefined
                            });
                          }}
                        />
                      </div>
                      <div>
                        <FormLabel className="text-xs">Maximum Value</FormLabel>
                        <Input 
                          type="number" 
                          placeholder="Maximum"
                          value={form.watch('metadataOverrides')?.max || ''}
                          onChange={(e) => {
                            const currentOverrides = form.getValues('metadataOverrides') || {};
                            form.setValue('metadataOverrides', {
                              ...currentOverrides,
                              max: e.target.value ? Number(e.target.value) : undefined
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <Button type="submit" className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </form>
        </Form>
      </Tabs>
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
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  
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
      const data = await response.json();
      console.log(`CLIENT: useQuery for pages (formId: ${formId}) - Fetched data:`, JSON.stringify(data, null, 2));
      return data;
    },
  });

  // Fetch questions for the selected page
  const { data: questionsData, isLoading: isQuestionsLoading, isFetching: isQuestionsFetching } = useQuery({
    queryKey: ['pageQuestions', selectedPage?.id],
    queryFn: async () => {
      if (!selectedPage) return [];
      
      console.log(`CLIENT: Fetching questions for page ${selectedPage.id}...`);
      const response = await fetch(`/api/form-builder/pages/${selectedPage.id}/questions`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      const fetchedQuestions = await response.json();
      console.log(`CLIENT: Fetched questions for page ${selectedPage.id}:`, JSON.stringify(fetchedQuestions, null, 2));
      return fetchedQuestions;
    },
    enabled: !!selectedPage,
    staleTime: 1000 * 5, // Reduce staleTime for faster refetches during debugging
  });
  
  // Add useEffect to log questionsData updates
  useEffect(() => {
    console.log('CLIENT: questionsData updated:', questionsData);
    console.log('CLIENT: Type of questionsData:', typeof questionsData, Array.isArray(questionsData));
  }, [questionsData]);
  
  // Create a consistent questions array for rendering
  const questions = useMemo(() => {
    if (!questionsData) return [];
    if (Array.isArray(questionsData)) return questionsData;
    return questionsData.data || [];
  }, [questionsData]);

  // Fetch library questions for adding to the form
  const { data: libraryQuestionsData, isLoading: isLibraryLoading } = useQuery({
    queryKey: ['/api/form-builder/library-questions'],
    queryFn: async () => {
      // Request a large page size to get all questions at once
      const response = await fetch('/api/form-builder/library-questions?pageSize=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch library questions');
      }
      const jsonData = await response.json();
      console.log("CLIENT: Library Questions Raw API Response:", JSON.stringify(jsonData, null, 2));
      return jsonData;
    },
  });

  // Set first page as selected when pages are loaded
  useEffect(() => {
    console.log("CLIENT: useEffect for selecting first page - pagesData:", JSON.stringify(pagesData, null, 2));
    
    // If pagesData is directly the array (not nested in a 'data' property)
    const pageArray = Array.isArray(pagesData) ? pagesData : pagesData?.data;
    
    if (pageArray && pageArray.length > 0 && !selectedPage) {
      console.log("CLIENT: useEffect - Setting selected page to:", JSON.stringify(pageArray[0], null, 2));
      setSelectedPage(pageArray[0]);
    } else if (pageArray && pageArray.length === 0) {
      console.log("CLIENT: useEffect - No pages available, clearing selectedPage.");
      setSelectedPage(null);
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
      // Log the attempt to delete
      console.log(`Attempting to delete page ${pageId} from form ${formId}`);
      
      const response = await fetch(`/api/form-builder/forms/${formId}/pages/${pageId}`, {
        method: 'DELETE',
      });
      
      // Check response status and log it
      console.log(`Delete page response status: ${response.status}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Delete page error:", error);
        throw new Error(error.message || 'Failed to delete page');
      }
      
      return true;
    },
    onSuccess: () => {
      console.log("Page deleted successfully, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms', formId, 'pages'] });
      setSelectedPage(null);
      toast({
        title: "Page deleted",
        description: "The page has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Delete page mutation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "There was a problem deleting the page",
      });
    }
  });

  // Mutations for questions
  const addQuestionMutation = useMutation({
    mutationFn: async ({ 
      pageId, 
      libraryQuestionId, 
      displayOrder,
      displayTextOverride,
      isRequiredOverride,
      isHiddenOverride,
      helperTextOverride,
      placeholderOverride,
      metadataOverrides,
      optionsOverrides
    }) => {
      const response = await fetch(`/api/form-builder/pages/${pageId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          library_question_id: libraryQuestionId,
          display_order: displayOrder,
          display_text_override: displayTextOverride,
          is_required_override: isRequiredOverride,
          is_hidden_override: isHiddenOverride,
          helper_text_override: helperTextOverride,
          placeholder_override: placeholderOverride,
          metadata_overrides: metadataOverrides || {},
          options_overrides: optionsOverrides || []
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add question');
      }
      
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate both the questions query and the form data query
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/pages', selectedPage?.id, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms', formId] });
      // Also invalidate the page-specific questions query with the ['pageQuestions', pageId] format
      queryClient.invalidateQueries({ queryKey: ['pageQuestions', variables.pageId] });
      // We don't need a toast message here because we're adding one in the handleAddQuestionFromLibrary function
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
      // Convert the field names from camelCase to snake_case for the API
      const response = await fetch(`/api/form-builder/pages/${pageId}/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_text_override: questionData.displayTextOverride,
          is_required_override: questionData.isRequiredOverride,
          is_hidden_override: questionData.isHiddenOverride,
          helper_text_override: questionData.helperTextOverride,
          placeholder_override: questionData.placeholderOverride,
          metadata_overrides: questionData.metadataOverrides || {},
          options_overrides: questionData.optionsOverrides || [],
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update question');
      }
      
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate both query key formats to ensure consistent UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/pages', selectedPage?.id, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['pageQuestions', selectedPage?.id] });
      
      toast({
        title: "Question updated",
        description: "The question settings have been updated successfully.",
      });
      // Deselect the question after updating
      setSelectedQuestion(null);
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
      // Update both query formats to ensure all caches are invalidated
      queryClient.invalidateQueries({ queryKey: ['/api/form-builder/pages', selectedPage?.id, 'questions'] });
      queryClient.invalidateQueries({ queryKey: ['pageQuestions', selectedPage?.id] });
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

  const handleSavePage = async (dataFromDialog) => {
    if (editPageData) {
      await updatePageMutation.mutateAsync({
        pageId: editPageData.id,
        pageData: dataFromDialog,
      });
    } else {
      // For new pages, calculate the next pageOrder
      const existingPages = Array.isArray(pagesData) ? pagesData : (pagesData?.data || []);
      let nextOrder;
      
      console.log("CLIENT: Calculating nextOrder for new page. Existing pages:", JSON.stringify(existingPages, null, 2));
      
      if (existingPages.length === 0) {
        nextOrder = 1; // Start first page order at 1 to avoid conflicts
      } else {
        // Ensure all mapped values are numbers, default to 0 if not
        const orders = existingPages.map(p => {
          const order = p.pageOrder !== undefined ? p.pageOrder : (p.page_order !== undefined ? p.page_order : 0);
          return typeof order === 'number' ? order : 0;
        });
        nextOrder = Math.max(0, ...orders) + 1; // Get highest existing order + 1
      }
      
      console.log("CLIENT: Calculated nextOrder:", nextOrder);

      const pageDataToSend = {
        ...dataFromDialog,
        pageOrder: nextOrder
      };
      
      console.log("CLIENT: Sending for new page:", JSON.stringify(pageDataToSend, null, 2));

      const newPage = await createPageMutation.mutateAsync(pageDataToSend);
      if (newPage) {
        setSelectedPage(newPage);
      }
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm("Are you sure you want to delete this page? All questions on this page will also be removed.")) {
      return;
    }
    
    // Ensure pageId is a valid number
    if (!pageId || isNaN(Number(pageId))) {
      console.error("Invalid page ID for deletion:", pageId);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid page ID. Could not delete the page.",
      });
      return;
    }
    
    try {
      console.log("Calling deletePageMutation with pageId:", pageId);
      await deletePageMutation.mutateAsync(pageId);
    } catch (error) {
      console.error("Error in handleDeletePage:", error);
    }
  };

  // Handle question operations
  const handleAddQuestionFromLibrary = async (libraryQuestion) => {
    console.log("ADD QUESTION - libraryQuestion:", JSON.stringify(libraryQuestion, null, 2));
    console.log("ADD QUESTION - selectedPage at this moment:", JSON.stringify(selectedPage, null, 2));
    
    if (!selectedPage) {
      toast({
        variant: "destructive",
        title: "No page selected",
        description: "Please select a page first to add questions.",
      });
      console.error("ADD QUESTION - ABORTING: No page selected!");
      return;
    }
    
    console.log(`CLIENT: handleAddQuestionFromLibrary called. questionsData at start:`, JSON.stringify(questionsData, null, 2));
    console.log(`CLIENT: isQuestionsLoading: ${isQuestionsLoading}, isQuestionsFetching: ${isQuestionsFetching}`);
    
    // Ensure we are using the array of questions correctly based on the structure of questionsData
    const currentQuestionsOnPage = Array.isArray(questionsData) ? questionsData : (questionsData?.data || []);
    
    let nextOrder;
    if (currentQuestionsOnPage.length === 0) {
      nextOrder = 1;
    } else {
      const orders = currentQuestionsOnPage.map(q => {
        const orderValue = q.displayOrder !== undefined ? q.displayOrder : 
                          (q.display_order !== undefined ? q.display_order : 0);
        return (typeof orderValue === 'number' && !isNaN(orderValue)) ? orderValue : 0;
      });
      console.log(`CLIENT: Existing orders on page:`, JSON.stringify(orders));
      nextOrder = Math.max(0, ...orders) + 1;
    }
    
    console.log(`CLIENT: Adding library question ID ${libraryQuestion.id}. Page ID: ${selectedPage.id}.`);
    console.log(`CLIENT: currentQuestionsOnPage based on questionsData:`, JSON.stringify(currentQuestionsOnPage));
    console.log(`CLIENT: Calculated nextOrder: ${nextOrder}`);
    
    // Set up initial overrides based on library question
    const initialOverrides = {
      // Basic data to identify the question
      pageId: selectedPage.id,
      libraryQuestionId: libraryQuestion.id,
      displayOrder: nextOrder,
      
      // Initialize with values from the library question if available, otherwise with null
      displayTextOverride: libraryQuestion.defaultText || libraryQuestion.default_text || null,
      // Ensure these are booleans or explicit nulls based on what the server expects
      isRequiredOverride: libraryQuestion.defaultMetadata?.isRequired !== undefined ?
                            Boolean(libraryQuestion.defaultMetadata.isRequired) :
                            (libraryQuestion.defaultMetadata?.is_required !== undefined ?
                                Boolean(libraryQuestion.defaultMetadata.is_required) : null),
      isHiddenOverride: libraryQuestion.defaultMetadata?.isHidden !== undefined ?
                            Boolean(libraryQuestion.defaultMetadata.isHidden) :
                            (libraryQuestion.defaultMetadata?.is_hidden !== undefined ?
                                Boolean(libraryQuestion.defaultMetadata.is_hidden) : null),
      helperTextOverride: libraryQuestion.defaultMetadata?.helperText || 
                          libraryQuestion.defaultMetadata?.helper_text || null,
      placeholderOverride: libraryQuestion.defaultMetadata?.placeholder || null,
      metadataOverrides: libraryQuestion.defaultMetadata || {}, // Ensure this is an object
      optionsOverrides: libraryQuestion.defaultOptions || []    // Ensure this is an array
    };
    
    console.log("CLIENT: Sending question with overrides:", JSON.stringify(initialOverrides, null, 2));
    
    try {
      await addQuestionMutation.mutateAsync(initialOverrides);
      // Toast is now more specific with the question text
      toast({
        title: "Question Added",
        description: `"${initialOverrides.displayTextOverride || 'New Question'}" added to page.`,
      });
    } catch (error) {
      console.error("CLIENT: Error in handleAddQuestionFromLibrary:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add question to the page."
      });
    }
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
    const pageArray = Array.isArray(pagesData) ? pagesData : (pagesData?.data || []);
    const draggedItem = pageArray.find(p => p.id === active.id) || 
                        questionsData?.find(q => q.id === active.id) ||
                        libraryQuestionsData?.data?.find(q => q.id === active.id);
    
    console.log("CLIENT: Drag started, active ID:", active.id, "Found item:", draggedItem);
    
    setActiveEntity(draggedItem);
  };

  const handleDragEnd = async (event) => {
    console.log("DRAG END - Current selectedPage:", JSON.stringify(selectedPage, null, 2));
    console.log("DRAG END - Active Entity (dragged item):", JSON.stringify(activeEntity, null, 2));
    
    const { active, over } = event;
    console.log("DRAG END - Over ID:", over?.id);
    
    if (!over) {
      setActiveDragId(null);
      setActiveEntity(null);
      return;
    }
    
    // Handle page reordering
    if (activeLibraryTab === "pages" && active.id !== over.id) {
      // Find the active and target pages using the consistent array handling
      const allPages = Array.isArray(pagesData) ? pagesData : (pagesData?.data || []);
      const activePage = allPages.find(p => p.id === active.id);
      const overPage = allPages.find(p => p.id === over.id);
      
      if (activePage && overPage) {
        // Get all pages and find their current order
        const pages = Array.isArray(pagesData) ? [...pagesData] : [...(pagesData?.data || [])];
        console.log("CLIENT: In handleDragEnd handler, using pages:", JSON.stringify(pages, null, 2));
        
        // Reorder the pages based on the drag and drop
        const newOrder = Array.from(pages);
        const activeIndex = pages.findIndex(p => p.id === active.id);
        const overIndex = pages.findIndex(p => p.id === over.id);
        
        if (activeIndex !== -1 && overIndex !== -1) {
          newOrder.splice(activeIndex, 1);
          newOrder.splice(overIndex, 0, activePage);
          
          // Create payload for updating page orders
          const reorderPayload = newOrder.map((page, index) => ({
            pageId: page.id,
            newPageOrder: index + 1
          }));
          
          // Call the API to update page orders
          try {
            const response = await fetch(`/api/form-builder/forms/${formId}/pages/reorder`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(reorderPayload),
            });
            
            if (!response.ok) {
              throw new Error('Failed to reorder pages');
            }
            
            // Refresh the form and pages data
            queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms', formId] });
            queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms', formId, 'pages'] });
            
            toast({
              title: "Pages reordered",
              description: "The page order has been updated."
            });
          } catch (error) {
            console.error("Error reordering pages:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to update page order"
            });
          }
        }
      }
    }
    
    // Handle question reordering
    if (selectedPage && active.id !== over.id) {
      // If the active item is a library question and it's dropped on the questions container
      if (activeLibraryTab === "library" && over.id === "questions-container") {
        const libraryQuestion = libraryQuestionsData?.data?.find(q => q.id === active.id);
        if (libraryQuestion) {
          await handleAddQuestionFromLibrary(libraryQuestion);
        }
      }
      
      // If both active and over are questions on the page (reordering existing questions)
      else if (activeLibraryTab !== "library") {
        const questions = Array.isArray(questionsData) ? questionsData : (questionsData || []);
        const activeQuestion = questions.find(q => q.id === active.id);
        const overQuestion = questions.find(q => q.id === over.id);
        
        if (activeQuestion && overQuestion) {
          const activeIndex = questions.findIndex(q => q.id === active.id);
          const overIndex = questions.findIndex(q => q.id === over.id);
          
          if (activeIndex !== -1 && overIndex !== -1) {
            // Create the new order
            const reorderedQuestions = Array.from(questions);
            reorderedQuestions.splice(activeIndex, 1);
            reorderedQuestions.splice(overIndex, 0, activeQuestion);
            
            // Create payload for reordering API
            const reorderPayload = reorderedQuestions.map((question, index) => ({
              questionInstanceId: question.id, // Changed from questionId to match backend expectation
              newDisplayOrder: index + 1
            }));
            
            console.log("Reordering questions with payload:", JSON.stringify(reorderPayload, null, 2));
            
            // Call the reorder API
            try {
              const response = await fetch(`/api/form-builder/pages/${selectedPage.id}/questions/reorder`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(reorderPayload),
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                console.error("Error from reorder API:", errorData);
                throw new Error(errorData.message || 'Failed to reorder questions');
              }
              
              // Refresh the questions data for all query formats
              queryClient.invalidateQueries({ queryKey: ['/api/form-builder/pages', selectedPage.id, 'questions'] });
              queryClient.invalidateQueries({ queryKey: ['pageQuestions', selectedPage.id] });
              
              // Refresh the form data as well to ensure everything is in sync
              queryClient.invalidateQueries({ queryKey: ['/api/form-builder/forms', formId] });
              
              toast({
                title: "Questions reordered",
                description: "The question order has been updated."
              });
            } catch (error) {
              console.error("Error reordering questions:", error);
              toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to update question order"
              });
            }
          }
        }
      }
    }
    
    // Always reset drag state at the end
    setActiveDragId(null);
    setActiveEntity(null);
  };

  // Handle library question drop onto page
  const handleDragOver = (event) => {
    const { active, over } = event;
    
    // We don't take action on dragOver anymore - all drag handling happens in handleDragEnd
    // This avoids creating multiple copies of questions during a drag operation
    
    // Instead, we just provide visual feedback during the drag
    // The cursor should change when dragging over a valid drop target
    if (activeLibraryTab === "library" && active?.id) {
      if (over?.id === "questions-container" || (over?.id && questionsData?.data?.find(q => q.id === over.id))) {
        // The CSS styling for valid drop targets is handled by the component classes
        // No need to set any state here
      }
    }
  };
  
  // Add a helper for inserting a question at a specific position
  const handleInsertQuestionAt = async (libraryQuestion, targetPosition) => {
    if (!selectedPage) {
      toast({
        variant: "destructive",
        title: "No page selected",
        description: "Please select a page first to add questions.",
      });
      return;
    }
    
    const questions = questionsData?.data || [];
    let insertOrder = 1; // Default to the start
    
    if (targetPosition === 'end') {
      // Add to the end
      insertOrder = questions.length > 0 
        ? Math.max(...questions.map(q => q.displayOrder || q.display_order)) + 1 
        : 1;
    } else if (typeof targetPosition === 'number') {
      // Insert at specific position
      insertOrder = targetPosition;
      
      // Reorder all existing questions that come after this position
      // This will be handled by the backend API
    }
    
    // Set up initial overrides based on library question
    const initialOverrides = {
      pageId: selectedPage.id,
      libraryQuestionId: libraryQuestion.id,
      displayOrder: insertOrder,
      displayTextOverride: null,
      isRequiredOverride: null,
      isHiddenOverride: null,
      helperTextOverride: null,
      placeholderOverride: null,
      metadataOverrides: {},
      optionsOverrides: []
    };
    
    try {
      await addQuestionMutation.mutateAsync(initialOverrides);
      toast({
        title: "Question added",
        description: "Question has been added to the page successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add question to the page."
      });
    }
  };

  // Calculate display values
  // Direct access to pagesData which is an array returned from the API
  const pages = Array.isArray(pagesData) ? pagesData : (pagesData?.data || []);
  console.log("CLIENT: 'pages' variable before rendering:", JSON.stringify(pages, null, 2));
  console.log("CLIENT: 'questions' variable before rendering:", JSON.stringify(questions, null, 2));
  const libraryQuestions = libraryQuestionsData?.data || [];
  
  // Filter library questions based on search
  const filteredLibraryQuestions = libraryQuestions.filter(question => {
    if (!searchQuery) return true;
    
    const displayText = question.displayText || question.default_text || '';
    const questionType = question.questionType || question.question_type || '';
    const helperText = question.helperText || question.helper_text || '';
    
    const lowerSearchQuery = searchQuery.toLowerCase();
    
    return displayText.toLowerCase().includes(lowerSearchQuery) || 
           questionType.toLowerCase().includes(lowerSearchQuery) ||
           helperText.toLowerCase().includes(lowerSearchQuery);
  });
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPreview(true)}
            >
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
                  {console.log("CLIENT: Rendering pages section. pagesData:", JSON.stringify(pagesData, null, 2))}
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
                        <div key={page.id}>
                          <SortablePage
                            page={page}
                            isSelected={selectedPage?.id === page.id}
                            onSelect={(pageData) => {
                              console.log("PAGE CLICKED VIA onSelect. Page Data:", JSON.stringify(pageData, null, 2));
                              setSelectedPage(pageData);
                              setSelectedQuestion(null);
                            }}
                            onEdit={(pageData) => handleEditPage(pageData)}
                            onDelete={(pageId) => handleDeletePage(pageId)}
                          />
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
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search questions..." 
                      className="pl-8 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        className="absolute right-0 top-0 h-full px-2"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {isLibraryLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : libraryQuestions.length === 0 ? (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-sm text-muted-foreground">No questions in library</p>
                    </div>
                  ) : filteredLibraryQuestions.length === 0 && searchQuery ? (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-sm text-muted-foreground">No questions match your search</p>
                      <Button 
                        variant="link" 
                        className="mt-2" 
                        onClick={() => setSearchQuery("")}
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredLibraryQuestions.map(question => (
                        <div
                          key={question.id}
                          className="p-3 rounded-md border border-gray-200 bg-white cursor-move hover:border-primary hover:shadow-sm transition-all"
                          draggable
                          onDragStart={() => {
                            setActiveDragId(question.id);
                            setActiveEntity(question);
                          }}
                          onClick={() => handleAddQuestionFromLibrary(question)}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-medium text-sm">{question.displayText || question.defaultText || question.default_text}</p>
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
                  ? `Editing: ${selectedPage.pageTitle || selectedPage.title || `Page ${selectedPage.pageOrder ?? selectedPage.id}`}` 
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
                <SortableContext items={questions.map(q => q.id || `temp-${Math.random()}`)} strategy={verticalListSortingStrategy}>
                  {questions.map(question => (
                    <SortableQuestion
                      key={question.id || `temp-${Math.random()}`}
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
                      {getQuestionTypeLabel(activeEntity.questionType || activeEntity.question_type)}
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
      
      {/* Form Preview */}
      <FormPreview 
        isOpen={showPreview} 
        onClose={() => setShowPreview(false)}
        formData={formData}
        pages={Array.isArray(pagesData) ? pagesData : (pagesData?.data || [])}
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