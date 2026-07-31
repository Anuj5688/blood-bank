import { ProtectedLayout } from "@/components/layout";
import { useGetInventoryHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function DashboardHistory() {
  const { data: history, isLoading } = useGetInventoryHistory();

  if (isLoading) {
    return (
      <ProtectedLayout requiredRole="hospital">
        <div className="flex items-center justify-center h-64">Loading history...</div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout requiredRole="hospital">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Update History</h1>
          <p className="text-muted-foreground mt-2">Audit trail of all your blood stock updates.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
            <CardDescription>A chronological record of inventory changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Blood Group</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((item) => {
                    const diff = item.unitsAfter - item.unitsBefore;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">{item.bloodGroup}</TableCell>
                        <TableCell className="capitalize">{item.action}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{item.unitsBefore}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{item.unitsAfter}</span>
                            {diff !== 0 && (
                              <span className={`text-xs ml-2 flex items-center font-bold ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(diff)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {item.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {history?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No update history found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
