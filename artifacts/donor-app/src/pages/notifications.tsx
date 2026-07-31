import { useGetPublicNotifications } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Bell, Info, Megaphone, CalendarHeart, MapPin, Clock } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  emergency: {
    label: "Emergency",
    icon: <AlertTriangle className="w-5 h-5" />,
    className: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
  },
  announcement: {
    label: "Announcement",
    icon: <Megaphone className="w-5 h-5" />,
    className: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30",
  },
  camp: {
    label: "Donation Camp",
    icon: <CalendarHeart className="w-5 h-5" />,
    className: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30",
  },
  general: {
    label: "General",
    icon: <Info className="w-5 h-5" />,
    className: "",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Notifications() {
  const { data: notifications, isLoading } = useGetPublicNotifications();

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Alerts &amp; Announcements</h1>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <Card className="text-center py-16">
            <CardContent>
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No active notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later for blood emergency alerts and platform updates.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && notifications && notifications.length > 0 && (
          <div className="space-y-4">
            {notifications.map((n) => {
              const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.general;
              return (
                <Card key={n.id} className={`border ${config.className}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-foreground">
                        <span className={n.type === "emergency" ? "text-red-600" : n.type === "announcement" ? "text-blue-600" : "text-muted-foreground"}>
                          {config.icon}
                        </span>
                        <CardTitle className="text-base">{n.title}</CardTitle>
                      </div>
                      <Badge
                        variant={n.type === "emergency" ? "destructive" : n.type === "camp" ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                    {n.type === "camp" && (n.campDate || n.campLocation) && (
                      <div className="flex items-center gap-4 flex-wrap mt-2 text-xs font-medium text-foreground">
                        {n.campDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />{formatDate(n.campDate)}
                          </span>
                        )}
                        {n.campLocation && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />{n.campLocation}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {n.publishedAt ? formatDate(n.publishedAt) : formatDate(n.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
