import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ChevronLeft, Plus, Trash2, AlertCircle } from "lucide-react";

// Define form schema based on library question fields
const formSchema = z.object({
  questionKey: z.string().min(1, "Question key is required"),
  defaultText: z.string().min(1, "Question text is required"),
  questionType: z.string().min(1, "Question type is required"),
  category: z.string().optional(),
  defaultRequired: z.boolean().optional(),
  helperText: z.string().optional(),
  placeholder: z.string().optional(),
  defaultMetadata: z.record(z.any()).optional(),
});

// Define options for question types
const questionTypes = [
  { value: "textbox", label: "Text Field" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "checkbox_group", label: "Checkboxes" },
  { value: "radio_group", label: "Radio Buttons" },
  { value: "dropdown", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "matrix", label: "Matrix" },
  { value: "address", label: "Address" },
  { value: "header", label: "Header" },
  { value: "text_display", label: "Display Text" },
  { value: "image_upload", label: "Image Upload" },
  { value: "file_upload", label: "File Upload" },
  { value: "signature_pad", label: "Signature Pad" },
  { value: "rating_scale", label: "Rating Scale" },
  { value: "slider", label: "Slider" },
  { value: "toggle_switch", label: "Toggle Switch" },
  { value: "full_name", label: "Full Name" },
];

