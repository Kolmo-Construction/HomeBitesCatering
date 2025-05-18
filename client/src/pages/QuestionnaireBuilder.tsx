import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

export default function QuestionnaireBuilder() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('definition');
  
  // Form state
  const [eventType, setEventType] = useState('corporate');
  const [isActive, setIsActive] = useState(true);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "Form Submitted",
      description: "The questionnaire has been saved successfully",
    });
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Corporate Event Questionnaire" />
                  <p className="text-sm text-muted-foreground">The name of your questionnaire</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="versionName">Version Name</Label>
                  <Input id="versionName" placeholder="v1.0" />
                  <p className="text-sm text-muted-foreground">The version of your questionnaire</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea 
                    id="description"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    placeholder="Questionnaire for corporate events" 
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">Detailed description of the questionnaire</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="private_party">Private Party</SelectItem>
                      <SelectItem value="food_truck">Food Truck</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">The type of event this questionnaire is for</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isActive" 
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="isActive">Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this questionnaire available for use
                    </p>
                  </div>
                </div>
                
                <Button type="submit">Create Questionnaire</Button>
              </form>
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pageTitle">Title</Label>
                  <Input id="pageTitle" placeholder="Event Details" />
                  <p className="text-sm text-muted-foreground">The title of the page</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pageDescription">Description</Label>
                  <textarea 
                    id="pageDescription"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    placeholder="Basic information about the event" 
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">Detailed description of the page</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="order">Order</Label>
                  <Input id="order" type="number" min={0} defaultValue={0} />
                  <p className="text-sm text-muted-foreground">The order of the page in the questionnaire</p>
                </div>
                
                <Button type="submit">Add Page</Button>
              </form>
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sectionTitle">Title</Label>
                  <Input id="sectionTitle" placeholder="Basic Information" />
                  <p className="text-sm text-muted-foreground">The title of the section</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sectionDescription">Description</Label>
                  <textarea 
                    id="sectionDescription"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                    placeholder="Core details about the event" 
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">Detailed description of the section</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="isTemplate" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="isTemplate">Template</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this section reusable as a template
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="templateKey">Template Key</Label>
                  <Input id="templateKey" placeholder="event_details" />
                  <p className="text-sm text-muted-foreground">A unique key to identify this template</p>
                </div>
                
                <Button type="submit">Add Section</Button>
              </form>
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="questionText">Question Text</Label>
                  <Input id="questionText" placeholder="What is the name of your event?" />
                  <p className="text-sm text-muted-foreground">The text of the question</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="questionKey">Question Key</Label>
                  <Input id="questionKey" placeholder="event_name" />
                  <p className="text-sm text-muted-foreground">A unique key to identify this question in responses</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="questionType">Question Type</Label>
                  <Select defaultValue="text">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a question type" />
                    </SelectTrigger>
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
                  <p className="text-sm text-muted-foreground">The type of question</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="isRequired" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="isRequired">Required</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this question required
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="helpText">Help Text</Label>
                  <Input id="helpText" placeholder="Please provide the name of your event" />
                  <p className="text-sm text-muted-foreground">Additional help text for the question</p>
                </div>
                
                <Button type="submit">Add Question</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}