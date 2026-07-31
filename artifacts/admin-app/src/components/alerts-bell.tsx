import { useLocation } from "wouter";
import { Bell, Building2, CheckCheck } from "lucide-react";
import {
  useListAdminAlerts,
  useGetAdminAlertsUnreadCount,
  useMarkAdminAlertRead,
  useMarkAllAdminAlertsRead,
  getGetAdminAlertsUnreadCountQueryKey,
  getListAdminAlertsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AlertsBell() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: unread } = useGetAdminAlertsUnreadCount({
    query: { refetchInterval: 30000, queryKey: getGetAdminAlertsUnreadCountQueryKey() },
  });
  const alertsParams = { unreadOnly: false };
  const { data: alerts } = useListAdminAlerts(alertsParams, {
    query: { refetchInterval: 30000, queryKey: getListAdminAlertsQueryKey(alertsParams) },
  });

  const markRead = useMarkAdminAlertRead();
  const markAllRead = useMarkAllAdminAlertsRead();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetAdminAlertsUnreadCountQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListAdminAlertsQueryKey() });
  }

  function handleAlertClick(alertId: number, isRead: boolean, entityType: string | null | undefined, entityId: number | null | undefined) {
    if (!isRead) {
      markRead.mutate({ id: alertId }, { onSuccess: invalidate });
    }
    if (entityType === "hospital" && entityId) {
      setLocation(`/hospitals/${entityId}`);
    }
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, { onSuccess: invalidate });
  }

  const unreadCount = unread?.count ?? 0;
  const items = alerts ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Alerts">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Alerts</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No alerts yet</div>
          )}
          {items.map((alert) => (
            <button
              key={alert.id}
              onClick={() => handleAlertClick(alert.id, alert.isRead, alert.entityType, alert.entityId)}
              className={`flex w-full items-start gap-2 border-b px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60 ${!alert.isRead ? "bg-primary/5" : ""}`}
            >
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium leading-tight">{alert.title}</span>
                  {!alert.isRead && <Badge variant="default" className="h-4 px-1.5 text-[10px]">New</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(alert.createdAt)}</p>
              </div>
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
