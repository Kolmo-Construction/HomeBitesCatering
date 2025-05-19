import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Pencil,
  Trash2,
  Plus,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Save,
  Eye,
  Copy,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// Types for the form structure (similar to QuestionnaireWizard but with more editing capabilities)
interface FormPage {
  id: number;
  title: string;
  key: string;
  pageOrder: number;
  questions: Question[];
}

interface Question {
  id: number;
  questionText: string;
  questionType: string;
  fieldKey: string;
  isRequired: boolean;
  metadata?: Record<string, any>;
  options?: { label: string; value: string }[];
}

interface Option {
  label: string;
  value: string;
}

interface Rule {
  id: number;
  triggerQuestionId: number;
  conditionType: string;
  conditionValue: string;
  actionType: string;
  targets: {
    targetType: string;
    targetId: number;
  }[];
}

interface FormDefinition {
  form: {
    id: number;
    key: string;
    title: string;
    description: string;
    version: number;
  };
  pages: FormPage[];
  rules: Rule[];
}

// Question Types for the dropdown
const QUESTION_TYPES = [
  { value: 'header', label: 'Section Header' },
  { value: 'text_display', label: 'Text Display' },
  { value: 'textbox', label: 'Single Line Text' },
  { value: 'textarea', label: 'Paragraph Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'checkbox_group', label: 'Checkboxes' },
  { value: 'radio_group', label: 'Radio Buttons' },
  { value: 'dropdown', label: 'Dropdown' },
];

// Sortable Question Item
function SortableQuestionItem({ question, onEdit, onDelete, isActive }: { 
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (questionId: number) => void;
  isActive?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: question.id.toString(),
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`p-3 mb-2 border rounded-md ${isActive ? 'border-primary bg-primary/5' : 'border-gray-200'} hover:border-primary/50 relative group`}
    >
      <div className="flex items-center">
        <div 
          className="cursor-move mr-2 text-gray-500 hover:text-gray-700 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </div>
        
        <div className="flex-1 mr-2">
          <div className="flex items-center">
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mr-2">
              {QUESTION_TYPES.find(t => t.value === question.questionType)?.label || question.questionType}
            </span>
            <span className={`${question.isRequired ? 'text-red-500 mr-1' : 'hidden'}`}>*</span>
            <p className="font-medium truncate flex-1">
              {question.questionText || <span className="italic text-gray-400">No question text</span>}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">Field key: {question.fieldKey}</p>
        </div>
        
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onEdit(question)}
            className="h-8 w-8 opacity-60 hover:opacity-100"
          >
            <Pencil size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(question.id)}
            className="h-8 w-8 text-red-500 opacity-60 hover:opacity-100"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Question Editor Component
