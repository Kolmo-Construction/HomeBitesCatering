import { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Form, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

// Define the schema for a questionnaire definition
const questionnaireDefinitionSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
  versionName: z.string().min(1, { message: 'Version name is required' }),
  description: z.string().optional(),
  eventType: z.enum(['corporate', 'wedding', 'birthday', 'engagement', 'private_party', 'food_truck']),
  isActive: z.boolean().default(true)
});

// Define the type from the schema
type QuestionnaireDefinitionValues = z.infer<typeof questionnaireDefinitionSchema>;

// Define the schema for a page
const pageSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }),
  description: z.string().optional(),
  order: z.number().min(0)
});

// Define the type from the schema
type PageValues = z.infer<typeof pageSchema>;

// Define the schema for a section
const sectionSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }),
  description: z.string().optional(),
  isTemplate: z.boolean().default(false),
  templateKey: z.string().optional()
});

// Define the type from the schema
type SectionValues = z.infer<typeof sectionSchema>;

// Define the schema for a question
const questionSchema = z.object({
  text: z.string().min(3, { message: 'Question text must be at least 3 characters' }),
  questionKey: z.string().min(1, { message: 'Question key is required' }),
  questionType: z.enum(['text', 'number', 'email', 'radio', 'checkbox', 'date', 'matrix_single']),
  isRequired: z.boolean().default(false),
  helpText: z.string().optional()
});

// Define the type from the schema
type QuestionValues = z.infer<typeof questionSchema>;

