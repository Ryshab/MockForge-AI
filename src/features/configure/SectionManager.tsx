import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Clock, ListChecks, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectTotals, useExamStore } from "@/store/examStore";

export function SectionManager() {
  const sections = useExamStore((s) => s.sections);
  const addSection = useExamStore((s) => s.addSection);
  const updateSection = useExamStore((s) => s.updateSection);
  const removeSection = useExamStore((s) => s.removeSection);
  const moveSection = useExamStore((s) => s.moveSection);
  const [newName, setNewName] = useState("");

  const totals = useMemo(() => selectTotals(sections), [sections]);

  return (
    <section className="surface-card p-6" aria-label="Section configuration">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">Sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add, rename, reorder and time each section.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold">
            <ListChecks className="size-3.5" /> {totals.totalQuestions} Q
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold">
            <Clock className="size-3.5" /> {totals.totalMinutes} min
          </span>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {sections.map((section, index) => (
          <li
            key={section.id}
            className="grid gap-3 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end"
          >
            <div className="min-w-0">
              <Label htmlFor={`name-${section.id}`}>Section name</Label>
              <Input
                id={`name-${section.id}`}
                className="mt-1.5 bg-background"
                value={section.name}
                onChange={(e) => updateSection(section.id, { name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor={`q-${section.id}`}>Questions</Label>
              <Input
                id={`q-${section.id}`}
                type="number"
                min={1}
                className="mt-1.5 bg-background"
                value={section.questionCount}
                onChange={(e) =>
                  updateSection(section.id, { questionCount: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor={`t-${section.id}`}>Minutes</Label>
              <Input
                id={`t-${section.id}`}
                type="number"
                min={1}
                className="mt-1.5 bg-background"
                value={section.durationMinutes}
                onChange={(e) =>
                  updateSection(section.id, { durationMinutes: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${section.name} up`}
                disabled={index === 0}
                onClick={() => moveSection(section.id, "up")}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${section.name} down`}
                disabled={index === sections.length - 1}
                onClick={() => moveSection(section.id, "down")}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${section.name}`}
                onClick={() => {
                  removeSection(section.id);
                  toast.message(`Removed ${section.name}`);
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
        {sections.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            No sections yet. Add your first one below.
          </li>
        ) : null}
      </ul>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="New section name"
          placeholder="e.g. General Awareness"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSection(newName);
              setNewName("");
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={() => {
            addSection(newName);
            setNewName("");
          }}
        >
          <Plus className="size-4" /> Add section
        </Button>
      </div>
    </section>
  );
}
