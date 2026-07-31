import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useHospitalListNotifications,
  getHospitalListNotificationsQueryKey,
  useHospitalCreateNotification,
  useHospitalDeleteNotification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarHeart, Plus, Trash2, MapPin, Clock } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  published: "Live",
  pending_review: "Pending admin review",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  published: "default",
  pending_review: "secondary",
  rejected: "destructive",
  archived: "outline",
};

const schema = z.object({
  title: z.string().min(1, "Required"),
  message: z.string().min(1, "Required"),
  campDate: z.string().min(1, "Camp date is required"),
  campLocation: z.string().min(1, "Location is required"),
  expiresAt: z.string().optional(),
  publishNow: z.boolean(),
});
type FormData = z.infer<typeof schema>;

interface CampNotification {
  id: number;
  title: string;
  message: string;
  status: string;
  campDate?: string | null;
  campLocation?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export default function DashboardCampNotifications() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useHospitalListNotifications({
    query: { queryKey: getHospitalListNotificationsQueryKey() },
  });

  const create = useHospitalCreateNotification();
  const remove = useHospitalDeleteNotification();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", message: "", campDate: "", campLocation: "", expiresAt: "", publishNow: false },
  });

  function inv() {
    queryClient.invalidateQueries({ queryKey: getHospitalListNotificationsQueryKey() });
  }

  function openCreate() {
    form.reset({ title: "", message: "", campDate: "", campLocation: "", expiresAt: "", publishNow: false });
    setShowForm(true);
  }

  function onSubmit(values: FormData) {
    create.mutate(
      {
        data: {
          title: values.title,
          message: values.message,
          campDate: values.campDate,
          campLocation: values.campLocation,
          expiresAt: values.expiresAt || undefined,
          publishNow: values.publishNow,
        },
      },
      {
        onSuccess: (res) => {
          toast({
            title: values.publishNow ? "Camp notification published" : "Submitted for admin review",
            description: values.publishNow
              ? "Donors can now see this on their notifications feed."
              : "An admin will review this before it goes live.",
          });
          setShowForm(false);
          inv();
        },
        onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    if (!confirm("Retract this camp notification?")) return;
    remove.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Retracted" }); inv(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  }

  const items = (notifications ?? []) as CampNotification[];

  return (
    <ProtectedLayout requiredRole="hospital">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Blood Donation Camps</h1>
            <p className="text-muted-foreground mt-2">
              Announce a blood donation camp to donors. You can publish immediately or submit for admin review first.
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            New Camp Notification
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CalendarHeart className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No camp notifications yet</p>
              <p className="text-sm text-muted-foreground mb-4">Let donors know about your next blood donation camp</p>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Announce a Camp</Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((n) => (
              <Card
                key={n.id}
                className={cn(
                  "status-strip",
                  n.status === "published"
                    ? "status-strip-verified"
                    : n.status === "rejected"
                    ? "status-strip-neutral"
                    : "status-strip-caution"
                )}
              >
                <CardContent className="p-4 pl-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium">{n.title}</span>
                        <Badge variant={STATUS_VARIANTS[n.status] ?? "secondary"}>
                          {STATUS_LABELS[n.status] ?? n.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-2">
                        {n.campDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{format(new Date(n.campDate), "MMM d, yyyy")}
                          </span>
                        )}
                        {n.campLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{n.campLocation}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(n.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />Retract
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Announce a Blood Donation Camp</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Community Blood Donation Camp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Details</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Join us for a blood donation camp. All blood groups welcome..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="campDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Camp Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="campLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Main Auditorium, Sector 17" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Show donors until (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Leave blank to keep visible until you retract it.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="publishNow"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Publish immediately</FormLabel>
                        <FormDescription>
                          Off: an admin reviews it first. On: donors see it right away.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? "Submitting..." : form.watch("publishNow") ? "Publish Now" : "Submit for Review"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  );
}
