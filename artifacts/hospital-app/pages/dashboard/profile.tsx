import { useState, useEffect } from "react";
import { ProtectedLayout } from "@/components/layout";
import { useGetHospitalProfile, useUpdateHospitalProfile, useChangeHospitalPassword, getGetHospitalProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  contactPerson: z.string().optional(),
  contactNumber: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  pinCode: z.string().optional(),
  googleMapsLat: z.coerce.number().optional().or(z.literal("")),
  googleMapsLng: z.coerce.number().optional().or(z.literal("")),
  workingHours: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export default function DashboardProfile() {
  const { data: profile, isLoading } = useGetHospitalProfile();
  const updateProfile = useUpdateHospitalProfile();
  const changePassword = useChangeHospitalPassword();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      contactPerson: "",
      contactNumber: "",
      website: "",
      address: "",
      pinCode: "",
      googleMapsLat: "",
      googleMapsLng: "",
      workingHours: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        contactPerson: profile.contactPerson || "",
        contactNumber: profile.contactNumber || "",
        website: profile.website || "",
        address: profile.address || "",
        pinCode: profile.pinCode || "",
        googleMapsLat: profile.googleMapsLat || "",
        googleMapsLng: profile.googleMapsLng || "",
        workingHours: profile.workingHours || "",
      });
    }
  }, [profile, profileForm]);

  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    // Clean up empty strings for numbers
    const cleanData: any = { ...data };
    if (cleanData.googleMapsLat === "") delete cleanData.googleMapsLat;
    if (cleanData.googleMapsLng === "") delete cleanData.googleMapsLng;

    updateProfile.mutate({ data: cleanData }, {
      onSuccess: () => {
        toast({ title: "Profile Updated", description: "Your details have been saved." });
        queryClient.invalidateQueries({ queryKey: getGetHospitalProfileQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Update Failed", description: err?.message || "Failed to update profile", variant: "destructive" });
      }
    });
  };

  const onPasswordSubmit = (data: z.infer<typeof passwordSchema>) => {
    changePassword.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Password Changed", description: "Your password has been successfully updated." });
        passwordForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Change Failed", description: err?.message || "Failed to change password", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <ProtectedLayout requiredRole="hospital">
        <div className="flex justify-center items-center h-64">Loading profile...</div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout requiredRole="hospital">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your organization details and security.</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">General Details</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>Update contact information and location. Some fields require admin approval to change.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Organization Name (Read-only)</label>
                        <Input value={profile?.name || ""} disabled />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">Registration Number (Read-only)</label>
                        <Input value={profile?.registrationNumber || ""} disabled />
                      </div>

                      <FormField control={profileForm.control} name="contactPerson" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={profileForm.control} name="contactNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Number</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={profileForm.control} name="website" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={profileForm.control} name="workingHours" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Working Hours</FormLabel>
                          <FormControl><Input placeholder="24/7 or 9 AM - 5 PM" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium">Location</h3>
                      <FormField control={profileForm.control} name="address" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={profileForm.control} name="pinCode" render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIN Code</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={profileForm.control} name="googleMapsLat" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude (Maps)</FormLabel>
                            <FormControl><Input type="number" step="any" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={profileForm.control} name="googleMapsLng" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude (Maps)</FormLabel>
                            <FormControl><Input type="number" step="any" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <Button type="submit" disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
                    <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={changePassword.isPending}>
                      {changePassword.isPending ? "Changing..." : "Change Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedLayout>
  );
}
