import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, PenIcon, TrashIcon, TagIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EventType {
  id: string;
  name: string;
  description?: string;
  menuCount: number;
}

export default function EventTypes() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch event types with menu counts
  const { data: eventTypes = [], isLoading } = useQuery({
    queryKey: ["/api/event-types"],
    queryFn: async () => {
      const response = await fetch("/api/event-types");
      if (!response.ok) throw new Error("Failed to fetch event types");
      return response.json();
    }
  });

  // Create event type mutation
  const createEventType = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("/api/event-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-types"] });
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "" });
      toast({
        title: "Success",
        description: "Event type created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event type",
        variant: "destructive"
      });
    }
  });

  // Update event type mutation
  const updateEventType = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string }) => {
      return apiRequest(`/api/event-types/${data.id}`, {
        name: data.name,
        description: data.description
      }, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-types"] });
      setEditingEventType(null);
      setFormData({ name: "", description: "" });
      toast({
        title: "Success",
        description: "Event type updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event type",
        variant: "destructive"
      });
    }
  });

  // Delete event type mutation
  const deleteEventType = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/event-types/${id}`, null, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-types"] });
      toast({
        title: "Success",
        description: "Event type deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event type",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Event type name is required",
        variant: "destructive"
      });
      return;
    }

    if (editingEventType) {
      updateEventType.mutate({
        id: editingEventType.id,
        name: formData.name,
        description: formData.description
      });
    } else {
      createEventType.mutate(formData);
    }
  };

  const openEditDialog = (eventType: EventType) => {
    setEditingEventType(eventType);
    setFormData({
      name: eventType.name,
      description: eventType.description || ""
    });
  };

  const closeEditDialog = () => {
    setEditingEventType(null);
    setFormData({ name: "", description: "" });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this event type? This action cannot be undone.")) {
      deleteEventType.mutate(id);
    }
  };

  const EventTypeForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Event Type Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Wedding, Corporate Event, Birthday Party"
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this event type"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={editingEventType ? closeEditDialog : () => setIsCreateDialogOpen(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createEventType.isPending || updateEventType.isPending}
          className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90"
        >
          {editingEventType ? "Update" : "Create"} Event Type
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-poppins text-3xl font-bold text-neutral-900">Event Types</h1>
          <p className="text-gray-600 mt-2">Manage event categories for your catering menus</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#4169E1] hover:opacity-90">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Event Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Event Type</DialogTitle>
              <DialogDescription>
                Add a new event type to categorize your menus
              </DialogDescription>
            </DialogHeader>
            <EventTypeForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventTypes.map((eventType: EventType) => (
          <Card key={eventType.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TagIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg capitalize">
                    {eventType.name.replace(/_/g, ' ')}
                  </CardTitle>
                </div>
                <Badge variant="secondary">
                  {eventType.menuCount} {eventType.menuCount === 1 ? 'menu' : 'menus'}
                </Badge>
              </div>
              {eventType.description && (
                <CardDescription>{eventType.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex justify-end space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(eventType)}
                >
                  <PenIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(eventType.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {eventTypes.length === 0 && (
        <div className="text-center py-12">
          <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No event types</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first event type.</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingEventType} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event Type</DialogTitle>
            <DialogDescription>
              Update the event type information
            </DialogDescription>
          </DialogHeader>
          <EventTypeForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}