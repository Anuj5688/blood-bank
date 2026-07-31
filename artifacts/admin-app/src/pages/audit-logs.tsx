import { useState } from "react";
import { useGetAuditLogs, getGetAuditLogsQueryKey } from "@workspace/api-client-react";
import { FileText, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  approve: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  reject: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  create: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  update: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  suspend: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  activate: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  register: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

function actionColor(action: string): string {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

export function AuditLogs() {
  const [actionFilter, setActionFilter] = useState("");

  const params = {
    action: actionFilter || undefined,
    limit: 100,
  };

  const { data: logs, isLoading } = useGetAuditLogs(params, {
    query: { queryKey: getGetAuditLogsQueryKey(params) },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">Track all administrative actions on the platform</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by action..."
              className="pl-9"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-14 w-full rounded" />)}
            </div>
          )}
          {!isLoading && (!logs || logs.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No audit logs found</p>
            </div>
          )}
          {!isLoading && logs && logs.length > 0 && (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 p-4 hover:bg-muted/40 transition-colors sm:flex-row sm:items-start sm:gap-4">
                  <div className="shrink-0 pt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${actionColor(log.action)}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-medium capitalize">{log.entityType}</span>
                      {log.entityId && <span className="text-muted-foreground">#{log.entityId}</span>}
                      {log.performedBy && (
                        <span className="text-muted-foreground">by {log.performedBy}</span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{log.details}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
