import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAdminListCategories,
  getAdminListCategoriesQueryKey,
  useAdminCreateCategory,
  useAdminUpdateCategory,
  useAdminDeleteCategory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tags, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  color: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface CategoryItem {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  isActive: boolean;
  createdAt: string;
}

export function Categories() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useAdminListCategories({
    query: { queryKey: getAdminListCategoriesQueryKey() },
  });

  const create = useAdminCreateCategory();
  const update = useAdminUpdateCategory();
  const remove = useAdminDeleteCategory();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", color: "#dc2626" },
  });

  function inv() {
    queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
  }

  function openCreate() {
    form.reset({ name: "", description: "", color: "#dc2626" });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c: CategoryItem) {
    form.reset({ name: c.name, description: c.description ?? "", color: c.color ?? "#dc2626" });
    setEditing(c);
    setShowForm(true);
  }

  function onSubmit(values: FormData) {
    if (editing) {
      update.mutate({ id: editing.id, data: { name: values.name, description: values.description, color: values.color } }, {
        onSuccess: () => { toast({ title: "Updated" }); setShowForm(false); inv(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    } else {
      create.mutate({ data: { name: values.name, description: values.description, color: values.color } }, {
        onSuccess: () => { toast({ title: "Created" }); setShowForm(false); inv(); },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      });
    }
  }

  function handleToggle(c: CategoryItem) {
    update.mutate({ id: c.id, data: { isActive: !c.isActive } }, {
      onSuccess: () => { toast({ title: c.isActive ? "Deactivated" : "Activated" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  function handleDelete(id: number, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    remove.mutate({ id }, {
      onSuccess: () => { toast({ title: "Deleted" }); inv(); },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Organize content with labeled categories</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Category
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {!isLoading && categories && categories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Tags className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No categories yet</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Category</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && categories && categories.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: c.color ?? "#dc2626" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      {!c.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={c.isActive}
                      onCheckedChange={() => handleToggle(c)}
                      aria-label="Toggle active"
                    />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id, c.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex items-center gap-2">
                    <input type="color" value={field.value ?? "#dc2626"} onChange={(e) => field.onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
                    <Input {...field} placeholder="#dc2626" className="flex-1" />
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editing ? "Save" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
