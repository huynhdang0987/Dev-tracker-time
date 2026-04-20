import { useState } from "react";
import { useListCheckins, getListCheckinsQueryKey, useListDevelopers, getListDevelopersQueryKey, useCreateCheckin, useCheckout } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const logCheckinSchema = z.object({
  developerId: z.coerce.number().min(1, "Developer is required"),
  checkinAt: z.string().min(1, "Check-in time is required"),
  notes: z.string().optional()
});

type LogCheckinValues = z.infer<typeof logCheckinSchema>;

const logCheckoutSchema = z.object({
  checkoutAt: z.string().min(1, "Check-out time is required")
});

type LogCheckoutValues = z.infer<typeof logCheckoutSchema>;

export default function Checkins() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [checkoutId, setCheckoutId] = useState<number | null>(null);

  const formattedDate = date ? format(date, "yyyy-MM-dd") : null;

  const { data: checkins, isLoading } = useListCheckins(
    { date: formattedDate },
    { query: { enabled: true, queryKey: getListCheckinsQueryKey({ date: formattedDate }) } }
  );

  const { data: developers } = useListDevelopers({
    query: { enabled: true, queryKey: getListDevelopersQueryKey() }
  });

  const createCheckin = useCreateCheckin();
  const checkout = useCheckout();

  const checkinForm = useForm<LogCheckinValues>({
    resolver: zodResolver(logCheckinSchema),
    defaultValues: {
      developerId: 0,
      checkinAt: new Date().toISOString().slice(0, 16),
      notes: ""
    }
  });

  const checkoutForm = useForm<LogCheckoutValues>({
    resolver: zodResolver(logCheckoutSchema),
    defaultValues: {
      checkoutAt: new Date().toISOString().slice(0, 16)
    }
  });

  const onLogCheckin = (data: LogCheckinValues) => {
    createCheckin.mutate({ data: {
      developerId: data.developerId,
      checkinAt: new Date(data.checkinAt).toISOString(),
      notes: data.notes
    } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCheckinsQueryKey({ date: formattedDate }) });
        setIsLogOpen(false);
        checkinForm.reset();
        toast({ title: "Check-in logged manually" });
      }
    });
  };

  const onLogCheckout = (data: LogCheckoutValues) => {
    if (!checkoutId) return;
    checkout.mutate({ id: checkoutId, data: {
      checkoutAt: new Date(data.checkoutAt).toISOString()
    } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCheckinsQueryKey({ date: formattedDate }) });
        setCheckoutId(null);
        checkoutForm.reset();
        toast({ title: "Check-out logged manually" });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'on_time':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">On Time</Badge>;
      case 'late':
        return <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">Late</Badge>;
      case 'early':
        return <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">Early</Badge>;
      case 'missing':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Missing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-ins</h1>
          <p className="text-muted-foreground mt-1">Review team attendance records</p>
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

          <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Log Check-in
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manual Check-in Entry</DialogTitle>
              </DialogHeader>
              <Form {...checkinForm}>
                <form onSubmit={checkinForm.handleSubmit(onLogCheckin)} className="space-y-4">
                  <FormField
                    control={checkinForm.control}
                    name="developerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Developer</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
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
                    control={checkinForm.control}
                    name="checkinAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={checkinForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g. Doctor appointment" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createCheckin.isPending}>Save Check-in</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Check-in Status</TableHead>
                <TableHead>Check-out Time</TableHead>
                <TableHead>Check-out Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : checkins?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.date}</TableCell>
                  <TableCell className="font-medium">{record.developerName}</TableCell>
                  <TableCell>
                    {record.checkinAt ? format(new Date(record.checkinAt), "HH:mm") : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.checkinStatus)}</TableCell>
                  <TableCell>
                    {record.checkoutAt ? format(new Date(record.checkoutAt), "HH:mm") : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.checkoutStatus)}</TableCell>
                  <TableCell className="text-right">
                    {!record.checkoutAt && (
                      <Dialog open={checkoutId === record.id} onOpenChange={(open) => !open && setCheckoutId(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setCheckoutId(record.id)}>
                            Log Checkout
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Manual Check-out</DialogTitle>
                          </DialogHeader>
                          <Form {...checkoutForm}>
                            <form onSubmit={checkoutForm.handleSubmit(onLogCheckout)} className="space-y-4">
                              <FormField
                                control={checkoutForm.control}
                                name="checkoutAt"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Check-out Time</FormLabel>
                                    <FormControl>
                                      <Input type="datetime-local" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={checkout.isPending}>Save Check-out</Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (!checkins || checkins.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No check-in records found for this criteria.
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
