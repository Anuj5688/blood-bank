import { useState } from "react";
import { useLocation } from "wouter";
import {
  useAdminGetHospital,
  getAdminGetHospitalQueryKey,
  getAdminListHospitalsQueryKey,
  useApproveHospital,
  useRejectHospital,
  useSuspendHospital,
  useActivateHospital,
  useAdminDeleteHospital,
  useAdminResetPassword,
  useAdminUpdateHospital,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, AlertTriangle, RefreshCw, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default", pending: "secondary", rejected: "destructive", suspended: "outline",
};

function bloodStatusColor(status: string) {
  if (status === "Available") return "text-green-600";
  if (status === "Low Stock") return "text-amber-600";
  return "text-red-600";
}

interface Props { id: number }

export function HospitalDetail({ id }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showReset, setShowReset] = useState(false);

  const { data: hospital, isLoading } = useAdminGetHospital(id, {
    query: { enabled: !!id, queryKey: getAdminGetHospitalQueryKey(id) },
  });

  const approve = useApproveHospital();
  const reject = useRejectHospital();
  const suspend = useSuspendHospital();
  const activate = useActivateHospital();
  const deleteHospital = useAdminDeleteHospital();
  const resetPassword = useAdminResetPassword();

  function inv() {
    queryClient.invalidateQueries({ queryKey: getAdminGetHospitalQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getAdminListHospitalsQueryKey() });
  }

  function handleApprove() {
    approve.mutate({ id }, {
      onSuccess: () => { toast({ title: "Approved" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) return;
    reject.mutate({ id, data: { reason: rejectReason } }, {
      onSuccess: () => { toast({ title: "Rejected" }); setShowReject(false); setRejectReason(""); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleSuspend() {
    suspend.mutate({ id }, {
      onSuccess: () => { toast({ title: "Suspended" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleActivate() {
    activate.mutate({ id }, {
      onSuccess: () => { toast({ title: "Activated" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleDelete() {
    if (!hospital) return;
    if (!confirm(`Delete "${hospital.name}"? This cannot be undone.`)) return;
    deleteHospital.mutate({ id }, {
      onSuccess: () => { toast({ title: "Deleted" }); setLocation("/hospitals"); },
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
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="font-medium text-lg">Hospital not found</p>
        <Button variant="link" onClick={() => setLocation("/hospitals")}>Back to list</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/hospitals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{hospital.name}</h1>
              <Badge variant={STATUS_VARIANTS[hospital.approvalStatus] ?? "secondary"}>{hospital.approvalStatus}</Badge>
              <Badge variant="outline">{hospital.type}</Badge>
            </div>
            <p className="text-muted-foreground">{hospital.city}, {hospital.district}, {hospital.state}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {hospital.approvalStatus === "pending" && (
            <>
              <Button size="sm" onClick={handleApprove}><Check className="h-3 w-3 mr-1" />Approve</Button>
              <Button size="sm" variant="destructive" onClick={() => setShowReject(true)}><X className="h-3 w-3 mr-1" />Reject</Button>
            </>
          )}
          {hospital.approvalStatus === "approved" && (
            <Button size="sm" variant="outline" onClick={handleSuspend}><AlertTriangle className="h-3 w-3 mr-1" />Suspend</Button>
          )}
          {hospital.approvalStatus === "suspended" && (
            <Button size="sm" variant="outline" onClick={handleActivate}><Check className="h-3 w-3 mr-1" />Activate</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowReset(true)}><RefreshCw className="h-3 w-3 mr-1" />Reset Password</Button>
          <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Contact Person</span><span>{hospital.contactPerson || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{hospital.contactNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{hospital.email}</span></div>
            {hospital.website && <div className="flex justify-between"><span className="text-muted-foreground">Website</span><a href={hospital.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{hospital.website}</a></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Facility Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Ownership</span><span>{hospital.ownership}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reg. Number</span><span>{hospital.registrationNumber || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-right max-w-[200px]">{hospital.address}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">PIN Code</span><span>{hospital.pinCode || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Working Hours</span><span>{hospital.workingHours || "—"}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Blood Inventory</CardTitle></CardHeader>
        <CardContent>
          {!hospital.bloodInventory || hospital.bloodInventory.length === 0 ? (
            <p className="text-muted-foreground text-sm">No inventory data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blood Group</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hospital.bloodInventory.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.bloodGroup}</TableCell>
                    <TableCell className="text-right">{inv.units}</TableCell>
                    <TableCell>
                      <span className={bloodStatusColor(inv.status)}>{inv.status}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inv.lastUpdated).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {hospital.rejectionReason && (
        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-destructive">Rejection Reason</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{hospital.rejectionReason}</p></CardContent>
        </Card>
      )}

      <Dialog open={showReject} onOpenChange={(o) => { if (!o) { setShowReject(false); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Hospital</DialogTitle>
            <DialogDescription>Provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReset} onOpenChange={(o) => { if (!o) { setShowReset(false); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Hospital Password</DialogTitle>
            <DialogDescription>Set a new password for {hospital.name}.</DialogDescription>
          </DialogHeader>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetPassword.isPending}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
