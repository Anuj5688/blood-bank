import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminListHospitals,
  getAdminListHospitalsQueryKey,
  useApproveHospital,
  useRejectHospital,
  useSuspendHospital,
  useActivateHospital,
  useAdminDeleteHospital,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  suspended: "outline",
};

export function Hospitals() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const params = {
    ...(search ? { search } : {}),
    ...(status && status !== "all" ? { status } : {}),
  };

  const { data: hospitals, isLoading } = useAdminListHospitals(params, {
    query: { queryKey: getAdminListHospitalsQueryKey(params) },
  });

  const approve = useApproveHospital();
  const reject = useRejectHospital();
  const suspend = useSuspendHospital();
  const activate = useActivateHospital();
  const deleteHospital = useAdminDeleteHospital();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getAdminListHospitalsQueryKey() });
  }

  function handleApprove(id: number) {
    approve.mutate({ id }, {
      onSuccess: () => { toast({ title: "Hospital approved" }); invalidate(); },
      onError: () => toast({ title: "Failed to approve", variant: "destructive" }),
    });
  }

  function handleReject(id: number) {
    if (!rejectReason.trim()) return;
    reject.mutate({ id, data: { reason: rejectReason } }, {
      onSuccess: () => {
        toast({ title: "Hospital rejected" });
        setRejectId(null);
        setRejectReason("");
        invalidate();
      },
      onError: () => toast({ title: "Failed to reject", variant: "destructive" }),
    });
  }

  function handleSuspend(id: number) {
    suspend.mutate({ id }, {
      onSuccess: () => { toast({ title: "Hospital suspended" }); invalidate(); },
      onError: () => toast({ title: "Failed to suspend", variant: "destructive" }),
    });
  }

  function handleActivate(id: number) {
    activate.mutate({ id }, {
      onSuccess: () => { toast({ title: "Hospital activated" }); invalidate(); },
      onError: () => toast({ title: "Failed to activate", variant: "destructive" }),
    });
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteHospital.mutate({ id }, {
      onSuccess: () => { toast({ title: "Hospital deleted" }); invalidate(); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospitals & Blood Banks</h1>
          <p className="text-muted-foreground">Manage registrations, approvals, and status</p>
        </div>
        <Button onClick={() => setLocation("/hospitals/new")} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Hospital
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or city..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}
            </div>
          )}
          {!isLoading && hospitals && hospitals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No hospitals found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
          {!isLoading && hospitals && hospitals.length > 0 && (
            <div className="divide-y">
              {hospitals.map((h) => (
                <div key={h.id} className="flex flex-col gap-2 p-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-medium hover:text-primary cursor-pointer"
                        onClick={() => setLocation(`/hospitals/${h.id}`)}
                      >
                        {h.name}
                      </span>
                      <Badge variant={STATUS_VARIANTS[h.approvalStatus] ?? "secondary"}>
                        {h.approvalStatus}
                      </Badge>
                      <Badge variant="outline">{h.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {h.city}, {h.district} &nbsp;·&nbsp; {h.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {h.approvalStatus === "pending" && (
                      <>
                        <Button size="sm" variant="default" onClick={() => handleApprove(h.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectId(h.id)}>Reject</Button>
                      </>
                    )}
                    {h.approvalStatus === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => handleSuspend(h.id)}>Suspend</Button>
                    )}
                    {h.approvalStatus === "suspended" && (
                      <Button size="sm" variant="outline" onClick={() => handleActivate(h.id)}>Activate</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setLocation(`/hospitals/${h.id}`)}>Details</Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(h.id, h.name)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectId !== null} onOpenChange={(o) => { if (!o) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Hospital</DialogTitle>
            <DialogDescription>Provide a reason that will be visible to the hospital.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectId && handleReject(rejectId)} disabled={!rejectReason.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
