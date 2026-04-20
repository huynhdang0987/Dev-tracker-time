import { useState } from "react";
import {
  useListDevelopers,
  getListDevelopersQueryKey,
  useCreateDeveloper,
  useUpdateDeveloper,
  useDeleteDeveloper,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const developerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  slackId: z.string().optional(),
  checkinTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM")
    .default("09:00"),
  checkoutTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM")
    .default("18:00"),
  active: z.boolean().default(true),
});

type DeveloperFormValues = z.infer<typeof developerSchema>;

export default function Developers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: developers, isLoading } = useListDevelopers({
    query: { enabled: true, queryKey: getListDevelopersQueryKey() },
  });

  const createDeveloper = useCreateDeveloper();
  const updateDeveloper = useUpdateDeveloper();
  const deleteDeveloper = useDeleteDeveloper();

  const form = useForm<DeveloperFormValues>({
    resolver: zodResolver(developerSchema),
    defaultValues: {
      name: "",
      email: "",
      slackId: "",
      checkinTime: "09:00",
      checkoutTime: "18:00",
      active: true,
    },
  });

  const onSubmit = (data: DeveloperFormValues) => {
    if (editingId) {
      updateDeveloper.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListDevelopersQueryKey(),
            });
            setIsAddOpen(false);
            setEditingId(null);
            form.reset();
            toast({ title: "Developer updated" });
          },
        },
      );
    } else {
      createDeveloper.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListDevelopersQueryKey(),
            });
            setIsAddOpen(false);
            form.reset();
            toast({ title: "Developer added" });
          },
        },
      );
    }
  };

  const handleEdit = (dev: any) => {
    form.reset({
      name: dev.name,
      email: dev.email,
      slackId: dev.slackId || "",
      checkinTime: dev.checkinTime,
      checkoutTime: dev.checkoutTime,
      active: dev.active,
    });
    setEditingId(dev.id);
    setIsAddOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this developer?")) {
      deleteDeveloper.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListDevelopersQueryKey(),
            });
            toast({ title: "Developer deleted" });
          },
        },
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Developers</h1>
          <p className="text-muted-foreground mt-1">
            Manage team members and schedules
          </p>
        </div>
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditingId(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Developer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Developer" : "Add Developer"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="jane@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slackId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slack ID (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="U1234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="checkinTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Check-in</FormLabel>
                        <FormControl>
                          <Input placeholder="08:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="checkoutTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Check-out</FormLabel>
                        <FormControl>
                          <Input placeholder="17:00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {editingId && (
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Active Status
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={
                      createDeveloper.isPending || updateDeveloper.isPending
                    }
                  >
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                developers?.map((dev) => (
                  <TableRow key={dev.id}>
                    <TableCell className="font-medium">{dev.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{dev.email}</div>
                      {dev.slackId && (
                        <div className="text-xs text-muted-foreground">
                          Slack: {dev.slackId}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dev.checkinTime} - {dev.checkoutTime}
                    </TableCell>
                    <TableCell>
                      {dev.active ? (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-500 border-green-500/20"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(dev)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(dev.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && (!developers || developers.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No developers found. Add your first team member.
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
