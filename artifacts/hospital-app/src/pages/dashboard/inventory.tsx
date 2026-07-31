import { useState } from "react";
import { ProtectedLayout } from "@/components/layout";
import { useGetHospitalInventory, useUpdateBloodStock, getGetHospitalInventoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BloodStatusBadge, BLOOD_GROUPS } from "@/lib/blood-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Save, AlertCircle } from "lucide-react";

export default function DashboardInventory() {
  const { data: inventory, isLoading } = useGetHospitalInventory();
  const updateStock = useUpdateBloodStock();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [localUnits, setLocalUnits] = useState<Record<string, number>>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);

  const handleUnitChange = (group: string, value: string) => {
    const units = parseInt(value, 10);
    if (!isNaN(units) && units >= 0) {
      setLocalUnits({ ...localUnits, [group]: units });
    } else if (value === "") {
      setLocalUnits({ ...localUnits, [group]: 0 });
    }
  };

  const handleSave = (group: string) => {
    const units = localUnits[group];
    if (units === undefined) return;

    setSavingGroup(group);
    updateStock.mutate({
      bloodGroup: group,
      data: { units }
    }, {
      onSuccess: () => {
        toast({
          title: "Stock Updated",
          description: `Successfully updated inventory for ${group}`,
        });
        queryClient.invalidateQueries({ queryKey: getGetHospitalInventoryQueryKey() });
        setSavingGroup(null);
        // Clear local state to fallback to server state
        const newLocal = { ...localUnits };
        delete newLocal[group];
        setLocalUnits(newLocal);
      },
      onError: () => {
        toast({
          title: "Update Failed",
          description: `Failed to update inventory for ${group}`,
          variant: "destructive"
        });
        setSavingGroup(null);
      }
    });
  };

  const getDisplayUnits = (group: string) => {
    if (localUnits[group] !== undefined) return localUnits[group];
    const item = inventory?.find(i => i.bloodGroup === group);
    return item ? item.units : 0;
  };

  const getHasChanges = (group: string) => {
    const item = inventory?.find(i => i.bloodGroup === group);
    const serverUnits = item ? item.units : 0;
    return localUnits[group] !== undefined && localUnits[group] !== serverUnits;
  };

  if (isLoading) {
    return (
      <ProtectedLayout requiredRole="hospital">
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading inventory...</div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout requiredRole="hospital">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Blood Inventory</h1>
          <p className="text-muted-foreground mt-2">Manage your current blood stock levels. Updates reflect immediately on the public portal.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Current Stock</CardTitle>
            <CardDescription>Update available units for each blood group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Blood Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Units Available</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {BLOOD_GROUPS.map((group) => {
                    const item = inventory?.find(i => i.bloodGroup === group);
                    const units = getDisplayUnits(group);
                    const hasChanges = getHasChanges(group);
                    
                    return (
                      <TableRow key={group}>
                        <TableCell
                          className={cn(
                            "status-strip font-mono font-semibold text-primary text-lg pl-5",
                            units === 0 ? "status-strip-critical" : units <= 5 ? "status-strip-caution" : "status-strip-verified"
                          )}
                        >
                          {group}
                        </TableCell>
                        <TableCell>
                          <BloodStatusBadge units={units} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center w-24">
                            <Input 
                              type="number" 
                              min="0"
                              value={units}
                              onChange={(e) => handleUnitChange(group, e.target.value)}
                              className="w-full font-mono text-center"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item?.lastUpdated ? format(new Date(item.lastUpdated), "MMM d, yyyy HH:mm") : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            disabled={!hasChanges || savingGroup === group}
                            onClick={() => handleSave(group)}
                            variant={hasChanges ? "default" : "secondary"}
                          >
                            {savingGroup === group ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save</>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
