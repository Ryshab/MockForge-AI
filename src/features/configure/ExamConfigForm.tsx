import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useExamStore } from "@/store/examStore";
import type { ExamConfiguration } from "@/types";

const schema = z.object({
  examName: z.string().min(2, "Give your exam a name").max(80),
  totalMarks: z.coerce.number().min(1, "Must be at least 1").max(2000),
  marksPerQuestion: z.coerce.number().min(0.25).max(100),
  negativeMarks: z.coerce.number().min(0).max(100),
  enableNegativeMarking: z.boolean(),
  enableSectionTimers: z.boolean(),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  allowReviewMode: z.boolean(),
  enableFullscreen: z.boolean(),
  warnBeforeExit: z.boolean(),
  strictSectionMode: z.boolean(),
  autoStartNextSection: z.boolean(),
});

type FormValues = z.input<typeof schema>;

const toggles: { name: keyof ExamConfiguration; label: string; hint: string }[] = [
  {
    name: "enableNegativeMarking",
    label: "Negative marking",
    hint: "Deduct marks for wrong answers",
  },
  { name: "enableSectionTimers", label: "Section timers", hint: "Each section gets its own clock" },
  {
    name: "shuffleQuestions",
    label: "Shuffle questions",
    hint: "Randomise order within a section",
  },
  { name: "shuffleOptions", label: "Shuffle options", hint: "Randomise A/B/C/D order" },
  { name: "allowReviewMode", label: "Review mode", hint: "Mark questions for review" },
  {
    name: "strictSectionMode",
    label: "Strict section mode",
    hint: "Sections lock permanently once completed",
  },
  {
    name: "autoStartNextSection",
    label: "Auto-start next section",
    hint: "Skip the transition screen and start immediately",
  },
  { name: "enableFullscreen", label: "Fullscreen mode", hint: "Launch the test in fullscreen" },
  { name: "warnBeforeExit", label: "Warn before exit", hint: "Confirm before leaving the test" },
];

export function ExamConfigForm() {
  const configuration = useExamStore((s) => s.configuration);
  const setConfiguration = useExamStore((s) => s.setConfiguration);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: configuration,
    mode: "onBlur",
  });

  const { register, handleSubmit, watch, setValue, formState } = form;
  const errors = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setConfiguration(schema.parse(values) as ExamConfiguration);
    toast.success("Exam configuration saved");
  });

  return (
    <form onSubmit={onSubmit} className="surface-card p-6">
      <h2 className="font-display text-lg font-semibold">Exam settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Define scoring and behaviour before the test engine is generated.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="examName">Exam name</Label>
          <Input id="examName" className="mt-1.5" {...register("examName")} />
          {errors.examName ? (
            <p className="mt-1 text-xs text-destructive">{errors.examName.message}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="totalMarks">Total marks</Label>
          <Input
            id="totalMarks"
            type="number"
            step="1"
            className="mt-1.5"
            {...register("totalMarks")}
          />
          {errors.totalMarks ? (
            <p className="mt-1 text-xs text-destructive">{errors.totalMarks.message}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="marksPerQuestion">Marks per question</Label>
          <Input
            id="marksPerQuestion"
            type="number"
            step="0.25"
            className="mt-1.5"
            {...register("marksPerQuestion")}
          />
          {errors.marksPerQuestion ? (
            <p className="mt-1 text-xs text-destructive">{errors.marksPerQuestion.message}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="negativeMarks">Negative marks per wrong answer</Label>
          <Input
            id="negativeMarks"
            type="number"
            step="0.25"
            className="mt-1.5"
            disabled={!watch("enableNegativeMarking")}
            {...register("negativeMarks")}
          />
          {errors.negativeMarks ? (
            <p className="mt-1 text-xs text-destructive">{errors.negativeMarks.message}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {toggles.map((t) => (
          <div
            key={t.name}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 px-4 py-3"
          >
            <div className="min-w-0">
              <Label htmlFor={t.name} className="cursor-pointer">
                {t.label}
              </Label>
              <p className="text-xs text-muted-foreground">{t.hint}</p>
            </div>
            <Switch
              id={t.name}
              checked={Boolean(watch(t.name as keyof FormValues))}
              onCheckedChange={(checked) =>
                setValue(t.name as keyof FormValues, checked, { shouldDirty: true })
              }
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button type="submit">Save configuration</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            form.reset(configuration);
            toast.message("Reverted unsaved changes");
          }}
        >
          Revert
        </Button>
      </div>
    </form>
  );
}