function QuestionEditor({ 
  question, 
  onSave, 
  onCancel 
}: { 
  question: Question; 
  onSave: (updatedQuestion: Question) => void; 
  onCancel: () => void; 
}) {
  const [editedQuestion, setEditedQuestion] = useState<Question>({ ...question });
  const [options, setOptions] = useState<Option[]>(question.options || []);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  // Handle basic field changes
  const handleChange = (field: keyof Question, value: any) => {
    setEditedQuestion(prev => ({ ...prev, [field]: value }));
  };

  // Handle metadata changes
  const handleMetadataChange = (field: string, value: any) => {
    setEditedQuestion(prev => ({
      ...prev,
      metadata: {
        ...(prev.metadata || {}),
        [field]: value
      }
    }));
  };

  // Add a new option
  const handleAddOption = () => {
    if (newOptionLabel.trim() === '') return;
    
    const newOption = {
      label: newOptionLabel,
      value: newOptionValue.trim() === '' ? newOptionLabel.toLowerCase().replace(/\s+/g, '_') : newOptionValue
    };
    
    setOptions([...options, newOption]);
    setNewOptionLabel('');
    setNewOptionValue('');
  };

  // Remove an option
  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  // Move option up or down in the list
  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === options.length - 1)
    ) {
      return;
    }
    
    const newOptions = [...options];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
    
    setOptions(newOptions);
  };

  // Save the edited question
  const handleSave = () => {
    // Update the question with the latest options
    const finalQuestion = {
      ...editedQuestion,
      options: ['checkbox_group', 'radio_group', 'dropdown'].includes(editedQuestion.questionType) ? options : undefined
    };
    
    onSave(finalQuestion);
  };

  // Need options for these question types
  const showOptions = ['checkbox_group', 'radio_group', 'dropdown'].includes(editedQuestion.questionType);

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Edit Question</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X size={18} />
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Question Type */}
        <div>
          <Label htmlFor="questionType">Question Type</Label>
          <Select
            value={editedQuestion.questionType}
            onValueChange={(value) => handleChange('questionType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select question type" />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Question Text */}
        <div>
          <Label htmlFor="questionText">Question Text</Label>
          <Textarea
            id="questionText"
            value={editedQuestion.questionText}
            onChange={(e) => handleChange('questionText', e.target.value)}
            placeholder="Enter your question"
            rows={3}
          />
        </div>
        
        {/* Field Key */}
        <div>
          <Label htmlFor="fieldKey">Field Key</Label>
          <Input
            id="fieldKey"
            value={editedQuestion.fieldKey}
            onChange={(e) => handleChange('fieldKey', e.target.value)}
            placeholder="e.g., first_name"
          />
          <p className="text-xs text-gray-500 mt-1">
            Used to identify this field in submissions. Use snake_case without spaces.
          </p>
        </div>
        
        {/* Required switch */}
        <div className="flex items-center space-x-2">
          <Switch
            id="isRequired"
            checked={editedQuestion.isRequired}
            onCheckedChange={(checked) => handleChange('isRequired', checked)}
          />
          <Label htmlFor="isRequired">Required Field</Label>
        </div>
        
        {/* Placeholder text */}
        {!['header', 'text_display', 'checkbox_group', 'radio_group'].includes(editedQuestion.questionType) && (
          <div>
            <Label htmlFor="placeholder">Placeholder Text</Label>
            <Input
              id="placeholder"
              value={editedQuestion.metadata?.placeholder || ''}
              onChange={(e) => handleMetadataChange('placeholder', e.target.value)}
              placeholder="Enter placeholder text"
            />
          </div>
        )}
        
        {/* Helper text */}
        {!['header'].includes(editedQuestion.questionType) && (
          <div>
            <Label htmlFor="helperText">Helper Text</Label>
            <Input
              id="helperText"
              value={editedQuestion.metadata?.helperText || ''}
              onChange={(e) => handleMetadataChange('helperText', e.target.value)}
              placeholder="Additional instructions for this question"
            />
          </div>
        )}
        
        {/* Options for select-type questions */}
        {showOptions && (
          <div className="space-y-3 pt-2">
            <Label>Options</Label>
            
            {/* Existing options */}
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1 border rounded-md p-2 bg-white">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-gray-500">Value: {option.value}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => handleMoveOption(index, 'up')}
                          disabled={index === 0}
                        >
                          <ChevronUp size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => handleMoveOption(index, 'down')}
                          disabled={index === options.length - 1}
                        >
                          <ChevronDown size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-red-500"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add new option */}
            <div className="space-y-2 border-t pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="newOptionLabel" className="text-xs">Label</Label>
                  <Input
                    id="newOptionLabel"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    placeholder="Display text"
                    size={1}
                  />
                </div>
                <div>
                  <Label htmlFor="newOptionValue" className="text-xs">Value</Label>
                  <Input
                    id="newOptionValue"
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    placeholder="Stored value (optional)"
                    size={1}
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddOption} 
                size="sm" 
                className="w-full"
                disabled={newOptionLabel.trim() === ''}
              >
                <Plus size={16} className="mr-1" /> Add Option
              </Button>
            </div>
          </div>
        )}
        
        {/* Display text for text_display type */}
        {editedQuestion.questionType === 'text_display' && (
          <div>
            <Label htmlFor="displayText">Display Text</Label>
            <Textarea
              id="displayText"
              value={editedQuestion.metadata?.displayText || ''}
              onChange={(e) => handleMetadataChange('displayText', e.target.value)}
              placeholder="Text to display (supports basic HTML)"
              rows={5}
            />
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

// Form Editor Main Component
export default function FormEditor() {
  const [, setLocation] = useLocation();
  const params = useParams<{ formKey: string }>();
  const formKey = params.formKey || 'wedding'; // Default to wedding if not specified
  
  const [activeTab, setActiveTab] = useState('questions');
  const [activePage, setActivePage] = useState<number | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormDefinition | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Fetch form data query
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/form-builder/forms/${formKey}`],
    retry: 1,
  });
  
  // Update page order mutation
  const updatePageOrderMutation = useMutation({
    mutationFn: (newOrder: { id: number; pageOrder: number }[]) =>
      apiRequest(`/api/form-builder/form-pages/reorder`, {
        method: 'POST',
        data: { pages: newOrder }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/form-builder/forms/${formKey}`] });
      toast({
        title: 'Pages reordered',
        description: 'The page order has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error reordering pages',
        description: 'There was a problem updating the page order.',
        variant: 'destructive',
      });
      console.error('Error reordering pages:', error);
    }
  });
  
  // Update question order mutation
  const updateQuestionOrderMutation = useMutation({
    mutationFn: ({ pageId, questions }: { pageId: number, questions: { id: number; displayOrder: number }[] }) =>
      apiRequest(`/api/form-builder/form-page-questions/reorder`, {
        method: 'POST',
        data: {
          formPageId: pageId,
          questions
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/form-builder/forms/${formKey}`] });
      toast({
        title: 'Questions reordered',
        description: 'The question order has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error reordering questions',
        description: 'There was a problem updating the question order.',
        variant: 'destructive',
      });
      console.error('Error reordering questions:', error);
    }
  });
  
  // Add question mutation
  const addQuestionMutation = useMutation({
    mutationFn: (questionData: any) =>
      apiRequest('/api/form-builder/form-page-questions', {
        method: 'POST',
        data: questionData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/form-builder/forms/${formKey}`] });
      setIsAddingQuestion(false);
      toast({
        title: 'Question added',
        description: 'The question has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error adding question',
        description: 'There was a problem adding the question.',
        variant: 'destructive',
      });
      console.error('Error adding question:', error);
    }
  });
  
  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: ({ questionId, questionData }: { questionId: number, questionData: any }) =>
      apiRequest(`/api/form-builder/form-page-questions/${questionId}`, {
        method: 'PATCH',
        data: questionData
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/form-builder/forms/${formKey}`] });
      setEditingQuestion(null);
      toast({
        title: 'Question updated',
        description: 'The question has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating question',
        description: 'There was a problem updating the question.',
        variant: 'destructive',
      });
      console.error('Error updating question:', error);
    }
  });
  
  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: number) =>
      apiRequest(`/api/form-builder/form-page-questions/${questionId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/form-builder/forms/${formKey}`] });
      toast({
        title: 'Question deleted',
        description: 'The question has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting question',
        description: 'There was a problem deleting the question.',
        variant: 'destructive',
      });
      console.error('Error deleting question:', error);
    }
  });
  
  // Update local form data when the API data changes
  useEffect(() => {
    if (data) {
      setFormData(data);
      
      // Set the first page as active if no active page is set
      if (!activePage && data.pages && data.pages.length > 0) {
        setActivePage(data.pages[0].id);
        setActivePageIndex(0);
      }
    }
  }, [data, activePage]);
  
  // Handle page tab change
  const handlePageChange = (pageId: number) => {
    const pageIndex = formData?.pages.findIndex(p => p.id === pageId) || 0;
    setActivePage(pageId);
    setActivePageIndex(pageIndex);
    setEditingQuestion(null);
  };
  
  // Handle drag end for page reordering
  const handlePageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !formData) {
      return;
    }
    
    const oldIndex = formData.pages.findIndex(p => p.id.toString() === active.id);
    const newIndex = formData.pages.findIndex(p => p.id.toString() === over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    
    // Create new order
    const newPages = [...formData.pages];
    const [movedPage] = newPages.splice(oldIndex, 1);
    newPages.splice(newIndex, 0, movedPage);
    
    // Update local state
    setFormData({
      ...formData,
      pages: newPages.map((page, index) => ({
        ...page,
        pageOrder: index
      }))
    });
    
    // Send update to server
    updatePageOrderMutation.mutate(
      newPages.map((page, index) => ({
        id: page.id,
        pageOrder: index
      }))
    );
  };
  
  // Handle drag end for question reordering
  const handleQuestionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !formData || !activePage) {
      return;
    }
    
    const currentPage = formData.pages.find(p => p.id === activePage);
    if (!currentPage) return;
    
    const oldIndex = currentPage.questions.findIndex(q => q.id.toString() === active.id);
    const newIndex = currentPage.questions.findIndex(q => q.id.toString() === over.id);
    
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }
    
    // Create new order
    const newQuestions = [...currentPage.questions];
    const [movedQuestion] = newQuestions.splice(oldIndex, 1);
    newQuestions.splice(newIndex, 0, movedQuestion);
    
    // Update local state
    const updatedPages = formData.pages.map(page => {
      if (page.id === activePage) {
        return {
          ...page,
          questions: newQuestions
        };
      }
      return page;
    });
    
    setFormData({
      ...formData,
      pages: updatedPages
    });
    
    // Send update to server
    updateQuestionOrderMutation.mutate({
      pageId: activePage,
      questions: newQuestions.map((question, index) => ({
        id: question.id,
        displayOrder: index
      }))
    });
  };
  
  // Handle adding a new question
  const handleAddQuestion = () => {
    if (!activePage) return;
    
    const newQuestion: Question = {
      id: 0, // Will be assigned by the server
      questionText: 'New Question',
      questionType: 'textbox',
      fieldKey: `question_${Date.now()}`,
      isRequired: false,
    };
    
    setEditingQuestion(newQuestion);
    setIsAddingQuestion(true);
  };
  
  // Handle editing a question
  const handleEditQuestion = (question: Question) => {
    setEditingQuestion({ ...question });
    setIsAddingQuestion(false);
  };
  
  // Handle deleting a question
  const handleDeleteQuestion = (questionId: number) => {
    if (confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      deleteQuestionMutation.mutate(questionId);
    }
  };
  
  // Handle saving question changes
  const handleSaveQuestion = (updatedQuestion: Question) => {
    if (!activePage) return;
    
    if (isAddingQuestion) {
      // Adding a new question
      const currentPage = formData?.pages.find(p => p.id === activePage);
      if (!currentPage) return;
      
      const questionData = {
        formPageId: activePage,
        displayOrder: currentPage.questions.length,
        displayTextOverride: updatedQuestion.questionText,
        isRequiredOverride: updatedQuestion.isRequired,
        questionData: {
          questionText: updatedQuestion.questionText,
          questionType: updatedQuestion.questionType,
          fieldKey: updatedQuestion.fieldKey,
          metadata: updatedQuestion.metadata || {},
          options: updatedQuestion.options || []
        }
      };
      
      addQuestionMutation.mutate(questionData);
    } else {
      // Updating an existing question
      if (!editingQuestion) return;
      
      const questionData = {
        displayTextOverride: updatedQuestion.questionText,
        isRequiredOverride: updatedQuestion.isRequired,
        questionData: {
          questionText: updatedQuestion.questionText,
          questionType: updatedQuestion.questionType,
          fieldKey: updatedQuestion.fieldKey,
          metadata: updatedQuestion.metadata || {},
          options: updatedQuestion.options || []
        }
      };
      
      updateQuestionMutation.mutate({
        questionId: editingQuestion.id,
        questionData
      });
    }
  };
  
  // Handle canceling question editing
  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setIsAddingQuestion(false);
  };
  
  // Navigation controls
  const goToPreviousPage = () => {
    if (activePageIndex > 0 && formData) {
      const prevPageId = formData.pages[activePageIndex - 1].id;
      handlePageChange(prevPageId);
    }
  };
  
  const goToNextPage = () => {
    if (formData && activePageIndex < formData.pages.length - 1) {
      const nextPageId = formData.pages[activePageIndex + 1].id;
      handlePageChange(nextPageId);
    }
  };
  
  // Go back to form list
  const handleBack = () => {
    setLocation('/form-builder');
  };
  
  // If loading or error
  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading form data...</p>
        </div>
      </div>
    );
  }
  
  if (error || !formData) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Error Loading Form</h2>
          <p className="mb-6">There was a problem loading the form data. Please try again.</p>
          <Button onClick={handleBack}>Back to Form List</Button>
        </div>
      </div>
    );
  }
  
  // Main form editor UI
  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              className="mr-2"
            >
              <ArrowLeft size={18} />
            </Button>
            <h1 className="text-2xl font-bold">{formData.form.title}</h1>
          </div>
          <p className="text-gray-500 mt-1">{formData.form.description}</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center">
            <Eye size={16} className="mr-2" />
            Preview
          </Button>
          <Button 
            variant="default" 
            className="flex items-center"
            disabled={isSaving}
          >
            <Save size={16} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>
      
      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="logic">Conditional Logic</TabsTrigger>
          <TabsTrigger value="settings">Form Settings</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>
        
        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <div className="grid grid-cols-5 gap-6">
            {/* Pages sidebar */}
            <div className="col-span-1">
              <div className="bg-gray-50 border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex justify-between items-center">
                  <span>Pages</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                    {formData.pages.length}
                  </span>
                </h3>
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handlePageDragEnd}
                >
                  <SortableContext
                    items={formData.pages.map(p => p.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {formData.pages.map(page => {
                        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
                          id: page.id.toString(),
                        });
                        
                        const style = {
                          transform: CSS.Transform.toString(transform),
                          transition,
                        };
                        
                        const isActive = page.id === activePage;
                        
                        return (
                          <div
                            key={page.id}
                            ref={setNodeRef}
                            style={style}
                            className={`p-2 border rounded flex items-center cursor-pointer
                              ${isActive ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-gray-300'}
                            `}
                            onClick={() => handlePageChange(page.id)}
                          >
                            <div
                              {...attributes}
                              {...listeners}
                              className="mr-2 text-gray-400 hover:text-gray-600 cursor-move touch-none"
                            >
                              <GripVertical size={16} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium truncate">{page.title}</p>
                              <p className="text-xs text-gray-500">
                                {page.questions.length} question{page.questions.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
                
                <div className="mt-4 pt-3 border-t">
                  <Button variant="outline" className="w-full flex items-center justify-center">
                    <Plus size={16} className="mr-1" /> Add Page
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Questions area */}
            <div className="col-span-4">
              {activePage && (
                <Card className="p-5">
                  {/* Page header */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-semibold">
                          {formData.pages.find(p => p.id === activePage)?.title}
                        </h2>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pencil size={15} />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Page {activePageIndex + 1} of {formData.pages.length}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={activePageIndex === 0}
                      >
                        <ArrowLeft size={16} className="mr-1" /> Previous
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={goToNextPage}
                        disabled={activePageIndex === formData.pages.length - 1}
                      >
                        Next <ArrowRight size={16} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  {/* Questions list */}
                  {editingQuestion ? (
                    <QuestionEditor
                      question={editingQuestion}
                      onSave={handleSaveQuestion}
                      onCancel={handleCancelEdit}
                    />
                  ) : (
                    <>
                      <div className="mb-4">
                        <Button onClick={handleAddQuestion}>
                          <Plus size={16} className="mr-1" /> Add Question
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        {formData.pages.find(p => p.id === activePage)?.questions.length === 0 ? (
                          <div className="text-center py-10 border border-dashed rounded-md">
                            <p className="text-gray-500 mb-4">This page has no questions yet.</p>
                            <Button onClick={handleAddQuestion}>
                              <Plus size={16} className="mr-1" /> Add First Question
                            </Button>
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleQuestionDragEnd}
                          >
                            <SortableContext
                              items={formData.pages
                                .find(p => p.id === activePage)
                                ?.questions.map(q => q.id.toString()) || []}
                              strategy={verticalListSortingStrategy}
                            >
                              {formData.pages
                                .find(p => p.id === activePage)
                                ?.questions.map(question => (
                                  <SortableQuestionItem
                                    key={question.id}
                                    question={question}
                                    onEdit={handleEditQuestion}
                                    onDelete={handleDeleteQuestion}
                                  />
                                ))}
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Other tabs - implemented minimally to focus on question editor functionality */}
        <TabsContent value="logic">
          <Card className="p-6 text-center">
            <h3 className="text-lg font-medium mb-4">Conditional Logic</h3>
            <p className="text-gray-600 mb-4">
              Set up rules to control what questions are shown based on previous answers.
            </p>
            <div className="border border-dashed rounded-md p-10">
              <p className="text-gray-500 mb-4">
                Conditional logic editor is under development.
              </p>
              <Button variant="outline">
                Create New Rule
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card className="p-6 text-center">
            <h3 className="text-lg font-medium mb-4">Form Settings</h3>
            <p className="text-gray-600 mb-4">
              Configure form behavior, appearance, and submission options.
            </p>
            <div className="border border-dashed rounded-md p-10">
              <p className="text-gray-500 mb-4">
                Form settings editor is under development.
              </p>
              <Button variant="outline">
                Edit Form Settings
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="validation">
          <Card className="p-6 text-center">
            <h3 className="text-lg font-medium mb-4">Validation Rules</h3>
            <p className="text-gray-600 mb-4">
              Set up custom validation rules for your form fields.
            </p>
            <div className="border border-dashed rounded-md p-10">
              <p className="text-gray-500 mb-4">
                Validation rules editor is under development.
              </p>
              <Button variant="outline">
                Add Validation Rule
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}