import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsAdmin } from '@/hooks/usePermissions';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { UserList } from '@/components/users/UserList';
import { UserDialog } from '@/components/users/UserDialog';
import { InviteUserDialog } from '@/components/users/InviteUserDialog';

export default function Users() {
  const isAdmin = useIsAdmin();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Redirect non-admins
  if (!isAdmin) {
    setLocation('/');
    return null;
  }

  // Fetch users
  const { data: users, isLoading } = useQuery<any[]>({
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

  const unlockMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}/unlock`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unlock user');
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

  const handleUnlock = async (userId: number) => {
    try {
      await unlockMutation.mutateAsync(userId);
    } catch (error: any) {
      alert(error.message || 'Failed to unlock user');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInviteOpen(true)}>Invite user</Button>
          <Button onClick={handleCreate}>Create user</Button>
        </div>
      </div>

      {isLoading ? (
        <div>Loading users...</div>
      ) : (
        <UserList
          users={users || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUnlock={handleUnlock}
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

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => {
          setInviteOpen(false);
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        }}
      />
    </div>
  );
}
