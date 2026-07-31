import { 
  useGetAdminStats,
  getGetAdminStatsQueryKey 
} from "@workspace/api-client-react";
import { 
  Building2, 
  Users, 
  Droplet, 
  Activity, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function Dashboard() {
  const { data: stats, isLoading, error } = useGetAdminStats({
    query: {
      queryKey: getGetAdminStatsQueryKey()
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px] w-full rounded-xl" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Failed to load statistics</h2>
        <p className="text-muted-foreground mt-2">There was a problem loading the dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Central command metrics for Blood Bank.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Facilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHospitals + stats.totalBloodBanks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{stats.approvedHospitals}</span> approved, <span className="font-medium text-destructive">{stats.pendingApprovals}</span> pending
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blood Inventory</CardTitle>
            <Droplet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBloodUnits?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total units available across all banks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium text-destructive">{stats.blockedUsers || 0}</span> blocked accounts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Broadcasts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeNotifications}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently published notifications</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Blood Group Availability</CardTitle>
            <CardDescription>Units available by blood type across Punjab</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <div className="h-[300px] w-full">
              {stats.bloodGroupStats && stats.bloodGroupStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.bloodGroupStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="bloodGroup" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar 
                      dataKey="totalUnits" 
                      name="Total Units" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No inventory data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Facility Distribution</CardTitle>
            <CardDescription>Top cities by facility count</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
             <div className="h-[300px] w-full">
              {stats.cityStats && stats.cityStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.cityStats.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="hospitalCount"
                      nameKey="city"
                    >
                      {stats.cityStats.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No city data available</p>
                </div>
              )}
            </div>
            {stats.cityStats && stats.cityStats.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {stats.cityStats.slice(0, 5).map((stat, i) => (
                  <div key={stat.city} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="truncate" title={stat.city}>{stat.city}</span>
                    <span className="ml-auto font-medium">{stat.hospitalCount}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest administrative actions and platform events</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-6">
                {stats.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {log.action.includes('create') || log.action.includes('register') ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : log.action.includes('delete') || log.action.includes('reject') || log.action.includes('block') ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : log.action.includes('update') || log.action.includes('edit') ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        <span className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                        {" - "}
                        <span className="text-muted-foreground capitalize">{log.entityType}</span>
                        {log.entityId && ` #${log.entityId}`}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {log.details || 'No additional details'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                        {log.performedBy && (
                          <>
                            <span>•</span>
                            <span>by {log.performedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8">
                <p className="text-muted-foreground">No recent activity logs found</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
