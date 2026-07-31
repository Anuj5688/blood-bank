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
  if (units === 0) className = "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10";
  else if (units <= 5) className = "bg-caution/10 text-caution border-caution/20 hover:bg-caution/10";
  else className = "bg-verified/10 text-verified border-verified/20 hover:bg-verified/10";

  return <Badge variant="outline" className={className}>{status}</Badge>;
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
