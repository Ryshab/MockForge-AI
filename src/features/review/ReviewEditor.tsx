import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ImageOff,
  Merge,
  Plus,
  Scissors,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useExtractionStore } from "@/store/extractionStore";
import { exportService } from "@/services/exportService";
import { AnswerSourceBadge, ConfidenceBadge } from "./ConfidenceBadge";
import { cn } from "@/lib/utils";

export function ReviewEditor() {
  const {
    exam,
    updateExamMeta,
    updateQuestion,
    deleteQuestion,
    addQuestion,
    duplicateQuestion,
    moveQuestion,
    mergeQuestions,
    splitQuestion,
    renameSection,
  } = useExtractionStore();

  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [unverifiedOnly, setUnverifiedOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    if (!exam) return [];
    const q = query.trim().toLowerCase();
    return exam.questions.filter((item) => {
      if (sectionFilter !== "all" && item.section !== sectionFilter) return false;
      if (lowOnly && item.confidenceScore >= 0.75) return false;
      if (unverifiedOnly && item.correctAnswer) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.options.some((o) => (o.text ?? "").toLowerCase().includes(q)) ||
        item.explanation.toLowerCase().includes(q)
      );
    });
  }, [exam, lowOnly, query, sectionFilter, unverifiedOnly]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && e.key !== "Escape";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement | null)?.blur();
        setOpenId(null);
        return;
      }
      if (typing) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, visible.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        const row = visible[cursor];
        if (row) setOpenId((id) => (id === row.id ? null : row.id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, visible]);

  if (!exam) {
    return (
      <div className="surface-card p-10 text-center">
        <h2 className="font-display text-lg font-semibold">Nothing to review yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a question paper and extract it, or import a previously exported JSON file.
        </p>
        <Button asChild className="mt-6">
          <Link to="/upload">Go to upload</Link>
        </Button>
      </div>
    );
  }

  const lowCount = exam.questions.filter((q) => q.confidenceScore < 0.75).length;
  const unverifiedCount = exam.questions.filter((q) => !q.correctAnswer).length;

  return (
    <div className="space-y-6">
      <section className="surface-card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="text-xs font-medium text-muted-foreground">Exam title</span>
          <Input value={exam.title} onChange={(e) => updateExamMeta({ title: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="text-xs font-medium text-muted-foreground">Duration (min)</span>
          <Input
            type="number"
            value={exam.duration ?? ""}
            placeholder="Not stated"
            onChange={(e) =>
              updateExamMeta({ duration: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </label>
        <label className="text-sm">
          <span className="text-xs font-medium text-muted-foreground">Marks / question</span>
          <Input
            type="number"
            step="0.25"
            value={exam.marksPerQuestion ?? ""}
            placeholder="Not stated"
            onChange={(e) =>
              updateExamMeta({
                marksPerQuestion: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <label className="text-sm">
          <span className="text-xs font-medium text-muted-foreground">Negative marking</span>
          <Input
            type="number"
            step="0.25"
            value={exam.negativeMarking ?? ""}
            placeholder="Not stated"
            onChange={(e) =>
              updateExamMeta({
                negativeMarking: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
      </section>

      <section className="surface-card flex flex-wrap items-center gap-2 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…  (press /)"
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filter by section"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All sections</option>
          {exam.sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          variant={lowOnly ? "default" : "outline"}
          onClick={() => setLowOnly((v) => !v)}
          title="Show only questions below 75% confidence"
        >
          Low confidence ({lowCount})
        </Button>
        <Button
          variant={unverifiedOnly ? "default" : "outline"}
          onClick={() => setUnverifiedOnly((v) => !v)}
          title="Show only questions with no verified answer"
        >
          No verified answer ({unverifiedCount})
        </Button>
        <Button
          variant="outline"
          onClick={() => addQuestion(sectionFilter === "all" ? undefined : sectionFilter)}
        >
          <Plus className="size-4" /> Add
        </Button>
        <Button
          variant="outline"
          disabled={selected.length < 2}
          onClick={() => {
            mergeQuestions(selected);
            setSelected([]);
            toast.success("Questions merged");
          }}
        >
          <Merge className="size-4" /> Merge
        </Button>
        <Button
          onClick={() => {
            exportService.download(exam);
            toast.success(`Exported ${exportService.fileName(exam)}`);
          }}
        >
          <Download className="size-4" /> Export JSON
        </Button>
      </section>

      <section className="surface-card overflow-hidden p-0">
        <div className="grid grid-cols-[2rem_2.5rem_1fr_9rem_4rem] items-center gap-3 border-b border-border bg-secondary/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="sr-only">Select</span>
          <span>#</span>
          <span>Question</span>
          <span>Section</span>
          <span className="text-right">Conf.</span>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No questions match these filters.
          </p>
        ) : null}

        <ul className="divide-y divide-border">
          {visible.map((q, index) => {
            const open = openId === q.id;
            return (
              <li
                key={q.id}
                className={cn(
                  "px-4 py-2 text-sm transition-colors",
                  cursor === index && "bg-secondary/40",
                )}
              >
                <div className="grid grid-cols-[2rem_2.5rem_1fr_9rem_4rem] items-center gap-3">
                  <Checkbox
                    aria-label={`Select question ${index + 1}`}
                    checked={selected.includes(q.id)}
                    onCheckedChange={(checked) =>
                      setSelected((prev) =>
                        checked ? [...prev, q.id] : prev.filter((id) => id !== q.id),
                      )
                    }
                  />
                  <span className="tabular-nums text-muted-foreground">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCursor(index);
                      setOpenId(open ? null : q.id);
                    }}
                    className="flex min-w-0 items-center gap-2 text-left"
                  >
                    {open ? (
                      <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{q.question || "Untitled question"}</span>
                  </button>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {q.section}
                    {q.sourcePage ? ` · p.${q.sourcePage}` : ""}
                  </span>
                  <span className="flex items-center justify-end gap-2 text-right">
                    {q.correctAnswer ? null : (
                      <span
                        title="No verified answer"
                        className="size-2 shrink-0 rounded-full bg-destructive"
                      />
                    )}
                    <ConfidenceBadge score={q.confidenceScore} />
                  </span>
                </div>

                {open ? (
                  <div className="mt-3 grid gap-3 rounded-xl bg-secondary/30 p-4">
                    <label className="text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Question</span>
                      <Textarea
                        rows={3}
                        value={q.question}
                        onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                      />
                    </label>

                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Options (select the correct one)
                        </span>
                        <AnswerSourceBadge source={q.answerSource} />
                      </div>
                      {q.options.map((option, oi) => (
                        <div key={option.id + oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            aria-label={`Mark option ${option.id} correct`}
                            checked={q.correctAnswer === option.id}
                            onChange={() =>
                              updateQuestion(q.id, {
                                correctAnswer: option.id,
                                answerSource: "answer-key",
                              })
                            }
                          />
                          <Input
                            aria-label={`Option ${option.id} label`}
                            value={option.id}
                            className="w-16"
                            onChange={(e) => {
                              const id = e.target.value;
                              const options = [...q.options];
                              options[oi] = { ...option, id };
                              updateQuestion(q.id, {
                                options,
                                ...(q.correctAnswer === option.id ? { correctAnswer: id } : {}),
                              });
                            }}
                          />
                          <Input
                            aria-label={`Option ${option.id} text`}
                            value={option.text ?? ""}
                            placeholder={option.media.length > 0 ? "(image option)" : ""}
                            onChange={(e) => {
                              const options = [...q.options];
                              options[oi] = { ...option, text: e.target.value };
                              updateQuestion(q.id, { options });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove option"
                            onClick={() =>
                              updateQuestion(q.id, {
                                options: q.options.filter((_, i) => i !== oi),
                                ...(q.correctAnswer === option.id
                                  ? { correctAnswer: null, answerSource: "unavailable" as const }
                                  : {}),
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <MediaList media={option.media} maxHeight={90} />
                        </div>
                      ))}
                      {(q.media.length > 0 || q.mediaWarning) && (
                        <div className="space-y-2 rounded-lg border border-border bg-secondary/20 p-3">
                          {q.mediaWarning ? (
                            <p className="flex items-start gap-2 text-xs text-destructive">
                              <ImageOff className="mt-0.5 size-3.5 shrink-0" />
                              {q.mediaWarning}
                            </p>
                          ) : null}
                          <MediaList media={q.media} maxHeight={220} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          onClick={() =>
                            updateQuestion(q.id, {
                              options: [
                                ...q.options,
                                {
                                  id:
                                    ["A", "B", "C", "D", "E", "F"][q.options.length] ??
                                    String(q.options.length + 1),
                                  text: "",
                                  media: [],
                                },
                              ],
                            })
                          }
                        >
                          <Plus className="size-4" /> Add option
                        </Button>
                        {q.correctAnswer ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit"
                            onClick={() =>
                              updateQuestion(q.id, {
                                correctAnswer: null,
                                answerSource: "unavailable",
                              })
                            }
                          >
                            Clear answer
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <label className="text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Explanation</span>
                      <Textarea
                        rows={2}
                        value={q.explanation}
                        onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm">
                        <span className="text-xs font-medium text-muted-foreground">Section</span>
                        <Input
                          value={q.section}
                          onChange={(e) => updateQuestion(q.id, { section: e.target.value })}
                        />
                      </label>
                      <label className="text-sm">
                        <span className="text-xs font-medium text-muted-foreground">
                          Rename this section everywhere
                        </span>
                        <Input
                          defaultValue={q.section}
                          onBlur={(e) => renameSection(q.section, e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => moveQuestion(q.id, "up")}>
                        <ChevronUp className="size-4" /> Move up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveQuestion(q.id, "down")}
                      >
                        <ChevronDown className="size-4" /> Move down
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => duplicateQuestion(q.id)}>
                        <Copy className="size-4" /> Duplicate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        title="Split on blank lines into separate questions"
                        onClick={() => splitQuestion(q.id)}
                      >
                        <Scissors className="size-4" /> Split
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          deleteQuestion(q.id);
                          setOpenId(null);
                        }}
                      >
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        Keyboard: <kbd>/</kbd> search · <kbd>j</kbd>/<kbd>k</kbd> move · <kbd>Enter</kbd> open ·{" "}
        <kbd>Esc</kbd> close. Showing {visible.length} of {exam.questions.length} questions.
      </p>
    </div>
  );
}
