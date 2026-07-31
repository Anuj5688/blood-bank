import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PublicLayout } from "@/components/layout";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const loginMutation = useLogin();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    setError(null);
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token, res.role, res.hospitalId ?? null, res.name ?? null);
        if (res.role === "hospital") {
          setLocation("/dashboard");
        } else {
          setError("This login is for hospital accounts only.");
        }
      },
      onError: (err: any) => {
        setError(err?.data?.error || err?.message || "Invalid credentials");
      }
    });
  };

  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-t-2 border-t-primary">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-display font-bold tracking-tight">Hospital &amp; Blood Bank Login</CardTitle>
            <CardDescription>
              For registered hospitals and blood banks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="hospital@example.com" {...field} />
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
                <Button type="submit" className="w-full font-semibold" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Authenticating..." : "Sign In"}
                </Button>
              </form>
            </Form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New hospital or blood bank?{" "}
              <Link href="/register-hospital" className="font-medium text-primary hover:underline">
                Register here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
