import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminListUsers,
  getAdminListUsersQueryKey,
  useAdminBlockUser,
  useAdminDeleteUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function Users() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const LIMIT = 20;

  const params = {
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    page,
    limit: LIMIT,
  };

  const { data, isLoading } = useAdminListUsers(params, {
    query: { queryKey: getAdminListUsersQueryKey(params) },
  });

  const blockUser = useAdminBlockUser();
  const deleteUser = useAdminDeleteUser();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
  }

  function handleBlock(id: number, currentlyBlocked: boolean) {
    blockUser.mutate(
      { id, data: { blocked: !currentlyBlocked } },
      {
        onSuccess: () => { toast({ title: currentlyBlocked ? "User unblocked" : "User blocked" }); invalidate(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    deleteUser.mutate({ id }, {
      onSuccess: () => { toast({ title: "User deleted" }); invalidate(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registered Users</h1>
        <p className="text-muted-foreground">Manage public user accounts</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data && (
            <p className="text-sm text-muted-foreground mt-1">{data.total} user{data.total !== 1 ? "s" : ""} total</p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
            </div>
          )}
          {!isLoading && data && data.users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <UsersIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No users found</p>
            </div>
          )}
          {!isLoading && data && data.users.length > 0 && (
            <div className="divide-y">
              {data.users.map((user) => (
                <div key={user.id} className="flex flex-col gap-2 p-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{user.name}</span>
                      {user.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                      {user.bloodGroup && <Badge variant="outline">{user.bloodGroup}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {user.email}
                      {user.city && ` · ${user.city}`}
                      {user.phone && ` · ${user.phone}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setLocation(`/users/${user.id}`)}>
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant={user.isBlocked ? "default" : "outline"}
                      onClick={() => handleBlock(user.id, user.isBlocked)}
                    >
                      {user.isBlocked ? "Unblock" : "Block"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(user.id, user.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
