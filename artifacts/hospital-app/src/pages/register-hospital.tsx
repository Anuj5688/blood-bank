import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { useRegisterHospital } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Building2, CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  licenseNumber: z.string().optional(),
  type: z.enum(["Hospital", "Blood Bank"]),
  ownership: z.enum(["Government", "Private"]),
  city: z.string().min(1, "City is required"),
  district: z.string().min(1, "District is required"),
  state: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  pinCode: z.string().optional(),
  contactPerson: z.string().min(2, "Contact person is required"),
  contactNumber: z.string().min(6, "Enter a valid contact number"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  website: z.string().optional(),
  workingHours: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function RegisterHospital() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerHospital = useRegisterHospital();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      registrationNumber: "",
      licenseNumber: "",
      type: "Hospital",
      ownership: "Private",
      city: "",
      district: "",
      state: "Punjab",
      address: "",
      pinCode: "",
      contactPerson: "",
      contactNumber: "",
      email: "",
      password: "",
      website: "",
      workingHours: "",
    },
  });

  function onSubmit(values: FormData) {
    registerHospital.mutate(
      {
        data: {
          name: values.name,
          registrationNumber: values.registrationNumber,
          licenseNumber: values.licenseNumber || undefined,
          type: values.type,
          ownership: values.ownership,
          city: values.city,
          district: values.district,
          state: values.state || undefined,
          address: values.address,
          pinCode: values.pinCode || undefined,
          contactPerson: values.contactPerson,
          contactNumber: values.contactNumber,
          email: values.email,
          password: values.password,
          website: values.website || undefined,
          workingHours: values.workingHours || undefined,
        },
      },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error;
          toast({
            title: "Registration failed",
            description: msg || "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  if (submitted) {
    return (
      <PublicLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg border-t-2 border-t-verified text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
              <h2 className="text-xl font-bold">Registration Submitted</h2>
              <p className="text-muted-foreground">
                Thanks for registering! Your application has been sent to our super admin
                for review. You'll be able to log in as soon as it's approved.
              </p>
              <Button className="w-full" onClick={() => setLocation("/")}>
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-10">
        <Card className="w-full max-w-2xl shadow-lg border-t-2 border-t-primary">
          <CardHeader className="space-y-1 text-center">
            <Building2 className="w-8 h-8 text-primary mx-auto mb-1" />
            <CardTitle className="text-2xl font-display font-bold tracking-tight">Register Your Hospital or Blood Bank</CardTitle>
            <CardDescription>
              Submit your details for admin review. You'll be notified once approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertDescription>
                After you submit, a super admin will review and approve or reject your
                application. You won't be able to log in until it's approved.
              </AlertDescription>
            </Alert>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Hospital / Blood Bank Name</FormLabel>
                        <FormControl>
                          <Input placeholder="City Care Hospital" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Hospital">Hospital</SelectItem>
                            <SelectItem value="Blood Bank">Blood Bank</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ownership"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ownership</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Government">Government</SelectItem>
                            <SelectItem value="Private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="REG-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Number (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="LIC-2024-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Ludhiana" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>District</FormLabel>
                        <FormControl>
                          <Input placeholder="Ludhiana" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pinCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN Code (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="141001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street, area, landmark" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Jane Doe" {...field} />
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
                          <Input placeholder="+91 98765 43210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@hospital.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Working Hours (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="24/7 or 9 AM - 6 PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full font-semibold" disabled={registerHospital.isPending}>
                  {registerHospital.isPending ? "Submitting..." : "Submit for Approval"}
                </Button>
              </form>
            </Form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Log in here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
