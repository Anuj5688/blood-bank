import { useState } from "react";
import {
  useListHospitalBloodRequests,
  getListHospitalBloodRequestsQueryKey,
  useRespondToBloodRequest,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Droplet, Phone, User, Check, X, CheckCheck } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  fulfilled: "Fulfilled",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  accepted: "default",
  fulfilled: "default",
  declined: "destructive",
  cancelled: "outline",
};

const URGENCY_VARIANTS: Record<string, "destructive" | "default" | "secondary"> = {
  critical: "destructive",
  urgent: "default",
  normal: "secondary",
};

interface RequestItem {
  id: number;
  userId: number;
  bloodGroup: string;
  units: number;
  urgency: string;
  patientName: string;
  contactNumber: string;
  notes?: string | null;
  status: string;
  hospitalResponse?: string | null;
  createdAt: string;
}

const FILTER_TABS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "all", label: "All" },
];

export default function DashboardBloodRequests() {
  const [filter, setFilter] = useState("pending");
  const [respondTarget, setRespondTarget] = useState<{ id: number; action: "accepted" | "fulfilled" | "declined" } | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useListHospitalBloodRequests(
    filter === "all" ? undefined : { status: filter },
    { query: { queryKey: getListHospitalBloodRequestsQueryKey(filter === "all" ? undefined : { status: filter }) } }
  );

  const respond = useRespondToBloodRequest();

  function inv() {
    queryClient.invalidateQueries({ queryKey: getListHospitalBloodRequestsQueryKey() });
  }

  function openRespond(id: number, action: "accepted" | "fulfilled" | "declined") {
    setResponseNote("");
    setRespondTarget({ id, action });
  }

  function submitResponse() {
    if (!respondTarget) return;
    respond.mutate(
      { id: respondTarget.id, data: { status: respondTarget.action, hospitalResponse: responseNote || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Request updated" });
          setRespondTarget(null);
          inv();
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  }

  const items = (requests ?? []) as RequestItem[];

  const actionLabel: Record<string, string> = {
    accepted: "Accept this request?",
    fulfilled: "Mark as fulfilled?",
    declined: "Decline this request?",
  };

  return (
    <ProtectedLayout requiredRole="hospital">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Blood Requests</h1>
          <p className="text-muted-foreground mt-2">
            Requests sent directly to you by donors and patients.
          </p>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            {FILTER_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Droplet className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No {filter === "all" ? "" : filter} requests</p>
              <p className="text-sm text-muted-foreground">Requests from donors will show up here</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((r) => (
              <Card
                key={r.id}
                className={cn(
                  "status-strip",
                  r.status === "fulfilled" || r.status === "accepted"
                    ? "status-strip-verified"
                    : r.status === "declined" || r.status === "cancelled"
                    ? "status-strip-neutral"
                    : r.urgency === "critical" || r.urgency === "urgent"
                    ? "status-strip-critical"
                    : "status-strip-caution"
                )}
              >
                <CardContent className="p-4 pl-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-semibold text-lg text-primary">{r.bloodGroup}</span>
                        <span className="text-sm text-muted-foreground">
                          · {r.units} unit{r.units > 1 ? "s" : ""}
                        </span>
                        <Badge variant={STATUS_VARIANTS[r.status] ?? "secondary"}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </Badge>
                        <Badge variant={URGENCY_VARIANTS[r.urgency] ?? "secondary"}>{r.urgency}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />{r.patientName}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Phone className="h-3.5 w-3.5" />
                        <a href={`tel:${r.contactNumber}`} className="hover:underline">{r.contactNumber}</a>
                      </div>
                      {r.notes && <p className="text-sm text-muted-foreground mt-2">{r.notes}</p>}
                      {r.hospitalResponse && (
                        <p className="text-sm mt-2 bg-gray-50 dark:bg-gray-900 border rounded-md p-2">
                          <span className="font-medium">Your response: </span>{r.hospitalResponse}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(r.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Button size="sm" onClick={() => openRespond(r.id, "accepted")}>
                          <Check className="h-3.5 w-3.5 mr-1" />Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openRespond(r.id, "declined")}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />Decline
                        </Button>
                      </div>
                    )}
                    {r.status === "accepted" && (
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Button size="sm" onClick={() => openRespond(r.id, "fulfilled")}>
                          <CheckCheck className="h-3.5 w-3.5 mr-1" />Mark Fulfilled
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!respondTarget} onOpenChange={(o) => { if (!o) setRespondTarget(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{respondTarget ? actionLabel[respondTarget.action] : ""}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="response-note">Note to donor (optional)</Label>
              <Textarea
                id="response-note"
                rows={3}
                placeholder="e.g. Please come to the blood bank counter with ID proof"
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRespondTarget(null)}>Cancel</Button>
              <Button onClick={submitResponse} disabled={respond.isPending}>
                {respond.isPending ? "Saving..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedLayout>
  );
}
