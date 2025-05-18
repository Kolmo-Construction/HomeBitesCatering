import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { insertRawLeadSchema } from '@/../../shared/schema';
import { useToast } from '@/hooks/use-toast';

// Extend the schema to add form validation rules
const formSchema = insertRawLeadSchema.extend({
  extractedProspectEmail: z.string().email().optional().or(z.literal('')),
  extractedProspectPhone: z.string().optional().or(z.literal('')),
  eventSummary: z.string().min(3, {
    message: 'Event summary must be at least 3 characters long',
  }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export default function RawLeadForm() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: 'manual',
      status: 'new',
      extractedProspectName: '',
      extractedProspectEmail: '',
      extractedProspectPhone: '',
      eventSummary: '',
      notes: '',
      rawData: {},
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await fetch('/api/raw-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create lead');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'New lead created successfully',
      });
      navigate(`/raw-leads/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    // Add the current date as receivedAt
    const submissionData = {
      ...data,
      receivedAt: new Date().toISOString(),
    };
    mutation.mutate(submissionData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Incoming Lead</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="extractedProspectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prospect Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extractedProspectEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prospect Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extractedProspectPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prospect Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual Entry</SelectItem>
                        <SelectItem value="web_form">Web Form</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                        <SelectItem value="junk">Junk</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="eventSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Summary</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Wedding reception, Corporate dinner, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description of the event they're inquiring about
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details or notes about this lead..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/raw-leads')}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save Lead'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}