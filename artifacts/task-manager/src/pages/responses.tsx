import { useState } from "react";
import { useListResponses, getListResponsesQueryKey, useGetResponseStats, getGetResponseStatsQueryKey, useCreateResponse, useListDevelopers, getListDevelopersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const logResponseSchema = z.object({
  developerId: z.coerce.number().min(1, "Developer is required"),
  messageAt: z.string().min(1, "Message time is required"),
  respondedAt: z.string().optional(),
  topic: z.string().optional()
});

type LogResponseValues = z.infer<typeof logResponseSchema>;

export default function Responses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: responses, isLoading: loadingResponses } = useListResponses(
    {},
    { query: { enabled: true, queryKey: getListResponsesQueryKey({}) } }
  );

  const { data: stats, isLoading: loadingStats } = useGetResponseStats({
    query: { enabled: true, queryKey: getGetResponseStatsQueryKey() }
  });

  const { data: developers } = useListDevelopers({
    query: { enabled: true, queryKey: getListDevelopersQueryKey() }
  });

  const createResponse = useCreateResponse();

  const form = useForm<LogResponseValues>({
    resolver: zodResolver(logResponseSchema),
    defaultValues: {
      developerId: 0,
      messageAt: new Date().toISOString().slice(0, 16),
      respondedAt: "",
      topic: ""
    }
  });

  const onSubmit = (data: LogResponseValues) => {
    createResponse.mutate({
      data: {
        developerId: data.developerId,
        messageAt: new Date(data.messageAt).toISOString(),
        respondedAt: data.respondedAt ? new Date(data.respondedAt).toISOString() : undefined,
        topic: data.topic || undefined
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResponsesQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetResponseStatsQueryKey() });
        setIsOpen(false);
        form.reset();
        toast({ title: "Response logged manually" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Responses</h1>
          <p className="text-muted-foreground mt-1">Track communication response times</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Log Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual Message Entry</DialogTitle>
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
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topic (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. PR Review" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="messageAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message Sent Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="respondedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response Time (optional)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createResponse.isPending}>Save</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loadingStats ? (
          <div className="col-span-full text-center py-8">Loading stats...</div>
        ) : stats?.map((stat) => (
          <Card key={stat.developerId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.developerName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold">
                    {stat.avgResponseMinutes !== null && stat.avgResponseMinutes !== undefined
                      ? `${Math.round(stat.avgResponseMinutes)}m`
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Avg response time</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{stat.respondedMessages} / {stat.totalMessages}</div>
                  <p className="text-xs text-muted-foreground mt-1">Messages responded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Developer</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Message Sent</TableHead>
                <TableHead>Responded At</TableHead>
                <TableHead className="text-right">Response Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingResponses ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : responses?.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="font-medium">{msg.developerName}</TableCell>
                  <TableCell>{msg.topic || '-'}</TableCell>
                  <TableCell>{format(new Date(msg.messageAt), "MMM d, HH:mm")}</TableCell>
                  <TableCell>
                    {msg.respondedAt ? format(new Date(msg.respondedAt), "MMM d, HH:mm") : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {msg.responseTimeMinutes !== null && msg.responseTimeMinutes !== undefined
                      ? `${msg.responseTimeMinutes}m`
                      : "Pending"}
                  </TableCell>
                </TableRow>
              ))}
              {!loadingResponses && (!responses || responses.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No response records found.
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
