import { useState } from "react";
import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetTodayStatus,
  getGetTodayStatusQueryKey,
  useTriggerDailyCheck,
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, AlertTriangle, FileText, Activity, Mail, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { enabled: true, queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: todayStatus, isLoading: loadingStatus } = useGetTodayStatus({
    query: { enabled: true, queryKey: getGetTodayStatusQueryKey() }
  });

  const { data: settings, isLoading: loadingSettings } = useGetSettings({
    query: { enabled: true, queryKey: getGetSettingsQueryKey() }
  });

  const updateSettings = useUpdateSettings();
  const triggerDailyCheck = useTriggerDailyCheck();

  const [editingLeader, setEditingLeader] = useState(false);
  const [leaderEmailInput, setLeaderEmailInput] = useState("");
  const [leaderNameInput, setLeaderNameInput] = useState("");

  const handleStartEditLeader = () => {
    setLeaderEmailInput(settings?.leaderEmail ?? "");
    setLeaderNameInput(settings?.leaderName ?? "");
    setEditingLeader(true);
  };

  const handleSaveLeader = () => {
    updateSettings.mutate(
      { data: { leaderEmail: leaderEmailInput || null, leaderName: leaderNameInput || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          setEditingLeader(false);
          toast({ title: "Saved", description: "Leader email updated successfully" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
        }
      }
    );
  };

  const handleTriggerCheck = () => {
    triggerDailyCheck.mutate(undefined, {
      onSuccess: (res) => {
        toast({
          title: "Check triggered",
          description: res.message + (res.leaderEmail ? ` Alert will be sent to ${res.leaderEmail}` : " (no leader email configured)")
        });
      },
      onError: () => {
        toast({ title: "Error triggering check", description: "Something went wrong", variant: "destructive" });
      }
    });
  };

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/n8n/webhook` : "/api/n8n/webhook";
  const triggerCheckUrl = typeof window !== "undefined" ? `${window.location.origin}/api/n8n/trigger-check` : "/api/n8n/trigger-check";

  const getCheckinBadge = (status: string) => {
    if (status === "on_time") return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="badge-checkin-ontime">On Time</Badge>;
    if (status === "late") return <Badge className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="badge-checkin-late">Late</Badge>;
    return <Badge variant="destructive" data-testid="badge-checkin-missing">Missing</Badge>;
  };

  const getCheckoutBadge = (status: string) => {
    if (status === "on_time") return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="badge-checkout-ontime">On Time</Badge>;
    if (status === "early") return <Badge className="bg-sky-500 hover:bg-sky-600 text-white" data-testid="badge-checkout-early">Early</Badge>;
    return <Badge variant="outline" data-testid="badge-checkout-missing">Missing</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Today's engineering team overview</p>
        </div>
        <Button
          variant="outline"
          onClick={handleTriggerCheck}
          disabled={triggerDailyCheck.isPending}
          data-testid="button-trigger-check"
        >
          <Activity className="w-4 h-4 mr-2" />
          {triggerDailyCheck.isPending ? "Checking..." : "Trigger Daily Check"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card data-testid="card-checked-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{summary?.checkedInToday} / {summary?.totalDevelopers}</div>
                <p className="text-xs text-muted-foreground">{summary?.missingCheckinToday} missing check-ins</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-reports">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Submitted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{summary?.reportsSubmittedToday}</div>
                <p className="text-xs text-muted-foreground">Daily updates received</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-response-time">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">
                  {summary?.avgResponseTimeMinutes != null ? `${summary.avgResponseTimeMinutes} min` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">Across all team messages</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5" data-testid="card-alerts">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-400">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold text-amber-400">{summary?.unresolvedAlerts}</div>
                <p className="text-xs text-amber-400/70">Requires attention</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Today's Status</CardTitle>
              <CardDescription>Live check-in and reporting status for all active developers</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStatus ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
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
                    {todayStatus.map((dev) => (
                      <TableRow key={dev.developerId} data-testid={`row-developer-${dev.developerId}`}>
                        <TableCell>
                          <div className="font-medium">{dev.developerName}</div>
                          <div className="text-xs text-muted-foreground">{dev.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{dev.expectedCheckin}</span>
                            {getCheckinBadge(dev.checkinStatus)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{dev.expectedCheckout}</span>
                            {getCheckoutBadge(dev.checkoutStatus)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {dev.reportSubmitted
                            ? <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Submitted</Badge>
                            : <Badge variant="outline">Pending</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          {dev.alertCount > 0
                            ? <Badge variant="destructive">{dev.alertCount}</Badge>
                            : <span className="text-muted-foreground text-sm">-</span>
                          }
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

        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Leader Alert Email
              </CardTitle>
              <CardDescription>Email nhận alert khi dev vi phạm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : editingLeader ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="leader-name">Leader Name</Label>
                    <Input
                      id="leader-name"
                      data-testid="input-leader-name"
                      value={leaderNameInput}
                      onChange={(e) => setLeaderNameInput(e.target.value)}
                      placeholder="Nguyen Van A"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="leader-email">Leader Email</Label>
                    <Input
                      id="leader-email"
                      data-testid="input-leader-email"
                      type="email"
                      value={leaderEmailInput}
                      onChange={(e) => setLeaderEmailInput(e.target.value)}
                      placeholder="leader@company.vn"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveLeader}
                      disabled={updateSettings.isPending}
                      data-testid="button-save-leader"
                    >
                      {updateSettings.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingLeader(false)}
                      data-testid="button-cancel-leader"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {settings?.leaderEmail ? (
                    <div className="space-y-1">
                      {settings.leaderName && (
                        <p className="text-sm font-medium">{settings.leaderName}</p>
                      )}
                      <p className="text-sm text-emerald-400 font-mono">{settings.leaderEmail}</p>
                      <p className="text-xs text-muted-foreground">Alert email se duoc gui den dia chi nay</p>
                    </div>
                  ) : (
                    <div className="text-sm text-amber-400">
                      Chua cau hinh email leader. Them email de nhan alert tu dong.
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStartEditLeader}
                    data-testid="button-edit-leader"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {settings?.leaderEmail ? "Change Email" : "Set Leader Email"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>n8n Integration</CardTitle>
              <CardDescription>Webhook for automated checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Trigger Check URL (n8n Cron)</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs truncate" title={triggerCheckUrl}>
                    {triggerCheckUrl}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(triggerCheckUrl);
                      toast({ title: "Copied to clipboard" });
                    }}
                    data-testid="button-copy-trigger-url"
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs truncate" title={webhookUrl}>
                    {webhookUrl}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast({ title: "Copied to clipboard" });
                    }}
                    data-testid="button-copy-webhook-url"
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Setup n8n:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tao Cron trigger trong n8n (vd: 17:30 moi ngay)</li>
                  <li>Goi POST den <em>Trigger Check URL</em></li>
                  <li>Response tra ve <code>leaderEmail</code> va danh sach alerts</li>
                  <li>Gui email den <code>leaderEmail</code> voi noi dung vi pham</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
