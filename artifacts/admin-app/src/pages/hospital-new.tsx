import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAdminCreateHospital, getAdminListHospitalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Required"),
  registrationNumber: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
  ownership: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  district: z.string().min(1, "Required"),
  state: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  pinCode: z.string().optional(),
  contactPerson: z.string().min(1, "Required"),
  contactNumber: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  website: z.string().optional(),
  workingHours: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function HospitalNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createHospital = useAdminCreateHospital();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", registrationNumber: "", type: "Hospital", ownership: "Government",
      city: "", district: "", state: "Punjab", address: "", pinCode: "",
      contactPerson: "", contactNumber: "", email: "", password: "",
      website: "", workingHours: "",
    },
  });

  function onSubmit(values: FormData) {
    createHospital.mutate(
      {
        data: {
          ...values,
          pinCode: values.pinCode || undefined,
          website: values.website || undefined,
          workingHours: values.workingHours || undefined,
        },
      },
      {
        onSuccess: (hospital) => {
          queryClient.invalidateQueries({ queryKey: getAdminListHospitalsQueryKey() });
          toast({ title: "Hospital created", description: `${hospital.name} has been added.` });
          setLocation("/hospitals");
        },
        onError: () => toast({ title: "Failed to create hospital", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/hospitals")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Hospital</h1>
          <p className="text-muted-foreground">Admin-created hospitals are immediately approved</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hospital Information</CardTitle>
          <CardDescription>Fill in all required fields to register a new hospital or blood bank</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Hospital/Blood Bank Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Hospital">Hospital</SelectItem>
                      <SelectItem value="Blood Bank">Blood Bank</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ownership" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ownership</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="district" render={({ field }) => (
                <FormItem>
                  <FormLabel>District</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pinCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>PIN Code (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="workingHours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Working Hours (optional)</FormLabel>
                  <FormControl><Input placeholder="e.g. 24/7 or 8AM-8PM" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactPerson" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (login)</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (login)</FormLabel>
                  <FormControl><Input type="password" placeholder="Min 8 characters" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Website (optional)</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="sm:col-span-2 flex gap-3 pt-2">
                <Button type="submit" disabled={createHospital.isPending}>
                  {createHospital.isPending ? "Creating..." : "Create Hospital"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation("/hospitals")}>Cancel</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
