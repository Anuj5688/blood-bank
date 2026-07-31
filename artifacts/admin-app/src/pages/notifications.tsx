import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdminListNotifications,
  getAdminListNotificationsQueryKey,
  useAdminCreateNotification,
  useAdminUpdateNotification,
  useAdminDeleteNotification,
  useAdminPublishNotification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Send, Trash2, Edit, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  published: "default", draft: "secondary", archived: "outline", pending_review: "secondary", rejected: "destructive",
};

const TYPE_VARIANTS: Record<string, "destructive" | "default" | "secondary"> = {
  emergency: "destructive", announcement: "default", general: "secondary", camp: "default",
};

const schema = z.object({
  title: z.string().min(1, "Required"),
  message: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
  expiresAt: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  status: string;
  hospitalId?: number | null;
  hospitalName?: string | null;
  campDate?: string | null;
  campLocation?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export function Notifications() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NotificationItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useAdminListNotifications(undefined, {
    query: { queryKey: getAdminListNotificationsQueryKey() },
  });

  const create = useAdminCreateNotification();
  const update = useAdminUpdateNotification();
  const remove = useAdminDeleteNotification();
  const publish = useAdminPublishNotification();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", message: "", type: "general", expiresAt: "" },
  });

  function inv() {
    queryClient.invalidateQueries({ queryKey: getAdminListNotificationsQueryKey() });
  }

  function openCreate() {
    form.reset({ title: "", message: "", type: "general", expiresAt: "" });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(n: NotificationItem) {
    form.reset({
      title: n.title,
      message: n.message,
      type: n.type,
      expiresAt: n.expiresAt ? n.expiresAt.split("T")[0] : "",
    });
    setEditing(n);
    setShowForm(true);
  }

  function onSubmit(values: FormData) {
    const payload = {
      title: values.title,
      message: values.message,
      type: values.type,
      expiresAt: values.expiresAt || undefined,
    };

    if (editing) {
      update.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast({ title: "Updated" }); setShowForm(false); inv(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Created" }); setShowForm(false); inv(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    }
  }

  function handlePublish(id: number) {
    publish.mutate({ id }, {
      onSuccess: () => { toast({ title: "Published" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleReject(id: number) {
    update.mutate({ id, data: { status: "rejected" } }, {
      onSuccess: () => { toast({ title: "Rejected" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this notification?")) return;
    remove.mutate({ id }, {
      onSuccess: () => { toast({ title: "Deleted" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Create and manage platform-wide alerts and announcements</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Notification
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && notifications && notifications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first notification to alert platform users</p>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Notification</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && notifications && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{n.title}</span>
                      <Badge variant={STATUS_VARIANTS[n.status] ?? "secondary"}>{n.status.replace("_", " ")}</Badge>
                      <Badge variant={TYPE_VARIANTS[n.type] ?? "secondary"}>{n.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                    {n.type === "camp" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {n.hospitalName && <>Submitted by {n.hospitalName}</>}
                        {n.campDate && ` · Camp on ${format(new Date(n.campDate), "MMM d, yyyy")}`}
                        {n.campLocation && ` · ${n.campLocation}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(n.createdAt), "MMM d, yyyy")}
                      {n.publishedAt && ` · Published ${format(new Date(n.publishedAt), "MMM d")}`}
                      {n.expiresAt && ` · Expires ${format(new Date(n.expiresAt), "MMM d")}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    {(n.status === "draft" || n.status === "pending_review") && (
                      <Button size="sm" onClick={() => handlePublish(n.id)}>
                        <Send className="h-3 w-3 mr-1" />Publish
                      </Button>
                    )}
                    {n.status === "pending_review" && (
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleReject(n.id)}>
                        <X className="h-3 w-3 mr-1" />Reject
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(n)}>
                      <Edit className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(n.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Notification" : "New Notification"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expiresAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At (optional)</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editing ? "Save Changes" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