export default function QuestionnaireCreator() {
  const [activeTab, setActiveTab] = useState('definition');
  
  // Form for questionnaire definition
  const definitionForm = useForm<QuestionnaireDefinitionValues>({
    resolver: zodResolver(questionnaireDefinitionSchema),
    defaultValues: {
      name: '',
      versionName: 'v1.0',
      description: '',
      eventType: 'corporate',
      isActive: true
    }
  });
  
  // Form for page
  const pageForm = useForm<PageValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      title: '',
      description: '',
      order: 0
    }
  });
  
  // Form for section
  const sectionForm = useForm<SectionValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      title: '',
      description: '',
      isTemplate: false,
      templateKey: ''
    }
  });
  
  // Form for question
  const questionForm = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      text: '',
      questionKey: '',
      questionType: 'text',
      isRequired: false,
      helpText: ''
    }
  });
  
  // Handle form submissions
  const onDefinitionSubmit = (data: QuestionnaireDefinitionValues) => {
    console.log('Definition submitted:', data);
    // Would call API here in a real implementation
    alert('Questionnaire definition created successfully!');
  };
  
  const onPageSubmit = (data: PageValues) => {
    console.log('Page submitted:', data);
    // Would call API here in a real implementation
    alert('Page added successfully!');
  };
  
  const onSectionSubmit = (data: SectionValues) => {
    console.log('Section submitted:', data);
    // Would call API here in a real implementation
    alert('Section added successfully!');
  };
  
  const onQuestionSubmit = (data: QuestionValues) => {
    console.log('Question submitted:', data);
    // Would call API here in a real implementation
    alert('Question added successfully!');
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Questionnaire Builder</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="definition">Definition</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>
        
        {/* Definition Tab */}
        <TabsContent value="definition">
          <Card>
            <CardHeader>
              <CardTitle>Create Questionnaire Definition</CardTitle>
              <CardDescription>
                Define the basic information for your questionnaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...definitionForm}>
                <form onSubmit={definitionForm.handleSubmit(onDefinitionSubmit)} className="space-y-6">
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="Corporate Event Questionnaire" 
                        {...definitionForm.register('name')}
                      />
                    </FormControl>
                    <FormDescription>The name of your questionnaire</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Version Name</FormLabel>
                    <FormControl>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="v1.0" 
                        {...definitionForm.register('versionName')}
                      />
                    </FormControl>
                    <FormDescription>The version of your questionnaire</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea 
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="Questionnaire for corporate events" 
                        rows={3}
                        {...definitionForm.register('description')}
                      />
                    </FormControl>
                    <FormDescription>Detailed description of the questionnaire</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select 
                      onValueChange={(value) => definitionForm.setValue('eventType', value as any)} 
                      defaultValue={definitionForm.getValues('eventType')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corporate">Corporate Event</SelectItem>
                        <SelectItem value="wedding">Wedding</SelectItem>
                        <SelectItem value="birthday">Birthday</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="private_party">Private Party</SelectItem>
                        <SelectItem value="food_truck">Food Truck</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>The type of event this questionnaire is for</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={definitionForm.getValues('isActive')}
                        onCheckedChange={(checked) => definitionForm.setValue('isActive', checked as boolean)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Make this questionnaire available for use
                      </FormDescription>
                    </div>
                  </FormItem>
                  
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
                  >
                    Create Questionnaire
                  </button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pages Tab */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Add Page</CardTitle>
              <CardDescription>
                Add a new page to your questionnaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pageForm}>
                <form onSubmit={pageForm.handleSubmit(onPageSubmit)} className="space-y-6">
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="Event Details" 
                        {...pageForm.register('title')}
                      />
                    </FormControl>
                    <FormDescription>The title of the page</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea 
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="Basic information about the event" 
                        rows={3}
                        {...pageForm.register('description')}
                      />
                    </FormControl>
                    <FormDescription>Detailed description of the page</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <input 
                        type="number" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        min={0}
                        {...pageForm.register('order', { valueAsNumber: true })}
                      />
                    </FormControl>
                    <FormDescription>The order of the page in the questionnaire</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
                  >
                    Add Page
                  </button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sections Tab */}
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle>Add Section</CardTitle>
              <CardDescription>
                Add a new section to your questionnaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...sectionForm}>
                <form onSubmit={sectionForm.handleSubmit(onSectionSubmit)} className="space-y-6">
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="Basic Information" 
                        {...sectionForm.register('title')}
                      />
                    </FormControl>
                    <FormDescription>The title of the section</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea 
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="Core details about the event" 
                        rows={3}
                        {...sectionForm.register('description')}
                      />
                    </FormControl>
                    <FormDescription>Detailed description of the section</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Switch 
                        checked={sectionForm.getValues('isTemplate')}
                        onCheckedChange={(checked) => {
                          sectionForm.setValue('isTemplate', checked);
                          // Clear template key if not a template
                          if (!checked) {
                            sectionForm.setValue('templateKey', '');
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Template</FormLabel>
                      <FormDescription>
                        Make this section reusable as a template
                      </FormDescription>
                    </div>
                  </FormItem>
                  
                  {sectionForm.getValues('isTemplate') && (
                    <FormItem>
                      <FormLabel>Template Key</FormLabel>
                      <FormControl>
                        <input 
                          type="text" 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                          placeholder="event_details" 
                          {...sectionForm.register('templateKey')}
                        />
                      </FormControl>
                      <FormDescription>A unique key to identify this template</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                  
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
                  >
                    Add Section
                  </button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Add Question</CardTitle>
              <CardDescription>
                Add a new question to your questionnaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...questionForm}>
                <form onSubmit={questionForm.handleSubmit(onQuestionSubmit)} className="space-y-6">
                  <FormItem>
                    <FormLabel>Question Text</FormLabel>
                    <FormControl>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="What is the name of your event?" 
                        {...questionForm.register('text')}
                      />
                    </FormControl>
                    <FormDescription>The text of the question</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Question Key</FormLabel>
                    <FormControl>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="event_name" 
                        {...questionForm.register('questionKey')}
                      />
                    </FormControl>
                    <FormDescription>A unique key to identify this question in responses</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Select 
                      onValueChange={(value) => questionForm.setValue('questionType', value as any)} 
                      defaultValue={questionForm.getValues('questionType')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a question type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="radio">Multiple Choice (Single)</SelectItem>
                        <SelectItem value="checkbox">Multiple Choice (Multiple)</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="matrix_single">Matrix (Single)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>The type of question</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={questionForm.getValues('isRequired')}
                        onCheckedChange={(checked) => questionForm.setValue('isRequired', checked as boolean)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Required</FormLabel>
                      <FormDescription>
                        Make this question required
                      </FormDescription>
                    </div>
                  </FormItem>
                  
                  <FormItem>
                    <FormLabel>Help Text</FormLabel>
                    <FormControl>
                      <input 
                        type="text" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                        placeholder="Please provide the name of your event" 
                        {...questionForm.register('helpText')}
                      />
                    </FormControl>
                    <FormDescription>Additional help text for the question</FormDescription>
                    <FormMessage />
                  </FormItem>
                  
                  <button 
                    type="submit" 
                    className="bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 rounded-md"
                  >
                    Add Question
                  </button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}