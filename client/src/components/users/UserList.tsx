import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Unlock } from 'lucide-react';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
  lockedUntil?: string | null;
}

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
  onUnlock?: (userId: number) => void;
}

export function UserList({ users, onEdit, onDelete, onUnlock }: UserListProps) {
  const getRoleBadgeVariant = (role: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'user':
        return 'secondary';
      case 'client':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'user':
        return 'User (Read-Only)';
      case 'client':
        return 'Client';
      default:
        return role;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              {user.firstName} {user.lastName}
            </TableCell>
            <TableCell>{user.username}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(user.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              {user.lockedUntil && new Date(user.lockedUntil) > new Date() && onUnlock && (
                <Button
                  variant="ghost"
                  size="icon"
                  title={`Locked until ${new Date(user.lockedUntil).toLocaleString()}`}
                  onClick={() => onUnlock(user.id)}
                >
                  <Unlock className="h-4 w-4 text-amber-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(user)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(user.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
