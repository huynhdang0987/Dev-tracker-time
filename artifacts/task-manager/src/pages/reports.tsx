import { useState } from "react";
import { useListReports, getListReportsQueryKey, useListDevelopers, getListDevelopersQueryKey, useCreateReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatLocalTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, FileText, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const logReportSchema = z.object({
  developerId: z.coerce.number().min(1, "Developer is required"),
  content: z.string().min(1, "Report content is required"),
});

type LogReportValues = z.infer<typeof logReportSchema>;

export default function Reports() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isOpen, setIsOpen] = useState(false);

  const formattedDate = date ? format(date, "yyyy-MM-dd") : null;

  const { data: reports, isLoading } = useListReports(
    { date: formattedDate },
    { query: { enabled: true, queryKey: getListReportsQueryKey({ date: formattedDate }) } }
  );

  const { data: developers } = useListDevelopers({
    query: { enabled: true, queryKey: getListDevelopersQueryKey() }
  });

  const createReport = useCreateReport();

  const form = useForm<LogReportValues>({
    resolver: zodResolver(logReportSchema),
    defaultValues: {
      developerId: 0,
      content: ""
    }
  });

  const onSubmit = (data: LogReportValues) => {
    createReport.mutate({
      data: {
        developerId: data.developerId,
        content: data.content,
        date: formattedDate || undefined
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey({ date: formattedDate }) });
        setIsOpen(false);
        form.reset();
        toast({ title: "Report logged manually" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Reports</h1>
          <p className="text-muted-foreground mt-1">Review end-of-day status updates</p>
        </div>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {date && (
            <Button variant="ghost" onClick={() => setDate(undefined)}>Clear Date</Button>
          )}

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Log Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manual Report Entry</DialogTitle>
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
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Content</FormLabel>
                        <FormControl>
                          <Textarea placeholder="What did they work on today?" className="h-32" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createReport.isPending}>Save Report</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading reports...</div>
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((report) => (
            <Card key={report.id} className={report.status === 'missing' ? "opacity-60 border-destructive/20 bg-destructive/5" : ""}>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{report.developerName}</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">{report.date}</div>
                  </div>
                  {report.status === 'submitted' ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Submitted</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Missing</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {report.status === 'submitted' ? (
                  <div className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                    {report.content}
                  </div>
                ) : (
                  <div className="text-sm text-destructive/80 italic">
                    No report submitted for this date.
                  </div>
                )}
                {report.status === 'submitted' && report.submittedAt && (
                  <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Submitted at {formatLocalTime(report.submittedAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p>No reports found for this date.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
