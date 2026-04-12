import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsAdmin } from '@/hooks/usePermissions';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { UserList } from '@/components/users/UserList';
import { UserDialog } from '@/components/users/UserDialog';

export default function Users() {
  const isAdmin = useIsAdmin();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Redirect non-admins
  if (!isAdmin) {
    setLocation('/');
    return null;
  }

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
  });

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleDelete = async (userId: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteMutation.mutateAsync(userId);
      } catch (error: any) {
        alert(error.message || 'Failed to delete user');
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={handleCreate}>Create User</Button>
      </div>

      {isLoading ? (
        <div>Loading users...</div>
      ) : (
        <UserList
          users={users || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        onSuccess={() => {
          setDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        }}
      />
    </div>
  );
}
