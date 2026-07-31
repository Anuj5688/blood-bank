import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBloodRequest, getListUserBloodRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { BLOOD_GROUPS } from "@/lib/blood-utils";
import { Droplet } from "lucide-react";

const schema = z.object({
  bloodGroup: z.string().min(1, "Required"),
  units: z.coerce.number().int().min(1, "At least 1 unit"),
  urgency: z.enum(["normal", "urgent", "critical"]),
  patientName: z.string().min(1, "Required"),
  contactNumber: z.string().min(6, "Required"),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function RequestBloodDialog({ hospitalId, hospitalName }: { hospitalId: number; hospitalName: string }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, role, userName } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const create = useCreateBloodRequest();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bloodGroup: "",
      units: 1,
      urgency: "normal",
      patientName: userName ?? "",
      contactNumber: "",
      notes: "",
    },
  });

  function handleTriggerClick(e: React.MouseEvent) {
    if (!isAuthenticated || role !== "user") {
      e.preventDefault();
      toast({ title: "Please log in to request blood" });
      setLocation("/login");
    }
  }

  function onSubmit(values: FormData) {
    create.mutate(
      {
        data: {
          hospitalId,
          bloodGroup: values.bloodGroup,
          units: values.units,
          urgency: values.urgency,
          patientName: values.patientName,
          contactNumber: values.contactNumber,
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Request sent",
            description: `${hospitalName} has been notified of your request.`,
          });
          queryClient.invalidateQueries({ queryKey: getListUserBloodRequestsQueryKey() });
          setOpen(false);
          form.reset();
        },
        onError: () => toast({ title: "Failed to send request", variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" onClick={handleTriggerClick}>
          <Droplet className="w-4 h-4" /> Request Blood
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Blood from {hospitalName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Group</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BLOOD_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="units"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Units Needed</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="10-digit mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Ward, doctor's name, or any other details" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
