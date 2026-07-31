import { useEffect } from "react";
import { useLocation } from "wouter";
import { useListUserBloodRequests, getListUserBloodRequestsQueryKey, useCancelBloodRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { ProtectedLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Droplet, Building2, Phone, X } from "lucide-react";

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
  hospitalId: number;
  hospitalName?: string | null;
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

export default function MyRequests() {
  const { isAuthenticated, role } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || role !== "user") {
      setLocation("/login");
    }
  }, [isAuthenticated, role, setLocation]);

  const { data: requests, isLoading } = useListUserBloodRequests({
    query: { enabled: isAuthenticated && role === "user", queryKey: getListUserBloodRequestsQueryKey() },
  });

  const cancel = useCancelBloodRequest();

  function handleCancel(id: number) {
    if (!confirm("Cancel this blood request?")) return;
    cancel.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Request cancelled" });
          queryClient.invalidateQueries({ queryKey: getListUserBloodRequestsQueryKey() });
        },
        onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
      }
    );
  }

  if (!isAuthenticated || role !== "user") return null;

  const items = (requests ?? []) as RequestItem[];

  return (
    <ProtectedLayout requiredRole="user">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Blood Requests</h1>
          <p className="text-muted-foreground mt-1">Track requests you've sent to hospitals and blood banks</p>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Droplet className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No requests yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Browse hospitals and blood banks to send a request
              </p>
              <Button onClick={() => setLocation("/")}>Find a Hospital</Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-lg text-primary">{r.bloodGroup}</span>
                        <span className="text-sm text-muted-foreground">· {r.units} unit{r.units > 1 ? "s" : ""}</span>
                        <Badge variant={STATUS_VARIANTS[r.status] ?? "secondary"}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </Badge>
                        <Badge variant={URGENCY_VARIANTS[r.urgency] ?? "secondary"}>{r.urgency}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        {r.hospitalName ?? "Hospital"}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Phone className="h-3.5 w-3.5" />
                        {r.patientName} · {r.contactNumber}
                      </div>
                      {r.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{r.notes}</p>
                      )}
                      {r.hospitalResponse && (
                        <p className="text-sm mt-2 bg-gray-50 dark:bg-gray-900 border rounded-md p-2">
                          <span className="font-medium">Response: </span>{r.hospitalResponse}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Sent {format(new Date(r.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    {r.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleCancel(r.id)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