export default function QuestionLibraryEdit() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const isEditing = id !== "new" && id !== undefined;
  const [activeTab, setActiveTab] = useState("basic");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [questionType, setQuestionType] = useState<string>("");
  
  // For multiple choice question types
  const [options, setOptions] = useState<{id: string, label: string, value: string}[]>([]);
  
  // For matrix question type
  const [rows, setRows] = useState<{id: string, label: string}[]>([]);
  const [columns, setColumns] = useState<{id: string, label: string, value: string}[]>([]);
  
  // For validation rules
  const [validationRules, setValidationRules] = useState<Record<string, any>>({});

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      questionKey: "",
      defaultText: "",
      questionType: "",
      category: "",
      defaultRequired: false,
      helperText: "",
      placeholder: "",
      defaultMetadata: {},
    },
  });

  // Query to fetch question data if editing
  const { data: questionData, isLoading } = useQuery({
    queryKey: ['/api/form-builder/library-questions', id],
    queryFn: async () => {
      if (!isEditing || !id) return null;
      
      const response = await fetch(`/api/form-builder/library-questions/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }
      return await response.json();
    },
    enabled: isEditing && !!id,
  });

  // Mutation for saving question
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Prepare submission data
      const submission = {
        library_question_key: data.questionKey,
        default_text: data.defaultText,
        question_type: data.questionType,
        category: data.category || null,
        default_metadata: {
          // Include validation rules if they exist
          ...(Object.keys(validationRules).length > 0 && { validation: validationRules }),
          
          // Add other general metadata properties
          defaultRequired: data.defaultRequired,
          helperText: data.helperText || null,
          placeholder: data.placeholder || null,
        },
        
        // `default_options` for choice types (outside of default_metadata)
        default_options: (['checkbox_group', 'radio_group', 'dropdown'].includes(data.questionType))
          ? options.map(opt => ({
              label: opt.label,
              value: opt.value || opt.label.toLowerCase().replace(/\s+/g, '_')
            }))
          : null,
      };
      
      // Add matrix rows and columns as separate top-level properties for matrix questions
      if (data.questionType === 'matrix') {
        Object.assign(submission, {
          matrixRows: rows.map(row => ({
            rowKey: row.id.replace('row-', 'row_'), // Generate rowKey from id if not set
            label: row.label,
            price: null,
            defaultMetadata: {},
            rowOrder: parseInt(row.id.split('-')[1], 10) // Use id number as order
          })),
          
          matrixColumns: columns.map(col => ({
            columnKey: col.id.replace('col-', 'col_'), // Generate columnKey from id if not set
            header: col.label,
            cellInputType: 'radio', // Default to radio input type
            defaultMetadata: {},
            columnOrder: parseInt(col.id.split('-')[1], 10) // Use id number as order
          }))
        });
      }

      if (isEditing) {
        // Update existing question
        const response = await fetch(`/api/form-builder/library-questions/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update question');
        }

        return await response.json();
      } else {
        // Create new question
        const response = await fetch('/api/form-builder/library-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create question');
        }

        return await response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: `Question ${isEditing ? 'updated' : 'created'} successfully`,
        description: "You will be redirected to the question library",
      });
      
      // Navigate back to the question library list
      setTimeout(() => {
        navigate("/admin/form-builder/question-library");
      }, 1500);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save question",
      });
    },
  });

  // Deletion mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!isEditing) return;
      
      const response = await fetch(`/api/form-builder/library-questions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete question');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Question deleted",
        description: "You will be redirected to the question library",
      });
      
      // Navigate back to the question library list
      setTimeout(() => {
        navigate("/admin/form-builder/question-library");
      }, 1500);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete question",
      });
    },
  });

  // Set up form values when question data is loaded
  useEffect(() => {
    if (questionData) {
      // Set form values based on the loaded question
      form.reset({
        questionKey: questionData.library_question_key,
        defaultText: questionData.default_text,
        questionType: questionData.question_type,
        category: questionData.category || "",
        defaultRequired: questionData.default_required || false,
        helperText: questionData.helper_text || "",
        placeholder: questionData.placeholder || "",
        defaultMetadata: questionData.default_metadata || {},
      });

      // Set local state for specialized fields
      setQuestionType(questionData.question_type);
      
      // Initialize options for multiple choice question types
      if (['checkbox_group', 'radio_group', 'dropdown'].includes(questionData.question_type)) {
        const savedOptions = questionData.default_metadata?.options || [];
        setOptions(savedOptions.map((opt: any, index: number) => ({
          id: `option-${index}`,
          label: opt.label,
          value: opt.value
        })));
      }
      
      // Initialize matrix rows and columns
      if (questionData.question_type === 'matrix') {
        // For matrix questions, the server now returns matrixRows and matrixColumns directly as top-level properties
        const savedRows = questionData.matrixRows || [];
        const savedColumns = questionData.matrixColumns || [];
        
        setRows(savedRows.map((row: any, index: number) => ({
          id: `row-${index}`,
          label: row.label,
          rowKey: row.row_key // Store the row_key for proper updating
        })));
        
        setColumns(savedColumns.map((col: any, index: number) => ({
          id: `col-${index}`,
          label: col.header, // The server uses 'header' for column label
          value: col.column_key, // The server uses 'column_key' as the value
          cellInputType: col.cell_input_type // Store the cell_input_type for proper updating
        })));
      }
      
      // Initialize validation rules
      if (questionData.default_metadata?.validation) {
        setValidationRules(questionData.default_metadata.validation);
      }
    }
  }, [questionData, form]);

  // Handle question type changes
  const handleQuestionTypeChange = (value: string) => {
    setQuestionType(value);
    form.setValue('questionType', value);
    
    // Reset specialized fields when type changes
    if (['checkbox_group', 'radio_group', 'dropdown'].includes(value)) {
      if (options.length === 0) {
        // Initialize with one empty option if none exist
        setOptions([{ id: 'option-0', label: '', value: '' }]);
      }
    } else if (value === 'matrix' && rows.length === 0 && columns.length === 0) {
      // Initialize matrix with empty rows and columns
      setRows([{ id: 'row-0', label: '' }]);
      setColumns([{ id: 'col-0', label: '', value: '' }]);
    }
  };

  // Prepare metadata based on question type for submission
  const prepareMetadataForSubmission = () => {
    const metadata: Record<string, any> = {};
    
    // Add validation rules to metadata
    if (Object.keys(validationRules).length > 0) {
      metadata.validation = validationRules;
    }
    
    // We no longer need to add options for choice-based questions here
    // as they're now handled directly in the submission object as default_options
    
    // We also no longer need to add matrix structure here
    // as rows and columns are now added as top-level properties (matrixRows, matrixColumns)
    
    return metadata;
  };

  // Add a new option for multiple choice questions
  const addOption = () => {
    setOptions([
      ...options,
      { id: `option-${options.length}`, label: '', value: '' }
    ]);
  };

  // Remove an option
  const removeOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id));
  };

  // Add a new row for matrix questions
  const addRow = () => {
    setRows([
      ...rows,
      { id: `row-${rows.length}`, label: '' }
    ]);
  };

  // Remove a row
  const removeRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  // Add a new column for matrix questions
  const addColumn = () => {
    setColumns([
      ...columns,
      { id: `col-${columns.length}`, label: '', value: '' }
    ]);
  };

  // Remove a column
  const removeColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
  };

  // Handle form submission
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const errors: string[] = [];
    
    // Validate based on question type
    if (['checkbox_group', 'radio_group', 'dropdown'].includes(questionType)) {
      if (options.length === 0) {
        errors.push("At least one option is required for this question type");
      } else {
        // Check if all options have labels
        const emptyOptions = options.filter(opt => !opt.label.trim());
        if (emptyOptions.length > 0) {
          errors.push("All options must have labels");
        }
      }
    }
    
    if (questionType === 'matrix') {
      if (rows.length === 0) {
        errors.push("At least one row is required for matrix questions");
      }
      
      if (columns.length === 0) {
        errors.push("At least one column is required for matrix questions");
      }
      
      // Check if all rows and columns have labels
      const emptyRows = rows.filter(row => !row.label.trim());
      const emptyColumns = columns.filter(col => !col.label.trim());
      
      if (emptyRows.length > 0) {
        errors.push("All rows must have labels");
      }
      
      if (emptyColumns.length > 0) {
        errors.push("All columns must have labels");
      }
    }
    
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // If validation passes, clear errors and submit
    setFormErrors([]);
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <p>Loading question details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => navigate("/admin/form-builder/question-library")}
                className="mr-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle>{isEditing ? 'Edit Question' : 'Create New Question'}</CardTitle>
                <CardDescription>
                  {isEditing ? 'Update an existing question template' : 'Add a new question to the library'}
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="options" disabled={!['checkbox_group', 'radio_group', 'dropdown'].includes(questionType)}>
                    Options
                  </TabsTrigger>
                  <TabsTrigger value="matrix" disabled={questionType !== 'matrix'}>
                    Matrix Structure
                  </TabsTrigger>
                  <TabsTrigger value="validation">Validation</TabsTrigger>
                </TabsList>
                
                {/* Display form errors at the top */}
                {formErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Please fix the following errors:</span>
                    </div>
                    <ul className="list-disc list-inside text-sm">
                      {formErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Basic Information Tab */}
                <TabsContent value="basic">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="questionKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Key</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. client_name, event_date" {...field} />
                          </FormControl>
                          <FormDescription>
                            Unique identifier for this question (no spaces, use underscore)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="defaultText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Text</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. What is your full name?" {...field} />
                          </FormControl>
                          <FormDescription>
                            The text shown to users for this question
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="questionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Type</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => handleQuestionTypeChange(value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a question type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {questionTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Determines how the question will be displayed and what data it collects
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Client Information, Event Details" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional category for organizing questions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="defaultRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Required</FormLabel>
                            <FormDescription>
                              Mark this question as required by default
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="helperText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Helper Text</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter any additional instructions or guidance for this question" 
                              className="min-h-20" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional guidance shown below the question
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="placeholder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Placeholder Text</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Enter your answer here" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>
                            Text shown inside the input when empty
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                {/* Options Tab for multiple choice questions */}
                <TabsContent value="options">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Question Options</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Define the options for this {questionType === 'checkbox_group' ? 'checkbox' : 
                        questionType === 'radio_group' ? 'radio button' : 'dropdown'} question.
                    </p>
                    
                    {options.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <div className="flex-1">
                          <FormLabel htmlFor={`option-label-${index}`} className="text-xs">Option Label</FormLabel>
                          <Input
                            id={`option-label-${index}`}
                            value={option.label}
                            onChange={(e) => {
                              const newOptions = [...options];
                              newOptions[index].label = e.target.value;
                              setOptions(newOptions);
                            }}
                            className="mb-1"
                            placeholder="Option Text"
                          />
                        </div>
                        <div className="flex-1">
                          <FormLabel htmlFor={`option-value-${index}`} className="text-xs">Value (Optional)</FormLabel>
                          <Input
                            id={`option-value-${index}`}
                            value={option.value}
                            onChange={(e) => {
                              const newOptions = [...options];
                              newOptions[index].value = e.target.value;
                              setOptions(newOptions);
                            }}
                            className="mb-1"
                            placeholder="Internal value"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="mt-5"
                          onClick={() => removeOption(option.id)}
                          disabled={options.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={addOption}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </TabsContent>
                
                {/* Matrix Structure Tab */}
                <TabsContent value="matrix">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Matrix Rows</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Define the rows (questions) for this matrix.
                      </p>
                      
                      {rows.map((row, index) => (
                        <div key={row.id} className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <Input
                              value={row.label}
                              onChange={(e) => {
                                const newRows = [...rows];
                                newRows[index].label = e.target.value;
                                setRows(newRows);
                              }}
                              placeholder="Row Label"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={addRow}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Row
                      </Button>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Matrix Columns</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Define the columns (answer options) for this matrix.
                      </p>
                      
                      {columns.map((column, index) => (
                        <div key={column.id} className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <FormLabel htmlFor={`column-label-${index}`} className="text-xs">Column Label</FormLabel>
                            <Input
                              id={`column-label-${index}`}
                              value={column.label}
                              onChange={(e) => {
                                const newColumns = [...columns];
                                newColumns[index].label = e.target.value;
                                setColumns(newColumns);
                              }}
                              className="mb-1"
                              placeholder="Column Label"
                            />
                          </div>
                          <div className="flex-1">
                            <FormLabel htmlFor={`column-value-${index}`} className="text-xs">Value (Optional)</FormLabel>
                            <Input
                              id={`column-value-${index}`}
                              value={column.value}
                              onChange={(e) => {
                                const newColumns = [...columns];
                                newColumns[index].value = e.target.value;
                                setColumns(newColumns);
                              }}
                              className="mb-1"
                              placeholder="Internal value"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="mt-5"
                            onClick={() => removeColumn(column.id)}
                            disabled={columns.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={addColumn}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Column
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Validation Tab */}
                <TabsContent value="validation">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Validation Rules</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Set validation rules based on the question type.
                    </p>
                    
                    {/* Text-based validation */}
                    {['textbox', 'textarea', 'email', 'phone'].includes(questionType) && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <FormLabel htmlFor="minLength">Minimum Length</FormLabel>
                            <Input
                              id="minLength"
                              type="number"
                              min="0"
                              value={validationRules.minLength || ""}
                              onChange={(e) => {
                                setValidationRules({
                                  ...validationRules,
                                  minLength: e.target.value ? parseInt(e.target.value) : undefined
                                });
                              }}
                              placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Minimum number of characters allowed
                            </p>
                          </div>
                          <div>
                            <FormLabel htmlFor="maxLength">Maximum Length</FormLabel>
                            <Input
                              id="maxLength"
                              type="number"
                              min="0"
                              value={validationRules.maxLength || ""}
                              onChange={(e) => {
                                setValidationRules({
                                  ...validationRules,
                                  maxLength: e.target.value ? parseInt(e.target.value) : undefined
                                });
                              }}
                              placeholder="No limit"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Maximum number of characters allowed
                            </p>
                          </div>
                        </div>
                        
                        {/* Pattern validation for specific types */}
                        {['textbox', 'email', 'phone'].includes(questionType) && (
                          <div>
                            <FormLabel htmlFor="pattern">Validation Pattern (Regex)</FormLabel>
                            <Input
                              id="pattern"
                              value={validationRules.pattern || ""}
                              onChange={(e) => {
                                setValidationRules({
                                  ...validationRules,
                                  pattern: e.target.value || undefined
                                });
                              }}
                              placeholder={questionType === 'email' ? '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' : 
                                          questionType === 'phone' ? '^\\+?[0-9]{10,15}$' : 
                                          'Regular expression pattern'}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Regular expression pattern for validation
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Number validation */}
                    {questionType === 'number' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FormLabel htmlFor="min">Minimum Value</FormLabel>
                          <Input
                            id="min"
                            type="number"
                            step="any"
                            value={validationRules.min ?? ""}
                            onChange={(e) => {
                              setValidationRules({
                                ...validationRules,
                                min: e.target.value ? parseFloat(e.target.value) : undefined
                              });
                            }}
                            placeholder="No minimum"
                          />
                        </div>
                        <div>
                          <FormLabel htmlFor="max">Maximum Value</FormLabel>
                          <Input
                            id="max"
                            type="number"
                            step="any"
                            value={validationRules.max ?? ""}
                            onChange={(e) => {
                              setValidationRules({
                                ...validationRules,
                                max: e.target.value ? parseFloat(e.target.value) : undefined
                              });
                            }}
                            placeholder="No maximum"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Checkbox group validation */}
                    {questionType === 'checkbox_group' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FormLabel htmlFor="minSelect">Minimum Selection</FormLabel>
                          <Input
                            id="minSelect"
                            type="number"
                            min="0"
                            max={options.length}
                            value={validationRules.minSelect || ""}
                            onChange={(e) => {
                              setValidationRules({
                                ...validationRules,
                                minSelect: e.target.value ? parseInt(e.target.value) : undefined
                              });
                            }}
                            placeholder="0"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum number of checkboxes that must be selected
                          </p>
                        </div>
                        <div>
                          <FormLabel htmlFor="maxSelect">Maximum Selection</FormLabel>
                          <Input
                            id="maxSelect"
                            type="number"
                            min="1"
                            max={options.length}
                            value={validationRules.maxSelect || ""}
                            onChange={(e) => {
                              setValidationRules({
                                ...validationRules,
                                maxSelect: e.target.value ? parseInt(e.target.value) : undefined
                              });
                            }}
                            placeholder={`${options.length}`}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Maximum number of checkboxes that can be selected
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Date range validation */}
                    {['date', 'datetime'].includes(questionType) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FormLabel htmlFor="minDate">Earliest Date</FormLabel>
                          <Input
                            id="minDate"
                            type="date"
                            value={validationRules.minDate || ""}
                            onChange={(e) => {
                              setValidationRules({
                                ...validationRules,
                                minDate: e.target.value || undefined
                              });
                            }}
                          />
                        </div>
                        <div>
                          <FormLabel htmlFor="maxDate">Latest Date</FormLabel>
                          <Input
                            id="maxDate"
                            type="date"
                            value={validationRules.maxDate || ""}
                            onChange={(e) => {
                              setValidationRules({
                                ...validationRules,
                                maxDate: e.target.value || undefined
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Custom validation message */}
                    <div>
                      <FormLabel htmlFor="customErrorMessage">Custom Error Message</FormLabel>
                      <Input
                        id="customErrorMessage"
                        value={validationRules.errorMessage || ""}
                        onChange={(e) => {
                          setValidationRules({
                            ...validationRules,
                            errorMessage: e.target.value || undefined
                          });
                        }}
                        placeholder="Please enter a valid value"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Custom message to show when validation fails
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t p-6">
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button">
                      Delete Question
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        question from the library and may impact forms that use it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/form-builder/question-library")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Question' : 'Create Question'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}