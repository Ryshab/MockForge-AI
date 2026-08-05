import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BrainCircuit,
  FileUp,
  Gauge,
  LayoutGrid,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-cbt.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MockForge AI — Turn MCQ PDFs into CBT Mock Tests" },
      {
        name: "description",
        content:
          "Upload an MCQ PDF and configure a full computer-based test with sections, timers and negative marking for SSC, UPSC, Banking, Railway, CAT, NEET and JEE.",
      },
      { property: "og:title", content: "MockForge AI — Turn MCQ PDFs into CBT Mock Tests" },
      {
        property: "og:description",
        content:
          "Upload a question paper, configure sections and marking, and practise in a real exam interface.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: FileUp,
    title: "PDF in, exam out",
    body: "Drop any MCQ question paper up to 100 MB. We read structure first, questions next.",
  },
  {
    icon: SlidersHorizontal,
    title: "Full exam control",
    body: "Marks per question, negative marking, shuffling, review mode and fullscreen lockdown.",
  },
  {
    icon: Timer,
    title: "Sectional timers",
    body: "Unlimited sections with their own question counts and clocks. Duration totals live.",
  },
  {
    icon: LayoutGrid,
    title: "Real CBT interface",
    body: "A question palette and navigation modelled on the actual government exam software.",
  },
  {
    icon: BrainCircuit,
    title: "AI ready",
    body: "Extraction, validation and explanation services are architected in and ready to plug in.",
  },
  {
    icon: ShieldCheck,
    title: "Stays on your device",
    body: "PDFs are parsed in the browser. Nothing is uploaded to a server in this release.",
  },
];

const exams = ["SSC", "UPSC", "Railway", "Banking", "CAT", "NEET", "JEE"];

function Home() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Gauge className="size-3.5" /> Foundation release
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Turn any MCQ PDF into a{" "}
              <span className="bg-hero bg-clip-text text-transparent">real CBT mock test</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Upload a question paper, configure sections, timers and marking exactly like SSC CGL,
              Banking, Railway or UPSC — then practise in an interface that feels like the real exam
              hall.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/upload">
                  <FileUp className="size-4" /> Upload your PDF
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/configure">Configure an exam</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              PDF only · up to 100 MB · parsed locally in your browser
            </p>
          </div>

          <div className="relative">
            <div className="surface-card overflow-hidden p-2">
              <img
                src={heroImage}
                alt="Illustration of a computer-based test interface with a question palette and timer"
                width={1280}
                height={960}
                className="w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Built for serious exam prep
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Everything a coaching-grade test platform needs, assembled as a clean, extensible
          foundation.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="surface-card p-6 transition-transform duration-200 hover:-translate-y-1"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Supported exam patterns</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Preset-friendly patterns for every major competitive exam.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-3">
            {exams.map((exam) => (
              <li
                key={exam}
                className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold shadow-sm"
              >
                {exam}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link to="/upload">Start with a PDF</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
          MockForge AI — foundation release. AI extraction and the exam engine ship next.
        </div>
      </footer>
    </main>
  );
}
