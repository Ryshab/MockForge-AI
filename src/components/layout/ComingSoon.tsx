import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-6" />
      </span>
      <div className="max-w-md">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="outline">
        <Link to="/configure">Back to exam setup</Link>
      </Button>
    </div>
  );
}
