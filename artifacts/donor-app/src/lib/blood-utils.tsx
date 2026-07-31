import { Badge } from "@/components/ui/badge";

export const getBloodGroupStatus = (units: number) => {
  if (units === 0) return "Out of Stock";
  if (units <= 5) return "Low Stock";
  return "Available";
};

export const getBloodGroupBadgeVariant = (units: number) => {
  if (units === 0) return "destructive";
  if (units <= 5) return "secondary"; // Will style as amber
  return "default"; // Will style as green
};

export const BloodStatusBadge = ({ units }: { units: number }) => {
  const status = getBloodGroupStatus(units);
  let className = "";
  if (units === 0) className = "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
  else if (units <= 5) className = "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100";
  else className = "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100";

  return <Badge variant="outline" className={className}>{status}</Badge>;
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
