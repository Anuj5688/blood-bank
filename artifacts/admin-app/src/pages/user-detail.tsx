import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminGetUser,
  getAdminGetUserQueryKey,
  getAdminListUsersQueryKey,
  useAdminBlockUser,
  useAdminDeleteUser,
  useAdminResetUserPassword,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Props { id: number }

export function UserDetail({ id }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const { data: user, isLoading } = useAdminGetUser(id, {
    query: { enabled: !!id, queryKey: getAdminGetUserQueryKey(id) },
  });

  const blockUser = useAdminBlockUser();
  const deleteUser = useAdminDeleteUser();
  const resetPassword = useAdminResetUserPassword();

  function inv() {
    queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
  }

  function handleBlock() {
    if (!user) return;
    blockUser.mutate({ id, data: { blocked: !user.isBlocked } }, {
      onSuccess: () => { toast({ title: user.isBlocked ? "User unblocked" : "User blocked" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleDelete() {
    if (!user) return;
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    deleteUser.mutate({ id }, {
      onSuccess: () => { toast({ title: "User deleted" }); setLocation("/users"); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleResetPassword() {
    if (!newPassword || newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    resetPassword.mutate({ id, data: { newPassword } }, {
      onSuccess: () => { toast({ title: "Password reset" }); setShowReset(false); setNewPassword(""); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium">User not found</p>
        <Button variant="link" onClick={() => setLocation("/users")}>Back to users</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/users")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
            {user.isBlocked && <Badge variant="destructive">Blocked</Badge>}
          </div>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>User Information</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            ["Email", user.email],
            ["Phone", user.phone || "—"],
            ["Blood Group", user.bloodGroup || "—"],
            ["City", user.city || "—"],
            ["District", user.district || "—"],
            ["Account Status", user.isBlocked ? "Blocked" : "Active"],
            ["Last Login", user.lastLogin ? format(new Date(user.lastLogin), "PPp") : "Never"],
            ["Registered", format(new Date(user.createdAt), "PPp")],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-right">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant={user.isBlocked ? "default" : "outline"}
          onClick={handleBlock}
          disabled={blockUser.isPending}
        >
          {user.isBlocked ? "Unblock User" : "Block User"}
        </Button>
        <Button variant="outline" onClick={() => setShowReset(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Password
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={deleteUser.isPending}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete User
        </Button>
      </div>

      <Dialog open={showReset} onOpenChange={(o) => { if (!o) { setShowReset(false); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {user.name}.</DialogDescription>
          </DialogHeader>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetPassword.isPending}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
