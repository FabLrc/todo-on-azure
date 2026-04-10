import { ChevronDown, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todoPriorityLabels, todoPriorityValues, todoStatusLabels, todoStatusValues } from "@/lib/types";
import type { TodoPriority, TodoStatus } from "@/lib/types";

import type { TodoFormState } from "./todo-view-model";

interface TodoCreateFormProps {
  isFormOpen: boolean;
  isSubmitting: boolean;
  formState: TodoFormState;
  onFormOpenChange: (open: boolean) => void;
  onFormStateChange: (next: TodoFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function TodoCreateForm({
  isFormOpen,
  isSubmitting,
  formState,
  onFormOpenChange,
  onFormStateChange,
  onSubmit,
}: TodoCreateFormProps) {
  return (
    <Collapsible open={isFormOpen} onOpenChange={onFormOpenChange}>
      <CollapsibleTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between gap-2 border-dashed border-slate-300 py-5 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          />
        }
      >
        <span className="inline-flex items-center gap-2">
          <Plus className="size-4" />
          Nouvelle tache
        </span>
        <ChevronDown
          className={`size-4 text-slate-400 transition-transform duration-200 ${isFormOpen ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <Card className="mt-3 border-slate-200/70 shadow-sm">
          <CardHeader>
            <CardTitle>Nouvelle tache</CardTitle>
            <CardDescription>
              Ajoutez un titre, une description, une priorite, un statut initial et une date cible optionnelle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formState.title}
                  onChange={(event) =>
                    onFormStateChange({
                      ...formState,
                      title: event.target.value,
                    })
                  }
                  placeholder="Ex: Ajouter le monitoring App Service"
                  required
                  maxLength={120}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={(event) =>
                    onFormStateChange({
                      ...formState,
                      description: event.target.value,
                    })
                  }
                  placeholder="Details de la tache"
                  maxLength={500}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Date cible</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formState.dueDate}
                    onChange={(event) =>
                      onFormStateChange({
                        ...formState,
                        dueDate: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Statut</Label>
                  <Select
                    value={formState.status}
                    onValueChange={(value) =>
                      onFormStateChange({
                        ...formState,
                        status: value as TodoStatus,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {todoStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {todoStatusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Priorite</Label>
                  <Select
                    value={formState.priority}
                    onValueChange={(value) =>
                      onFormStateChange({
                        ...formState,
                        priority: value as TodoPriority,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {todoPriorityValues.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {todoPriorityLabels[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Creation...
                    </span>
                  ) : (
                    "Ajouter la tache"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
