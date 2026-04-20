import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetTodayStatus,
  getGetTodayStatusQueryKey,
  useTriggerDailyCheck 
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, AlertTriangle, FileText, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dashboard() {
  const { toast } = useToast();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { enabled: true, queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: todayStatus, isLoading: loadingStatus } = useGetTodayStatus({
    query: { enabled: true, queryKey: getGetTodayStatusQueryKey() }
  });

  const triggerDailyCheck = useTriggerDailyCheck();

  const handleTriggerCheck = () => {
    triggerDailyCheck.mutate(undefined, {
      onSuccess: (res) => {
        toast({
          title: "Check triggered",
          description: res.message
        });
      },
      onError: (err) => {
        toast({
          title: "Error triggering check",
          description: "Something went wrong",
          variant: "destructive"
        });
      }
    });
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/n8n/webhook` : '/api/n8n/webhook';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Today's engineering team overview</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={handleTriggerCheck} disabled={triggerDailyCheck.isPending}>
            <Activity className="w-4 h-4 mr-2" />
            {triggerDailyCheck.isPending ? "Checking..." : "Trigger Daily Check"}
          </Button>
        </div>
      </div>

      {loadingSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[120px] rounded-xl" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Checked In Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.checkedInToday} / {summary.totalDevelopers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.missingCheckinToday} missing check-ins
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Reports Submitted</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.reportsSubmittedToday}</div>
              <p className="text-xs text-muted-foreground mt-1">Daily updates received</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.avgResponseTimeMinutes !== null && summary.avgResponseTimeMinutes !== undefined
                  ? `${summary.avgResponseTimeMinutes} min` 
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all team messages</p>
            </CardContent>
          </Card>
          <Card className={summary.unresolvedAlerts > 0 ? "border-accent/50 bg-accent/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-accent">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{summary.unresolvedAlerts}</div>
              <p className="text-xs text-accent/80 mt-1">Requires attention</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Today's Status</CardTitle>
              <CardDescription>Live check-in and reporting status for all active developers</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStatus ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : todayStatus && todayStatus.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Developer</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Alerts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayStatus.map(dev => (
                      <TableRow key={dev.developerId}>
                        <TableCell>
                          <div className="font-medium">{dev.developerName}</div>
                          <div className="text-xs text-muted-foreground">{dev.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{dev.expectedCheckin}</span>
                            {dev.checkinStatus === 'on_time' && <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">On Time</Badge>}
                            {dev.checkinStatus === 'late' && <Badge variant="outline" className="bg-accent/10 text-accent hover:bg-accent/20 border-accent/20">Late</Badge>}
                            {dev.checkinStatus === 'missing' && <Badge variant="outline" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20">Missing</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{dev.expectedCheckout}</span>
                            {dev.checkoutStatus === 'on_time' && <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">On Time</Badge>}
                            {dev.checkoutStatus === 'early' && <Badge variant="outline" className="bg-accent/10 text-accent hover:bg-accent/20 border-accent/20">Early</Badge>}
                            {dev.checkoutStatus === 'missing' && <Badge variant="outline">Missing</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {dev.reportSubmitted ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Submitted</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {dev.alertCount > 0 ? (
                            <Badge variant="destructive">{dev.alertCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active developers found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>System Integrations</CardTitle>
              <CardDescription>n8n Webhook details for automated checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs truncate" title={webhookUrl}>
                    {webhookUrl}
                  </code>
                  <Button variant="secondary" size="sm" onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast({ title: "Copied to clipboard" });
                  }}>
                    Copy
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set up a cron job in n8n to ping this webhook daily to automatically generate alerts for missing check-ins, check-outs, and reports.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
