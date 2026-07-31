import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplet } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-t-2 border-t-primary">
        <CardContent className="pt-8 pb-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Droplet className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            This page doesn't exist or may have moved.
          </p>
          <Link href="/dashboard">
            <Button className="mt-2">Back to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
