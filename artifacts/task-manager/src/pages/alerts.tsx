import { useState } from "react";
import { useListAlerts, getListAlertsQueryKey, useResolveAlert, useListDevelopers, getListDevelopersQueryKey, useCreateAlert } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, Mail, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createAlertSchema = z.object({
  developerId: z.coerce.number().min(1, "Developer is required"),
  type: z.enum([
    "late_checkin", "missing_checkin", "late_checkout", "missing_checkout", "missing_report", "slow_response"
  ], { required_error: "Type is required" }),
  message: z.string().min(1, "Message is required"),
  emailSent: z.boolean().default(false)
});

type CreateAlertValues = z.infer<typeof createAlertSchema>;

export default function Alerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: alerts, isLoading } = useListAlerts(
    {},
    { query: { enabled: true, queryKey: getListAlertsQueryKey({}) } }
  );

  const { data: developers } = useListDevelopers({
    query: { enabled: true, queryKey: getListDevelopersQueryKey() }
  });

  const resolveAlert = useResolveAlert();
  const createAlert = useCreateAlert();

  const form = useForm<CreateAlertValues>({
    resolver: zodResolver(createAlertSchema),
    defaultValues: {
      developerId: 0,
      type: "missing_checkin",
      message: "",
      emailSent: false
    }
  });

  const onSubmit = (data: CreateAlertValues) => {
    createAlert.mutate({
      data: {
        developerId: data.developerId,
        type: data.type,
        message: data.message,
        emailSent: data.emailSent
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey({}) });
        setIsOpen(false);
        form.reset();
        toast({ title: "Alert created manually" });
      }
    });
  };

  const handleResolve = (id: number) => {
    resolveAlert.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey({}) });
        toast({ title: "Alert resolved" });
      }
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'missing_checkin':
      case 'missing_checkout':
      case 'missing_report':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-accent" />;
    }
  };

  const formatType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-accent">Alert Center</h1>
          <p className="text-muted-foreground mt-1">Manage compliance infractions and automated warnings</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual Alert Entry</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="developerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Developer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select developer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {developers?.map(dev => (
                            <SelectItem key={dev.id} value={dev.id.toString()}>{dev.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alert Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="late_checkin">Late Check-in</SelectItem>
                          <SelectItem value="missing_checkin">Missing Check-in</SelectItem>
                          <SelectItem value="late_checkout">Late Check-out</SelectItem>
                          <SelectItem value="missing_checkout">Missing Check-out</SelectItem>
                          <SelectItem value="missing_report">Missing Report</SelectItem>
                          <SelectItem value="slow_response">Slow Response</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe the infraction" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createAlert.isPending}>Create Alert</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : alerts?.map((alert) => (
                <TableRow key={alert.id} className={!alert.resolved ? "bg-accent/5" : "opacity-50"}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(alert.createdAt), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">{alert.developerName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.type)}
                      <span className="text-sm font-medium">{formatType(alert.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{alert.message}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {alert.resolved ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Resolved</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Active</Badge>
                      )}
                      {alert.emailSent && (
                        <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
                          <Mail className="w-3 h-3" /> Email Sent
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {!alert.resolved && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolveAlert.isPending}
                        className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (!alerts || alerts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500/50" />
                    All clear. No alerts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
