import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settingsStore";
import { useThemeStore } from "@/store/themeStore";
import { useExamStore } from "@/store/examStore";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MockForge AI" },
      {
        name: "description",
        content: "Set default marking values, appearance and exam preferences for every mock test you build.",
      },
      { property: "og:title", content: "Settings — MockForge AI" },
      { property: "og:description", content: "Defaults, appearance and exam preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useSettingsStore();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const resetExam = useExamStore((s) => s.resetExam);

  const switches = [
    { key: "autoSaveProgress", label: "Auto-save progress", hint: "Keep attempts in this browser" },
    { key: "compactMode", label: "Compact mode", hint: "Tighter spacing across the app" },
    { key: "soundAlerts", label: "Sound alerts", hint: "Audio cue when a timer runs low" },
  ] as const;

  return (
    <PageShell title="Settings" description="Defaults applied to every new mock test.">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Marking defaults</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="dmpq">Marks per question</Label>
              <Input
                id="dmpq"
                type="number"
                step="0.25"
                className="mt-1.5"
                value={settings.defaultMarksPerQuestion}
                onChange={(e) =>
                  settings.update({ defaultMarksPerQuestion: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label htmlFor="dnm">Negative marks</Label>
              <Input
                id="dnm"
                type="number"
                step="0.25"
                className="mt-1.5"
                value={settings.defaultNegativeMarks}
                onChange={(e) =>
                  settings.update({ defaultNegativeMarks: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </section>

        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Appearance</h2>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 px-4 py-3">
            <div>
              <Label htmlFor="dark-mode" className="cursor-pointer">
                Dark mode
              </Label>
              <p className="text-xs text-muted-foreground">Easier on the eyes at night</p>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </section>

        <section className="surface-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Preferences</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {switches.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <Label htmlFor={s.key} className="cursor-pointer">
                    {s.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
                <Switch
                  id={s.key}
                  checked={settings[s.key]}
                  onCheckedChange={(checked) => settings.update({ [s.key]: checked })}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                settings.reset();
                toast.success("Settings restored to defaults");
              }}
            >
              Reset settings
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                resetExam();
                toast.success("Exam configuration reset");
              }}
            >
              Reset exam configuration
            </Button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
