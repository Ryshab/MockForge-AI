import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home", exact: true },
  { to: "/upload", label: "Upload", exact: false },
  { to: "/configure", label: "Configure", exact: false },
  { to: "/settings", label: "Settings", exact: false },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:flex sm:justify-between"
      >
        <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-hero text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="truncate font-display text-base font-bold tracking-tight">
            MockForge <span className="text-muted-foreground font-medium">AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </nav>

      <div className={cn("sm:hidden", open ? "block" : "hidden")}>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 pb-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
